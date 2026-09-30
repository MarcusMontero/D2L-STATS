"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useD2LStore } from "@/store/useD2LStore";
import { exportBoxScorePDF } from "@/lib/pdfGenerator";
import { CorrectionStats, PlayerBoxStat } from "@/lib/types";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import {
  Download,
  Share2,
  Calendar,
  MapPin,
  Check,
  Pencil,
} from "lucide-react";
import { TeamLogo } from "@/components/common/TeamLogo";

export const BoxScoreView: React.FC = () => {
  const { games, getActiveGame, getGameTeams, calculateBoxScore, currentStaff, saveFinalGameCorrections, statEvents, setActiveGame } = useD2LStore();

  const activeGame = getActiveGame();
  const fallbackFinalGame = useMemo(() => games
    .filter((item) => item.status === "final")
    .slice()
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())[0], [games]);
  const game = activeGame || fallbackFinalGame;
  const { homeTeam, awayTeam } = getGameTeams(game?.id);
  const boxScore = calculateBoxScore(game?.id);

  const [copiedRecap, setCopiedRecap] = useState(false);
  const [isUnlockOpen, setIsUnlockOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState<Record<string, CorrectionStats>>({});

  // A finalized game remains useful even when a legacy/null app_state pointer
  // arrives. Promote this same Supabase game to the shared selection once.
  useEffect(() => {
    if (!activeGame && fallbackFinalGame) void setActiveGame(fallbackFinalGame.id);
  }, [activeGame, fallbackFinalGame, setActiveGame]);

  if (!game || !homeTeam || !awayTeam) {
    return <div className="p-8 text-center text-gray-400">No completed game is available yet.</div>;
  }

  const handleExportPDF = () => {
    exportBoxScorePDF(game, homeTeam, awayTeam, boxScore);
  };

  const handleCopyRecap = () => {
    const recapText = `🏀 DISTRICT 2 LEAGUE (D2L) - BOX SCORE RECAP
📍 ${game.venue} | ${game.season}
━━━━━━━━━━━━━━━━━━━━━━━
${homeTeam.name} (${homeTeam.shortName}): ${game.homeScore}
${awayTeam.name} (${awayTeam.shortName}): ${game.awayScore}
━━━━━━━━━━━━━━━━━━━━━━━
Top Performers:
⭐ ${boxScore.home[0]?.name || "Home Star"}: ${boxScore.home[0]?.pts || 0} PTS, ${boxScore.home[0]?.reb || 0} REB, ${boxScore.home[0]?.ast || 0} AST
⭐ ${boxScore.away[0]?.name || "Away Star"}: ${boxScore.away[0]?.pts || 0} PTS, ${boxScore.away[0]?.reb || 0} REB, ${boxScore.away[0]?.ast || 0} AST

#D2L #AyalaAlabang #BasketballLeague`;

    navigator.clipboard.writeText(recapText);
    setCopiedRecap(true);
    setTimeout(() => setCopiedRecap(false), 3000);
  };

  const startEditing = () => {
    const lines = [...boxScore.home, ...boxScore.away];
    setDraft(Object.fromEntries(lines.map((line) => [line.playerId, {
      pts: line.pts, fgm: line.fgm, fga: line.fga, fg3m: line.fg3m, fg3a: line.fg3a,
      ftm: line.ftm, fta: line.fta, oreb: line.oreb, dreb: line.dreb, ast: line.ast,
      stl: line.stl, blk: line.blk, to: line.to, pf: line.pf,
    }])));
    setIsEditing(true);
  };
  const updateDraft = (playerId: string, key: keyof CorrectionStats, value: string) => {
    setDraft((current) => ({ ...current, [playerId]: { ...current[playerId], [key]: Math.max(0, Number(value) || 0) } }));
  };
  const saveCorrections = async () => {
    setIsSaving(true);
    const result = await saveFinalGameCorrections(game.id, draft);
    setIsSaving(false);
    if (result.success) setIsEditing(false);
    else alert(result.error || "Unable to save corrections.");
  };

  const renderTeamBoxTable = (
    title: string,
    teamPlayers: PlayerBoxStat[],
    totals: PlayerBoxStat,
    teamColor: string,
    logo: string,
    teamName: string
  ) => {
    const starters = teamPlayers.filter((p) => p.isStarter);
    const bench = teamPlayers.filter((p) => !p.isStarter);

    const statInput = (player: PlayerBoxStat, key: keyof CorrectionStats, fallback: number) => isEditing ? (
      <input aria-label={`${player.name} ${key}`} type="number" min="0" value={draft[player.playerId]?.[key] ?? fallback}
        onChange={(event) => updateDraft(player.playerId, key, event.target.value)}
        className="w-12 bg-black/50 border border-d2l-gold/50 rounded px-1 py-0.5 text-center text-white font-mono" />
    ) : fallback;
    const renderRows = (list: PlayerBoxStat[]) => {
      return list.map((p) => (
        <tr key={p.playerId} className="border-b border-d2l-borderDark/40 hover:bg-d2l-forest/20 text-xs">
          <td className="py-2 px-2 font-medium flex items-center gap-1.5 whitespace-nowrap">
            <span className="font-mono font-bold text-d2l-gold">#{p.jerseyNumber}</span>
            <span className="text-white font-semibold">{p.name}</span>
            {p.isOnCourt && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="On Floor" />
            )}
          </td>
          <td className="py-2 px-1.5 text-center text-gray-400">{p.position}</td>
          <td className="py-2 px-1.5 text-center font-mono font-black text-sm text-d2l-goldLight bg-black/20">
            {statInput(p, "pts", p.pts)}
          </td>
          <td className="py-2 px-1.5 text-center font-mono text-gray-300">{statInput(p, "oreb", p.oreb)}</td>
          <td className="py-2 px-1.5 text-center font-mono text-gray-300">{statInput(p, "dreb", p.dreb)}</td>
          <td className="py-2 px-1.5 text-center font-mono font-bold text-white bg-black/20">
            {p.reb}
          </td>
          <td className="py-2 px-1.5 text-center font-mono font-bold text-blue-300">{statInput(p, "ast", p.ast)}</td>
          <td className="py-2 px-1.5 text-center font-mono text-indigo-300">{statInput(p, "stl", p.stl)}</td>
          <td className="py-2 px-1.5 text-center font-mono text-purple-300">{statInput(p, "blk", p.blk)}</td>
        </tr>
      ));
    };

    return (
      <div className="bg-d2l-panelDark rounded-xl border border-d2l-borderDark overflow-hidden shadow-xl mb-6">
        <div
          className="px-4 py-2.5 border-b border-d2l-forestLight flex items-center justify-between"
          style={{ backgroundColor: `${teamColor}33` }}
        >
          <div className="flex items-center gap-2">
            {game.status === "final" && currentStaff.role === "admin" && !isEditing && (
              <button onClick={() => setIsUnlockOpen(true)} className="px-3.5 py-2 rounded-xl bg-d2l-cardDark hover:bg-d2l-court border border-d2l-gold/50 text-xs font-athletic font-bold flex items-center gap-1.5 transition">
                <Pencil className="w-4 h-4 text-d2l-gold" /> Edit Stats
              </button>
            )}
            {isEditing && (
              <>
                <button onClick={() => { setIsEditing(false); setDraft({}); }} disabled={isSaving} className="px-3.5 py-2 rounded-xl bg-gray-800 text-xs font-athletic font-bold">Cancel</button>
                <button onClick={saveCorrections} disabled={isSaving} className="px-3.5 py-2 rounded-xl bg-d2l-gold text-d2l-dark text-xs font-athletic font-bold disabled:opacity-50">{isSaving ? "Saving..." : "Save Corrections"}</button>
              </>
            )}
            <TeamLogo logo={logo} name={teamName} size="sm" />
            <h3 className="font-athletic font-black text-lg text-white tracking-wider uppercase">
              {title}
            </h3>
          </div>
          <span className="text-xs font-mono font-bold text-d2l-gold">
            {totals.pts} PTS • {totals.reb} REB • {totals.ast} AST
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-black/40 text-[10px] font-athletic uppercase text-gray-400 border-b border-d2l-borderDark">
                <th className="py-2 px-2 text-left">Player</th>
                <th className="py-2 px-1.5 text-center">Pos</th>
                <th className="py-2 px-1.5 text-center text-d2l-goldLight">PTS</th>
                <th className="py-2 px-1.5 text-center">OREB</th>
                <th className="py-2 px-1.5 text-center">DREB</th>
                <th className="py-2 px-1.5 text-center text-white">REB</th>
                <th className="py-2 px-1.5 text-center text-blue-300">AST</th>
                <th className="py-2 px-1.5 text-center text-indigo-300">STL</th>
                <th className="py-2 px-1.5 text-center text-purple-300">BLK</th>
              </tr>
            </thead>
            <tbody>
              {/* Starters header */}
              <tr className="bg-d2l-forest/40 text-[10px] font-bold text-d2l-gold px-2">
                <td colSpan={9} className="py-1 px-2 uppercase tracking-wider font-athletic">
                  ★ Starters
                </td>
              </tr>
              {renderRows(starters)}

              {/* Bench header */}
              <tr className="bg-d2l-court/60 text-[10px] font-bold text-gray-400 px-2">
                <td colSpan={9} className="py-1 px-2 uppercase tracking-wider font-athletic">
                  Bench
                </td>
              </tr>
              {renderRows(bench)}

              {/* Totals Row */}
              <tr className="bg-black/60 font-mono font-bold text-xs text-white border-t-2 border-d2l-gold/40">
                <td className="py-2.5 px-2 uppercase font-athletic text-d2l-gold">TOTALS</td>
                <td className="text-center">-</td>
                <td className="text-center text-d2l-gold font-black text-sm bg-d2l-forest/60">
                  {totals.pts}
                </td>
                <td className="text-center">{totals.oreb}</td>
                <td className="text-center">{totals.dreb}</td>
                <td className="text-center text-white bg-d2l-forest/40">{totals.reb}</td>
                <td className="text-center text-blue-300">{totals.ast}</td>
                <td className="text-center text-indigo-300">{totals.stl}</td>
                <td className="text-center text-purple-300">{totals.blk}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-16 md:pb-6 text-white">
      {/* Game Recap Summary Card */}
      <div className="bg-gradient-to-br from-d2l-forest via-d2l-panelDark to-d2l-dark rounded-2xl border-2 border-d2l-gold/50 p-4 sm:p-6 shadow-2xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Game Meta & Location */}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-athletic font-black text-2xl text-d2l-gold tracking-wider">
                DISTRICT 2 LEAGUE (D2L)
              </span>
              <span className="bg-d2l-orange text-white text-[10px] font-black px-2 py-0.5 rounded uppercase">
                {game.status}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-300 mt-1">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-d2l-gold" /> {game.venue}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-d2l-gold" /> {new Date(game.scheduledAt).toLocaleDateString()}
              </span>
              <span>•</span>
              <span className="text-gray-400 font-semibold">{game.season}</span>
            </div>
          </div>

          {/* Action Buttons: PDF Export & WhatsApp Recap */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyRecap}
              className="px-3.5 py-2 rounded-xl bg-d2l-cardDark hover:bg-d2l-court border border-d2l-borderDark text-xs font-athletic font-bold flex items-center gap-1.5 transition"
            >
              {copiedRecap ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4 text-d2l-gold" />}
              <span>{copiedRecap ? "Copied!" : "Share Recap"}</span>
            </button>

            <button
              onClick={handleExportPDF}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-d2l-orange to-amber-600 hover:from-d2l-orangeHover hover:to-amber-500 text-white text-xs font-athletic font-bold tracking-wider uppercase flex items-center gap-2 shadow-lg orange-glow transition"
            >
              <Download className="w-4 h-4" />
              <span>Export Official PDF</span>
            </button>
          </div>
        </div>

        {/* Big Matchup Score Banner */}
        <div className="grid grid-cols-12 gap-4 items-center my-6 py-4 bg-black/40 rounded-xl border border-d2l-borderDark px-4">
          <div className="col-span-4 flex items-center gap-3">
            <TeamLogo logo={homeTeam.logo} name={homeTeam.name} size="xl" />
            <div>
              <div className="font-athletic font-extrabold text-xl sm:text-3xl text-white">{homeTeam.name}</div>
              <div className="text-xs text-gray-400 font-bold">{homeTeam.shortName}</div>
            </div>
          </div>

          <div className="col-span-4 flex flex-col items-center justify-center">
            <div className="font-athletic font-black text-4xl sm:text-6xl text-d2l-gold tracking-tight">
              {game.homeScore} - {game.awayScore}
            </div>
            <div className="text-[11px] text-gray-400 uppercase font-athletic font-bold mt-1">
              Final Score • 4 Quarters
            </div>
          </div>

          <div className="col-span-4 flex items-center justify-end gap-3 text-right">
            <div>
              <div className="font-athletic font-extrabold text-xl sm:text-3xl text-white">{awayTeam.name}</div>
              <div className="text-xs text-gray-400 font-bold">{awayTeam.shortName}</div>
            </div>
            <TeamLogo logo={awayTeam.logo} name={awayTeam.name} size="xl" />
          </div>
        </div>

        {/* Quarter By Quarter Score Grid */}
        {(() => {
          const ot1Home = game.quarterScores?.home?.OT1 ?? 0;
          const ot1Away = game.quarterScores?.away?.OT1 ?? 0;
          const ot2Home = game.quarterScores?.home?.OT2 ?? 0;
          const ot2Away = game.quarterScores?.away?.OT2 ?? 0;

          const hasOT1 = ot1Home > 0 || ot1Away > 0 || game.quarter === "OT1";
          const hasOT2 = ot2Home > 0 || ot2Away > 0 || game.quarter === "OT2";

          return (
            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs">
                <thead>
                  <tr className="border-b border-d2l-borderDark text-gray-400 uppercase font-athletic">
                    <th className="py-1 text-left">Team</th>
                    <th className="py-1">Q1</th>
                    <th className="py-1">Q2</th>
                    <th className="py-1">Q3</th>
                    <th className="py-1">Q4</th>
                    {hasOT1 && <th className="py-1 text-amber-400">OT1</th>}
                    {hasOT2 && <th className="py-1 text-amber-400">OT2</th>}
                    <th className="py-1 text-d2l-gold font-bold">TOTAL</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  <tr className="border-b border-d2l-borderDark/40">
                    <td className="py-1.5 text-left font-sans font-bold flex items-center gap-2">
                      <TeamLogo logo={homeTeam.logo} name={homeTeam.name} size="xs" />
                      <span>{homeTeam.shortName}</span>
                    </td>
                    <td>{game.quarterScores?.home?.Q1 ?? 0}</td>
                    <td>{game.quarterScores?.home?.Q2 ?? 0}</td>
                    <td>{game.quarterScores?.home?.Q3 ?? 0}</td>
                    <td>{game.quarterScores?.home?.Q4 ?? 0}</td>
                    {hasOT1 && <td className="text-amber-300 font-bold">{ot1Home}</td>}
                    {hasOT2 && <td className="text-amber-300 font-bold">{ot2Home}</td>}
                    <td className="font-black text-d2l-goldLight">{game.homeScore}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 text-left font-sans font-bold flex items-center gap-2">
                      <TeamLogo logo={awayTeam.logo} name={awayTeam.name} size="xs" />
                      <span>{awayTeam.shortName}</span>
                    </td>
                    <td>{game.quarterScores?.away?.Q1 ?? 0}</td>
                    <td>{game.quarterScores?.away?.Q2 ?? 0}</td>
                    <td>{game.quarterScores?.away?.Q3 ?? 0}</td>
                    <td>{game.quarterScores?.away?.Q4 ?? 0}</td>
                    {hasOT1 && <td className="text-amber-300 font-bold">{ot1Away}</td>}
                    {hasOT2 && <td className="text-amber-300 font-bold">{ot2Away}</td>}
                    <td className="font-black text-d2l-goldLight">{game.awayScore}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>

      {/* Box Score Tables for Both Teams */}
      {renderTeamBoxTable(
        `${homeTeam.name} (HOME)`,
        boxScore.home,
        boxScore.homeTotals,
        homeTeam.primaryColor,
        homeTeam.logo,
        homeTeam.name
      )}

      {renderTeamBoxTable(
        `${awayTeam.name} (AWAY)`,
        boxScore.away,
        boxScore.awayTotals,
        awayTeam.primaryColor,
        awayTeam.logo,
        awayTeam.name
      )}

      {game.status === "final" && (() => {
        const corrections = statEvents.filter((event) => event.gameId === game.id && event.statType === ("CORRECTION" as any));
        if (!corrections.length) return null;
        return <div className="rounded-xl border border-d2l-gold/30 bg-d2l-panelDark p-4 text-xs">
          <h3 className="font-athletic font-bold text-d2l-gold uppercase mb-2">Correction History</h3>
          <div className="space-y-1 text-gray-300">{corrections.sort((a, b) => b.timestamp - a.timestamp).map((event) => {
            let totals: CorrectionStats | undefined; let changes: { key: string; from: number; to: number }[] = [];
            try { const note = JSON.parse(event.notes || "{}"); totals = note.totals; changes = note.changes || []; } catch {}
            const player = [...boxScore.home, ...boxScore.away].find((line) => line.playerId === event.playerId);
            return <p key={event.id}>Corrected by {event.staffName || "System Admin"} on {new Date(event.timestamp).toLocaleString()}: {player?.name || "Player"} {changes.map((change) => `${change.key.toUpperCase()} ${change.from} → ${change.to}`).join(", ") || `final line set to ${totals?.pts ?? 0} PTS`}.</p>;
          })}</div>
        </div>;
      })()}

      <ConfirmModal isOpen={isUnlockOpen} title="Unlock Final Stat Corrections" message="Enter the Admin Security PIN to edit this finalized game's box score. This does not resume live tracking." confirmText="Unlock Edit Mode" variant="warning" requirePin expectedPinHash={currentStaff.pin} onCancel={() => setIsUnlockOpen(false)} onConfirm={() => { setIsUnlockOpen(false); startEditing(); }} />
    </div>
  );
};
