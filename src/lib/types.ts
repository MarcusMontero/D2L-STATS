export type StatType =
  | "2PT_MAKE"
  | "2PT_MISS"
  | "3PT_MAKE"
  | "3PT_MISS"
  | "FT_MAKE"
  | "FT_MISS"
  | "OREB"
  | "DREB"
  | "AST"
  | "STL"
  | "BLK"
  | "TO"
  | "FOUL_PERSONAL"
  | "FOUL_TECH"
  | "SUB_IN"
  | "SUB_OUT"
  | "TIMEOUT";

export interface CorrectionStats {
  pts: number; fgm: number; fga: number; fg3m: number; fg3a: number;
  ftm: number; fta: number; oreb: number; dreb: number; ast: number;
  stl: number; blk: number; to: number; pf: number;
}

export type Quarter = "Q1" | "Q2" | "Q3" | "Q4" | "OT1" | "OT2";

export type GameStatus = "scheduled" | "live" | "halftime" | "final" | "overtime";

// Exactly two simplified roles: 'admin' (System Admin) and 'staff' (Courtside Stat Staff)
export type StaffRole = "admin" | "staff";

export interface League {
  id: string;
  name: string;
  season: string;
  location: string;
  isActive: boolean;
  /** Shared across devices via Supabase — which game the tracker is on. */
  activeGameId?: string;
}

export interface Team {
  id: string;
  leagueId: string;
  name: string;
  shortName: string;
  logo: string; // image URL, base64 data URI, or emoji fallback
  primaryColor: string;
  secondaryColor: string;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  streak: string;
}

export interface Player {
  id: string;
  teamId: string;
  jerseyNumber: number;
  name: string;
  firstName: string;
  lastName: string;
  position: "PG" | "SG" | "SF" | "PF" | "C";
  photoUrl?: string; // Optional face photo URL / data URI
  isStarter: boolean;
  isActive: boolean;
}

export interface Game {
  id: string;
  leagueId: string;
  season: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  quarter: Quarter;
  status: GameStatus;
  scheduledAt: string; // ISO date string
  venue: string; // e.g., "Ayala Alabang Village Main Court"
  homeFouls: number;
  awayFouls: number;
  officials: string[];
  quarterScores: {
    home: { Q1: number; Q2: number; Q3: number; Q4: number; OT1?: number; OT2?: number; [key: string]: number | undefined };
    away: { Q1: number; Q2: number; Q3: number; Q4: number; OT1?: number; OT2?: number; [key: string]: number | undefined };
  };
  /** True for games backfilled via CSV historical import (no live play-by-play). */
  isHistoricalImport?: boolean;
}

export interface StatEvent {
  id: string;
  gameId: string;
  teamId: string;
  playerId: string;
  quarter: Quarter;
  gameClock: string; // e.g. "06:18"
  statType: StatType;
  points: number;
  assistPlayerId?: string;
  blockPlayerId?: string;
  foulOnPlayerId?: string;
  timestamp: number;
  synced: boolean;
  staffName?: string;
  staffRole?: StaffRole;
  notes?: string;
}

export interface PlayerBoxStat {
  playerId: string;
  teamId: string;
  jerseyNumber: number;
  name: string;
  position: string;
  isStarter: boolean;
  isOnCourt: boolean;
  minutes: number;
  seconds: number;
  pts: number;
  fgm: number;
  fga: number;
  fgPct: number;
  fg3m: number;
  fg3a: number;
  fg3Pct: number;
  ftm: number;
  fta: number;
  ftPct: number;
  oreb: number;
  dreb: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  to: number;
  pf: number;
  tech: number;
  plusMinus: number;
}

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  pin: string;
  avatar: string;
}

export interface PlayerLeaderboardItem {
  player: Player;
  team: Team;
  gamesPlayed: number;
  ppg: number;
  rpg: number;
  apg: number;
  bpg: number;
  spg: number;
  fgPct: number;
  fg3Pct: number;
  ftPct: number;
  totalPoints: number;
  totalRebounds: number;
  totalAssists: number;
  rank: number;
}
