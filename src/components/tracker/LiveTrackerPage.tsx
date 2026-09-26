"use client";

import React, { useState } from "react";
import { LiveScoreboard } from "./LiveScoreboard";
import { RosterView } from "./RosterView";
import { StatKeypad } from "./StatKeypad";
import { Player, Team } from "@/lib/types";

export const LiveTrackerPage: React.FC = () => {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  const handleSelectPlayer = (player: Player, team: Team) => {
    // If clicking same player, keep or toggle
    if (selectedPlayer?.id === player.id) {
      // keep active for multiple rapid stats
      return;
    }
    setSelectedPlayer(player);
    setSelectedTeam(team);
  };

  const handleClearSelection = () => {
    setSelectedPlayer(null);
    setSelectedTeam(null);
  };

  return (
    <div className="space-y-3 pb-16 md:pb-6">
      {/* 1. Scoreboard Header */}
      <LiveScoreboard />

      {/* 2. Full Dual-Roster Scrollable Area */}
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
