"use client";

import React, { useState } from "react";
import { CheckCircle2, AlertTriangle, X, ShieldAlert, FileText, Lock, Loader2 } from "lucide-react";
import { Game, Team } from "@/lib/types";

interface FinalizeGameModalProps {
  isOpen: boolean;
  game: Game;
  homeTeam: Team;
  awayTeam: Team;
  canFinalize: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export const FinalizeGameModal: React.FC<FinalizeGameModalProps> = ({
  isOpen,
  game,
  homeTeam,
  awayTeam,
  canFinalize,
  onConfirm,
  onCancel,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleFinalize = async () => {
    setIsProcessing(true);
    try {
      await onConfirm();
    } catch (err) {
      console.error("Error finalizing game:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-d2l-panelDark border-2 border-d2l-gold/60 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 text-white animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-d2l-orange/20 text-d2l-orange border border-d2l-orange/40">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-athletic font-extrabold text-xl text-white tracking-wide">
                FINALIZE GAME
              </h3>
              <p className="text-[10px] text-d2l-gold font-semibold uppercase tracking-wider">
                Official Match Completion
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-d2l-cardDark transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Game Score Summary Card */}
        <div className="bg-black/50 border border-d2l-borderDark p-3.5 rounded-xl flex items-center justify-between text-center">
          <div className="flex-1">
            <p className="font-athletic font-bold text-sm text-gray-200 truncate">{homeTeam.shortName}</p>
            <p className="font-athletic font-black text-2xl text-d2l-gold">{game.homeScore}</p>
          </div>
          <div className="px-3 text-xs font-mono font-bold text-gray-500 uppercase">VS</div>
          <div className="flex-1">
            <p className="font-athletic font-bold text-sm text-gray-200 truncate">{awayTeam.shortName}</p>
            <p className="font-athletic font-black text-2xl text-d2l-gold">{game.awayScore}</p>
          </div>
        </div>

        {/* Warning Message Box */}
        <div className="bg-amber-950/60 border border-amber-500/40 rounded-xl p-3.5 text-xs text-amber-200 leading-relaxed space-y-1">
          <p className="font-bold flex items-center gap-1.5 text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            Confirm Game Completion
          </p>
          <p>
            Finalize this game? This will lock final stats and mark the game as complete. This cannot be undone from the Live Tracker.
          </p>
          <p className="text-[11px] text-amber-300/80 pt-1 border-t border-amber-500/20 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-d2l-gold" />
            Official PDF Box Score will be generated & downloaded automatically.
          </p>
        </div>

        {!canFinalize && (
          <div className="bg-rose-950/70 border border-rose-500/40 rounded-xl p-3 text-xs text-rose-300 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
            <span>Only System Admin or logged-in Courtside Staff can finalize games.</span>
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-d2l-borderDark">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleFinalize}
            disabled={!canFinalize || isProcessing}
            className="px-5 py-2 rounded-lg bg-gradient-to-r from-d2l-orange to-amber-500 hover:from-d2l-orangeHover hover:to-amber-400 disabled:opacity-50 text-white text-xs font-athletic font-bold uppercase tracking-wider transition shadow-lg flex items-center gap-1.5"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Finalizing...</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>Confirm & Finalize Game</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
