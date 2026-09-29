/**
 * historicalCsvHelper.ts
 * Parse the "Import Past Games" CSV format and convert aggregate per-player stats
 * into synthetic stat_events that feed seamlessly into calculateBoxScore,
 * getPlayerLeaderboard, and standings — no extra tables required.
 */

import { Game, Player, StatEvent, StatType, Team } from "./types";

// ─── CSV row shape ──────────────────────────────────────────────────────────

export interface HistoricalCsvRow {
  game_date: string;       // e.g. "2025-11-15" or "11/15/2025"
  home_team: string;       // team name (must match existing or will warn)
  away_team: string;
  home_score: string;
  away_score: string;
  player_name: string;
  jersey_number: string;
  team: string;            // the team this player belongs to
  points: string;
  rebounds_offensive: string;
  rebounds_defensive: string;
  assists: string;
  steals: string;
  blocks: string;
  turnovers: string;
  fouls: string;
  fgm: string;
  fga: string;
  threepm: string;
  threepa: string;
  ftm: string;
  fta: string;
}

export const HISTORICAL_CSV_HEADERS = [
  "game_date",
  "home_team",
  "away_team",
  "home_score",
  "away_score",
  "player_name",
  "jersey_number",
  "team",
  "points",
  "rebounds_offensive",
  "rebounds_defensive",
  "assists",
  "steals",
  "blocks",
  "turnovers",
  "fouls",
  "fgm",
  "fga",
  "threepm",
  "threepa",
  "ftm",
  "fta",
] as const;

const HISTORICAL_REQUIRED_HEADERS = [
  "game_date",
  "home_team",
  "away_team",
  "player_name",
  "team",
  "points",
  "fgm",
  "fga",
] as const;

export type CsvImportFormat = "historical" | "schedule" | "unknown";

export function normaliseCsvHeader(header: string): string {
  return header.replace(/^\uFEFF/, "").trim().toLowerCase().replace(/\s+/g, "_");
}

export function detectCsvFormat(csvText: string): CsvImportFormat {
  const firstLine = csvText.split(/\r?\n/, 1)[0] || "";
  const headers = parseCsvLine(firstLine).map(normaliseCsvHeader);
  const historicalMarkers = ["player_name", "points", "fgm", "fga"];
  if (historicalMarkers.every((header) => headers.includes(header))) return "historical";
  if (["game_date", "home_team", "away_team"].every((header) => headers.includes(header))) return "schedule";
  if (["home_team_id", "away_team_id", "scheduled_at"].every((header) => headers.includes(header))) return "schedule";
  return "unknown";
}

// ─── Parsed/preview structures ───────────────────────────────────────────────

export interface ParsedPlayerRow {
  playerName: string;
  jerseyNumber: number;
  teamName: string;
  pts: number;
  oreb: number;
  dreb: number;
  ast: number;
  stl: number;
  blk: number;
  to: number;
  pf: number;
  fgm: number;
  fga: number;
  fg3m: number;
  fg3a: number;
  ftm: number;
  fta: number;
  /** Row index in original CSV (1-based, for error reporting) */
  rowIndex: number;
}

export interface ParsedHistoricalGame {
  gameKey: string;           // "<game_date>|<home_team>|<away_team>"
  gameDate: string;          // normalised ISO date string
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  players: ParsedPlayerRow[];
  warnings: string[];
}

export interface HistoricalImportPreview {
  games: ParsedHistoricalGame[];
  globalErrors: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseNum(v: string): number {
  const n = parseInt(v?.trim() || "0", 10);
  return isNaN(n) ? 0 : n;
}

/** Accept "YYYY-MM-DD", "MM/DD/YYYY", "M/D/YYYY" */
function normaliseDate(raw: string): string | null {
  const s = raw.trim();
  // ISO already
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // MM/DD/YYYY
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const [, m, d, y] = mdy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

// ─── Parse raw CSV text ───────────────────────────────────────────────────────

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseHistoricalCsv(csvText: string): HistoricalImportPreview {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const globalErrors: string[] = [];

  if (lines.length < 2) {
    return {
      games: [],
      globalErrors: ["CSV file is empty or has no data rows."],
    };
  }

  // Parse header
  const headers = parseCsvLine(lines[0]).map(normaliseCsvHeader);
  const required = HISTORICAL_REQUIRED_HEADERS as readonly string[];
  const missing = required.filter((h) => !headers.includes(h));
  if (missing.length > 0) {
    return {
      games: [],
      globalErrors: [
        `Missing required columns: ${missing.join(", ")}. Download the template to see the correct format.`,
      ],
    };
  }

  const idx = (col: string) => headers.indexOf(col);

  // Parse data rows
  const gamesMap = new Map<string, ParsedHistoricalGame>();

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const row = (col: string) => (cells[idx(col)] || "").trim();
    const rowNum = i + 1; // 1-based for error msgs

    const rawDate = row("game_date");
    const homeTeam = row("home_team");
    const awayTeam = row("away_team");

    if (!rawDate || !homeTeam || !awayTeam) {
      globalErrors.push(`Row ${rowNum}: game_date, home_team, and away_team are all required — skipping.`);
      continue;
    }

    const gameDate = normaliseDate(rawDate);
    if (!gameDate) {
      globalErrors.push(`Row ${rowNum}: Cannot parse date "${rawDate}" — use YYYY-MM-DD or MM/DD/YYYY format.`);
      continue;
    }

    const gameKey = `${gameDate}|${homeTeam.toLowerCase()}|${awayTeam.toLowerCase()}`;

    if (!gamesMap.has(gameKey)) {
      gamesMap.set(gameKey, {
        gameKey,
        gameDate,
        homeTeamName: homeTeam,
        awayTeamName: awayTeam,
        homeScore: parseNum(row("home_score")),
        awayScore: parseNum(row("away_score")),
        players: [],
        warnings: [],
      });
    }

    const game = gamesMap.get(gameKey)!;

    const playerName = row("player_name");
    if (!playerName) {
      game.warnings.push(`Row ${rowNum}: player_name is empty — skipping player row.`);
      continue;
    }

    const teamName = row("team");
    if (!teamName) {
      game.warnings.push(`Row ${rowNum}: team column is empty for player "${playerName}" — skipping.`);
      continue;
    }

    if (teamName.toLowerCase() !== homeTeam.toLowerCase() && teamName.toLowerCase() !== awayTeam.toLowerCase()) {
      game.warnings.push(
        `Row ${rowNum}: Player "${playerName}" team "${teamName}" doesn't match home ("${homeTeam}") or away ("${awayTeam}") — included anyway.`
      );
    }

    game.players.push({
      playerName,
      jerseyNumber: parseNum(row("jersey_number")),
      teamName,
      pts: parseNum(row("points")),
      oreb: parseNum(row("rebounds_offensive")),
      dreb: parseNum(row("rebounds_defensive")),
      ast: parseNum(row("assists")),
      stl: parseNum(row("steals")),
      blk: parseNum(row("blocks")),
      to: parseNum(row("turnovers")),
      pf: parseNum(row("fouls")),
      fgm: parseNum(row("fgm")),
      fga: parseNum(row("fga")),
      fg3m: parseNum(row("threepm")),
      fg3a: parseNum(row("threepa")),
      ftm: parseNum(row("ftm")),
      fta: parseNum(row("fta")),
      rowIndex: rowNum,
    });
  }

  return {
    games: Array.from(gamesMap.values()),
    globalErrors,
  };
}

// ─── Convert aggregate stats → synthetic stat_events ─────────────────────────

/**
 * Given a player's aggregate stats for one game, produce synthetic stat_events
 * that replicate the same totals when processed by calculateBoxScore.
 *
 * Scoring reconstruction:
 *   non-3P FGM = fgm - fg3m  →  each = one "2PT_MAKE"
 *   non-3P misses = (fga - fga3) - (fgm - fg3m)  →  each = "2PT_MISS"
 *   fg3m  →  "3PT_MAKE"
 *   3P misses = fg3a - fg3m  →  "3PT_MISS"
 *   ftm   →  "FT_MAKE"
 *   FT misses = fta - ftm  →  "FT_MISS"
 *   oreb  →  "OREB"
 *   dreb  →  "DREB"
 *   ast   →  "AST"
 *   stl   →  "STL"
 *   blk   →  "BLK"
 *   to    →  "TO"
 *   pf    →  "FOUL_PERSONAL"
 */
export function buildSyntheticEvents(
  p: ParsedPlayerRow,
  gameId: string,
  teamId: string,
  playerId: string,
  baseTimestamp: number
): StatEvent[] {
  const events: StatEvent[] = [];
  let seq = 0;

  const make = (statType: StatType, points = 0) => {
    events.push({
      id: `hist-${gameId}-${playerId}-${seq++}`,
      gameId,
      teamId,
      playerId,
      quarter: "Q1",           // historical — no exact quarter info (satisfies NOT NULL)
      gameClock: "N/A",        // sentinel placeholder (satisfies NOT NULL)
      statType,
      points,
      timestamp: (baseTimestamp || Date.now()) + seq,
      synced: true,
      notes: "historical_import",
    });
  };

  const two2pm = Math.max(0, p.fgm - p.fg3m);
  const two2pa_miss = Math.max(0, (p.fga - p.fg3a) - two2pm);
  const three_miss = Math.max(0, p.fg3a - p.fg3m);
  const ft_miss = Math.max(0, p.fta - p.ftm);

  for (let i = 0; i < two2pm; i++) make("2PT_MAKE", 2);
  for (let i = 0; i < two2pa_miss; i++) make("2PT_MISS");
  for (let i = 0; i < p.fg3m; i++) make("3PT_MAKE", 3);
  for (let i = 0; i < three_miss; i++) make("3PT_MISS");
  for (let i = 0; i < p.ftm; i++) make("FT_MAKE", 1);
  for (let i = 0; i < ft_miss; i++) make("FT_MISS");
  for (let i = 0; i < p.oreb; i++) make("OREB");
  for (let i = 0; i < p.dreb; i++) make("DREB");
  for (let i = 0; i < p.ast; i++) make("AST");
  for (let i = 0; i < p.stl; i++) make("STL");
  for (let i = 0; i < p.blk; i++) make("BLK");
  for (let i = 0; i < p.to; i++) make("TO");
  for (let i = 0; i < p.pf; i++) make("FOUL_PERSONAL");

  return events;
}

// ─── Template CSV ─────────────────────────────────────────────────────────────

export function buildTemplateCsv(): string {
  const headers = HISTORICAL_CSV_HEADERS.join(",");
  const example1 = [
    "2025-11-15", "Ballers FC", "Hoopsters", "72", "65",
    "Juan dela Cruz", "7", "Ballers FC",
    "18", "2", "6", "5", "1", "1", "3", "3",
    "7", "14", "2", "5", "2", "3",
  ].join(",");
  const example2 = [
    "2025-11-15", "Ballers FC", "Hoopsters", "72", "65",
    "Miguel Santos", "23", "Hoopsters",
    "12", "1", "4", "3", "2", "0", "2", "2",
    "5", "10", "1", "3", "1", "2",
  ].join(",");
  return [headers, example1, example2].join("\n");
}

// ─── Resolve team ID from name ────────────────────────────────────────────────

export function resolveTeamId(name: string, teams: Team[]): string | null {
  const lower = name.toLowerCase();
  return (
    teams.find(
      (t) =>
        t.name.toLowerCase() === lower ||
        t.shortName.toLowerCase() === lower
    )?.id ?? null
  );
}

// ─── Resolve or build a new player ───────────────────────────────────────────

export function resolveOrCreatePlayer(
  row: ParsedPlayerRow,
  teamId: string,
  existingPlayers: Player[]
): { player: Player; isNew: boolean } {
  const lowerName = row.playerName.toLowerCase();
  const existing = existingPlayers.find(
    (p) =>
      p.teamId === teamId &&
      (p.name.toLowerCase() === lowerName ||
        p.jerseyNumber === row.jerseyNumber)
  );
  if (existing) return { player: existing, isNew: false };

  const nameParts = row.playerName.trim().split(/\s+/);
  const newPlayer: Player = {
    id: `player-hist-${teamId}-${row.jerseyNumber}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    teamId,
    jerseyNumber: row.jerseyNumber,
    name: row.playerName,
    firstName: nameParts[0] || "",
    lastName: nameParts.slice(1).join(" ") || "",
    position: "SG",
    isStarter: false,
    isActive: true,
  };
  return { player: newPlayer, isNew: true };
}
