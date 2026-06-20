"use client";

import { useRef, useState } from "react";
import { useSession } from "@/app/(main)/SessionProvider";
import UserAvatar from "@/components/UserAvatar";
import FollowButton from "@/components/FollowButton";
import kyInstance from "@/lib/ky";
import { BookmarkInfo, FollowerInfo, LikeInfo, PostData } from "@/lib/types";
import { QueryKey, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  Music,
  VolumeX,
  Volume2,
  Play,
  Pause,
  ExternalLink,
  Loader2
} from "lucide-react";
import Link from "next/link";
import ReelOptionsDialog from "./ReelOptionsDialog";
import ReelsCommentDialog from "./ReelsCommentDialog";
import useReelsIntersectionObserver from "./useReelsIntersectionObserver";
import { useToast } from "../ui/use-toast";
import { cn } from "@/lib/utils";

interface ReelCardProps {
  post: PostData;
  isMuted: boolean;
  onToggleMute: () => void;
}

export default function ReelCard({ post, isMuted, onToggleMute }: ReelCardProps) {
  const { user: loggedInUser } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const videoRef = useRef<HTMLVideoElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [overlayIcon, setOverlayIcon] = useState<"play" | "pause" | null>(null);
  const [showHeartPulse, setShowHeartPulse] = useState(false);

  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isCaptionExpanded, setIsCaptionExpanded] = useState(false);

  // Shoppable products overlay states
  const [showHotspots, setShowHotspots] = useState(true);
  const [isShoppingDrawerOpen, setIsShoppingDrawerOpen] = useState(false);

  // Polling query for AI status tracking
  const { data: statusData } = useQuery({
    queryKey: ["post-ai-status", post.id],
    queryFn: () =>
      kyInstance.get(`/api/posts/${post.id}/status`).json<{
        aiStatus: string;
        detectedObjects: any[];
        detectedProducts: any[];
      }>(),
    initialData: {
      aiStatus: post.aiStatus || "PENDING",
      detectedObjects: (post as any).detectedObjects || [],
      detectedProducts: (post as any).detectedProducts || [],
    },
    refetchInterval: (query) => {
      const currentStatus = query.state.data?.aiStatus || "PENDING";
      return currentStatus === "PENDING" || currentStatus === "PROCESSING" ? 3000 : false;
    },
    enabled: post.aiStatus === "PENDING" || post.aiStatus === "PROCESSING",
  });

  const currentStatus = statusData?.aiStatus || post.aiStatus || "PENDING";
  const detectedObjects = statusData?.detectedObjects || (post as any).detectedObjects || [];
  const detectedProducts = statusData?.detectedProducts || (post as any).detectedProducts || [];

  // Intersection Observer to autoplay/pause video
  useReelsIntersectionObserver(videoRef, setIsPlaying, isMuted);

  const videoAttachment = post.attachments.find((att) => att.mediaType === "VIDEO");
  const videoUrl = videoAttachment?.url;

  // Likes Query and Mutation
  const likeQueryKey: QueryKey = ["like-info", post.id];
  const { data: likeData } = useQuery({
    queryKey: likeQueryKey,
    queryFn: () => kyInstance.get(`/api/posts/${post.id}/likes`).json<LikeInfo>(),
    initialData: {
      likes: post._count.likes,
      isLikedByUser: post.likes.some((l) => l.userId === loggedInUser.id),
    },
    staleTime: Infinity,
  });

  const { mutate: toggleLike } = useMutation({
    mutationFn: () =>
      likeData.isLikedByUser
        ? kyInstance.delete(`/api/posts/${post.id}/likes`)
        : kyInstance.post(`/api/posts/${post.id}/likes`),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: likeQueryKey });
      const previousState = queryClient.getQueryData<LikeInfo>(likeQueryKey);

      queryClient.setQueryData<LikeInfo>(likeQueryKey, () => ({
        likes: (previousState?.likes || 0) + (previousState?.isLikedByUser ? -1 : 1),
        isLikedByUser: !previousState?.isLikedByUser,
      }));

      return { previousState };
    },
    onError(error, variables, context) {
      queryClient.setQueryData(likeQueryKey, context?.previousState);
      console.error(error);
    },
  });

  // Bookmarks Query and Mutation
  const bookmarkQueryKey: QueryKey = ["bookmark-info", post.id];
  const { data: bookmarkData } = useQuery({
    queryKey: bookmarkQueryKey,
    queryFn: () => kyInstance.get(`/api/posts/${post.id}/bookmark`).json<BookmarkInfo>(),
    initialData: {
      isBookmarkedByUser: post.bookmarks.some((b) => b.userId === loggedInUser.id),
    },
    staleTime: Infinity,
  });

  const { mutate: toggleBookmark } = useMutation({
    mutationFn: () =>
      bookmarkData.isBookmarkedByUser
        ? kyInstance.delete(`/api/posts/${post.id}/bookmark`)
        : kyInstance.post(`/api/posts/${post.id}/bookmark`),
    onMutate: async () => {
      toast({
        description: `Spot ${bookmarkData.isBookmarkedByUser ? "un" : ""}saved`,
      });
      await queryClient.cancelQueries({ queryKey: bookmarkQueryKey });
      const previousState = queryClient.getQueryData<BookmarkInfo>(bookmarkQueryKey);

      queryClient.setQueryData<BookmarkInfo>(bookmarkQueryKey, () => ({
        isBookmarkedByUser: !previousState?.isBookmarkedByUser,
      }));

      return { previousState };
    },
    onError(error, variables, context) {
      queryClient.setQueryData(bookmarkQueryKey, context?.previousState);
      console.error(error);
    },
  });

  if (!videoUrl) return null;

  // Single/Double Click Video handler
  const handleVideoClick = (e: React.MouseEvent) => {
    if (isShoppingDrawerOpen) {
      // If shopping drawer is open, close it and resume video play
      setIsShoppingDrawerOpen(false);
      const video = videoRef.current;
      if (video && video.paused) {
        video.play().then(() => setIsPlaying(true)).catch((err) => console.error(err));
      }
      return;
    }

    if (e.detail === 2) {
      // Double click -> Like
      if (!likeData.isLikedByUser) {
        toggleLike();
      }
      setShowHeartPulse(true);
      setTimeout(() => setShowHeartPulse(false), 800);
    } else {
      // Single click -> Play/Pause
      const video = videoRef.current;
      if (!video) return;

      if (video.paused) {
        video.play().then(() => {
          setIsPlaying(true);
          setOverlayIcon("play");
        }).catch((err) => console.error(err));
      } else {
        video.pause();
        setIsPlaying(false);
        setOverlayIcon("pause");
      }

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setOverlayIcon(null);
      }, 600);
    }
  };

  const handleShareClick = () => {
    const postUrl = `${window.location.origin}/posts/${post.id}`;
    navigator.clipboard.writeText(postUrl);
    toast({
      description: "Spot link copied to clipboard.",
    });
  };

  const followerInfo: FollowerInfo = {
    followers: post.user._count.followers,
    isFollowedByUser: post.user.followers.some((f) => f.followerId === loggedInUser.id),
  };

  return (
    <div className="w-full h-screen snap-start snap-always shrink-0 flex items-center justify-center bg-black relative select-none overflow-hidden">
      
      {/* 1. Blurred Reflection Backdrop (Desktop only) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none hidden md:block select-none z-0">
        <video
          src={videoUrl}
          muted
          loop
          playsInline
          className="w-full h-full object-cover blur-[50px] opacity-25 scale-110"
        />
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes reelsHeartPulse {
            0% { transform: scale(0.3); opacity: 0; }
            50% { transform: scale(1.2); opacity: 0.9; }
            80% { transform: scale(0.9); opacity: 0.9; }
            100% { transform: scale(1); opacity: 0; }
          }
          .animate-reels-heart {
            animation: reelsHeartPulse 0.8s ease-out forwards;
          }
        `
      }} />

      {/* 2. Main Aspect 9:16 Video Box */}
      <div className="aspect-[9/16] h-[85vh] sm:h-[88vh] md:h-[93vh] max-h-[820px] w-full max-w-[410px] sm:max-w-[440px] relative rounded-2xl overflow-hidden bg-zinc-950 shadow-2xl flex items-center justify-center border border-zinc-800/80 z-10">
        <video
          ref={videoRef}
          src={videoUrl}
          loop
          playsInline
          muted={isMuted}
          onClick={handleVideoClick}
          className="w-full h-full object-cover cursor-pointer"
        />

        {/* Mute Indicator overlay in top-right corner of player */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleMute();
          }}
          className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black/85 rounded-full text-white transition z-20"
        >
          {isMuted ? <VolumeX className="size-4.5" /> : <Volume2 className="size-4.5" />}
        </button>

        {/* Central Play/Pause Pulse Icon Overlay */}
        {overlayIcon && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 pointer-events-none z-20">
            <div className="p-4 bg-black/60 rounded-full text-white animate-play-pause-icon">
              {overlayIcon === "play" ? (
                <Play className="size-8 fill-white" />
              ) : (
                <Pause className="size-8 fill-white" />
              )}
            </div>
          </div>
        )}

        {/* Double-click Heart Animation Pulse */}
        {showHeartPulse && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 pointer-events-none z-20">
            <Heart className="size-20 fill-red-500 text-red-500 animate-reels-heart" />
          </div>
        )}

        {/* Center play state hint overlay (appears only when video is paused and no active pulse animation is running) */}
        {!isPlaying && !overlayIcon && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-10 pointer-events-none transition-opacity duration-300">
            <div className="p-4 bg-black/40 rounded-full text-white">
              <Play className="size-10 fill-white translate-x-[2px]" />
            </div>
          </div>
        )}

        {/* Bounding box hotspot visual overlays */}
        {showHotspots &&
          currentStatus === "COMPLETED" &&
          detectedProducts.map((obj: any) => {
            const bounds = getBoundingBox(obj.box);
            if (!bounds) return null;

            return (
              <div
                key={obj.id}
                className="absolute z-20 group animate-in fade-in zoom-in duration-300"
                style={{
                  left: `${bounds.centerX}%`,
                  top: `${bounds.centerY}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                {/* Hotspot circular pulse button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (videoRef.current && !videoRef.current.paused) {
                      videoRef.current.pause();
                      setIsPlaying(false);
                    }
                    setIsShoppingDrawerOpen(true);
                  }}
                  className="relative flex items-center justify-center size-8 group cursor-pointer"
                >
                  <span className="absolute inline-flex h-full w-full rounded-full bg-white/40 animate-ping opacity-75" />
                  <span className="relative inline-flex rounded-full size-3 bg-white border border-black/50 shadow-md transition-transform duration-200 group-hover:scale-125" />
                </button>

                {/* Tooltip label badge */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2.5 py-1 bg-black/85 backdrop-blur-md text-white text-[11px] font-semibold rounded-md shadow-lg border border-white/10 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 flex items-center gap-1 select-none">
                  <span>{obj.label}</span>
                  <span className="text-white/60 text-[9px]">➔</span>
                </div>
              </div>
            );
          })}

        {/* Left Bottom Video Details Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white z-20 flex flex-col gap-2">
          {/* Creator Profile & Follow */}
          <div className="flex items-center gap-2.5">
            <Link href={`/users/${post.user.username}`} className="flex-shrink-0">
              <UserAvatar avatarUrl={post.user.avatarUrl} size={36} className="border border-white/40" />
            </Link>
            <div className="flex items-center gap-2">
              <Link href={`/users/${post.user.username}`} className="font-semibold text-sm hover:underline truncate max-w-[150px]">
                {post.user.username}
              </Link>
              <span className="text-white/60 text-[10px]">&#8226;</span>
              {post.user.id !== loggedInUser.id && (
                <FollowButton userId={post.user.id} initialState={followerInfo} variant="text" />
              )}
            </div>
          </div>

          {/* Caption */}
          <div className="text-xs text-white/90">
            <p className={cn("leading-relaxed", !isCaptionExpanded && "line-clamp-2")}>
              {post.content}
            </p>
            {post.content.length > 80 && !isCaptionExpanded && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCaptionExpanded(true);
                }}
                className="text-white/60 font-semibold hover:underline mt-1"
              >
                more
              </button>
            )}
          </div>

          {/* Floating Shop Look tag (appears when products are detected and processing is complete) */}
          {currentStatus === "COMPLETED" && detectedProducts.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (videoRef.current && !videoRef.current.paused) {
                  videoRef.current.pause();
                  setIsPlaying(false);
                }
                setIsShoppingDrawerOpen(true);
              }}
              className="flex items-center gap-1.5 bg-black/60 hover:bg-black/85 px-3 py-1.5 rounded-full border border-white/20 hover:border-white/45 text-xs font-semibold text-yellow-400 hover:text-yellow-300 w-fit cursor-pointer transition-all duration-200 mt-2 mb-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-4 animate-bounce">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
              <span>Shop Look ({detectedProducts.length})</span>
            </button>
          )}

          {/* Music Track Marquee */}
          <div className="flex items-center gap-1.5 mt-1 bg-black/35 px-2.5 py-1 rounded-full w-fit max-w-[190px] overflow-hidden text-[11px]">
            <Music className="size-3 flex-shrink-0 animate-pulse" />
            <div className="w-[140px] overflow-hidden whitespace-nowrap relative select-none">
              <span className="animate-scroll-text pl-[100%]">
                {post.user.displayName} · Original Audio &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {post.user.displayName} · Original Audio
              </span>
            </div>
          </div>
        </div>
      </div>


      {/* 3. Right Sidebar Control Actions Stack */}
      <div className="flex flex-col items-center gap-5 ml-4 sm:ml-5 text-white z-20">
        
        {/* Like action */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={() => toggleLike()}
            className="p-3 bg-zinc-800/40 hover:bg-zinc-700/60 rounded-full hover:scale-105 active:scale-95 transition-all text-white border border-white/5"
            title="Like"
          >
            <Heart className={cn("size-6 transition-colors", likeData.isLikedByUser && "fill-red-500 text-red-500")} />
          </button>
          <span className="text-[11px] font-medium tracking-wide text-zinc-300">
            {likeData.likes.toLocaleString()}
          </span>
        </div>

        {/* Comment action */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={() => setIsCommentsOpen(true)}
            className="p-3 bg-zinc-800/40 hover:bg-zinc-700/60 rounded-full hover:scale-105 active:scale-95 transition-all text-white border border-white/5"
            title="Comments"
          >
            <MessageCircle className="size-6" />
          </button>
          <span className="text-[11px] font-medium tracking-wide text-zinc-300">
            {post._count.comments.toLocaleString()}
          </span>
        </div>

        {/* Direct/Share action */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={handleShareClick}
            className="p-3 bg-zinc-800/40 hover:bg-zinc-700/60 rounded-full hover:scale-105 active:scale-95 transition-all text-white border border-white/5"
            title="Copy Link"
          >
            <Send className="size-6" />
          </button>
          <span className="text-[11px] font-medium tracking-wide text-zinc-300">Share</span>
        </div>

        {/* Save/Bookmark action */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={() => toggleBookmark()}
            className="p-3 bg-zinc-800/40 hover:bg-zinc-700/60 rounded-full hover:scale-105 active:scale-95 transition-all text-white border border-white/5"
            title="Save"
          >
            <Bookmark className={cn("size-6", bookmarkData.isBookmarkedByUser && "fill-primary text-primary")} />
          </button>
          <span className="text-[11px] font-medium tracking-wide text-zinc-300">Save</span>
        </div>

        {/* Shop action button (only if products are detected and completed) */}
        {currentStatus === "COMPLETED" && detectedProducts.length > 0 && (
          <div className="flex flex-col items-center gap-1 relative">
            <button
              onClick={() => {
                setShowHotspots(!showHotspots);
                toast({
                  description: showHotspots ? "Shopping tags hidden" : "Shopping tags visible (click a tag to shop)",
                });
              }}
              className={cn(
                "p-3 rounded-full hover:scale-105 active:scale-95 transition-all border border-white/5 relative",
                showHotspots ? "bg-zinc-700/70 text-yellow-500" : "bg-zinc-800/40 text-white hover:bg-zinc-700/60"
              )}
              title="Shop Look"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
              <span className="absolute top-0.5 right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-500"></span>
              </span>
            </button>
            <span className="text-[11px] font-medium tracking-wide text-zinc-300">Shop</span>
          </div>
        )}

        {/* More options action */}
        <button
          onClick={() => setIsOptionsOpen(true)}
          className="p-3 bg-zinc-800/40 hover:bg-zinc-700/60 rounded-full hover:scale-105 active:scale-95 transition-all text-white border border-white/5"
          title="More Options"
        >
          <MoreHorizontal className="size-6" />
        </button>

        {/* Rotating Music Disc */}
        <div
          className="w-8 h-8 rounded-full border border-white/60 overflow-hidden animate-spin flex items-center justify-center bg-zinc-950 mt-1 select-none pointer-events-none"
          style={{ animationDuration: "8s" }}
        >
          <UserAvatar avatarUrl={post.user.avatarUrl} size={22} />
        </div>
      </div>

      {/* Options Dialog Modal */}
      {isOptionsOpen && (
        <ReelOptionsDialog
          post={post}
          open={isOptionsOpen}
          onOpenChange={setIsOptionsOpen}
          hasProducts={detectedProducts.length > 0}
          onShopProductsClick={() => {
            setIsOptionsOpen(false);
            if (videoRef.current && !videoRef.current.paused) {
              videoRef.current.pause();
              setIsPlaying(false);
            }
            setIsShoppingDrawerOpen(true);
          }}
        />
      )}

      {/* Comment Dialog Modal */}
      {isCommentsOpen && (
        <ReelsCommentDialog
          post={post}
          open={isCommentsOpen}
          onOpenChange={setIsCommentsOpen}
        />
      )}

      {/* Backdrop dimming overlay */}
      {isShoppingDrawerOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 cursor-pointer animate-in fade-in duration-300"
          onClick={() => {
            setIsShoppingDrawerOpen(false);
            if (videoRef.current) {
              videoRef.current.play().then(() => setIsPlaying(true)).catch((err) => console.error(err));
            }
          }}
        />
      )}

      {/* Fixed Right-Side Shopping Drawer Panel */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-80 sm:w-96 bg-zinc-950/98 border-l border-zinc-900 shadow-2xl transition-transform duration-300 ease-in-out flex flex-col",
          isShoppingDrawerOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h3 className="text-xs font-bold tracking-wide text-white uppercase flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-4 text-yellow-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
            <span>Shop the Look</span>
          </h3>
          <button
            onClick={() => {
              setIsShoppingDrawerOpen(false);
              if (videoRef.current) {
                videoRef.current.play().then(() => setIsPlaying(true)).catch((err) => console.error(err));
              }
            }}
            className="text-zinc-400 hover:text-white text-[11px] font-bold px-2.5 py-1 bg-zinc-905 hover:bg-zinc-850 border border-zinc-800 rounded-md transition-colors"
          >
            Close
          </button>
        </div>

        {/* Drawer Product List */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-zinc-800">
          <ProductList detectedProducts={detectedProducts} />
        </div>
      </div>
    </div>
  );
}

// Bounding box safe extraction helper
interface NormalizedVertex {
  x?: number;
  y?: number;
}

function getBoundingBox(box: any) {
  if (!box || !Array.isArray(box) || box.length === 0) return null;
  const vertices = box as NormalizedVertex[];

  const xs = vertices.map((v) => v.x ?? 0);
  const ys = vertices.map((v) => v.y ?? 0);

  const xMin = Math.min(...xs);
  const yMin = Math.min(...ys);
  const xMax = Math.max(...xs);
  const yMax = Math.max(...ys);

  return {
    left: xMin * 100,
    top: yMin * 100,
    width: (xMax - xMin) * 100,
    height: (yMax - yMin) * 100,
    xMin,
    yMin,
    xMax,
    yMax,
    centerX: ((xMin + xMax) / 2) * 100,
    centerY: ((yMin + yMax) / 2) * 100,
  };
}

function ProductList({ detectedProducts }: { detectedProducts: any[] }) {
  if (!detectedProducts || detectedProducts.length === 0) {
    return (
      <div className="text-center py-8 text-xs text-zinc-400">
        No products found in this video.
      </div>
    );
  }

  // Group products by category
  const categoriesMap: Record<string, any[]> = {};
  detectedProducts.forEach((prod) => {
    const category = prod.category || "👕 Clothing & Apparel";
    if (!categoriesMap[category]) {
      categoriesMap[category] = [];
    }
    categoriesMap[category].push(prod);
  });

  return (
    <div className="flex flex-col gap-6 pb-6 select-none animate-in fade-in duration-300">
      {Object.entries(categoriesMap).map(([categoryName, items]) => (
        <div key={categoryName} className="flex flex-col gap-3">
          {/* Category Header */}
          <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-800/80 pb-2 px-1">
            {categoryName}
          </div>
          
          {/* List of items in this category */}
          <div className="flex flex-col gap-5 pl-1">
            {items.map((item) => (
              <SingleProductItem key={item.id} product={item} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SingleProductItem({ product }: { product: any }) {
  const label = product.label;
  const matches = product.matches || [];

  if (matches.length === 0) {
    return (
      <div className="flex flex-col gap-2 pl-3 border-l border-zinc-800 relative">
        <span className="absolute -left-[4px] top-[12px] w-2.5 h-2.5 rounded-full bg-zinc-800 border border-zinc-900" />
        <div className="text-xs font-bold text-zinc-150 capitalize flex items-center gap-1.5 leading-none mb-1 select-text">
          <span>├─</span>
          <span className="truncate max-w-[200px]" title={label}>{label}</span>
        </div>
        <div className="text-[11px] text-zinc-500 py-1 pl-3 italic">
          No matches found for &quot;{label}&quot;.
        </div>
      </div>
    );
  }

  // Parse price helper
  const parsePrice = (priceStr: string): number => {
    const num = parseInt(priceStr.replace(/[^0-9]/g, ""), 10);
    return isNaN(num) ? Infinity : num;
  };

  // Sort lowest to highest price
  const sortedMatches = [...matches].sort((a, b) => parsePrice(a.price) - parsePrice(b.price));

  // Delivery tag generator
  const getDeliveryTag = (merchant: string): string => {
    const m = merchant.toLowerCase();
    if (m.includes("amazon")) return "Delivery by tomorrow";
    if (m.includes("flipkart")) return "Delivery in 2 days";
    if (m.includes("myntra")) return "Delivery in 3 days";
    if (m.includes("ajio")) return "Delivery in 4 days";
    if (m.includes("zara")) return "Delivery in 2-3 days";
    return "Delivery in 3-5 days";
  };

  return (
    <div className="flex flex-col gap-2 pl-3 border-l border-zinc-800 relative animate-in fade-in duration-200">
      {/* Visual connection dot on the timeline-like border */}
      <span className="absolute -left-[4px] top-[12px] w-2.5 h-2.5 rounded-full bg-zinc-800 border border-zinc-900" />
      
      {/* Product Name Header */}
      <div className="text-xs font-bold text-zinc-100 capitalize flex items-center gap-1.5 leading-none mb-1 select-text">
        <span>├─</span>
        <span className="truncate max-w-[200px]" title={label}>{label}</span>
      </div>

      {/* Offers List */}
      <div className="flex flex-col gap-2 mt-1">
        {sortedMatches.slice(0, 3).map((match: any, idx: number) => {
          const deliveryLabel = getDeliveryTag(match.sourceStore);
          return (
            <a
              key={match.id || idx}
              href={match.productUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-between gap-2.5 bg-zinc-900/40 hover:bg-zinc-850/60 border border-zinc-900 hover:border-zinc-800 p-2.5 rounded-lg transition-all group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {match.imageUrl ? (
                  <div className="w-8 h-8 rounded-md overflow-hidden flex-shrink-0 border border-zinc-800 bg-zinc-950">
                    <img src={match.imageUrl} alt={match.sourceStore} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-md bg-zinc-850 flex items-center justify-center text-[10px] text-zinc-500">
                    🛒
                  </div>
                )}
                <div className="min-w-0">
                  <span className="text-[11px] font-bold text-zinc-200 block truncate group-hover:text-white leading-tight">
                    {match.sourceStore}
                  </span>
                  <span className="text-[8px] font-semibold text-emerald-555 bg-emerald-950/20 px-1 py-0.5 rounded mt-0.5 inline-block">
                    {deliveryLabel}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="text-right">
                  <span className="text-[12px] font-extrabold text-yellow-500 block">
                    {match.price}
                  </span>
                </div>
                <span className="text-[9px] font-bold text-white bg-zinc-800 group-hover:bg-gradient-to-r group-hover:from-yellow-500 group-hover:to-red-500 px-2 py-1 border border-zinc-700/40 group-hover:border-transparent rounded transition-all">
                  BUY
                </span>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
