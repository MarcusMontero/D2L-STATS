"use client";

import React, { useState, useRef } from "react";
import { useD2LStore } from "@/store/useD2LStore";
import { League, Team, Player, StaffUser } from "@/lib/types";
import { exportPlayersCsv, parsePlayersCsv } from "@/lib/csvHelper";
import { ImageUploadField } from "@/components/common/ImageUploadField";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { deleteImage } from "@/lib/storageHelper";
import {
  Settings,
  Plus,
  Upload,
  Download,
  Shield,
  Users,
  Edit2,
  Trash2,
  User,
} from "lucide-react";
import { TeamLogo } from "@/components/common/TeamLogo";
import { PlayerAvatar } from "@/components/common/PlayerAvatar";

export const LeagueSetupView: React.FC = () => {
  const {
    leagues,
    activeLeagueId,
    setActiveLeague,
    addLeague,
    teams,
    addTeam,
    updateTeam,
    deleteTeam,
    players,
    addPlayer,
    updatePlayer,
    deletePlayer,
    importPlayersFromCsv,
    staffList,
    addStaff,
  } = useD2LStore();

  const [selectedTeamId, setSelectedTeamId] = useState<string>(teams[0]?.id || "");
  const [isAddLeagueOpen, setIsAddLeagueOpen] = useState(false);
  const [isAddTeamOpen, setIsAddTeamOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [isAddPlayerOpen, setIsAddPlayerOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);

  // New League state
  const [newLeagueName, setNewLeagueName] = useState("");
  const [newLeagueSeason, setNewLeagueSeason] = useState("");
  const [newLeagueLocation, setNewLeagueLocation] = useState("Ayala Alabang Village");

  // New Team state
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamShort, setNewTeamShort] = useState("");
  const [newTeamLogoUrl, setNewTeamLogoUrl] = useState<string>("");

  // Edit Team state
  const [editTeamName, setEditTeamName] = useState("");
  const [editTeamShort, setEditTeamShort] = useState("");
  const [editTeamLogoUrl, setEditTeamLogoUrl] = useState<string>("");

  // New Player state
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerJersey, setNewPlayerJersey] = useState("0");
  const [newPlayerPosition, setNewPlayerPosition] = useState<"PG" | "SG" | "SF" | "PF" | "C">("SG");
  const [newPlayerHeight, setNewPlayerHeight] = useState("6'1\"");
  const [newPlayerHometown, setNewPlayerHometown] = useState("Ayala Alabang Village");
  const [newPlayerPhotoUrl, setNewPlayerPhotoUrl] = useState<string>("");

  // Edit Player state
  const [editPlayerName, setEditPlayerName] = useState("");
  const [editPlayerJersey, setEditPlayerJersey] = useState("0");
  const [editPlayerPosition, setEditPlayerPosition] = useState<"PG" | "SG" | "SF" | "PF" | "C">("SG");
  const [editPlayerHeight, setEditPlayerHeight] = useState("6'1\"");
  const [editPlayerHometown, setEditPlayerHometown] = useState("Ayala Alabang Village");
  const [editPlayerPhotoUrl, setEditPlayerPhotoUrl] = useState<string>("");
  const [editPlayerIsStarter, setEditPlayerIsStarter] = useState(false);

  // New Staff state
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [newStaffPassword, setNewStaffPassword] = useState("");
  const [newStaffRole, setNewStaffRole] = useState<"admin" | "staff">("staff");
  const [newStaffPin, setNewStaffPin] = useState("1234");

  const rosterFileInputRef = useRef<HTMLInputElement>(null);

  const activeLeague = leagues.find((l) => l.id === activeLeagueId) || leagues[0];
  const currentTeam = teams.find((t) => t.id === selectedTeamId) || teams[0];
  const teamPlayers = players.filter((p) => p.teamId === selectedTeamId);

  const handleCreateLeague = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeagueName.trim()) return;

    const newLeague: League = {
      id: `league-${Date.now()}`,
      name: newLeagueName,
      season: newLeagueSeason || "2026",
      location: newLeagueLocation,
      isActive: true,
    };

    addLeague(newLeague);
    setActiveLeague(newLeague.id);
    setIsAddLeagueOpen(false);
    setNewLeagueName("");
  };

  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    const newTeam: Team = {
      id: `team-${Date.now()}`,
      leagueId: activeLeague.id,
      name: newTeamName,
      shortName: (newTeamShort || newTeamName.slice(0, 4)).toUpperCase(),
      logo: newTeamLogoUrl || "",
      primaryColor: "#0B3B24",
      secondaryColor: "#D4AF37",
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      streak: "-",
    };

    addTeam(newTeam);
    setSelectedTeamId(newTeam.id);
    setIsAddTeamOpen(false);
    setNewTeamName("");
    setNewTeamShort("");
    setNewTeamLogoUrl("");
  };

  const handleOpenEditTeam = (t: Team, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTeam(t);
    setEditTeamName(t.name);
    setEditTeamShort(t.shortName);
    setEditTeamLogoUrl(t.logo || "");
  };

  const handleSaveEditTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam) return;

    updateTeam(editingTeam.id, {
      name: editTeamName,
      shortName: editTeamShort.toUpperCase(),
      logo: editTeamLogoUrl,
    });

    setEditingTeam(null);
  };

  const handleCreatePlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;

    const player: Player = {
      id: `p-${Date.now()}`,
      teamId: selectedTeamId,
      jerseyNumber: parseInt(newPlayerJersey, 10) || 0,
      name: newPlayerName,
      firstName: newPlayerName.split(" ")[0] || "Player",
      lastName: newPlayerName.split(" ").slice(1).join(" ") || "",
      position: newPlayerPosition,
      height: newPlayerHeight,
      weight: "185 lbs",
      age: 26,
      hometown: newPlayerHometown,
      photoUrl: newPlayerPhotoUrl || undefined,
      isStarter: false,
      isActive: true,
    };

    addPlayer(player);
    setIsAddPlayerOpen(false);
    setNewPlayerName("");
    setNewPlayerPhotoUrl("");
  };

  const handleOpenEditPlayer = (p: Player) => {
    setEditingPlayer(p);
    setEditPlayerName(p.name);
    setEditPlayerJersey(p.jerseyNumber.toString());
    setEditPlayerPosition(p.position);
    setEditPlayerHeight(p.height);
    setEditPlayerHometown(p.hometown);
    setEditPlayerPhotoUrl(p.photoUrl || "");
    setEditPlayerIsStarter(p.isStarter);
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
      height: editPlayerHeight,
      hometown: editPlayerHometown,
      photoUrl: editPlayerPhotoUrl || undefined,
      isStarter: editPlayerIsStarter,
    });

    setEditingPlayer(null);
  };

  const handleConfirmDeleteTeam = async () => {
    if (!teamToDelete) return;

    if (teamToDelete.logo) {
      await deleteImage(teamToDelete.logo, "team-logos");
    }

    const teamPlayerList = players.filter((p) => p.teamId === teamToDelete.id);
    for (const p of teamPlayerList) {
      if (p.photoUrl) {
        await deleteImage(p.photoUrl, "player-photos");
      }
    }

    deleteTeam(teamToDelete.id);
    if (selectedTeamId === teamToDelete.id) {
      setSelectedTeamId(teams.find((t) => t.id !== teamToDelete.id)?.id || "");
    }
    if (editingTeam?.id === teamToDelete.id) {
      setEditingTeam(null);
    }
    setTeamToDelete(null);
  };

  const handleConfirmDeletePlayer = async () => {
    if (!playerToDelete) return;

    if (playerToDelete.photoUrl) {
      await deleteImage(playerToDelete.photoUrl, "player-photos");
    }

    deletePlayer(playerToDelete.id);
    if (editingPlayer?.id === playerToDelete.id) {
      setEditingPlayer(null);
    }
    setPlayerToDelete(null);
  };

  const handleRosterCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsed = await parsePlayersCsv(file);
      const formatted = parsed.map((p) => ({ ...p, teamId: selectedTeamId }));
      importPlayersFromCsv(formatted);
      alert(`Imported ${formatted.length} players into ${currentTeam?.name}!`);
    } catch {
      alert("Failed to parse Roster CSV.");
    }
  };

  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim()) return;

    const newStaff: StaffUser = {
      id: `staff-${Date.now()}`,
      name: newStaffName,
      email: newStaffEmail || `${newStaffName.toLowerCase().replace(/\s+/g, "")}@d2league.ph`,
      role: newStaffRole,
      pin: newStaffPin || "1234",
      password: newStaffPassword || "d2l2026",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    };

    addStaff(newStaff);
    setIsAddStaffOpen(false);
    setNewStaffName("");
    setNewStaffEmail("");
    setNewStaffPassword("");
  };

  return (
    <div className="space-y-6 pb-16 md:pb-6 text-white">
      {/* Header Banner */}
      <div className="bg-d2l-panelDark rounded-xl border border-d2l-forestLight/80 p-4 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-athletic font-extrabold text-2xl text-white tracking-wide flex items-center gap-2">
            <Settings className="w-6 h-6 text-d2l-gold" />
            <span>LEAGUE & SEASON ADMINISTRATION</span>
          </h2>
          <p className="text-xs text-gray-400">
            System Admin Panel • Manage Leagues, Teams, Rosters, CSV Sync & Staff Access
          </p>
        </div>

        {/* League Switcher & Add League */}
        <div className="flex items-center gap-2">
          <select
            value={activeLeagueId}
            onChange={(e) => setActiveLeague(e.target.value)}
            className="bg-d2l-cardDark border border-d2l-borderDark text-xs rounded-lg px-3 py-1.5 font-athletic font-bold text-d2l-gold"
          >
            {leagues.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} ({l.season})
              </option>
            ))}
          </select>

          <button
            onClick={() => setIsAddLeagueOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-d2l-forest hover:bg-d2l-forestLight border border-d2l-borderDark text-xs font-bold text-white flex items-center gap-1"
          >
            <Plus className="w-4 h-4 text-d2l-gold" />
            <span>New League</span>
          </button>
        </div>
      </div>

      {/* 2-Column Section: Team & Roster Management */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Teams List (4 cols) */}
        <div className="lg:col-span-4 bg-d2l-panelDark rounded-xl border border-d2l-borderDark overflow-hidden shadow-lg flex flex-col">
          <div className="px-4 py-3 bg-d2l-forest/80 border-b border-d2l-forestLight flex items-center justify-between">
            <h3 className="font-athletic font-bold text-sm text-white uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-d2l-gold" /> Teams ({teams.length})
            </h3>
            <button
              onClick={() => {
                setNewTeamName("");
                setNewTeamShort("");
                setNewTeamLogoUrl("");
                setIsAddTeamOpen(true);
              }}
              className="px-2 py-1 rounded bg-d2l-orange hover:bg-d2l-orangeHover text-white text-[10px] font-athletic font-bold uppercase flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Add Team
            </button>
          </div>

          <div className="divide-y divide-d2l-forest/30 overflow-y-auto max-h-[420px] p-1">
            {teams.map((t) => {
              const isSelected = selectedTeamId === t.id;
              const count = players.filter((p) => p.teamId === t.id).length;

              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTeamId(t.id)}
                  className={`p-2.5 rounded-lg cursor-pointer transition flex items-center justify-between group ${
                    isSelected
                      ? "bg-d2l-forest text-white border border-d2l-gold/50"
                      : "hover:bg-d2l-cardDark text-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <TeamLogo logo={t.logo} name={t.name} size="sm" />
                    <div className="truncate">
                      <div className="font-athletic font-bold text-sm text-white truncate">{t.name}</div>
                      <div className="text-[10px] text-gray-400">{t.shortName}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] font-mono bg-black/40 px-2 py-0.5 rounded text-d2l-gold">
                      {count}p
                    </span>
                    <button
                      onClick={(e) => handleOpenEditTeam(t, e)}
                      title="Edit Team Logo & Info"
                      className="p-1 rounded text-gray-400 hover:text-d2l-gold hover:bg-black/40 transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTeamToDelete(t);
                      }}
                      title="Delete Team"
                      className="p-1 rounded text-gray-400 hover:text-rose-400 hover:bg-black/40 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Team Roster Management (8 cols) */}
        <div className="lg:col-span-8 bg-d2l-panelDark rounded-xl border border-d2l-borderDark overflow-hidden shadow-lg flex flex-col">
          {/* Header with CSV Import / Export */}
          <div className="px-4 py-3 bg-d2l-forest/80 border-b border-d2l-forestLight flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <TeamLogo logo={currentTeam?.logo} name={currentTeam?.name} size="sm" />
              <h3 className="font-athletic font-black text-base text-white tracking-wide">
                {currentTeam?.name.toUpperCase()} ROSTER
                <span className="text-xs text-d2l-gold font-normal ml-2">({teamPlayers.length} Active)</span>
              </h3>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => exportPlayersCsv(teamPlayers)}
                title="Export Roster CSV"
                className="px-2.5 py-1 rounded bg-d2l-cardDark hover:bg-d2l-forest border border-d2l-borderDark text-xs font-bold text-gray-200 flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5 text-d2l-gold" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={() => rosterFileInputRef.current?.click()}
                title="Import Roster CSV"
                className="px-2.5 py-1 rounded bg-d2l-cardDark hover:bg-d2l-forest border border-d2l-borderDark text-xs font-bold text-gray-200 flex items-center gap-1"
              >
                <Upload className="w-3.5 h-3.5 text-d2l-gold" />
                <span>Import CSV</span>
              </button>
              <input
                ref={rosterFileInputRef}
                type="file"
                accept=".csv"
                onChange={handleRosterCsvUpload}
                className="hidden"
              />

              <button
                onClick={() => {
                  setNewPlayerName("");
                  setNewPlayerPhotoUrl("");
                  setIsAddPlayerOpen(true);
                }}
                className="px-3 py-1 rounded bg-d2l-orange hover:bg-d2l-orangeHover text-white text-xs font-athletic font-bold uppercase flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Player</span>
              </button>
            </div>
          </div>

          {/* Roster Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-black/40 text-[10px] font-athletic uppercase text-gray-400 border-b border-d2l-borderDark">
                  <th className="py-2 px-3">#</th>
                  <th className="py-2 px-3">Player Photo & Name</th>
                  <th className="py-2 px-2 text-center">Pos</th>
                  <th className="py-2 px-2">Height / Wt</th>
                  <th className="py-2 px-3">Hometown / Enclave</th>
                  <th className="py-2 px-2 text-center">Starter</th>
                  <th className="py-2 px-3 text-right">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-d2l-forest/30">
                {teamPlayers.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => handleOpenEditPlayer(p)}
                    className="hover:bg-d2l-forest/20 transition cursor-pointer group"
                  >
                    <td className="py-2.5 px-3 font-athletic font-black text-sm text-d2l-gold">
                      #{p.jerseyNumber}
                    </td>
                    <td className="py-2.5 px-3 flex items-center gap-2.5">
                      <PlayerAvatar photoUrl={p.photoUrl} name={p.name} size="xs" />
                      <span className="font-semibold text-white group-hover:text-d2l-gold transition">
                        {p.name}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono font-bold text-d2l-goldLight">
                      {p.position}
                    </td>
                    <td className="py-2.5 px-2 text-gray-300">
                      {p.height} • {p.weight}
                    </td>
                    <td className="py-2.5 px-3 text-gray-400">{p.hometown}</td>
                    <td className="py-2.5 px-2 text-center">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          p.isStarter
                            ? "bg-emerald-900/60 text-emerald-300 border border-emerald-500/40"
                            : "bg-gray-800 text-gray-400"
                        }`}
                      >
                        {p.isStarter ? "YES" : "NO"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditPlayer(p);
                          }}
                          title="Edit Player"
                          className="p-1 rounded text-gray-400 hover:text-d2l-gold hover:bg-black/30 transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPlayerToDelete(p);
                          }}
                          title="Delete Player"
                          className="p-1 rounded text-gray-400 hover:text-rose-400 hover:bg-black/30 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Staff Accounts & Collaboration Roles */}
      <div className="bg-d2l-panelDark rounded-xl border border-d2l-borderDark p-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-d2l-borderDark mb-3">
          <div>
            <h3 className="font-athletic font-bold text-base text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-d2l-gold" /> STAFF CREDENTIALS & ACCESS ROLES
            </h3>
            <p className="text-xs text-gray-400">
              Two Roles: <strong>System Admin</strong> (full management) and <strong>Staff</strong> (Live Stat Tracker, Game Log, and Box Score only).
            </p>
          </div>
          <button
            onClick={() => setIsAddStaffOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-d2l-forest hover:bg-d2l-forestLight border border-d2l-borderDark text-xs font-bold text-white flex items-center gap-1"
          >
            <Plus className="w-4 h-4 text-d2l-gold" />
            <span>Add Staff Account</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {staffList.map((st) => (
            <div
              key={st.id}
              className="bg-d2l-cardDark p-3 rounded-xl border border-d2l-borderDark flex items-center gap-3"
            >
              <img
                src={st.avatar}
                alt={st.name}
                className="w-10 h-10 rounded-full object-cover border border-d2l-gold"
              />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-xs text-white truncate">{st.name}</div>
                <div className="text-[10px] text-gray-400 truncate">{st.email}</div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold uppercase ${
                      st.role === "admin"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    }`}
                  >
                    {st.role === "admin" ? "SYSTEM ADMIN" : "STAFF"}
                  </span>
                  <span className="text-[9px] text-gray-500 font-mono">PIN: {st.pin}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 1. ADD LEAGUE MODAL */}
      {isAddLeagueOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3">
          <form
            onSubmit={handleCreateLeague}
            className="bg-d2l-panelDark border border-d2l-gold/60 rounded-xl p-4 max-w-sm w-full space-y-3"
          >
            <h3 className="font-athletic font-bold text-base text-white">Create New League / Season</h3>
            <div>
              <label className="text-xs text-gray-400 block mb-1">League Name</label>
              <input
                type="text"
                placeholder="e.g. Ayala Alabang Invitational Cup"
                value={newLeagueName}
                onChange={(e) => setNewLeagueName(e.target.value)}
                className="w-full bg-d2l-cardDark border border-d2l-borderDark rounded p-2 text-xs text-white"
                required
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Season Tag</label>
              <input
                type="text"
                placeholder="e.g. Summer 2026"
                value={newLeagueSeason}
                onChange={(e) => setNewLeagueSeason(e.target.value)}
                className="w-full bg-d2l-cardDark border border-d2l-borderDark rounded p-2 text-xs text-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddLeagueOpen(false)}
                className="px-3 py-1.5 rounded text-xs text-gray-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded bg-d2l-orange text-white text-xs font-bold"
              >
                Create League
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. ADD TEAM MODAL (With ImageUploadField) */}
      {isAddTeamOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3">
          <form
            onSubmit={handleCreateTeam}
            className="bg-d2l-panelDark border-2 border-d2l-gold/60 rounded-xl p-5 max-w-md w-full space-y-4"
          >
            <h3 className="font-athletic font-bold text-lg text-white border-b border-d2l-borderDark pb-2 flex items-center gap-2">
              <Shield className="w-5 h-5 text-d2l-gold" /> Add New Team
            </h3>

            <div>
              <label className="text-xs text-gray-400 block mb-1 font-bold">Team Name</label>
              <input
                type="text"
                placeholder="e.g. Palms Ballers"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                className="w-full bg-d2l-cardDark border border-d2l-borderDark rounded-lg p-2.5 text-xs text-white"
                required
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1 font-bold">Short Name (Abbreviation)</label>
              <input
                type="text"
                placeholder="e.g. BALLERS"
                value={newTeamShort}
                onChange={(e) => setNewTeamShort(e.target.value)}
                className="w-full bg-d2l-cardDark border border-d2l-borderDark rounded-lg p-2.5 text-xs text-white uppercase font-mono"
              />
            </div>

            {/* Reusable Image Upload Field for Team Logo */}
            <ImageUploadField
              value={newTeamLogoUrl}
              onChange={(url) => setNewTeamLogoUrl(url)}
              bucket="team-logos"
              label="Team Logo Image"
              fallbackType="team"
              fallbackName={newTeamName || "Team"}
              hint="Attach PNG or JPG logo (Uploads to Supabase Storage)"
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-d2l-borderDark">
              <button
                type="button"
                onClick={() => setIsAddTeamOpen(false)}
                className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-d2l-orange text-white text-xs font-athletic font-bold uppercase"
              >
                Add Team
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. EDIT TEAM MODAL (With ImageUploadField Replace & Remove) */}
      {editingTeam && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3">
          <form
            onSubmit={handleSaveEditTeam}
            className="bg-d2l-panelDark border-2 border-d2l-gold/60 rounded-xl p-5 max-w-md w-full space-y-4"
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
              <label className="text-xs text-gray-400 block mb-1 font-bold">Short Name</label>
              <input
                type="text"
                value={editTeamShort}
                onChange={(e) => setEditTeamShort(e.target.value)}
                className="w-full bg-d2l-cardDark border border-d2l-borderDark rounded-lg p-2.5 text-xs text-white uppercase font-mono"
              />
            </div>

            {/* Reusable Image Upload Field for Replace / Remove with confirmation */}
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

      {/* 4. ADD PLAYER MODAL (With ImageUploadField) */}
      {isAddPlayerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3">
          <form
            onSubmit={handleCreatePlayer}
            className="bg-d2l-panelDark border-2 border-d2l-gold/60 rounded-xl p-5 max-w-md w-full space-y-4"
          >
            <h3 className="font-athletic font-bold text-lg text-white border-b border-d2l-borderDark pb-2 flex items-center gap-2">
              <User className="w-5 h-5 text-d2l-gold" /> Add Player to {currentTeam?.name}
            </h3>

            <div>
              <label className="text-xs text-gray-400 block mb-1 font-bold">Full Name</label>
              <input
                type="text"
                placeholder="e.g. Brian Moore"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                className="w-full bg-d2l-cardDark border border-d2l-borderDark rounded-lg p-2.5 text-xs text-white"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-400 block mb-1 font-bold">Jersey Number</label>
                <input
                  type="number"
                  value={newPlayerJersey}
                  onChange={(e) => setNewPlayerJersey(e.target.value)}
                  className="w-full bg-d2l-cardDark border border-d2l-borderDark rounded-lg p-2.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1 font-bold">Position</label>
                <select
                  value={newPlayerPosition}
                  onChange={(e) => setNewPlayerPosition(e.target.value as any)}
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

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-400 block mb-1 font-bold">Height</label>
                <input
                  type="text"
                  value={newPlayerHeight}
                  onChange={(e) => setNewPlayerHeight(e.target.value)}
                  className="w-full bg-d2l-cardDark border border-d2l-borderDark rounded-lg p-2.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1 font-bold">Hometown / Enclave</label>
                <input
                  type="text"
                  value={newPlayerHometown}
                  onChange={(e) => setNewPlayerHometown(e.target.value)}
                  className="w-full bg-d2l-cardDark border border-d2l-borderDark rounded-lg p-2.5 text-xs text-white"
                />
              </div>
            </div>

            {/* Reusable Image Upload Field for Player Photo */}
            <ImageUploadField
              value={newPlayerPhotoUrl}
              onChange={(url) => setNewPlayerPhotoUrl(url)}
              bucket="player-photos"
              label="Player Face Photo (Optional)"
              fallbackType="player"
              fallbackName={newPlayerName || "Player"}
              jerseyNumber={parseInt(newPlayerJersey, 10) || 0}
              hint="Attach face photo or skip to use initials avatar"
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-d2l-borderDark">
              <button
                type="button"
                onClick={() => setIsAddPlayerOpen(false)}
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
          </form>
        </div>
      )}

      {/* 5. EDIT PLAYER MODAL (With ImageUploadField Replace & Remove) */}
      {editingPlayer && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3">
          <form
            onSubmit={handleSaveEditPlayer}
            className="bg-d2l-panelDark border-2 border-d2l-gold/60 rounded-xl p-5 max-w-md w-full space-y-4"
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

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-400 block mb-1 font-bold">Height</label>
                <input
                  type="text"
                  value={editPlayerHeight}
                  onChange={(e) => setEditPlayerHeight(e.target.value)}
                  className="w-full bg-d2l-cardDark border border-d2l-borderDark rounded-lg p-2.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1 font-bold">Hometown</label>
                <input
                  type="text"
                  value={editPlayerHometown}
                  onChange={(e) => setEditPlayerHometown(e.target.value)}
                  className="w-full bg-d2l-cardDark border border-d2l-borderDark rounded-lg p-2.5 text-xs text-white"
                />
              </div>
            </div>

            {/* Starter Status Toggle */}
            <div className="flex items-center gap-2 p-2 bg-d2l-court/60 rounded-lg border border-d2l-borderDark">
              <input
                type="checkbox"
                id="editStarter"
                checked={editPlayerIsStarter}
                onChange={(e) => setEditPlayerIsStarter(e.target.checked)}
                className="w-4 h-4 rounded text-d2l-orange focus:ring-d2l-orange"
              />
              <label htmlFor="editStarter" className="text-xs text-white font-bold cursor-pointer">
                Designated Team Starter
              </label>
            </div>

            {/* Reusable Image Upload Field for Replace / Remove photo with confirmation */}
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
                  Save Changes
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* 6. ADD STAFF MODAL */}
      {isAddStaffOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3">
          <form
            onSubmit={handleCreateStaff}
            className="bg-d2l-panelDark border-2 border-d2l-gold/60 rounded-xl p-5 max-w-sm w-full space-y-3"
          >
            <h3 className="font-athletic font-bold text-base text-white border-b border-d2l-borderDark pb-2">
              Create Staff Account
            </h3>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Staff Member Name</label>
              <input
                type="text"
                placeholder="e.g. Dave Santos"
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
                className="w-full bg-d2l-cardDark border border-d2l-borderDark rounded p-2 text-xs text-white"
                required
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Role Assignment</label>
              <select
                value={newStaffRole}
                onChange={(e) => setNewStaffRole(e.target.value as any)}
                className="w-full bg-d2l-cardDark border border-d2l-borderDark rounded p-2 text-xs text-white font-bold"
              >
                <option value="staff">Staff (Live Stat Tracker, Log & Box Score only)</option>
                <option value="admin">System Admin (Full League & Setup Access)</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Email</label>
                <input
                  type="email"
                  placeholder="staff@d2league.ph"
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                  className="w-full bg-d2l-cardDark border border-d2l-borderDark rounded p-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Initial Password</label>
                <input
                  type="text"
                  placeholder="e.g. staff2026"
                  value={newStaffPassword}
                  onChange={(e) => setNewStaffPassword(e.target.value)}
                  className="w-full bg-d2l-cardDark border border-d2l-borderDark rounded p-2 text-xs text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-d2l-borderDark">
              <button
                type="button"
                onClick={() => setIsAddStaffOpen(false)}
                className="px-3 py-1.5 rounded text-xs text-gray-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded bg-d2l-orange text-white text-xs font-bold"
              >
                Save Staff
              </button>
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
              Are you sure you want to delete <strong className="text-white">{teamToDelete?.name}</strong>?
            </p>
            <p className="mt-2 text-gray-400">
              This will delete its logo from storage, drop all{" "}
              <strong className="text-d2l-gold">{players.filter((p) => p.teamId === teamToDelete?.id).length} players</strong> on its roster, and update/remove its scheduled games.
            </p>
            <p className="mt-1 text-gray-400 font-bold">This action cannot be undone.</p>
          </div>
        }
        confirmText="Delete Team & Roster"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleConfirmDeleteTeam}
        onCancel={() => setTeamToDelete(null)}
      />

      {/* Delete Player Custom Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(playerToDelete)}
        title={`Delete Player: #${playerToDelete?.jerseyNumber || ""} ${playerToDelete?.name || ""}`}
        message={
          <div>
            <p className="font-semibold text-rose-300">
              Are you sure you want to delete <strong className="text-white">#{playerToDelete?.jerseyNumber} {playerToDelete?.name}</strong> from the roster?
            </p>
            <p className="mt-2 text-gray-400">
              This will remove their photo from storage and drop them from the team. Past game log events will remain in historical records.
            </p>
          </div>
        }
        confirmText="Delete Player"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleConfirmDeletePlayer}
        onCancel={() => setPlayerToDelete(null)}
      />
    </div>
  );
};
