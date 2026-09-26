"use client";

import React, { useState } from "react";
import { useD2LStore } from "@/store/useD2LStore";
import { Player, PlayerLeaderboardItem } from "@/lib/types";
import {
  Award,
  MapPin,
  ChevronRight,
  Edit2,
  Trash2,
  User,
} from "lucide-react";
import { TeamLogo } from "@/components/common/TeamLogo";
import { PlayerAvatar } from "@/components/common/PlayerAvatar";
import { ImageUploadField } from "@/components/common/ImageUploadField";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { deleteImage } from "@/lib/storageHelper";

export const PlayersRankingsView: React.FC = () => {
  const { getPlayerLeaderboard, currentStaff, updatePlayer, deletePlayer } = useD2LStore();

  const [sortCategory, setSortCategory] = useState<"ppg" | "rpg" | "apg" | "bpg" | "spg" | "fgPct">("ppg");
  const [positionFilter, setPositionFilter] = useState<string>("ALL");
  const [selectedPlayerItem, setSelectedPlayerItem] = useState<PlayerLeaderboardItem | null>(null);

  // Edit Player Modal State
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [editPlayerName, setEditPlayerName] = useState("");
  const [editPlayerJersey, setEditPlayerJersey] = useState("0");
  const [editPlayerPosition, setEditPlayerPosition] = useState<"PG" | "SG" | "SF" | "PF" | "C">("SG");
  const [editPlayerPhotoUrl, setEditPlayerPhotoUrl] = useState<string>("");
  const [editPlayerIsStarter, setEditPlayerIsStarter] = useState(false);

  // Delete Player Modal State
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);

  const isAdmin = currentStaff.role === "admin";
  const leaderboard = getPlayerLeaderboard(sortCategory);

  const filteredLeaderboard = leaderboard.filter((item) => {
    if (positionFilter !== "ALL" && item.player.position !== positionFilter) return false;
    return true;
  });

  const handleOpenEditPlayer = (player: Player, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingPlayer(player);
    setEditPlayerName(player.name);
    setEditPlayerJersey(player.jerseyNumber.toString());
    setEditPlayerPosition(player.position);
    setEditPlayerPhotoUrl(player.photoUrl || "");
    setEditPlayerIsStarter(player.isStarter);
  };

  const handleSaveEditPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer) return;

    updatePlayer(editingPlayer.id, {
      name: editPlayerName,
      firstName: editPlayerName.split(" ")[0] || "Player",
      lastName: editPlayerName.split(" ").slice(1).join(" ") || "",
      jerseyNumber: parseInt(editPlayerJersey, 10) || 0,
      position: editPlayerPosition,
      photoUrl: editPlayerPhotoUrl || undefined,
      isStarter: editPlayerIsStarter,
    });

    if (selectedPlayerItem?.player.id === editingPlayer.id) {
      setSelectedPlayerItem({
        ...selectedPlayerItem,
        player: {
          ...selectedPlayerItem.player,
          name: editPlayerName,
          jerseyNumber: parseInt(editPlayerJersey, 10) || 0,
          position: editPlayerPosition,
          photoUrl: editPlayerPhotoUrl || undefined,
          isStarter: editPlayerIsStarter,
        },
      });
    }

    setEditingPlayer(null);
  };

  const handleConfirmDeletePlayer = async () => {
    if (!playerToDelete) return;
    const targetId = playerToDelete.id;

    if (playerToDelete.photoUrl) {
      await deleteImage(playerToDelete.photoUrl, "player-photos");
    }

    const res = await deletePlayer(targetId);
    if (!res?.success) {
      alert(`Failed to delete player from database: ${res?.error || "Unknown error"}`);
      return;
    }

    if (selectedPlayerItem?.player.id === targetId) {
      setSelectedPlayerItem(null);
    }
    if (editingPlayer?.id === targetId) {
      setEditingPlayer(null);
    }
    setPlayerToDelete(null);
  };

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
          {isAdmin && (
            <span className="bg-amber-500/20 text-amber-300 text-[10px] px-2 py-1 rounded font-mono font-bold border border-amber-500/40">
              ADMIN MODE
            </span>
          )}

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
              className={`bg-gradient-to-br from-d2l-forest/60 via-d2l-panelDark to-d2l-dark rounded-2xl border-2 ${glowBorder} p-4 shadow-xl cursor-pointer hover:scale-[1.02] transition flex items-center justify-between gap-3 group relative`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="relative shrink-0">
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
                    <h3 className="font-athletic font-bold text-base text-white truncate group-hover:text-d2l-gold transition">
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

              {/* Admin actions overlay */}
              {isAdmin && (
                <div className="flex flex-col gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => handleOpenEditPlayer(item.player, e)}
                    title="Edit Player"
                    className="p-1.5 rounded bg-d2l-cardDark hover:bg-d2l-forest border border-d2l-borderDark text-gray-300 hover:text-d2l-gold transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPlayerToDelete(item.player);
                    }}
                    title="Delete Player"
                    className="p-1.5 rounded bg-d2l-cardDark hover:bg-rose-950 border border-d2l-borderDark text-gray-400 hover:text-rose-400 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
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
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-d2l-forest/30">
              {filteredLeaderboard.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-gray-400 font-medium text-xs">
                    <div className="space-y-1">
                      <p className="font-athletic font-bold text-sm text-gray-300">No players registered in the league yet.</p>
                      <p className="text-gray-500 text-[11px]">Add players to team rosters in League Setup or import via CSV.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLeaderboard.map((item, idx) => {
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
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button className="px-2.5 py-1 rounded bg-d2l-forest hover:bg-d2l-forestLight border border-d2l-borderDark text-[11px] font-bold text-white flex items-center gap-1">
                          <span>Bio</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              onClick={(e) => handleOpenEditPlayer(item.player, e)}
                              title="Edit Player Profile & Photo"
                              className="p-1 rounded bg-d2l-cardDark hover:bg-d2l-forest border border-d2l-borderDark text-gray-300 hover:text-d2l-gold transition"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPlayerToDelete(item.player);
                              }}
                              title="Delete Player from Roster"
                              className="p-1 rounded bg-d2l-cardDark hover:bg-rose-950 border border-d2l-borderDark text-gray-400 hover:text-rose-400 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
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
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <>
                    <button
                      onClick={() => handleOpenEditPlayer(selectedPlayerItem.player)}
                      className="px-3 py-1 rounded-lg bg-d2l-forest hover:bg-d2l-forestLight border border-d2l-gold/40 text-xs font-bold text-d2l-gold flex items-center gap-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => setPlayerToDelete(selectedPlayerItem.player)}
                      className="px-3 py-1 rounded-lg bg-rose-950 hover:bg-rose-900 border border-rose-500/40 text-xs font-bold text-rose-300 flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </>
                )}
                <button
                  onClick={() => setSelectedPlayerItem(null)}
                  className="px-3 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-bold text-gray-300"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Bio Details */}
            <div className="grid grid-cols-2 gap-2 bg-d2l-court/60 p-3 rounded-xl border border-d2l-borderDark text-xs">
              <div>
                <span className="text-gray-400 text-[10px] block">Position</span>
                <span className="font-bold text-d2l-gold">{selectedPlayerItem.player.position}</span>
              </div>
              <div>
                <span className="text-gray-400 text-[10px] block">Roster Status</span>
                <span className="font-bold text-white">{selectedPlayerItem.player.isStarter ? "Starter" : "Bench"}</span>
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

      {/* Edit Player Modal */}
      {editingPlayer && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3">
          <form
            onSubmit={handleSaveEditPlayer}
            className="bg-d2l-panelDark border-2 border-d2l-gold/60 rounded-2xl p-5 max-w-md w-full space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-d2l-borderDark pb-2">
              <h3 className="font-athletic font-bold text-lg text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-d2l-gold" /> Edit Player: #{editingPlayer.jerseyNumber} {editingPlayer.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingPlayer(null)}
                className="text-xs text-gray-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1 font-bold">Full Name</label>
              <input
                type="text"
                value={editPlayerName}
                onChange={(e) => setEditPlayerName(e.target.value)}
                className="w-full bg-d2l-cardDark border border-d2l-borderDark rounded-lg p-2.5 text-xs text-white"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-400 block mb-1 font-bold">Jersey Number</label>
                <input
                  type="number"
                  value={editPlayerJersey}
                  onChange={(e) => setEditPlayerJersey(e.target.value)}
                  className="w-full bg-d2l-cardDark border border-d2l-borderDark rounded-lg p-2.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1 font-bold">Position</label>
                <select
                  value={editPlayerPosition}
                  onChange={(e) => setEditPlayerPosition(e.target.value as any)}
                  className="w-full bg-d2l-cardDark border border-d2l-borderDark rounded-lg p-2.5 text-xs text-white"
                >
                  <option value="PG">Point Guard (PG)</option>
                  <option value="SG">Shooting Guard (SG)</option>
                  <option value="SF">Small Forward (SF)</option>
                  <option value="PF">Power Forward (PF)</option>
                  <option value="C">Center (C)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 bg-d2l-court/60 rounded-lg border border-d2l-borderDark">
              <input
                type="checkbox"
                id="editPlayerStarterToggle"
                checked={editPlayerIsStarter}
                onChange={(e) => setEditPlayerIsStarter(e.target.checked)}
                className="w-4 h-4 rounded text-d2l-orange focus:ring-d2l-orange"
              />
              <label htmlFor="editPlayerStarterToggle" className="text-xs text-white font-bold cursor-pointer">
                Designated Team Starter
              </label>
            </div>

            <ImageUploadField
              value={editPlayerPhotoUrl}
              onChange={(url) => setEditPlayerPhotoUrl(url)}
              bucket="player-photos"
              label="Player Face Photo"
              fallbackType="player"
              fallbackName={editPlayerName}
              jerseyNumber={parseInt(editPlayerJersey, 10) || 0}
              hint="Replace with a new photo or remove to revert to initials avatar"
            />

            <div className="flex justify-between items-center pt-2 border-t border-d2l-borderDark">
              <button
                type="button"
                onClick={() => setPlayerToDelete(editingPlayer)}
                className="text-rose-400 hover:text-rose-300 text-xs font-bold flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Player</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPlayer(null)}
                  className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-d2l-orange text-white text-xs font-athletic font-bold uppercase"
                >
                  Save Player
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Delete Player Custom Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(playerToDelete)}
        title={`Delete Player: #${playerToDelete?.jerseyNumber || ""} ${playerToDelete?.name || ""}`}
        message={
          <div>
            <p className="font-semibold text-rose-300">
              Are you sure you want to delete <strong className="text-white">#{playerToDelete?.jerseyNumber} {playerToDelete?.name}</strong> from the active roster?
            </p>
            <p className="mt-2 text-gray-400">
              This action will remove their photo from storage and drop them from the roster. Past logged game events and box score history will remain intact for accuracy.
            </p>
          </div>
        }
        confirmText="Delete Player"
        cancelText="Cancel"
        variant="danger"
        requirePin={true}
        expectedPinHash={currentStaff.pin}
        onConfirm={handleConfirmDeletePlayer}
        onCancel={() => setPlayerToDelete(null)}
      />
    </div>
  );
};
