"use client";

import { useSession } from "@/app/(main)/SessionProvider";
import { PostData } from "@/lib/types";
import { cn, formatRelativeDate } from "@/lib/utils";
import { Media } from "@prisma/client";
import {
  MapPin,
  ChevronLeft,
  ChevronRight,
  Search,
  Loader2,
  Send,
  Bookmark,
  Repeat,
  QrCode,
  Scissors,
  Info,
  EyeOff,
  Eye,
  UserCircle2,
  Sparkles,
  AlertTriangle,
  SlidersHorizontal,
  Trash2,
  CheckCircle,
  Copy,
  Link2,
  SquarePen,
  ShoppingBag,
  MoreHorizontal,
  X,
  Heart
} from "lucide-react";
import { DirectShareIcon, CommentIcon as InstagramCommentIcon, RepostIcon as InstagramRepostIcon } from "@/components/icons/InstagramIcons";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import CommentsBottomSheet from "../comments/CommentsBottomSheet";
import Linkify from "../Linkify";
import UserAvatar from "../UserAvatar";
import UserTooltip from "../UserTooltip";
import { useStoryViewer } from "../StoryViewerProvider";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import BookmarkButton from "./BookmarkButton";
import LikeButton from "./LikeButton";
import PostMoreButton from "./PostMoreButton";
import useFollowerInfo from "@/hooks/useFollowerInfo";
import FollowButton from "../FollowButton";
import VideoPlayer from "../VideoPlayer";
import { useToast } from "../ui/use-toast";
import { formatDistanceToNow } from "date-fns";
import MediaViewer from "./MediaViewer";
import RepostButton from "./RepostButton";
import CollectionSelector from "./CollectionSelector";
import ShareDialog from "./ShareDialog";
import LikesBottomSheet from "./LikesBottomSheet";
import PostViewTracker from "./PostViewTracker";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import kyInstance from "@/lib/ky";
import { useChat } from "@/app/(main)/ChatProvider";
import { motion } from "framer-motion";
import DeletePostDialog from "./DeletePostDialog";
import QuotePostDialog from "./QuotePostDialog";
import EditPostDialog from "./EditPostDialog";
import Comments from "../comments/Comments";
import FullScreenProductDetail from "@/components/reels/FullScreenProductDetail";
import AllProductsView from "@/components/reels/AllProductsView";
import {
  LikeIcon,
  CommentIcon,
  RepostIcon,
  ShareIcon,
  SaveIcon
} from "@/components/reels/ReelsIcons";


interface PostProps {
  post: PostData;
}

function formatViews(viewsCount: number) {
  if (viewsCount >= 1000000) {
    return (viewsCount / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (viewsCount >= 1000) {
    return (viewsCount / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  return viewsCount.toString();
}

interface LikeBannerProps {
  likesCount: number;
  likingUsers: any[];
  currentUserId: string;
}

function LikeBanner({ likesCount, likingUsers, currentUserId }: LikeBannerProps) {
  if (likesCount === 0) return null;

  // Filter for users the current user follows who liked this post
  const followedLikingUsers = likingUsers.filter(
    (u) => u.id !== currentUserId && u.followers && u.followers.length > 0
  );

  const getName = (u: any) => u.displayName || u.username;

  // --- CASE A: People you follow have liked the post ---
  if (followedLikingUsers.length > 0) {
    // Rule 5: 2+ mutual follows + others
    if (followedLikingUsers.length >= 2) {
      const remainder = likesCount - 2;
      if (remainder <= 0) {
        return (
          <div className="text-sm text-instagram-lightText dark:text-instagram-darkText">
            Liked by <span className="font-semibold">{getName(followedLikingUsers[0])}</span> and{" "}
            <span className="font-semibold">{getName(followedLikingUsers[1])}</span>
          </div>
        );
      }
      return (
        <div className="text-sm text-instagram-lightText dark:text-instagram-darkText">
          Liked by <span className="font-semibold">{getName(followedLikingUsers[0])}</span>,{" "}
          <span className="font-semibold">{getName(followedLikingUsers[1])}</span> and{" "}
          <span className="font-semibold">{remainder.toLocaleString()} others</span>
        </div>
      );
    }
    // Rule 4: 1 mutual follow + others
    const remainder = likesCount - 1;
    if (remainder === 0) {
      return (
        <div className="text-sm text-instagram-lightText dark:text-instagram-darkText">
          <span className="font-semibold">{getName(followedLikingUsers[0])}</span> liked this
        </div>
      );
    }
    return (
      <div className="text-sm text-instagram-lightText dark:text-instagram-darkText">
        Liked by <span className="font-semibold">{getName(followedLikingUsers[0])}</span> and{" "}
        <span className="font-semibold">{remainder.toLocaleString()} others</span>
      </div>
    );
  }

  // --- CASE B: Standard users (no mutual follows) ---

  // Rule 1: Only 1 like total — show exact name
  if (likesCount === 1 && likingUsers.length > 0) {
    const firstUser = likingUsers.find((u) => u.id !== currentUserId) || likingUsers[0];
    return (
      <div className="text-sm text-instagram-lightText dark:text-instagram-darkText">
        <span className="font-semibold">{getName(firstUser)}</span> liked this
      </div>
    );
  }

  // Rule 2: 2 likes total — first name + "1 other"
  if (likesCount === 2 && likingUsers.length > 0) {
    const firstUser = likingUsers.find((u) => u.id !== currentUserId) || likingUsers[0];
    return (
      <div className="text-sm text-instagram-lightText dark:text-instagram-darkText">
        <span className="font-semibold">{getName(firstUser)}</span> and{" "}
        <span className="font-semibold">1 other</span> liked this
      </div>
    );
  }

  // Rule 3: 3+ likes, no mutuals — first name + remainder count
  const fallbackUser = likingUsers.find((u) => u.id !== currentUserId) || likingUsers[0];
  const fallbackName = fallbackUser ? getName(fallbackUser) : "Someone";
  const remainder = likesCount - 1;
  return (
    <div className="text-sm text-instagram-lightText dark:text-instagram-darkText">
      <span className="font-semibold">{fallbackName}</span> and{" "}
      <span className="font-semibold">{remainder.toLocaleString()} others</span> liked this
    </div>
  );
}

interface PostCaptionProps {
  username: string;
  text: string;
}

function PostCaption({ username, text }: PostCaptionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const shouldTruncate = text.length > 90;
  const displayText = isExpanded || !shouldTruncate ? text : text.slice(0, 90);

  return (
    <div 
      onClick={() => {
        if (shouldTruncate && isExpanded) {
          setIsExpanded(false);
        }
      }}
      className={`py-0.5 text-sm text-instagram-lightText dark:text-instagram-darkText leading-tight ${
        shouldTruncate && isExpanded ? "cursor-pointer" : ""
      }`}
    >
      <p>
        <Link href={`/users/${username}`} className="font-semibold mr-2 hover:underline" onClick={(e) => e.stopPropagation()}>
          {username}
        </Link>
        <Linkify>
          <span className="whitespace-pre-line break-words">{displayText}</span>
        </Linkify>
        {shouldTruncate && !isExpanded && (
          <>
            <span>...</span>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(true);
              }}
              className="text-zinc-500 dark:text-zinc-400 font-normal ml-1 focus:outline-none hover:underline"
            >
              more
            </button>
          </>
        )}
        {shouldTruncate && isExpanded && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(false);
            }}
            className="text-zinc-500 dark:text-zinc-400 font-normal ml-1 focus:outline-none hover:underline"
          >
            less
          </button>
        )}
      </p>
    </div>
  );
}

export default function Post({ post }: PostProps) {
  const { user } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const chatClient = useChat();

  const [showComments, setShowComments] = useState(false);
  const [isNotInterested, setIsNotInterested] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

  const [activeRightDrawer, setActiveRightDrawer] = useState<"comments" | "repost" | "share" | "shop" | "options" | null>(null);
  const [optionsView, setOptionsView] = useState<"menu" | "qrcode" | "why_seeing" | "about_account" | "ai_info" | "report" | "preferences">("menu");
  const [reported, setReported] = useState(false);
  const [shareSearchQuery, setShareSearchQuery] = useState("");
  const [contactedUsers, setContactedUsers] = useState<any[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  const [isShoppingDrawerOpen, setIsShoppingDrawerOpen] = useState(false);
  const [fullProductDetailId, setFullProductDetailId] = useState<string | null>(null);
  const [desktopActiveCategory, setDesktopActiveCategory] = useState("All");

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);

  const detectedProducts = useMemo(() => post.detectedProducts || [], [post.detectedProducts]);
  const hasAttachedProducts = detectedProducts.length > 0;

  const [likeData, setLikeData] = useState({
    likes: post._count.likes,
    isLikedByUser: post.likes.some((like) => like.userId === user.id),
  });

  const [bookmarkData, setBookmarkData] = useState({
    isBookmarkedByUser: post.bookmarks.some((b) => b.userId === user.id),
  });

  const [repostData, setRepostData] = useState({
    reposts: post._count.reposts,
    isRepostedByUser: post.reposts.some((r) => r.userId === user.id),
  });

  // Sync state if post props change
  useEffect(() => {
    setLikeData({
      likes: post._count.likes,
      isLikedByUser: post.likes.some((like) => like.userId === user.id),
    });
    setBookmarkData({
      isBookmarkedByUser: post.bookmarks.some((b) => b.userId === user.id),
    });
    setRepostData({
      reposts: post._count.reposts,
      isRepostedByUser: post.reposts.some((r) => r.userId === user.id),
    });
  }, [post, user.id]);

  const { mutate: toggleLike } = useMutation({
    mutationFn: () =>
      likeData.isLikedByUser
        ? kyInstance.delete(`/api/posts/${post.id}/likes`)
        : kyInstance.post(`/api/posts/${post.id}/likes`),
    onMutate: async () => {
      const willLike = !likeData.isLikedByUser;
      setLikeData((prev) => ({
        likes: prev.likes + (willLike ? 1 : -1),
        isLikedByUser: willLike,
      }));
    },
    onError(error) {
      setLikeData((prev) => ({
        likes: prev.likes + (prev.isLikedByUser ? -1 : 1),
        isLikedByUser: !prev.isLikedByUser,
      }));
      console.error(error);
      toast({
        variant: "destructive",
        description: "Something went wrong. Please try again.",
      });
    },
  });

  const { mutate: toggleBookmark } = useMutation({
    mutationFn: () =>
      bookmarkData.isBookmarkedByUser
        ? kyInstance.delete(`/api/posts/${post.id}/bookmark`)
        : kyInstance.post(`/api/posts/${post.id}/bookmark`),
    onMutate: async () => {
      const willBookmark = !bookmarkData.isBookmarkedByUser;
      setBookmarkData({ isBookmarkedByUser: willBookmark });
      toast({
        description: `Post ${willBookmark ? "" : "un"}bookmarked successfully.`,
      });
    },
    onError(error) {
      setBookmarkData({ isBookmarkedByUser: !bookmarkData.isBookmarkedByUser });
      console.error(error);
      toast({
        variant: "destructive",
        description: "Failed to update bookmark state.",
      });
    },
  });

  const { mutate: toggleRepost } = useMutation({
    mutationFn: () =>
      repostData.isRepostedByUser
        ? kyInstance.delete(`/api/posts/${post.id}/repost`)
        : kyInstance.post(`/api/posts/${post.id}/repost`),
    onMutate: async () => {
      const willRepost = !repostData.isRepostedByUser;
      setRepostData((prev) => ({
        reposts: prev.reposts + (willRepost ? 1 : -1),
        isRepostedByUser: willRepost,
      }));
    },
    onError(error) {
      setRepostData((prev) => ({
        reposts: prev.reposts + (prev.isRepostedByUser ? -1 : 1),
        isRepostedByUser: !prev.isRepostedByUser,
      }));
      console.error(error);
      toast({
        variant: "destructive",
        description: "Something went wrong. Please try again.",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post-feed"] });
    }
  });

  // Fetch share contacts when activeRightDrawer === "share"
  useEffect(() => {
    if (activeRightDrawer !== "share" || !chatClient || !user) return;
    const fetchContacts = async () => {
      try {
        setLoadingContacts(true);
        const filter = { members: { $in: [user.id] } };
        const list = await chatClient.queryChannels(filter, { last_message_at: -1 }, { limit: 12 });
        const users = list.map((c) => {
          const m = Object.values(c.state.members || {});
          return m.find((member) => member.user?.id !== user.id)?.user;
        }).filter(Boolean);
        setContactedUsers(users);
      } catch (err) {
        console.error("Failed to fetch contacted users:", err);
      } finally {
        setLoadingContacts(false);
      }
    };
    fetchContacts();
  }, [activeRightDrawer, chatClient, user]);

  const filteredShareContacts = useMemo(() => {
    if (!shareSearchQuery) return contactedUsers;
    return contactedUsers.filter((u) => 
      u.name?.toLowerCase().includes(shareSearchQuery.toLowerCase()) || 
      u.username?.toLowerCase().includes(shareSearchQuery.toLowerCase())
    );
  }, [contactedUsers, shareSearchQuery]);

  const handleShareToUser = async (targetUser: any) => {
    if (!chatClient || !user) return;
    try {
      const channel = chatClient.channel("messaging", {
        members: [user.id, targetUser.id],
      });
      await channel.watch();
      const postUrl = `${window.location.origin}/posts/${post.id}`;
      await channel.sendMessage({
        text: `Sent a post: ${postUrl}`,
        attachments: [
          {
            type: "post-share",
            postId: post.id,
            mediaUrl: post.attachments[0]?.url || "",
            username: post.user.username,
          }
        ]
      });
      toast({
        description: `Shared successfully to @${targetUser.username}`,
      });
      setActiveRightDrawer(null);
    } catch (err) {
      console.error("Failed to share post:", err);
      toast({
        variant: "destructive",
        description: "Failed to send message.",
      });
    }
  };

  const handleSharePlatform = (platform: string) => {
    const link = `${window.location.origin}/posts/${post.id}`;
    navigator.clipboard.writeText(link);
    const text = `Check out @${post.user.username}'s post on Next Social!`;
    let targetUrl = "";
    if (platform === "twitter-x" || platform === "x") {
      targetUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`;
    } else if (platform === "linkedin") {
      targetUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`;
    } else if (platform === "whatsapp") {
      targetUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text + " " + link)}`;
    } else if (platform === "reddit") {
      targetUrl = `https://www.reddit.com/submit?url=${encodeURIComponent(link)}&title=${encodeURIComponent(text)}`;
    } else if (platform === "pinterest") {
      targetUrl = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(link)}&description=${encodeURIComponent(text)}`;
    }

    toast({
      description: `Link copied! Opening ${platform.charAt(0).toUpperCase() + platform.slice(1)}...`,
    });

    if (targetUrl) {
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    }
    setActiveRightDrawer(null);
  };

  const parsePrice = (priceStr: string): number => {
    const num = parseInt(priceStr.replace(/[^0-9]/g, ""), 10);
    return isNaN(num) ? Infinity : num;
  };

  const desktopCategories = useMemo(() => {
    const counts: Record<string, number> = { All: detectedProducts.length };
    detectedProducts.forEach((p) => {
      const cat = p.category || "Top";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [detectedProducts]);

  const desktopFilteredProducts = useMemo(() => {
    if (desktopActiveCategory === "All") return detectedProducts;
    return detectedProducts.filter(
      (p) => (p.category || "Top") === desktopActiveCategory
    );
  }, [detectedProducts, desktopActiveCategory]);


  const { data: followerData } = useFollowerInfo(post.user.id, {
    followers: post.user._count.followers,
    isFollowedByUser: post.user.followers.some(
      (f) => f.followerId === user.id
    ),
  });
  const [mediaViewerUrls, setMediaViewerUrls] = useState<string[] | null>(null);
  const [mediaViewerIndex, setMediaViewerIndex] = useState(0);
  const [showCollectionSelector, setShowCollectionSelector] = useState(false);
  const [showLikesSheet, setShowLikesSheet] = useState(false);

  const { data: likingUsers = [] } = useQuery<any[]>({
    queryKey: ["post-likes-users-summary", post.id],
    queryFn: () =>
      kyInstance.get(`/api/posts/${post.id}/likes/users`).json<any[]>(),
    staleTime: 60 * 1000,
  });

  const { showStory, groupedStories } = useStoryViewer();

  const hasActiveStory = groupedStories.some(
    (item) => item.user.id === post.user.id && item.stories.length > 0
  );



  const handleShare = () => {
    setIsShareOpen(true);
  };

  const imageUrls = post.attachments.filter(a => a.mediaType === "IMAGE").map(a => a.url);

  const openMediaViewer = (url: string) => {
    const idx = imageUrls.indexOf(url);
    if (idx !== -1) {
      setMediaViewerUrls(imageUrls);
      setMediaViewerIndex(idx);
    }
  };

  const repostInfo = post.reposts && post.reposts.length > 0 ? post.reposts[0] : null;

  if (isNotInterested) {
    return (
      <div className="py-6 px-4 border-b border-instagram-lightBorder dark:border-instagram-darkBorder bg-white dark:bg-instagram-darkBg flex items-center justify-between text-sm text-zinc-400">
        <span>Post hidden. We&apos;ll show you fewer posts like this.</span>
        <button
          onClick={() => setIsNotInterested(false)}
          className="text-primary hover:underline font-bold"
        >
          Undo
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-full items-stretch relative">
      <article className={cn(
        "flex-grow group/post w-full bg-white dark:bg-[#0c0d14] border-b border-instagram-lightBorder dark:border-zinc-800 mt-0 mb-0 pb-1 transition-all duration-300 min-w-0",
        activeRightDrawer && "rounded-l-[24px]"
      )}>
        {/* Track Post View */}
        <PostViewTracker postId={post.id} />

      {/* Repost Header */}
      {repostInfo && (
        <div className="flex items-center gap-1.5 text-xs text-[#8e8e93] font-semibold px-3 -mt-1 mb-1">
          <InstagramRepostIcon className="size-3.5 text-green-500" />
          <span>{repostInfo.user.id === user.id ? "You" : repostInfo.user.displayName} reposted</span>
        </div>
      )}

      <div className="flex justify-between gap-3 px-3 py-1.5">
        <div className="flex flex-wrap gap-3">
          <UserTooltip user={post.user}>
            <Link
              href={`/users/${post.user.username}`}
              className="flex-shrink-0"
              onClick={(e) => {
                if (hasActiveStory) {
                  e.preventDefault();
                  showStory(post.user.id);
                }
              }}
            >
              {hasActiveStory ? (
                <div className="rounded-full p-[2px] bg-gradient-to-tr from-[#f58529] via-[#dd2a7b] to-[#8134af]">
                  <div className="rounded-full p-[1.5px] bg-white dark:bg-instagram-darkBg">
                    <UserAvatar avatarUrl={post.user.avatarUrl} size={48} className="w-[48px] h-[48px]" />
                  </div>
                </div>
              ) : (
                <UserAvatar avatarUrl={post.user.avatarUrl} size={48} className="w-[48px] h-[48px]" />
              )}
            </Link>
          </UserTooltip>
          <div className="flex flex-col justify-center min-w-0">
            <div className="flex flex-wrap items-center gap-1 text-[15px] font-semibold text-instagram-lightText dark:text-instagram-darkText">
              <UserTooltip user={post.user}>
                <Link
                  href={`/users/${post.user.username}`}
                  className="hover:underline flex items-center gap-1 text-instagram-lightText dark:text-instagram-darkText"
                >
                  <span>{post.user.username}</span>
                  {post.user.verified && (
                    <VerifiedBadge size={14} className="shrink-0" />
                  )}
                </Link>
              </UserTooltip>
              {post.collaborators && Array.isArray(post.collaborators) && post.collaborators.map((collab: any) => (
                <span key={collab} className="text-xs text-[#8e8e93] font-semibold shrink-0">
                  • colab @{collab}
                </span>
              ))}
              <span className="text-[#8e8e93] font-normal select-none text-[13px] px-0.5">•</span>
              <Link
                href={`/posts/${post.id}`}
                className="hover:underline text-[13px] text-[#8e8e93] font-normal"
                suppressHydrationWarning
              >
                {formatRelativeDate(post.createdAt)}
              </Link>
            </div>

            {post.location && (
              <div className="flex items-center gap-1 font-medium text-[13px] text-[#8e8e93] mt-0.5 max-w-[280px] sm:max-w-[400px] truncate select-none">
                <MapPin className="size-3.5 flex-shrink-0 text-zinc-500" />
                <span className="truncate hover:underline cursor-pointer">{post.location}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {post.user.id !== user.id && !followerData.isFollowedByUser && (
            <FollowButton
              userId={post.user.id}
              initialState={{
                followers: post.user._count.followers,
                isFollowedByUser: false,
              }}
              variant="post-header"
            />
          )}
          <PostMoreButton
            post={post}
            onNotInterested={() => setIsNotInterested(true)}
            className="opacity-100 sm:opacity-0 transition-opacity group-hover/post:opacity-100 focus:opacity-100"
          />
        </div>
      </div>

      {/* Caption moved below action row / likes banner for Instagram layout */}

      {/* POLL WIDGET */}
      {post.poll && (
        <div className="px-3">
          <PollWidget poll={post.poll} userId={user.id} />
        </div>
      )}

      {/* MULTI-MEDIA CAROUSEL WITH INTERACTIVE TAGGING */}
      {!!post.attachments.length && (
        <div className="p-0 m-0 w-full overflow-hidden relative">
          <MediaCarousel
            attachments={post.attachments}
            tags={post.tags}
            altText={post.altText}
            onImageClick={openMediaViewer}
            postId={post.id}
          />
        </div>
      )}

      {/* Action Center - Horizontal Glassmorphism Pill */}
      <div className="px-3 py-2 flex items-center justify-start select-none">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0c0d14]/75 backdrop-blur-md border border-[#1b1c26] rounded-full shadow-lg text-white pointer-events-auto">
          {/* Like Button */}
          <div className="flex items-center">
            <div className="relative" style={{ width: 44, height: 44 }}>
              <div
                id={`post-eff-desk-${post.id}`}
                style={{ position: "absolute", top: "50%", left: "50%", width: 1, height: 1, pointerEvents: "none", zIndex: 50 }}
              />
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  toggleLike();
                  if (!likeData.isLikedByUser) {
                    const effEl = document.getElementById(`post-eff-desk-${post.id}`);
                    if (effEl) {
                      const colors = ['#ff0a54','#ff477e','#ff7096','#ff85a1','#fbb1bd','#ffafcc'];
                      for (let i = 0; i < 20; i++) {
                        setTimeout(() => {
                          const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
                          svg.setAttribute('viewBox','0 0 24 24');
                          svg.classList.add('reel-petal');
                          const path = document.createElementNS('http://www.w3.org/2000/svg','path');
                          const isHeart = Math.random() > 0.4;
                          path.setAttribute('d', isHeart
                            ? 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'
                            : 'M12,2C12,2 4,10 4,15C4,19.42 7.58,23 12,23C16.42,23 20,19.42 20,15C20,10 12,2 12,2Z');
                          svg.appendChild(path);
                          const size = Math.random() * 14 + 7;
                          svg.style.width = `${size}px`; svg.style.height = `${size}px`;
                          svg.style.fill = colors[Math.floor(Math.random() * colors.length)];
                          const angle = Math.random() * Math.PI * 2;
                          const dist = Math.random() * 90 + 45;
                          svg.style.setProperty('--btx', `${Math.cos(angle)*dist}px`);
                          svg.style.setProperty('--bty', `${Math.sin(angle)*dist}px`);
                          svg.style.setProperty('--br', `${Math.random()*360}deg`);
                          svg.style.setProperty('--bs', String(Math.random()*0.5+0.5));
                          svg.style.animation = `reel-bloom-out ${Math.random()*0.8+0.6}s cubic-bezier(0.165,0.84,0.44,1) forwards`;
                          effEl.appendChild(svg);
                          setTimeout(() => svg.remove(), 1500);
                        }, i * 15);
                      }
                    }
                  }
                }}
                className={cn(
                  "reel-effusion-btn h-11 w-11 rounded-full bg-[#1b1c26]/65 border border-white/5 hover:bg-[#1b1c26]/90 transition-all text-white",
                  likeData.isLikedByUser && "liked"
                )}
                title="Like"
              >
                <LikeIcon isLiked={likeData.isLikedByUser} className="w-5.5 h-5.5 transition-colors duration-200" />
              </motion.button>
            </div>
            {likeData.likes > 0 && (
              <span className="text-[12px] font-bold text-zinc-300 ml-1 pr-1.5">
                {likeData.likes.toLocaleString()}
              </span>
            )}
          </div>

          {/* Comment Button */}
          <div className="flex items-center">
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setShowComments(!showComments);
                } else {
                  setActiveRightDrawer(activeRightDrawer === "comments" ? null : "comments");
                }
              }}
              className={cn(
                "h-11 w-11 rounded-full flex items-center justify-center bg-[#1b1c26]/65 border border-white/5 hover:bg-[#1b1c26]/90 transition-all text-white cursor-pointer",
                activeRightDrawer === "comments" && "bg-indigo-650 ring-4 ring-indigo-500/20"
              )}
              title="Comments"
            >
              <CommentIcon className="w-5.5 h-5.5 text-white transition-colors duration-200" />
            </motion.button>
            {post._count.comments > 0 && (
              <span className="text-[12px] font-bold text-zinc-300 ml-1 pr-1.5">
                {post._count.comments.toLocaleString()}
              </span>
            )}
          </div>

          {/* Repost Button */}
          <div className="flex items-center">
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setShowQuoteDialog(true);
                } else {
                  setActiveRightDrawer(activeRightDrawer === "repost" ? null : "repost");
                }
              }}
              className={cn(
                "h-11 w-11 rounded-full flex items-center justify-center bg-[#1b1c26]/65 border border-white/5 hover:bg-[#1b1c26]/90 transition-all text-white cursor-pointer",
                activeRightDrawer === "repost" && "bg-indigo-650 ring-4 ring-indigo-500/20"
              )}
              title="Repost"
            >
              <RepostIcon className={cn("w-5.5 h-5.5 text-white transition-colors duration-200", repostData.isRepostedByUser && "text-green-500")} />
            </motion.button>
            {repostData.reposts > 0 && (
              <span className="text-[12px] font-bold text-zinc-300 ml-1 pr-1.5">
                {repostData.reposts.toLocaleString()}
              </span>
            )}
          </div>

          {/* Share Button */}
          <div className="flex items-center">
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setIsShareOpen(true);
                } else {
                  setActiveRightDrawer(activeRightDrawer === "share" ? null : "share");
                }
              }}
              className={cn(
                "h-11 w-11 rounded-full flex items-center justify-center bg-[#1b1c26]/65 border border-white/5 hover:bg-[#1b1c26]/90 transition-all text-white cursor-pointer",
                activeRightDrawer === "share" && "bg-indigo-650 ring-4 ring-indigo-500/20"
              )}
              title="Share"
            >
              <ShareIcon className="w-5.5 h-5.5 text-white transition-colors duration-200" />
            </motion.button>
          </div>

          {/* Save Button */}
          <div className="flex items-center">
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                toggleBookmark();
              }}
              className={cn(
                "h-11 w-11 rounded-full flex items-center justify-center bg-[#1b1c26]/65 border border-white/5 hover:bg-[#1b1c26]/90 transition-all text-white cursor-pointer",
              )}
              title="Save"
            >
              <SaveIcon isBookmarked={bookmarkData.isBookmarkedByUser} className="w-5.5 h-5.5 transition-colors duration-200" />
            </motion.button>
          </div>

          {/* Options Button */}
          <div className="flex items-center">
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                if (window.innerWidth < 1024) {
                  // Fallback for mobile options sheet
                  const moreBtn = document.querySelector(".group\\/post button[title='Options']");
                  if (moreBtn) (moreBtn as HTMLButtonElement).click();
                } else {
                  setActiveRightDrawer(activeRightDrawer === "options" ? null : "options");
                }
              }}
              className={cn(
                "h-11 w-11 rounded-full flex items-center justify-center bg-[#1b1c26]/65 border border-white/5 hover:bg-[#1b1c26]/90 transition-all text-white cursor-pointer",
                activeRightDrawer === "options" && "bg-indigo-650 ring-4 ring-indigo-500/20"
              )}
              title="Options"
            >
              <MoreHorizontal className="w-5.5 h-5.5 text-white" strokeWidth={2} />
            </motion.button>
          </div>

          {/* Shop Look Button */}
          {hasAttachedProducts && (
            <div className="flex items-center border-l border-white/10 pl-2">
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  if (window.innerWidth < 1024) {
                    setIsShoppingDrawerOpen(true);
                  } else {
                    setActiveRightDrawer(activeRightDrawer === "shop" ? null : "shop");
                  }
                }}
                className={cn(
                  "h-11 w-11 flex items-center justify-center rounded-full text-white shadow-xl cursor-pointer transition-all duration-300",
                  activeRightDrawer === "shop"
                    ? "bg-[#6366f1] ring-4 ring-[#6366f1]/35 border border-indigo-400"
                    : "bg-[#6366f1] hover:bg-[#4f46e5] border border-indigo-500/20"
                )}
                title="Shop Look"
              >
                <ShoppingBag className="w-5.5 h-5.5 text-white" />
              </motion.button>
              <span className="text-[12px] font-bold text-[#6366f1] ml-1 pr-1.5">
                Shop
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Likes & Caption - tightly packed */}
      <div className="px-3 mt-1 space-y-0.5">
        {/* Likes Banner */}
        {!post.hideLikes && post._count.likes > 0 && (
          <div 
            onClick={() => setShowLikesSheet(true)}
            className="flex items-center gap-2 cursor-pointer hover:opacity-85 transition-opacity select-none"
          >
            {likingUsers.some((u: any) => u.id !== user.id) && (
              <div className="flex -space-x-1.5 overflow-hidden">
                {likingUsers
                  .filter((u: any) => u.id !== user.id)
                  .slice(0, 3)
                  .map((u: any) => (
                    <img
                      key={u.id}
                      className="inline-block size-5 rounded-full ring-1 ring-white dark:ring-instagram-darkBg object-cover shrink-0"
                      src={u.avatarUrl || "/avatar-placeholder.png"}
                      alt={u.username}
                    />
                  ))}
              </div>
            )}
            <LikeBanner
              likesCount={post._count.likes}
              likingUsers={likingUsers}
              currentUserId={user.id}
            />
          </div>
        )}

        {/* Caption */}
        {post.content && (
          <PostCaption username={post.user.username} text={post.content} />
        )}
      </div>

      {/* Quote Post Card */}
      {post.quotedPost && (
        <div className="px-3">
          <Link
            href={`/posts/${post.quotedPost.id}`}
            className="block border border-border/80 hover:border-border/60 hover:bg-neutral-800/10 rounded-xl p-3 mt-2 text-xs transition-colors"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <UserAvatar avatarUrl={post.quotedPost.user.avatarUrl} size={20} />
              <span className="font-semibold text-neutral-200 flex items-center gap-0.5">
                <span>{post.quotedPost.user.displayName}</span>
                {post.quotedPost.user.verified && (
                  <VerifiedBadge size={11} className="shrink-0" />
                )}
              </span>
              <span className="text-neutral-500">@{post.quotedPost.user.username}</span>
              <span className="text-neutral-500">•</span>
              <span className="text-neutral-500">{formatRelativeDate(post.quotedPost.createdAt)}</span>
            </div>
            <div className="text-neutral-300 break-words whitespace-pre-wrap">{post.quotedPost.content}</div>
            {post.quotedPost.attachments.length > 0 && (
              <div className="mt-2 rounded-lg overflow-hidden border border-border/40 max-h-[200px] flex items-center justify-center bg-black">
                {post.quotedPost.attachments[0].mediaType === "VIDEO" ? (
                  <video
                    src={post.quotedPost.attachments[0].url}
                    className="w-full max-h-[200px] object-contain"
                    controls
                  />
                ) : (
                  <img
                    src={post.quotedPost.attachments[0].url}
                    alt="Quoted attachment"
                    className="w-full max-h-[200px] object-contain"
                  />
                )}
              </div>
            )}
          </Link>
        </div>
      )}

      <CommentsBottomSheet
        post={post}
        open={showComments}
        onOpenChange={setShowComments}
      />

      {/* Media Fullscreen Viewer */}
      {mediaViewerUrls && (
        <MediaViewer
          urls={mediaViewerUrls}
          initialIndex={mediaViewerIndex}
          onClose={() => setMediaViewerUrls(null)}
        />
      )}

      {/* Saved Collections Selector */}
      <CollectionSelector
        postId={post.id}
        open={showCollectionSelector}
        onClose={() => setShowCollectionSelector(false)}
      />

      {/* Likes Bottom Sheet */}
      <LikesBottomSheet
        postId={post.id}
        open={showLikesSheet}
        onClose={() => setShowLikesSheet(false)}
      />

      {/* Universal Share Bottom Sheet Dialog */}
      {isShareOpen && (
        <ShareDialog
          post={post}
          open={isShareOpen}
          onOpenChange={setIsShareOpen}
        />
      )}

      {/* Quote Dialog */}
      <QuotePostDialog
        post={post}
        open={showQuoteDialog}
        onClose={() => setShowQuoteDialog(false)}
      />

      {/* Edit Dialog */}
      <EditPostDialog
        post={post}
        open={showEditDialog}
        onClose={() => setShowEditDialog(false)}
      />

      {/* Delete Dialog */}
      <DeletePostDialog
        post={post}
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
      />

      {/* Mobile Shopping Drawer */}
      {isShoppingDrawerOpen && (
        <AllProductsView
          products={detectedProducts}
          onClose={() => setIsShoppingDrawerOpen(false)}
        />
      )}

      {/* Fullscreen Product Detail View */}
      {fullProductDetailId && (
        <FullScreenProductDetail
          productId={fullProductDetailId}
          detectedProducts={detectedProducts}
          onClose={() => setFullProductDetailId(null)}
        />
      )}

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
          @keyframes reel-bloom-out {
            0% { transform: translate(0,0) scale(0) rotate(0deg); opacity: 1; }
            100% { transform: translate(var(--btx), var(--bty)) scale(var(--bs)) rotate(var(--br)); opacity: 0; }
          }
          .reel-petal {
            position: absolute;
            pointer-events: none;
            opacity: 0;
            top: 0; left: 0;
            z-index: 99;
          }
          .reel-effusion-btn {
            background: none;
            border: none;
            cursor: pointer;
            padding: 0;
            outline: none;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.4s cubic-bezier(0.175,0.885,0.32,1.275);
          }
          .reel-effusion-btn:active { transform: scale(0.8); }
        `
      }} />
    </article>

    {/* Right Sidebar Panel Drawer (Desktop only: lg and above) */}
    <div
      className={cn(
        "relative h-full bg-[#07080d] border border-zinc-900/60 rounded-r-[24px] transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] hidden lg:flex flex-col text-white z-30 pointer-events-auto overflow-hidden shrink-0",
        activeRightDrawer ? "w-[410px] xl:w-[460px] opacity-100 border-l border-y ml-4" : "w-0 opacity-0 border-none pointer-events-none"
      )}
    >
      {/* A. Shop Look tab */}
      {activeRightDrawer === "shop" && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-900/60 select-none bg-[#07080d] shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-[#12131a] rounded-xl border border-zinc-850">
                <ShoppingBag className="size-4.5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-tight">Shop the look</h3>
                <p className="text-[10px] text-zinc-500 font-semibold mt-0.5">{detectedProducts.length} products found</p>
              </div>
            </div>
            <button onClick={() => setActiveRightDrawer(null)} className="text-zinc-500 hover:text-white transition-colors cursor-pointer">
              <X className="size-4.5" />
            </button>
          </div>

          {/* Category Filter Chips Bar */}
          <div className="flex items-center gap-2 px-6 py-3 overflow-x-auto border-b border-zinc-900/60 bg-[#07080d] scrollbar-none shrink-0 select-none">
            {desktopCategories.map((cat) => {
              const isActive = cat.name === desktopActiveCategory;
              return (
                <button
                  key={cat.name}
                  onClick={() => setDesktopActiveCategory(cat.name)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-[10px] font-black transition-all cursor-pointer select-none",
                    isActive
                      ? "bg-indigo-650 text-white shadow-md"
                      : "bg-[#12131a] text-zinc-400 hover:text-zinc-200 border border-zinc-850"
                  )}
                >
                  {cat.name} ({cat.count})
                </button>
              );
            })}
          </div>

          {/* Grid of Product Cards */}
          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-3 scrollbar-none bg-[#07080d] content-start">
            {desktopFilteredProducts.map((prod) => {
              const itemBestMatch = [...(prod.matches || [])].sort((a, b) => {
                const priceA = parsePrice(a.price);
                const priceB = parsePrice(b.price);
                return priceA - priceB;
              })[0];
              const categoryLabel = prod.category || "Top";

              return (
                <div key={prod.id} className="flex flex-col bg-[#12131a] border border-zinc-800/60 hover:border-zinc-700 rounded-2xl transition-all duration-300 relative group/card w-full overflow-hidden shadow-lg">
                  <div className="w-full aspect-[3/4] bg-zinc-950 relative overflow-hidden">
                    <img
                      src={prod.thumbnailUrl || prod.sourceFrameUrl || "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=200&auto=format&fit=crop&q=60"}
                      alt={prod.label}
                      className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <span className="absolute top-2.5 left-2.5 text-[8px] font-black text-white bg-black/70 px-1.5 py-0.5 rounded-md uppercase tracking-wider select-none">
                      {categoryLabel}
                    </span>
                    <div className="absolute bottom-0 left-0 right-0 px-3 pb-3 pt-6">
                      <p className="text-[11px] font-bold text-white truncate leading-tight select-none">{prod.label}</p>
                      {itemBestMatch && <p className="text-[11px] font-black text-zinc-200 mt-0.5">{itemBestMatch.price}</p>}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setFullProductDetailId(prod.id);
                    }}
                    className="group relative block w-full py-2.5 overflow-hidden bg-[#1f2937] active:scale-[0.97] transition-transform duration-150 select-none cursor-pointer border-0 outline-none text-left"
                  >
                    <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#4f46e5] opacity-80 w-0 h-0 group-hover:w-[14em] group-hover:h-[14em] transition-all duration-500 ease-[cubic-bezier(0,0,0.2,1)]" />
                    <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/25" />
                    <span className="relative z-10 block w-full text-center text-[11px] font-bold text-white">View product</span>
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* B. Comments tab */}
      {activeRightDrawer === "comments" && (
        <>
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-900/60 select-none bg-[#07080d] shrink-0">
            <h3 className="font-black text-white text-base uppercase tracking-tight">Comments</h3>
            <button onClick={() => setActiveRightDrawer(null)} className="text-zinc-500 hover:text-white transition-colors cursor-pointer">
              <X className="size-4.5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 scrollbar-none bg-[#07080d]">
            <Comments post={post} />
          </div>
        </>
      )}

      {/* C. Share tab */}
      {activeRightDrawer === "share" && (
        <>
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-900/60 select-none bg-[#07080d] shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-[#12131a] rounded-xl border border-zinc-850">
                <Send className="size-4.5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-tight">Share</h3>
                <p className="text-[10px] text-zinc-500 font-semibold mt-0.5">Send this post to your friends</p>
              </div>
            </div>
            <button onClick={() => setActiveRightDrawer(null)} className="text-zinc-500 hover:text-white transition-colors cursor-pointer">
              <X className="size-4.5" />
            </button>
          </div>

          <div className="px-4 py-3 border-b border-zinc-900/40 bg-[#07080d]/80 shrink-0">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-550" />
              <input
                type="text"
                placeholder="Search people..."
                value={shareSearchQuery}
                onChange={(e) => setShareSearchQuery(e.target.value)}
                className="w-full bg-[#12131a] border border-zinc-800 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder:text-zinc-650 outline-none focus:border-zinc-700 font-medium"
              />
            </div>
          </div>

          <div className="flex-grow overflow-y-auto p-4 space-y-1.5 scrollbar-none bg-[#07080d]">
            {loadingContacts ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="size-5 animate-spin text-zinc-600" />
              </div>
            ) : filteredShareContacts.length > 0 ? (
              filteredShareContacts.map((contact: any) => (
                <button
                  key={contact.id}
                  onClick={() => handleShareToUser(contact)}
                  className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-[#12131a] transition-all text-left group"
                >
                  <img src={contact.avatarUrl || "/avatar-placeholder.png"} alt="avatar" className="size-9 rounded-full object-cover border border-zinc-800" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-white truncate">{contact.displayName || contact.username}</span>
                    <span className="text-[10px] text-zinc-500">@{contact.username}</span>
                  </div>
                </button>
              ))
            ) : (
              <p className="text-center text-xs text-zinc-500 py-8">No contacts found.</p>
            )}
          </div>

          {/* Social share dock */}
          <div className="p-4 border-t border-zinc-900/60 bg-[#07080d] shrink-0">
            <div className="flex items-center justify-center gap-3">
              {["whatsapp", "x", "linkedin", "reddit", "pinterest"].map((platform) => (
                <button
                  key={platform}
                  onClick={() => handleSharePlatform(platform)}
                  className="px-3 py-1.5 bg-[#12131a] hover:bg-zinc-800 border border-zinc-850 rounded-xl text-[10px] font-black uppercase text-zinc-300"
                >
                  {platform}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* D. Repost tab */}
      {activeRightDrawer === "repost" && (
        <>
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-900/60 select-none bg-[#07080d] shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-[#12131a] rounded-xl border border-zinc-850">
                <RepostIcon className={cn("size-4.5 text-zinc-400", repostData.isRepostedByUser && "text-green-500")} />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-tight">Repost</h3>
                <p className="text-[10px] text-zinc-500 font-semibold mt-0.5">Share or quote this post</p>
              </div>
            </div>
            <button onClick={() => setActiveRightDrawer(null)} className="text-zinc-500 hover:text-white transition-colors cursor-pointer">
              <X className="size-4.5" />
            </button>
          </div>

          <div className="flex flex-col p-4 gap-2 select-none text-start bg-[#07080d] flex-grow">
            <button
              onClick={() => {
                toggleRepost();
                setActiveRightDrawer(null);
              }}
              className="flex items-start gap-4 px-4 py-4 rounded-2xl hover:bg-zinc-900 active:bg-zinc-900 transition-colors w-full text-start group"
            >
              <RepostIcon className={cn("size-6 mt-0.5 shrink-0 transition-colors text-zinc-400 group-hover:text-white", repostData.isRepostedByUser && "text-green-500")} />
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-[16px] text-white leading-tight">
                  {repostData.isRepostedByUser ? "Undo repost" : "Repost"}
                </span>
                <span className="text-[13px] text-zinc-500 mt-1 font-medium leading-tight">Share this post with your followers</span>
              </div>
            </button>

            <button
              onClick={() => {
                setActiveRightDrawer(null);
                setShowQuoteDialog(true);
              }}
              className="flex items-start gap-4 px-4 py-4 rounded-2xl hover:bg-zinc-900 active:bg-zinc-900 transition-colors w-full text-start group"
            >
              <SquarePen className="size-6 mt-0.5 shrink-0 transition-colors text-zinc-400 group-hover:text-white" strokeWidth={2} />
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-[16px] text-white leading-tight">Quote</span>
                <span className="text-[13px] text-zinc-500 mt-1 font-medium leading-tight">Add a comment, photo or GIF before you share</span>
              </div>
            </button>
          </div>
        </>
      )}

      {/* E. Options tab */}
      {activeRightDrawer === "options" && (
        <>
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-900/60 select-none bg-[#07080d] shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-[#12131a] rounded-xl border border-zinc-850">
                <MoreHorizontal className="size-4.5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-tight">Options</h3>
                <p className="text-[10px] text-zinc-500 font-semibold mt-0.5">Post settings and action shortcuts</p>
              </div>
            </div>
            <button onClick={() => { setActiveRightDrawer(null); setOptionsView("menu"); setReported(false); }} className="text-zinc-500 hover:text-white transition-colors cursor-pointer">
              <X className="size-4.5" />
            </button>
          </div>

          <div className="flex-grow overflow-y-auto p-4 bg-[#07080d]">
            {optionsView === "menu" && (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-3 gap-2.5">
                  <button onClick={() => toggleBookmark()} className="flex flex-col items-center justify-center gap-1.5 py-4 px-2 rounded-xl bg-[#1c1c1e] hover:bg-zinc-800/60 transition-all border border-zinc-800">
                    <Bookmark className={cn("size-6 text-zinc-300", bookmarkData.isBookmarkedByUser && "fill-white text-white")} strokeWidth={2} />
                    <span className="text-[13px] font-medium text-center">{bookmarkData.isBookmarkedByUser ? "Saved" : "Save"}</span>
                  </button>
                  <button onClick={() => { setShowQuoteDialog(true); setActiveRightDrawer(null); }} className="flex flex-col items-center justify-center gap-1.5 py-4 px-2 rounded-xl bg-[#1c1c1e] hover:bg-zinc-800/60 transition-all border border-zinc-800">
                    <Repeat className="size-6 text-zinc-300" strokeWidth={2} />
                    <span className="text-[13px] font-medium text-center">Remix</span>
                  </button>
                  <button onClick={() => setOptionsView("qrcode")} className="flex flex-col items-center justify-center gap-1.5 py-4 px-2 rounded-xl bg-[#1c1c1e] hover:bg-zinc-800/60 transition-all border border-zinc-800">
                    <QrCode className="size-6 text-zinc-300" strokeWidth={2} />
                    <span className="text-[13px] font-medium text-center">QR code</span>
                  </button>
                </div>

                <div className="flex flex-col rounded-2xl bg-[#1c1c1e] overflow-hidden border border-zinc-800">
                  <button onClick={() => { toast({ description: "Sticker generated! Added to stickers keyboard." }); setActiveRightDrawer(null); }} className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-zinc-800/60 text-start w-full">
                    <Scissors className="size-5 text-zinc-400" strokeWidth={2} />
                    <span className="text-[15px] font-medium">Create a cutout sticker</span>
                  </button>
                  <button onClick={() => setOptionsView("why_seeing")} className="flex items-center gap-3.5 px-4 py-3.5 border-t border-zinc-800 hover:bg-zinc-800/60 text-start w-full">
                    <Info className="size-5 text-zinc-400" strokeWidth={2} />
                    <span className="text-[15px] font-medium">Why you&apos;re seeing this post</span>
                  </button>
                  <button onClick={() => { setIsNotInterested(true); setActiveRightDrawer(null); }} className="flex items-center gap-3.5 px-4 py-3.5 border-t border-zinc-800 hover:bg-zinc-800/60 text-start w-full">
                    <EyeOff className="size-5 text-zinc-400" strokeWidth={2} />
                    <span className="text-[15px] font-medium">Not interested</span>
                  </button>
                  <button onClick={() => { toast({ description: "Post marked as interested. We'll recommend more similar posts." }); setActiveRightDrawer(null); }} className="flex items-center gap-3.5 px-4 py-3.5 border-t border-zinc-800 hover:bg-zinc-800/60 text-start w-full">
                    <Eye className="size-5 text-zinc-400" strokeWidth={2} />
                    <span className="text-[15px] font-medium">Interested</span>
                  </button>
                  <button onClick={() => setOptionsView("about_account")} className="flex items-center gap-3.5 px-4 py-3.5 border-t border-zinc-800 hover:bg-zinc-800/60 text-start w-full">
                    <UserCircle2 className="size-5 text-zinc-400" strokeWidth={2} />
                    <span className="text-[15px] font-medium">About this account</span>
                  </button>
                  <button onClick={() => setOptionsView("ai_info")} className="flex items-center gap-3.5 px-4 py-3.5 border-t border-zinc-800 hover:bg-zinc-800/60 text-start w-full">
                    <Sparkles className="size-5 text-zinc-400" strokeWidth={2} />
                    <span className="text-[15px] font-medium">AI info</span>
                  </button>
                  <button onClick={() => setOptionsView("report")} className="flex items-center gap-3.5 px-4 py-3.5 border-t border-zinc-800 hover:bg-zinc-800/60 text-start w-full">
                    <AlertTriangle className="size-5 text-red-500" strokeWidth={2} />
                    <span className="text-[15px] font-medium text-red-500">Report</span>
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  <button onClick={() => setOptionsView("preferences")} className="flex items-center gap-3.5 px-4 py-3.5 rounded-2xl bg-[#1c1c1e] border border-zinc-800 hover:bg-zinc-800/60 text-start w-full">
                    <SlidersHorizontal className="size-5 text-zinc-400" strokeWidth={2} />
                    <span className="text-[15px] font-medium">Manage content preferences</span>
                  </button>
                  {post.user.id === user.id && (
                    <button onClick={() => { setShowEditDialog(true); setActiveRightDrawer(null); }} className="flex items-center gap-3.5 px-4 py-3.5 rounded-2xl bg-[#1c1c1e] border border-zinc-800 hover:bg-zinc-800/60 text-start w-full">
                      <SquarePen className="size-5 text-zinc-300" strokeWidth={2} />
                      <span className="text-[15px] font-semibold text-zinc-300">Edit Post</span>
                    </button>
                  )}
                  {post.user.id === user.id && (
                    <button onClick={() => { setShowDeleteDialog(true); setActiveRightDrawer(null); }} className="flex items-center gap-3.5 px-4 py-3.5 rounded-2xl bg-red-955/20 border border-red-900/40 hover:bg-red-955/40 text-start w-full">
                      <Trash2 className="size-5 text-red-500" strokeWidth={2} />
                      <span className="text-[15px] font-semibold text-red-500">Delete Post</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {optionsView === "qrcode" && (
              <div className="flex flex-col gap-5 select-none">
                <div className="flex items-center gap-3">
                  <button onClick={() => setOptionsView("menu")} className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800/60">
                    <ChevronLeft className="size-5" />
                  </button>
                  <span className="text-[16px] font-bold">QR code sharing</span>
                </div>
                <div className="flex flex-col items-center gap-6 py-6 bg-[#1c1c1e] rounded-3xl border border-zinc-850 max-w-sm mx-auto w-full shadow-2xl">
                  <div className="flex items-center gap-3 px-6 w-full justify-center">
                    <img src={post.user.avatarUrl || "/avatar-placeholder.png"} alt="avatar" className="size-10 rounded-full border border-zinc-800 object-cover" />
                    <div className="flex flex-col text-start">
                      <span className="font-bold text-[15px] text-white">@{post.user.username}</span>
                      <span className="text-xs text-zinc-400">Scan to view post</span>
                    </div>
                  </div>
                  <svg viewBox="0 0 100 100" className="size-48 bg-white p-2.5 rounded-2xl border shadow-lg">
                    <rect x="0" y="0" width="28" height="28" fill="black" />
                    <rect x="4" y="4" width="20" height="20" fill="white" />
                    <rect x="8" y="8" width="12" height="12" fill="black" />
                    <rect x="72" y="0" width="28" height="28" fill="black" />
                    <rect x="76" y="4" width="20" height="20" fill="white" />
                    <rect x="80" y="8" width="12" height="12" fill="black" />
                    <rect x="0" y="72" width="28" height="28" fill="black" />
                    <rect x="4" y="76" width="20" height="20" fill="white" />
                    <rect x="8" y="80" width="12" height="12" fill="black" />
                    <rect x="76" y="76" width="8" height="8" fill="black" />
                    <path d="M 36,4 h 4 v 4 h -4 z M 48,0 h 4 v 4 h -4 z M 56,8 h 4 v 4 h -4 z M 36,16 h 8 v 4 h -8 z M 52,20 h 4 v 4 h -4 z M 44,28 h 4 v 4 h -4 z M 0,36 h 8 v 4 h -8 z M 16,36 h 4 v 4 h -4 z M 24,40 h 4 v 4 h -4 z M 36,36 h 4 v 8 h -4 z M 48,44 h 8 v 4 h -8 z M 64,36 h 4 v 4 h -4 z M 76,36 h 12 v 4 h -12 z M 8,48 h 4 v 4 h -4 z M 20,48 h 8 v 4 h -8 z M 36,52 h 4 v 4 h -4 z M 60,52 h 8 v 4 h -8 z M 76,48 h 4 v 4 h -4 z M 88,52 h 4 v 4 h -4 z M 4,60 h 4 v 4 h -4 z M 16,64 h 4 v 4 h -4 z M 28,60 h 4 v 4 h -4 z M 44,60 h 8 v 4 h -8 z M 56,60 h 4 v 8 h -4 z M 72,64 h 4 v 4 h -4 z M 84,60 h 8 v 4 h -8 z M 36,72 h 4 v 8 h -4 z M 48,76 h 8 v 4 h -8 z M 64,72 h 4 v 4 h -4 z M 36,88 h 8 v 4 h -8 z M 52,88 h 4 v 4 h -4 z M 60,84 h 4 v 4 h -4 z" fill="black" />
                  </svg>
                  <div className="text-zinc-400 text-xs px-6 text-center select-text break-all font-mono py-1 rounded bg-[#1c1c1e] border border-zinc-800">
                    {window.location.origin}/posts/{post.id}
                  </div>
                </div>
                <div className="flex gap-2 justify-center w-full my-2">
                  <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/posts/${post.id}`); toast({ description: "Link copied to clipboard." }); }} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#1c1c1e] hover:bg-zinc-800/60 text-[14px] font-semibold border border-zinc-800 transition-all active:scale-95 flex-1 justify-center">
                    <Copy className="size-4 text-zinc-400" />
                    <span>Copy Link</span>
                  </button>
                </div>
              </div>
            )}

            {optionsView === "why_seeing" && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <button onClick={() => setOptionsView("menu")} className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800/60">
                    <ChevronLeft className="size-5" />
                  </button>
                  <span className="text-[16px] font-bold">Why you&apos;re seeing this</span>
                </div>
                <div className="flex flex-col gap-3.5 py-4 px-5 rounded-2xl bg-[#1c1c1e] border border-zinc-800 text-start">
                  <div className="flex gap-3">
                    <UserCircle2 className="size-5 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-[15px] font-bold">Recommended for you</h4>
                      <p className="text-sm text-zinc-400 mt-1 leading-relaxed">You are seeing this post because you engage with similar accounts or topics.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {optionsView === "about_account" && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <button onClick={() => setOptionsView("menu")} className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800/60">
                    <ChevronLeft className="size-5" />
                  </button>
                  <span className="text-[16px] font-bold">About this account</span>
                </div>
                <div className="flex flex-col items-center gap-4 py-6 px-4 rounded-2xl bg-[#1c1c1e] border border-zinc-800 text-start w-full">
                  <img src={post.user.avatarUrl || "/avatar-placeholder.png"} alt="avatar" className="size-16 rounded-full border border-zinc-800 object-cover" />
                  <div className="flex flex-col text-center">
                    <span className="font-bold text-[17px] text-white flex items-center justify-center gap-1">
                      {post.user.displayName}
                      {post.user.verified && <VerifiedBadge size={14} className="ml-1" />}
                    </span>
                    <span className="text-sm text-zinc-400">@{post.user.username}</span>
                  </div>
                </div>
              </div>
            )}

            {optionsView === "ai_info" && (
              <div className="flex flex-col gap-4 text-start">
                <div className="flex items-center gap-3">
                  <button onClick={() => setOptionsView("menu")} className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800/60">
                    <ChevronLeft className="size-5" />
                  </button>
                  <span className="text-[16px] font-bold">AI info</span>
                </div>
                <div className="flex flex-col gap-4 py-5 px-5 rounded-2xl bg-[#1c1c1e] border border-zinc-800">
                  <div className="flex items-center gap-3.5">
                    <Sparkles className="size-8 text-indigo-400" strokeWidth={1.5} />
                    <div>
                      <h4 className="text-[15px] font-bold">Original content</h4>
                      <span className="text-[11px] text-zinc-400 block uppercase tracking-wider mt-0.5">Verified by system</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {optionsView === "report" && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <button onClick={() => setOptionsView("menu")} className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800/60">
                    <ChevronLeft className="size-5" />
                  </button>
                  <span className="text-[16px] font-bold">Report Post</span>
                </div>
                {!reported ? (
                  <div className="flex flex-col rounded-2xl bg-[#1c1c1e] overflow-hidden border border-zinc-800">
                    {["It's spam", "Nudity or sexual activity", "Hate speech or symbols", "Violence", "Harassment"].map((reason, idx) => (
                      <button
                        key={reason}
                        onClick={() => { setReported(true); toast({ description: `Reported for: ${reason}` }); }}
                        className={cn("flex items-center px-4 py-3.5 text-[15px] font-medium hover:bg-zinc-800/60 text-start w-full", idx > 0 && "border-t border-zinc-800")}
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4 py-8 bg-[#1c1c1e] rounded-2xl border border-zinc-800">
                    <CheckCircle className="size-12 text-indigo-400" />
                    <h4 className="font-bold text-[16px]">Report submitted</h4>
                  </div>
                )}
              </div>
            )}

            {optionsView === "preferences" && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <button onClick={() => setOptionsView("menu")} className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800/60">
                    <ChevronLeft className="size-5" />
                  </button>
                  <span className="text-[16px] font-bold">Preferences</span>
                </div>
                <div className="flex flex-col rounded-2xl bg-[#1c1c1e] overflow-hidden border border-zinc-800 text-start">
                  <button onClick={() => { toast({ description: `Muted @${post.user.username}` }); setActiveRightDrawer(null); }} className="px-4 py-3.5 hover:bg-zinc-800/60 w-full text-left">
                    Mute @{post.user.username}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  </div>
  );
}

// Media Carousel Component
interface MediaCarouselProps {
  attachments: Media[];
  tags: any;
  altText: string | null;
  onImageClick: (url: string) => void;
  postId: string;
}

function MediaCarousel({ attachments, tags, altText, onImageClick, postId }: MediaCarouselProps) {
  const [index, setIndex] = useState(0);
  const [showTags, setShowTags] = useState(false);
  const router = useRouter();

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);

  const minSwipeDistance = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setIsSwiping(false);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentX = e.targetTouches[0].clientX;
    setTouchEnd(currentX);
    if (touchStart && Math.abs(touchStart - currentX) > 10) {
      setIsSwiping(true);
    }
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && index < attachments.length - 1) {
      setIndex((prev) => prev + 1);
    } else if (isRightSwipe && index > 0) {
      setIndex((prev) => prev - 1);
    }
  };

  if (!attachments.length) return null;

  const currentMedia = attachments[index];
  const isVideo = currentMedia.mediaType === "VIDEO";

  const activeTags = Array.isArray(tags)
    ? tags.filter((t: any) => t.mediaIndex === index)
    : [];

  return (
    <div 
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative w-full aspect-[4/5] bg-zinc-900 rounded-none sm:rounded-xl overflow-hidden group select-none flex items-center justify-center border-0 sm:border sm:border-border/5"
    >
      {/* Media Element */}
      <div
        className="w-full h-full flex items-center justify-center relative cursor-pointer"
        onClick={() => {
          if (isSwiping) return;
          if (isVideo) {
            router.push(`/reels?focusedPostId=${postId}`);
          } else {
            onImageClick(currentMedia.url);
          }
        }}
      >
        {isVideo ? (
          <div className="relative w-full h-full">
            <VideoPlayer src={currentMedia.url} postId={postId} className="pointer-events-none w-full h-full object-cover" />
            <div className="absolute inset-0 z-10" />
          </div>
        ) : (
          <Image
            src={currentMedia.url}
            alt={altText || "Attachment"}
            width={600}
            height={600}
            className="w-full h-full object-cover"
            unoptimized
          />
        )}

        {/* Tag coordinate overlay */}
        {!isVideo && showTags && activeTags.map((tag: any, tIdx: number) => (
          <Link
            key={tIdx}
            href={`/users/${tag.username}`}
            style={{ left: `${tag.x}%`, top: `${tag.y}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2 bg-black/85 border border-neutral-700 text-white px-2 py-0.5 rounded-full text-[10px] font-bold z-30 flex items-center gap-1 shadow-lg hover:bg-neutral-900 transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <span>@{tag.username}</span>
          </Link>
        ))}

        {/* Show/Hide Tags overlay toggle */}
        {!isVideo && activeTags.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowTags(!showTags);
            }}
            className="absolute bottom-3 left-3 bg-black/75 hover:bg-black text-white px-2.5 py-1 rounded-full z-20 border border-neutral-705 transition-all text-[11px] font-bold"
          >
            👥 {showTags ? "Hide Tags" : "Show Tags"}
          </button>
        )}
      </div>

      {/* Navigation chevrons */}
      {index > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIndex((prev) => prev - 1);
          }}
          className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/90 text-white p-2 rounded-full z-20 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ChevronLeft className="size-5" />
        </button>
      )}

      {index < attachments.length - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIndex((prev) => prev + 1);
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/90 text-white p-2 rounded-full z-20 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ChevronRight className="size-5" />
        </button>
      )}

      {/* Carousel Dots */}
      {attachments.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 px-2.5 py-1.5 rounded-full flex gap-1.5 z-20">
          {attachments.map((_, dotIdx) => (
            <div
              key={dotIdx}
              className={cn(
                "size-1.5 rounded-full transition-all",
                index === dotIdx ? "bg-white scale-110" : "bg-white/40"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Poll Widget Component
interface PollWidgetProps {
  poll: {
    id: string;
    expiresAt: Date;
    options: {
      id: string;
      text: string;
      votes: {
        userId: string;
      }[];
    }[];
  };
  userId: string;
}

function PollWidget({ poll, userId }: PollWidgetProps) {
  const { toast } = useToast();
  const [localPoll, setLocalPoll] = useState(poll);
  const [votingId, setVotingId] = useState<string | null>(null);

  const expiresDate = new Date(localPoll.expiresAt);
  const isExpired = expiresDate < new Date();

  const totalVotes = localPoll.options.reduce((acc, opt) => acc + opt.votes.length, 0);

  const userVote = localPoll.options.find((opt) =>
    opt.votes.some((v) => v.userId === userId)
  );
  const hasVoted = !!userVote;

  const handleVote = async (optionId: string) => {
    if (hasVoted || isExpired || votingId) return;
    setVotingId(optionId);
    try {
      const res = await fetch("/api/posts/poll-vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to vote");
      }

      const updatedPoll = await res.json();
      setLocalPoll(updatedPoll);
    } catch (e: any) {
      toast({
        variant: "destructive",
        description: e.message || "Could not register your vote.",
      });
    } finally {
      setVotingId(null);
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col gap-3 max-w-md my-2 text-white">
      <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider text-neutral-400">
        <span>Poll</span>
        <span>
          {isExpired
            ? "Final Results"
            : `Ends in ${formatDistanceToNow(expiresDate)}`}
        </span>
      </div>

      <div className="flex flex-col gap-2.5">
        {localPoll.options.map((option) => {
          const voteCount = option.votes.length;
          const pct = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
          const isSelected = userVote?.id === option.id;

          if (hasVoted || isExpired) {
            return (
              <div
                key={option.id}
                className="relative h-10 w-full bg-neutral-950 border border-neutral-800/80 rounded-xl overflow-hidden flex items-center justify-between px-4 text-sm font-semibold"
              >
                <div
                  style={{ width: `${pct}%` }}
                  className={cn(
                    "absolute left-0 top-0 bottom-0 transition-all duration-500",
                    isSelected ? "bg-zinc-700/60" : "bg-black/60"
                  )}
                />

                <span className="relative z-10 flex items-center gap-1.5">
                  {option.text}
                  {isSelected && <span className="text-[10px] text-white font-normal">(voted)</span>}
                </span>
                <span className="relative z-10 text-xs text-neutral-450">{pct}% ({voteCount})</span>
              </div>
            );
          }

          return (
            <button
              key={option.id}
              disabled={!!votingId}
              onClick={() => handleVote(option.id)}
              className="h-10 w-full bg-neutral-950 border border-neutral-800 hover:border-primary/50 hover:bg-neutral-900 rounded-xl text-left px-4 text-sm font-semibold transition-all flex items-center justify-between disabled:opacity-50"
            >
              <span>{option.text}</span>
              {votingId === option.id && <Loader2 className="size-4 animate-spin text-primary" />}
            </button>
          );
        })}
      </div>

      <span className="text-[11px] text-neutral-500 font-semibold self-start mt-0.5">
        Total: {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
      </span>
    </div>
  );
}

// Comment Button helper
function CommentButton({ post, onClick }: { post: PostData; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="h-11 px-2 flex items-center gap-2 hover:opacity-80 transition-opacity text-instagram-lightText dark:text-instagram-darkText"
      title="Comment"
    >
      <CommentIcon className="size-6" />
      {post._count.comments > 0 && (
        <span className="text-[15px] font-semibold tabular-nums text-instagram-lightText dark:text-instagram-darkText">
          {post._count.comments}
        </span>
      )}
    </button>
  );
}


