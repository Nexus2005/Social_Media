"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Search, Trophy, Calendar } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "./ui/use-toast";
import { cn } from "@/lib/utils";

interface HashtagItem {
  hashtag: string;
  count: number;
}

interface TrendingAndSportsCardProps {
  hashtags: HashtagItem[];
}

interface Team {
  name: string;
  flagClass: string;
  score: string;
  overs: string;
}

interface SportMatch {
  matchMeta: string;
  statusText: string;
  teams: Team[];
}

const SPORTS_DATA: Record<string, SportMatch> = {
  cricket: {
    matchMeta: "3RD ODI : PAK TOUR OF IND, 2026",
    statusText: "IND NEEDS 131 RUNS TO WIN",
    teams: [
      {
        name: "PAK",
        flagClass: "flag-pak",
        score: "250-10",
        overs: "(50)",
      },
      {
        name: "IND",
        flagClass: "flag-ind",
        score: "120-1",
        overs: "(20.2)",
      },
    ],
  },
  football: {
    matchMeta: "CHAMPIONS LEAGUE : SEMI-FINAL",
    statusText: "REAL MADRID LEADS 4-3 ON AGGREGATE",
    teams: [
      {
        name: "RMA",
        flagClass: "flag-rma",
        score: "2",
        overs: "",
      },
      {
        name: "BAR",
        flagClass: "flag-bar",
        score: "1",
        overs: "78'",
      },
    ],
  },
};

const DEFAULT_HASHTAGS = [
  { hashtag: "#SummerFits", count: 18700 },
  { hashtag: "#SneakerDrop", count: 9342 },
  { hashtag: "#MinimalHome", count: 4812 },
];

// High fidelity micro India flag component
function IndiaFlag() {
  return (
    <div className="india-flag-canvas">
      <div className="india-flag-stripe saffron" />
      <div className="india-flag-stripe white">
        <svg className="india-flag-chakra" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="#000080" strokeWidth="2" />
          <circle cx="60" cy="60" r="10" fill="#000080" />
          <g stroke="#000080" strokeWidth="2.5">
            <line x1="60" y1="6" x2="60" y2="114" />
            <line x1="6" y1="60" x2="114" y2="60" />
            <line x1="21.8" y1="21.8" x2="98.2" y2="98.2" />
            <line x1="21.8" y1="98.2" x2="98.2" y2="21.8" />
            <g transform="rotate(15 60 60)"><line x1="60" y1="6" x2="60" y2="114" /><line x1="6" y1="60" x2="114" y2="60" /></g>
            <g transform="rotate(30 60 60)"><line x1="60" y1="6" x2="60" y2="114" /><line x1="6" y1="60" x2="114" y2="60" /></g>
            <g transform="rotate(45 60 60)"><line x1="60" y1="6" x2="60" y2="114" /><line x1="6" y1="60" x2="114" y2="60" /></g>
            <g transform="rotate(60 60 60)"><line x1="60" y1="6" x2="60" y2="114" /><line x1="6" y1="60" x2="114" y2="60" /></g>
            <g transform="rotate(75 60 60)"><line x1="60" y1="6" x2="60" y2="114" /><line x1="6" y1="60" x2="114" y2="60" /></g>
          </g>
          <circle cx="60" cy="60" r="57" fill="none" stroke="#000080" strokeWidth="1.5" />
        </svg>
      </div>
      <div className="india-flag-stripe green" />
      <div className="micro-mesh-distortion" />
      <div className="micro-lens-overlay" />
    </div>
  );
}

// High fidelity micro Pakistan flag component
function PakistanFlag() {
  return (
    <div className="pakistan-flag-canvas">
      <div className="pakistan-hoist-stripe" />
      <div className="pakistan-fly-field">
        <svg viewBox="0 0 100 100" className="w-2.5 h-2.5 fill-white rotate-[-45deg] shrink-0">
          <path d="M 50 10 A 40 40 0 1 0 90 50 A 30 30 0 1 1 50 10 Z" />
          <polygon points="75,25 78,33 87,33 80,38 82,47 75,42 68,47 70,38 63,33 72,33" />
        </svg>
      </div>
      <div className="micro-lighting-overlay" />
    </div>
  );
}

export default function TrendingAndSportsCard({ hashtags }: TrendingAndSportsCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [activeSport, setActiveSport] = useState<"cricket" | "football">("cricket");

  const match = SPORTS_DATA[activeSport];

  // Merge dynamic tags with fallbacks to ensure 3 tags are always displayed
  const displayHashtags = [...hashtags];
  if (displayHashtags.length < 3) {
    const missingCount = 3 - displayHashtags.length;
    for (let i = 0; i < missingCount; i++) {
      const fallback = DEFAULT_HASHTAGS.find(
        (def) => !displayHashtags.some((h) => h.hashtag.toLowerCase() === def.hashtag.toLowerCase())
      );
      if (fallback) {
        displayHashtags.push(fallback);
      } else {
        displayHashtags.push(DEFAULT_HASHTAGS[i]);
      }
    }
  }

  const toggleSport = () => {
    setActiveSport((prev) => (prev === "cricket" ? "football" : "cricket"));
  };

  const handleTabClick = (tabType: string) => {
    toast({
      description: `${activeSport.toUpperCase()} ${tabType} view will be loaded shortly.`,
    });
  };

  const formatCount = (count: number) => {
    if (count >= 1000) {
      return (count / 1000).toFixed(1).replace(/\.0$/, "") + "K posts";
    }
    return `${count} posts`;
  };

  return (
    <div className="monolith-card uiverse-neumorphic-card w-full relative overflow-hidden transition-all duration-300">
      {/* Texture overlay for machined metal premium effect */}
      <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.01)_3px)] pointer-events-none z-10" />

      {/* SECTION 1: Sports Scorecard (Compact Height) */}
      <div className="p-4 pb-2.5 relative z-10">
        {/* Header Block with Sport Toggle Arrows */}
        <div className="flex justify-between items-center mb-2.5">
          <div className="flex items-center gap-1">
            <button
              onClick={toggleSport}
              className="h-5 w-5 flex items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
              title="Previous Sport"
            >
              <ChevronLeft className="size-3.5" />
            </button>
            <span className="text-[9px] font-extrabold tracking-widest uppercase text-muted-foreground select-none">
              {activeSport} Match
            </span>
            <button
              onClick={toggleSport}
              className="h-5 w-5 flex items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
              title="Next Sport"
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-1 bg-red-600 dark:bg-red-500 text-white px-1.5 py-0.5 rounded-full text-[8px] font-extrabold tracking-wide shadow-[0_2px_8px_rgba(239,68,68,0.3)] animate-pulse select-none">
            <span className="inline-block size-1 bg-white rounded-full" />
            LIVE
          </div>
        </div>

        {/* Scorecard block */}
        <div className="space-y-2">
          <div className="text-[9px] font-bold text-muted-foreground tracking-wide truncate uppercase">
            {match.matchMeta}
          </div>

          {match.teams.map((team, idx) => (
            <div key={idx} className="flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                {/* Dynamically render high-fidelity custom flags for India and Pakistan */}
                {team.flagClass === "flag-ind" ? (
                  <IndiaFlag />
                ) : team.flagClass === "flag-pak" ? (
                  <PakistanFlag />
                ) : (
                  <div className={cn("flag shrink-0", team.flagClass)} />
                )}
                <span className="font-extrabold text-[13px] tracking-tight text-foreground">
                  {team.name}
                </span>
              </div>
              <div className="text-right font-mono">
                <span className="text-[15px] font-bold text-foreground">
                  {team.score}
                </span>
                {team.overs && (
                  <span className="text-[11px] text-muted-foreground font-medium ml-1">
                    {team.overs}
                  </span>
                )}
              </div>
            </div>
          ))}

          <div className="h-[1px] bg-gradient-to-r from-transparent via-black/10 dark:via-white/10 to-transparent my-1.5" />

          <div className="text-[10px] font-bold text-center text-muted-foreground tracking-wide uppercase pb-1.5">
            {match.statusText}
          </div>
        </div>
      </div>

      {/* SECTION 2: Neumorphic Tabs in the middle */}
      <div className="flex border-t border-b border-black/10 dark:border-white/5 bg-black/[0.01] dark:bg-black/15 relative z-20">
        <button
          onClick={() => handleTabClick("schedule")}
          className="flex-1 py-2.5 text-center text-[9px] font-extrabold tracking-widest uppercase text-muted-foreground hover:text-foreground hover:bg-black/[0.03] dark:hover:bg-white/[0.01] border-r border-black/10 dark:border-white/5 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-center gap-1">
            <Calendar className="size-3" />
            Schedule
          </div>
        </button>
        <button
          onClick={() => handleTabClick("points table")}
          className="flex-1 py-2.5 text-center text-[9px] font-extrabold tracking-widest uppercase text-muted-foreground hover:text-foreground hover:bg-black/[0.03] dark:hover:bg-white/[0.01] transition-all cursor-pointer"
        >
          <div className="flex items-center justify-center gap-1">
            <Trophy className="size-3" />
            Points Table
          </div>
        </button>
      </div>

      {/* SECTION 3: "What's Happening" (Trending Hashtags) at the bottom */}
      <div className="p-4 pt-3.5 relative z-10 space-y-3 text-start">
        <div className="flex justify-between items-center">
          <span className="text-[12px] font-black tracking-tight text-foreground uppercase">
            What&apos;s happening
          </span>
          <Link
            href="/search"
            className="text-[10px] font-bold text-indigo-500 hover:text-indigo-400 transition-colors"
          >
            View all
          </Link>
        </div>

        <div className="space-y-2 mt-1">
          {displayHashtags.map((item, idx) => (
            <div
              key={idx}
              onClick={() => router.push(`/search?q=${encodeURIComponent(item.hashtag)}`)}
              className="group flex justify-between items-start cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] -mx-2 px-2 py-1 rounded-lg transition-all"
            >
              <div className="flex flex-col min-w-0">
                <span className="text-[12.5px] font-bold text-foreground group-hover:text-indigo-500 transition-colors truncate">
                  {item.hashtag}
                </span>
                <span className="text-[9.5px] text-muted-foreground mt-0.5">
                  {formatCount(item.count)}
                </span>
              </div>
              <div className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <Search className="size-3 text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>

        <Link
          href="/search"
          className="block text-[10px] font-bold text-indigo-500 hover:text-indigo-400 transition-colors mt-1.5 pl-1"
        >
          Show more
        </Link>
      </div>
    </div>
  );
}
