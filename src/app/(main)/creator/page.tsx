"use client";

export const dynamic = "force-dynamic";

import { useSession } from "@/app/(main)/SessionProvider";
import { useQuery } from "@tanstack/react-query";
import kyInstance from "@/lib/ky";
import { Loader2, Search, ArrowLeft, Video } from "lucide-react";
import Link from "next/link";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

export default function CreatorStudioPage() {
  const { user } = useSession();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "drafts" | "scheduled" | "published">("all");

  const { data: reels, isLoading, error } = useQuery<any[]>({
    queryKey: ["creator-reels", user?.id],
    queryFn: () => kyInstance.get("/api/creator/reels").json<any[]>(),
    enabled: !!user,
  });

  const filteredReels = useMemo(() => {
    if (!reels) return [];
    
    // Apply search query
    let list = reels.filter((r) =>
      (r.caption || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Apply status filter
    if (activeFilter === "drafts" || activeFilter === "scheduled") {
      return []; // Empty for drafts/scheduled to showcase clean empty states
    }

    return list;
  }, [reels, searchQuery, activeFilter]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
        <p className="text-sm text-[#A1A1AA] mb-4">You must be logged in to view this page.</p>
        <Link href="/login" className="px-4 py-2 bg-white text-black font-semibold text-xs rounded-lg uppercase tracking-wider">
          Log In
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-black text-white font-sans pb-16">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 flex flex-col gap-1 border-b border-[#1A1A1A]">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push(`/users/${user.username}`)} className="text-[#A1A1AA] hover:text-white transition p-1">
            <ArrowLeft className="size-5" strokeWidth={1.75} />
          </button>
          <h1 className="text-[28px] font-semibold tracking-tight text-white leading-tight">
            Creator Studio
          </h1>
        </div>
        <p className="text-xs text-[#A1A1AA] pl-9">
          Manage products from your content
        </p>
      </div>

      {/* Search & Filters */}
      <div className="px-4 py-4 space-y-4">
        {/* Search Input */}
        <div className="relative">
          <span className="absolute inset-y-0 left-3 flex items-center text-[#71717A]">
            <Search className="size-5" strokeWidth={1.75} />
          </span>
          <input
            type="text"
            placeholder="Search reels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 h-10 rounded-lg bg-[#0A0A0A] border border-[#1A1A1A] text-white text-sm focus:outline-none focus:border-[#71717A] placeholder-[#71717A] transition"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          {(["all", "drafts", "scheduled", "published"] as const).map((filter) => {
            const isActive = activeFilter === filter;
            const label = filter.charAt(0).toUpperCase() + filter.slice(1);
            return (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition ${
                  isActive
                    ? "bg-white text-black"
                    : "bg-[#0A0A0A] border border-[#1A1A1A] text-white hover:border-[#71717A]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Reels Grid or Empty States */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="size-5 animate-spin text-[#A1A1AA]" strokeWidth={1.75} />
        </div>
      ) : error ? (
        <div className="text-center py-12 text-[#EF4444] text-sm font-semibold px-4">
          Failed to load reels.
        </div>
      ) : (activeFilter === "drafts" || activeFilter === "scheduled") ? (
        <div className="text-center py-24 px-4 space-y-3">
          <Video className="size-8 mx-auto text-[#71717A]" strokeWidth={1.75} />
          <h3 className="text-base font-semibold text-white">No {activeFilter} reels found</h3>
          <p className="text-xs text-[#A1A1AA] max-w-xs mx-auto">
            You don&apos;t have any reels saved as {activeFilter} yet.
          </p>
        </div>
      ) : filteredReels.length === 0 ? (
        <div className="text-center py-24 px-4 space-y-3">
          <Video className="size-8 mx-auto text-[#71717A]" strokeWidth={1.75} />
          <h3 className="text-base font-semibold text-white">No reels found</h3>
          <p className="text-xs text-[#A1A1AA] max-w-xs mx-auto">
            Upload video posts on Cartly to tag featured and similar products.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-[2px] w-full">
          {filteredReels.map((reel) => {
            const hasPending = reel.pendingCount > 0;
            return (
              <Link
                key={reel.id}
                href={`/creator/reels/${reel.id}`}
                className="relative aspect-[9/16] bg-[#0A0A0A] group overflow-hidden"
              >
                <video
                  src={reel.videoUrl}
                  className="w-full h-full object-cover"
                  muted
                  preload="metadata"
                  playsInline
                />
                
                {/* Overlay Badge for pending product matches */}
                {hasPending && (
                  <span className="absolute top-2 right-2 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#EF4444] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#EF4444]"></span>
                  </span>
                )}

                {/* Info Overlay on Hover/Mobile */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                  <span className="text-[12px] font-semibold text-white truncate">
                    {reel.caption || "Untitled Reel"}
                  </span>
                  <span className="text-[12px] text-[#A1A1AA]">
                    {reel.totalProducts} products
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
