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
import { useD2LStore } from "@/store/useD2LStore";

export default function Home() {
  const [activeTab, setActiveTab] = useState<string>("tracker");
  const { currentStaff, themeMode } = useD2LStore();

  const isStaff = currentStaff.role === "staff";
  const restrictedTabsForStaff = ["teams", "players", "schedule", "setup"];

  // Automatically divert staff users to tracker if they are on a restricted tab
  useEffect(() => {
    if (isStaff && restrictedTabsForStaff.includes(activeTab)) {
      setActiveTab("tracker");
    }
  }, [isStaff, activeTab]);

  const handleNavigateToBoxScore = (gameId: string) => {
    setActiveTab("box-score");
  };

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
