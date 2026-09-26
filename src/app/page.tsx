"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { LiveTrackerPage } from "@/components/tracker/LiveTrackerPage";
import { GameLogView } from "@/components/gamelog/GameLogView";
import { BoxScoreView } from "@/components/boxscore/BoxScoreView";
import { TeamsStandingsView } from "@/components/teams/TeamsStandingsView";
import { PlayersRankingsView } from "@/components/players/PlayersRankingsView";
import { ScheduleView } from "@/components/schedule/ScheduleView";
import { LeagueSetupView } from "@/components/setup/LeagueSetupView";
import { LoginPage } from "@/components/auth/LoginPage";
import { useD2LStore } from "@/store/useD2LStore";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("tracker");
  const { currentStaff, isAuthenticated, themeMode } = useD2LStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isStaff = currentStaff?.role === "staff";
  const restrictedTabsForStaff = ["teams", "players", "schedule", "setup"];

  // Automatically divert staff users to tracker if they are on a restricted tab
  useEffect(() => {
    if (mounted && isAuthenticated && isStaff && restrictedTabsForStaff.includes(activeTab)) {
      setActiveTab("tracker");
    }
  }, [mounted, isAuthenticated, isStaff, activeTab]);

  const handleNavigateToBoxScore = (gameId: string) => {
    setActiveTab("box-score");
  };

  // SSR & initial client hydration loading screen
  if (!mounted) {
    return (
      <div className="min-h-screen bg-d2l-dark text-d2l-gold flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-d2l-panelDark border border-d2l-gold/40 flex items-center justify-center">
          <img src="/D2L_LOGO.png" alt="D2L Logo" className="h-9 w-auto object-contain" />
        </div>
        <span className="font-athletic font-bold text-xs uppercase tracking-widest text-gray-300">
          Loading D2L Courtside Panel...
        </span>
      </div>
    );
  }

  // Route Protection: If user is not authenticated, render Login Page exclusively
  if (!isAuthenticated) {
    return (
      <LoginPage
        onLoginSuccess={(landingTab) => {
          setActiveTab(landingTab);
        }}
      />
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col ${
        themeMode === "clean-light"
          ? "bg-slate-900 text-slate-100"
          : "bg-d2l-dark text-gray-100"
      }`}
    >
      {/* Top Courtside Bar */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-2 sm:p-4 md:p-6">
        {activeTab === "tracker" && <LiveTrackerPage />}
        {activeTab === "game-log" && <GameLogView />}
        {activeTab === "box-score" && <BoxScoreView />}
        {!isStaff && activeTab === "teams" && <TeamsStandingsView />}
        {!isStaff && activeTab === "players" && <PlayersRankingsView />}
        {!isStaff && activeTab === "schedule" && (
          <ScheduleView onNavigateToBoxScore={handleNavigateToBoxScore} />
        )}
        {!isStaff && activeTab === "setup" && <LeagueSetupView />}
      </main>

      {/* Mobile Courtside Navigation Bar */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
