"use client";

import React, { useState } from "react";
import { useD2LStore } from "@/store/useD2LStore";
import { Player, Team, StatType } from "@/lib/types";
import {
  RotateCcw,
  Sparkles,
  Lock,
  FileText,
} from "lucide-react";
import { AssistPromptModal } from "./AssistPromptModal";

interface StatKeypadProps {
  selectedPlayer: Player | null;
  selectedTeam: Team | null;
  onClearSelection: () => void;
}

export const StatKeypad: React.FC<StatKeypadProps> = ({
  selectedPlayer,
  selectedTeam,
  onClearSelection,
}) => {
  const { logStat, undoLastStat, undoStack, players, getActiveGame } = useD2LStore();
  const game = getActiveGame();
  const isFinal = game?.status === "final";

  const [assistModalData, setAssistModalData] = useState<{
    isOpen: boolean;
    scorerPlayer: Player | null;
    team: Team | null;
  }>({
    isOpen: false,
    scorerPlayer: null,
    team: null,
  });

  const lastUndoAction = undoStack[0];
  const lastUndoPlayer = lastUndoAction
    ? players.find((p) => p.id === lastUndoAction.playerId)
    : null;

  const handleStatClick = (statType: StatType) => {
    if (isFinal) {
      alert("This game has been finalized. Live stat logging is disabled.");
      return;
    }

    if (!selectedPlayer || !selectedTeam) {
      alert("Please tap a player on the roster first to log a stat.");
      return;
    }

    logStat(statType, selectedPlayer.id, selectedTeam.id);

    // If made basket, prompt optional teammate assist
    if (statType === "2PT_MAKE" || statType === "3PT_MAKE") {
      setAssistModalData({
        isOpen: true,
        scorerPlayer: selectedPlayer,
        team: selectedTeam,
      });
    }
  };

  const formatLastActionText = () => {
    if (!lastUndoAction || !lastUndoPlayer) return "No recent actions";
    const statNames: Record<string, string> = {
      "2PT_MAKE": "2PT Made (+2)",
      "2PT_MISS": "2PT Miss",
      "3PT_MAKE": "3PT Made (+3)",
      "3PT_MISS": "3PT Miss",
      "FT_MAKE": "FT Made (+1)",
      "FT_MISS": "FT Miss",
      "OREB": "Off. Rebound",
      "DREB": "Def. Rebound",
      "AST": "Assist",
      "STL": "Steal",
      "BLK": "Block",
      "TO": "Turnover",
      "FOUL_PERSONAL": "Personal Foul",
      "FOUL_TECH": "Tech Foul",
    };
    return `#${lastUndoPlayer.jerseyNumber} ${lastUndoPlayer.name}: ${statNames[lastUndoAction.statType] || lastUndoAction.statType}`;
  };

  return (
    <div className="bg-d2l-panelDark rounded-xl border-2 border-d2l-forestLight/80 shadow-2xl p-2.5 sm:p-4 text-white">
      {/* Finalized Game Locked Notice */}
      {isFinal && (
        <div className="bg-amber-950/80 border-2 border-amber-500/60 rounded-xl p-3 sm:p-4 text-center space-y-1 mb-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-center gap-2 text-amber-300 font-athletic font-extrabold text-sm sm:text-base uppercase tracking-wider">
            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>GAME IS OFFICIALLY FINALIZED & LOCKED</span>
          </div>
          <p className="text-xs text-amber-200/90 max-w-md mx-auto">
            Live stat recording is completed for this game. Stat buttons are locked. You can export or view the Box Score anytime.
          </p>
        </div>
      )}

      {/* Selected Player Banner */}
      <div className="flex items-center justify-between gap-2 p-2 sm:p-2.5 rounded-lg bg-d2l-court border border-d2l-gold/40 mb-3">
        {selectedPlayer && selectedTeam ? (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-d2l-orange text-white font-athletic font-black text-base flex items-center justify-center border border-white shadow">
              #{selectedPlayer.jerseyNumber}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-athletic font-bold text-sm sm:text-base text-white">
                  {selectedPlayer.name}
                </span>
                <span className="text-[10px] bg-d2l-forest text-d2l-goldLight px-1.5 py-0.2 rounded font-bold border border-d2l-gold/30">
                  {selectedTeam.shortName}
                </span>
              </div>
              <p className="text-[10px] text-d2l-gold">
                {isFinal ? "Game finalized - stats locked" : "Tap any stat button below to log"}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-gray-400 text-xs italic py-1">
            <Sparkles className="w-4 h-4 text-d2l-gold" />
            <span>
              {isFinal
                ? "Game finalized — stat entry is locked."
                : "Select any player from the roster above to log a stat..."}
            </span>
          </div>
        )}

        {/* Undo Last Action Button */}
        <button
          onClick={() => {
            if (isFinal) return;
            const success = undoLastStat();
            if (!success) alert("No actions to undo");
          }}
          disabled={isFinal || undoStack.length === 0}
          title={lastUndoAction ? `Undo: ${formatLastActionText()}` : "Undo"}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-athletic font-bold transition border ${
            isFinal || undoStack.length === 0
              ? "bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed"
              : "bg-red-950/80 hover:bg-red-900 text-red-200 border-red-500/50"
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5 text-red-400" />
          <span>UNDO</span>
        </button>
      </div>

      {/* Main Grid of Large Tap-Friendly Stat Buttons */}
      <div className={`grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 ${isFinal ? "opacity-50 pointer-events-none" : ""}`}>
        {/* FIELD GOALS (2PT) */}
        <button
          onClick={() => handleStatClick("2PT_MAKE")}
          disabled={isFinal}
          className="stat-btn p-3 rounded-xl bg-gradient-to-br from-emerald-800 to-emerald-950 hover:from-emerald-700 hover:to-emerald-900 border-2 border-emerald-500/60 flex flex-col items-center justify-center text-center shadow-md active:scale-95 group disabled:cursor-not-allowed"
        >
          <span className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider">2-Pointer</span>
          <span className="font-athletic font-black text-xl sm:text-2xl text-white group-hover:text-emerald-200">
            2PT MAKE
          </span>
          <span className="text-[10px] font-mono text-emerald-400 font-bold">+2 PTS</span>
        </button>

        <button
          onClick={() => handleStatClick("2PT_MISS")}
          disabled={isFinal}
          className="stat-btn p-3 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-700 flex flex-col items-center justify-center text-center shadow active:scale-95 text-gray-300 hover:text-white disabled:cursor-not-allowed"
        >
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">2-Pointer</span>
          <span className="font-athletic font-black text-xl sm:text-2xl text-gray-200">2PT MISS</span>
          <span className="text-[10px] font-mono text-gray-500">0 PTS</span>
        </button>

        {/* 3-POINTERS */}
        <button
          onClick={() => handleStatClick("3PT_MAKE")}
          disabled={isFinal}
          className="stat-btn p-3 rounded-xl bg-gradient-to-br from-amber-700 to-amber-950 hover:from-amber-600 hover:to-amber-900 border-2 border-amber-400/80 flex flex-col items-center justify-center text-center shadow-lg active:scale-95 group disabled:cursor-not-allowed"
        >
          <span className="text-[10px] uppercase font-bold text-amber-200 tracking-wider">3-Pointer</span>
          <span className="font-athletic font-black text-xl sm:text-2xl text-amber-300 group-hover:text-amber-100">
            3PT MAKE
          </span>
          <span className="text-[10px] font-mono text-amber-300 font-black">+3 PTS</span>
        </button>

        <button
          onClick={() => handleStatClick("3PT_MISS")}
          disabled={isFinal}
          className="stat-btn p-3 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-700 flex flex-col items-center justify-center text-center shadow active:scale-95 text-gray-300 hover:text-white disabled:cursor-not-allowed"
        >
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">3-Pointer</span>
          <span className="font-athletic font-black text-xl sm:text-2xl text-gray-200">3PT MISS</span>
          <span className="text-[10px] font-mono text-gray-500">0 PTS</span>
        </button>

        {/* FREE THROWS */}
        <button
          onClick={() => handleStatClick("FT_MAKE")}
          disabled={isFinal}
          className="stat-btn p-3 rounded-xl bg-gradient-to-br from-d2l-forest to-d2l-dark hover:from-d2l-forestLight border border-emerald-500/50 flex flex-col items-center justify-center text-center shadow active:scale-95 text-emerald-200 hover:text-white disabled:cursor-not-allowed"
        >
          <span className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider">Free Throw</span>
          <span className="font-athletic font-black text-lg sm:text-xl text-white">FT MAKE</span>
          <span className="text-[10px] font-mono text-emerald-400 font-bold">+1 PT</span>
        </button>

        <button
          onClick={() => handleStatClick("FT_MISS")}
          disabled={isFinal}
          className="stat-btn p-3 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-700 flex flex-col items-center justify-center text-center shadow active:scale-95 text-gray-300 hover:text-white disabled:cursor-not-allowed"
        >
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Free Throw</span>
          <span className="font-athletic font-black text-lg sm:text-xl text-gray-200">FT MISS</span>
          <span className="text-[10px] font-mono text-gray-500">0 PTS</span>
        </button>

        {/* REBOUNDS */}
        <button
          onClick={() => handleStatClick("OREB")}
          disabled={isFinal}
          className="stat-btn p-3 rounded-xl bg-d2l-court hover:bg-d2l-forest border border-d2l-gold/40 flex flex-col items-center justify-center text-center shadow active:scale-95 disabled:cursor-not-allowed"
        >
          <span className="text-[10px] uppercase font-bold text-d2l-gold tracking-wider">Rebound</span>
          <span className="font-athletic font-black text-lg sm:text-xl text-white">OFF REB</span>
          <span className="text-[10px] text-gray-300">OREB</span>
        </button>

        <button
          onClick={() => handleStatClick("DREB")}
          disabled={isFinal}
          className="stat-btn p-3 rounded-xl bg-d2l-court hover:bg-d2l-forest border border-d2l-gold/40 flex flex-col items-center justify-center text-center shadow active:scale-95 disabled:cursor-not-allowed"
        >
          <span className="text-[10px] uppercase font-bold text-d2l-gold tracking-wider">Rebound</span>
          <span className="font-athletic font-black text-lg sm:text-xl text-white">DEF REB</span>
          <span className="text-[10px] text-gray-300">DREB</span>
        </button>

        {/* PLAYMAKING: ASSIST & TURNOVER */}
        <button
          onClick={() => handleStatClick("AST")}
          disabled={isFinal}
          className="stat-btn p-3 rounded-xl bg-gradient-to-br from-blue-900/60 to-blue-950 hover:from-blue-800 border border-blue-400/50 flex flex-col items-center justify-center text-center shadow active:scale-95 disabled:cursor-not-allowed"
        >
          <span className="text-[10px] uppercase font-bold text-blue-300 tracking-wider">Playmaking</span>
          <span className="font-athletic font-black text-lg sm:text-xl text-blue-200">ASSIST</span>
          <span className="text-[10px] text-blue-300">AST</span>
        </button>

        <button
          onClick={() => handleStatClick("TO")}
          disabled={isFinal}
          className="stat-btn p-3 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 border border-rose-500/40 flex flex-col items-center justify-center text-center shadow active:scale-95 disabled:cursor-not-allowed"
        >
          <span className="text-[10px] uppercase font-bold text-rose-300 tracking-wider">Ball Loss</span>
          <span className="font-athletic font-black text-lg sm:text-xl text-rose-200">TURNOVER</span>
          <span className="text-[10px] text-rose-400">TO</span>
        </button>

        {/* DEFENSE: STEAL & BLOCK */}
        <button
          onClick={() => handleStatClick("STL")}
          disabled={isFinal}
          className="stat-btn p-3 rounded-xl bg-gradient-to-br from-indigo-900/60 to-indigo-950 hover:from-indigo-800 border border-indigo-400/50 flex flex-col items-center justify-center text-center shadow active:scale-95 disabled:cursor-not-allowed"
        >
          <span className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider">Defense</span>
          <span className="font-athletic font-black text-lg sm:text-xl text-indigo-200">STEAL</span>
          <span className="text-[10px] text-indigo-300">STL</span>
        </button>

        <button
          onClick={() => handleStatClick("BLK")}
          disabled={isFinal}
          className="stat-btn p-3 rounded-xl bg-gradient-to-br from-purple-900/60 to-purple-950 hover:from-purple-800 border border-purple-400/50 flex flex-col items-center justify-center text-center shadow active:scale-95 disabled:cursor-not-allowed"
        >
          <span className="text-[10px] uppercase font-bold text-purple-300 tracking-wider">Defense</span>
          <span className="font-athletic font-black text-lg sm:text-xl text-purple-200">BLOCK</span>
          <span className="text-[10px] text-purple-300">BLK</span>
        </button>

        {/* FOULS: PERSONAL & TECHNICAL */}
        <button
          onClick={() => handleStatClick("FOUL_PERSONAL")}
          disabled={isFinal}
          className="stat-btn p-3 rounded-xl bg-gradient-to-br from-orange-950 to-red-950 hover:from-orange-900 border-2 border-orange-500/60 flex flex-col items-center justify-center text-center shadow active:scale-95 col-span-1 sm:col-span-2 lg:col-span-3 disabled:cursor-not-allowed"
        >
          <span className="text-[10px] uppercase font-bold text-orange-300 tracking-wider">Referee Whistle</span>
          <span className="font-athletic font-black text-xl sm:text-2xl text-orange-200">
            PERSONAL FOUL
          </span>
          <span className="text-[10px] text-orange-400 font-mono">Counts to Team Total & Bonus</span>
        </button>

        <button
          onClick={() => handleStatClick("FOUL_TECH")}
          disabled={isFinal}
          className="stat-btn p-3 rounded-xl bg-red-950 hover:bg-red-900 border-2 border-red-500 flex flex-col items-center justify-center text-center shadow active:scale-95 col-span-1 sm:col-span-2 lg:col-span-3 disabled:cursor-not-allowed"
        >
          <span className="text-[10px] uppercase font-bold text-red-300 tracking-wider">Disciplinary</span>
          <span className="font-athletic font-black text-xl sm:text-2xl text-red-200">
            TECHNICAL FOUL
          </span>
          <span className="text-[10px] text-red-400 font-mono">Tech / Unsportsmanlike</span>
        </button>
      </div>

      {/* Assist Prompt Modal */}
      {assistModalData.isOpen && assistModalData.scorerPlayer && assistModalData.team && (
        <AssistPromptModal
          scorer={assistModalData.scorerPlayer}
          team={assistModalData.team}
          onClose={() => setAssistModalData({ isOpen: false, scorerPlayer: null, team: null })}
        />
      )}
    </div>
  );
};
