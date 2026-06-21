"use client";

import { useEffect, useRef, useState } from "react";
import kyInstance from "@/lib/ky";
import { PostsPage } from "@/lib/types";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import ReelCard from "@/components/reels/ReelCard";
import { useSearchParams } from "next/navigation";

export default function ReelsFeed() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeReelIndex, setActiveReelIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);

  const searchParams = useSearchParams();
  const focusedPostId = searchParams.get("focusedPostId");

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey: ["post-feed", "reels", focusedPostId],
    queryFn: ({ pageParam }) =>
      kyInstance
        .get(
          "/api/posts/reels",
          {
            searchParams: {
              ...(pageParam ? { cursor: pageParam } : {}),
              ...(focusedPostId ? { focusedPostId } : {}),
            },
          }
        )
        .json<PostsPage>(),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const posts = data?.pages.flatMap((page) => page.posts) || [];

  // Track scroll position to update active index
  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop;
    const height = container.clientHeight;
    // Calculate index rounded to nearest viewport
    const index = Math.round(scrollTop / height);

    if (index !== activeReelIndex && index >= 0 && index < posts.length) {
      setActiveReelIndex(index);
    }
  };

  // Pre-fetch next page when close to the end
  useEffect(() => {
    if (hasNextPage && !isFetching && activeReelIndex >= posts.length - 2) {
      fetchNextPage();
    }
  }, [activeReelIndex, posts.length, hasNextPage, isFetching, fetchNextPage]);

  // Keyboard navigation support (Up/Down arrows)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const container = scrollContainerRef.current;
      if (!container) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        scrollDown();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        scrollUp();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const scrollUp = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.scrollBy({
      top: -container.clientHeight,
      behavior: "smooth",
    });
  };

  const scrollDown = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.scrollBy({
      top: container.clientHeight,
      behavior: "smooth",
    });
  };

  if (status === "pending") {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black">
        <Loader2 className="size-10 animate-spin text-primary" />
      </div>
    );
  }

  if (status === "success" && !posts.length && !hasNextPage) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black text-white px-4">
        <p className="text-center text-zinc-400 font-medium">No Spots found. Be the first to share a video!</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black text-white px-4">
        <p className="text-center text-destructive font-medium">An error occurred while loading Spots.</p>
      </div>
    );
  }

  return (
    <div id="reels-page" className="w-full h-[calc(100vh-3.5rem)] md:h-screen bg-black relative flex justify-center items-center overflow-hidden select-none">
      {/* Scrollable snapped container */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="w-full h-full overflow-y-scroll snap-y snap-mandatory scrollbar-none flex flex-col z-10"
      >
        {posts.map((post, index) => (
          <ReelCard
            key={post.id}
            post={post}
            isMuted={isMuted}
            onToggleMute={() => setIsMuted(!isMuted)}
            isActive={index === activeReelIndex}
            shouldPreload={index === activeReelIndex + 1}
          />
        ))}
        {isFetchingNextPage && (
          <div className="w-full h-screen snap-start snap-always shrink-0 flex items-center justify-center bg-black">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        )}
      </div>

      {/* Floating vertical chevron navigations on far right */}
      <div className="hidden lg:flex flex-col gap-3 absolute right-10 top-1/2 -translate-y-1/2 z-30 select-none">
        {activeReelIndex > 0 && (
          <button
            onClick={scrollUp}
            className="p-3 bg-zinc-900/80 hover:bg-zinc-800 text-white rounded-full transition-all duration-200 shadow-xl border border-zinc-800 hover:scale-105 active:scale-95"
            title="Previous Spot"
          >
            <ChevronUp className="size-5.5" />
          </button>
        )}
        {(activeReelIndex < posts.length - 1 || hasNextPage) && (
          <button
            onClick={scrollDown}
            className="p-3 bg-zinc-900/80 hover:bg-zinc-800 text-white rounded-full transition-all duration-200 shadow-xl border border-zinc-800 hover:scale-105 active:scale-95"
            title="Next Spot"
          >
            <ChevronDown className="size-5.5" />
          </button>
        )}
      </div>
    </div>
  );
}
