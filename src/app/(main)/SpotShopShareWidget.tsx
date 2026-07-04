"use client";

import React from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function SpotShopShareWidget() {
  return (
    <div className="glass-card rounded-[28px] p-5 shadow-premium-md select-none border border-zinc-250/20 dark:border-zinc-800/30 hover:scale-[1.01] hover:shadow-premium-lg transition-all duration-300 flex flex-col gap-4 relative overflow-hidden">
      
      {/* Decorative vector shape background to look premium */}
      <div className="absolute right-[-30px] bottom-[-30px] size-36 bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col gap-1.5 z-10">
        <h4 className="text-[12px] font-black text-foreground uppercase tracking-wider">
          Spot. Shop. Share.
        </h4>
        <p className="text-[11px] text-muted-foreground leading-snug font-medium">
          Discover product items directly from any reel, image or video.
        </p>
      </div>

      {/* Social Badges and interactive icons */}
      <div className="flex items-center justify-between py-1 z-10">
        <div className="flex items-center gap-3">
          {/* Mock Instagram Badge */}
          <div className="size-9 rounded-2xl bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-650 flex items-center justify-center text-white text-[16px] shadow-premium-sm cursor-pointer hover:scale-110 hover:-translate-y-0.5 active:scale-95 transition-all">
            📸
          </div>
          {/* Mock YouTube Badge */}
          <div className="size-9 rounded-2xl bg-red-650 flex items-center justify-center text-white text-[16px] shadow-premium-sm cursor-pointer hover:scale-110 hover:-translate-y-0.5 active:scale-95 transition-all">
            📺
          </div>
          {/* Mock TikTok Badge */}
          <div className="size-9 rounded-2xl bg-[#08090e] border border-zinc-800 flex items-center justify-center text-white text-[15px] shadow-premium-sm cursor-pointer hover:scale-110 hover:-translate-y-0.5 active:scale-95 transition-all">
            🎵
          </div>
        </div>

        {/* Decorative Sparkle icon */}
        <div className="size-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-500 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40 shrink-0">
          <Sparkles className="size-4.5 animate-pulse" />
        </div>
      </div>

      {/* CTA Button */}
      <Link
        href="/reels"
        className="w-full text-center py-3 rounded-xl bg-gradient-to-r from-indigo-550 to-purple-650 hover:from-indigo-600 hover:to-purple-700 text-white text-[11px] font-black uppercase tracking-widest transition-all shadow-md shadow-indigo-550/15 hover:shadow-premium-md hover:scale-[1.02] active:scale-[0.98] z-10"
      >
        Try Spot Something
      </Link>
    </div>
  );
}
