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

  // Segment the videos into alternating horizontal (16:9) and vertical (9:16) sections.
  interface VideoSection {
    type: "horizontal" | "vertical";
    title: string;
    videos: any[];
  }

  const sections: VideoSection[] = [];
  
  if (posts.length > 0) {
    let tempPosts = [...posts];
    
    // Fallback if data is sparse to make sure we show both sections
    if (tempPosts.length < 8) {
      sections.push({ type: "horizontal", title: "Recommended Videos", videos: tempPosts.slice(0, 6) });
      sections.push({ type: "vertical", title: "Spots", videos: tempPosts.slice(0, 5) });
    } else {
      let sectionIndex = 0;
      while (tempPosts.length > 0) {
        if (sectionIndex % 2 === 0) {
          // Horizontal section (6 videos)
          const chunk = tempPosts.splice(0, 6);
          sections.push({
            type: "horizontal",
            title: sectionIndex === 0 ? "Recommended Videos" : "More Recommended Videos",
            videos: chunk,
          });
        } else {
          // Vertical section (5 videos)
          const chunk = tempPosts.splice(0, 5);
          sections.push({
            type: "vertical",
            title: "Spots",
            videos: chunk,
          });
        }
        sectionIndex++;
      }
    }
  }

  return (
    <div className="space-y-10 pb-16 w-full select-none">
      {sections.map((section, sIdx) => {
        const isFirst = sIdx === 0;

        return (
          <div key={sIdx} className="space-y-6">
            {/* Divider between sections */}
            {!isFirst && <div className="border-b border-zinc-800/60 pb-4" />}

            {/* Section Header */}
            <div className="flex items-center gap-2.5">
              {section.type === "horizontal" ? (
                <>
                  <svg className="size-6 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="recommendedSatinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style={{ stopColor: "#2e5bff", stopOpacity: 1 }} />
                        <stop offset="50%" style={{ stopColor: "#8b5cf6", stopOpacity: 1 }} />
                        <stop offset="100%" style={{ stopColor: "#c084fc", stopOpacity: 1 }} />
                      </linearGradient>
                    </defs>
                    <path fill="url(#recommendedSatinGradient)" d="M12,2 C16.418278,2 20,5.581722 20,10 C20,12.5480905 18.8087155,14.8179415 16.9527141,16.2829857 L17.0016031,16.2440856 L17.0007001,22.2453233 C17.0007001,22.7945586 16.4297842,23.157512 15.9324488,22.9244522 L12.0005291,21.0818879 L8.07069102,22.9243915 C7.5733438,23.1575726 7.00231009,22.7946207 7.00231009,22.2453233 L7.00069412,16.2459273 C5.1725143,14.7820178 4,12.5279366 4,10 C4,5.581722 7.581722,2 12,2 Z M15.5012202,17.1951723 L15.5414683,17.1754104 C14.4738996,17.7033228 13.2715961,18 12,18 C10.8745896,18 9.80345551,17.7676152 8.83196505,17.3482129 L8.50180347,17.1966457 L8.50231009,21.065345 L11.6820691,19.5745158 C11.8837425,19.4799613 12.1170099,19.479939 12.3187014,19.5744551 L15.5007001,21.0655937 L15.5012202,17.1951723 Z M12,3.5 C8.41014913,3.5 5.5,6.41014913 5.5,10 C5.5,13.5898509 8.41014913,16.5 12,16.5 C15.5898509,16.5 18.5,13.5898509 18.5,10 C18.5,6.41014913 15.5898509,3.5 12,3.5 Z M12.2287851,6.64234387 L13.1413078,8.49499737 L15.185271,8.79035658 C15.3945922,8.82060416 15.4782541,9.07783021 15.326776,9.22542655 L13.8484251,10.6658938 L14.1974269,12.7012993 C14.2331646,12.9097242 14.0143068,13.0685941 13.8272087,12.9700424 L12,12.0075816 L10.1727912,12.9700424 C9.98560603,13.06864 9.76668059,12.9095814 9.80260908,12.7010893 L10.1533251,10.6658938 L8.67333197,9.22553178 C8.52171667,9.07797642 8.60533875,8.82061413 8.81472896,8.79035658 L10.8586922,8.49499737 L11.7712148,6.64234387 C11.8646966,6.45255204 12.1353033,6.45255204 12.2287851,6.64234387 Z" />
                  </svg>
                  <h3 className="text-base font-black text-white uppercase tracking-wider">
                    {section.title}
                  </h3>
                </>
              ) : (
                <>
                  <svg 
                    viewBox="0 0 24 24" 
                    className="size-6 text-indigo-500 fill-current"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                  </svg>
                  <h3 className="text-base font-black text-white uppercase tracking-wider">
                    {section.title}
                  </h3>
                </>
              )}
            </div>

            {/* Section Grid */}
            {section.type === "horizontal" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {section.videos.map((post) => {
                  const videoMedia = post.attachments.find((a: any) => a.mediaType === "VIDEO");
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
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {section.videos.map((post) => {
                  const videoMedia = post.attachments.find((a: any) => a.mediaType === "VIDEO");
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
            )}
          </div>
        );
      })}

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

// Attach the video source only when the card approaches the viewport so that
// off-screen feed videos never consume bandwidth or decoder resources
function useNearViewport<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [isNear, setIsNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || isNear) return;

    if (typeof IntersectionObserver === "undefined") {
      setIsNear(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: "500px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [isNear]);

  return { ref, isNear };
}

// 16:9 Horizontal Video Card Component
function HorizontalVideoCard({ post, videoUrl, router }: { post: any; videoUrl: string; router: any }) {
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { ref: containerRef, isNear } = useNearViewport<HTMLDivElement>();

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
        ref={containerRef}
        onClick={() => router.push(`/reels?focusedPostId=${post.id}`)}
        className="w-full aspect-video rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-850 hover:border-zinc-700 relative cursor-pointer shadow-lg transition-all duration-300"
      >
        <video
          ref={videoRef}
          src={isNear ? videoUrl : undefined}
          preload={isNear ? "metadata" : "none"}
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
  const { ref: containerRef, isNear } = useNearViewport<HTMLDivElement>();

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
        ref={containerRef}
        onClick={() => router.push(`/reels?focusedPostId=${post.id}`)}
        className="w-full aspect-[9/16] rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-850 hover:border-zinc-700 relative cursor-pointer shadow-lg transition-all duration-300"
      >
        <video
          ref={videoRef}
          src={isNear ? videoUrl : undefined}
          preload={isNear ? "metadata" : "none"}
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

        <button className="shrink-0 text-zinc-500 hover:text-zinc-350 p-0.5 rounded-full hover:bg-zinc-900 transition-colors mt-0.5">
          <MoreVertical className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
