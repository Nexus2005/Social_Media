"use client";

import React from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function SpotShopShareWidget() {
  return (
    <div className="p-4.5 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/80 bg-[#ffffff]/60 dark:bg-[#0c0d14]/40 backdrop-blur-md shadow-sm select-none flex flex-col gap-3 relative overflow-hidden">
      
      {/* Decorative vector shape background to look premium */}
      <div className="absolute right-[-20px] bottom-[-20px] size-32 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col gap-1 z-10">
        <h4 className="text-[14px] font-black text-foreground uppercase tracking-wide">
          Spot. Shop. Share.
        </h4>
        <p className="text-[11px] text-muted-foreground leading-snug">
          Discover from any reel, image or video.
        </p>
      </div>

      {/* Social Badges and interactive icons */}
      <div className="flex items-center justify-between py-1 z-10">
        <div className="flex items-center gap-2.5">
          {/* Mock Instagram Badge */}
          <div className="size-8 rounded-xl bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center text-white text-[15px] font-bold shadow-sm cursor-pointer hover:scale-105 active:scale-95 transition-transform">
            📸
          </div>
          {/* Mock YouTube Badge */}
          <div className="size-8 rounded-xl bg-red-600 flex items-center justify-center text-white text-[15px] font-bold shadow-sm cursor-pointer hover:scale-105 active:scale-95 transition-transform">
            📺
          </div>
          {/* Mock TikTok Badge */}
          <div className="size-8 rounded-xl bg-black border border-zinc-850 flex items-center justify-center text-white text-[14px] font-bold shadow-sm cursor-pointer hover:scale-105 active:scale-95 transition-transform">
            🎵
          </div>
        </div>

        {/* Decorative Sparkle icon */}
        <Sparkles className="size-5 text-indigo-400 animate-pulse shrink-0" />
      </div>

      {/* CTA Button */}
      <Link
        href="/reels"
        className="w-full text-center py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-extrabold uppercase tracking-widest transition-all shadow-md shadow-indigo-550/15 active:scale-[0.98] z-10"
      >
        Try Spot Something
      </Link>
    </div>
  );
}
