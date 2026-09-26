import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  League,
  Team,
  Player,
  Game,
  StatEvent,
  StatType,
  Quarter,
  StaffUser,
  PlayerBoxStat,
  PlayerLeaderboardItem,
} from "../lib/types";
import {
  INITIAL_LEAGUES,
  INITIAL_TEAMS,
  INITIAL_PLAYERS,
  INITIAL_GAMES,
  INITIAL_STAT_EVENTS,
  INITIAL_STAFF,
} from "../lib/mockData";
import { soundFX, triggerHaptic } from "../lib/sound";
import { broadcastD2LEvent, queueEventForSync, removeFromOfflineQueue } from "../lib/supabaseClient";

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
  
  // On court status: teamId -> playerIds currently on floor
  onCourtPlayerIds: Record<string, string[]>;

  // Auth / Staff state
  staffList: StaffUser[];
  currentStaff: StaffUser;
  
  // Settings & UI state
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  themeMode: "courtside-dark" | "clean-light";
  isOnline: boolean;
  pendingSyncCount: number;

  // Actions: Leagues & Teams
  setActiveLeague: (leagueId: string) => void;
  addLeague: (league: League) => void;
  addTeam: (team: Team) => void;
  updateTeam: (id: string, updates: Partial<Team>) => void;
  deleteTeam: (id: string) => void;

  // Actions: Players
  addPlayer: (player: Player) => void;
  updatePlayer: (id: string, updates: Partial<Player>) => void;
  deletePlayer: (id: string) => void;
  importPlayersFromCsv: (newPlayers: Player[], teamId?: string) => void;

  // Actions: Games & Clock
  setActiveGame: (gameId: string) => void;
  addGame: (game: Game) => void;
  updateGame: (gameId: string, updates: Partial<Game>) => void;
  deleteGame: (gameId: string) => void;
  toggleClock: () => void;
  setClockRunning: (running: boolean) => void;
  adjustClockSeconds: (delta: number) => void;
  setClockSeconds: (seconds: number) => void;
  setGameQuarter: (quarter: Quarter) => void;
  setGameScore: (homeScore: number, awayScore: number) => void;
  setGameStatus: (status: Game["status"]) => void;
  setPossession: (possession: Game["possession"]) => void;
  adjustTimeouts: (teamSide: "home" | "away", delta: number) => void;

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

  // Actions: Staff & Settings
  setCurrentStaff: (staff: StaffUser) => void;
  addStaff: (staff: StaffUser) => void;
  toggleSound: () => void;
  toggleTheme: () => void;
  resetAllDataToDefault: () => void;
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

// Initial on-court starters map from mock data
const buildInitialOnCourt = (): Record<string, string[]> => {
  const map: Record<string, string[]> = {};
  INITIAL_PLAYERS.forEach((p) => {
    if (!map[p.teamId]) map[p.teamId] = [];
    if (p.isStarter && map[p.teamId].length < 5) {
      map[p.teamId].push(p.id);
    }
  });
  return map;
};

export const useD2LStore = create<D2LState>()(
  persist(
    (set, get) => ({
      leagues: INITIAL_LEAGUES,
      activeLeagueId: "d2l-s10",
      teams: INITIAL_TEAMS,
      players: INITIAL_PLAYERS,
      games: INITIAL_GAMES,
      activeGameId: "game-live-101",
      statEvents: INITIAL_STAT_EVENTS,
      undoStack: [],
      onCourtPlayerIds: buildInitialOnCourt(),
      staffList: INITIAL_STAFF,
      currentStaff: INITIAL_STAFF[0],
      soundEnabled: true,
      hapticsEnabled: true,
      themeMode: "courtside-dark",
      isOnline: true,
      pendingSyncCount: 0,

      setActiveLeague: (leagueId) => set({ activeLeagueId: leagueId }),

      addLeague: (league) => set((s) => ({ leagues: [...s.leagues, league] })),

      addTeam: (team) => set((s) => ({ teams: [...s.teams, team] })),

      updateTeam: (id, updates) =>
        set((s) => ({
          teams: s.teams.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),

      deleteTeam: (id) =>
        set((s) => {
          const remainingGames = s.games.filter(
            (g) => g.homeTeamId !== id && g.awayTeamId !== id
          );
          const deletedGameIds = s.games
            .filter((g) => g.homeTeamId === id || g.awayTeamId === id)
            .map((g) => g.id);
          const remainingEvents = s.statEvents.filter(
            (e) => !deletedGameIds.includes(e.gameId)
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
        }),

      addPlayer: (player) => set((s) => ({ players: [...s.players, player] })),

      updatePlayer: (id, updates) =>
        set((s) => ({
          players: s.players.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        })),

      deletePlayer: (id) =>
        set((s) => ({
          players: s.players.filter((p) => p.id !== id),
        })),

      importPlayersFromCsv: (newPlayers, teamId) =>
        set((s) => {
          let updated = [...s.players];
          if (teamId) {
            updated = updated.filter((p) => p.teamId !== teamId);
          }
          return { players: [...updated, ...newPlayers] };
        }),

      setActiveGame: (gameId) => set({ activeGameId: gameId }),

      addGame: (game) => set((s) => ({ games: [game, ...s.games] })),

      updateGame: (gameId, updates) =>
        set((s) => ({
          games: s.games.map((g) => (g.id === gameId ? { ...g, ...updates } : g)),
        })),

      deleteGame: (gameId) =>
        set((s) => {
          const remainingGames = s.games.filter((g) => g.id !== gameId);
          const nextActiveGameId =
            s.activeGameId === gameId ? remainingGames[0]?.id || "" : s.activeGameId;
          return {
            games: remainingGames,
            statEvents: s.statEvents.filter((e) => e.gameId !== gameId),
            activeGameId: nextActiveGameId,
          };
        }),

      toggleClock: () => {
        const game = get().getActiveGame();
        if (!game) return;
        const nextState = !game.isClockRunning;
        get().updateGame(game.id, { isClockRunning: nextState });
        if (nextState) {
          soundFX.playClick();
          triggerHaptic("light");
        } else {
          soundFX.playWhistle();
          triggerHaptic("medium");
        }
        broadcastD2LEvent({
          type: "GAME_CLOCK_UPDATED",
          gameId: game.id,
          payload: { isClockRunning: nextState, timeRemainingSeconds: game.timeRemainingSeconds },
          senderStaffId: get().currentStaff.id,
          senderStaffName: get().currentStaff.name,
          timestamp: Date.now(),
        });
      },

      setClockRunning: (running) => {
        const game = get().getActiveGame();
        if (game) get().updateGame(game.id, { isClockRunning: running });
      },

      adjustClockSeconds: (delta) => {
        const game = get().getActiveGame();
        if (!game) return;
        const newSeconds = Math.max(0, game.timeRemainingSeconds + delta);
        get().updateGame(game.id, { timeRemainingSeconds: newSeconds });
      },

      setClockSeconds: (seconds) => {
        const game = get().getActiveGame();
        if (game) get().updateGame(game.id, { timeRemainingSeconds: Math.max(0, seconds) });
      },

      setGameQuarter: (quarter) => {
        const game = get().getActiveGame();
        if (!game) return;
        soundFX.playBuzzer();
        get().updateGame(game.id, {
          quarter,
          timeRemainingSeconds: 600, // 10 minutes default
          isClockRunning: false,
          homeFouls: 0,
          awayFouls: 0,
        });
      },

      setGameScore: (homeScore, awayScore) => {
        const game = get().getActiveGame();
        if (game) get().updateGame(game.id, { homeScore, awayScore });
      },

      setGameStatus: (status) => {
        const game = get().getActiveGame();
        if (game) {
          get().updateGame(game.id, {
            status,
            isClockRunning: status === "live" ? game.isClockRunning : false,
          });
        }
      },

      setPossession: (possession) => {
        const game = get().getActiveGame();
        if (game) get().updateGame(game.id, { possession });
      },

      adjustTimeouts: (teamSide, delta) => {
        const game = get().getActiveGame();
        if (!game) return;
        if (teamSide === "home") {
          const current = game.homeTimeouts;
          const next = Math.max(0, Math.min(5, current + delta));
          get().updateGame(game.id, { homeTimeouts: next });
        } else {
          const current = game.awayTimeouts;
          const next = Math.max(0, Math.min(5, current + delta));
          get().updateGame(game.id, { awayTimeouts: next });
        }
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

        // Format game clock string mm:ss
        const mins = Math.floor(game.timeRemainingSeconds / 60);
        const secs = game.timeRemainingSeconds % 60;
        const clockStr = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

        const newEvent: StatEvent = {
          id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          gameId: game.id,
          teamId,
          playerId,
          quarter: game.quarter,
          gameClock: clockStr,
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
          undoStack: [newEvent, ...s.undoStack.slice(0, 19)], // keep last 20 actions for undo
          games: s.games.map((g) => (g.id === game.id ? updatedGame : g)),
        }));

        // Broadcast to other tabs & queue if needed
        broadcastD2LEvent({
          type: "STAT_EVENT_ADDED",
          gameId: game.id,
          payload: { event: newEvent, game: updatedGame },
          senderStaffId: state.currentStaff.id,
          senderStaffName: state.currentStaff.name,
          timestamp: Date.now(),
        });

        // Also add assist event if assistPlayerId was provided
        if (options?.assistPlayerId) {
          const assistEvt: StatEvent = {
            id: `evt-ast-${Date.now()}`,
            gameId: game.id,
            teamId,
            playerId: options.assistPlayerId,
            quarter: game.quarter,
            gameClock: clockStr,
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

        soundFX.playClick();
        triggerHaptic("medium");

        broadcastD2LEvent({
          type: "STAT_EVENT_DELETED",
          gameId: game.id,
          payload: { eventId: lastEvent.id, game: updatedGame },
          senderStaffId: state.currentStaff.id,
          senderStaffName: state.currentStaff.name,
          timestamp: Date.now(),
        });

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
      },

      editStatEvent: (eventId, updates) => {
        set((s) => ({
          statEvents: s.statEvents.map((e) => (e.id === eventId ? { ...e, ...updates } : e)),
        }));
      },

      setCurrentStaff: (staff) => set({ currentStaff: staff }),

      addStaff: (staff) => set((s) => ({ staffList: [...s.staffList, staff] })),

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

      resetAllDataToDefault: () => {
        set({
          leagues: INITIAL_LEAGUES,
          teams: INITIAL_TEAMS,
          players: INITIAL_PLAYERS,
          games: INITIAL_GAMES,
          statEvents: INITIAL_STAT_EVENTS,
          undoStack: [],
          onCourtPlayerIds: buildInitialOnCourt(),
          staffList: INITIAL_STAFF,
          activeGameId: "game-live-101",
        });
      },

      syncOfflineQueue: () => {
        // Mock flush of offline queue
        set({ pendingSyncCount: 0 });
      },

      // SELECTORS
      getActiveGame: () => {
        const { games, activeGameId } = get();
        return games.find((g) => g.id === activeGameId) || games[0];
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

        const events = state.statEvents.filter((e) => e.gameId === targetGameId);
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
              minutes: p.isStarter ? 24 : 12, // Baseline minutes + live
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
              plusMinus: p.isStarter ? 4 : -2,
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
          const resultList = Object.values(statsMap).map((s) => ({
            ...s,
            fgPct: s.fga > 0 ? Math.round((s.fgm / s.fga) * 100) : 0,
            fg3Pct: s.fg3a > 0 ? Math.round((s.fg3m / s.fg3a) * 100) : 0,
            ftPct: s.fta > 0 ? Math.round((s.ftm / s.fta) * 100) : 0,
          }));

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
              minutes: 200,
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

        // Calculate aggregates for each player
        const items: PlayerLeaderboardItem[] = players.map((player) => {
          const team = teams.find((t) => t.id === player.teamId) || teams[0];
          const playerEvents = statEvents.filter((e) => e.playerId === player.id);

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

          // Seed with realistic baseline statistics based on position and starter status
          const gamesPlayed = 8;
          const baselinePts = player.isStarter ? 14 + (player.jerseyNumber % 10) : 6 + (player.jerseyNumber % 6);
          const baselineReb = player.position === "C" ? 9.8 : player.position === "PF" ? 7.5 : 3.4;
          const baselineAst = player.position === "PG" ? 7.2 : player.position === "SG" ? 3.8 : 1.9;
          const baselineBlk = player.position === "C" ? 2.1 : player.position === "PF" ? 1.3 : 0.4;
          const baselineStl = player.position === "PG" || player.position === "SG" ? 1.8 : 0.8;

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

          const totalPoints = Math.round(baselinePts * gamesPlayed + pts);
          const totalRebounds = Math.round(baselineReb * gamesPlayed + reb);
          const totalAssists = Math.round(baselineAst * gamesPlayed + ast);

          const ppg = parseFloat((totalPoints / gamesPlayed).toFixed(1));
          const rpg = parseFloat((totalRebounds / gamesPlayed).toFixed(1));
          const apg = parseFloat((totalAssists / gamesPlayed).toFixed(1));
          const bpg = parseFloat(((baselineBlk * gamesPlayed + blk) / gamesPlayed).toFixed(1));
          const spg = parseFloat(((baselineStl * gamesPlayed + stl) / gamesPlayed).toFixed(1));

          return {
            player,
            team,
            gamesPlayed,
            ppg,
            rpg,
            apg,
            bpg,
            spg,
            fgPct: player.position === "C" ? 58.4 : 46.2,
            fg3Pct: player.position === "SG" || player.position === "PG" ? 38.5 : 28.0,
            ftPct: 78.5,
            totalPoints,
            totalRebounds,
            totalAssists,
            rank: 1,
          };
        });

        // Sort descending by chosen statKey
        items.sort((a, b) => b[statKey] - a[statKey]);

        // Assign ranks
        items.forEach((item, index) => {
          item.rank = index + 1;
        });

        return items;
      },
    }),
    {
      name: "d2l_league_storage_v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        leagues: state.leagues,
        activeLeagueId: state.activeLeagueId,
        teams: state.teams,
        players: state.players,
        games: state.games,
        activeGameId: state.activeGameId,
        statEvents: state.statEvents,
        onCourtPlayerIds: state.onCourtPlayerIds,
        staffList: state.staffList,
        currentStaff: state.currentStaff,
        soundEnabled: state.soundEnabled,
        hapticsEnabled: state.hapticsEnabled,
        themeMode: state.themeMode,
      }),
    }
  )
);
