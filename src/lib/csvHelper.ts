import Papa from "papaparse";
import { Player, Game } from "./types";

// PLAYER ROSTER CSV EXPORT / IMPORT
export interface PlayerCsvRow {
  team_id: string;
  jersey_number: string | number;
  name: string;
  first_name?: string;
  last_name?: string;
  position: string;
  photo_url?: string;
  is_starter?: string | boolean;
}

export function exportPlayersCsv(players: Player[]): void {
  const rows = players.map((p) => ({
    team_id: p.teamId,
    jersey_number: p.jerseyNumber,
    name: p.name,
    first_name: p.firstName,
    last_name: p.lastName,
    position: p.position,
    photo_url: p.photoUrl || "",
    is_starter: p.isStarter ? "YES" : "NO",
  }));

  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `d2l_players_roster_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function parsePlayersCsv(file: File): Promise<Player[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<PlayerCsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const players: Player[] = results.data.map((row, index) => {
            const name = row.name || `${row.first_name || ""} ${row.last_name || ""}`.trim() || `Player ${index + 1}`;
            const parts = name.split(" ");
            const firstName = row.first_name || parts[0] || "Player";
            const lastName = row.last_name || parts.slice(1).join(" ") || `${index + 1}`;
            const jerseyNumber = parseInt(String(row.jersey_number), 10) || index + 1;
            const pos = (row.position || "SG").toUpperCase().trim() as "PG" | "SG" | "SF" | "PF" | "C";

            return {
              id: `p-csv-${Date.now()}-${index}`,
              teamId: row.team_id || "",
              jerseyNumber,
              name,
              firstName,
              lastName,
              position: ["PG", "SG", "SF", "PF", "C"].includes(pos) ? pos : "SG",
              photoUrl: row.photo_url || "",
              isStarter: String(row.is_starter).toLowerCase() === "yes" || String(row.is_starter) === "true",
              isActive: true,
            };
          });
          resolve(players);
        } catch (err) {
          reject(err);
        }
      },
      error: (err) => reject(err),
    });
  });
}

// SCHEDULE CSV EXPORT / IMPORT
export interface ScheduleCsvRow {
  game_id?: string;
  home_team_id: string;
  away_team_id: string;
  scheduled_at: string;
  venue: string;
  status?: string;
  home_score?: number;
  away_score?: number;
}

export function exportScheduleCsv(games: Game[]): void {
  const rows = games.map((g) => ({
    game_id: g.id,
    home_team_id: g.homeTeamId,
    away_team_id: g.awayTeamId,
    scheduled_at: g.scheduledAt,
    venue: g.venue,
    status: g.status,
    home_score: g.homeScore,
    away_score: g.awayScore,
  }));

  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `d2l_schedule_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseScheduleCsv(file: File, leagueId: string, season: string): Promise<Game[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<ScheduleCsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const games: Game[] = results.data.map((row, index) => ({
            id: row.game_id || `game-csv-${Date.now()}-${index}`,
            leagueId,
            season,
            homeTeamId: row.home_team_id || "",
            awayTeamId: row.away_team_id || "",
            homeScore: Number(row.home_score) || 0,
            awayScore: Number(row.away_score) || 0,
            quarter: "Q1",
            timeRemainingSeconds: 600,
            isClockRunning: false,
            status: (row.status as Game["status"]) || "scheduled",
            scheduledAt: row.scheduled_at || new Date().toISOString(),
            venue: row.venue || "Ayala Alabang Village Main Gym",
            homeFouls: 0,
            awayFouls: 0,
            officials: ["R. Fernandez", "J. Laurel"],
            quarterScores: {
              home: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 },
              away: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 },
            },
          }));
          resolve(games);
        } catch (err) {
          reject(err);
        }
      },
      error: (err) => reject(err),
    });
  });
}
