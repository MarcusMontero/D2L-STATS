import { supabase, isSupabaseConfigured } from "./supabaseClient";
import { League, Team, Player, Game, StatEvent, StaffUser, StaffRole } from "./types";

// ==========================================
// MAPPERS: DB (snake_case) <-> TS (camelCase)
// ==========================================

export function mapLeagueFromDb(row: any): League {
  return {
    id: row.id,
    name: row.name || "",
    season: row.season || "",
    location: row.location || "Ayala Alabang Village",
    isActive: row.is_active ?? true,
  };
}

export function mapLeagueToDb(l: League): any {
  return {
    id: l.id,
    name: l.name,
    season: l.season,
    location: l.location,
    is_active: l.isActive,
  };
}

export function mapTeamFromDb(row: any): Team {
  return {
    id: row.id,
    leagueId: row.league_id || "d2l-s10",
    name: row.name || "",
    shortName: row.short_name || row.name || "",
    logo: row.logo || "",
    primaryColor: row.primary_color || "#0B3B24",
    secondaryColor: row.secondary_color || "#D4AF37",
    wins: row.wins ?? 0,
    losses: row.losses ?? 0,
    pointsFor: row.points_for ?? 0,
    pointsAgainst: row.points_against ?? 0,
    streak: row.streak || "-",
  };
}

export function mapTeamToDb(t: Team): any {
  return {
    id: t.id,
    league_id: null, // nullable foreign key to prevent FK violations when leagues table is unseeded
    name: t.name,
    short_name: t.shortName,
    logo: t.logo || "",
    primary_color: t.primaryColor || "#0B3B24",
    secondary_color: t.secondaryColor || "#D4AF37",
    wins: t.wins ?? 0,
    losses: t.losses ?? 0,
    points_for: t.pointsFor ?? 0,
    points_against: t.pointsAgainst ?? 0,
    streak: t.streak || "-",
  };
}

export function mapPlayerFromDb(row: any): Player {
  return {
    id: row.id,
    teamId: row.team_id || "",
    jerseyNumber: row.jersey_number ?? 0,
    name: row.name || "",
    firstName: row.first_name || row.name?.split(" ")[0] || "",
    lastName: row.last_name || row.name?.split(" ").slice(1).join(" ") || "",
    position: row.position || "SG",
    photoUrl: row.photo_url || undefined,
    isStarter: row.is_starter ?? false,
    isActive: row.is_active ?? true,
  };
}

export function mapPlayerToDb(p: Player): any {
  return {
    id: p.id,
    team_id: p.teamId,
    jersey_number: p.jerseyNumber,
    name: p.name,
    first_name: p.firstName || p.name?.split(" ")[0] || "",
    last_name: p.lastName || p.name?.split(" ").slice(1).join(" ") || "",
    position: p.position,
    photo_url: p.photoUrl || null,
    is_starter: p.isStarter ?? false,
    is_active: p.isActive ?? true,
  };
}

export function mapGameFromDb(row: any): Game {
  const qScores = row.quarter_scores || {
    home: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 },
    away: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 },
  };

  return {
    id: row.id,
    leagueId: row.league_id || "d2l-s10",
    season: row.season || "Season 10 - 2026",
    homeTeamId: row.home_team_id || "",
    awayTeamId: row.away_team_id || "",
    homeScore: row.home_score ?? 0,
    awayScore: row.away_score ?? 0,
    quarter: row.quarter || "Q1",
    timeRemainingSeconds: row.time_remaining_seconds ?? 600,
    isClockRunning: row.is_clock_running ?? false,
    status: row.status || "scheduled",
    scheduledAt: row.scheduled_at || new Date().toISOString(),
    venue: row.venue || "Ayala Alabang Village Main Gym",
    homeFouls: row.home_fouls ?? 0,
    awayFouls: row.away_fouls ?? 0,
    officials: row.officials || ["R. Fernandez"],
    quarterScores: qScores,
    isHistoricalImport: row.is_historical_import ?? false,
  };
}

export function mapGameToDb(g: Game): any {
  return {
    id: g.id,
    league_id: null, // nullable foreign key
    season: g.season,
    home_team_id: g.homeTeamId || null,
    away_team_id: g.awayTeamId || null,
    home_score: g.homeScore,
    away_score: g.awayScore,
    quarter: g.quarter,
    time_remaining_seconds: g.timeRemainingSeconds,
    is_clock_running: g.isClockRunning,
    status: g.status,
    scheduled_at: g.scheduledAt,
    venue: g.venue,
    home_fouls: g.homeFouls,
    away_fouls: g.awayFouls,
    officials: g.officials,
    quarter_scores: g.quarterScores,
    is_historical_import: g.isHistoricalImport ?? false,
  };
}

export function mapStatEventFromDb(row: any): StatEvent {
  return {
    id: row.id,
    gameId: row.game_id,
    teamId: row.team_id,
    playerId: row.player_id,
    quarter: row.quarter,
    gameClock: row.game_clock || "-",
    statType: row.stat_type,
    points: row.points ?? 0,
    assistPlayerId: row.assist_player_id || undefined,
    blockPlayerId: row.block_player_id || undefined,
    foulOnPlayerId: row.foul_on_player_id || undefined,
    notes: row.notes || undefined,
    timestamp: Number(row.timestamp) || Date.now(),
    synced: row.synced ?? true,
    staffName: row.staff_name || undefined,
    staffRole: (row.staff_role as StaffRole) || "staff",
  };
}

export function mapStatEventToDb(e: StatEvent): any {
  return {
    id: e.id,
    game_id: e.gameId,
    team_id: e.teamId || null,
    player_id: e.playerId || null,
    quarter: e.quarter,
    game_clock: e.gameClock || "-",
    stat_type: e.statType,
    points: e.points ?? 0,
    assist_player_id: e.assistPlayerId || null,
    block_player_id: e.blockPlayerId || null,
    foul_on_player_id: e.foulOnPlayerId || null,
    notes: e.notes || null,
    timestamp: e.timestamp,
    staff_name: e.staffName || null,
    staff_role: e.staffRole || "staff",
    synced: e.synced ?? true,
  };
}

export function mapStaffUserFromDb(row: any): StaffUser {
  return {
    id: row.id,
    name: row.name || "",
    email: row.email || "",
    role: (row.role as StaffRole) || "staff",
    pin: row.pin || "2026",
    avatar: row.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  };
}

export function mapStaffUserToDb(s: StaffUser): any {
  return {
    id: s.id,
    name: s.name,
    email: s.email,
    role: s.role,
    pin: s.pin,
    avatar_url: s.avatar,
  };
}

// ==========================================
// SUPABASE READ QUERIES
// ==========================================

export async function fetchAllLeagueData(): Promise<{
  leagues: League[];
  teams: Team[];
  players: Player[];
  games: Game[];
  statEvents: StatEvent[];
  staffList: StaffUser[];
}> {
  if (!isSupabaseConfigured) {
    return {
      leagues: [],
      teams: [],
      players: [],
      games: [],
      statEvents: [],
      staffList: [],
    };
  }

  try {
    const [
      { data: leaguesData, error: leaguesErr },
      { data: teamsData, error: teamsErr },
      { data: playersData, error: playersErr },
      { data: gamesData, error: gamesErr },
      { data: statEventsData, error: statEventsErr },
      { data: staffData, error: staffErr },
    ] = await Promise.all([
      supabase.from("leagues").select("*"),
      supabase.from("teams").select("*"),
      supabase.from("players").select("*"),
      supabase.from("games").select("*"),
      supabase.from("stat_events").select("*"),
      supabase.from("staff_users").select("*"),
    ]);

    if (leaguesErr) console.warn("Supabase leagues fetch:", leaguesErr.message);
    if (teamsErr) console.warn("Supabase teams fetch:", teamsErr.message);
    if (playersErr) console.warn("Supabase players fetch:", playersErr.message);
    if (gamesErr) console.warn("Supabase games fetch:", gamesErr.message);
    if (statEventsErr) console.warn("Supabase statEvents fetch:", statEventsErr.message);
    if (staffErr) console.warn("Supabase staff fetch:", staffErr.message);

    const leagues = (leaguesData || []).map(mapLeagueFromDb);
    const teams = (teamsData || []).map(mapTeamFromDb);
    const players = (playersData || []).map(mapPlayerFromDb);
    const games = (gamesData || []).map(mapGameFromDb);
    const statEvents = (statEventsData || []).map(mapStatEventFromDb);
    const staffList = (staffData || []).map(mapStaffUserFromDb);

    return {
      leagues,
      teams,
      players,
      games,
      statEvents,
      staffList,
    };
  } catch (err) {
    console.error("Failed to fetch all data from Supabase:", err);
    return {
      leagues: [],
      teams: [],
      players: [],
      games: [],
      statEvents: [],
      staffList: [],
    };
  }
}

// ==========================================
// SUPABASE WRITE QUERIES (with full error logging)
// ==========================================

export async function dbInsertTeam(team: Team): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { success: true };
  const row = mapTeamToDb(team);
  const { error } = await supabase.from("teams").upsert(row);
  if (error) {
    console.error("❌ Supabase dbInsertTeam error:", error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function dbUpdateTeam(id: string, updates: Partial<Team>): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { success: true };
  const dbUpdates: any = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.shortName !== undefined) dbUpdates.short_name = updates.shortName;
  if (updates.logo !== undefined) dbUpdates.logo = updates.logo;
  if (updates.primaryColor !== undefined) dbUpdates.primary_color = updates.primaryColor;
  if (updates.secondaryColor !== undefined) dbUpdates.secondary_color = updates.secondaryColor;
  if (updates.wins !== undefined) dbUpdates.wins = updates.wins;
  if (updates.losses !== undefined) dbUpdates.losses = updates.losses;
  if (updates.pointsFor !== undefined) dbUpdates.points_for = updates.pointsFor;
  if (updates.pointsAgainst !== undefined) dbUpdates.points_against = updates.pointsAgainst;
  if (updates.streak !== undefined) dbUpdates.streak = updates.streak;

  const { error } = await supabase.from("teams").update(dbUpdates).eq("id", id);
  if (error) {
    console.error("❌ Supabase dbUpdateTeam error:", error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function dbDeleteTeam(id: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { success: true };
  try {
    // 1. Delete all stat events referencing this team directly
    const { error: statTeamErr } = await supabase.from("stat_events").delete().eq("team_id", id);
    if (statTeamErr) console.warn("Supabase dbDeleteTeam stat_events team_id note:", statTeamErr.message);

    // 2. Find players of this team and delete their stat events (scorer, assist, block, foul)
    const { data: teamPlayers } = await supabase.from("players").select("id").eq("team_id", id);
    if (teamPlayers && teamPlayers.length > 0) {
      const playerIds = teamPlayers.map((p) => p.id);
      await supabase.from("stat_events").delete().in("player_id", playerIds);
      await supabase.from("stat_events").delete().in("assist_player_id", playerIds);
      await supabase.from("stat_events").delete().in("block_player_id", playerIds);
      await supabase.from("stat_events").delete().in("foul_on_player_id", playerIds);
    }

    // 3. Delete players of this team
    const { error: playersErr } = await supabase.from("players").delete().eq("team_id", id);
    if (playersErr) console.warn("Supabase dbDeleteTeam players note:", playersErr.message);

    // 4. Find all games involving this team (home or away)
    const { data: teamGames } = await supabase
      .from("games")
      .select("id")
      .or(`home_team_id.eq.${id},away_team_id.eq.${id}`);

    if (teamGames && teamGames.length > 0) {
      const gameIds = teamGames.map((g) => g.id);
      await supabase.from("stat_events").delete().in("game_id", gameIds);
      await supabase.from("games").delete().in("id", gameIds);
    }

    // 5. Delete the team itself
    const { error } = await supabase.from("teams").delete().eq("id", id);
    if (error) {
      console.error("❌ Supabase dbDeleteTeam error:", error);
      return { success: false, error: error.message };
    }

    console.log(`✅ Supabase dbDeleteTeam succeeded for team ${id}`);
    return { success: true };
  } catch (err: any) {
    console.error("❌ Exception in dbDeleteTeam:", err);
    return { success: false, error: err?.message || "Failed to delete team" };
  }
}

export async function dbInsertPlayer(player: Player): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { success: true };
  const row = mapPlayerToDb(player);
  const { error } = await supabase.from("players").upsert(row);
  if (error) {
    console.error("❌ Supabase dbInsertPlayer error:", error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function dbUpdatePlayer(id: string, updates: Partial<Player>): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { success: true };
  const dbUpdates: any = {};
  if (updates.teamId !== undefined) dbUpdates.team_id = updates.teamId;
  if (updates.jerseyNumber !== undefined) dbUpdates.jersey_number = updates.jerseyNumber;
  if (updates.name !== undefined) {
    dbUpdates.name = updates.name;
    dbUpdates.first_name = updates.firstName || updates.name.split(" ")[0] || "";
    dbUpdates.last_name = updates.lastName || updates.name.split(" ").slice(1).join(" ") || "";
  }
  if (updates.position !== undefined) dbUpdates.position = updates.position;
  if (updates.photoUrl !== undefined) dbUpdates.photo_url = updates.photoUrl;
  if (updates.isStarter !== undefined) dbUpdates.is_starter = updates.isStarter;
  if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

  const { error } = await supabase.from("players").update(dbUpdates).eq("id", id);
  if (error) {
    console.error("❌ Supabase dbUpdatePlayer error:", error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function dbDeletePlayer(id: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { success: true };
  try {
    // 1. Delete stat events referencing this player
    await supabase.from("stat_events").delete().eq("player_id", id);
    await supabase.from("stat_events").delete().eq("assist_player_id", id);
    await supabase.from("stat_events").delete().eq("block_player_id", id);
    await supabase.from("stat_events").delete().eq("foul_on_player_id", id);

    // 2. Delete the player row
    const { error } = await supabase.from("players").delete().eq("id", id);
    if (error) {
      console.error("❌ Supabase dbDeletePlayer error:", error);
      return { success: false, error: error.message };
    }

    console.log(`✅ Supabase dbDeletePlayer succeeded for player ${id}`);
    return { success: true };
  } catch (err: any) {
    console.error("❌ Exception in dbDeletePlayer:", err);
    return { success: false, error: err?.message || "Failed to delete player" };
  }
}

export async function dbInsertGame(game: Game): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { success: true };
  const row = mapGameToDb(game);
  const { error } = await supabase.from("games").upsert(row);
  if (error) {
    console.error("❌ Supabase dbInsertGame error:", error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function dbUpdateGame(id: string, updates: Partial<Game>): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { success: true };
  const dbUpdates: any = {};
  if (updates.homeTeamId !== undefined) dbUpdates.home_team_id = updates.homeTeamId;
  if (updates.awayTeamId !== undefined) dbUpdates.away_team_id = updates.awayTeamId;
  if (updates.homeScore !== undefined) dbUpdates.home_score = updates.homeScore;
  if (updates.awayScore !== undefined) dbUpdates.away_score = updates.awayScore;
  if (updates.quarter !== undefined) dbUpdates.quarter = updates.quarter;
  if (updates.timeRemainingSeconds !== undefined) dbUpdates.time_remaining_seconds = updates.timeRemainingSeconds;
  if (updates.isClockRunning !== undefined) dbUpdates.is_clock_running = updates.isClockRunning;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.scheduledAt !== undefined) dbUpdates.scheduled_at = updates.scheduledAt;
  if (updates.venue !== undefined) dbUpdates.venue = updates.venue;
  if (updates.homeFouls !== undefined) dbUpdates.home_fouls = updates.homeFouls;
  if (updates.awayFouls !== undefined) dbUpdates.away_fouls = updates.awayFouls;
  if (updates.quarterScores !== undefined) dbUpdates.quarter_scores = updates.quarterScores;

  const { error } = await supabase.from("games").update(dbUpdates).eq("id", id);
  if (error) {
    console.error("❌ Supabase dbUpdateGame error:", error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function dbDeleteGame(id: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { success: true };
  try {
    // 1. Delete stat events for this game
    await supabase.from("stat_events").delete().eq("game_id", id);

    // 2. Delete the game
    const { error } = await supabase.from("games").delete().eq("id", id);
    if (error) {
      console.error("❌ Supabase dbDeleteGame error:", error);
      return { success: false, error: error.message };
    }

    console.log(`✅ Supabase dbDeleteGame succeeded for game ${id}`);
    return { success: true };
  } catch (err: any) {
    console.error("❌ Exception in dbDeleteGame:", err);
    return { success: false, error: err?.message || "Failed to delete game" };
  }
}

export async function dbInsertStatEvent(event: StatEvent): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { success: true };
  const row = mapStatEventToDb(event);
  const { error } = await supabase.from("stat_events").upsert(row);
  if (error) {
    console.error("❌ Supabase dbInsertStatEvent error:", error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function dbDeleteStatEvent(id: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { success: true };
  const { error } = await supabase.from("stat_events").delete().eq("id", id);
  if (error) {
    console.error("❌ Supabase dbDeleteStatEvent error:", error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function dbInsertStaff(staff: StaffUser): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { success: true };
  const row = mapStaffUserToDb(staff);
  const { error } = await supabase.from("staff_users").upsert(row);
  if (error) {
    console.warn("Supabase dbInsertStaff note:", error.message);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function dbUpdateStaffPin(staffId: string, pinHash: string): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { success: true };
  const { error } = await supabase.from("staff_users").update({ pin: pinHash }).eq("id", staffId);
  if (error) {
    console.warn("Supabase dbUpdateStaffPin note:", error.message);
    return { success: false, error: error.message };
  }
  return { success: true };
}
