"use client";

import React, { useState } from "react";
import { useD2LStore } from "@/store/useD2LStore";
import {
  Volume2,
  VolumeX,
  Users,
  Wifi,
  WifiOff,
  ChevronDown,
  Shield,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { StaffRole } from "@/lib/types";
import { TeamLogo } from "@/components/common/TeamLogo";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const {
    games,
    activeGameId,
    setActiveGame,
    getActiveGame,
    getGameTeams,
    staffList,
    currentStaff,
    setCurrentStaff,
    soundEnabled,
    toggleSound,
    isOnline,
    pendingSyncCount,
    resetAllDataToDefault,
  } = useD2LStore();

  const [isStaffMenuOpen, setIsStaffMenuOpen] = useState(false);
  const [isGameMenuOpen, setIsGameMenuOpen] = useState(false);
  const [crestError, setCrestError] = useState(false);

  const activeGame = getActiveGame();
  const { homeTeam, awayTeam } = getGameTeams();

  const getRoleBadge = (role: StaffRole) => {
    switch (role) {
      case "admin":
        return (
          <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
            SYSTEM ADMIN
          </span>
        );
      case "staff":
      default:
        return (
          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
            STAFF
          </span>
        );
    }
  };

  // Staff role gets access to Live Tracker, Live Game Log, and Box Score only
  const allTabs = [
    { id: "tracker", label: "⚡ Live Stat Tracker", minRole: "staff" },
    { id: "game-log", label: "📜 Live Game Log", minRole: "staff" },
    { id: "box-score", label: "📊 Box Score & PDF", minRole: "staff" },
    { id: "teams", label: "🏆 Standings & Teams", minRole: "admin" },
    { id: "players", label: "🌟 Players & Rankings", minRole: "admin" },
    { id: "schedule", label: "📅 Schedule & Results", minRole: "admin" },
    { id: "setup", label: "⚙️ League & Setup", minRole: "admin" },
  ];

  const visibleTabs = allTabs.filter((tab) => {
    if (tab.minRole === "staff") return true;
    return currentStaff.role === "admin";
  });

  return (
    <header className="sticky top-0 z-40 bg-d2l-dark/95 backdrop-blur border-b border-d2l-forestLight/60 shadow-lg text-white">
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2 flex items-center justify-between gap-2">
        {/* Brand Crest & Title */}
        <div
          className="flex items-center gap-2.5 cursor-pointer select-none"
          onClick={() => setActiveTab("tracker")}
        >
          {/* Static D2L Crest Logo */}
          <div className="relative h-10 w-10 shrink-0 flex items-center justify-center">
            {!crestError ? (
              <img
                src="/d2l-crest.png"
                alt="D2L Crest Logo"
                onError={() => setCrestError(true)}
                className="h-10 w-auto max-w-[42px] object-contain drop-shadow-md"
              />
            ) : (
              <img
                src="/d2l-crest.svg"
                alt="D2L Crest Vector"
                className="h-10 w-auto max-w-[42px] object-contain drop-shadow-md"
              />
            )}
          </div>

          <div className="hidden sm:block">
            <div className="flex items-center gap-1.5">
              <h1 className="font-athletic font-black text-lg tracking-wider text-white">
                DISTRICT 2 <span className="text-d2l-gold">LEAGUE</span>
              </h1>
              <span className="bg-d2l-forest text-d2l-goldLight border border-d2l-gold/40 text-[10px] font-bold px-1.5 py-0.2 rounded uppercase">
                Ayala Alabang
              </span>
            </div>
            <p className="text-[10px] text-gray-400 -mt-1 tracking-tight font-medium">
              Courtside Official Control Panel
            </p>
          </div>
        </div>

        {/* Live Game Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsGameMenuOpen(!isGameMenuOpen)}
            className="flex items-center gap-2 bg-d2l-cardDark hover:bg-d2l-forest border border-d2l-borderDark hover:border-d2l-gold/50 px-2.5 py-1.5 rounded-lg text-xs transition"
          >
            <span className="w-2 h-2 rounded-full bg-d2l-orange animate-ping" />
            <div className="flex items-center gap-1.5 font-bold text-gray-200 truncate max-w-[120px] sm:max-w-[200px]">
              <TeamLogo logo={homeTeam?.logo} name={homeTeam?.name} size="xs" />
              <span>{homeTeam?.shortName || "HOME"}</span>
              <span className="text-gray-500 font-normal">vs</span>
              <TeamLogo logo={awayTeam?.logo} name={awayTeam?.name} size="xs" />
              <span>{awayTeam?.shortName || "AWAY"}</span>
            </div>
            <span className="text-d2l-gold font-mono font-bold ml-1">
              {activeGame?.homeScore}:{activeGame?.awayScore}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>

          {isGameMenuOpen && (
            <div className="absolute top-full mt-1 right-0 sm:left-0 w-72 bg-d2l-panelDark border border-d2l-borderDark rounded-xl shadow-2xl p-1.5 z-50">
              <div className="text-[10px] font-bold text-gray-400 px-2 py-1 uppercase tracking-wider">
                Select Active Game
              </div>
              {games.map((g) => {
                const isSelected = g.id === activeGameId;
                const { homeTeam: h, awayTeam: a } = useD2LStore.getState().getGameTeams(g.id);

                return (
                  <button
                    key={g.id}
                    onClick={() => {
                      setActiveGame(g.id);
                      setIsGameMenuOpen(false);
                    }}
                    className={`w-full text-left px-2 py-2 rounded-lg text-xs flex items-center justify-between transition ${
                      isSelected
                        ? "bg-d2l-forest border border-d2l-gold/40 text-white"
                        : "hover:bg-d2l-cardDark text-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <TeamLogo logo={h?.logo} name={h?.name} size="sm" />
                      <div>
                        <div className="font-bold">
                          {h?.shortName || "HOME"} vs {a?.shortName || "AWAY"}
                        </div>
                        <div className="text-[10px] text-gray-400 truncate max-w-[140px]">{g.venue}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          g.status === "live"
                            ? "bg-d2l-orange text-white"
                            : "bg-gray-800 text-gray-400"
                        }`}
                      >
                        {g.status.toUpperCase()}
                      </span>
                      <div className="text-[11px] font-mono font-bold text-d2l-gold">
                        {g.homeScore} - {g.awayScore}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Actions: Sync Status, Staff Role, Sound */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Sync Status Badge */}
          <div
            title={isOnline ? "Supabase Realtime Synced" : "Offline mode - queued"}
            className="flex items-center gap-1 bg-d2l-panelDark/80 border border-d2l-borderDark px-2 py-1 rounded text-[11px]"
          >
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden md:inline text-emerald-400 font-medium">Live Sync</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-400 font-mono text-[10px]">{pendingSyncCount} Queued</span>
              </>
            )}
          </div>

          {/* Sound FX Toggle */}
          <button
            onClick={toggleSound}
            title={soundEnabled ? "Mute Whistle & Buzzer Sounds" : "Unmute Sounds"}
            className="p-1.5 rounded bg-d2l-cardDark hover:bg-d2l-forest border border-d2l-borderDark text-gray-300 hover:text-d2l-gold transition"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-d2l-gold" />
            ) : (
              <VolumeX className="w-4 h-4 text-gray-500" />
            )}
          </button>

          {/* Staff Switcher (Admin vs Staff) */}
          <div className="relative">
            <button
              onClick={() => setIsStaffMenuOpen(!isStaffMenuOpen)}
              className="flex items-center gap-1.5 bg-d2l-cardDark hover:bg-d2l-forest border border-d2l-borderDark hover:border-d2l-gold/40 px-2 py-1 rounded text-xs transition"
            >
              <Users className="w-3.5 h-3.5 text-d2l-gold" />
              <span className="hidden sm:inline font-medium text-gray-200">
                {currentStaff.name.split(" ")[0]}
              </span>
              {getRoleBadge(currentStaff.role)}
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>

            {isStaffMenuOpen && (
              <div className="absolute top-full mt-1 right-0 w-64 bg-d2l-panelDark border border-d2l-borderDark rounded-xl shadow-2xl p-2 z-50">
                <div className="text-[10px] font-bold text-gray-400 px-2 py-1 uppercase tracking-wider flex justify-between items-center">
                  <span>Switch Staff User</span>
                  <Shield className="w-3 h-3 text-d2l-gold" />
                </div>
                <div className="space-y-1 mt-1">
                  {staffList.map((st) => (
                    <button
                      key={st.id}
                      onClick={() => {
                        setCurrentStaff(st);
                        setIsStaffMenuOpen(false);
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center justify-between transition ${
                        currentStaff.id === st.id
                          ? "bg-d2l-forest border border-d2l-gold/40 text-white"
                          : "hover:bg-d2l-cardDark text-gray-300"
                      }`}
                    >
                      <div>
                        <div className="font-bold">{st.name}</div>
                        <div className="text-[10px] text-gray-400">{st.email}</div>
                      </div>
                      {getRoleBadge(st.role)}
                    </button>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t border-d2l-borderDark/60 flex justify-between">
                  <button
                    onClick={() => {
                      if (
                        confirm(
                          "Reset all test stats & return to initial Ayala Alabang league state?"
                        )
                      ) {
                        resetAllDataToDefault();
                        setIsStaffMenuOpen(false);
                      }
                    }}
                    className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset Demo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Navigation Tabs (Filtered by Role) */}
      <nav className="hidden md:flex border-t border-d2l-forestLight/40 bg-d2l-panelDark/80 px-4">
        <div className="max-w-7xl mx-auto flex items-center gap-1 w-full overflow-x-auto py-1">
          {visibleTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition flex items-center gap-1 ${
                  isActive
                    ? "bg-d2l-forest text-d2l-gold border border-d2l-gold/50 shadow-sm"
                    : "text-gray-300 hover:text-white hover:bg-d2l-cardDark"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>
    </header>
  );
};
