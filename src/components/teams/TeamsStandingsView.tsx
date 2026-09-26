"use client";

import React, { useState } from "react";
import { useD2LStore } from "@/store/useD2LStore";
import { Team } from "@/lib/types";
import {
  Trophy,
  ChevronRight,
  Edit2,
  Trash2,
  Shield,
  Plus,
} from "lucide-react";
import { TeamLogo } from "@/components/common/TeamLogo";
import { PlayerAvatar } from "@/components/common/PlayerAvatar";
import { ImageUploadField } from "@/components/common/ImageUploadField";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { deleteImage } from "@/lib/storageHelper";

export const TeamsStandingsView: React.FC = () => {
  const {
    teams,
    players,
    games,
    leagues,
    activeLeagueId,
    currentStaff,
    updateTeam,
    deleteTeam,
  } = useD2LStore();

  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  // Edit Team Modal state
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editTeamName, setEditTeamName] = useState("");
  const [editTeamShort, setEditTeamShort] = useState("");
  const [editTeamLogoUrl, setEditTeamLogoUrl] = useState<string>("");

  // Delete Team Confirmation Modal state
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);

  const isAdmin = currentStaff.role === "admin";
  const activeLeague = leagues.find((l) => l.id === activeLeagueId) || leagues[0];

  // Flat list for the whole league, ranked by win percentage, then point differential
  const sortedTeams = [...teams].sort((a, b) => {
    const totalA = a.wins + a.losses || 1;
    const totalB = b.wins + b.losses || 1;
    const pctA = a.wins / totalA;
    const pctB = b.wins / totalB;
    if (pctB !== pctA) return pctB - pctA;
    const diffA = a.pointsFor - a.pointsAgainst;
    const diffB = b.pointsFor - b.pointsAgainst;
    return diffB - diffA;
  });

  // Calculate team season averages
  const getTeamSeasonStats = (team: Team) => {
    const gamesPlayed = team.wins + team.losses || 8;
    const ppg = (team.pointsFor / gamesPlayed).toFixed(1);
    const oppPpg = (team.pointsAgainst / gamesPlayed).toFixed(1);
    const diff = (team.pointsFor - team.pointsAgainst > 0 ? "+" : "") + (team.pointsFor - team.pointsAgainst);
    const winPct = ((team.wins / gamesPlayed) * 100).toFixed(1);

    return {
      gamesPlayed,
      ppg,
      oppPpg,
      diff,
      winPct,
      fgPct: "48.2%",
      fg3Pct: "36.8%",
      ftPct: "76.4%",
      apg: "22.4",
      rpg: "42.8",
      bpg: "4.6",
      spg: "7.8",
      topg: "11.2",
    };
  };

  const getTeamRoster = (teamId: string) => {
    return players.filter((p) => p.teamId === teamId);
  };

  const handleOpenEditTeam = (team: Team, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingTeam(team);
    setEditTeamName(team.name);
    setEditTeamShort(team.shortName);
    setEditTeamLogoUrl(team.logo || "");
  };

  const handleSaveEditTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam) return;

    updateTeam(editingTeam.id, {
      name: editTeamName,
      shortName: editTeamShort.toUpperCase(),
      logo: editTeamLogoUrl,
    });

    if (selectedTeam?.id === editingTeam.id) {
      setSelectedTeam({
        ...selectedTeam,
        name: editTeamName,
        shortName: editTeamShort.toUpperCase(),
        logo: editTeamLogoUrl,
      });
    }

    setEditingTeam(null);
  };

  const handleConfirmDeleteTeam = async () => {
    if (!teamToDelete) return;

    // Remove logo from Supabase storage if applicable
    if (teamToDelete.logo) {
      await deleteImage(teamToDelete.logo, "team-logos");
    }

    // Delete player face photos for this team
    const teamPlayerList = players.filter((p) => p.teamId === teamToDelete.id);
    for (const p of teamPlayerList) {
      if (p.photoUrl) {
        await deleteImage(p.photoUrl, "player-photos");
      }
    }

    // Delete team from store
    deleteTeam(teamToDelete.id);

    if (selectedTeam?.id === teamToDelete.id) {
      setSelectedTeam(null);
    }
    setTeamToDelete(null);
    if (editingTeam?.id === teamToDelete.id) {
      setEditingTeam(null);
    }
  };

  return (
    <div className="space-y-4 pb-16 md:pb-6 text-white">
      {/* Header Banner */}
      <div className="bg-d2l-panelDark rounded-xl border border-d2l-forestLight/80 p-4 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-athletic font-extrabold text-2xl text-white tracking-wide flex items-center gap-2">
            <Trophy className="w-6 h-6 text-d2l-gold" />
            <span>LEAGUE STANDINGS & TEAMS</span>
          </h2>
          <p className="text-xs text-gray-400">
            {activeLeague?.name} • Ayala Alabang Village • {activeLeague?.season}
          </p>
        </div>
        <div className="text-xs text-d2l-gold font-bold bg-d2l-forest px-3 py-1.5 rounded-lg border border-d2l-gold/40 flex items-center gap-2">
          <span>Ranked by Win Percentage (WIN%)</span>
          {isAdmin && (
            <span className="bg-amber-500/20 text-amber-300 text-[10px] px-2 py-0.5 rounded font-mono font-bold border border-amber-500/40">
              ADMIN MODE
            </span>
          )}
        </div>
      </div>

      {/* Flat Standings Table */}
      <div className="bg-d2l-panelDark rounded-xl border border-d2l-borderDark overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-d2l-forest/80 text-[10px] font-athletic uppercase text-d2l-gold border-b border-d2l-borderDark">
                <th className="py-2.5 px-3 text-center">Rank</th>
                <th className="py-2.5 px-3">Team</th>
                <th className="py-2.5 px-2 text-center">GP</th>
                <th className="py-2.5 px-2 text-center text-emerald-400 font-bold">W</th>
                <th className="py-2.5 px-2 text-center text-rose-400 font-bold">L</th>
                <th className="py-2.5 px-2 text-center text-white font-bold">WIN%</th>
                <th className="py-2.5 px-2 text-center">PPG</th>
                <th className="py-2.5 px-2 text-center">OPP PPG</th>
                <th className="py-2.5 px-2 text-center">DIFF</th>
                <th className="py-2.5 px-2 text-center">STRK</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-d2l-forest/30">
              {sortedTeams.map((team, idx) => {
                const total = team.wins + team.losses || 1;
                const winPct = ((team.wins / total) * 100).toFixed(1);
                const ppg = (team.pointsFor / total).toFixed(1);
                const oppPpg = (team.pointsAgainst / total).toFixed(1);
                const diff = team.pointsFor - team.pointsAgainst;

                return (
                  <tr
                    key={team.id}
                    onClick={() => setSelectedTeam(team)}
                    className="hover:bg-d2l-forest/30 transition cursor-pointer group"
                  >
                    <td className="py-3 px-3 text-center font-athletic font-black text-sm text-d2l-gold">
                      #{idx + 1}
                    </td>
                    <td className="py-3 px-3 flex items-center gap-2.5">
                      <TeamLogo logo={team.logo} name={team.name} size="sm" />
                      <div>
                        <div className="font-athletic font-bold text-sm text-white group-hover:text-d2l-gold transition">
                          {team.name}
                        </div>
                        <div className="text-[10px] text-gray-400">{team.shortName}</div>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center font-mono text-gray-300">{total}</td>
                    <td className="py-3 px-2 text-center font-mono font-bold text-emerald-400">
                      {team.wins}
                    </td>
                    <td className="py-3 px-2 text-center font-mono font-bold text-rose-400">
                      {team.losses}
                    </td>
                    <td className="py-3 px-2 text-center font-mono font-black text-d2l-goldLight bg-black/20">
                      {winPct}%
                    </td>
                    <td className="py-3 px-2 text-center font-mono text-gray-300">{ppg}</td>
                    <td className="py-3 px-2 text-center font-mono text-gray-400">{oppPpg}</td>
                    <td className={`py-3 px-2 text-center font-mono font-bold ${diff >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {diff > 0 ? `+${diff}` : diff}
                    </td>
                    <td className="py-3 px-2 text-center font-mono font-bold text-d2l-gold">
                      {team.streak}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedTeam(team)}
                          className="px-2 py-1 rounded bg-d2l-forest hover:bg-d2l-forestLight border border-d2l-borderDark text-[11px] font-bold text-white flex items-center gap-1"
                        >
                          <span>View</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              onClick={(e) => handleOpenEditTeam(team, e)}
                              title="Edit Team"
                              className="p-1 rounded bg-d2l-cardDark hover:bg-d2l-forest border border-d2l-borderDark text-gray-300 hover:text-d2l-gold transition"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setTeamToDelete(team);
                              }}
                              title="Delete Team"
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
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Team Profile Modal */}
      {selectedTeam && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-d2l-panelDark border-2 border-d2l-gold/60 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-2xl space-y-4">
            {/* Team Banner */}
            <div className="flex items-center justify-between pb-3 border-b border-d2l-borderDark">
              <div className="flex items-center gap-3">
                <TeamLogo logo={selectedTeam.logo} name={selectedTeam.name} size="xl" />
                <div>
                  <h3 className="font-athletic font-extrabold text-2xl text-white">
                    {selectedTeam.name}
                  </h3>
                  <p className="text-xs text-d2l-gold font-semibold">
                    Record: {selectedTeam.wins}W - {selectedTeam.losses}L ({selectedTeam.streak}) • Season 10
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <>
                    <button
                      onClick={() => handleOpenEditTeam(selectedTeam)}
                      className="px-3 py-1 rounded-lg bg-d2l-forest hover:bg-d2l-forestLight border border-d2l-gold/40 text-xs font-bold text-d2l-gold flex items-center gap-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Edit Team
                    </button>
                    <button
                      onClick={() => setTeamToDelete(selectedTeam)}
                      className="px-3 py-1 rounded-lg bg-rose-950 hover:bg-rose-900 border border-rose-500/40 text-xs font-bold text-rose-300 flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete Team
                    </button>
                  </>
                )}
                <button
                  onClick={() => setSelectedTeam(null)}
                  className="px-3 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-bold text-gray-300"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Season Averages Grid */}
            <div>
              <h4 className="text-xs font-athletic uppercase text-gray-400 tracking-wider mb-2">
                Team Season Averages & Statistics
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: "Points / Game (PPG)", val: getTeamSeasonStats(selectedTeam).ppg, color: "text-d2l-gold" },
                  { label: "Field Goal % (FG%)", val: getTeamSeasonStats(selectedTeam).fgPct, color: "text-emerald-400" },
                  { label: "3-Point % (3P%)", val: getTeamSeasonStats(selectedTeam).fg3Pct, color: "text-amber-300" },
                  { label: "Free Throw % (FT%)", val: getTeamSeasonStats(selectedTeam).ftPct, color: "text-blue-300" },
                  { label: "Assists / Game (APG)", val: getTeamSeasonStats(selectedTeam).apg, color: "text-blue-400" },
                  { label: "Rebounds / Game (RPG)", val: getTeamSeasonStats(selectedTeam).rpg, color: "text-purple-300" },
                  { label: "Blocks / Game (BPG)", val: getTeamSeasonStats(selectedTeam).bpg, color: "text-indigo-300" },
                  { label: "Steals / Game (SPG)", val: getTeamSeasonStats(selectedTeam).spg, color: "text-teal-300" },
                ].map((stat, idx) => (
                  <div key={idx} className="bg-d2l-cardDark p-2.5 rounded-xl border border-d2l-borderDark text-center">
                    <div className="text-[10px] text-gray-400 font-medium truncate">{stat.label}</div>
                    <div className={`font-athletic font-black text-xl ${stat.color} mt-0.5`}>
                      {stat.val}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Team Roster Table */}
            <div>
              <h4 className="text-xs font-athletic uppercase text-gray-400 tracking-wider mb-2">
                Active Roster ({getTeamRoster(selectedTeam.id).length} Players)
              </h4>
              <div className="divide-y divide-d2l-forest/30 bg-d2l-court/60 rounded-xl border border-d2l-borderDark overflow-hidden">
                {getTeamRoster(selectedTeam.id).map((p) => (
                  <div key={p.id} className="p-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded bg-d2l-gold text-black font-athletic font-black flex items-center justify-center text-xs">
                        #{p.jerseyNumber}
                      </span>
                      <PlayerAvatar photoUrl={p.photoUrl} name={p.name} size="xs" />
                      <div>
                        <span className="font-semibold text-white">{p.name}</span>
                        <span className="text-[10px] text-gray-400 ml-2 font-mono">{p.position} • {p.height}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-400">{p.hometown}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Team Modal */}
      {editingTeam && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3">
          <form
            onSubmit={handleSaveEditTeam}
            className="bg-d2l-panelDark border-2 border-d2l-gold/60 rounded-2xl p-5 max-w-md w-full space-y-4"
          >
            <div className="flex items-center justify-between border-b border-d2l-borderDark pb-2">
              <h3 className="font-athletic font-bold text-lg text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-d2l-gold" /> Edit Team: {editingTeam.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingTeam(null)}
                className="text-xs text-gray-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1 font-bold">Team Name</label>
              <input
                type="text"
                value={editTeamName}
                onChange={(e) => setEditTeamName(e.target.value)}
                className="w-full bg-d2l-cardDark border border-d2l-borderDark rounded-lg p-2.5 text-xs text-white"
                required
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1 font-bold">Short Name / Tri-code</label>
              <input
                type="text"
                value={editTeamShort}
                onChange={(e) => setEditTeamShort(e.target.value)}
                className="w-full bg-d2l-cardDark border border-d2l-borderDark rounded-lg p-2.5 text-xs text-white uppercase font-mono"
              />
            </div>

            <ImageUploadField
              value={editTeamLogoUrl}
              onChange={(url) => setEditTeamLogoUrl(url)}
              bucket="team-logos"
              label="Team Logo Badge"
              fallbackType="team"
              fallbackName={editTeamName}
              hint="Replace with a new logo or remove to revert to gold initials badge"
            />

            <div className="flex justify-between items-center pt-2 border-t border-d2l-borderDark">
              <button
                type="button"
                onClick={() => setTeamToDelete(editingTeam)}
                className="text-rose-400 hover:text-rose-300 text-xs font-bold flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Team</span>
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTeam(null)}
                  className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-d2l-orange text-white text-xs font-athletic font-bold uppercase"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Delete Team Custom Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(teamToDelete)}
        title={`Delete Team: ${teamToDelete?.name || ""}`}
        message={
          <div>
            <p className="font-semibold text-rose-300">
              Are you sure you want to permanently delete <strong className="text-white">{teamToDelete?.name}</strong>?
            </p>
            <p className="mt-2 text-gray-400">
              This action will remove the team logo from storage, delete all{" "}
              <strong className="text-d2l-gold">{players.filter((p) => p.teamId === teamToDelete?.id).length} players</strong> on its roster, and update or remove scheduled games tied to this team.
            </p>
            <p className="mt-1 text-gray-400 font-bold">This operation cannot be undone.</p>
          </div>
        }
        confirmText="Delete Team & Roster"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleConfirmDeleteTeam}
        onCancel={() => setTeamToDelete(null)}
      />
    </div>
  );
};
