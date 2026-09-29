import { create } from "zustand";
import {
  League,
  Team,
  Player,
  Game,
  StatEvent,
  StatType,
  Quarter,
  StaffUser,
  StaffRole,
  PlayerBoxStat,
  PlayerLeaderboardItem,
  CorrectionStats,
} from "../lib/types";
import { soundFX, triggerHaptic } from "../lib/sound";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";
import { hashPin } from "../lib/pinHelper";
import {
  fetchAllLeagueData,
  dbInsertTeam,
  dbUpdateTeam,
  dbDeleteTeam,
  dbInsertPlayer,
  dbUpdatePlayer,
  dbDeletePlayer,
  dbInsertGame,
  dbUpdateGame,
  dbDeleteGame,
  dbInsertStatEvent,
  dbDeleteStatEvent,
  dbInsertStaff,
  dbUpdateStaffPin,
  dbSetActiveGameId,
} from "../lib/supabaseService";

interface D2LState {
  // Active state
  leagues: League[];
  activeLeagueId: string;
  teams: Team[];
  players: Player[];
  games: Game[];
  activeGameId: string;
  statEvents: StatEvent[];
  undoStack: StatEvent[];
  isDataLoaded: boolean;
  dataLoadError: string | null;
  isAuthReady: boolean;
  setAuthReady: (ready: boolean) => void;
  
  // On court status: teamId -> playerIds currently on floor
  onCourtPlayerIds: Record<string, string[]>;

  // Auth / Staff state
  staffList: StaffUser[];
  currentStaff: StaffUser;
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string; role?: StaffRole }>;
  logout: () => Promise<void>;
  updateAdminPin: (newPin: string) => Promise<boolean>;
  
  // Settings & UI state
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  themeMode: "courtside-dark" | "clean-light";
  isOnline: boolean;
  pendingSyncCount: number;

  // Supabase live sync & diagnostics
  loadFromSupabase: () => Promise<void>;
  toastMessage: { type: "success" | "error" | "warning" | "info"; text: string; details?: string; timestamp: number } | null;
  setToastMessage: (toast: { type: "success" | "error" | "warning" | "info"; text: string; details?: string } | null) => void;
  syncAllLocalDataToSupabase: () => Promise<void>;
  downloadLocalDataBackup: () => void;

  // Actions: Leagues & Teams
  setActiveLeague: (leagueId: string) => void;
  addLeague: (league: League) => void;
  addTeam: (team: Team) => Promise<{ success: boolean; error?: string }>;
  updateTeam: (id: string, updates: Partial<Team>) => Promise<{ success: boolean; error?: string }>;
  deleteTeam: (id: string) => Promise<{ success: boolean; error?: string }>;

  // Actions: Players
  addPlayer: (player: Player) => Promise<{ success: boolean; error?: string }>;
  updatePlayer: (id: string, updates: Partial<Player>) => Promise<{ success: boolean; error?: string }>;
  deletePlayer: (id: string) => Promise<{ success: boolean; error?: string }>;
  importPlayersFromCsv: (newPlayers: Player[], teamId?: string) => Promise<void>;
  importHistoricalGames: (
    games: Game[],
    newPlayers: Player[],
    events: StatEvent[],
    newTeams?: Team[]
  ) => Promise<{ success: boolean; error?: string }>;

  // Actions: Games & Scores
  setActiveGame: (gameId: string) => Promise<void>;
  addGame: (game: Game) => Promise<{ success: boolean; error?: string }>;
  updateGame: (gameId: string, updates: Partial<Game>) => Promise<{ success: boolean; error?: string }>;
  deleteGame: (gameId: string) => Promise<{ success: boolean; error?: string }>;
  setGameQuarter: (quarter: Quarter) => void;
  setGameScore: (homeScore: number, awayScore: number) => void;
  setGameStatus: (status: Game["status"]) => void;
  finalizeGame: (gameId?: string) => Promise<{
    success: boolean;
    error?: string;
    game?: Game;
    homeTeam?: Team;
    awayTeam?: Team;
    boxScore?: ReturnType<D2LState["calculateBoxScore"]>;
  }>;

  // Actions: On-court Substitutions
  togglePlayerOnCourt: (teamId: string, playerId: string) => void;
  setTeamOnCourt: (teamId: string, playerIds: string[]) => void;

  // Actions: Stat Logging & Undo
  logStat: (
    statType: StatType,
    playerId: string,
    teamId: string,
    options?: {
      assistPlayerId?: string;
      blockPlayerId?: string;
      foulOnPlayerId?: string;
      notes?: string;
    }
  ) => StatEvent;
  undoLastStat: () => boolean;
  deleteStatEvent: (eventId: string) => void;
  editStatEvent: (eventId: string, updates: Partial<StatEvent>) => void;
  saveFinalGameCorrections: (gameId: string, corrections: Record<string, CorrectionStats>) => Promise<{ success: boolean; error?: string }>;

  // Actions: Staff & Settings
  setCurrentStaff: (staff: StaffUser) => void;
  addStaff: (staff: StaffUser) => void;
  toggleSound: () => void;
  toggleTheme: () => void;
  syncOfflineQueue: () => void;

  // Computed Selectors
  getActiveGame: () => Game | undefined;
  getGameTeams: (gameId?: string) => { homeTeam?: Team; awayTeam?: Team };
  getGamePlayers: (gameId?: string) => { homePlayers: Player[]; awayPlayers: Player[] };
  getGameEvents: (gameId?: string) => StatEvent[];
  calculateBoxScore: (gameId?: string) => {
    home: PlayerBoxStat[];
    away: PlayerBoxStat[];
    homeTotals: PlayerBoxStat;
    awayTotals: PlayerBoxStat;
  };
  getPlayerLeaderboard: (statKey: "ppg" | "rpg" | "apg" | "bpg" | "spg" | "fgPct") => PlayerLeaderboardItem[];
}

const DEFAULT_STAFF: StaffUser = {
  id: "staff-default",
  name: "Courtside Staff",
  email: "staff@d2league.ph",
  role: "admin",
  pin: "2026",
  avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
};

let loadGeneration = 0;

function latestFinalCorrection(events: StatEvent[], playerId: string): CorrectionStats | undefined {
  const correction = events
    .filter((event) => event.playerId === playerId && event.statType === ("CORRECTION" as StatType))
    .sort((a, b) => b.timestamp - a.timestamp)[0];
  if (!correction?.notes) return undefined;
  try {
    const parsed = JSON.parse(correction.notes);
    return parsed?.kind === "final_stat_correction" ? parsed.totals as CorrectionStats : undefined;
  } catch { return undefined; }
}

export const useD2LStore = create<D2LState>()(
    (set, get) => ({
      // League data is an in-memory view of the last successful Supabase read.
      // It is deliberately never persisted in the browser.
      leagues: [],
      activeLeagueId: "",
      teams: [],
      players: [],
      games: [],
      activeGameId: "",
      statEvents: [],
      undoStack: [],
      isDataLoaded: false,
      dataLoadError: null,
      isAuthReady: false,
      setAuthReady: (ready) => set({ isAuthReady: ready }),
      onCourtPlayerIds: {},
      staffList: [],
      currentStaff: DEFAULT_STAFF,
      isAuthenticated: false,
      soundEnabled: true,
      hapticsEnabled: true,
      themeMode: "courtside-dark",
      isOnline: true,
      pendingSyncCount: 0,
      toastMessage: null,

      setToastMessage: (toast) => {
        if (!toast) {
          set({ toastMessage: null });
        } else {
          set({ toastMessage: { ...toast, timestamp: Date.now() } });
        }
      },

      syncAllLocalDataToSupabase: async () => {
        const { teams, players, games, statEvents, staffList } = get();
        console.log("🚀 Starting Force Sync of all local data to Supabase...");
        get().setToastMessage({ type: "info", text: "Syncing local data to Supabase..." });

        let syncedTeams = 0;
        let syncedPlayers = 0;
        let syncedGames = 0;
        let syncedEvents = 0;
        const errors: string[] = [];

        for (const t of teams) {
          const res = await dbInsertTeam(t);
          if (res.success) syncedTeams++;
          else errors.push(`Team "${t.name}": ${res.error}`);
        }

        for (const p of players) {
          const res = await dbInsertPlayer(p);
          if (res.success) syncedPlayers++;
          else errors.push(`Player "${p.name}": ${res.error}`);
        }

        for (const g of games) {
          const res = await dbInsertGame(g);
          if (res.success) syncedGames++;
          else errors.push(`Game "${g.id}": ${res.error}`);
        }

        const BATCH = 50;
        for (let i = 0; i < statEvents.length; i += BATCH) {
          const batch = statEvents.slice(i, i + BATCH);
          for (const e of batch) {
            const res = await dbInsertStatEvent(e);
            if (res.success) syncedEvents++;
            else errors.push(`Event "${e.id}": ${res.error}`);
          }
        }

        for (const s of staffList) {
          await dbInsertStaff(s);
        }

        if (errors.length > 0) {
          console.error("❌ Force Sync completed with errors:", errors);
          get().setToastMessage({
            type: "warning",
            text: `Sync Warning: ${errors.length} write error(s) occurred.`,
            details: `Pushed ${syncedTeams} teams, ${syncedPlayers} players, ${syncedGames} games, ${syncedEvents} stat events. First error: ${errors[0]}`,
          });
        } else {
          console.log(`✅ Force Sync succeeded completely! Teams: ${syncedTeams}, Players: ${syncedPlayers}, Games: ${syncedGames}, Events: ${syncedEvents}`);
          get().setToastMessage({
            type: "success",
            text: `Sync Complete! Pushed ${syncedTeams} teams, ${syncedPlayers} players, ${syncedGames} games, ${syncedEvents} stat events to Supabase.`,
          });
        }
      },

      downloadLocalDataBackup: () => {
        const { leagues, teams, players, games, statEvents, staffList } = get();
        const backupObj = {
          exportedAt: new Date().toISOString(),
          version: "1.0",
          leagues,
          teams,
          players,
          games,
          statEvents,
          staffList,
        };
        const jsonStr = JSON.stringify(backupObj, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `d2l_local_data_backup_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        get().setToastMessage({
          type: "success",
          text: "Local JSON backup downloaded successfully!",
        });
      },

      loadFromSupabase: async () => {
        const gen = ++loadGeneration;
        set({ isDataLoaded: false, dataLoadError: null });
        try {
          const dbData = await fetchAllLeagueData();
          if (gen !== loadGeneration) return;

          const leagues = dbData.leagues;
          const teams = dbData.teams;
          const players = dbData.players;
          const games = dbData.games;
          const statEvents = dbData.statEvents;
          const staffList = dbData.staffList;

          let activeGameId = dbData.activeGameId;
          if (activeGameId && !games.some((g) => g.id === activeGameId)) {
            activeGameId = "";
          }
          // app_state is only a shared pointer. A null/stale pointer must never
          // hide a valid league from a newly opened browser. Pick the newest
          // in-progress or completed game from the fully fetched games table,
          // then repair the shared pointer for every connected device.
          if (!activeGameId && games.length > 0) {
            const preferredGames = games.filter((g) =>
              g.status === "live" || g.status === "halftime" || g.status === "overtime" || g.status === "final"
            );
            const selectedGame = (preferredGames.length > 0 ? preferredGames : games)
              .slice()
              .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())[0];
            activeGameId = selectedGame.id;
            const repair = await dbSetActiveGameId(activeGameId);
            if (!repair.success) {
              get().setToastMessage({ type: "warning", text: "Loaded games, but could not sync the active-game selection.", details: repair.error });
            }
          }
          const onCourt: Record<string, string[]> = {};
          teams.forEach((t) => {
            const teamStarters = players
              .filter((p) => p.teamId === t.id && p.isStarter)
              .slice(0, 5)
              .map((p) => p.id);
            if (teamStarters.length > 0) {
              onCourt[t.id] = teamStarters;
            }
          });

          set({
            leagues,
            teams,
            players,
            games,
            statEvents,
            staffList,
            activeGameId,
            onCourtPlayerIds: onCourt,
            isDataLoaded: true,
            dataLoadError: null,
          });
        } catch (err: any) {
          console.error("Failed to load data from Supabase:", err);
          if (gen !== loadGeneration) return;
          // Preserve the last verified snapshot on an error. The UI remains in
          // its loading/error state rather than replacing real data with zeros.
          set({
            isDataLoaded: false,
            dataLoadError: err?.message || "Check network connection or RLS policies.",
          });
          get().setToastMessage({
            type: "error",
            text: "Failed to load data from Supabase",
            details: err?.message || "Check network connection or RLS policies.",
          });
        }
      },

      setActiveLeague: (leagueId) => set({ activeLeagueId: leagueId }),

      addLeague: (league) => set((s) => ({ leagues: [...s.leagues, league] })),

      addTeam: async (team) => {
        set((s) => ({ teams: [...s.teams.filter((t) => t.id !== team.id), team] }));
        const res = await dbInsertTeam(team);
        if (!res.success) {
          console.error("Failed to insert team to Supabase:", res.error);
          get().setToastMessage({
            type: "error",
            text: `Failed to save Team "${team.name}" to Supabase`,
            details: res.error || "Write rejected by Supabase database.",
          });
        }
        return res;
      },

      updateTeam: async (id, updates) => {
        set((s) => ({
          teams: s.teams.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        }));
        const res = await dbUpdateTeam(id, updates);
        if (!res.success) {
          console.error("Failed to update team in Supabase:", res.error);
          get().setToastMessage({
            type: "error",
            text: "Failed to update Team in Supabase",
            details: res.error || "Write rejected by Supabase database.",
          });
        }
        return res;
      },

      deleteTeam: async (id) => {
        const res = await dbDeleteTeam(id);
        if (!res.success) {
          console.error("Failed to delete team from Supabase:", res.error);
          get().setToastMessage({
            type: "error",
            text: "Failed to delete Team from Supabase",
            details: res.error || "Delete operation failed in database.",
          });
          return res;
        }

        set((s) => {
          const remainingGames = s.games.filter(
            (g) => g.homeTeamId !== id && g.awayTeamId !== id
          );
          const deletedGameIds = s.games
            .filter((g) => g.homeTeamId === id || g.awayTeamId === id)
            .map((g) => g.id);
          const remainingEvents = s.statEvents.filter(
            (e) => !deletedGameIds.includes(e.gameId) && e.teamId !== id
          );
          const nextActiveGameId = deletedGameIds.includes(s.activeGameId)
            ? remainingGames[0]?.id || ""
            : s.activeGameId;

          return {
            teams: s.teams.filter((t) => t.id !== id),
            players: s.players.filter((p) => p.teamId !== id),
            games: remainingGames,
            statEvents: remainingEvents,
            activeGameId: nextActiveGameId,
          };
        });
        await dbSetActiveGameId(get().activeGameId);

        return res;
      },

      addPlayer: async (player) => {
        set((s) => ({ players: [...s.players.filter((p) => p.id !== player.id), player] }));
        const res = await dbInsertPlayer(player);
        if (!res.success) {
          console.error("Failed to insert player to Supabase:", res.error);
          get().setToastMessage({
            type: "error",
            text: `Failed to save Player "${player.name}" to Supabase`,
            details: res.error || "Write rejected by Supabase database.",
          });
        }
        return res;
      },

      updatePlayer: async (id, updates) => {
        set((s) => ({
          players: s.players.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        }));
        const res = await dbUpdatePlayer(id, updates);
        if (!res.success) {
          console.error("Failed to update player in Supabase:", res.error);
          get().setToastMessage({
            type: "error",
            text: "Failed to update Player in Supabase",
            details: res.error || "Write rejected by Supabase database.",
          });
        }
        return res;
      },

      deletePlayer: async (id) => {
        const res = await dbDeletePlayer(id);
        if (!res.success) {
          console.error("Failed to delete player from Supabase:", res.error);
          get().setToastMessage({
            type: "error",
            text: "Failed to delete Player from Supabase",
            details: res.error || "Delete operation failed in database.",
          });
          return res;
        }

        set((s) => ({
          players: s.players.filter((p) => p.id !== id),
          statEvents: s.statEvents.filter((e) => e.playerId !== id),
        }));

        return res;
      },

      importPlayersFromCsv: async (newPlayers, teamId) => {
        set((s) => {
          let updated = [...s.players];
          if (teamId) {
            updated = updated.filter((p) => p.teamId !== teamId);
          }
          return { players: [...updated, ...newPlayers] };
        });
        for (const p of newPlayers) {
          const res = await dbInsertPlayer(p);
          if (!res.success) {
            get().setToastMessage({
              type: "error",
              text: `Failed to save player "${p.name}" during CSV import`,
              details: res.error,
            });
          }
        }
      },

      importHistoricalGames: async (games, newPlayers, events, newTeams = []) => {
        try {
          // 1. Persist auto-created teams before their player/game foreign keys.
          for (const team of newTeams) {
            const res = await dbInsertTeam(team);
            if (!res.success) {
              return { success: false, error: `Team "${team.name}": ${res.error || "insert failed"}` };
            }
          }

          // 2. Persist new auto-created players first (FK dependency)
          for (const p of newPlayers) {
            const res = await dbInsertPlayer(p);
            if (!res.success) {
              return { success: false, error: `Player "${p.name}": ${res.error || "insert failed"}` };
            }
          }

          // 3. Persist each game
          for (const g of games) {
            const res = await dbInsertGame(g);
            if (!res.success) {
              return { success: false, error: `Game "${g.id}": ${res.error || "insert failed"}` };
            }
          }

          // 4. Persist synthetic stat_events in batches of 100
          const BATCH = 100;
          for (let i = 0; i < events.length; i += BATCH) {
            const batch = events.slice(i, i + BATCH);
            const results = await Promise.all(batch.map((e) => dbInsertStatEvent(e)));
            const failedIndex = results.findIndex((result) => !result.success);
            if (failedIndex >= 0) {
              const failedEvent = batch[failedIndex];
              return {
                success: false,
                error: `Stat event "${failedEvent.id}" (${failedEvent.statType}, game ${failedEvent.gameId}): ${results[failedIndex].error || "insert failed"}`,
              };
            }
          }

          // 5. Merge into local Zustand state
          set((s) => ({
            teams: [
              ...s.teams.filter((t) => !newTeams.some((nt) => nt.id === t.id)),
              ...newTeams,
            ],
            players: [
              ...s.players.filter((p) => !newPlayers.some((np) => np.id === p.id)),
              ...newPlayers,
            ],
            games: [
              ...games,
              ...s.games.filter((g) => !games.some((ng) => ng.id === g.id)),
            ],
            statEvents: [...events, ...s.statEvents],
          }));

          console.log(
            `✅ importHistoricalGames: imported ${games.length} games, ${newTeams.length} new teams, ${newPlayers.length} new players, ${events.length} stat events`
          );
          return { success: true };
        } catch (err: any) {
          console.error("❌ importHistoricalGames failed:", err);
          get().setToastMessage({
            type: "error",
            text: "Historical Game Import Failed",
            details: err?.message || "Import operation failed.",
          });
          return { success: false, error: err?.message || "Import failed" };
        }
      },

      setActiveGame: async (gameId) => {
        set({ activeGameId: gameId });
        const res = await dbSetActiveGameId(gameId);
        if (!res.success) {
          get().setToastMessage({
            type: "error",
            text: "Could not sync the active game to Supabase",
            details:
              res.error ||
              "Run the latest supabase/schema.sql so the app_state table exists. Other devices will not see this selection until that succeeds.",
          });
        }
      },

      addGame: async (game) => {
        set((s) => ({
          games: [game, ...s.games.filter((g) => g.id !== game.id)],
          activeGameId: s.activeGameId || game.id,
        }));
        const res = await dbInsertGame(game);
        if (!res.success) {
          console.error("Failed to insert game to Supabase:", res.error);
          get().setToastMessage({
            type: "error",
            text: "Failed to save Game to Supabase",
            details: res.error || "Write rejected by Supabase database.",
          });
        }
        if (!get().activeGameId || get().activeGameId === game.id) {
          await dbSetActiveGameId(game.id);
        }
        return res;
      },

      updateGame: async (gameId, updates) => {
        set((s) => ({
          games: s.games.map((g) => (g.id === gameId ? { ...g, ...updates } : g)),
        }));
        const res = await dbUpdateGame(gameId, updates);
        if (!res.success) {
          console.error("Failed to update game in Supabase:", res.error);
          get().setToastMessage({
            type: "error",
            text: "Failed to update Game in Supabase",
            details: res.error || "Write rejected by Supabase database.",
          });
        }
        return res;
      },

      deleteGame: async (gameId) => {
        const res = await dbDeleteGame(gameId);
        if (!res.success) {
          console.error("Failed to delete game from Supabase:", res.error);
          get().setToastMessage({
            type: "error",
            text: "Failed to delete Game from Supabase",
            details: res.error || "Delete operation failed in database.",
          });
          return res;
        }

        set((s) => {
          const remainingGames = s.games.filter((g) => g.id !== gameId);
          const nextActiveGameId =
            s.activeGameId === gameId ? remainingGames[0]?.id || "" : s.activeGameId;
          return {
            games: remainingGames,
            statEvents: s.statEvents.filter((e) => e.gameId !== gameId),
            activeGameId: nextActiveGameId,
          };
        });
        await dbSetActiveGameId(get().activeGameId);

        return res;
      },

      setGameQuarter: (quarter) => {
        const game = get().getActiveGame();
        if (!game) return;
        soundFX.playBuzzer();
        const updates: Partial<Game> = {
          quarter,
          homeFouls: 0,
          awayFouls: 0,
        };
        get().updateGame(game.id, updates);
      },

      setGameScore: (homeScore, awayScore) => {
        const game = get().getActiveGame();
        if (game) get().updateGame(game.id, { homeScore, awayScore });
      },

      setGameStatus: (status) => {
        const game = get().getActiveGame();
        if (game) {
          get().updateGame(game.id, { status });
        }
      },

      finalizeGame: async (targetGameId) => {
        const state = get();
        const gameId = targetGameId || state.activeGameId;
        const game = state.games.find((g) => g.id === gameId) || state.getActiveGame();

        if (!game) {
          return { success: false, error: "No active game found to finalize." };
        }

        const { homeTeam, awayTeam } = state.getGameTeams(game.id);

        // If game was not previously marked final, update team standings
        if (game.status !== "final") {
          await state.updateGame(game.id, { status: "final" });

          if (homeTeam && awayTeam) {
            const homeWon = game.homeScore > game.awayScore;
            const awayWon = game.awayScore > game.homeScore;

            const homeUpdates: Partial<Team> = {
              wins: homeTeam.wins + (homeWon ? 1 : 0),
              losses: homeTeam.losses + (awayWon ? 1 : 0),
              pointsFor: homeTeam.pointsFor + game.homeScore,
              pointsAgainst: homeTeam.pointsAgainst + game.awayScore,
              streak: homeWon ? "W1" : awayWon ? "L1" : homeTeam.streak,
            };

            const awayUpdates: Partial<Team> = {
              wins: awayTeam.wins + (awayWon ? 1 : 0),
              losses: awayTeam.losses + (homeWon ? 1 : 0),
              pointsFor: awayTeam.pointsFor + game.awayScore,
              pointsAgainst: awayTeam.pointsAgainst + game.homeScore,
              streak: awayWon ? "W1" : homeWon ? "L1" : awayTeam.streak,
            };

            await state.updateTeam(homeTeam.id, homeUpdates);
            await state.updateTeam(awayTeam.id, awayUpdates);
          }
        }

        const freshState = get();
        const updatedGame = freshState.games.find((g) => g.id === game.id) || { ...game, status: "final" as const };
        const freshHomeTeam = freshState.teams.find((t) => t.id === game.homeTeamId) || homeTeam;
        const freshAwayTeam = freshState.teams.find((t) => t.id === game.awayTeamId) || awayTeam;
        const boxScore = freshState.calculateBoxScore(game.id);

        return {
          success: true,
          game: updatedGame,
          homeTeam: freshHomeTeam,
          awayTeam: freshAwayTeam,
          boxScore,
        };
      },

      togglePlayerOnCourt: (teamId, playerId) => {
        set((s) => {
          const current = s.onCourtPlayerIds[teamId] || [];
          let updated: string[];
          if (current.includes(playerId)) {
            updated = current.filter((id) => id !== playerId);
          } else {
            updated = [...current, playerId];
          }
          return {
            onCourtPlayerIds: {
              ...s.onCourtPlayerIds,
              [teamId]: updated,
            },
          };
        });
        soundFX.playClick();
        triggerHaptic("light");
      },

      setTeamOnCourt: (teamId, playerIds) => {
        set((s) => ({
          onCourtPlayerIds: {
            ...s.onCourtPlayerIds,
            [teamId]: playerIds,
          },
        }));
      },

      logStat: (statType, playerId, teamId, options) => {
        const state = get();
        const game = state.getActiveGame();
        if (!game) throw new Error("No active game selected");

        let points = 0;
        if (statType === "2PT_MAKE") points = 2;
        else if (statType === "3PT_MAKE") points = 3;
        else if (statType === "FT_MAKE") points = 1;

        // Sound and haptic feedback
        if (points > 0) {
          soundFX.playSwish();
          triggerHaptic("success");
        } else if (statType === "2PT_MISS" || statType === "3PT_MISS" || statType === "FT_MISS") {
          soundFX.playMiss();
          triggerHaptic("medium");
        } else if (statType === "FOUL_PERSONAL" || statType === "FOUL_TECH") {
          soundFX.playWhistle();
          triggerHaptic("warning");
        } else {
          soundFX.playClick();
          triggerHaptic("light");
        }

        const newEvent: StatEvent = {
          id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          gameId: game.id,
          teamId,
          playerId,
          quarter: game.quarter,
          gameClock: game.quarter,
          statType,
          points,
          assistPlayerId: options?.assistPlayerId,
          blockPlayerId: options?.blockPlayerId,
          foulOnPlayerId: options?.foulOnPlayerId,
          notes: options?.notes,
          timestamp: Date.now(),
          synced: true,
          staffName: state.currentStaff.name,
          staffRole: state.currentStaff.role,
        };

        // Score & Quarter score recalculation
        const isHome = teamId === game.homeTeamId;
        const newHomeScore = isHome ? game.homeScore + points : game.homeScore;
        const newAwayScore = !isHome ? game.awayScore + points : game.awayScore;

        const currentQ = game.quarter;
        const qScores = { ...game.quarterScores };
        if (isHome) {
          const prev = (qScores.home as Record<string, number>)[currentQ] || 0;
          (qScores.home as Record<string, number>)[currentQ] = prev + points;
        } else {
          const prev = (qScores.away as Record<string, number>)[currentQ] || 0;
          (qScores.away as Record<string, number>)[currentQ] = prev + points;
        }

        // Foul increments
        let newHomeFouls = game.homeFouls;
        let newAwayFouls = game.awayFouls;
        if (statType === "FOUL_PERSONAL" || statType === "FOUL_TECH") {
          if (isHome) newHomeFouls += 1;
          else newAwayFouls += 1;
        }

        // Update Game
        const updatedGame: Game = {
          ...game,
          homeScore: newHomeScore,
          awayScore: newAwayScore,
          homeFouls: newHomeFouls,
          awayFouls: newAwayFouls,
          quarterScores: qScores,
        };

        set((s) => ({
          statEvents: [newEvent, ...s.statEvents],
          undoStack: [newEvent, ...s.undoStack.slice(0, 19)],
          games: s.games.map((g) => (g.id === game.id ? updatedGame : g)),
        }));

        // Insert into Supabase
        dbInsertStatEvent(newEvent);
        dbUpdateGame(game.id, updatedGame);

        // Also add assist event if assistPlayerId was provided
        if (options?.assistPlayerId) {
          const assistEvt: StatEvent = {
            id: `evt-ast-${Date.now()}`,
            gameId: game.id,
            teamId,
            playerId: options.assistPlayerId,
            quarter: game.quarter,
            gameClock: game.quarter,
            statType: "AST",
            points: 0,
            timestamp: Date.now() + 1,
            synced: true,
            staffName: state.currentStaff.name,
            notes: `Assist on #${state.players.find((p) => p.id === playerId)?.jerseyNumber || ""} score`,
          };
          set((s) => ({
            statEvents: [assistEvt, ...s.statEvents],
          }));
          dbInsertStatEvent(assistEvt);
        }

        return newEvent;
      },

      undoLastStat: () => {
        const state = get();
        if (state.undoStack.length === 0) return false;
        const [lastEvent, ...remainingUndo] = state.undoStack;
        const game = state.games.find((g) => g.id === lastEvent.gameId);
        if (!game) return false;

        const isHome = lastEvent.teamId === game.homeTeamId;
        const pointsToRevert = lastEvent.points;

        const newHomeScore = Math.max(0, isHome ? game.homeScore - pointsToRevert : game.homeScore);
        const newAwayScore = Math.max(0, !isHome ? game.awayScore - pointsToRevert : game.awayScore);

        let newHomeFouls = game.homeFouls;
        let newAwayFouls = game.awayFouls;
        if (lastEvent.statType === "FOUL_PERSONAL" || lastEvent.statType === "FOUL_TECH") {
          if (isHome) newHomeFouls = Math.max(0, newHomeFouls - 1);
          else newAwayFouls = Math.max(0, newAwayFouls - 1);
        }

        const qScores = { ...game.quarterScores };
        if (isHome) {
          const currentQVal = (qScores.home as Record<string, number>)[lastEvent.quarter] || 0;
          (qScores.home as Record<string, number>)[lastEvent.quarter] = Math.max(0, currentQVal - pointsToRevert);
        } else {
          const currentQVal = (qScores.away as Record<string, number>)[lastEvent.quarter] || 0;
          (qScores.away as Record<string, number>)[lastEvent.quarter] = Math.max(0, currentQVal - pointsToRevert);
        }

        const updatedGame: Game = {
          ...game,
          homeScore: newHomeScore,
          awayScore: newAwayScore,
          homeFouls: newHomeFouls,
          awayFouls: newAwayFouls,
          quarterScores: qScores,
        };

        set((s) => ({
          statEvents: s.statEvents.filter((e) => e.id !== lastEvent.id),
          undoStack: remainingUndo,
          games: s.games.map((g) => (g.id === game.id ? updatedGame : g)),
        }));

        dbDeleteStatEvent(lastEvent.id);
        dbUpdateGame(game.id, updatedGame);

        soundFX.playClick();
        triggerHaptic("medium");

        return true;
      },

      deleteStatEvent: (eventId) => {
        const state = get();
        const event = state.statEvents.find((e) => e.id === eventId);
        if (!event) return;
        const game = state.games.find((g) => g.id === event.gameId);
        if (!game) return;

        const isHome = event.teamId === game.homeTeamId;
        const newHomeScore = isHome ? Math.max(0, game.homeScore - event.points) : game.homeScore;
        const newAwayScore = !isHome ? Math.max(0, game.awayScore - event.points) : game.awayScore;

        const updatedGame: Game = {
          ...game,
          homeScore: newHomeScore,
          awayScore: newAwayScore,
        };

        set((s) => ({
          statEvents: s.statEvents.filter((e) => e.id !== eventId),
          undoStack: s.undoStack.filter((e) => e.id !== eventId),
          games: s.games.map((g) => (g.id === game.id ? updatedGame : g)),
        }));

        dbDeleteStatEvent(eventId);
        dbUpdateGame(game.id, updatedGame);
      },

      editStatEvent: (eventId, updates) => {
        set((s) => ({
          statEvents: s.statEvents.map((e) => (e.id === eventId ? { ...e, ...updates } : e)),
        }));
      },

      saveFinalGameCorrections: async (gameId, corrections) => {
        const state = get();
        const game = state.games.find((item) => item.id === gameId);
        if (!game || game.status !== "final") return { success: false, error: "Only finalized games can be corrected." };

        const currentLines = [...get().calculateBoxScore(gameId).home, ...get().calculateBoxScore(gameId).away];
        const events: StatEvent[] = Object.entries(corrections).filter(([playerId, totals]) => {
          const current = currentLines.find((line) => line.playerId === playerId);
          return !current || Object.entries(totals).some(([key, value]) => current[key as keyof CorrectionStats] !== value);
        }).map(([playerId, totals]) => {
          const current = currentLines.find((line) => line.playerId === playerId);
          const changes = Object.entries(totals).filter(([key, value]) => current?.[key as keyof CorrectionStats] !== value)
            .map(([key, value]) => ({ key, from: current?.[key as keyof CorrectionStats] ?? 0, to: value }));
          return ({
          id: crypto.randomUUID(), gameId, playerId,
          teamId: state.players.find((p) => p.id === playerId)?.teamId || "",
          quarter: "Q4", gameClock: "FINAL", statType: "CORRECTION" as StatType,
          points: 0, timestamp: Date.now(), synced: true,
          staffName: state.currentStaff.name, staffRole: "admin",
          notes: JSON.stringify({ kind: "final_stat_correction", totals, changes }),
        });
        });
        try {
          for (const event of events) {
            const result = await dbInsertStatEvent(event);
            if (!result.success) throw new Error(result.error || "Unable to save correction.");
          }
          // Final score is derived from the corrected player totals; status remains final.
          const withCorrections = [...state.statEvents, ...events];
          const sum = (teamId: string) => Object.entries(corrections).reduce((total, [playerId, value]) =>
            (state.players.find((p) => p.id === playerId)?.teamId === teamId ? total + value.pts : total), 0);
          const correctedGame = { ...game, homeScore: sum(game.homeTeamId), awayScore: sum(game.awayTeamId) };
          const gameResult = await dbUpdateGame(gameId, correctedGame);
          if (!gameResult.success) throw new Error(gameResult.error || "Unable to update final score.");
          set({ statEvents: withCorrections, games: state.games.map((g) => g.id === gameId ? correctedGame : g) });
          await get().loadFromSupabase();
          return { success: true };
        } catch (error: any) {
          await get().loadFromSupabase();
          return { success: false, error: error?.message || "Unable to save corrections." };
        }
      },

      setCurrentStaff: (staff) => set({ currentStaff: staff }),

      updateAdminPin: async (newPin: string) => {
        const state = get();
        const hashed = await hashPin(newPin);
        const updatedStaff: StaffUser = {
          ...state.currentStaff,
          pin: hashed,
        };
        set({ currentStaff: updatedStaff });
        if (updatedStaff.id) {
          await dbUpdateStaffPin(updatedStaff.id, hashed);
        }
        return true;
      },

      login: async (email, pass) => {
        const cleanEmail = email.trim().toLowerCase();
        const cleanPass = pass.trim();

        if (!cleanEmail || !cleanPass) {
          return { success: false, error: "Please enter your email and password." };
        }

        if (!isSupabaseConfigured) {
          return { success: false, error: "Supabase connection is not configured. Please check your environment variables." };
        }

        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: cleanPass,
          });

          if (error) {
            return { success: false, error: error.message || "Invalid login credentials." };
          }

          if (data?.user) {
            const role = (data.user.user_metadata?.role as StaffRole) || (cleanEmail.includes("admin") || cleanEmail.includes("marcus") ? "admin" : "staff");
            const loggedInStaff: StaffUser = {
              id: data.user.id,
              name: data.user.user_metadata?.name || cleanEmail.split("@")[0],
              email: cleanEmail,
              role,
              pin: "2026",
              avatar: data.user.user_metadata?.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
            };

            set({ isAuthenticated: true, currentStaff: loggedInStaff });
            await get().loadFromSupabase();
            return { success: true, role: loggedInStaff.role };
          }

          return { success: false, error: "Authentication failed. No user returned." };
        } catch (err: any) {
          return { success: false, error: err?.message || "Supabase authentication error." };
        }
      },

      logout: async () => {
        if (isSupabaseConfigured) {
          try {
            await supabase.auth.signOut();
          } catch (err) {
            console.warn("Sign out error:", err);
          }
        }
        set({
          isAuthenticated: false,
          currentStaff: DEFAULT_STAFF,
          teams: [],
          players: [],
          games: [],
          statEvents: [],
          activeGameId: "",
          isDataLoaded: false,
        });
      },

      addStaff: (staff) => {
        set((s) => ({ staffList: [...s.staffList, staff] }));
        dbInsertStaff(staff);
      },

      toggleSound: () =>
        set((s) => {
          const next = !s.soundEnabled;
          soundFX.enabled = next;
          return { soundEnabled: next };
        }),

      toggleTheme: () =>
        set((s) => ({
          themeMode: s.themeMode === "courtside-dark" ? "clean-light" : "courtside-dark",
        })),

      syncOfflineQueue: () => {
        set({ pendingSyncCount: 0 });
      },

      // SELECTORS
      getActiveGame: () => {
        const { games, activeGameId } = get();
        if (!activeGameId) return undefined;
        return games.find((g) => g.id === activeGameId);
      },

      getGameTeams: (gameId) => {
        const { games, teams, activeGameId } = get();
        const targetGameId = gameId || activeGameId;
        const game = games.find((g) => g.id === targetGameId);
        if (!game) return {};
        return {
          homeTeam: teams.find((t) => t.id === game.homeTeamId),
          awayTeam: teams.find((t) => t.id === game.awayTeamId),
        };
      },

      getGamePlayers: (gameId) => {
        const { games, players, activeGameId } = get();
        const targetGameId = gameId || activeGameId;
        const game = games.find((g) => g.id === targetGameId);
        if (!game) return { homePlayers: [], awayPlayers: [] };
        return {
          homePlayers: players.filter((p) => p.teamId === game.homeTeamId),
          awayPlayers: players.filter((p) => p.teamId === game.awayTeamId),
        };
      },

      getGameEvents: (gameId) => {
        const { statEvents, activeGameId } = get();
        const targetGameId = gameId || activeGameId;
        return statEvents.filter((e) => e.gameId === targetGameId);
      },

      calculateBoxScore: (gameId) => {
        const state = get();
        const targetGameId = gameId || state.activeGameId;
        const game = state.games.find((g) => g.id === targetGameId);
        if (!game) {
          const emptyTotal: PlayerBoxStat = {
            playerId: "total",
            teamId: "",
            jerseyNumber: 0,
            name: "TOTALS",
            position: "",
            isStarter: false,
            isOnCourt: false,
            minutes: 0,
            seconds: 0,
            pts: 0,
            fgm: 0,
            fga: 0,
            fgPct: 0,
            fg3m: 0,
            fg3a: 0,
            fg3Pct: 0,
            ftm: 0,
            fta: 0,
            ftPct: 0,
            oreb: 0,
            dreb: 0,
            reb: 0,
            ast: 0,
            stl: 0,
            blk: 0,
            to: 0,
            pf: 0,
            tech: 0,
            plusMinus: 0,
          };
          return { home: [], away: [], homeTotals: emptyTotal, awayTotals: emptyTotal };
        }

        const events = state.statEvents.filter((e) => e.gameId === game.id);
        const homePlayers = state.players.filter((p) => p.teamId === game.homeTeamId);
        const awayPlayers = state.players.filter((p) => p.teamId === game.awayTeamId);

        const buildStatsForTeam = (teamPlayers: Player[], teamId: string) => {
          const statsMap: Record<string, PlayerBoxStat> = {};

          teamPlayers.forEach((p) => {
            const onCourt = (state.onCourtPlayerIds[teamId] || []).includes(p.id);
            statsMap[p.id] = {
              playerId: p.id,
              teamId: p.teamId,
              jerseyNumber: p.jerseyNumber,
              name: p.name,
              position: p.position,
              isStarter: p.isStarter,
              isOnCourt: onCourt,
              minutes: 0,
              seconds: 0,
              pts: 0,
              fgm: 0,
              fga: 0,
              fgPct: 0,
              fg3m: 0,
              fg3a: 0,
              fg3Pct: 0,
              ftm: 0,
              fta: 0,
              ftPct: 0,
              oreb: 0,
              dreb: 0,
              reb: 0,
              ast: 0,
              stl: 0,
              blk: 0,
              to: 0,
              pf: 0,
              tech: 0,
              plusMinus: 0,
            };
          });

          // Aggregate from actual logged events
          events.forEach((evt) => {
            const stat = statsMap[evt.playerId];
            if (!stat) return;

            switch (evt.statType) {
              case "2PT_MAKE":
                stat.fgm += 1;
                stat.fga += 1;
                stat.pts += 2;
                break;
              case "2PT_MISS":
                stat.fga += 1;
                break;
              case "3PT_MAKE":
                stat.fgm += 1;
                stat.fga += 1;
                stat.fg3m += 1;
                stat.fg3a += 1;
                stat.pts += 3;
                break;
              case "3PT_MISS":
                stat.fga += 1;
                stat.fg3a += 1;
                break;
              case "FT_MAKE":
                stat.ftm += 1;
                stat.fta += 1;
                stat.pts += 1;
                break;
              case "FT_MISS":
                stat.fta += 1;
                break;
              case "OREB":
                stat.oreb += 1;
                stat.reb += 1;
                break;
              case "DREB":
                stat.dreb += 1;
                stat.reb += 1;
                break;
              case "AST":
                stat.ast += 1;
                break;
              case "STL":
                stat.stl += 1;
                break;
              case "BLK":
                stat.blk += 1;
                break;
              case "TO":
                stat.to += 1;
                break;
              case "FOUL_PERSONAL":
                stat.pf += 1;
                break;
              case "FOUL_TECH":
                stat.tech += 1;
                break;
            }
          });

          // Calculate percentages
          const resultList = Object.values(statsMap).map((s) => {
            const corrected = latestFinalCorrection(events, s.playerId);
            const merged = corrected ? { ...s, ...corrected, reb: corrected.oreb + corrected.dreb } : s;
            return {
              ...merged,
              fgPct: merged.fga > 0 ? Math.round((merged.fgm / merged.fga) * 100) : 0,
              fg3Pct: merged.fg3a > 0 ? Math.round((merged.fg3m / merged.fg3a) * 100) : 0,
              ftPct: merged.fta > 0 ? Math.round((merged.ftm / merged.fta) * 100) : 0,
            };
          });

          // Sort: Starters first, then Bench by points
          resultList.sort((a, b) => {
            if (a.isStarter && !b.isStarter) return -1;
            if (!a.isStarter && b.isStarter) return 1;
            return b.pts - a.pts;
          });

          // Compute team totals
          const totals: PlayerBoxStat = resultList.reduce(
            (acc, curr) => ({
              ...acc,
              minutes: acc.minutes + curr.minutes,
              pts: acc.pts + curr.pts,
              fgm: acc.fgm + curr.fgm,
              fga: acc.fga + curr.fga,
              fg3m: acc.fg3m + curr.fg3m,
              fg3a: acc.fg3a + curr.fg3a,
              ftm: acc.ftm + curr.ftm,
              fta: acc.fta + curr.fta,
              oreb: acc.oreb + curr.oreb,
              dreb: acc.dreb + curr.dreb,
              reb: acc.reb + curr.reb,
              ast: acc.ast + curr.ast,
              stl: acc.stl + curr.stl,
              blk: acc.blk + curr.blk,
              to: acc.to + curr.to,
              pf: acc.pf + curr.pf,
              tech: acc.tech + curr.tech,
            }),
            {
              playerId: `total-${teamId}`,
              teamId,
              jerseyNumber: 0,
              name: "TEAM TOTALS",
              position: "",
              isStarter: false,
              isOnCourt: false,
              minutes: 0,
              seconds: 0,
              pts: 0,
              fgm: 0,
              fga: 0,
              fgPct: 0,
              fg3m: 0,
              fg3a: 0,
              fg3Pct: 0,
              ftm: 0,
              fta: 0,
              ftPct: 0,
              oreb: 0,
              dreb: 0,
              reb: 0,
              ast: 0,
              stl: 0,
              blk: 0,
              to: 0,
              pf: 0,
              tech: 0,
              plusMinus: 0,
            }
          );

          totals.fgPct = totals.fga > 0 ? Math.round((totals.fgm / totals.fga) * 100) : 0;
          totals.fg3Pct = totals.fg3a > 0 ? Math.round((totals.fg3m / totals.fg3a) * 100) : 0;
          totals.ftPct = totals.fta > 0 ? Math.round((totals.ftm / totals.fta) * 100) : 0;

          return { list: resultList, totals };
        };

        const homeData = buildStatsForTeam(homePlayers, game.homeTeamId);
        const awayData = buildStatsForTeam(awayPlayers, game.awayTeamId);

        return {
          home: homeData.list,
          away: awayData.list,
          homeTotals: homeData.totals,
          awayTotals: awayData.totals,
        };
      },

      getPlayerLeaderboard: (statKey) => {
        const { players, teams, statEvents } = get();

        const items: PlayerLeaderboardItem[] = players.map((player) => {
          const team = teams.find((t) => t.id === player.teamId) || {
            id: player.teamId,
            name: "Free Agent",
            shortName: "FA",
            logo: "",
            primaryColor: "#0B3B24",
            secondaryColor: "#D4AF37",
            wins: 0,
            losses: 0,
            pointsFor: 0,
            pointsAgainst: 0,
            streak: "-",
            leagueId: "d2l-s10",
          };

          const playerEvents = statEvents.filter((e) => e.playerId === player.id);
          const distinctGameIds = new Set(playerEvents.map((e) => e.gameId));
          const gamesPlayed = Math.max(1, distinctGameIds.size);

          let pts = 0;
          let fgm = 0;
          let fga = 0;
          let fg3m = 0;
          let fg3a = 0;
          let ftm = 0;
          let fta = 0;
          let reb = 0;
          let ast = 0;
          let blk = 0;
          let stl = 0;

          playerEvents.forEach((evt) => {
            if (evt.statType === "2PT_MAKE") {
              pts += 2;
              fgm += 1;
              fga += 1;
            } else if (evt.statType === "2PT_MISS") {
              fga += 1;
            } else if (evt.statType === "3PT_MAKE") {
              pts += 3;
              fgm += 1;
              fga += 1;
              fg3m += 1;
              fg3a += 1;
            } else if (evt.statType === "3PT_MISS") {
              fga += 1;
              fg3a += 1;
            } else if (evt.statType === "FT_MAKE") {
              pts += 1;
              ftm += 1;
              fta += 1;
            } else if (evt.statType === "FT_MISS") {
              fta += 1;
            } else if (evt.statType === "OREB" || evt.statType === "DREB") {
              reb += 1;
            } else if (evt.statType === "AST") {
              ast += 1;
            } else if (evt.statType === "BLK") {
              blk += 1;
            } else if (evt.statType === "STL") {
              stl += 1;
            }
          });

          // A final-game correction is an authoritative player snapshot. Rebuild
          // this player's season totals from box scores so rankings use it too.
          if (playerEvents.some((event) => event.statType === ("CORRECTION" as StatType))) {
            pts = 0; fgm = 0; fga = 0; fg3m = 0; fg3a = 0; ftm = 0; fta = 0;
            reb = 0; ast = 0; blk = 0; stl = 0;
            distinctGameIds.forEach((gameId) => {
              const score = get().calculateBoxScore(gameId);
              const line = [...score.home, ...score.away].find((item) => item.playerId === player.id);
              if (!line) return;
              pts += line.pts; fgm += line.fgm; fga += line.fga; fg3m += line.fg3m; fg3a += line.fg3a;
              ftm += line.ftm; fta += line.fta; reb += line.reb; ast += line.ast; blk += line.blk; stl += line.stl;
            });
          }

          const ppg = parseFloat((pts / gamesPlayed).toFixed(1));
          const rpg = parseFloat((reb / gamesPlayed).toFixed(1));
          const apg = parseFloat((ast / gamesPlayed).toFixed(1));
          const bpg = parseFloat((blk / gamesPlayed).toFixed(1));
          const spg = parseFloat((stl / gamesPlayed).toFixed(1));

          return {
            player,
            team,
            gamesPlayed,
            ppg,
            rpg,
            apg,
            bpg,
            spg,
            fgPct: fga > 0 ? Math.round((fgm / fga) * 100) : 0,
            fg3Pct: fg3a > 0 ? Math.round((fg3m / fg3a) * 100) : 0,
            ftPct: fta > 0 ? Math.round((ftm / fta) * 100) : 0,
            totalPoints: pts,
            totalRebounds: reb,
            totalAssists: ast,
            rank: 1,
          };
        });

        // Sort descending by chosen statKey
        items.sort((a, b) => (b[statKey] as number) - (a[statKey] as number));

        // Assign ranks
        items.forEach((item, index) => {
          item.rank = index + 1;
        });

        return items;
      },
    })
);
