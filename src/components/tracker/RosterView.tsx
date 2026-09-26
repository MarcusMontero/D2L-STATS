"use client";

import React from "react";
import { useD2LStore } from "@/store/useD2LStore";
import { Player, Team } from "@/lib/types";
import { AlertCircle } from "lucide-react";
import { TeamLogo } from "@/components/common/TeamLogo";
import { PlayerAvatar } from "@/components/common/PlayerAvatar";

interface RosterViewProps {
  selectedPlayerId: string | null;
  selectedTeamId: string | null;
  onSelectPlayer: (player: Player, team: Team) => void;
}

export const RosterView: React.FC<RosterViewProps> = ({
  selectedPlayerId,
  selectedTeamId,
  onSelectPlayer,
}) => {
  const {
    getActiveGame,
    getGameTeams,
    getGamePlayers,
    onCourtPlayerIds,
    togglePlayerOnCourt,
    statEvents,
  } = useD2LStore();

  const game = getActiveGame();
  const { homeTeam, awayTeam } = getGameTeams();
  const { homePlayers, awayPlayers } = getGamePlayers();

  if (!game || !homeTeam || !awayTeam) return null;

  // Helper to calculate live in-game points and fouls for a player
  const getPlayerLiveStats = (playerId: string) => {
    const events = statEvents.filter((e) => e.gameId === game.id && e.playerId === playerId);
    let pts = 0;
    let fouls = 0;
    events.forEach((e) => {
      if (e.statType === "2PT_MAKE") pts += 2;
      else if (e.statType === "3PT_MAKE") pts += 3;
      else if (e.statType === "FT_MAKE") pts += 1;
      else if (e.statType === "FOUL_PERSONAL" || e.statType === "FOUL_TECH") fouls += 1;
    });
    return { pts, fouls };
  };

  const renderTeamRoster = (team: Team, players: Player[], side: "home" | "away") => {
    const onCourtList = onCourtPlayerIds[team.id] || [];
    const onCourtCount = players.filter((p) => onCourtList.includes(p.id)).length;

    return (
      <div className="flex-1 flex flex-col min-w-0 bg-d2l-panelDark rounded-xl border border-d2l-borderDark overflow-hidden shadow-lg">
        {/* Team Header */}
        <div className="px-3 py-2 bg-gradient-to-r from-d2l-court to-d2l-forest border-b border-d2l-forestLight flex items-center justify-between">
          <div className="flex items-center gap-2 truncate">
            <TeamLogo logo={team.logo} name={team.name} size="sm" />
            <span className="font-athletic font-bold text-sm tracking-wide text-white truncate">
              {team.name}
            </span>
            <span className="text-[10px] text-gray-300">({players.length})</span>
          </div>

          <div className="flex items-center gap-1 text-[10px]">
            <span className="text-gray-400">On Floor:</span>
            <span
              className={`font-mono font-bold px-1.5 py-0.2 rounded ${
                onCourtCount === 5
                  ? "bg-emerald-900/60 text-emerald-300 border border-emerald-500/40"
                  : "bg-amber-900/60 text-amber-300 border border-amber-500/40"
              }`}
            >
              {onCourtCount}/5
            </span>
          </div>
        </div>

        {/* Scrollable Player Roster List */}
        <div className="divide-y divide-d2l-forest/40 overflow-y-auto max-h-[380px] sm:max-h-[460px] p-1 space-y-0.5">
          {players.map((player) => {
            const isOnCourt = onCourtList.includes(player.id);
            const isSelected = selectedPlayerId === player.id;
            const { pts, fouls } = getPlayerLiveStats(player.id);
            const isFouledOut = fouls >= 5;

            return (
              <div
                key={player.id}
                onClick={() => onSelectPlayer(player, team)}
                className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition select-none ${
                  isSelected
                    ? "bg-d2l-orange/20 border-2 border-d2l-orange text-white shadow-lg"
                    : isOnCourt
                    ? "bg-d2l-forest/40 hover:bg-d2l-forest/70 border border-emerald-500/30 text-gray-100"
                    : "bg-d2l-dark/40 hover:bg-d2l-cardDark/80 border border-transparent text-gray-400"
                }`}
              >
                {/* Left: Jersey # & Avatar & Name */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {/* Jersey Badge */}
                  <div
                    className={`w-7 h-7 rounded-md font-athletic font-black text-sm flex items-center justify-center shrink-0 border ${
                      isSelected
                        ? "bg-d2l-orange text-white border-white"
                        : isOnCourt
                        ? "bg-d2l-gold text-black border-d2l-goldLight shadow-sm"
                        : "bg-gray-800 text-gray-300 border-gray-700"
                    }`}
                  >
                    #{player.jerseyNumber}
                  </div>

                  {/* Player Avatar */}
                  <PlayerAvatar
                    photoUrl={player.photoUrl}
                    name={player.name}
                    jerseyNumber={player.jerseyNumber}
                    size="xs"
                  />

                  {/* Player Name & Position */}
                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`font-semibold text-xs sm:text-sm truncate ${
                          isSelected ? "text-white font-bold" : isOnCourt ? "text-white" : "text-gray-300"
                        }`}
                      >
                        {player.name}
                      </span>
                      {isOnCourt && (
                        <span className="hidden sm:inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                      <span className="font-bold text-d2l-goldLight">{player.position}</span>
                      <span>•</span>
                      <span>{player.height}</span>
                      {isFouledOut && (
                        <span className="text-red-400 font-bold flex items-center gap-0.5">
                          <AlertCircle className="w-3 h-3" /> FOULED OUT
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Quick Stats & 1-Tap Court Toggle */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* In-Game Points & Fouls display */}
                  <div className="text-right flex items-center gap-1.5 text-xs font-mono">
                    <span className="font-bold text-d2l-goldLight px-1 bg-black/40 rounded">
                      {pts}p
                    </span>
                    <span
                      className={`px-1 rounded font-bold ${
                        fouls >= 5
                          ? "bg-red-600 text-white font-black animate-bounce"
                          : fouls >= 4
                          ? "bg-amber-600/80 text-white"
                          : "text-gray-400"
                      }`}
                    >
                      {fouls}f
                    </span>
                  </div>

                  {/* 1-TAP IN / OUT STATUS TOGGLE (No modal required!) */}
                  <button
                    type="button"
                    title={isOnCourt ? "Click to Sub Out (Bench)" : "Click to Sub In (On Court)"}
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlayerOnCourt(team.id, player.id);
                    }}
                    className={`px-2 py-1 rounded text-[10px] font-bold font-athletic tracking-wide transition border ${
                      isOnCourt
                        ? "bg-emerald-600/80 hover:bg-emerald-500 text-white border-emerald-400 shadow-sm"
                        : "bg-gray-800/80 hover:bg-gray-700 text-gray-400 border-gray-700"
                    }`}
                  >
                    {isOnCourt ? "ON COURT" : "BENCH"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3">
      {renderTeamRoster(homeTeam, homePlayers, "home")}
      {renderTeamRoster(awayTeam, awayPlayers, "away")}
    </div>
  );
};
