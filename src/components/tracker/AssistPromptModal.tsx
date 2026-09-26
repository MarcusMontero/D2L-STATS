"use client";

import React from "react";
import { useD2LStore } from "@/store/useD2LStore";
import { Player, Team } from "@/lib/types";
import { Sparkles, X } from "lucide-react";

interface AssistPromptModalProps {
  scorer: Player;
  team: Team;
  onClose: () => void;
}

export const AssistPromptModal: React.FC<AssistPromptModalProps> = ({
  scorer,
  team,
  onClose,
}) => {
  const { players, logStat, onCourtPlayerIds } = useD2LStore();

  const teammates = players.filter((p) => p.teamId === team.id && p.id !== scorer.id);
  const onCourtList = onCourtPlayerIds[team.id] || [];

  // Sort teammates: On-court players first
  teammates.sort((a, b) => {
    const aOn = onCourtList.includes(a.id);
    const bOn = onCourtList.includes(b.id);
    if (aOn && !bOn) return -1;
    if (!aOn && bOn) return 1;
    return 0;
  });

  const handleSelectAssister = (assister: Player) => {
    logStat("AST", assister.id, team.id, {
      notes: `Assist to #${scorer.jerseyNumber} ${scorer.name}`,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
      <div className="bg-d2l-panelDark border-2 border-d2l-gold/60 rounded-2xl max-w-md w-full p-4 shadow-2xl animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-d2l-borderDark">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-d2l-gold animate-bounce" />
            <div>
              <h3 className="font-athletic font-bold text-base text-white">
                BASKET MADE BY #{scorer.jerseyNumber} {scorer.name}!
              </h3>
              <p className="text-xs text-d2l-gold">Did a teammate provide an assist?</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Teammates List */}
        <div className="mt-3 grid grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1">
          {teammates.map((mate) => {
            const isOnCourt = onCourtList.includes(mate.id);
            return (
              <button
                key={mate.id}
                onClick={() => handleSelectAssister(mate)}
                className={`p-2 rounded-xl flex items-center gap-2 text-left transition border ${
                  isOnCourt
                    ? "bg-d2l-forest/70 hover:bg-d2l-forest border-emerald-400/60 text-white"
                    : "bg-gray-900/60 hover:bg-gray-800 border-gray-700 text-gray-300"
                }`}
              >
                <div className="w-7 h-7 rounded bg-d2l-gold text-black font-athletic font-black text-sm flex items-center justify-center shrink-0">
                  #{mate.jerseyNumber}
                </div>
                <div className="truncate">
                  <div className="font-semibold text-xs truncate">{mate.name}</div>
                  <div className="text-[10px] text-gray-400">
                    {isOnCourt ? "On Court" : "Bench"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Unassisted Button */}
        <div className="mt-4 pt-3 border-t border-d2l-borderDark flex justify-end">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-athletic font-bold uppercase tracking-wider"
          >
            No Assist / Unassisted
          </button>
        </div>
      </div>
    </div>
  );
};
