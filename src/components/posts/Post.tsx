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
  MoreVertical,
  X,
  Heart,
  MessageCircle
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
import { motion, AnimatePresence } from "framer-motion";
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
    <div className="flex w-full items-stretch relative mb-4">
      <article className={cn(
        "flex-grow group/post w-full bg-[#ffffff]/60 dark:bg-[#0c0d14]/40 border border-zinc-200/50 dark:border-zinc-800/85 rounded-3xl pb-3 transition-all duration-300 min-w-0 shadow-sm backdrop-blur-md overflow-hidden",
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
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveRightDrawer(activeRightDrawer === "options" ? null : "options");
            }}
            className="text-zinc-650 dark:text-zinc-350 hover:text-zinc-950 dark:hover:text-white h-9 w-9 flex items-center justify-center rounded-full hover:bg-zinc-150 dark:hover:bg-zinc-800/60 border border-zinc-200/40 dark:border-zinc-800/40 transition-all cursor-pointer"
            title="Options"
          >
            <MoreVertical className="size-5" />
          </button>
        </div>
      </div>

      {/* Caption */}
      {post.content && (
        <div className="px-3 pb-2 pt-1">
          <PostCaption username={post.user.username} text={post.content} />
        </div>
      )}

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

      {/* Action Center - Horizontal Glassmorphism Pill & Save/Bookmark Corner */}
      <div className="px-3 py-2 flex items-center justify-between select-none">
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
                <Heart
                  className={cn(
                    "size-5 transition-colors duration-200",
                    likeData.isLikedByUser ? "fill-rose-500 text-rose-500" : "text-white"
                  )}
                  strokeWidth={2}
                />
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
                setActiveRightDrawer(activeRightDrawer === "comments" ? null : "comments");
              }}
              className={cn(
                "h-11 w-11 rounded-full flex items-center justify-center bg-[#1b1c26]/65 border border-white/5 hover:bg-[#1b1c26]/90 transition-all text-white cursor-pointer",
                activeRightDrawer === "comments" && "bg-indigo-650 ring-4 ring-indigo-500/20"
              )}
              title="Comments"
            >
              <MessageCircle className="size-5 text-white transition-colors duration-200" strokeWidth={2} />
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
                setActiveRightDrawer(activeRightDrawer === "repost" ? null : "repost");
              }}
              className={cn(
                "h-11 w-11 rounded-full flex items-center justify-center bg-[#1b1c26]/65 border border-white/5 hover:bg-[#1b1c26]/90 transition-all text-white cursor-pointer",
                activeRightDrawer === "repost" && "bg-indigo-650 ring-4 ring-indigo-500/20"
              )}
              title="Repost"
            >
              <Repeat
                className={cn(
                  "size-5 text-white transition-colors duration-200",
                  repostData.isRepostedByUser && "text-green-500"
                )}
                strokeWidth={2}
              />
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
                setActiveRightDrawer(activeRightDrawer === "share" ? null : "share");
              }}
              className={cn(
                "h-11 w-11 rounded-full flex items-center justify-center bg-[#1b1c26]/65 border border-white/5 hover:bg-[#1b1c26]/90 transition-all text-white cursor-pointer",
                activeRightDrawer === "share" && "bg-indigo-650 ring-4 ring-indigo-500/20"
              )}
              title="Share"
            >
              <Send className="size-5 text-white transition-colors duration-200" strokeWidth={2} />
            </motion.button>
          </div>

          {/* Shop Look Button */}
          {hasAttachedProducts && (
            <div className="flex items-center border-l border-white/10 pl-2">
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  setActiveRightDrawer(activeRightDrawer === "shop" ? null : "shop");
                }}
                className={cn(
                  "h-11 w-11 flex items-center justify-center rounded-full text-white shadow-xl cursor-pointer transition-all duration-300",
                  activeRightDrawer === "shop"
                    ? "bg-[#6366f1] ring-4 ring-[#6366f1]/35 border border-indigo-400"
                    : "bg-[#6366f1] hover:bg-[#4f46e5] border border-indigo-500/20"
                )}
                title="Shop Look"
              >
                <ShoppingBag className="size-5 text-white" strokeWidth={2} />
              </motion.button>
              <span className="text-[12px] font-bold text-[#6366f1] ml-1 pr-1.5">
                Shop
              </span>
            </div>
          )}
        </div>

        {/* Save/Bookmark Corner */}
        <BookmarkButton
          postId={post.id}
          initialState={{
            isBookmarkedByUser: post.bookmarks.some(
              (bookmark) => bookmark.userId === user.id
            )
          }}
        />
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

          /* alexroumi view-all button — blue platform fill sweep */
          .reel-view-all-btn {
            border: unset;
            border-radius: 12px;
            color: #212121;
            z-index: 1;
            background: #e8e8e8;
            position: relative;
            font-weight: 800;
            font-size: 12px;
            box-shadow: 4px 8px 19px -3px rgba(0,0,0,0.27);
            transition: all 250ms;
            overflow: hidden;
            cursor: pointer;
            letter-spacing: 0.05em;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
          }
          .reel-view-all-btn::before {
            content: "";
            position: absolute;
            top: 0; left: 0;
            height: 100%;
            width: 0;
            border-radius: 12px;
            background-color: #4f46e5;
            z-index: -1;
            box-shadow: 4px 8px 19px -3px rgba(79,70,229,0.35);
            transition: all 250ms;
          }
          .reel-view-all-btn:hover { color: #ffffff; }
          .reel-view-all-btn:hover::before { width: 100%; }
        `
      }} />
    </article>

    {/* Right Sidebar Panel Drawer (Viewport-level Overlay: fixed) */}
    <AnimatePresence>
      {activeRightDrawer && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setActiveRightDrawer(null);
              setOptionsView("menu");
              setReported(false);
            }}
            className="fixed inset-0 bg-black/60 z-[200] cursor-pointer"
          />

          {/* Sidebar Drawer panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="fixed right-0 top-0 bottom-0 sm:right-4 sm:top-4 sm:bottom-4 w-full sm:w-[450px] bg-[#07080d] border-l sm:border border-zinc-900/60 rounded-none sm:rounded-[24px] shadow-2xl z-[210] flex flex-col text-white overflow-hidden"
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
                  {desktopFilteredProducts.slice(0, 4).map((prod) => {
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

                {/* Sticky Bottom Actions */}
                {desktopFilteredProducts.length > 4 && (
                  <div className="border-t border-zinc-900/60 bg-[#07080d] p-4 flex flex-col gap-3.5 shrink-0 select-none">
                    <button
                      onClick={() => {
                        setIsShoppingDrawerOpen(true);
                      }}
                      className="reel-view-all-btn w-full py-3.5"
                    >
                      <span>View all {desktopFilteredProducts.length} products</span>
                      <span style={{ fontSize: 14 }}>&#8594;</span>
                    </button>
                  </div>
                )}
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
                {/* Header */}
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
                  
                  <button
                    onClick={() => setActiveRightDrawer(null)}
                    className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="size-4.5" />
                  </button>
                </div>

                {/* Top Glassmorphic Search Bar */}
                <div className="px-4 py-3 border-b border-zinc-900/40 bg-[#07080d]/80 shrink-0">
                  <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-550" />
                    <input
                      type="text"
                      placeholder="Search people..."
                      value={shareSearchQuery}
                      onChange={(e) => setShareSearchQuery(e.target.value)}
                      className="w-full bg-[#12131a] border border-zinc-800 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder:text-zinc-650 outline-none focus:border-zinc-700 font-medium transition-colors"
                    />
                  </div>
                </div>

                {/* Vertical Scroll List of Contacts */}
                <div className="flex-grow overflow-y-auto p-4 space-y-1.5 scrollbar-none bg-[#07080d]">
                  {loadingContacts ? (
                    <div className="flex h-32 items-center justify-center">
                      <Loader2 className="size-5 animate-spin text-zinc-600" />
                    </div>
                  ) : filteredShareContacts.length > 0 ? (
                    filteredShareContacts.map((contact: any) => {
                      const isOnline = contact.online ?? (contact.id.charCodeAt(0) % 2 === 0);
                      const firstLetter = (contact.name || contact.displayName || contact.username || "?")[0].toUpperCase();

                      return (
                        <button
                          key={contact.id}
                          onClick={() => handleShareToUser(contact)}
                          className="flex items-center justify-between w-full p-2.5 rounded-2xl hover:bg-[#12131a] border border-transparent hover:border-zinc-850/40 transition-all select-none cursor-pointer group"
                        >
                          <div className="flex items-center gap-3 min-w-0 text-left">
                            <div className="relative size-10 rounded-full bg-indigo-650 border border-zinc-800 shrink-0 flex items-center justify-center">
                              {contact.image || contact.avatarUrl ? (
                                <img
                                  src={contact.image || contact.avatarUrl}
                                  alt={contact.name}
                                  className="w-full h-full object-cover rounded-full"
                                />
                              ) : (
                                <span className="font-bold text-sm text-white select-none">{firstLetter}</span>
                              )}
                              {isOnline && (
                                <span className="absolute bottom-0 right-0 size-2.5 bg-green-500 border-2 border-[#07080d] rounded-full" />
                              )}
                            </div>
                            
                            <div className="min-w-0">
                              <span className="text-xs font-black text-white group-hover:text-indigo-400 transition-colors block truncate">
                                {contact.name || contact.displayName || contact.username}
                              </span>
                              <span className="text-[10px] text-zinc-550 block truncate">@{contact.username}</span>
                            </div>
                          </div>

                          <span className="text-[10.5px] font-black text-zinc-400 bg-[#12131a] hover:bg-[#1f202a] hover:text-white px-3 py-1.5 border border-zinc-850 rounded-xl transition-all">
                            Send
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="flex h-32 items-center justify-center text-xs text-zinc-550 font-bold select-none">
                      No contacts found.
                    </div>
                  )}
                </div>

                {/* Uiverse Nebulous sharing dock */}
                <style dangerouslySetInnerHTML={{
                  __html: `
                    .nebulous-wrapper {
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      width: 100%;
                      padding: 10px 0;
                      background: transparent;
                    }
                    .dock-container {
                      position: relative;
                      padding: 10px;
                      background: rgba(15, 15, 20, 0.4);
                      backdrop-filter: blur(24px) saturate(180%);
                      border-radius: 24px;
                      border: 1px solid rgba(255, 255, 255, 0.08);
                      display: flex;
                      align-items: center;
                      gap: 12px;
                      box-shadow: 
                        0 20px 50px -10px rgba(0, 0, 0, 0.5),
                        inset 0 1px 1px rgba(255, 255, 255, 0.1);
                      z-index: 10;
                      animation: dockReveal 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                    }
                    .dock-container::before {
                      content: '';
                      position: absolute;
                      inset: -20px;
                      background: radial-gradient(circle at 50% 50%, rgba(100, 100, 255, 0.15), transparent 70%);
                      z-index: -1;
                      filter: blur(20px);
                      pointer-events: none;
                    }
                    .dock-item {
                      position: relative;
                      width: 44px;
                      height: 44px;
                      cursor: pointer;
                      transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                      outline: none;
                    }
                    .icon-box {
                      width: 100%;
                      height: 100%;
                      clip-path: url(#squircleClip);
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                      position: relative;
                      overflow: hidden;
                    }
                    .icon-box::after {
                      content: '';
                      position: absolute;
                      top: 0; left: 0; right: 0;
                      height: 50%;
                      background: linear-gradient(to bottom, rgba(255,255,255,0.15), transparent);
                      pointer-events: none;
                    }
                    .dock-item:hover {
                      transform: scale(1.2) translateY(-12px);
                      z-index: 20;
                    }
                    .dock-item:hover .icon-box {
                      box-shadow: 0 15px 30px -5px rgba(0, 0, 0, 0.5);
                    }
                    .icon-box svg {
                      width: 22px;
                      height: 22px;
                      fill: white;
                      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
                      transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                    }
                    .dock-item:hover svg {
                      transform: scale(1.1);
                    }
                    .tooltip {
                      position: absolute;
                      top: -45px;
                      left: 50%;
                      transform: translateX(-50%) translateY(10px);
                      background: rgba(0, 0, 0, 0.8);
                      color: white;
                      padding: 4px 10px;
                      border-radius: 8px;
                      font-size: 11px;
                      font-weight: 600;
                      white-space: nowrap;
                      opacity: 0;
                      pointer-events: none;
                      transition: all 0.3s ease;
                      border: 1px solid rgba(255, 255, 255, 0.1);
                      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    }
                    .dock-item:hover .tooltip {
                      opacity: 1;
                      transform: translateX(-50%) translateY(0);
                    }
                    .github { background: linear-gradient(135deg, #2b3137, #111); border: 1px solid rgba(255,255,255,0.1); }
                    .linkedin { background: linear-gradient(135deg, #0077b5, #005582); border: 1px solid rgba(0, 119, 181, 0.5); }
                    .youtube { background: linear-gradient(135deg, #ff0000, #cc0000); border: 1px solid rgba(255, 0, 0, 0.5); }
                    .discord { background: linear-gradient(135deg, #5865f2, #4752c4); border: 1px solid rgba(88, 101, 242, 0.5); }
                    .instagram { background: linear-gradient(135deg, #405de6, #5851db, #833ab4, #c13584, #e1306c, #fd1d1d); border: 1px solid rgba(193, 53, 132, 0.5); }
                    .twitter-x { background: linear-gradient(135deg, #111, #333); border: 1px solid rgba(255,255,255,0.1); }
                    .more-btn { 
                      background: rgba(255, 255, 255, 0.05); 
                      border: 1px dashed rgba(255, 255, 255, 0.2); 
                      color: white;
                    }
                    .more-menu-trigger {
                      position: relative;
                    }
                    .popover {
                      position: absolute;
                      bottom: 60px;
                      right: 0;
                      background: rgba(15, 15, 20, 0.95);
                      backdrop-filter: blur(20px);
                      border: 1px solid rgba(255, 255, 255, 0.08);
                      border-radius: 20px;
                      padding: 16px;
                      display: grid;
                      grid-template-columns: repeat(4, 1fr);
                      gap: 12px;
                      visibility: hidden;
                      opacity: 0;
                      transform: translateY(20px) scale(0.95);
                      transform-origin: bottom right;
                      transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                      box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.6);
                      z-index: 100;
                    }
                    .more-menu-trigger:focus-within .popover,
                    .more-menu-trigger:hover .popover {
                      visibility: visible;
                      opacity: 1;
                      transform: translateY(0) scale(1);
                    }
                    .popover-item {
                      display: flex;
                      flex-direction: column;
                      align-items: center;
                      gap: 6px;
                      text-decoration: none;
                      transition: transform 0.2s ease;
                      cursor: pointer;
                    }
                    .popover-item:hover {
                      transform: translateY(-4px);
                    }
                    .popover-icon {
                      width: 36px;
                      height: 36px;
                      clip-path: url(#squircleClip);
                      display: flex;
                      align-items: center;
                      justify-content: center;
                    }
                    .popover-icon svg {
                      width: 18px;
                      height: 18px;
                      fill: white;
                    }
                    .popover-label {
                      font-size: 10px;
                      color: rgba(255, 255, 255, 0.6);
                      font-weight: 500;
                    }

                    @keyframes dockReveal {
                      from { opacity: 0; transform: translateY(20px); }
                      to { opacity: 1; transform: translateY(0); }
                    }
                  `
                }} />

                <svg width="0" height="0" style={{ position: "absolute" }}>
                  <defs>
                    <clipPath id="squircleClip" clipPathUnits="objectBoundingBox">
                      <path d="M 0,0.5 C 0,0 0,0 0.5,0 S 1,0 1,0.5 1,1 0.5,1 0,1 0,0.5"></path>
                    </clipPath>
                  </defs>
                </svg>

                <div className="nebulous-wrapper">
                  <div className="dock-container">
                    {/* Copy Link */}
                    <button className="dock-item" onClick={() => handleSharePlatform("copy")}>
                      <span className="tooltip">Copy Link</span>
                      <div className="icon-box copy-link">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="size-5.5 text-white">
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                        </svg>
                      </div>
                    </button>

                    {/* LinkedIn */}
                    <button className="dock-item" onClick={() => handleSharePlatform("linkedin")}>
                      <span className="tooltip">LinkedIn</span>
                      <div className="icon-box linkedin">
                        <svg viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                      </div>
                    </button>

                    {/* WhatsApp */}
                    <button className="dock-item" onClick={() => handleSharePlatform("whatsapp")}>
                      <span className="tooltip">WhatsApp</span>
                      <div className="icon-box whatsapp" style={{ background: "linear-gradient(135deg, #25D366, #075E54)" }}>
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.717-1.454L0 24zm6.59-4.846c1.6.95 3.198 1.451 4.85 1.453 5.485 0 9.948-4.463 9.952-9.953.002-2.66-1.023-5.161-2.887-7.026-1.865-1.865-4.368-2.889-7.03-2.89-5.488 0-9.954 4.465-9.958 9.956-.002 1.8.482 3.56 1.402 5.12L1.134 20.85l4.513-1.183zm11.93-6.848c-.287-.144-1.7-.84-1.967-.938-.268-.097-.463-.144-.658.144-.195.288-.755.938-.926 1.13-.17.193-.34.217-.627.073-.287-.144-1.21-.447-2.306-1.425-.853-.76-1.43-1.7-1.597-1.987-.17-.287-.018-.443.126-.585.13-.127.287-.336.43-.504.143-.168.19-.288.286-.48.096-.193.048-.36-.024-.504-.072-.144-.658-1.585-.902-2.17-.238-.574-.48-.496-.658-.504-.17-.008-.365-.008-.56-.008s-.51.072-.777.36c-.267.288-1.02 1.008-1.02 2.46s1.056 2.856 1.203 3.048c.146.192 2.078 3.174 5.034 4.453.703.303 1.25.484 1.678.62.707.224 1.35.193 1.86.117.567-.085 1.7-.696 1.94-1.37.24-.672.24-1.25.17-1.37-.07-.12-.26-.19-.55-.336z"/></svg>
                      </div>
                    </button>

                    {/* TikTok */}
                    <button className="dock-item" onClick={() => handleSharePlatform("tiktok")}>
                      <span className="tooltip">TikTok</span>
                      <div className="icon-box tiktok">
                        <svg viewBox="0 0 24 24"><path d="M12.525.02c1.31-.032 2.612-.019 3.916-.01.12 2.3.824 4.562 2.49 6.273.1.1.2.19.3.28-.01 1.597-.013 3.193-.013 4.79-1.233-.08-2.42-.48-3.414-1.22-.303-.223-.585-.47-.84-.737v7.098c.046 3.256-1.503 6.478-4.606 7.724-3.067 1.258-6.857.545-9.15-1.848C-1.11 19.956-1.1 15.65 1.144 13.062c1.484-1.737 3.743-2.73 6.015-2.735v4.757c-1.306.015-2.61.6-3.393 1.636-1.012 1.34-1.1 3.243-.23 4.674 1.01 1.67 3.232 2.373 5.02 1.65 1.534-.622 2.417-2.222 2.4-3.864V.02z"/></svg>
                      </div>
                    </button>

                    {/* X (Twitter) */}
                    <button className="dock-item" onClick={() => handleSharePlatform("twitter-x")}>
                      <span className="tooltip">X (Twitter)</span>
                      <div className="icon-box twitter-x">
                        <svg viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.134l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                      </div>
                    </button>

                    {/* More Menu Trigger */}
                    <div className="more-menu-trigger">
                      <div className="dock-item">
                        <span className="tooltip">More Apps</span>
                        <div className="icon-box more-btn">
                          <svg viewBox="0 0 24 24"><path d="M6 12c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm6-2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
                        </div>
                      </div>
                      
                      {/* Popover Menu */}
                      <div className="popover">
                        {/* GitHub */}
                        <button className="popover-item" onClick={() => handleSharePlatform("github")}>
                          <div className="popover-icon github">
                            <svg viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                          </div>
                          <span className="popover-label">GitHub</span>
                        </button>

                        {/* YouTube */}
                        <button className="popover-item" onClick={() => handleSharePlatform("youtube")}>
                          <div className="popover-icon youtube">
                            <svg viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                          </div>
                          <span className="popover-label">YouTube</span>
                        </button>

                        {/* Discord */}
                        <button className="popover-item" onClick={() => handleSharePlatform("discord")}>
                          <div className="popover-icon discord">
                            <svg viewBox="0 0 24 24"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0189 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1568 2.4189Z"/></svg>
                          </div>
                          <span className="popover-label">Discord</span>
                        </button>

                        {/* Reddit */}
                        <button className="popover-item" onClick={() => handleSharePlatform("reddit")}>
                          <div className="popover-icon reddit">
                            <svg viewBox="0 0 24 24"><path d="M24 11.779c0-1.459-1.192-2.645-2.657-2.645-.715 0-1.363.286-1.84.746-2.108-1.522-5.02-2.512-8.244-2.615l1.403-6.592 4.604.98c.032.774.673 1.396 1.46 1.396 1.511 0 2.454-1.44 2.454-2.645 0-1.459-1.192-2.645-2.657-2.645-.818 0-1.554.37-2.051.954l-5.185-1.104c-.172-.037-.344.067-.393.232l-1.638 7.701c-3.236.096-6.17 1.082-8.293 2.612-.478-.446-1.114-.72-1.796-.72-1.465 0-2.657 1.186-2.657 2.645 0 .973.53 1.817 1.314 2.278-.04.22-.061.445-.061.674 0 3.511 4.223 6.368 9.42 6.368s9.42-2.857 9.42-6.368c0-.214-.017-.425-.052-.633.82-.455 1.378-1.314 1.378-2.31zM6.621 13.916c0-.853.695-1.549 1.549-1.549s1.549.696 1.549 1.549-.695 1.549-1.549 1.549-1.549-.696-1.549-1.549zm9.585 4.397c-1.312 1.313-4.498 1.379-5.105 1.379-.606 0-3.792-.066-5.104-1.379-.166-.165-.166-.432 0-.597.166-.166.432-.166.597 0 1.054 1.054 3.738 1.157 4.507 1.157s3.454-.103 4.507-1.157c.165-.166.432-.166.597 0 .166.166.166.431 0 .597zm-.437-2.848c-.854 0-1.549-.696-1.549-1.549s.695-1.549 1.549-1.549c.853 0 1.549.696 1.549 1.549s-.696 1.549-1.549 1.549z"/></svg>
                          </div>
                          <span className="popover-label">Reddit</span>
                        </button>

                        {/* Pinterest */}
                        <button className="popover-item" onClick={() => handleSharePlatform("pinterest")}>
                          <div className="popover-icon pinterest">
                            <svg viewBox="0 0 24 24"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.965 1.406-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.497 3.141 1.122.338 2.303.521 3.527.521 6.615 0 11.987-5.373 11.987-11.987C24.018 5.367 18.646 0 12.017 0z"/></svg>
                          </div>
                          <span className="popover-label">Pinterest</span>
                        </button>

                        {/* Slack */}
                        <button className="popover-item" onClick={() => handleSharePlatform("slack")}>
                          <div className="popover-icon slack">
                            <svg viewBox="0 0 24 24"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52h-2.521zM8.834 6.313a2.527 2.527 0 0 1 2.521 2.521 2.527 2.527 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.958 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.527 2.527 0 0 1-2.52 2.521h-2.522v-2.521zM17.687 8.834a2.527 2.527 0 0 1-2.521 2.521 2.527 2.527 0 0 1-2.521-2.521V2.522A2.527 2.527 0 0 1 15.166 0a2.527 2.527 0 0 1 2.521 2.522v6.312zM15.166 18.958a2.528 2.528 0 0 1 2.521 2.522A2.528 2.528 0 0 1 15.166 24a2.527 2.527 0 0 1-2.52-2.52v-2.522h2.52zM15.166 17.687a2.527 2.527 0 0 1-2.52 2.521 2.527 2.527 0 0 1-2.521-2.521v-6.313a2.527 2.527 0 0 1 2.521-2.521 2.527 2.527 0 0 1 2.521 2.521v6.313z"/></svg>
                          </div>
                          <span className="popover-label">Slack</span>
                        </button>

                        {/* Figma */}
                        <button className="popover-item" onClick={() => handleSharePlatform("figma")}>
                          <div className="popover-icon figma">
                            <svg viewBox="0 0 24 24"><path d="M12 0C8.688 0 6 2.688 6 6v3c0 3.312 2.688 6 6 6s6-2.688 6-6-2.688-6-6-6zm-6 12c-3.312 0-6 2.688-6 6s2.688 6 6 6 6-2.688 6-6-2.688-6-6-6zm12 0c-3.312 0-6 2.688-6 6s2.688 6 6 6 6-2.688 6-6-2.688-6-6-6z"/></svg>
                          </div>
                          <span className="popover-label">Figma</span>
                        </button>
                      </div>
                    </div>
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
                    className="flex items-start gap-4 px-4 py-4 rounded-2xl hover:bg-zinc-900 active:bg-zinc-950 transition-colors w-full text-start group"
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
                    className="flex items-start gap-4 px-4 py-4 rounded-2xl hover:bg-zinc-900 active:bg-zinc-950 transition-colors w-full text-start group"
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
          </motion.div>
        </>
      )}
    </AnimatePresence>
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


