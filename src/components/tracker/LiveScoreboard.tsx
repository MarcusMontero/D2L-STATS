"use client";

import React, { useEffect, useState } from "react";
import { useD2LStore } from "@/store/useD2LStore";
import { Play, Pause, Clock } from "lucide-react";
import { Quarter } from "@/lib/types";
import { TeamLogo } from "@/components/common/TeamLogo";

export const LiveScoreboard: React.FC = () => {
  const {
    getActiveGame,
    getGameTeams,
    toggleClock,
    adjustClockSeconds,
    setClockSeconds,
    setGameQuarter,
    setGameStatus,
    setPossession,
    adjustTimeouts,
  } = useD2LStore();

  const game = getActiveGame();
  const { homeTeam, awayTeam } = getGameTeams();

  const [isEditingClock, setIsEditingClock] = useState(false);
  const [customMin, setCustomMin] = useState("10");
  const [customSec, setCustomSec] = useState("00");

  // Timer interval hook when clock is running
  useEffect(() => {
    if (!game || !game.isClockRunning || game.timeRemainingSeconds <= 0) return;

    const interval = setInterval(() => {
      const current = useD2LStore.getState().getActiveGame();
      if (current && current.isClockRunning && current.timeRemainingSeconds > 0) {
        useD2LStore.getState().adjustClockSeconds(-1);
      } else if (current && current.timeRemainingSeconds <= 0 && current.isClockRunning) {
        useD2LStore.getState().setClockRunning(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [game?.isClockRunning, game?.timeRemainingSeconds]);

  if (!game || !homeTeam || !awayTeam) {
    return <div className="p-4 text-center text-gray-400">Loading game scoreboard...</div>;
  }

  // Format seconds to mm:ss
  const minutes = Math.floor(game.timeRemainingSeconds / 60);
  const seconds = game.timeRemainingSeconds % 60;
  const formattedTime = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  const quarters: Quarter[] = ["Q1", "Q2", "Q3", "Q4", "OT1"];

  const handleCustomClockSave = () => {
    const mins = parseInt(customMin, 10) || 0;
    const secs = parseInt(customSec, 10) || 0;
    setClockSeconds(mins * 60 + secs);
    setIsEditingClock(false);
  };

  return (
    <div className="bg-gradient-to-b from-d2l-court via-d2l-panelDark to-d2l-dark rounded-xl border-2 border-d2l-forestLight/80 shadow-2xl p-2.5 sm:p-4 text-white">
      {/* Top Meta Bar: Status, Location, Possession */}
      <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-d2l-borderDark text-[11px] text-gray-300">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-d2l-gold">{game.season}</span>
          <span>•</span>
          <span className="truncate hidden sm:inline text-gray-400">{game.venue}</span>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-1.5">
          <select
            value={game.status}
            onChange={(e) => setGameStatus(e.target.value as any)}
            className={`text-xs font-bold px-2 py-0.5 rounded cursor-pointer border uppercase ${
              game.status === "live"
                ? "bg-d2l-orange/20 text-d2l-orange border-d2l-orange animate-pulse"
                : game.status === "final"
                ? "bg-gray-800 text-gray-300 border-gray-600"
                : "bg-emerald-900/40 text-emerald-300 border-emerald-600"
            }`}
          >
            <option value="scheduled">Scheduled</option>
            <option value="live">● LIVE</option>
            <option value="halftime">Halftime</option>
            <option value="final">Final</option>
          </select>
        </div>
      </div>

      {/* Main Scoreboard Display */}
      <div className="grid grid-cols-12 gap-2 sm:gap-4 items-center">
        {/* HOME TEAM (Left - cols 4 or 5) */}
        <div className="col-span-4 sm:col-span-4 flex flex-col items-center sm:items-start text-center sm:text-left">
          <div className="flex items-center gap-2">
            <TeamLogo logo={homeTeam.logo} name={homeTeam.name} size="lg" />
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="font-athletic font-extrabold text-lg sm:text-2xl text-white tracking-wider leading-none">
                  {homeTeam.shortName}
                </h2>
                {game.possession === "home" && (
                  <span className="bg-d2l-orange text-white text-[9px] font-black px-1 rounded animate-pulse">
                    POSS
                  </span>
                )}
              </div>
              <p className="text-[10px] text-gray-400 font-medium hidden sm:block truncate max-w-[140px]">
                {homeTeam.name}
              </p>
            </div>
          </div>

          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-athletic font-black text-4xl sm:text-6xl text-white tracking-tight leading-none drop-shadow-md">
              {game.homeScore}
            </span>
          </div>

          {/* Home Fouls & Timeouts */}
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px]">
            <div className="flex items-center gap-1 bg-d2l-forest/80 px-2 py-0.5 rounded border border-d2l-borderDark">
              <span className="text-gray-300">Fouls:</span>
              <span
                className={`font-mono font-bold text-xs ${
                  game.homeFouls >= 5 ? "text-red-400 font-black" : "text-white"
                }`}
              >
                {game.homeFouls}
              </span>
              {game.homeFouls >= 5 && (
                <span className="bg-red-600 text-white text-[8px] font-bold px-1 rounded">BONUS</span>
              )}
            </div>

            <div className="flex items-center gap-1 bg-d2l-cardDark px-2 py-0.5 rounded border border-d2l-borderDark">
              <span className="text-gray-400">TO:</span>
              <div className="flex gap-1">
                {[...Array(4)].map((_, i) => (
                  <span
                    key={i}
                    onClick={() => adjustTimeouts("home", i < game.homeTimeouts ? -1 : 1)}
                    className={`w-2 h-2 rounded-full cursor-pointer transition ${
                      i < game.homeTimeouts ? "bg-d2l-gold" : "bg-gray-700"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* CENTER CONTROLS (Clock & Quarter - cols 4) */}
        <div className="col-span-4 sm:col-span-4 flex flex-col items-center justify-center">
          {/* Quarter Pills */}
          <div className="flex items-center gap-1 mb-1">
            {quarters.map((q) => {
              const isCurrent = game.quarter === q;
              return (
                <button
                  key={q}
                  onClick={() => setGameQuarter(q)}
                  className={`px-1.5 sm:px-2 py-0.5 rounded text-[10px] font-bold font-athletic transition ${
                    isCurrent
                      ? "bg-d2l-gold text-black shadow font-black"
                      : "bg-d2l-forest/60 text-gray-400 hover:text-white"
                  }`}
                >
                  {q}
                </button>
              );
            })}
          </div>

          {/* Large Digital Clock */}
          <div className="relative group">
            <div
              onClick={() => setIsEditingClock(true)}
              title="Click to edit clock time"
              className={`digital-clock text-3xl sm:text-5xl font-black px-3 py-1 rounded-lg tracking-widest cursor-pointer transition select-none ${
                game.isClockRunning
                  ? "text-d2l-orange bg-black/60 border border-d2l-orange/50 shadow-lg shadow-orange-500/10 animate-pulse"
                  : "text-d2l-goldLight bg-black/40 border border-d2l-forestLight hover:border-d2l-gold/60"
              }`}
            >
              {formattedTime}
            </div>
          </div>

          {/* Clock Control Buttons */}
          <div className="mt-1.5 flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => adjustClockSeconds(-10)}
              title="-10 Seconds"
              className="px-1.5 py-1 rounded bg-d2l-forest hover:bg-d2l-forestLight border border-d2l-borderDark text-[10px] font-mono font-bold"
            >
              -10s
            </button>

            {/* Play/Pause Button */}
            <button
              onClick={toggleClock}
              className={`px-3 sm:px-5 py-1.5 rounded-lg flex items-center gap-1.5 font-athletic font-bold text-xs sm:text-sm tracking-wider uppercase transition shadow-md ${
                game.isClockRunning
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : "bg-d2l-orange hover:bg-d2l-orangeHover text-white orange-glow"
              }`}
            >
              {game.isClockRunning ? (
                <>
                  <Pause className="w-4 h-4 fill-white" />
                  <span>Stop</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Start</span>
                </>
              )}
            </button>

            <button
              onClick={() => adjustClockSeconds(10)}
              title="+10 Seconds"
              className="px-1.5 py-1 rounded bg-d2l-forest hover:bg-d2l-forestLight border border-d2l-borderDark text-[10px] font-mono font-bold"
            >
              +10s
            </button>
          </div>

          {/* Possession Arrow Toggle */}
          <div className="mt-2 flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-full border border-d2l-borderDark text-[9px]">
            <span className="text-gray-400 uppercase tracking-tight">Possession:</span>
            <button
              onClick={() => setPossession("home")}
              className={`px-1.5 rounded font-bold transition ${
                game.possession === "home" ? "bg-d2l-orange text-white" : "text-gray-400"
              }`}
            >
              ◀ {homeTeam.shortName}
            </button>
            <button
              onClick={() => setPossession("away")}
              className={`px-1.5 rounded font-bold transition ${
                game.possession === "away" ? "bg-d2l-orange text-white" : "text-gray-400"
              }`}
            >
              {awayTeam.shortName} ▶
            </button>
          </div>
        </div>

        {/* AWAY TEAM (Right - cols 4) */}
        <div className="col-span-4 sm:col-span-4 flex flex-col items-center sm:items-end text-center sm:text-right">
          <div className="flex items-center gap-2 flex-row-reverse sm:flex-row">
            <div className="text-right">
              <div className="flex items-center justify-end gap-1.5">
                {game.possession === "away" && (
                  <span className="bg-d2l-orange text-white text-[9px] font-black px-1 rounded animate-pulse">
                    POSS
                  </span>
                )}
                <h2 className="font-athletic font-extrabold text-lg sm:text-2xl text-white tracking-wider leading-none">
                  {awayTeam.shortName}
                </h2>
              </div>
              <p className="text-[10px] text-gray-400 font-medium hidden sm:block truncate max-w-[140px]">
                {awayTeam.name}
              </p>
            </div>
            <TeamLogo logo={awayTeam.logo} name={awayTeam.name} size="lg" />
          </div>

          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-athletic font-black text-4xl sm:text-6xl text-white tracking-tight leading-none drop-shadow-md">
              {game.awayScore}
            </span>
          </div>

          {/* Away Fouls & Timeouts */}
          <div className="mt-1.5 flex flex-wrap items-center justify-end gap-2 text-[10px]">
            <div className="flex items-center gap-1 bg-d2l-forest/80 px-2 py-0.5 rounded border border-d2l-borderDark">
              <span className="text-gray-300">Fouls:</span>
              <span
                className={`font-mono font-bold text-xs ${
                  game.awayFouls >= 5 ? "text-red-400 font-black" : "text-white"
                }`}
              >
                {game.awayFouls}
              </span>
              {game.awayFouls >= 5 && (
                <span className="bg-red-600 text-white text-[8px] font-bold px-1 rounded">BONUS</span>
              )}
            </div>

            <div className="flex items-center gap-1 bg-d2l-cardDark px-2 py-0.5 rounded border border-d2l-borderDark">
              <span className="text-gray-400">TO:</span>
              <div className="flex gap-1">
                {[...Array(4)].map((_, i) => (
                  <span
                    key={i}
                    onClick={() => adjustTimeouts("away", i < game.awayTimeouts ? -1 : 1)}
                    className={`w-2 h-2 rounded-full cursor-pointer transition ${
                      i < game.awayTimeouts ? "bg-d2l-gold" : "bg-gray-700"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clock Edit Modal */}
      {isEditingClock && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-d2l-panelDark border border-d2l-gold/50 rounded-xl p-4 max-w-sm w-full shadow-2xl">
            <h3 className="text-sm font-bold text-d2l-gold flex items-center gap-1.5 mb-3">
              <Clock className="w-4 h-4" /> Edit Game Clock
            </h3>
            <div className="flex items-center justify-center gap-2 text-2xl font-mono my-4">
              <input
                type="number"
                min="0"
                max="60"
                value={customMin}
                onChange={(e) => setCustomMin(e.target.value)}
                className="w-16 bg-black border border-d2l-borderDark rounded text-center p-2 text-white font-bold"
              />
              <span>:</span>
              <input
                type="number"
                min="0"
                max="59"
                value={customSec}
                onChange={(e) => setCustomSec(e.target.value)}
                className="w-16 bg-black border border-d2l-borderDark rounded text-center p-2 text-white font-bold"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsEditingClock(false)}
                className="px-3 py-1.5 rounded text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleCustomClockSave}
                className="px-4 py-1.5 rounded bg-d2l-orange text-white text-xs font-bold"
              >
                Set Time
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
