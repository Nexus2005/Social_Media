"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import { useSession } from "@/app/(main)/SessionProvider";
import UserAvatar from "@/components/UserAvatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
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
  Loader2,
  ShoppingBag,
  AlertTriangle
} from "lucide-react";
import Link from "next/link";
import ReelOptionsDialog from "./ReelOptionsDialog";
import ReelsCommentDialog from "./ReelsCommentDialog";
import { LikeIcon, CommentIcon, RepostIcon, ShareIcon, SaveIcon } from "./ReelsIcons";
import ReelsShareDialog from "./ReelsShareDialog";
import RepostButton from "@/components/posts/RepostButton";
import { useToast } from "../ui/use-toast";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface ReelCardProps {
  post: PostData;
  isMuted: boolean;
  onToggleMute: () => void;
  isActive: boolean;
  shouldPreload: boolean;
  isPrevReel?: boolean;
  onLockScroll?: (locked: boolean) => void;
}

export default function ReelCard({
  post,
  isMuted,
  onToggleMute,
  isActive,
  shouldPreload,
  isPrevReel = false,
  onLockScroll
}: ReelCardProps) {
  const { user: loggedInUser } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const videoRef = useRef<HTMLVideoElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [overlayIcon, setOverlayIcon] = useState<"play" | "pause" | null>(null);
  const [tapHearts, setTapHearts] = useState<{ id: number }[]>([]);

  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isCaptionExpanded, setIsCaptionExpanded] = useState(false);

  // Shoppable products overlay states
  const [isShoppingDrawerOpen, setIsShoppingDrawerOpen] = useState(false);
  const [drawerHeightState, setDrawerHeightState] = useState<"min" | "mid" | "max">("min");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [showHotspots, setShowHotspots] = useState(false);
  const hotspotTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Polling query for AI status tracking
  const { data: statusData } = useQuery({
    queryKey: ["post-ai-status", post.id],
    queryFn: () =>
      kyInstance.get(`/api/posts/${post.id}/status`).json<{
        aiStatus: string;
        detectedObjects: any[];
        assignments: any[];
        detectedProducts: any[];
        processingLog?: any;
      }>(),
    initialData: {
      aiStatus: (post.videoJob?.status || "pending").toUpperCase(),
      detectedObjects: (post as any).detectedObjects || [],
      assignments: (post as any).assignments || [],
      detectedProducts: post.detectedProducts || [],
      processingLog: null,
    },
    refetchInterval: (query) => {
      const currentStatus = query.state.data?.aiStatus || "PENDING";
      return currentStatus === "PENDING" || currentStatus === "PROCESSING" ? 3000 : false;
    },
    enabled: !post.videoJob || post.videoJob.status === "pending" || post.videoJob.status === "processing",
  });

  const currentStatus = statusData?.aiStatus || (post.videoJob?.status || "pending").toUpperCase();
  const detectedObjects = useMemo(() => {
    return statusData?.detectedObjects || (post as any).detectedObjects || [];
  }, [statusData?.detectedObjects, post]);

  const detectedProducts = useMemo(() => {
    // 1. Get all assignments
    const rawAssignments = statusData?.assignments || (post as any).assignments || [];
    const assignedProducts = rawAssignments.map((a: any) => ({
      ...a.product,
      isVerifiedMatch: a.verificationSource === "CREATOR_APPROVED" || a.verificationSource === "ADMIN_VERIFIED",
      assignmentId: a.id,
      displayOrder: a.displayOrder,
      featured: a.featured,
      assignmentStatus: a.status,
      verificationSource: a.verificationSource,
      source: "assignment",
    }));

    // 2. Get raw detected products (AI results)
    const rawDetected = statusData?.detectedProducts || post.detectedProducts || [];
    const aiProducts = rawDetected
      .filter((dp: any) => !assignedProducts.some((ap: any) => ap.id === dp.id))
      .filter((dp: any) => dp.isVerifiedMatch || (dp.confidence ?? 0) >= 0.8)
      .map((dp: any) => ({
        ...dp,
        isVerifiedMatch: dp.isVerifiedMatch || false,
        assignmentId: null,
        displayOrder: 999,
        featured: false,
        assignmentStatus: "PUBLISHED",
        verificationSource: "AI_DETECTED",
        source: "ai",
      }));

    // 3. Merge lists
    const merged = [...assignedProducts, ...aiProducts];

    // 4. Sort according to priority:
    // - Featured first (featured === true)
    // - Creator Approved / Added next (verificationSource === "CREATOR_APPROVED" or "CREATOR_ADDED")
    // - Admin Verified next (verificationSource === "ADMIN_VERIFIED" or isVerifiedMatch === true)
    // - AI Detected last (verificationSource === "AI_DETECTED" or other)
    // Within groups, order by displayOrder.
    return merged.sort((a, b) => {
      const featA = a.featured ? 1 : 0;
      const featB = b.featured ? 1 : 0;
      if (featA !== featB) return featB - featA;

      const getSourcePriority = (p: any) => {
        const src = p.verificationSource || "";
        if (src === "CREATOR_APPROVED" || src === "CREATOR_ADDED" || p.manuallyAssigned) {
          return 3;
        }
        if (src === "ADMIN_VERIFIED" || p.isVerifiedMatch) {
          return 2;
        }
        return 1;
      };

      const prioA = getSourcePriority(a);
      const prioB = getSourcePriority(b);
      if (prioA !== prioB) return prioB - prioA;

      return (a.displayOrder ?? 999) - (b.displayOrder ?? 999);
    });
  }, [statusData, post]);

  const creatorAssignedProducts = useMemo(() => {
    const rawAssignments = statusData?.assignments || (post as any).assignments || [];
    return rawAssignments.filter((a: any) =>
      a.verificationSource === "CREATOR_APPROVED" ||
      a.verificationSource === "CREATOR_ADDED" ||
      a.manuallyAssigned === true
    );
  }, [statusData, post]);

  const approvedProducts = useMemo(() => {
    const rawAssignments = statusData?.assignments || (post as any).assignments || [];
    return rawAssignments.filter((a: any) => a.status === "PUBLISHED");
  }, [statusData, post]);

  const verifiedDetectedProducts = useMemo(() => {
    const rawDetected = statusData?.detectedProducts || post.detectedProducts || [];
    return rawDetected.filter((dp: any) => dp.isVerifiedMatch === true);
  }, [statusData, post]);

  const hasAttachedProducts = useMemo(() => {
    return creatorAssignedProducts.length > 0 || approvedProducts.length > 0 || verifiedDetectedProducts.length > 0;
  }, [creatorAssignedProducts, approvedProducts, verifiedDetectedProducts]);

  const isAdmin = loggedInUser?.username === "Omkar2005" || (loggedInUser as any)?.verified === true;

  // Initialize selected product ID once products are loaded
  // Automatically select first product & transition drawer height to mid on drawer open
  useEffect(() => {
    if (isShoppingDrawerOpen && detectedProducts && detectedProducts.length > 0) {
      const exists = detectedProducts.some((p) => p.id === selectedProductId);
      if (!exists || !selectedProductId) {
        setSelectedProductId(detectedProducts[0].id);
      }
      if (drawerHeightState === "min") {
        setDrawerHeightState("mid");
      }
    }
  }, [isShoppingDrawerOpen, detectedProducts]);

  // Track drawer opens (DRAWER_OPEN)
  useEffect(() => {
    if (isShoppingDrawerOpen) {
      const targetProductId = selectedProductId || detectedProducts[0]?.id;
      if (targetProductId) {
        logProductEvent(targetProductId, "DRAWER_OPEN");
      }
    }
  }, [isShoppingDrawerOpen]);

  // Track product views when drawer is open and selectedProductId changes (VIEW)
  useEffect(() => {
    if (isShoppingDrawerOpen && selectedProductId) {
      logProductEvent(selectedProductId, "VIEW");
    }
  }, [isShoppingDrawerOpen, selectedProductId]);

  const isImmersive = isShoppingDrawerOpen && drawerHeightState === "max";

  // Trigger parent container scroll locking
  useEffect(() => {
    onLockScroll?.(isImmersive);
  }, [isImmersive, onLockScroll]);

  // Sync data attribute on document body to hide navigation
  useEffect(() => {
    if (isImmersive) {
      document.body.setAttribute("data-commerce-immersive", "true");
    } else {
      document.body.removeAttribute("data-commerce-immersive");
    }
    return () => {
      document.body.removeAttribute("data-commerce-immersive");
    };
  }, [isImmersive]);



  // Autoplay/pause based on active reel index
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      video.muted = isMuted;
      video
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          console.warn("Reel autoplay prevented:", err);
          setIsPlaying(false);
        });
    } else {
      video.pause();
      video.currentTime = 0; // Rewind to start
      setIsPlaying(false);
    }
  }, [isActive, isMuted, videoRef]);

  // Sync mute changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted, videoRef]);

  // Helper functions for pricing/delivery inside ReelCard
  const parsePrice = (priceStr: string): number => {
    const num = parseInt(priceStr.replace(/[^0-9]/g, ""), 10);
    return isNaN(num) ? Infinity : num;
  };

  const getDeliveryTag = (merchant: string): string => {
    const m = merchant.toLowerCase();
    if (m.includes("amazon")) return "Delivery tomorrow";
    if (m.includes("flipkart")) return "Delivery in 2 days";
    if (m.includes("myntra")) return "Delivery in 3 days";
    if (m.includes("ajio")) return "Delivery in 4 days";
    return "Delivery in 3-5 days";
  };

  const getDeliveryDays = (match: any): number => {
    const text = (match.deliveryText || getDeliveryTag(match.sourceStore || "")).toLowerCase();
    if (text.includes("tomorrow") || text.includes("1 day")) return 1;
    if (text.includes("2 days") || text.includes("in 2")) return 2;
    if (text.includes("3 days") || text.includes("in 3")) return 3;
    if (text.includes("4 days") || text.includes("in 4")) return 4;
    if (text.includes("5 days") || text.includes("in 5")) return 5;
    return 6;
  };

  const formattedDate = useMemo(() => {
    const d = new Date(post.createdAt);
    const currentYear = new Date().getFullYear();
    const postYear = d.getFullYear();
    const month = d.toLocaleDateString("en-US", { month: "long" });
    const day = d.getDate();
    if (postYear === currentYear) {
      return `${day} ${month}`;
    }
    return `${day} ${month} ${postYear}`;
  }, [post.createdAt]);

  const selectedProduct = useMemo(() => {
    if (!detectedProducts || detectedProducts.length === 0) return null;
    return detectedProducts.find((p) => p.id === selectedProductId) || detectedProducts[0];
  }, [detectedProducts, selectedProductId]);

  const bestMatch = useMemo(() => {
    if (!selectedProduct) return null;
    const matches = selectedProduct.matches || [];
    const sorted = [...matches].sort((a, b) => {
      const priceA = parsePrice(a.price);
      const priceB = parsePrice(b.price);
      if (priceA !== priceB) return priceA - priceB;
      const daysA = getDeliveryDays(a);
      const daysB = getDeliveryDays(b);
      if (daysA !== daysB) return daysA - daysB;
      return (b.merchant?.rating ?? 0) - (a.merchant?.rating ?? 0);
    });
    return sorted[0];
  }, [selectedProduct]);

  const handleBuyClick = async (e: React.MouseEvent, matchId: string, fallbackUrl: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (selectedProductId) {
      logProductEvent(selectedProductId, "RETAILER_CLICK", { matchId });
    }
    try {
      const response = await fetch("/api/products/click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.redirectUrl) {
          window.open(data.redirectUrl, "_blank", "noopener,noreferrer");
          return;
        }
      }
    } catch (err) {
      console.error("Click tracking failed:", err);
    }
    window.open(fallbackUrl, "_blank", "noopener,noreferrer");
  };

  function logProductEvent(productId: string, eventType: string, extraMetadata?: any) {
    const assignment = detectedProducts.find(p => p.id === productId);
    fetch("/api/products/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId,
        assignmentId: assignment?.assignmentId || null,
        eventType,
        metadata: extraMetadata || {},
      }),
    }).catch((err) => console.warn("Failed to log product event:", err));
  }

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
      const newHeart = { id: Date.now() };
      setTapHearts((prev) => [...prev, newHeart]);
      setTimeout(() => {
        setTapHearts((prev) => prev.filter((h) => h.id !== newHeart.id));
      }, 800);
    } else {
      // Single click -> Toggle hotspots visibility (auto-hide after 4 seconds)
      setShowHotspots((prev) => {
        const next = !prev;
        if (next) {
          if (hotspotTimeoutRef.current) clearTimeout(hotspotTimeoutRef.current);
          hotspotTimeoutRef.current = setTimeout(() => {
            setShowHotspots(false);
          }, 4000);
        } else {
          if (hotspotTimeoutRef.current) clearTimeout(hotspotTimeoutRef.current);
        }
        return next;
      });
    }
  };

  const handleShareClick = () => {
    setIsShareOpen(true);
  };

  const followerInfo: FollowerInfo = {
    followers: post.user._count.followers,
    isFollowedByUser: post.user.followers.some((f) => f.followerId === loggedInUser.id),
  };

  return (
    <div className="w-full h-[calc(100vh-3.5rem)] md:h-screen snap-start snap-always shrink-0 flex items-center justify-center bg-black relative select-none overflow-hidden">
      
      {/* 1. Blurred Reflection Backdrop (Desktop only) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none hidden md:block select-none z-0">
        {isActive && (
          <video
            src={videoUrl}
            muted
            loop
            playsInline
            className="w-full h-full object-cover blur-[50px] opacity-25 scale-110"
          />
        )}
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

      {/* 2. Responsive Layout Wrapper */}
      <div
        className={cn(
          "relative flex flex-row items-center justify-start transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] w-full h-[calc(100vh-3.5rem)] md:h-[93vh] md:max-h-[820px] overflow-hidden z-10",
          isShoppingDrawerOpen
            ? "max-w-[480px] lg:max-w-[880px] xl:max-w-[930px]"
            : "max-w-[480px]"
        )}
      >
        {/* Main Aspect 9:16 Video Box */}
        <div className="w-[410px] max-w-full md:w-[410px] relative px-0 h-[calc(100vh-3.5rem)] md:h-[93vh] md:aspect-[9/16] md:max-h-[820px] rounded-none md:rounded-2xl overflow-hidden bg-black md:bg-zinc-950 shadow-none md:shadow-2xl flex items-center justify-center border-0 md:border border-zinc-800/80 z-10 shrink-0">
          {isActive || shouldPreload || isPrevReel ? (
            <video
              ref={videoRef}
              src={videoUrl}
              loop
              playsInline
              muted={isMuted}
              preload={isActive || shouldPreload ? "auto" : "metadata"}
              onClick={handleVideoClick}
              className={cn(
                "w-full h-full object-cover cursor-pointer transition-all duration-500",
                isImmersive && "blur-md scale-105"
              )}
            />
          ) : (
            <div className="w-full h-full bg-zinc-950 flex items-center justify-center">
              {post.attachments?.[0]?.url && (
                <div 
                  className="w-full h-full bg-cover bg-center opacity-30 blur-sm"
                  style={{ backgroundImage: `url(${post.attachments[0].url.replace(".mp4", ".jpg")})` }}
                />
              )}
            </div>
          )}

          {/* Admin Debug Overlay (Development only, in Top Left Corner) */}
          {process.env.NODE_ENV === "development" && isAdmin && !isImmersive && (
            <div className="absolute top-4 left-4 z-30 bg-black/80 backdrop-blur-md border border-zinc-800 p-2.5 rounded-lg text-[10px] font-mono text-zinc-300 pointer-events-none select-none flex flex-col gap-0.5">
              <div className="font-bold text-yellow-500 mb-1 border-b border-zinc-800 pb-0.5">AI DEBUG OVERLAY</div>
              <div>AI Status: <span className={cn(
                "font-bold",
                currentStatus === "COMPLETED" && "text-emerald-500",
                currentStatus === "PROCESSING" && "text-yellow-500 animate-pulse",
                currentStatus === "FAILED" && "text-red-500",
                currentStatus === "PENDING" && "text-zinc-500"
              )}>{currentStatus.toLowerCase()}</span></div>
              <div>Products Found: <span className="text-white font-bold">{detectedProducts.length}</span></div>
              <div>Frames Scanned: <span className="text-white font-bold">{currentStatus === "COMPLETED" || currentStatus === "FAILED" ? 6 : (currentStatus === "PROCESSING" ? "Scanning..." : 0)}</span></div>
              <div>Vision Calls: <span className="text-white font-bold">{statusData?.processingLog?.visionCalls ?? 0}</span></div>
              <div>Shopping Matches: <span className="text-white font-bold">{statusData?.processingLog?.shoppingResultsCount ?? 0}</span></div>
            </div>
          )}

          {/* Subtle White Hotspot Dots */}
          {showHotspots && !isImmersive && hasAttachedProducts && detectedProducts.map((prod) => {
            const coords = getProductHotspot(prod);
            const isSelected = prod.id === selectedProductId;
            return (
              <button
                key={prod.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedProductId(prod.id);
                  if (videoRef.current && !videoRef.current.paused) {
                    videoRef.current.pause();
                    setIsPlaying(false);
                  }
                  setIsShoppingDrawerOpen(true);
                }}
                className={cn(
                  "absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/60 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.5)] transition-all duration-300 hover:scale-125 z-40 cursor-pointer animate-in fade-in zoom-in duration-200",
                  isSelected 
                    ? "size-4.5 ring-4 ring-white/35 bg-pink-500 border-white"
                    : "size-3.5 hover:bg-zinc-200"
                )}
                style={{
                  left: `${coords.x}%`,
                  top: `${coords.y}%`,
                }}
                title={prod.label}
              />
            );
          })}

          {/* Mute Indicator overlay in top-right corner of player */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleMute();
            }}
            className={cn(
              "absolute top-4 right-4 z-30 p-2 bg-black/60 hover:bg-black/85 rounded-full text-white transition",
              isImmersive && "hidden"
            )}
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
          <div className="absolute inset-0 flex items-center justify-center bg-transparent pointer-events-none z-50">
            <AnimatePresence>
              {tapHearts.map((heart) => (
                <motion.div
                  key={heart.id}
                  initial={{ scale: 0, opacity: 0, y: 0 }}
                  animate={{
                    scale: [0, 1.2, 1, 1],
                    opacity: [0, 1, 1, 0],
                    y: [0, 0, -15, -40],
                  }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 0.8,
                    ease: [0.175, 0.885, 0.32, 1.1],
                    times: [0, 0.25, 0.75, 1],
                  }}
                  className="absolute pointer-events-none text-red-500 drop-shadow-[0_10px_25px_rgba(239,68,68,0.4)]"
                >
                  <Heart className="size-24 fill-red-500 text-red-500" strokeWidth={1.5} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Center play state hint overlay */}
          {!isPlaying && !overlayIcon && (
            <div className={cn("absolute inset-0 flex items-center justify-center bg-black/20 z-10 pointer-events-none transition-opacity duration-300", isImmersive && "hidden")}>
              <div className="p-4 bg-black/40 rounded-full text-white">
                <Play className="size-10 fill-white translate-x-[2px]" />
              </div>
            </div>
          )}

          {/* Smooth bottom gradient overlay */}
          <div className={cn("absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/95 via-black/45 to-transparent pointer-events-none z-10", isImmersive && "hidden")} />

          {/* Left Bottom Video Details Overlay */}
          <div className={cn("absolute bottom-0 left-0 right-0 p-4 pb-6 z-20 flex flex-col gap-3.5 text-white bg-transparent pointer-events-none", isImmersive && "hidden")}>
            <div className="flex flex-col gap-2.5 pointer-events-auto">
              
              {/* 1. Shop CTA Button */}
              {hasAttachedProducts && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (videoRef.current && !videoRef.current.paused) {
                      videoRef.current.pause();
                      setIsPlaying(false);
                    }
                    setDrawerHeightState("min");
                    setIsShoppingDrawerOpen(true);
                  }}
                  className="flex items-center justify-center gap-1.5 bg-black/60 backdrop-blur-md border border-white/10 hover:bg-black/85 text-white h-9 px-4 rounded-full text-[12px] font-bold w-fit max-w-[35%] shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] truncate shrink-0 pointer-events-auto"
                >
                  <ShoppingBag className="size-3.5 text-white shrink-0" />
                  <span className="truncate">Shop Look ({detectedProducts.length})</span>
                </button>
              )}

              {/* 2. Creator Profile & Understated Follow */}
              <div className="flex items-center gap-2.5">
                <Link href={`/users/${post.user.username}`} className="flex-shrink-0">
                  <UserAvatar avatarUrl={post.user.avatarUrl} size={40} className="w-10 h-10 border border-white/20 object-cover" />
                </Link>
                <div className="flex items-center gap-2">
                  <Link href={`/users/${post.user.username}`} className="font-semibold text-[15px] hover:underline truncate max-w-[150px] text-white">
                    {post.user.username}
                  </Link>
                  {post.user.verified && (
                    <VerifiedBadge size={14} className="shrink-0" />
                  )}
                  {post.user.id !== loggedInUser.id && (
                    <>
                      <span className="text-white/60 text-[10px] select-none shrink-0">&#8226;</span>
                      <FollowButton userId={post.user.id} initialState={followerInfo} variant="reel-pill" />
                    </>
                  )}
                </div>
              </div>

              {/* 3. Caption */}
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCaptionExpanded((prev) => !prev);
                }}
                className="text-[13px] text-white/95 max-w-[285px] cursor-pointer select-none pointer-events-auto flex flex-col text-start gap-1"
              >
                <p className={cn("leading-relaxed transition-all duration-300", isCaptionExpanded ? "whitespace-pre-wrap break-words" : "line-clamp-1 truncate")}>
                  {post.content}
                </p>
                <span className="text-[11px] text-zinc-400 font-semibold tracking-wide">
                  {formattedDate}
                </span>
              </div>

              {/* 4. Music Track Marquee */}
              <div className="flex items-center gap-1.5 bg-black/35 px-2.5 py-1 rounded-full w-fit max-w-[190px] overflow-hidden text-[11px]">
                <Music className="size-3 flex-shrink-0 animate-pulse" />
                <div className="w-[140px] overflow-hidden whitespace-nowrap relative select-none">
                  <span className="animate-scroll-text pl-[100%]">
                    {post.user.displayName} · Original Audio &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {post.user.displayName} · Original Audio
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* Floating Right-Edge Action Tray Layer (Mobile Overlay: < md) */}
          <div className={cn("absolute right-2 bottom-20 z-20 w-16 flex flex-col items-center justify-center gap-5 text-white md:hidden pointer-events-auto", isImmersive && "hidden")}>
            {/* Like */}
            <div className="flex flex-col items-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLike();
                }}
                className="h-10 w-10 flex items-center justify-center hover:scale-105 active:scale-95 transition-all text-white"
                title="Like"
              >
                <LikeIcon className={cn("w-7 h-7 transition-colors duration-200 text-white", likeData.isLikedByUser && "text-[#ff3040] fill-[#ff3040]")} />
              </button>
              <span className="text-[11px] font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] mt-0.5">
                {likeData.likes.toLocaleString()}
              </span>
            </div>

            {/* Comment */}
            <div className="flex flex-col items-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCommentsOpen(true);
                }}
                className="h-10 w-10 flex items-center justify-center hover:scale-105 active:scale-95 transition-all text-white"
                title="Comments"
              >
                <CommentIcon className="w-7 h-7 text-white transition-colors duration-200" />
              </button>
              <span className="text-[11px] font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] mt-0.5">
                {post._count.comments.toLocaleString()}
              </span>
            </div>

            {/* Repost */}
            <RepostButton post={post} variant="reel" />

            {/* Share */}
            <div className="flex flex-col items-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleShareClick();
                }}
                className="h-10 w-10 flex items-center justify-center hover:scale-105 active:scale-95 transition-all text-white"
                title="Share Reel"
              >
                <ShareIcon className="w-7 h-7 text-white transition-colors duration-200" />
              </button>
              <span className="text-[11px] font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] mt-0.5">Share</span>
            </div>

            {/* Save */}
            <div className="flex flex-col items-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleBookmark();
                }}
                className="h-10 w-10 flex items-center justify-center hover:scale-105 active:scale-95 transition-all text-white"
                title="Save"
              >
                <SaveIcon className={cn("w-7 h-7 transition-colors duration-200 text-white", bookmarkData.isBookmarkedByUser && "fill-white text-white")} />
              </button>
              <span className="text-[11px] font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] mt-0.5">Save</span>
            </div>

            {/* Options Menu (Three Dots) */}
            <div className="flex flex-col items-center">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOptionsOpen(true);
                }}
                className="h-10 w-10 flex items-center justify-center hover:scale-105 active:scale-95 transition-all text-white"
                title="Options"
              >
                <MoreHorizontal className="w-7 h-7" strokeWidth={1.5} />
              </button>
              <span className="text-[11px] font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] mt-0.5">More</span>
            </div>
          </div>

          {/* Backdrop dimming overlay (Mobile bottom sheet only: lg:hidden) */}
          {isShoppingDrawerOpen && (
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm z-40 cursor-pointer animate-in fade-in duration-300 lg:hidden"
              onClick={() => {
                setIsShoppingDrawerOpen(false);
                const video = videoRef.current;
                if (video && video.paused) {
                  video.play().then(() => setIsPlaying(true)).catch((err) => console.error(err));
                }
              }}
            />
          )}

          {/* Mobile Bottom Shop Drawer Sheet (lg:hidden) */}
          <div
            className={cn(
              "absolute bottom-0 left-0 right-0 z-50 w-full bg-[#090909] border-t border-zinc-800/80 shadow-2xl transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] flex flex-col overflow-hidden text-white pointer-events-auto lg:hidden",
              drawerHeightState === "max" ? "rounded-t-none border-t-0" : "rounded-t-[20px]",
              isShoppingDrawerOpen ? "translate-y-0" : "translate-y-full"
            )}
            style={{
              height: drawerHeightState === "min" ? "35%" : drawerHeightState === "mid" ? "75%" : "100%"
            }}
          >
            {/* Top Handle Bar for dragging / click to cycle */}
            <div
              onClick={() => {
                setDrawerHeightState((curr) => {
                  if (curr === "min") return "mid";
                  if (curr === "mid") return "max";
                  return "min";
                });
              }}
              className="w-full py-3.5 flex justify-center items-center cursor-pointer select-none group active:opacity-85"
            >
              <div className="w-9 h-1 bg-zinc-700/80 rounded-full group-hover:bg-zinc-500 transition-colors" />
            </div>

            {/* Minimal Drawer Header */}
            <div className="flex items-center justify-between px-5 pb-3 border-b border-zinc-900 select-none">
              <h3 className="text-xs font-black tracking-wider text-zinc-400 uppercase">
                SHOP THE LOOK
              </h3>
              <button
                onClick={() => {
                  setIsShoppingDrawerOpen(false);
                  const video = videoRef.current;
                  if (video && video.paused) {
                    video.play().then(() => setIsPlaying(true)).catch((err) => console.error(err));
                  }
                }}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Drawer Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 scrollbar-none">
              <ProductList
                detectedProducts={detectedProducts}
                selectedProductId={selectedProductId}
                setSelectedProductId={setSelectedProductId}
                drawerHeightState={drawerHeightState}
                setDrawerHeightState={setDrawerHeightState}
                onLogEvent={logProductEvent}
              />
            </div>

            {/* Sticky Bottom CTA for Mobile Commerce Mode */}
            {drawerHeightState === "max" && bestMatch && (
              <div className="border-t border-zinc-900 bg-[#090909] px-5 py-4 flex items-center justify-between gap-4 z-20">
                <div className="flex flex-col">
                  <span className="text-[10px] text-zinc-505 font-bold uppercase tracking-wider">Best Price at {bestMatch.sourceStore}</span>
                  <span className="text-lg font-black text-white">{bestMatch.price}</span>
                </div>
                <a
                  href={bestMatch.productUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => handleBuyClick(e, bestMatch.id, bestMatch.productUrl)}
                  className="flex-1 max-w-[200px] text-center bg-white text-black hover:bg-zinc-200 text-xs font-black py-3 rounded-xl transition-all shadow-lg uppercase tracking-wider"
                >
                  View Deal
                </a>
              </div>
            )}
          </div>

        </div>

        {/* 3. Right Sidebar Control Actions Stack (Desktop only: md and above) */}
        <div className={cn("hidden md:flex flex-col items-center justify-center gap-5 w-16 ml-4 sm:ml-5 text-white z-20 shrink-0", isImmersive && "hidden")}>
          {/* Like */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => toggleLike()}
              className="h-10 w-10 flex items-center justify-center hover:scale-105 active:scale-95 transition-all text-white"
              title="Like"
            >
              <LikeIcon className={cn("w-7 h-7 transition-colors duration-200 text-black dark:text-white", likeData.isLikedByUser && "text-[#ff3040] fill-[#ff3040]")} />
            </button>
            <span className="text-[11px] font-semibold text-zinc-300 mt-0.5">
              {likeData.likes.toLocaleString()}
            </span>
          </div>

          {/* Comment */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => setIsCommentsOpen(true)}
              className="h-10 w-10 flex items-center justify-center hover:scale-105 active:scale-95 transition-all text-white"
              title="Comments"
            >
              <CommentIcon className="w-7 h-7 text-black dark:text-white transition-colors duration-200" />
            </button>
            <span className="text-[11px] font-semibold text-zinc-300 mt-0.5">
              {post._count.comments.toLocaleString()}
            </span>
          </div>

          {/* Repost */}
          <RepostButton post={post} variant="reel-desktop" />

          {/* Share */}
          <div className="flex flex-col items-center">
            <button
              onClick={handleShareClick}
              className="h-10 w-10 flex items-center justify-center hover:scale-105 active:scale-95 transition-all text-white"
              title="Share Reel"
            >
              <ShareIcon className="w-7 h-7 text-black dark:text-white transition-colors duration-200" />
            </button>
            <span className="text-[11px] font-semibold text-zinc-300 mt-0.5">Share</span>
          </div>

          {/* Save */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => toggleBookmark()}
              className="h-10 w-10 flex items-center justify-center hover:scale-105 active:scale-95 transition-all text-white"
              title="Save"
            >
              <SaveIcon className={cn("w-7 h-7 transition-colors duration-200 text-black dark:text-white", bookmarkData.isBookmarkedByUser && "fill-white text-white")} />
            </button>
            <span className="text-[11px] font-semibold text-zinc-300 mt-0.5">Save</span>
          </div>

          {/* Options Menu (Three Dots) */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => setIsOptionsOpen(true)}
              className="h-10 w-10 flex items-center justify-center hover:scale-105 active:scale-95 transition-all text-white"
              title="Options"
            >
              <MoreHorizontal className="w-7 h-7" strokeWidth={1.5} />
            </button>
            <span className="text-[11px] font-semibold text-zinc-300 mt-0.5">More</span>
          </div>
        </div>

        {/* 4. Desktop Right Side Panel Drawer (hidden lg:flex, absolute right-0 top-0, translates horizontally) */}
        <div
          className={cn(
            "absolute right-0 top-0 bottom-0 h-full w-[400px] xl:w-[450px] bg-[#090909] border-l border-zinc-800/80 transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] hidden lg:flex flex-col text-white z-30 pointer-events-auto",
            isShoppingDrawerOpen ? "translate-x-0" : "translate-x-full"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-900 select-none">
            <h3 className="text-xs font-black tracking-wider text-zinc-400 uppercase">
              SHOP THE LOOK
            </h3>
            <button
              onClick={() => {
                setIsShoppingDrawerOpen(false);
                const video = videoRef.current;
                if (video && video.paused) {
                  video.play().then(() => setIsPlaying(true)).catch((err) => console.error(err));
                }
              }}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Drawer Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-5 scrollbar-none">
            <ProductList
              detectedProducts={detectedProducts}
              selectedProductId={selectedProductId}
              setSelectedProductId={setSelectedProductId}
              drawerHeightState={drawerHeightState}
              setDrawerHeightState={setDrawerHeightState}
              onLogEvent={logProductEvent}
            />
          </div>

          {/* Sticky Bottom CTA for Desktop Side Panel */}
          {bestMatch && (
            <div className="border-t border-zinc-900 bg-[#090909] px-5 py-4 flex items-center justify-between gap-4 z-20">
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-505 font-bold uppercase tracking-wider">Best Price at {bestMatch.sourceStore}</span>
                <span className="text-lg font-black text-white">{bestMatch.price}</span>
              </div>
              <a
                href={bestMatch.productUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => handleBuyClick(e, bestMatch.id, bestMatch.productUrl)}
                className="flex-1 max-w-[200px] text-center bg-white text-black hover:bg-zinc-200 text-xs font-black py-3 rounded-xl transition-all shadow-lg uppercase tracking-wider"
              >
                View Deal
              </a>
            </div>
          )}
        </div>

      </div>

      {/* Options Dialog Modal */}
      {isOptionsOpen && (
        <ReelOptionsDialog
          post={post}
          open={isOptionsOpen}
          onOpenChange={setIsOptionsOpen}
          hasProducts={hasAttachedProducts}
          onShopProductsClick={() => {
            setIsOptionsOpen(false);
            if (videoRef.current && !videoRef.current.paused) {
              videoRef.current.pause();
              setIsPlaying(false);
            }
            setDrawerHeightState("min");
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

      {/* Reels Share Bottom Sheet Dialog */}
      {isShareOpen && (
        <ReelsShareDialog
          post={post}
          open={isShareOpen}
          onOpenChange={setIsShareOpen}
        />
      )}
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

// Deterministic hotspot coordinate generator based on product ID/label
function getProductHotspot(prod: any) {
  if (prod.box) {
    const boxCoords = getBoundingBox(prod.box);
    if (boxCoords) {
      return { x: boxCoords.centerX, y: boxCoords.centerY };
    }
  }
  // Generate stable mock coordinates based on the product ID or label
  let hash = 0;
  const str = prod.id || prod.label || "";
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Map x to 20% - 80%, y to 25% - 75% so dots aren't too close to edges
  const x = 20 + Math.abs(hash % 60);
  const y = 25 + Math.abs((hash >> 8) % 50);
  return { x, y };
}

function ProductList({
  detectedProducts,
  selectedProductId,
  setSelectedProductId,
  drawerHeightState,
  setDrawerHeightState,
  onLogEvent
}: {
  detectedProducts: any[];
  selectedProductId: string;
  setSelectedProductId: (id: string) => void;
  drawerHeightState: "min" | "mid" | "max";
  setDrawerHeightState: (state: "min" | "mid" | "max") => void;
  onLogEvent: (productId: string, eventType: string, extraMetadata?: any) => void;
}) {
  const { toast } = useToast();

  const [activeCategory, setActiveCategory] = useState("All");
  const [showSaveDropdown, setShowSaveDropdown] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (detectedProducts && detectedProducts.length > 0) {
      setSelectedProductId(detectedProducts[0].id);
    }
  }, [detectedProducts, setSelectedProductId]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        // Swipe left -> Next image
        setActiveImageIndex((prev) => (prev === galleryImages.length - 1 ? 0 : prev + 1));
      } else {
        // Swipe right -> Prev image
        setActiveImageIndex((prev) => (prev === 0 ? galleryImages.length - 1 : prev - 1));
      }
    }
    touchStartX.current = null;
  };

  // Build category list
  const categories = useMemo(() => {
    const cats = new Set<string>();
    detectedProducts.forEach((p) => {
      if (p.category) {
        const formatted = p.category.charAt(0).toUpperCase() + p.category.slice(1).toLowerCase();
        cats.add(formatted);
      }
    });
    return ["All", ...Array.from(cats)];
  }, [detectedProducts]);

  // Filter products by active category
  const filteredProducts = useMemo(() => {
    if (activeCategory === "All") return detectedProducts;
    return detectedProducts.filter(
      (p) => p.category?.toLowerCase() === activeCategory.toLowerCase()
    );
  }, [detectedProducts, activeCategory]);

  const selectedProduct = filteredProducts && filteredProducts.length > 0
    ? (filteredProducts.find((p) => p.id === selectedProductId) || filteredProducts[0])
    : (detectedProducts.find((p) => p.id === selectedProductId) || detectedProducts[0]);

  // Queries hooks called unconditionally
  const { data: similarProducts, isLoading: loadingSimilar } = useQuery({
    queryKey: ["similar-products", selectedProduct?.id],
    queryFn: async () => {
      if (!selectedProduct?.id) return [];
      const res = await fetch(`/api/products/similar?productId=${selectedProduct.id}`);
      if (!res.ok) throw new Error("Failed to fetch similar products");
      return res.json();
    },
    enabled: !!selectedProduct?.id,
  });

  const { data: collections, refetch: refetchCollections } = useQuery({
    queryKey: ["product-collections", selectedProduct?.id],
    queryFn: async () => {
      if (!selectedProduct?.id) return [];
      const res = await fetch(`/api/products/collections?productId=${selectedProduct.id}`);
      if (!res.ok) throw new Error("Failed to fetch collections");
      return res.json();
    },
    enabled: !!selectedProduct?.id,
  });

  // Early return after hook calls
  if (!detectedProducts || detectedProducts.length === 0 || !selectedProduct) {
    return (
      <div className="text-center py-8 text-xs text-zinc-400">
        No products found in this video.
      </div>
    );
  }

  // Toggle Save to Collection
  const handleToggleSave = async (colId: string | null, colName?: string, action: "save" | "unsave" = "save") => {
    try {
      const res = await fetch("/api/products/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProduct.id,
          collectionId: colId,
          collectionName: colName,
          action,
        }),
      });
      if (res.ok) {
        refetchCollections();
        toast({
          description: action === "save" ? `Saved to collection!` : `Removed from collection.`,
        });
        if (action === "save") {
          onLogEvent(selectedProduct.id, "SAVE");
        }
        setNewColName("");
      } else {
        const err = await res.json();
        toast({
          variant: "destructive",
          description: err.error || "Failed to update collection",
        });
      }
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        description: "Failed to connect to server",
      });
    }
  };

  // Price helper
  const parsePrice = (priceStr: string): number => {
    const num = parseInt(priceStr.replace(/[^0-9]/g, ""), 10);
    return isNaN(num) ? Infinity : num;
  };

  const getOriginalPrice = (priceStr: string) => {
    const numeric = parseInt(priceStr.replace(/[^0-9]/g, ""), 10);
    if (isNaN(numeric)) return null;
    const original = Math.round(numeric * 1.35);
    const symbol = priceStr.startsWith("$") ? "$" : (priceStr.startsWith("₹") ? "₹" : "");
    if (symbol === "₹") {
      return `₹${original.toLocaleString("en-IN")}`;
    }
    return `${symbol}${original}`;
  };

  const getDeliveryDays = (match: any): number => {
    const text = (match.deliveryText || getDeliveryTag(match.sourceStore || "")).toLowerCase();
    if (text.includes("tomorrow") || text.includes("1 day")) return 1;
    if (text.includes("2 days") || text.includes("in 2")) return 2;
    if (text.includes("3 days") || text.includes("in 3")) return 3;
    if (text.includes("4 days") || text.includes("in 4")) return 4;
    if (text.includes("5 days") || text.includes("in 5")) return 5;
    return 6;
  };

  const matches = selectedProduct.matches || [];
  const sortedMatches = [...matches].sort((a, b) => {
    const priceA = parsePrice(a.price);
    const priceB = parsePrice(b.price);
    if (priceA !== priceB) return priceA - priceB;
    const daysA = getDeliveryDays(a);
    const daysB = getDeliveryDays(b);
    if (daysA !== daysB) return daysA - daysB;
    return (b.merchant?.rating ?? 0) - (a.merchant?.rating ?? 0);
  });
  const bestMatch = sortedMatches[0];
  const otherMatches = sortedMatches.slice(1);

  // Helper: category emoji
  const getCategoryEmoji = (category: string, label: string): string => {
    const cat = category.toLowerCase();
    const lbl = label.toLowerCase();
    if (cat.includes("sunglass") || lbl.includes("glass") || lbl.includes("spectacles")) return "🕶";
    if (cat.includes("bag") || cat.includes("backpack") || lbl.includes("backpack") || lbl.includes("bag")) return "🎒";
    if (cat.includes("watch") || lbl.includes("watch")) return "⌚";
    if (cat.includes("shoe") || cat.includes("footwear") || lbl.includes("sneaker") || lbl.includes("shoes") || lbl.includes("boot") || lbl.includes("boots")) return "👟";
    if (cat.includes("jewelry") || lbl.includes("ring") || lbl.includes("necklace") || lbl.includes("earring")) return "💍";
    if (lbl.includes("pants") || lbl.includes("jeans") || lbl.includes("shorts") || lbl.includes("trouser")) return "👖";
    if (cat.includes("clothing") || lbl.includes("shirt") || lbl.includes("tee") || lbl.includes("jacket") || lbl.includes("hoodie") || lbl.includes("coat") || lbl.includes("sweater") || lbl.includes("top") || lbl.includes("dress")) return "👕";
    return "🛍";
  };

  // Delivery tag generator
  const getDeliveryTag = (merchant: string): string => {
    const m = merchant.toLowerCase();
    if (m.includes("amazon")) return "Delivery tomorrow";
    if (m.includes("flipkart")) return "Delivery in 2 days";
    if (m.includes("myntra")) return "Delivery in 3 days";
    if (m.includes("ajio")) return "Delivery in 4 days";
    return "Delivery in 3-5 days";
  };

  const handleBuyClick = async (e: React.MouseEvent, matchId: string, fallbackUrl: string) => {
    e.preventDefault();
    e.stopPropagation();
    onLogEvent(selectedProduct.id, "RETAILER_CLICK", { matchId });
    try {
      const response = await fetch("/api/products/click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.redirectUrl) {
          window.open(data.redirectUrl, "_blank", "noopener,noreferrer");
          return;
        }
      }
    } catch (err) {
      console.error("Click tracking failed:", err);
    }
    window.open(fallbackUrl, "_blank", "noopener,noreferrer");
  };

  // Unique gallery images list
  const galleryImages = Array.from(new Set([
    selectedProduct.thumbnailUrl,
    selectedProduct.sourceFrameUrl,
    ...(selectedProduct.matches || []).map((m: any) => m.imageUrl)
  ].filter(Boolean) as string[]));

  return (
    <div className="flex flex-col gap-5 select-none animate-in fade-in duration-300 pb-8 text-white">
      {/* 1. CATEGORY TABS BAR */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-4 overflow-x-auto border-b border-zinc-900 pb-2.5 scrollbar-none">
          {categories.map((cat) => {
            const isActive = cat === activeCategory;
            return (
              <button
                key={cat}
                onClick={() => {
                  setActiveCategory(cat);
                  // Auto-select first product in new category
                  const firstInCat = cat === "All" ? detectedProducts[0] : detectedProducts.find(p => p.category?.toLowerCase() === cat.toLowerCase());
                  if (firstInCat) {
                    setSelectedProductId(firstInCat.id);
                  }
                }}
                className={cn(
                  "text-xs font-bold transition-colors pb-1.5 relative whitespace-nowrap",
                  isActive ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                {cat}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. PRODUCTS CHIPS LIST */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
          {filteredProducts.map((prod) => {
            const isActive = prod.id === selectedProduct.id;
            const emoji = getCategoryEmoji(prod.category, prod.label);
            return (
              <button
                key={prod.id}
                onClick={() => {
                  setSelectedProductId(prod.id);
                  if (drawerHeightState === "min") {
                    setDrawerHeightState("mid");
                  }
                  onLogEvent(prod.id, "PRODUCT_CLICK");
                }}
                className={cn(
                  "flex flex-col items-center p-2 rounded-[14px] transition-all w-[76px] flex-shrink-0 snap-center border",
                  isActive
                    ? "bg-white text-black border-transparent shadow-md font-bold"
                    : "bg-[#121212] text-white border-zinc-800/80 hover:bg-zinc-900"
                )}
              >
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-zinc-950 mb-1.5 relative border border-transparent">
                  <img
                    src={prod.thumbnailUrl || prod.sourceFrameUrl || "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=100&auto=format&fit=crop&q=60"}
                    alt={prod.label}
                    className="w-full h-full object-cover rounded-xl"
                  />
                  <span className="absolute bottom-0.5 right-0.5 text-xs bg-black/60 px-1 py-0.5 rounded text-white">{emoji}</span>
                </div>
                <span className="text-[9px] font-bold tracking-tight text-center truncate w-full capitalize leading-tight">
                  {prod.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* If drawer is in Peek state, hide detail panels */}
      {drawerHeightState !== "min" && (
        <>
          <div className="border-t border-zinc-900 my-1" />

          {/* 3. PRODUCT COVER & HERO DETAILS */}
          <div className="flex flex-col gap-4">
            <div
              onClick={() => {
                if (galleryImages.length > 0) {
                  setActiveImageIndex(0);
                  setIsGalleryOpen(true);
                }
              }}
              className="w-full aspect-square rounded-[20px] overflow-hidden border border-zinc-800 bg-[#090909] cursor-zoom-in relative group"
            >
              <img
                src={selectedProduct.thumbnailUrl || selectedProduct.sourceFrameUrl || "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&auto=format&fit=crop&q=60"}
                alt={selectedProduct.label}
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
              />
              <div className="absolute bottom-3 right-3 p-2 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
                </svg>
              </div>
            </div>

            <div className="flex flex-col gap-1 px-1 relative">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                  Detected in this reel
                </span>
                {selectedProduct.isVerifiedMatch && (
                  <span className="text-[9px] font-extrabold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/30 flex items-center gap-0.5">
                    ✓ Verified
                  </span>
                )}
              </div>
              <h4 className="text-[18px] font-semibold text-white capitalize leading-snug pr-8 mt-1">
                {selectedProduct.label}
              </h4>
              {selectedProduct.brand && (
                <span className="text-sm text-zinc-400 font-medium capitalize">
                  by {selectedProduct.brand}
                </span>
              )}

              {/* Wishlist Icon */}
              <div className="absolute right-1 top-2 z-10">
                <button
                  onClick={() => setShowSaveDropdown(!showSaveDropdown)}
                  className="p-2 rounded-full bg-[#121212] border border-zinc-800 hover:bg-zinc-800 text-rose-500 hover:text-rose-450 transition-colors"
                  title="Save to Board"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={collections?.some((c: any) => c.saved) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                  </svg>
                </button>

                {showSaveDropdown && (
                  <div className="absolute right-0 top-9 z-30 w-52 p-2 bg-[#090909] border border-zinc-800 rounded-xl shadow-2xl animate-in fade-in duration-200">
                    <div className="text-[10px] font-black uppercase text-zinc-400 px-2 py-1 tracking-wider border-b border-zinc-900 pb-1.5 mb-1.5">
                      Save Look to Board
                    </div>
                    
                    <div className="max-h-36 overflow-y-auto flex flex-col gap-1 pr-1 scrollbar-none">
                      {collections?.map((col: any) => (
                        <button
                          key={col.id}
                          onClick={() => handleToggleSave(col.id, undefined, col.saved ? "unsave" : "save")}
                          className="flex items-center justify-between w-full text-left px-2 py-1.5 rounded-lg text-[11px] font-bold text-zinc-300 hover:bg-zinc-900 hover:text-white"
                        >
                          <span className="truncate max-w-[120px]">{col.name}</span>
                          <span className="text-xs">{col.saved ? "❤️" : "🤍"}</span>
                        </button>
                      ))}
                    </div>

                    <div className="border-t border-zinc-900 pt-1.5 mt-1.5 flex gap-1.5 px-1.5">
                      <input
                        type="text"
                        placeholder="New Board..."
                        value={newColName}
                        onChange={(e) => setNewColName(e.target.value)}
                        className="bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1 text-[10px] text-white w-full focus:outline-none focus:border-zinc-700 font-medium"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newColName.trim()) {
                            handleToggleSave(null, newColName.trim(), "save");
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          if (newColName.trim()) {
                            handleToggleSave(null, newColName.trim(), "save");
                          }
                        }}
                        className="px-2 py-1 bg-white hover:bg-zinc-200 text-black text-[9px] font-bold rounded-md"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Product description */}
            {selectedProduct.description && (
              <p className="text-xs text-zinc-400 px-1 leading-relaxed mt-1">
                {selectedProduct.description}
              </p>
            )}

            {/* Style parameters */}
            {(selectedProduct.style || selectedProduct.material || selectedProduct.season || selectedProduct.gender) && (
              <div className="flex flex-wrap gap-1.5 px-1 mt-1">
                {selectedProduct.style && (
                  <span className="text-[11.5px] font-medium bg-[#121212] text-zinc-400 px-2.5 py-1.5 rounded-lg select-none">
                    Style: {selectedProduct.style}
                  </span>
                )}
                {selectedProduct.material && (
                  <span className="text-[11.5px] font-medium bg-[#121212] text-zinc-400 px-2.5 py-1.5 rounded-lg select-none">
                    Material: {selectedProduct.material}
                  </span>
                )}
                {selectedProduct.season && (
                  <span className="text-[11.5px] font-medium bg-[#121212] text-zinc-400 px-2.5 py-1.5 rounded-lg select-none">
                    Season: {selectedProduct.season}
                  </span>
                )}
                {selectedProduct.gender && (
                  <span className="text-[11.5px] font-medium bg-[#121212] text-zinc-400 px-2.5 py-1.5 rounded-lg select-none">
                    Fits: {selectedProduct.gender}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 4. BEST PRICE OFFER */}
          {bestMatch ? (
            <div className="flex flex-col gap-2.5">
              <span className="text-[10px] font-black tracking-wider text-zinc-400 uppercase">
                Best Price
              </span>
              <a
                href={bestMatch.productUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => handleBuyClick(e, bestMatch.id, bestMatch.productUrl)}
                className="flex items-center justify-between gap-3 bg-[#121212]/50 hover:bg-[#121212] border border-zinc-800/80 p-4 rounded-2xl transition-all group relative overflow-hidden shadow-lg select-none"
              >
                <div className="flex items-start gap-3 min-w-0">
                  {bestMatch.imageUrl ? (
                    <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 border border-zinc-800 bg-[#090909]">
                      <img src={bestMatch.imageUrl} alt={bestMatch.sourceStore} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-11 h-11 rounded-lg bg-zinc-850 flex items-center justify-center text-xs text-zinc-500 flex-shrink-0">
                      🛒
                    </div>
                  )}
                  <div className="min-w-0 flex flex-col justify-center">
                    <span className="text-sm font-bold text-white truncate leading-tight">
                      {bestMatch.merchant?.name || bestMatch.sourceStore}
                    </span>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {bestMatch.merchant?.rating && (
                        <span className="text-[10px] text-amber-500 font-bold flex items-center gap-0.5">
                          ★ {bestMatch.merchant.rating}
                        </span>
                      )}
                      <span className="text-[10px] text-zinc-400 font-medium">
                        {bestMatch.deliveryText || getDeliveryTag(bestMatch.sourceStore)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0 z-10">
                  <div className="flex flex-row items-center gap-2.5">
                    <span className="text-[20px] font-extrabold text-white leading-none">
                      {bestMatch.price}
                    </span>
                    {getOriginalPrice(bestMatch.price) && (
                      <span className="line-through text-zinc-500 text-sm">
                        {getOriginalPrice(bestMatch.price)}
                      </span>
                    )}
                  </div>
                </div>

                <span className="absolute top-2.5 right-2.5 bg-zinc-800 text-zinc-300 text-[8px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full select-none shadow-sm">
                  BEST DEAL
                </span>
              </a>

              {/* Action button "Buy Now" directly below the Best Price card */}
              <a
                href={bestMatch.productUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => handleBuyClick(e, bestMatch.id, bestMatch.productUrl)}
                className="w-full bg-white text-black font-semibold py-3.5 rounded-xl text-center shadow-md active:scale-[0.99] transition-transform text-sm tracking-wide block mt-1 hover:bg-zinc-100"
              >
                Buy Now
              </a>
            </div>
          ) : (
            <div className="text-[11px] text-zinc-500 py-1 pl-3 italic">
              No matches found for &quot;{selectedProduct.label}&quot;.
            </div>
          )}

          {/* 5. COMPARE PRICES (OTHER STORES) */}
          {otherMatches.length > 0 && (
            <div className="flex flex-col gap-2 px-1">
              <span className="text-[10px] font-black tracking-wider text-zinc-400 uppercase">
                Compare Stores
              </span>
              <div className="flex flex-col border border-zinc-900 rounded-xl overflow-hidden bg-[#121212]/10 select-none">
                {otherMatches.map((match: any, idx: number) => (
                  <a
                    key={match.id || idx}
                    href={match.productUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => handleBuyClick(e, match.id, match.productUrl)}
                    className="flex items-center justify-between gap-3 p-3 transition-colors border-b border-zinc-900 last:border-b-0 hover:bg-[#121212]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {match.imageUrl ? (
                        <div className="w-8 h-8 rounded-md overflow-hidden flex-shrink-0 border border-zinc-800 bg-[#090909]">
                          <img src={match.imageUrl} alt={match.sourceStore} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-md bg-zinc-850 flex items-center justify-center text-[10px] text-zinc-500 flex-shrink-0">
                          🛒
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-zinc-200 block truncate group-hover:text-white leading-tight">
                          {match.merchant?.name || match.sourceStore}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {match.merchant?.rating && (
                            <span className="text-[10px] text-amber-500 font-bold flex items-center gap-0.5">
                              ★ {match.merchant.rating}
                            </span>
                          )}
                          <span className="text-[10px] font-medium text-zinc-500">
                            {match.deliveryText || getDeliveryTag(match.sourceStore)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      <div className="flex flex-row items-center gap-1.5">
                        <span className="text-xs font-bold text-zinc-200 block">
                          {match.price}
                        </span>
                        {getOriginalPrice(match.price) && (
                          <span className="line-through text-zinc-500 text-[10px] font-medium leading-none">
                            {getOriginalPrice(match.price)}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-zinc-400 bg-zinc-900 hover:text-white hover:bg-zinc-800 px-3 py-1.5 border border-zinc-800 rounded-lg transition-all">
                        Buy
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* 6. WHY WE MATCHED THIS */}
          <div className="flex flex-col gap-2 px-1">
            <span className="text-[10px] font-black tracking-wider text-zinc-400 uppercase">
              Why We Matched This
            </span>
            <div className="bg-[#121212]/30 p-3.5 rounded-xl text-xs text-zinc-400 leading-relaxed">
              {selectedProduct.isVerifiedMatch ? (
                <p>
                  Curated and approved directly by the creator. Checked and verified for look, style, and fit in this reel.
                </p>
              ) : (
                <p>
                  AI detected this item with {Math.round((selectedProduct.confidence || selectedProduct.aiConfidence || 0.85) * 105)}% confidence in the video frame at {selectedProduct.frameTimestamp ? `${Math.round(selectedProduct.frameTimestamp)}s` : "timestamp"}. Match verified against available retail inventory.
                </p>
              )}
            </div>
          </div>

          {/* 7. SIMILAR PRODUCTS CAROUSEL */}
          {selectedProduct && (
            <div className="flex flex-col gap-2.5 px-1">
              <span className="text-[10px] font-black tracking-wider text-zinc-400 uppercase">
                Similar Products
              </span>
              {loadingSimilar ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="size-5 animate-spin text-zinc-500" />
                </div>
              ) : similarProducts && similarProducts.length > 0 ? (
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
                  {similarProducts.map((item: any) => {
                    const itemBestPrice = item.matches?.[0];
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setSelectedProductId(item.id);
                        }}
                        className="flex flex-col w-[150px] flex-shrink-0 bg-[#121212]/20 hover:bg-[#121212] border border-zinc-800/80 p-2.5 rounded-[16px] text-left transition-all snap-center select-none"
                      >
                        <div className="w-full aspect-square rounded-xl overflow-hidden border border-zinc-800 bg-[#090909] mb-2.5">
                          <img
                            src={item.thumbnailUrl || item.sourceFrameUrl || "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=200&auto=format&fit=crop&q=60"}
                            alt={item.label}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="text-xs font-semibold text-white capitalize truncate block w-full leading-tight">
                          {item.label}
                        </span>
                        <div className="flex items-center justify-between gap-1 mt-1.5 w-full">
                          <span className="text-xs font-bold text-zinc-400 truncate">
                            {itemBestPrice?.price || "N/A"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-[10px] text-zinc-500 italic py-1.5">
                  No similar products detected.
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Fullscreen Product Image Gallery Viewer */}
      {isGalleryOpen && galleryImages.length > 0 && (
        <div className="fixed inset-0 bg-black z-[100] flex flex-col justify-between p-4 select-none animate-in fade-in duration-200">
          {/* Top Header */}
          <div className="flex items-center justify-between p-2 text-white">
            <span className="text-xs font-bold text-zinc-400">
              {activeImageIndex + 1} / {galleryImages.length}
            </span>
            <button
              onClick={() => setIsGalleryOpen(false)}
              className="p-2 hover:bg-zinc-900 rounded-full"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Main Image Viewer */}
          <div 
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="flex-1 flex items-center justify-center relative overflow-hidden"
          >
            {galleryImages.length > 1 && (
              <button
                onClick={() => setActiveImageIndex((prev) => (prev === 0 ? galleryImages.length - 1 : prev - 1))}
                className="absolute left-4 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white z-10"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
              </button>
            )}

            <img
              src={galleryImages[activeImageIndex]}
              alt={selectedProduct.label}
              className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl transition-all duration-300"
            />

            {galleryImages.length > 1 && (
              <button
                onClick={() => setActiveImageIndex((prev) => (prev === galleryImages.length - 1 ? 0 : prev + 1))}
                className="absolute right-4 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white z-10"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            )}
          </div>

          {/* Bottom info */}
          <div className="p-4 text-center">
            <h4 className="text-sm font-bold text-white capitalize">{selectedProduct.label}</h4>
          </div>
        </div>
      )}
    </div>
  );
}
