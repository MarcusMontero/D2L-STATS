"use client";

import React, { useState } from "react";
import { useD2LStore } from "@/store/useD2LStore";
import { PlayerLeaderboardItem } from "@/lib/types";
import {
  Award,
  MapPin,
  ChevronRight,
} from "lucide-react";
import { TeamLogo } from "@/components/common/TeamLogo";
import { PlayerAvatar } from "@/components/common/PlayerAvatar";

export const PlayersRankingsView: React.FC = () => {
  const { getPlayerLeaderboard } = useD2LStore();

  const [sortCategory, setSortCategory] = useState<"ppg" | "rpg" | "apg" | "bpg" | "spg" | "fgPct">("ppg");
  const [positionFilter, setPositionFilter] = useState<string>("ALL");
  const [selectedPlayerItem, setSelectedPlayerItem] = useState<PlayerLeaderboardItem | null>(null);

  const leaderboard = getPlayerLeaderboard(sortCategory);

  const filteredLeaderboard = leaderboard.filter((item) => {
    if (positionFilter !== "ALL" && item.player.position !== positionFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4 pb-16 md:pb-6 text-white">
      {/* Header Banner */}
      <div className="bg-d2l-panelDark rounded-xl border border-d2l-forestLight/80 p-4 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-athletic font-extrabold text-2xl text-white tracking-wide flex items-center gap-2">
            <Award className="w-6 h-6 text-d2l-gold" />
            <span>PLAYER RANKINGS & LEADERBOARD</span>
          </h2>
          <p className="text-xs text-gray-400">
            Official D2L Ayala Alabang Season 10 Player Statistics
          </p>
        </div>

        {/* Category & Position Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Stat Category Selector */}
          <select
            value={sortCategory}
            onChange={(e) => setSortCategory(e.target.value as any)}
            className="bg-d2l-cardDark border border-d2l-borderDark text-xs rounded-lg px-3 py-1.5 font-athletic font-bold text-d2l-gold"
          >
            <option value="ppg">Points (PPG)</option>
            <option value="rpg">Rebounds (RPG)</option>
            <option value="apg">Assists (APG)</option>
            <option value="bpg">Blocks (BPG)</option>
            <option value="spg">Steals (SPG)</option>
            <option value="fgPct">Field Goal %</option>
          </select>

          {/* Position Selector */}
          <select
            value={positionFilter}
            onChange={(e) => setPositionFilter(e.target.value)}
            className="bg-d2l-cardDark border border-d2l-borderDark text-xs rounded-lg px-3 py-1.5 font-athletic font-bold text-gray-200"
          >
            <option value="ALL">All Positions</option>
            <option value="PG">Point Guards (PG)</option>
            <option value="SG">Shooting Guards (SG)</option>
            <option value="SF">Small Forwards (SF)</option>
            <option value="PF">Power Forwards (PF)</option>
            <option value="C">Centers (C)</option>
          </select>
        </div>
      </div>

      {/* Top 3 Podium Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {filteredLeaderboard.slice(0, 3).map((item, idx) => {
          const medals = ["🥇", "🥈", "🥉"];
          const glowBorder = idx === 0 ? "border-d2l-gold gold-glow" : "border-d2l-forestLight";

          return (
            <div
              key={item.player.id}
              onClick={() => setSelectedPlayerItem(item)}
              className={`bg-gradient-to-br from-d2l-forest/60 via-d2l-panelDark to-d2l-dark rounded-2xl border-2 ${glowBorder} p-4 shadow-xl cursor-pointer hover:scale-[1.02] transition flex items-center gap-3`}
            >
              <div className="relative">
                <PlayerAvatar
                  photoUrl={item.player.photoUrl}
                  name={item.player.name}
                  jerseyNumber={item.player.jerseyNumber}
                  size="lg"
                />
                <span className="absolute -top-2 -left-2 text-lg">{medals[idx]}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-athletic font-black text-sm text-d2l-gold">
                    #{item.player.jerseyNumber}
                  </span>
                  <h3 className="font-athletic font-bold text-base text-white truncate">
                    {item.player.name}
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-gray-300">
                  <TeamLogo logo={item.team.logo} name={item.team.name} size="xs" />
                  <span>{item.team.shortName}</span>
                  <span>•</span>
                  <span>{item.player.position}</span>
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="font-athletic font-black text-2xl text-d2l-orange">
                    {item[sortCategory]}
                  </span>
                  <span className="text-[10px] text-gray-400 uppercase font-athletic">
                    {sortCategory.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Full Sortable Leaderboard Table */}
      <div className="bg-d2l-panelDark rounded-xl border border-d2l-borderDark overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-d2l-forest/80 text-[10px] font-athletic uppercase text-d2l-gold border-b border-d2l-borderDark">
                <th className="py-2.5 px-3 text-center">Rank</th>
                <th className="py-2.5 px-3">Player</th>
                <th className="py-2.5 px-2">Team</th>
                <th className="py-2.5 px-2 text-center">Pos</th>
                <th className="py-2.5 px-2 text-center">GP</th>
                <th className={`py-2.5 px-2 text-center font-black ${sortCategory === "ppg" ? "text-d2l-orange bg-black/30" : "text-white"}`}>PPG</th>
                <th className={`py-2.5 px-2 text-center font-black ${sortCategory === "rpg" ? "text-d2l-orange bg-black/30" : "text-white"}`}>RPG</th>
                <th className={`py-2.5 px-2 text-center font-black ${sortCategory === "apg" ? "text-d2l-orange bg-black/30" : "text-white"}`}>APG</th>
                <th className={`py-2.5 px-2 text-center font-black ${sortCategory === "bpg" ? "text-d2l-orange bg-black/30" : "text-white"}`}>BPG</th>
                <th className={`py-2.5 px-2 text-center font-black ${sortCategory === "spg" ? "text-d2l-orange bg-black/30" : "text-white"}`}>SPG</th>
                <th className="py-2.5 px-2 text-center">FG%</th>
                <th className="py-2.5 px-3 text-right">Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-d2l-forest/30">
              {filteredLeaderboard.map((item, idx) => {
                return (
                  <tr
                    key={item.player.id}
                    onClick={() => setSelectedPlayerItem(item)}
                    className="hover:bg-d2l-forest/30 transition cursor-pointer group"
                  >
                    <td className="py-3 px-3 text-center font-athletic font-black text-sm text-d2l-gold">
                      #{idx + 1}
                    </td>
                    <td className="py-3 px-3 flex items-center gap-2.5">
                      <PlayerAvatar
                        photoUrl={item.player.photoUrl}
                        name={item.player.name}
                        jerseyNumber={item.player.jerseyNumber}
                        size="sm"
                      />
                      <div>
                        <div className="font-athletic font-bold text-sm text-white group-hover:text-d2l-gold transition">
                          #{item.player.jerseyNumber} {item.player.name}
                        </div>
                        <div className="text-[10px] text-gray-400">{item.player.height} • {item.player.weight}</div>
                      </div>
                    </td>
                    <td className="py-3 px-2 font-medium text-gray-300">
                      <div className="flex items-center gap-1.5">
                        <TeamLogo logo={item.team.logo} name={item.team.name} size="xs" />
                        <span>{item.team.shortName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center font-mono font-bold text-d2l-goldLight">
                      {item.player.position}
                    </td>
                    <td className="py-3 px-2 text-center font-mono text-gray-300">
                      {item.gamesPlayed}
                    </td>
                    <td className={`py-3 px-2 text-center font-mono font-bold ${sortCategory === "ppg" ? "text-d2l-orange font-black bg-black/20" : "text-white"}`}>
                      {item.ppg}
                    </td>
                    <td className={`py-3 px-2 text-center font-mono font-bold ${sortCategory === "rpg" ? "text-d2l-orange font-black bg-black/20" : "text-white"}`}>
                      {item.rpg}
                    </td>
                    <td className={`py-3 px-2 text-center font-mono font-bold ${sortCategory === "apg" ? "text-d2l-orange font-black bg-black/20" : "text-white"}`}>
                      {item.apg}
                    </td>
                    <td className={`py-3 px-2 text-center font-mono font-bold ${sortCategory === "bpg" ? "text-d2l-orange font-black bg-black/20" : "text-white"}`}>
                      {item.bpg}
                    </td>
                    <td className={`py-3 px-2 text-center font-mono font-bold ${sortCategory === "spg" ? "text-d2l-orange font-black bg-black/20" : "text-white"}`}>
                      {item.spg}
                    </td>
                    <td className="py-3 px-2 text-center font-mono text-gray-300">
                      {item.fgPct}%
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button className="px-2.5 py-1 rounded bg-d2l-forest hover:bg-d2l-forestLight border border-d2l-borderDark text-[11px] font-bold text-white flex items-center gap-1 ml-auto">
                        <span>Bio</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Player Profile Modal */}
      {selectedPlayerItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-d2l-panelDark border-2 border-d2l-gold/60 rounded-2xl max-w-xl w-full p-4 sm:p-6 shadow-2xl space-y-4">
            {/* Player Bio Header */}
            <div className="flex items-center justify-between pb-3 border-b border-d2l-borderDark">
              <div className="flex items-center gap-3">
                <PlayerAvatar
                  photoUrl={selectedPlayerItem.player.photoUrl}
                  name={selectedPlayerItem.player.name}
                  jerseyNumber={selectedPlayerItem.player.jerseyNumber}
                  size="xl"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-athletic font-black text-xl text-d2l-gold">
                      #{selectedPlayerItem.player.jerseyNumber}
                    </span>
                    <h3 className="font-athletic font-extrabold text-2xl text-white">
                      {selectedPlayerItem.player.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-300">
                    <TeamLogo logo={selectedPlayerItem.team.logo} name={selectedPlayerItem.team.name} size="xs" />
                    <span>{selectedPlayerItem.team.name}</span>
                    <span>•</span>
                    <span className="font-bold text-d2l-goldLight">{selectedPlayerItem.player.position}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedPlayerItem(null)}
                className="px-3 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-bold text-gray-300"
              >
                Close
              </button>
            </div>

            {/* Bio Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-d2l-court/60 p-3 rounded-xl border border-d2l-borderDark text-xs">
              <div>
                <span className="text-gray-400 text-[10px] block">Age</span>
                <span className="font-bold text-white">{selectedPlayerItem.player.age} yrs</span>
              </div>
              <div>
                <span className="text-gray-400 text-[10px] block">Height / Weight</span>
                <span className="font-bold text-white">{selectedPlayerItem.player.height} • {selectedPlayerItem.player.weight}</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-400 text-[10px] block">Hometown / Residency</span>
                <span className="font-bold text-d2l-gold flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {selectedPlayerItem.player.hometown}
                </span>
              </div>
            </div>

            {/* Season Stats Breakdown */}
            <div>
              <h4 className="text-xs font-athletic uppercase text-gray-400 tracking-wider mb-2">
                Season 10 Statistics & Averages
              </h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-d2l-cardDark p-3 rounded-xl border border-d2l-borderDark text-center">
                  <span className="text-[10px] text-gray-400 uppercase">Points (PPG)</span>
                  <div className="font-athletic font-black text-2xl text-d2l-orange mt-0.5">
                    {selectedPlayerItem.ppg}
                  </div>
                </div>
                <div className="bg-d2l-cardDark p-3 rounded-xl border border-d2l-borderDark text-center">
                  <span className="text-[10px] text-gray-400 uppercase">Rebounds (RPG)</span>
                  <div className="font-athletic font-black text-2xl text-emerald-400 mt-0.5">
                    {selectedPlayerItem.rpg}
                  </div>
                </div>
                <div className="bg-d2l-cardDark p-3 rounded-xl border border-d2l-borderDark text-center">
                  <span className="text-[10px] text-gray-400 uppercase">Assists (APG)</span>
                  <div className="font-athletic font-black text-2xl text-blue-400 mt-0.5">
                    {selectedPlayerItem.apg}
                  </div>
                </div>
                <div className="bg-d2l-cardDark p-3 rounded-xl border border-d2l-borderDark text-center">
                  <span className="text-[10px] text-gray-400 uppercase">Blocks (BPG)</span>
                  <div className="font-athletic font-black text-xl text-purple-400 mt-0.5">
                    {selectedPlayerItem.bpg}
                  </div>
                </div>
                <div className="bg-d2l-cardDark p-3 rounded-xl border border-d2l-borderDark text-center">
                  <span className="text-[10px] text-gray-400 uppercase">Steals (SPG)</span>
                  <div className="font-athletic font-black text-xl text-indigo-400 mt-0.5">
                    {selectedPlayerItem.spg}
                  </div>
                </div>
                <div className="bg-d2l-cardDark p-3 rounded-xl border border-d2l-borderDark text-center">
                  <span className="text-[10px] text-gray-400 uppercase">Shooting FG%</span>
                  <div className="font-athletic font-black text-xl text-d2l-gold mt-0.5">
                    {selectedPlayerItem.fgPct}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
