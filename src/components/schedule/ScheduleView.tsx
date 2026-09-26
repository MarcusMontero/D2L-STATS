"use client";

import React, { useState, useRef } from "react";
import { useD2LStore } from "@/store/useD2LStore";
import { Game } from "@/lib/types";
import { exportSchedulePDF } from "@/lib/pdfGenerator";
import { exportScheduleCsv, parseScheduleCsv } from "@/lib/csvHelper";
import {
  CalendarDays,
  Plus,
  Download,
  Upload,
  FileText,
  MapPin,
  Clock,
  ChevronRight,
} from "lucide-react";
import { TeamLogo } from "@/components/common/TeamLogo";

interface ScheduleViewProps {
  onNavigateToBoxScore: (gameId: string) => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({ onNavigateToBoxScore }) => {
  const { games, teams, activeLeagueId, leagues, addGame, setActiveGame } = useD2LStore();

  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isAddGameOpen, setIsAddGameOpen] = useState(false);

  // New Game Form State
  const [newHomeTeamId, setNewHomeTeamId] = useState(teams[0]?.id || "");
  const [newAwayTeamId, setNewAwayTeamId] = useState(teams[1]?.id || "");
  const [newDate, setNewDate] = useState("2026-10-02");
  const [newTime, setNewTime] = useState("18:30");
  const [newVenue, setNewVenue] = useState("Ayala Alabang Village Main Gym - Court 1");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeLeague = leagues.find((l) => l.id === activeLeagueId) || leagues[0];

  const filteredGames = games.filter((g) => {
    if (statusFilter !== "ALL" && g.status !== statusFilter) return false;
    return true;
  });

  // Sort chronologically
  filteredGames.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  // Group games by Month
  const gamesByMonth: Record<string, Game[]> = {};
  filteredGames.forEach((g) => {
    const monthYear = new Date(g.scheduledAt).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    if (!gamesByMonth[monthYear]) gamesByMonth[monthYear] = [];
    gamesByMonth[monthYear].push(g);
  });

  const handleCreateGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (newHomeTeamId === newAwayTeamId) {
      alert("Home team and Away team must be different.");
      return;
    }

    const scheduledAt = new Date(`${newDate}T${newTime}:00+08:00`).toISOString();

    const createdGame: Game = {
      id: `game-${Date.now()}`,
      leagueId: activeLeague.id,
      season: activeLeague.season,
      homeTeamId: newHomeTeamId,
      awayTeamId: newAwayTeamId,
      homeScore: 0,
      awayScore: 0,
      quarter: "Q1",
      timeRemainingSeconds: 600,
      isClockRunning: false,
      status: "scheduled",
      scheduledAt,
      venue: newVenue,
      homeFouls: 0,
      awayFouls: 0,
      homeTimeouts: 4,
      awayTimeouts: 4,
      possession: "neutral",
      officials: ["R. Fernandez", "M. Dizon"],
      quarterScores: {
        home: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 },
        away: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 },
      },
    };

    addGame(createdGame);
    setIsAddGameOpen(false);
  };

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const importedGames = await parseScheduleCsv(file, activeLeague.id, activeLeague.season);
      importedGames.forEach((g) => addGame(g));
      alert(`Successfully imported ${importedGames.length} games to schedule!`);
    } catch {
      alert("Error parsing CSV schedule. Please check format.");
    }
  };

  return (
    <div className="space-y-4 pb-16 md:pb-6 text-white">
      {/* Header Banner */}
      <div className="bg-d2l-panelDark rounded-xl border border-d2l-forestLight/80 p-4 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        <div>
          <h2 className="font-athletic font-extrabold text-2xl text-white tracking-wide flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-d2l-gold" />
            <span>GAME SCHEDULE & RESULTS</span>
          </h2>
          <p className="text-xs text-gray-400">
            Official D2L Calendar • Ayala Alabang Village
          </p>
        </div>

        {/* Action Controls & Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Status filter (Simplified - no divisions) */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-d2l-cardDark border border-d2l-borderDark text-xs rounded-lg px-2.5 py-1.5 font-athletic font-bold text-gray-200"
          >
            <option value="ALL">All Statuses</option>
            <option value="scheduled">Upcoming Games</option>
            <option value="live">Live Now</option>
            <option value="final">Final Results</option>
          </select>

          {/* CSV & PDF Buttons */}
          <button
            onClick={() => exportSchedulePDF(games, teams)}
            title="Export schedule as printable PDF"
            className="p-1.5 rounded-lg bg-d2l-cardDark hover:bg-d2l-forest border border-d2l-borderDark text-xs font-bold text-d2l-gold flex items-center gap-1"
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">PDF</span>
          </button>

          <button
            onClick={() => exportScheduleCsv(games)}
            title="Export CSV"
            className="p-1.5 rounded-lg bg-d2l-cardDark hover:bg-d2l-forest border border-d2l-borderDark text-xs font-bold text-gray-300 flex items-center gap-1"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">CSV</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            title="Import CSV"
            className="p-1.5 rounded-lg bg-d2l-cardDark hover:bg-d2l-forest border border-d2l-borderDark text-xs font-bold text-gray-300 flex items-center gap-1"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Import</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleCsvImport}
            className="hidden"
          />

          {/* Add Game Button */}
          <button
            onClick={() => setIsAddGameOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-d2l-orange hover:bg-d2l-orangeHover text-white text-xs font-athletic font-bold flex items-center gap-1.5 orange-glow"
          >
            <Plus className="w-4 h-4" />
            <span>Add Game</span>
          </button>
        </div>
      </div>

      {/* Month Grouped Games */}
      {Object.entries(gamesByMonth).map(([month, monthGames]) => (
        <div key={month} className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <span className="font-athletic font-black text-lg text-d2l-gold uppercase tracking-wider">
              {month}
            </span>
            <div className="h-px flex-1 bg-d2l-forestLight/60" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {monthGames.map((g) => {
              const home = teams.find((t) => t.id === g.homeTeamId) || teams[0];
              const away = teams.find((t) => t.id === g.awayTeamId) || teams[1];
              const d = new Date(g.scheduledAt);
              const formattedDate = d.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              });
              const formattedTime = d.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              });

              return (
                <div
                  key={g.id}
                  className="bg-d2l-panelDark rounded-xl border border-d2l-borderDark hover:border-d2l-gold/50 p-4 shadow-lg transition flex flex-col justify-between gap-3"
                >
                  {/* Top Bar: Date & Time */}
                  <div className="flex items-center justify-between text-xs text-gray-400 pb-2 border-b border-d2l-forest/40">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-d2l-gold" /> {formattedDate} • {formattedTime}
                      </span>
                    </div>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        g.status === "live"
                          ? "bg-d2l-orange text-white animate-pulse"
                          : g.status === "final"
                          ? "bg-gray-800 text-gray-300"
                          : "bg-emerald-950 text-emerald-300 border border-emerald-500/40"
                      }`}
                    >
                      {g.status}
                    </span>
                  </div>

                  {/* Matchup Banner */}
                  <div className="flex items-center justify-between py-1">
                    {/* Home Team */}
                    <div className="flex items-center gap-2 flex-1">
                      <TeamLogo logo={home.logo} name={home.name} size="md" />
                      <div>
                        <div className="font-athletic font-bold text-base text-white truncate max-w-[120px]">
                          {home.name}
                        </div>
                        <div className="text-[10px] text-gray-400">HOME</div>
                      </div>
                    </div>

                    {/* Middle Score / VS */}
                    <div className="px-3 text-center">
                      {g.status === "final" || g.status === "live" ? (
                        <div>
                          <div className="font-athletic font-black text-2xl text-d2l-gold font-mono">
                            {g.homeScore} - {g.awayScore}
                          </div>
                        </div>
                      ) : (
                        <span className="font-athletic font-black text-lg text-gray-500">VS</span>
                      )}
                    </div>

                    {/* Away Team */}
                    <div className="flex items-center justify-end gap-2 flex-1 text-right">
                      <div>
                        <div className="font-athletic font-bold text-base text-white truncate max-w-[120px]">
                          {away.name}
                        </div>
                        <div className="text-[10px] text-gray-400">AWAY</div>
                      </div>
                      <TeamLogo logo={away.logo} name={away.name} size="md" />
                    </div>
                  </div>

                  {/* Venue & Action link */}
                  <div className="flex items-center justify-between pt-2 border-t border-d2l-forest/40 text-xs">
                    <span className="text-gray-400 truncate max-w-[200px] flex items-center gap-1 text-[11px]">
                      <MapPin className="w-3 h-3 text-d2l-gold shrink-0" /> {g.venue}
                    </span>

                    <button
                      onClick={() => {
                        setActiveGame(g.id);
                        onNavigateToBoxScore(g.id);
                      }}
                      className="text-d2l-gold hover:text-white font-athletic font-bold text-xs flex items-center gap-1"
                    >
                      <span>Box Score</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Add Game Modal */}
      {isAddGameOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
          <form
            onSubmit={handleCreateGame}
            className="bg-d2l-panelDark border-2 border-d2l-gold/60 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4"
          >
            <h3 className="font-athletic font-bold text-lg text-white pb-2 border-b border-d2l-borderDark flex items-center gap-2">
              <Plus className="w-5 h-5 text-d2l-gold" /> Add New Scheduled Game
            </h3>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-400 font-bold mb-1">Home Team</label>
                  <select
                    value={newHomeTeamId}
                    onChange={(e) => setNewHomeTeamId(e.target.value)}
                    className="w-full bg-d2l-cardDark border border-d2l-borderDark rounded-lg p-2 text-white"
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 font-bold mb-1">Away Team</label>
                  <select
                    value={newAwayTeamId}
                    onChange={(e) => setNewAwayTeamId(e.target.value)}
                    className="w-full bg-d2l-cardDark border border-d2l-borderDark rounded-lg p-2 text-white"
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-400 font-bold mb-1">Date</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-d2l-cardDark border border-d2l-borderDark rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-bold mb-1">Time</label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full bg-d2l-cardDark border border-d2l-borderDark rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 font-bold mb-1">Venue / Court</label>
                <input
                  type="text"
                  value={newVenue}
                  onChange={(e) => setNewVenue(e.target.value)}
                  className="w-full bg-d2l-cardDark border border-d2l-borderDark rounded-lg p-2 text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-d2l-borderDark">
              <button
                type="button"
                onClick={() => setIsAddGameOpen(false)}
                className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-d2l-orange text-white text-xs font-athletic font-bold uppercase"
              >
                Save Game
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
