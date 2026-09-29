"use client";

import React, { useRef, useState } from "react";
import {
  Upload,
  Download,
  X,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Loader2,
  FileSpreadsheet,
  Info,
} from "lucide-react";
import { useD2LStore } from "@/store/useD2LStore";
import { Game, Player, StatEvent } from "@/lib/types";
import {
  parseHistoricalCsv,
  ParsedHistoricalGame,
  ParsedPlayerRow,
  buildSyntheticEvents,
  buildTemplateCsv,
  buildImportedTeam,
  resolveTeamId,
  resolveOrCreatePlayer,
} from "@/lib/historicalCsvHelper";

interface HistoricalImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  leagueId: string;
  season: string;
}

type Step = "upload" | "preview" | "importing" | "done";

export const HistoricalImportModal: React.FC<HistoricalImportModalProps> = ({
  isOpen,
  onClose,
  leagueId,
  season,
}) => {
  const { teams, players, importHistoricalGames, setToastMessage } = useD2LStore();

  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [parsedGames, setParsedGames] = useState<ParsedHistoricalGame[]>([]);
  const [expandedGame, setExpandedGame] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);

  if (!isOpen) return null;

  // ── helpers ──────────────────────────────────────────────────────────────

  const reset = () => {
    setStep("upload");
    setParseErrors([]);
    setParsedGames([]);
    setExpandedGame(null);
    setImportError(null);
    setImportedCount(0);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  // ── template download ─────────────────────────────────────────────────────

  const handleDownloadTemplate = () => {
    const csv = buildTemplateCsv();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "d2l_historical_games_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── file picked ───────────────────────────────────────────────────────────

  const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const result = parseHistoricalCsv(text);
      setParseErrors(result.globalErrors);
      setParsedGames(result.games);
      if (result.games.length > 0) {
        setStep("preview");
        setExpandedGame(result.games[0].gameKey);
      } else {
        setStep("preview");
      }
    };
    reader.readAsText(file);
  };

  // ── commit import ─────────────────────────────────────────────────────────

  const handleConfirmImport = async () => {
    setStep("importing");
    setImportError(null);

    const gamesToInsert: Game[] = [];
    const newPlayersToInsert: Player[] = [];
    const eventsToInsert: StatEvent[] = [];

    // Running players list so we detect duplicates within the same import batch
    const allKnownPlayers = [...players];
    const allKnownTeams = [...teams];
    const newTeamsToInsert: typeof teams = [];
    const importLeagueId = leagueId || "d2l-season-10";
    const importSeason = season || "Season 10 - 2026";

    const getOrCreateTeamId = (name: string) => {
      const existingId = resolveTeamId(name, allKnownTeams);
      if (existingId) return existingId;
      const created = buildImportedTeam(name, importLeagueId);
      allKnownTeams.push(created);
      newTeamsToInsert.push(created);
      return created.id;
    };

    for (const pg of parsedGames) {
      const homeTeamId = getOrCreateTeamId(pg.homeTeamName);
      const awayTeamId = getOrCreateTeamId(pg.awayTeamName);

      const gameId = `game-hist-${pg.gameDate}-${(pg.homeTeamName + pg.awayTeamName).replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;

      const scheduledAt = new Date(pg.gameDate + "T12:00:00").toISOString();

      const game: Game = {
        id: gameId,
        leagueId: importLeagueId,
        season: importSeason,
        homeTeamId,
        awayTeamId,
        homeScore: pg.homeScore,
        awayScore: pg.awayScore,
        quarter: "Q4",
        status: "final",
        scheduledAt,
        venue: pg.venue || "Ayala Alabang Village Main Gym",
        homeFouls: 0,
        awayFouls: 0,
        officials: pg.officials,
        quarterScores: pg.hasQuarterScores ? pg.quarterScores : {
          home: { Q1: 0, Q2: 0, Q3: 0, Q4: pg.homeScore },
          away: { Q1: 0, Q2: 0, Q3: 0, Q4: pg.awayScore },
        },
        isHistoricalImport: true,
      };
      gamesToInsert.push(game);

      const baseTs = Date.now();

      for (const pr of pg.players) {
        const teamName = pr.teamName.toLowerCase();
        const isHome =
          homeTeamId && teamName === pg.homeTeamName.toLowerCase()
            ? homeTeamId
            : null;
        const isAway =
          awayTeamId && teamName === pg.awayTeamName.toLowerCase()
            ? awayTeamId
            : null;
        const teamId =
          isHome ??
          isAway ??
          getOrCreateTeamId(pr.teamName);

        const resolved = resolveOrCreatePlayer(pr, teamId, allKnownPlayers);
        const player = resolved.player;
        const isNew = resolved.isNew;

        const previousPlayer = allKnownPlayers.find((knownPlayer) => knownPlayer.id === player.id);
        if (isNew || (previousPlayer && previousPlayer.position !== player.position)) {
          newPlayersToInsert.push(player);
        }
        if (isNew) {
          allKnownPlayers.push(player); // avoid re-creating in subsequent rows
        }

        const synthEvents = buildSyntheticEvents(pr, gameId, teamId, player.id, baseTs);
        eventsToInsert.push(...synthEvents);
      }
    }

    const res = await importHistoricalGames(gamesToInsert, newPlayersToInsert, eventsToInsert, newTeamsToInsert);

    if (res.success) {
      setImportedCount(gamesToInsert.length);
      setToastMessage({
        type: "success",
        text: `Successfully imported ${gamesToInsert.length} game${gamesToInsert.length === 1 ? "" : "s"} with ${eventsToInsert.length} player stats.`,
      });
      setStep("done");
    } else {
      setImportError(res.error || "Unknown error during import");
      setStep("preview");
    }
  };

  // ── row expansion toggle ──────────────────────────────────────────────────

  const toggleGame = (key: string) =>
    setExpandedGame((prev) => (prev === key ? null : key));

  // ── team resolution badge ─────────────────────────────────────────────────

  const TeamBadge = ({ name }: { name: string }) => {
    const found = resolveTeamId(name, teams);
    return found ? (
      <span className="text-emerald-400 text-[10px] font-bold ml-1">(matched)</span>
    ) : (
      <span className="text-amber-400 text-[10px] font-bold ml-1">(not in DB — will be skipped)</span>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-d2l-panelDark border-2 border-d2l-gold/60 rounded-2xl w-full max-w-3xl my-6 shadow-2xl text-white">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-d2l-borderDark">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-d2l-forest border border-d2l-gold/40">
              <FileSpreadsheet className="w-5 h-5 text-d2l-gold" />
            </div>
            <div>
              <h2 className="font-athletic font-extrabold text-lg text-white tracking-wide">
                IMPORT PAST GAMES
              </h2>
              <p className="text-xs text-gray-400">
                Backfill historical game data from a CSV file
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-d2l-cardDark transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">

          {/* ── UPLOAD STEP ────────────────────────────────────────── */}
          {step === "upload" && (
            <>
              {/* Info box */}
              <div className="bg-blue-950/50 border border-blue-500/30 rounded-xl p-4 space-y-1.5 text-xs text-blue-200">
                <div className="flex items-center gap-2 font-bold text-blue-300">
                  <Info className="w-4 h-4" /> How it works
                </div>
                <ul className="list-disc list-inside space-y-1 text-blue-200/80 ml-1">
                  <li>Each row in the CSV is one player's stats for one game.</li>
                  <li>Games are identified by date + home team + away team.</li>
                  <li>Players not yet in the system are created automatically.</li>
                  <li>Imported games show as <strong>Final</strong> everywhere in the app.</li>
                  <li>Box Score, Standings, and Player Rankings update automatically.</li>
                </ul>
              </div>

              {/* Download template */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-d2l-gold/50 text-d2l-gold text-xs font-athletic font-bold hover:bg-d2l-gold/10 transition"
                >
                  <Download className="w-4 h-4" />
                  Download CSV Template
                </button>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-d2l-forest border border-d2l-gold/40 text-white text-xs font-athletic font-bold hover:bg-d2l-forestLight transition"
                >
                  <Upload className="w-4 h-4 text-d2l-gold" />
                  Select CSV File
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleFilePicked}
                />
              </div>

              {/* Column guide */}
              <div className="bg-black/30 rounded-xl border border-d2l-borderDark p-4">
                <p className="text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-2">Required CSV Columns</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {[
                    "game_date", "home_team", "away_team",
                    "home_score", "away_score", "player_name",
                    "jersey_number", "team", "points",
                    "rebounds_offensive", "rebounds_defensive", "assists",
                    "steals", "blocks", "turnovers",
                    "fouls", "fgm", "fga",
                    "threepm", "threepa", "ftm", "fta",
                  ].map((col) => (
                    <span key={col} className="font-mono text-[10px] bg-d2l-cardDark text-d2l-gold px-2 py-1 rounded-lg">
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── PREVIEW STEP ───────────────────────────────────────── */}
          {step === "preview" && (
            <>
              {/* Global errors */}
              {parseErrors.length > 0 && (
                <div className="bg-rose-950/60 border border-rose-500/40 rounded-xl p-4 space-y-1">
                  <p className="text-xs font-bold text-rose-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Parse Warnings
                  </p>
                  <ul className="text-[11px] text-rose-200 list-disc list-inside space-y-0.5">
                    {parseErrors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              )}

              {/* Import error from server */}
              {importError && (
                <div className="bg-rose-950/60 border border-rose-500/40 rounded-xl p-4">
                  <p className="text-xs font-bold text-rose-300">Import failed: {importError}</p>
                </div>
              )}

              {parsedGames.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  No valid games found in the CSV.{" "}
                  <button className="text-d2l-gold underline" onClick={reset}>
                    Try again
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-athletic font-bold text-white">
                      {parsedGames.length} game{parsedGames.length !== 1 ? "s" : ""} detected — review before importing
                    </p>
                    <button className="text-xs text-gray-400 hover:text-white underline" onClick={reset}>
                      ← Change file
                    </button>
                  </div>

                  {/* Game list */}
                  <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                    {parsedGames.map((pg) => (
                      <div key={pg.gameKey} className="bg-black/30 border border-d2l-borderDark rounded-xl overflow-hidden">
                        {/* Game header */}
                        <button
                          className="w-full flex items-center justify-between p-3 hover:bg-d2l-cardDark transition text-left"
                          onClick={() => toggleGame(pg.gameKey)}
                        >
                          <div className="flex items-center gap-3">
                            {expandedGame === pg.gameKey ? (
                              <ChevronDown className="w-4 h-4 text-d2l-gold" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            )}
                            <div>
                              <p className="text-sm font-athletic font-bold text-white">
                                {pg.homeTeamName} vs {pg.awayTeamName}
                              </p>
                              <p className="text-[11px] text-gray-400">
                                {pg.gameDate} &nbsp;·&nbsp; Final: {pg.homeScore}–{pg.awayScore} &nbsp;·&nbsp; {pg.players.length} player rows
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <span className="text-[10px] bg-d2l-forest text-d2l-gold border border-d2l-gold/30 px-2 py-0.5 rounded-full font-bold">
                              FINAL
                            </span>
                          </div>
                        </button>

                        {/* Expanded player rows */}
                        {expandedGame === pg.gameKey && (
                          <div className="border-t border-d2l-borderDark">
                            {/* Team name resolution */}
                            <div className="px-4 py-2 bg-black/20 text-[11px] space-y-0.5">
                              <div>
                                🏠 Home: <strong className="text-white">{pg.homeTeamName}</strong>
                                <TeamBadge name={pg.homeTeamName} />
                              </div>
                              <div>
                                🚌 Away: <strong className="text-white">{pg.awayTeamName}</strong>
                                <TeamBadge name={pg.awayTeamName} />
                              </div>
                            </div>

                            {/* Per-game warnings */}
                            {pg.warnings.length > 0 && (
                              <div className="px-4 py-2 bg-amber-950/30 text-[11px] text-amber-300 space-y-0.5">
                                {pg.warnings.map((w, i) => (
                                  <div key={i} className="flex items-start gap-1.5">
                                    <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                                    {w}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Player table */}
                            <div className="overflow-x-auto">
                              <table className="w-full text-[11px] text-gray-300">
                                <thead>
                                  <tr className="border-b border-d2l-borderDark bg-d2l-cardDark/60">
                                    {["#", "Player", "Team", "PTS", "REB", "AST", "STL", "BLK", "TO", "PF", "FG", "3P", "FT"].map(
                                      (h) => (
                                        <th key={h} className="px-2 py-1.5 text-left font-bold text-gray-400 whitespace-nowrap">
                                          {h}
                                        </th>
                                      )
                                    )}
                                  </tr>
                                </thead>
                                <tbody>
                                  {pg.players.map((pr) => (
                                    <PlayerPreviewRow key={`${pr.playerName}-${pr.rowIndex}`} pr={pr} existingPlayers={players} teams={teams} />
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {/* ── IMPORTING STEP ─────────────────────────────────────── */}
          {step === "importing" && (
            <div className="flex flex-col items-center gap-4 py-12">
              <Loader2 className="w-10 h-10 text-d2l-gold animate-spin" />
              <p className="text-base font-athletic font-bold text-white">Saving to Supabase…</p>
              <p className="text-xs text-gray-400">This may take a moment for large imports.</p>
            </div>
          )}

          {/* ── DONE STEP ──────────────────────────────────────────── */}
          {step === "done" && (
            <div className="flex flex-col items-center gap-4 py-10">
              <div className="p-4 rounded-full bg-emerald-500/20 border border-emerald-500/40">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>
              <p className="text-lg font-athletic font-black text-white">Import Complete!</p>
              <p className="text-sm text-gray-300 text-center">
                Successfully imported{" "}
                <strong className="text-d2l-gold">{importedCount} game{importedCount !== 1 ? "s" : ""}</strong> into the league records.
              </p>
              <p className="text-xs text-gray-400 text-center max-w-sm">
                Games appear as <strong>Final</strong> in Schedule, Box Score, Standings, and Player Rankings.
                The Game Log for these games shows "No play-by-play available."
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-5 pb-5 pt-3 border-t border-d2l-borderDark">
          {step === "upload" && (
            <button
              onClick={handleClose}
              className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold transition"
            >
              Close
            </button>
          )}

          {step === "preview" && (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold transition"
              >
                Cancel
              </button>
              {parsedGames.length > 0 && (
                <button
                  onClick={handleConfirmImport}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-d2l-forest border border-d2l-gold/40 text-white text-xs font-athletic font-bold hover:bg-d2l-forestLight transition"
                >
                  <Upload className="w-4 h-4 text-d2l-gold" />
                  Import {parsedGames.length} Game{parsedGames.length !== 1 ? "s" : ""}
                </button>
              )}
            </>
          )}

          {step === "done" && (
            <button
              onClick={handleClose}
              className="px-5 py-2 rounded-lg bg-d2l-forest border border-d2l-gold/40 text-white text-xs font-athletic font-bold hover:bg-d2l-forestLight transition"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Player preview row sub-component ────────────────────────────────────────

interface PlayerPreviewRowProps {
  pr: ParsedPlayerRow;
  existingPlayers: Player[];
  teams: import("@/lib/types").Team[];
}

const PlayerPreviewRow: React.FC<PlayerPreviewRowProps> = ({ pr, existingPlayers, teams }) => {
  const teamId = resolveTeamId(pr.teamName, teams);
  const { isNew } = resolveOrCreatePlayer(pr, teamId ?? "", existingPlayers);

  return (
    <tr className="border-b border-d2l-borderDark/50 hover:bg-d2l-cardDark/30">
      <td className="px-2 py-1.5 font-mono text-gray-400">{pr.jerseyNumber}</td>
      <td className="px-2 py-1.5 whitespace-nowrap">
        <span className="text-white font-medium">{pr.playerName}</span>
        {isNew && (
          <span className="ml-1.5 text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1 py-0.5 rounded font-bold">
            NEW
          </span>
        )}
      </td>
      <td className="px-2 py-1.5 text-gray-400 whitespace-nowrap">{pr.teamName}</td>
      <td className="px-2 py-1.5 font-bold text-white">{pr.pts}</td>
      <td className="px-2 py-1.5">{pr.oreb + pr.dreb}</td>
      <td className="px-2 py-1.5">{pr.ast}</td>
      <td className="px-2 py-1.5">{pr.stl}</td>
      <td className="px-2 py-1.5">{pr.blk}</td>
      <td className="px-2 py-1.5">{pr.to}</td>
      <td className="px-2 py-1.5">{pr.pf}</td>
      <td className="px-2 py-1.5 whitespace-nowrap">{pr.fgm}/{pr.fga}</td>
      <td className="px-2 py-1.5 whitespace-nowrap">{pr.fg3m}/{pr.fg3a}</td>
      <td className="px-2 py-1.5 whitespace-nowrap">{pr.ftm}/{pr.fta}</td>
    </tr>
  );
};
