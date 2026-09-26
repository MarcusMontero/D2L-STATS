"use client";

import React, { useState } from "react";
import { LiveScoreboard } from "./LiveScoreboard";
import { RosterView } from "./RosterView";
import { StatKeypad } from "./StatKeypad";
import { Player, Team } from "@/lib/types";
import { useD2LStore } from "@/store/useD2LStore";
import { Calendar, Users, AlertCircle } from "lucide-react";

export const LiveTrackerPage: React.FC = () => {
  const { games, teams, activeGameId } = useD2LStore();
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  const activeGame = games.find((g) => g.id === activeGameId) || games[0];

  const handleSelectPlayer = (player: Player, team: Team) => {
    if (selectedPlayer?.id === player.id) {
      return;
    }
    setSelectedPlayer(player);
    setSelectedTeam(team);
  };

  const handleClearSelection = () => {
    setSelectedPlayer(null);
    setSelectedTeam(null);
  };

  if (games.length === 0 || !activeGame) {
    return (
      <div className="space-y-4 pb-16 md:pb-6">
        <div className="bg-d2l-panelDark border-2 border-d2l-borderDark rounded-2xl p-8 sm:p-12 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-d2l-forest/40 border border-d2l-gold/40 flex items-center justify-center">
            <Calendar className="w-8 h-8 text-d2l-gold" />
          </div>
          <div className="space-y-1">
            <h2 className="font-athletic font-black text-xl sm:text-2xl text-white tracking-wide">
              NO GAMES SCHEDULED YET
            </h2>
            <p className="text-gray-400 text-xs sm:text-sm max-w-md mx-auto">
              There are currently no games scheduled in the database. Schedule a matchup in the Schedule or League Setup tab to start tracking live game statistics.
            </p>
          </div>
          {teams.length === 0 && (
            <div className="inline-flex items-center gap-2 bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs px-3 py-1.5 rounded-lg">
              <Users className="w-4 h-4" />
              <span>Tip: Add teams and players in League Setup first before scheduling a game.</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-16 md:pb-6">
      {/* 1. Scoreboard Header */}
      <LiveScoreboard />

      {/* 2. Full Dual-Roster Area */}
      <RosterView
        selectedPlayerId={selectedPlayer?.id || null}
        selectedTeamId={selectedTeam?.id || null}
        onSelectPlayer={handleSelectPlayer}
      />

      {/* 3. Large Courtside Tactile Keypad */}
      <StatKeypad
        selectedPlayer={selectedPlayer}
        selectedTeam={selectedTeam}
        onClearSelection={handleClearSelection}
      />
    </div>
  );
};
