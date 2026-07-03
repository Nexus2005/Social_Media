"use client";

import { useEffect, useRef, useState } from "react";
import kyInstance from "@/lib/ky";
import { PostsPage } from "@/lib/types";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Loader2, Bell, Search, X } from "lucide-react";
import ReelCard from "@/components/reels/ReelCard";
import AllProductsView from "@/components/reels/AllProductsView";
import FullScreenProductDetail from "@/components/reels/FullScreenProductDetail";
import { useSearchParams, useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function ReelsFeed() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [activeReelIndex, setActiveReelIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isScrollLocked, setIsScrollLocked] = useState(false);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReelProducts, setSelectedReelProducts] = useState<any[] | null>(null);
  const [activeDetailProduct, setActiveDetailProduct] = useState<{ id: string | number; products: any[] } | null>(null);

  const searchParams = useSearchParams();
  const params = useParams();
  const focusedPostId = (params?.postId as string) || searchParams.get("focusedPostId");

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
      if (isScrollLocked) return;
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
  }, [isScrollLocked]);

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
      <div className="flex h-screen w-full items-center justify-center bg-[#07080d]">
        <Loader2 className="size-10 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (status === "success" && !posts.length && !hasNextPage) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#07080d] text-white px-4">
        <p className="text-center text-zinc-400 font-medium">No Spots found. Be the first to share a video!</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#07080d] text-white px-4">
        <p className="text-center text-destructive font-medium">An error occurred while loading Spots.</p>
      </div>
    );
  }

  return (
    <div id="reels-page" className="w-full h-screen bg-[#07080d] relative flex flex-col overflow-hidden select-none">
      {/* Desktop Header - Glassmorphism Overlay */}
      <div className="hidden md:flex items-center justify-between px-6 py-4 bg-gradient-to-b from-[#07080d]/90 via-[#07080d]/50 to-transparent absolute top-0 left-0 right-0 z-[25] select-none pointer-events-none">
        {/* Left: Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 pointer-events-auto">
          <span>Reels</span>
          <span className="text-zinc-600 font-normal">/</span>
          <span className="text-white">Shop</span>
        </div>

        {/* Right: Search + Notification side by side */}
        <div className="flex items-center gap-3 pointer-events-auto">


          {/* Expandable Search - Uiverse style hover-expand */}
          <div
            className={cn(
              "flex items-center bg-zinc-800/60 backdrop-blur-xl border border-zinc-700/60 rounded-full shadow-lg transition-all duration-300 overflow-hidden h-[50px]",
              isSearchOpen 
                ? "w-[260px] justify-start px-2.5" 
                : "group relative w-[50px] hover:w-[140px] hover:bg-[#4f46e5] hover:border-indigo-500/50 cursor-pointer justify-center"
            )}
          >
            {/* Text that slides down on hover when not open - Centered */}
            {!isSearchOpen && (
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-black text-white transition-all duration-300 opacity-0 group-hover:top-[8px] group-hover:opacity-100 uppercase tracking-widest pointer-events-none select-none z-10">
                Search
              </span>
            )}

            {/* Search Icon Button */}
            <button
              onClick={() => {
                setIsSearchOpen(true);
                setTimeout(() => searchInputRef.current?.focus(), 50);
              }}
              className={cn(
                "flex items-center justify-center transition-all duration-200 cursor-pointer",
                isSearchOpen 
                  ? "w-10 h-10" 
                  : "w-full h-full"
              )}
            >
              {/* Icon that slides down on hover when not open */}
              <div className={cn(
                "transition-all duration-300 transform",
                !isSearchOpen && "group-hover:translate-y-2.5 group-hover:scale-90"
              )}>
                <Search className="size-4 text-zinc-300" />
              </div>
            </button>

            {/* Expanding input */}
            {isSearchOpen && (
              <>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search reels or creators..."
                  onBlur={() => {
                    if (!searchQuery) {
                      setIsSearchOpen(false);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setSearchQuery("");
                      setIsSearchOpen(false);
                    }
                  }}
                  className="flex-1 bg-transparent py-2.5 pr-1 text-[12px] text-zinc-200 placeholder-zinc-500 focus:outline-none min-w-0"
                />
                {searchQuery && (
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setSearchQuery("");
                      setIsSearchOpen(false);
                    }}
                    className="shrink-0 w-7 h-7 mr-1.5 flex items-center justify-center rounded-full hover:bg-zinc-700/60 transition-colors cursor-pointer"
                  >
                    <X className="size-3.5 text-zinc-400" />
                  </button>
                )}
              </>
            )}
          </div>

          {/* Notifications bell - hover expanding */}
          <div className="relative">
            <div className="group w-[50px] h-[50px] bg-zinc-800/60 backdrop-blur-xl rounded-full border border-zinc-700/60 shadow-lg cursor-pointer overflow-hidden flex items-center justify-center transition-all duration-300 hover:w-[140px] hover:bg-[#4f46e5] hover:border-indigo-500/50">
              {/* Text that slides down on hover - Centered */}
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-black text-white transition-all duration-300 opacity-0 group-hover:top-[8px] group-hover:opacity-100 uppercase tracking-widest pointer-events-none select-none">
                Alerts
              </span>

              {/* Icon that slides down on hover */}
              <div className="transition-all duration-300 transform group-hover:translate-y-2.5 group-hover:scale-90">
                <Bell className="size-4.5 text-zinc-200" />
              </div>
            </div>
            {/* The absolute badge count "3" */}
            <span className="absolute -top-0.5 -right-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-indigo-600 text-[9px] font-bold text-white border border-[#07080d] shadow-sm select-none pointer-events-none">
              3
            </span>
          </div>

        </div>
      </div>

      {/* Main reels list area - flush left to sidebar */}
      <div className="w-full h-full flex justify-center md:justify-start items-center overflow-hidden relative">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className={cn(
            "w-full h-full snap-y snap-mandatory scrollbar-none flex flex-col z-10 transition-all duration-300 md:items-start",
            isScrollLocked ? "overflow-hidden" : "overflow-y-scroll"
          )}
        >
          {posts.map((post, index) => (
            <ReelCard
              key={post.id}
              post={post}
              isMuted={isMuted}
              onToggleMute={() => setIsMuted(!isMuted)}
              isActive={index === activeReelIndex}
              shouldPreload={index === activeReelIndex + 1}
              isPrevReel={index === activeReelIndex - 1}
              onLockScroll={(locked) => {
                if (index === activeReelIndex) {
                  setIsScrollLocked(locked);
                }
              }}
              autoScrollEnabled={autoScrollEnabled}
              onToggleAutoScroll={() => setAutoScrollEnabled(!autoScrollEnabled)}
              onReelEnded={scrollDown}
              onViewAllProducts={(products) => setSelectedReelProducts(products)}
              onOpenProductDetail={(productId, products) => setActiveDetailProduct({ id: productId, products })}
            />
          ))}
          {isFetchingNextPage && (
            <div className="w-full h-screen snap-start snap-always shrink-0 flex items-center justify-center bg-[#07080d]">
              <Loader2 className="size-8 animate-spin text-indigo-500" />
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

      {/* Catalog view overlay from right to full screen */}
      <AnimatePresence>
        {selectedReelProducts && (
          <AllProductsView
            products={selectedReelProducts}
            onClose={() => setSelectedReelProducts(null)}
          />
        )}
      </AnimatePresence>

      {/* Full Screen Product Details Overlay */}
      <AnimatePresence>
        {activeDetailProduct && (
          <FullScreenProductDetail
            productId={activeDetailProduct.id}
            detectedProducts={activeDetailProduct.products}
            onClose={() => setActiveDetailProduct(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

