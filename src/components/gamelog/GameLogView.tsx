"use client";

import React, { useState } from "react";
import { useD2LStore } from "@/store/useD2LStore";
import { Quarter, StatEvent, StatType } from "@/lib/types";
import {
  Trash2,
  Clock,
  Search,
} from "lucide-react";
import { TeamLogo } from "@/components/common/TeamLogo";

export const GameLogView: React.FC = () => {
  const {
    getActiveGame,
    getGameTeams,
    getGameEvents,
    players,
    teams,
    deleteStatEvent,
  } = useD2LStore();

  const game = getActiveGame();
  const { homeTeam, awayTeam } = getGameTeams();
  const events = getGameEvents();

  const [selectedQuarter, setSelectedQuarter] = useState<string>("ALL");
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("" );

  if (!game || !homeTeam || !awayTeam) {
    return <div className="p-8 text-center text-gray-400">No active game selected.</div>;
  }

  // Filter events
  const filteredEvents = events.filter((evt) => {
    if (selectedQuarter !== "ALL" && evt.quarter !== selectedQuarter) return false;
    if (selectedTeamFilter !== "ALL" && evt.teamId !== selectedTeamFilter) return false;
    if (searchTerm.trim()) {
      const player = players.find((p) => p.id === evt.playerId);
      const team = teams.find((t) => t.id === evt.teamId);
      const term = searchTerm.toLowerCase();
      const matchName = player?.name.toLowerCase().includes(term);
      const matchTeam = team?.name.toLowerCase().includes(term);
      const matchStat = evt.statType.toLowerCase().includes(term);
      if (!matchName && !matchTeam && !matchStat) return false;
    }
    return true;
  });

  // Group events by quarter
  const quartersList: Quarter[] = ["Q1", "Q2", "Q3", "Q4", "OT1"];
  const groupedEvents: Record<string, StatEvent[]> = {};
  quartersList.forEach((q) => {
    groupedEvents[q] = filteredEvents.filter((e) => e.quarter === q);
  });

  const getStatBadge = (type: StatType, points: number) => {
    switch (type) {
      case "2PT_MAKE":
        return <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded font-mono font-bold text-xs">2PT MADE (+2)</span>;
      case "3PT_MAKE":
        return <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded font-mono font-bold text-xs">3PT MADE (+3)</span>;
      case "FT_MAKE":
        return <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded font-mono font-bold text-xs">FT MADE (+1)</span>;
      case "2PT_MISS":
        return <span className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded font-mono text-xs">2PT Miss</span>;
      case "3PT_MISS":
        return <span className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded font-mono text-xs">3PT Miss</span>;
      case "FT_MISS":
        return <span className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded font-mono text-xs">FT Miss</span>;
      case "OREB":
        return <span className="bg-teal-500/20 text-teal-300 border border-teal-500/40 px-2 py-0.5 rounded font-mono font-bold text-xs">Off. Rebound</span>;
      case "DREB":
        return <span className="bg-teal-500/20 text-teal-300 border border-teal-500/40 px-2 py-0.5 rounded font-mono font-bold text-xs">Def. Rebound</span>;
      case "AST":
        return <span className="bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2 py-0.5 rounded font-mono font-bold text-xs">Assist</span>;
      case "STL":
        return <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded font-mono font-bold text-xs">Steal</span>;
      case "BLK":
        return <span className="bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded font-mono font-bold text-xs">Block</span>;
      case "TO":
        return <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded font-mono font-bold text-xs">Turnover</span>;
      case "FOUL_PERSONAL":
        return <span className="bg-red-500/20 text-red-300 border border-red-500/40 px-2 py-0.5 rounded font-mono font-bold text-xs">Personal Foul</span>;
      case "FOUL_TECH":
        return <span className="bg-red-600 text-white font-black px-2 py-0.5 rounded font-mono text-xs">TECH FOUL</span>;
      default:
        return <span className="bg-gray-800 text-gray-300 px-2 py-0.5 rounded text-xs">{type}</span>;
    }
  };

  const getQuarterDisplay = (q: Quarter) => {
    switch (q) {
      case "Q1":
        return "1st Quarter";
      case "Q2":
        return "2nd Quarter";
      case "Q3":
        return "3rd Quarter";
      case "Q4":
        return "4th Quarter";
      default:
        return q;
    }
  };

  return (
    <div className="space-y-4 pb-16 md:pb-6 text-white">
      {/* Header Banner */}
      <div className="bg-d2l-panelDark rounded-xl border border-d2l-forestLight/80 p-4 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-athletic font-extrabold text-2xl text-white tracking-wide flex items-center gap-2">
            <span>📜 LIVE GAME LOG</span>
            <span className="text-xs bg-d2l-forest text-d2l-goldLight border border-d2l-gold/40 px-2 py-0.5 rounded font-sans font-bold">
              {filteredEvents.length} Events Logged
            </span>
          </h2>
          <p className="text-xs text-gray-400">
            Running chronological feed for {homeTeam.name} vs {awayTeam.name}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Quarter filter */}
          <select
            value={selectedQuarter}
            onChange={(e) => setSelectedQuarter(e.target.value)}
            className="bg-d2l-cardDark border border-d2l-borderDark text-xs rounded-lg px-2.5 py-1.5 font-athletic font-bold text-gray-200"
          >
            <option value="ALL">All Quarters</option>
            <option value="Q1">1st Quarter</option>
            <option value="Q2">2nd Quarter</option>
            <option value="Q3">3rd Quarter</option>
            <option value="Q4">4th Quarter</option>
            <option value="OT1">Overtime</option>
          </select>

          {/* Team filter */}
          <select
            value={selectedTeamFilter}
            onChange={(e) => setSelectedTeamFilter(e.target.value)}
            className="bg-d2l-cardDark border border-d2l-borderDark text-xs rounded-lg px-2.5 py-1.5 font-athletic font-bold text-gray-200"
          >
            <option value="ALL">Both Teams</option>
            <option value={homeTeam.id}>{homeTeam.shortName}</option>
            <option value={awayTeam.id}>{awayTeam.shortName}</option>
          </select>

          {/* Search box */}
          <div className="relative flex-1 sm:w-44">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search player/stat..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-d2l-cardDark border border-d2l-borderDark rounded-lg pl-8 pr-2 py-1.5 text-xs text-white placeholder-gray-500"
            />
          </div>
        </div>
      </div>

      {/* Events Grouped By Quarter */}
      {quartersList.map((q) => {
        const qEvents = groupedEvents[q] || [];
        if (selectedQuarter !== "ALL" && selectedQuarter !== q) return null;
        if (qEvents.length === 0) return null;

        return (
          <div key={q} className="bg-d2l-panelDark rounded-xl border border-d2l-borderDark overflow-hidden shadow-lg">
            {/* Quarter Banner */}
            <div className="bg-gradient-to-r from-d2l-forest to-d2l-court px-4 py-2 border-b border-d2l-forestLight flex items-center justify-between">
              <span className="font-athletic font-black text-lg text-d2l-gold tracking-wide">
                {getQuarterDisplay(q)}
              </span>
              <span className="text-xs text-gray-300 font-mono font-bold">
                {qEvents.length} events
              </span>
            </div>

            {/* Quarter Events List */}
            <div className="divide-y divide-d2l-forest/30">
              {qEvents.map((evt) => {
                const player = players.find((p) => p.id === evt.playerId);
                const team = teams.find((t) => t.id === evt.teamId);
                const isHome = evt.teamId === game.homeTeamId;

                return (
                  <div
                    key={evt.id}
                    className="p-3 hover:bg-d2l-forest/20 transition flex items-center justify-between gap-3 text-xs"
                  >
                    {/* Left: Clock, Team Logo, Player, Stat */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Game Clock */}
                      <div className="font-mono font-bold text-gray-400 flex items-center gap-1 shrink-0 bg-black/40 px-2 py-0.5 rounded border border-d2l-borderDark text-[11px]">
                        <Clock className="w-3 h-3 text-d2l-gold" />
                        <span>{evt.gameClock}</span>
                      </div>

                      {/* Team Logo / Short Name */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <TeamLogo logo={team?.logo} name={team?.name} size="xs" />
                        <span className={`font-athletic font-bold text-xs ${isHome ? "text-emerald-300" : "text-blue-300"}`}>
                          {team?.shortName}
                        </span>
                      </div>

                      {/* Player info */}
                      <div className="flex items-center gap-1.5 truncate">
                        {player ? (
                          <>
                            <span className="font-mono font-bold text-d2l-gold">
                              #{player.jerseyNumber}
                            </span>
                            <span className="font-semibold text-white truncate">
                              {player.name}
                            </span>
                          </>
                        ) : (
                          <span className="text-gray-400">Team Event</span>
                        )}
                      </div>

                      {/* Stat Type Badge */}
                      <div className="shrink-0">{getStatBadge(evt.statType, evt.points)}</div>

                      {/* Notes / Staff attribution */}
                      {evt.notes && (
                        <span className="hidden md:inline text-gray-400 italic text-[11px] truncate max-w-[200px]">
                          &quot;{evt.notes}&quot;
                        </span>
                      )}
                    </div>

                    {/* Right: Staff attribution & Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {evt.staffName && (
                        <span className="hidden lg:inline text-[10px] text-gray-400 bg-black/30 px-1.5 py-0.5 rounded">
                          by {evt.staffName.split(" ")[0]}
                        </span>
                      )}

                      <button
                        onClick={() => {
                          if (confirm(`Delete stat event: #${player?.jerseyNumber || ""} ${evt.statType}?`)) {
                            deleteStatEvent(evt.id);
                          }
                        }}
                        title="Delete this event (reverts score)"
                        className="p-1 rounded text-gray-500 hover:text-red-400 hover:bg-red-950/50 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {filteredEvents.length === 0 && (
        <div className="p-12 text-center bg-d2l-panelDark rounded-xl border border-d2l-borderDark text-gray-400">
          No stat events match your filter criteria.
        </div>
      )}
    </div>
  );
};
