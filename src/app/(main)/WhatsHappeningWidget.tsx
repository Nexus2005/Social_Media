"use client";

import React from "react";
import Link from "next/link";
import { Search } from "lucide-react";

interface TrendingTopic {
  hashtag: string;
  postsCount: string;
  category: string;
}

const trendingTopics: TrendingTopic[] = [
  { hashtag: "#SummerFits", postsCount: "18.7K posts", category: "Fashion • Trending" },
  { hashtag: "#SneakerDrop", postsCount: "9,342 posts", category: "Sneakers • Brand Hub" },
  { hashtag: "#MinimalHome", postsCount: "4,812 posts", category: "Decor • Spotlight" },
];

export default function WhatsHappeningWidget() {
  return (
    <div className="glass-card rounded-[28px] p-5 shadow-premium-md select-none border border-zinc-250/20 dark:border-zinc-800/30 hover:scale-[1.01] hover:shadow-premium-lg transition-all duration-300 flex flex-col gap-4 relative overflow-hidden">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-black text-foreground tracking-wider uppercase">
          What's happening
        </span>
        <Link
          href="/search"
          className="text-[11.5px] font-extrabold text-indigo-500 hover:text-indigo-650 dark:hover:text-indigo-400 transition-colors"
        >
          View all
        </Link>
      </div>

      {/* Main Live Card Feature */}
      <Link
        href="/search?q=tech+launch+2026"
        className="group relative flex items-center gap-3.5 bg-zinc-50/50 dark:bg-zinc-950/20 border border-zinc-200/30 dark:border-zinc-800/35 rounded-2xl p-3 transition-all hover:bg-zinc-100/50 dark:hover:bg-zinc-900/40 hover:-translate-y-0.5 shadow-premium-sm"
      >
        <div className="relative size-14 rounded-xl overflow-hidden bg-zinc-800 shrink-0 shadow-sm border border-zinc-200/10 dark:border-zinc-800/10">
          <img
            src="/tech-launch-mock.jpg"
            alt="Tech Launch 2026"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=200&auto=format&fit=crop";
            }}
          />
          <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[12.5px] font-black text-foreground truncate">
              Tech Launch 2026
            </span>
            <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-indigo-600 text-white uppercase tracking-wider shrink-0 shadow-sm animate-pulse">
              Live
            </span>
          </div>
          <span className="text-[10.5px] text-muted-foreground mt-0.5 truncate leading-tight">
            The future of gadgets is here
          </span>
          <span className="text-[9px] font-bold text-indigo-500 dark:text-indigo-400 mt-1 leading-none">
            12.4K posts
          </span>
        </div>
      </Link>

      {/* Hashtag List */}
      <div className="flex flex-col gap-1.5">
        {trendingTopics.map((topic, idx) => (
          <Link
            key={idx}
            href={`/hashtag/${topic.hashtag.replace("#", "")}`}
            className="flex items-center justify-between p-2.5 rounded-xl hover:bg-zinc-100/50 dark:hover:bg-zinc-900/40 hover:-translate-y-0.5 border border-transparent hover:border-zinc-200/20 dark:hover:border-zinc-800/20 transition-all shadow-none hover:shadow-premium-sm"
          >
            <div className="flex flex-col text-start min-w-0">
              <span className="text-[9.5px] font-bold text-muted-foreground/80 leading-none">
                {topic.category}
              </span>
              <span className="text-[12.5px] font-black text-foreground truncate mt-1">
                {topic.hashtag}
              </span>
              <span className="text-[9.5px] font-medium text-muted-foreground mt-0.5 leading-none">
                {topic.postsCount}
              </span>
            </div>
            <div className="size-8 rounded-xl bg-zinc-50/50 dark:bg-zinc-950/40 border border-zinc-200/30 dark:border-zinc-800/30 flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0 transition-colors">
              <Search className="size-3.5" />
            </div>
          </Link>
        ))}
      </div>

      {/* Show more button */}
      <Link
        href="/search"
        className="text-[12px] font-black text-indigo-555 hover:text-indigo-650 dark:text-indigo-400 dark:hover:text-indigo-350 transition-colors w-max px-1 pt-1"
      >
        Show more
      </Link>
    </div>
  );
}
