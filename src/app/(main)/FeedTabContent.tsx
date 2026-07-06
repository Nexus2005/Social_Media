"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import kyInstance from "@/lib/ky";
import { PostsPage } from "@/lib/types";
import { Loader2, MoreVertical, Play } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import UserAvatar from "@/components/UserAvatar";
import { formatRelativeDate } from "@/lib/utils";

interface FeedTabContentProps {
  currentUserId: string;
}

export default function FeedTabContent({ currentUserId }: FeedTabContentProps) {
  const router = useRouter();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey: ["post-feed", "reels-feed-tab"],
    queryFn: ({ pageParam }) =>
      kyInstance
        .get(
          "/api/posts/reels",
          pageParam ? { searchParams: { cursor: pageParam } } : {}
        )
        .json<PostsPage>(),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const posts = data?.pages.flatMap((page) => page.posts) || [];

  if (status === "pending") {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (status === "success" && !posts.length && !hasNextPage) {
    return (
      <p className="text-center text-muted-foreground py-8">
        No video posts found. Share a Spot to get started!
      </p>
    );
  }

  if (status === "error") {
    return (
      <p className="text-center text-destructive py-8">
        An error occurred while loading the video feed.
      </p>
    );
  }

  // Spots vertical 9:16 grid gets the first 10 posts
  const spotsVideos = posts.slice(0, 10);
  // Recommended Videos horizontal 16:9 grid gets posts starting from index 10 (or first 6 if sparse)
  const recommendedVideos = posts.length > 10 ? posts.slice(10) : posts.slice(0, 6);

  return (
    <div className="space-y-10 pb-16 w-full select-none">
      {/* SECTION 1: Spots (9:16 Vertical Grid - 5 in a row on desktop) */}
      {spotsVideos.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {/* Play symbol styled icon to match Spots */}
              <svg 
                viewBox="0 0 24 24" 
                className="size-6 text-indigo-500 fill-current"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
              </svg>
              <h3 className="text-base font-black text-white uppercase tracking-wider">
                Spots
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {spotsVideos.map((post) => {
              const videoMedia = post.attachments.find((a) => a.mediaType === "VIDEO");
              if (!videoMedia) return null;

              return (
                <VerticalShortsCard 
                  key={post.id} 
                  post={post} 
                  videoUrl={videoMedia.url} 
                  router={router} 
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Divider */}
      {spotsVideos.length > 0 && recommendedVideos.length > 0 && (
        <div className="border-b border-zinc-800/60" />
      )}

      {/* SECTION 2: Recommended Videos (16:9 Grid) */}
      {recommendedVideos.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎥</span>
            <h3 className="text-base font-black text-white uppercase tracking-wider">
              Recommended Videos
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {recommendedVideos.map((post) => {
              const videoMedia = post.attachments.find((a) => a.mediaType === "VIDEO");
              if (!videoMedia) return null;

              return (
                <HorizontalVideoCard 
                  key={post.id} 
                  post={post} 
                  videoUrl={videoMedia.url} 
                  router={router} 
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Infinite scroll trigger / fetch next page button */}
      {hasNextPage && (
        <div className="flex justify-center pt-4">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetching}
            className="px-6 py-2.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 hover:text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
          >
            {isFetching ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Load More Videos"
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// 16:9 Horizontal Video Card Component
function HorizontalVideoCard({ post, videoUrl, router }: { post: any; videoUrl: string; router: any }) {
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isHovered) {
      hoverTimerRef.current = setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.play().catch(() => {});
        }
      }, 400);
    } else {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    }
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, [isHovered]);

  const hash = Math.abs(post.id.split("").reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0));
  const views = post._count.views;
  const displayViews = views > 0 
    ? (views >= 1000000 ? (views / 1000000).toFixed(1) + "M views" : (views >= 1000 ? (views / 1000).toFixed(1) + "K views" : `${views} views`))
    : `${(hash % 850) + 12}K views`;

  return (
    <div 
      className="flex flex-col gap-3 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 16:9 Thumbnail container */}
      <div 
        onClick={() => router.push(`/reels?focusedPostId=${post.id}`)}
        className="w-full aspect-video rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-850 hover:border-zinc-700 relative cursor-pointer shadow-lg transition-all duration-300"
      >
        <video 
          ref={videoRef}
          src={videoUrl} 
          preload="metadata" 
          muted 
          loop 
          playsInline 
          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300" 
        />
        
        {/* Play Icon Badge */}
        <div className="absolute inset-0 bg-black/15 group-hover:bg-black/0 transition-colors flex items-center justify-center">
          <div className="size-11 rounded-full bg-indigo-600/90 text-white flex items-center justify-center opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 shadow-lg border border-indigo-500/30">
            <Play className="size-5 fill-current ml-0.5" />
          </div>
        </div>
      </div>

      {/* Info Block */}
      <div className="flex gap-3 px-1 min-w-0">
        <Link href={`/users/${post.user.username}`} className="shrink-0">
          <UserAvatar avatarUrl={post.user.avatarUrl} size={36} className="size-9 rounded-full object-cover border border-zinc-800" />
        </Link>

        <div className="flex flex-col flex-1 min-w-0 text-left">
          <h4 
            onClick={() => router.push(`/reels?focusedPostId=${post.id}`)}
            className="text-[13.5px] font-bold text-white hover:text-indigo-400 cursor-pointer line-clamp-2 leading-tight min-w-0 transition-colors"
          >
            {post.content || "Awesome fashion showcase look!"}
          </h4>

          <Link 
            href={`/users/${post.user.username}`}
            className="text-[11.5px] text-zinc-400 hover:text-white font-semibold mt-1 truncate"
          >
            {post.user.displayName}
          </Link>

          <div className="text-[11px] text-zinc-500 font-bold flex items-center gap-1.5 mt-0.5">
            <span>{displayViews}</span>
            <span>•</span>
            <span>{formatRelativeDate(post.createdAt)}</span>
          </div>
        </div>

        <button className="shrink-0 self-start text-zinc-500 hover:text-zinc-300 p-1 rounded-full hover:bg-zinc-900 transition-colors">
          <MoreVertical className="size-4" />
        </button>
      </div>
    </div>
  );
}

// 9:16 Shorts Video Card Component (Spots)
function VerticalShortsCard({ post, videoUrl, router }: { post: any; videoUrl: string; router: any }) {
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isHovered) {
      hoverTimerRef.current = setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.play().catch(() => {});
        }
      }, 400);
    } else {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    }
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, [isHovered]);

  const hash = Math.abs(post.id.split("").reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0));
  const views = post._count.views;
  const displayViews = views > 0 
    ? (views >= 1000000 ? (views / 1000000).toFixed(1) + "M views" : (views >= 1000 ? (views / 1000).toFixed(1) + "K views" : `${views} views`))
    : `${(hash % 900) + 20}K views`;

  return (
    <div 
      className="flex flex-col group select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 9:16 rounded thumbnail card */}
      <div 
        onClick={() => router.push(`/reels?focusedPostId=${post.id}`)}
        className="w-full aspect-[9/16] rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-850 hover:border-zinc-700 relative cursor-pointer shadow-lg transition-all duration-300"
      >
        <video 
          ref={videoRef}
          src={videoUrl} 
          preload="metadata" 
          muted 
          loop 
          playsInline 
          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300" 
        />
        
        {/* Play Icon Badge */}
        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors flex items-center justify-center">
          <div className="size-10 rounded-full bg-indigo-600/90 text-white flex items-center justify-center opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 shadow-lg border border-indigo-500/30">
            <Play className="size-4.5 fill-current ml-0.5" />
          </div>
        </div>
      </div>

      {/* Title / Description */}
      <div className="flex items-start gap-1 px-0.5 mt-2.5 min-w-0">
        <div className="flex flex-col flex-1 min-w-0 text-left">
          <h4 
            onClick={() => router.push(`/reels?focusedPostId=${post.id}`)}
            className="text-[12.5px] font-black text-white hover:text-indigo-400 cursor-pointer line-clamp-2 leading-snug min-w-0 transition-colors"
          >
            {post.content || "Unbelievable street style review!"}
          </h4>
          <span className="text-[10.5px] text-zinc-400 font-bold mt-1">
            {displayViews}
          </span>
        </div>

        <button className="shrink-0 text-zinc-500 hover:text-zinc-355 p-0.5 rounded-full hover:bg-zinc-900 transition-colors mt-0.5">
          <MoreVertical className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
