"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, BarChart2, MessageSquare, Share2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CricketStats {
  runRate: string;
  reqRunRate: string;
  wickets: number;
  boundaries: string;
  winProbA: number; // percentage
  winProbB: number; // percentage
}

interface SportMatch {
  sport: string;
  league: string;
  status: string;
  venue: string;
  summary: string;
  teamA: { name: string; score: string; overs?: string; logo: string; color: string; short: string };
  teamB: { name: string; score: string; overs?: string; logo: string; color: string; short: string };
  stats?: CricketStats;
}

const liveMatches: SportMatch[] = [
  {
    sport: "Cricket",
    league: "ICC T20 World Cup Final",
    status: "LIVE NOW • 2nd Innings",
    venue: "Kensington Oval, Barbados",
    summary: "IND chose to bat. Kohli 76 (50), Axar Patel 47 (31).",
    teamA: { name: "India", score: "184/3", overs: "17.4 Overs", logo: "🇮🇳", color: "from-blue-600/10 to-indigo-600/20", short: "IND" },
    teamB: { name: "Australia", score: "Yet to Bat", logo: "🇦🇺", color: "from-yellow-500/10 to-amber-500/20", short: "AUS" },
    stats: {
      runRate: "10.57",
      reqRunRate: "8.24",
      wickets: 3,
      boundaries: "18x4, 8x6",
      winProbA: 68,
      winProbB: 32
    }
  },
  {
    sport: "Football",
    league: "La Liga • El Clásico",
    status: "LIVE NOW • 84th Min",
    venue: "Santiago Bernabéu, Madrid",
    summary: "Vinícius Jr. 14' 72', Mbappé 54' | Lewandowski 31' Raphinha 66'",
    teamA: { name: "Real Madrid", score: "3", logo: "👑", color: "from-zinc-250/20 to-zinc-300/30", short: "RMA" },
    teamB: { name: "Barcelona", score: "2", logo: "🔵", color: "from-blue-600/10 to-red-650/20", short: "BAR" },
    stats: {
      runRate: "1.25 XG",
      reqRunRate: "0.85 XG",
      wickets: 0,
      boundaries: "Shots: 12 vs 8",
      winProbA: 78,
      winProbB: 22
    }
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
    <div className="glass-card rounded-[28px] p-5 shadow-premium-md select-none border border-zinc-250/20 dark:border-zinc-800/30 hover:scale-[1.01] hover:shadow-premium-lg transition-all duration-300 flex flex-col gap-4 relative overflow-hidden group/live">
      
      {/* Subtle top ambient glow for the match card */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-red-500 via-indigo-500 to-purple-600 opacity-60" />

      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="flex h-2 w-2 rounded-full bg-red-500 animate-ping" />
          <span className="text-[11.5px] font-black text-red-500 tracking-wider uppercase flex items-center gap-1">
            LIVE NOW <span className="text-[10px] text-muted-foreground/60">•</span> {currentMatch.league}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handlePrev}
            className="size-6.5 rounded-lg hover:bg-zinc-100/80 dark:hover:bg-zinc-900/80 text-muted-foreground hover:text-foreground flex items-center justify-center transition-all cursor-pointer"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <button
            onClick={handleNext}
            className="size-6.5 rounded-lg hover:bg-zinc-100/80 dark:hover:bg-zinc-900/80 text-muted-foreground hover:text-foreground flex items-center justify-center transition-all cursor-pointer"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Team score comparison area */}
      <AnimatePresence mode="wait">
        <motion.div
          key={matchIndex}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col gap-3.5"
        >
          {/* Main Teams Box */}
          <div className="flex flex-col gap-3">
            {/* Team A Row */}
            <div className="flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/30 border border-zinc-200/20 dark:border-zinc-800/20 rounded-2xl p-3 hover:bg-zinc-100/40 dark:hover:bg-zinc-900/40 transition-colors">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-2xl shrink-0">{currentMatch.teamA.logo}</span>
                <div className="flex flex-col min-w-0">
                  <span className="text-[13px] font-extrabold text-foreground truncate">
                    {currentMatch.teamA.name}
                  </span>
                  {currentMatch.teamA.overs && (
                    <span className="text-[10px] text-muted-foreground/80 font-medium">
                      {currentMatch.teamA.overs}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-[15px] font-black text-foreground shrink-0 font-mono">
                {currentMatch.teamA.score}
              </span>
            </div>

            {/* Team B Row */}
            <div className="flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-950/30 border border-zinc-200/20 dark:border-zinc-800/20 rounded-2xl p-3 hover:bg-zinc-100/40 dark:hover:bg-zinc-900/40 transition-colors">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-2xl shrink-0">{currentMatch.teamB.logo}</span>
                <div className="flex flex-col min-w-0">
                  <span className="text-[13px] font-extrabold text-foreground truncate">
                    {currentMatch.teamB.name}
                  </span>
                  {currentMatch.teamB.overs && (
                    <span className="text-[10px] text-muted-foreground/80 font-medium">
                      {currentMatch.teamB.overs}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-[15px] font-black text-foreground shrink-0 font-mono">
                {currentMatch.teamB.score}
              </span>
            </div>
          </div>

          {/* Advanced Stats details block (Cricket Specific) */}
          {currentMatch.stats && (
            <div className="flex flex-col gap-2.5 bg-zinc-50/30 dark:bg-zinc-950/15 border border-zinc-200/10 dark:border-zinc-800/10 rounded-2xl p-3.5 select-none">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Run Rate</span>
                  <span className="text-[14px] font-black text-foreground">{currentMatch.stats.runRate}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Required RR</span>
                  <span className="text-[14px] font-black text-foreground">{currentMatch.stats.reqRunRate}</span>
                </div>
              </div>

              {/* Custom Timeline or Detail */}
              <div className="flex justify-between items-center text-[10px] font-semibold text-muted-foreground/80 border-t border-zinc-200/20 dark:border-zinc-800/20 pt-2 px-1">
                <span>Wickets: {currentMatch.stats.wickets}</span>
                <span>Boundaries: {currentMatch.stats.boundaries}</span>
              </div>

              {/* Win Probability Bar */}
              <div className="flex flex-col gap-1.5 border-t border-zinc-200/20 dark:border-zinc-800/20 pt-2">
                <div className="flex items-center justify-between text-[9.5px] font-extrabold text-foreground uppercase tracking-wider px-0.5">
                  <span>{currentMatch.teamA.short} ({currentMatch.stats.winProbA}%)</span>
                  <span>{currentMatch.teamB.short} ({currentMatch.stats.winProbB}%)</span>
                </div>
                {/* Horizontal win bar progress container */}
                <div className="h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-900 overflow-hidden flex shadow-inner">
                  <div
                    style={{ width: `${currentMatch.stats.winProbA}%` }}
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-l-full shadow-sm"
                  />
                  <div
                    style={{ width: `${currentMatch.stats.winProbB}%` }}
                    className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 rounded-r-full shadow-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Venue & Summary description info */}
          <div className="flex flex-col gap-1 text-[11px] leading-snug px-1.5">
            <span className="text-[10.5px] font-medium text-muted-foreground">
              📍 {currentMatch.venue}
            </span>
            <p className="text-foreground/90 font-medium italic mt-0.5">
              "{currentMatch.summary}"
            </p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Quick Action Pill Buttons at the bottom */}
      <div className="grid grid-cols-3 gap-2 border-t border-zinc-200/20 dark:border-zinc-800/35 pt-3.5 z-10 relative">
        <button className="py-2.5 rounded-xl border border-zinc-200/50 dark:border-zinc-800/60 bg-white/40 dark:bg-zinc-900/30 text-[10.5px] font-black text-foreground hover:bg-zinc-50 dark:hover:bg-zinc-900/60 active:scale-[0.97] transition-all flex items-center justify-center gap-1 shadow-premium-sm cursor-pointer">
          <BarChart2 className="size-3.5 text-indigo-500" />
          <span>Stats</span>
        </button>
        <button className="py-2.5 rounded-xl border border-zinc-200/50 dark:border-zinc-800/60 bg-white/40 dark:bg-zinc-900/30 text-[10.5px] font-black text-foreground hover:bg-zinc-50 dark:hover:bg-zinc-900/60 active:scale-[0.97] transition-all flex items-center justify-center gap-1 shadow-premium-sm cursor-pointer">
          <MessageSquare className="size-3.5 text-indigo-500" />
          <span>Discuss</span>
        </button>
        <button className="py-2.5 rounded-xl border border-zinc-200/50 dark:border-zinc-800/60 bg-white/40 dark:bg-zinc-900/30 text-[10.5px] font-black text-foreground hover:bg-zinc-50 dark:hover:bg-zinc-900/60 active:scale-[0.97] transition-all flex items-center justify-center gap-1 shadow-premium-sm cursor-pointer">
          <Share2 className="size-3.5 text-indigo-500" />
          <span>Share</span>
        </button>
      </div>

    </div>
  );
}
