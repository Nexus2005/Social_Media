"use client";

import React from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import Image from "next/image";

interface TrendingTopic {
  hashtag: string;
  postsCount: string;
}

const trendingTopics: TrendingTopic[] = [
  { hashtag: "#SummerFits", postsCount: "18.7K posts" },
  { hashtag: "#SneakerDrop", postsCount: "9,342 posts" },
  { hashtag: "#MinimalHome", postsCount: "4,812 posts" },
];

export default function WhatsHappeningWidget() {
  return (
    <div className="p-4.5 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/80 bg-[#ffffff]/60 dark:bg-[#0c0d14]/40 backdrop-blur-md shadow-sm select-none flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[14px] font-black text-foreground tracking-wide uppercase">
          What's happening
        </span>
        <Link
          href="/search"
          className="text-[12px] font-extrabold text-indigo-500 hover:text-indigo-600 transition-colors"
        >
          View all
        </Link>
      </div>

      {/* Main Live Card Feature */}
      <Link
        href="/search?q=tech+launch+2026"
        className="group relative flex items-center gap-3.5 bg-zinc-50/50 dark:bg-zinc-950/30 border border-zinc-200/20 dark:border-zinc-800/30 rounded-2xl p-2.5 transition-all hover:bg-zinc-100/55 dark:hover:bg-zinc-900/40"
      >
        <div className="relative size-14 rounded-xl overflow-hidden bg-zinc-800 shrink-0 shadow-sm border border-zinc-200/20 dark:border-zinc-800/20">
          <img
            src="/tech-launch-mock.jpg"
            alt="Tech Launch 2026"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              // fallback if image does not exist
              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=200&auto=format&fit=crop";
            }}
          />
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-extrabold text-foreground truncate">
              Tech Launch 2026
            </span>
            <span className="px-1 py-0.5 rounded text-[8px] font-bold bg-indigo-600 text-white uppercase shrink-0">
              Live
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground mt-0.5 truncate leading-tight">
            The future of gadgets is here
          </span>
          <span className="text-[9px] font-semibold text-zinc-400 dark:text-zinc-500 mt-1 leading-none">
            12.4K posts
          </span>
        </div>
      </Link>

      {/* Hashtag List */}
      <div className="flex flex-col gap-2">
        {trendingTopics.map((topic, idx) => (
          <Link
            key={idx}
            href={`/hashtag/${topic.hashtag.replace("#", "")}`}
            className="flex items-center justify-between p-2 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition-colors"
          >
            <div className="flex flex-col text-start min-w-0">
              <span className="text-[12px] font-extrabold text-foreground truncate">
                {topic.hashtag}
              </span>
              <span className="text-[9.5px] text-muted-foreground mt-0.5 leading-none">
                {topic.postsCount}
              </span>
            </div>
            <Search className="size-3.5 text-muted-foreground hover:text-foreground transition-colors shrink-0" />
          </Link>
        ))}
      </div>

      {/* Show more button */}
      <Link
        href="/search"
        className="text-[12px] font-bold text-indigo-500 hover:text-indigo-600 transition-colors w-max px-1"
      >
        Show more
      </Link>
    </div>
  );
}
