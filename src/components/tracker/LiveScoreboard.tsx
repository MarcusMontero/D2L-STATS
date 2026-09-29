"use client";

import React, { useState } from "react";
import { useD2LStore } from "@/store/useD2LStore";
import { Quarter } from "@/lib/types";
import { TeamLogo } from "@/components/common/TeamLogo";
import { FinalizeGameModal } from "./FinalizeGameModal";
import { exportBoxScorePDF } from "@/lib/pdfGenerator";
import { CheckCircle2, Lock, Download, FileText } from "lucide-react";

export const LiveScoreboard: React.FC = () => {
  const {
    getActiveGame,
    getGameTeams,
    setGameQuarter,
    setGameStatus,
    finalizeGame,
    calculateBoxScore,
    currentStaff,
    isAuthenticated,
  } = useD2LStore();

  const game = getActiveGame();
  const { homeTeam, awayTeam } = getGameTeams();

  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);

  if (!game || !homeTeam || !awayTeam) {
    return (
      <div className="bg-d2l-panelDark border border-d2l-borderDark rounded-xl p-6 text-center text-gray-400">
        <p className="font-athletic font-bold text-sm text-gray-300">No active game selected for scoreboard.</p>
        <p className="text-xs text-gray-500 mt-1">Schedule or select a game to start tracking.</p>
      </div>
    );
  }

  const quarters: Quarter[] = ["Q1", "Q2", "Q3", "Q4", "OT1", "OT2"];
  const isFinal = game.status === "final";

  // System Admin or active logged-in staff can finalize
  const canFinalize = isAuthenticated && (currentStaff?.role === "admin" || currentStaff?.role === "staff");

  const handleConfirmFinalize = async () => {
    const result = await finalizeGame(game.id);
    if (result.success && result.game && result.homeTeam && result.awayTeam && result.boxScore) {
      // Trigger PDF Export immediately
      exportBoxScorePDF(result.game, result.homeTeam, result.awayTeam, result.boxScore);
    }
    setIsFinalizeModalOpen(false);
  };

  const handleManualPDFExport = () => {
    const boxScore = calculateBoxScore(game.id);
    exportBoxScorePDF(game, homeTeam, awayTeam, boxScore);
  };

  return (
    <div className="bg-gradient-to-b from-d2l-court via-d2l-panelDark to-d2l-dark rounded-xl border-2 border-d2l-forestLight/80 shadow-2xl p-2.5 sm:p-4 text-white">
      {/* Top Meta Bar: Status, Location, Finalize Button */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-d2l-borderDark text-[11px] text-gray-300">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-d2l-gold">{game.season}</span>
          <span>•</span>
          <span className="truncate hidden sm:inline text-gray-400">{game.venue}</span>
        </div>

        {/* Right Side: Status Pill & Prominent Finalize / PDF Button */}
        <div className="flex items-center gap-2">
          {/* Status Dropdown */}
          <select
            value={game.status}
            onChange={(e) => {
              const newStatus = e.target.value as any;
              if (newStatus === "final") {
                setIsFinalizeModalOpen(true);
              } else {
                setGameStatus(newStatus);
              }
            }}
            disabled={isFinal}
            className={`text-xs font-bold px-2 py-1 rounded border uppercase transition ${
              isFinal
                ? "bg-gray-800 text-gray-400 border-gray-600 cursor-not-allowed"
                : game.status === "live"
                ? "bg-d2l-orange/20 text-d2l-orange border-d2l-orange animate-pulse cursor-pointer"
                : "bg-emerald-900/40 text-emerald-300 border-emerald-600 cursor-pointer"
            }`}
          >
            <option value="scheduled">Scheduled</option>
            <option value="live">● LIVE</option>
            <option value="halftime">Halftime</option>
            <option value="final">Final</option>
          </select>

          {/* Prominent FINALIZE GAME Button (Visible when active) */}
          {!isFinal ? (
            <button
              onClick={() => setIsFinalizeModalOpen(true)}
              disabled={!canFinalize}
              className={`px-3 py-1 rounded-lg font-athletic font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition shadow-lg ${
                canFinalize
                  ? "bg-gradient-to-r from-d2l-orange to-amber-500 hover:from-d2l-orangeHover hover:to-amber-400 text-white shadow-orange-950/50"
                  : "bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed"
              }`}
              title={canFinalize ? "Officially finalize game and lock stats" : "Login required to finalize game"}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              <span>Finalize Game</span>
            </button>
          ) : (
            /* Re-export PDF Box Score Button (Visible when finalized) */
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/40 flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-400" /> Locked
              </span>
              <button
                onClick={handleManualPDFExport}
                className="px-2.5 py-1 rounded-lg font-athletic font-bold text-xs uppercase tracking-wider bg-d2l-forest hover:bg-d2l-forestLight text-d2l-gold border border-d2l-gold/40 flex items-center gap-1 transition shadow"
                title="Export Official PDF Box Score"
              >
                <Download className="w-3.5 h-3.5 text-d2l-gold" />
                <span>PDF Box Score</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Scoreboard Display */}
      <div className="grid grid-cols-12 gap-2 sm:gap-4 items-center">
        {/* HOME TEAM (Left - cols 4) */}
        <div className="col-span-4 flex flex-col items-center sm:items-start text-center sm:text-left">
          <div className="flex items-center gap-2">
            <TeamLogo logo={homeTeam.logo} name={homeTeam.name} size="lg" />
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="font-athletic font-extrabold text-lg sm:text-2xl text-white tracking-wider leading-none">
                  {homeTeam.shortName}
                </h2>
              </div>
              <p className="text-[10px] text-gray-400 font-medium hidden sm:block truncate max-w-[140px]">
                {homeTeam.name}
              </p>
            </div>
          </div>

          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-athletic font-black text-4xl sm:text-6xl text-white tracking-tight leading-none drop-shadow-md">
              {game.homeScore}
            </span>
          </div>

          {/* Home Fouls */}
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px]">
            <div className="flex items-center gap-1 bg-d2l-forest/80 px-2 py-0.5 rounded border border-d2l-borderDark">
              <span className="text-gray-300">Fouls:</span>
              <span
                className={`font-mono font-bold text-xs ${
                  game.homeFouls >= 5 ? "text-red-400 font-black" : "text-white"
                }`}
              >
                {game.homeFouls}
              </span>
              {game.homeFouls >= 5 && (
                <span className="bg-red-600 text-white text-[8px] font-bold px-1 rounded">BONUS</span>
              )}
            </div>
          </div>
        </div>

        {/* CENTER CONTROLS (Quarter Pills & Period Badge - cols 4) */}
        <div className="col-span-4 flex flex-col items-center justify-center gap-2">
          {/* Quarter Pills */}
          <div className="flex items-center gap-1">
            {quarters.map((q) => {
              const isCurrent = game.quarter === q;
              return (
                <button
                  key={q}
                  disabled={isFinal}
                  onClick={() => setGameQuarter(q)}
                  className={`px-2 py-1 rounded text-xs font-bold font-athletic transition ${
                    isCurrent
                      ? "bg-d2l-gold text-black shadow font-black scale-105"
                      : isFinal
                      ? "bg-d2l-forest/30 text-gray-600 cursor-not-allowed"
                      : "bg-d2l-forest/60 text-gray-400 hover:text-white"
                  }`}
                >
                  {q}
                </button>
              );
            })}
          </div>

          {/* Centered Period Badge */}
          <div className="px-3 py-1 rounded-md bg-black/50 border border-d2l-borderDark text-center">
            <span className="font-athletic font-extrabold text-xs uppercase tracking-widest text-d2l-gold">
              {isFinal ? "GAME FINAL" : `PERIOD: ${game.quarter}`}
            </span>
          </div>
        </div>

        {/* AWAY TEAM (Right - cols 4) */}
        <div className="col-span-4 flex flex-col items-center sm:items-end text-center sm:text-right">
          <div className="flex items-center gap-2 flex-row-reverse sm:flex-row">
            <div className="text-right">
              <div className="flex items-center justify-end gap-1.5">
                <h2 className="font-athletic font-extrabold text-lg sm:text-2xl text-white tracking-wider leading-none">
                  {awayTeam.shortName}
                </h2>
              </div>
              <p className="text-[10px] text-gray-400 font-medium hidden sm:block truncate max-w-[140px]">
                {awayTeam.name}
              </p>
            </div>
            <TeamLogo logo={awayTeam.logo} name={awayTeam.name} size="lg" />
          </div>

          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-athletic font-black text-4xl sm:text-6xl text-white tracking-tight leading-none drop-shadow-md">
              {game.awayScore}
            </span>
          </div>

          {/* Away Fouls */}
          <div className="mt-1.5 flex flex-wrap items-center justify-end gap-2 text-[10px]">
            <div className="flex items-center gap-1 bg-d2l-forest/80 px-2 py-0.5 rounded border border-d2l-borderDark">
              <span className="text-gray-300">Fouls:</span>
              <span
                className={`font-mono font-bold text-xs ${
                  game.awayFouls >= 5 ? "text-red-400 font-black" : "text-white"
                }`}
              >
                {game.awayFouls}
              </span>
              {game.awayFouls >= 5 && (
                <span className="bg-red-600 text-white text-[8px] font-bold px-1 rounded">BONUS</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <FinalizeGameModal
        isOpen={isFinalizeModalOpen}
        game={game}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        canFinalize={canFinalize}
        onConfirm={handleConfirmFinalize}
        onCancel={() => setIsFinalizeModalOpen(false)}
      />
    </div>
  );
};
