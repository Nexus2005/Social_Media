"use client";

import React from "react";
import { Star, MessageSquare } from "lucide-react";

interface ReviewsPlaceholderProps {
  productId: string;
}

export default function ReviewsPlaceholder({ productId }: ReviewsPlaceholderProps) {
  return (
    <div className="flex flex-col gap-4 p-5 bg-zinc-900/30 border border-zinc-850 rounded-2xl text-left select-none">
      <div className="flex items-center justify-between border-b border-zinc-850/60 pb-3">
        <h3 className="text-sm font-black text-white tracking-tight">Customer Reviews</h3>
        <div className="flex items-center gap-1 text-xs text-zinc-400 font-bold">
          <Star className="size-3 text-amber-500 fill-amber-500 shrink-0" />
          <span>4.5 out of 5</span>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
        <div className="p-3 bg-zinc-950 rounded-full border border-zinc-850">
          <MessageSquare className="size-6 text-zinc-550" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-white">No reviews yet</h4>
          <p className="text-[10px] text-zinc-550 max-w-xs mt-1 leading-normal">
            Be the first to review this product after completing your purchase!
          </p>
        </div>
        <button
          disabled
          className="mt-2 px-4 py-2 bg-zinc-950 border border-zinc-850 text-zinc-400 cursor-not-allowed text-[10.5px] font-black rounded-xl select-none"
        >
          Write a Review
        </button>
      </div>
    </div>
  );
}
