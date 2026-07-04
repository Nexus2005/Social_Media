"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SportMatch {
  sport: string;
  status: string;
  teamA: { name: string; score: string; overs?: string; logo: string; color: string };
  teamB: { name: string; score: string; overs?: string; logo: string; color: string };
  venue: string;
  summary: string;
}

const liveMatches: SportMatch[] = [
  {
    sport: "Cricket",
    status: "Live • ICC T20 Final",
    teamA: { name: "India", score: "184/3", overs: "17.4 Overs", logo: "🇮🇳", color: "bg-blue-600/20" },
    teamB: { name: "Australia", score: "Yet to Bat", logo: "🇦🇺", color: "bg-yellow-500/20" },
    venue: "Kensington Oval, Barbados",
    summary: "IND chose to bat. Kohli 76* (48), Rohit 34 (18).",
  },
  {
    sport: "Football",
    status: "Live • 84th Min",
    teamA: { name: "Real Madrid", score: "3", logo: "👑", color: "bg-zinc-200/20" },
    teamB: { name: "Barcelona", score: "2", logo: "🔵", color: "bg-blue-600/20" },
    venue: "Santiago Bernabéu, Madrid",
    summary: "Vinícius Jr. 14' 72', Mbappé 54' | Lewandowski 31' Raphinha 66'",
  },
  {
    sport: "Basketball",
    status: "Live • Q4 2:15",
    teamA: { name: "LA Lakers", score: "108", logo: "🏀", color: "bg-yellow-600/20" },
    teamB: { name: "Boston Celtics", score: "111", logo: "☘️", color: "bg-emerald-600/20" },
    venue: "Crypto.com Arena, Los Angeles",
    summary: "James 28 pts, Davis 14 reb | Tatum 32 pts, Brown 24 pts.",
  }
];

export default function LiveScoresWidget() {
  const [matchIndex, setMatchIndex] = useState(0);
  const currentMatch = liveMatches[matchIndex];

  const handlePrev = () => {
    setMatchIndex((prev) => (prev === 0 ? liveMatches.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setMatchIndex((prev) => (prev === liveMatches.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="p-4.5 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/80 bg-[#ffffff]/60 dark:bg-[#0c0d14]/40 backdrop-blur-md shadow-sm select-none flex flex-col gap-3">
      {/* Title + Toggle Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[14px] font-black text-foreground tracking-wide uppercase">
            Live Scores
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrev}
            className="size-7 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-muted-foreground flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            onClick={handleNext}
            className="size-7 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-muted-foreground flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* Main Scoreboard layout */}
      <AnimatePresence mode="wait">
        <motion.div
          key={matchIndex}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.15 }}
          className="flex flex-col gap-2.5"
        >
          {/* Subheader Match details */}
          <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground/80">
            <span>{currentMatch.sport}</span>
            <span className="text-red-500 dark:text-red-400 font-bold">{currentMatch.status}</span>
          </div>

          {/* Scores comparison */}
          <div className="grid grid-cols-2 gap-3 bg-zinc-50/50 dark:bg-zinc-950/30 border border-zinc-200/20 dark:border-zinc-800/30 rounded-2xl p-3.5">
            {/* Team A */}
            <div className="flex flex-col items-center gap-1 text-center min-w-0">
              <div className={`size-12 rounded-full ${currentMatch.teamA.color} border border-zinc-200/50 dark:border-zinc-800/50 flex items-center justify-center text-2xl shadow-sm shrink-0`}>
                {currentMatch.teamA.logo}
              </div>
              <span className="text-[12px] font-black text-foreground truncate w-full mt-1">
                {currentMatch.teamA.name}
              </span>
              <span className="text-sm font-extrabold text-foreground">
                {currentMatch.teamA.score}
              </span>
              {currentMatch.teamA.overs && (
                <span className="text-[10px] text-muted-foreground">
                  {currentMatch.teamA.overs}
                </span>
              )}
            </div>

            {/* Team B */}
            <div className="flex flex-col items-center gap-1 text-center min-w-0">
              <div className={`size-12 rounded-full ${currentMatch.teamB.color} border border-zinc-200/50 dark:border-zinc-800/50 flex items-center justify-center text-2xl shadow-sm shrink-0`}>
                {currentMatch.teamB.logo}
              </div>
              <span className="text-[12px] font-black text-foreground truncate w-full mt-1">
                {currentMatch.teamB.name}
              </span>
              <span className="text-sm font-extrabold text-foreground">
                {currentMatch.teamB.score}
              </span>
              {currentMatch.teamB.overs && (
                <span className="text-[10px] text-muted-foreground">
                  {currentMatch.teamB.overs}
                </span>
              )}
            </div>
          </div>

          {/* Match summary description text */}
          <div className="text-[11px] text-muted-foreground leading-snug px-1 border-l-2 border-indigo-500/50">
            <span className="font-bold text-foreground">Venue: </span>{currentMatch.venue}
            <div className="mt-0.5 truncate">{currentMatch.summary}</div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
