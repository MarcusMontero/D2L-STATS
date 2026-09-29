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
import { ToastNotifier } from "@/components/common/ToastNotifier";
import { useD2LStore } from "@/store/useD2LStore";
import { supabase, isSupabaseConfigured, clearRetiredLeagueCaches } from "@/lib/supabaseClient";
import { StaffRole, StaffUser } from "@/lib/types";
import { mapTeamFromDb, mapPlayerFromDb, mapGameFromDb, mapStatEventFromDb } from "@/lib/supabaseService";


export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("tracker");
  const { currentStaff, isAuthenticated, themeMode, isDataLoaded, dataLoadError, loadFromSupabase } = useD2LStore();

  useEffect(() => {
    setMounted(true);
    clearRetiredLeagueCaches();

    // Initial auth verification against Supabase Auth
    if (isSupabaseConfigured) {
      supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (error || !session?.user) {
          useD2LStore.setState({ isAuthenticated: false, isDataLoaded: false });
        } else {
          const user = session.user;
          const userEmail = user.email?.toLowerCase() || "";
          const userRole = (user.user_metadata?.role as StaffRole) || (userEmail.includes("admin") || userEmail.includes("marcus") ? "admin" : "staff");
          const staff: StaffUser = {
            id: user.id,
            name: user.user_metadata?.name || userEmail.split("@")[0],
            email: userEmail,
            role: userRole,
            pin: "2026",
            avatar: user.user_metadata?.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
          };
          useD2LStore.setState({ isAuthenticated: true, currentStaff: staff });
          loadFromSupabase();
        }
      });

      // Listen to auth state changes (sign in, sign out, token refresh)
      const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_OUT" || !session) {
          useD2LStore.setState({ isAuthenticated: false, isDataLoaded: false });
        } else if (event === "SIGNED_IN" && session?.user) {
          const user = session.user;
          const userEmail = user.email?.toLowerCase() || "";
          const userRole = (user.user_metadata?.role as StaffRole) || (userEmail.includes("admin") || userEmail.includes("marcus") ? "admin" : "staff");
          const staff: StaffUser = {
            id: user.id,
            name: user.user_metadata?.name || userEmail.split("@")[0],
            email: userEmail,
            role: userRole,
            pin: "2026",
            avatar: user.user_metadata?.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
          };
          useD2LStore.setState({ isAuthenticated: true, currentStaff: staff });
          loadFromSupabase();
        }
      });

      // Listen for Supabase Realtime changes — merge individual rows instead of
      // calling loadFromSupabase() which can wipe optimistic state if Supabase
      // returns 0 rows in a race-condition window right after an insert.
      let refreshTimer: ReturnType<typeof setTimeout> | undefined;
      const refreshFromDatabase = () => {
        if (refreshTimer) clearTimeout(refreshTimer);
        refreshTimer = setTimeout(() => void loadFromSupabase(), 75);
      };
      const channel = supabase
        .channel("public-db-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "teams" },
          (payload) => {
            refreshFromDatabase();
            const { eventType, new: newRow, old: oldRow } = payload;
            useD2LStore.setState((s) => {
              if (eventType === "DELETE") {
                return { teams: s.teams.filter((t) => t.id !== (oldRow as any).id) };
              }
              if (eventType === "INSERT" || eventType === "UPDATE") {
                const mapped = mapTeamFromDb(newRow);
                const exists = s.teams.some((t) => t.id === mapped.id);
                return { teams: exists ? s.teams.map((t) => t.id === mapped.id ? mapped : t) : [...s.teams, mapped] };
              }
              return {};
            });
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "players" },
          (payload) => {
            refreshFromDatabase();
            const { eventType, new: newRow, old: oldRow } = payload;
            useD2LStore.setState((s) => {
              if (eventType === "DELETE") {
                return { players: s.players.filter((p) => p.id !== (oldRow as any).id) };
              }
              if (eventType === "INSERT" || eventType === "UPDATE") {
                const mapped = mapPlayerFromDb(newRow);
                const exists = s.players.some((p) => p.id === mapped.id);
                return { players: exists ? s.players.map((p) => p.id === mapped.id ? mapped : p) : [...s.players, mapped] };
              }
              return {};
            });
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "games" },
          (payload) => {
            refreshFromDatabase();
            const { eventType, new: newRow, old: oldRow } = payload;
            useD2LStore.setState((s) => {
              if (eventType === "DELETE") {
                return { games: s.games.filter((g) => g.id !== (oldRow as any).id) };
              }
              if (eventType === "INSERT" || eventType === "UPDATE") {
                const mapped = mapGameFromDb(newRow);
                const exists = s.games.some((g) => g.id === mapped.id);
                return { games: exists ? s.games.map((g) => g.id === mapped.id ? mapped : g) : [mapped, ...s.games] };
              }
              return {};
            });
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "stat_events" },
          (payload) => {
            refreshFromDatabase();
            const { eventType, new: newRow, old: oldRow } = payload;
            useD2LStore.setState((s) => {
              if (eventType === "DELETE") {
                return { statEvents: s.statEvents.filter((e) => e.id !== (oldRow as any).id) };
              }
              if (eventType === "INSERT" || eventType === "UPDATE") {
                const mapped = mapStatEventFromDb(newRow);
                const exists = s.statEvents.some((e) => e.id === mapped.id);
                return { statEvents: exists ? s.statEvents.map((e) => e.id === mapped.id ? mapped : e) : [mapped, ...s.statEvents] };
              }
              return {};
            });
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "app_state" },
          (payload) => {
            refreshFromDatabase();
            useD2LStore.setState({ activeGameId: (payload.new as { active_game_id?: string | null }).active_game_id || "" });
          }
        )
        .subscribe();

      return () => {
        authListener?.subscription.unsubscribe();
        if (refreshTimer) clearTimeout(refreshTimer);
        supabase.removeChannel(channel);
      };
    } else {
      loadFromSupabase();
    }
  }, [loadFromSupabase]);

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

  // Do not render a local snapshot while the initial or a Realtime-triggered
  // Supabase read is in flight.
  if (!isDataLoaded) {
    return (
      <div className="min-h-screen bg-d2l-dark text-d2l-gold flex items-center justify-center font-athletic font-bold text-xs uppercase tracking-widest">
        {dataLoadError ? `Unable to load live league data: ${dataLoadError}` : "Loading live league data..."}
      </div>
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
      {/* On-Screen Write Error & Toast Notification Banner */}
      <ToastNotifier />

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
