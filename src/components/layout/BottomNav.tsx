"use client";

import React from "react";
import { useD2LStore } from "@/store/useD2LStore";
import {
  Activity,
  ListOrdered,
  FileSpreadsheet,
  Trophy,
  Users,
  CalendarDays,
  Settings,
} from "lucide-react";

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const { currentStaff } = useD2LStore();

  const allTabs = [
    { id: "tracker", label: "Live", icon: Activity, minRole: "staff" },
    { id: "game-log", label: "Log", icon: ListOrdered, minRole: "staff" },
    { id: "box-score", label: "Box", icon: FileSpreadsheet, minRole: "staff" },
    { id: "teams", label: "Standings", icon: Trophy, minRole: "admin" },
    { id: "players", label: "Players", icon: Users, minRole: "admin" },
    { id: "schedule", label: "Schedule", icon: CalendarDays, minRole: "admin" },
    { id: "setup", label: "Setup", icon: Settings, minRole: "admin" },
  ];

  const visibleTabs = allTabs.filter((tab) => {
    if (tab.minRole === "staff") return true;
    return currentStaff.role === "admin";
  });

  const gridColsClass =
    visibleTabs.length === 3 ? "grid-cols-3" : "grid-cols-7";

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-d2l-panelDark/95 backdrop-blur border-t border-d2l-forestLight/60 shadow-2xl safe-area-bottom">
      <div className={`grid ${gridColsClass} h-14`}>
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center gap-0.5 transition ${
                isActive
                  ? "text-d2l-orange font-bold bg-d2l-forest/40 border-t-2 border-d2l-orange"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-d2l-orange scale-110" : ""}`} />
              <span className="text-[9px] leading-none tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
