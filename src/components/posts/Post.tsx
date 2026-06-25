"use client";

import { useSession } from "@/app/(main)/SessionProvider";
import { PostData } from "@/lib/types";
import { cn, formatRelativeDate } from "@/lib/utils";
import { Media } from "@prisma/client";
import {
  MapPin,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { DirectShareIcon, CommentIcon, RepostIcon } from "@/components/icons/InstagramIcons";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
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
import { useQuery } from "@tanstack/react-query";
import kyInstance from "@/lib/ky";

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
    <div className="py-0.5 text-sm text-instagram-lightText dark:text-instagram-darkText leading-tight">
      <p>
        <Link href={`/users/${username}`} className="font-semibold mr-2 hover:underline">
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
      </p>
    </div>
  );
}

export default function Post({ post }: PostProps) {
  const { user } = useSession();
  const { toast } = useToast();
  const [showComments, setShowComments] = useState(false);
  const [isNotInterested, setIsNotInterested] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

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
    <article className="group/post w-full bg-white dark:bg-instagram-darkBg border-b border-instagram-lightBorder dark:border-instagram-darkBorder mt-0 mb-0 pb-1 transition-colors duration-200">
      {/* Track Post View */}
      <PostViewTracker postId={post.id} />

      {/* Repost Header */}
      {repostInfo && (
        <div className="flex items-center gap-1.5 text-xs text-[#8e8e93] font-semibold px-3 -mt-1 mb-1">
          <RepostIcon className="size-3.5 text-green-500" />
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

      {/* Action Center - Placed immediately beneath the media/content */}
      <div className="flex justify-between items-center w-full px-3 pt-1.5 pb-0 text-instagram-lightText dark:text-instagram-darkText">
        <div className="flex items-center gap-2">
          <LikeButton
            postId={post.id}
            initialState={{
              likes: post._count.likes,
              isLikedByUser: post.likes.some((like) => like.userId === user.id),
            }}
            hideLikes={true}
          />
          <CommentButton
            post={post}
            onClick={() => setShowComments(!showComments)}
          />
          <RepostButton post={post} />

          <button
            onClick={handleShare}
            className="h-11 w-11 flex items-center justify-center hover:opacity-85 transition-opacity"
            title="Share"
          >
            <DirectShareIcon className="size-6" />
          </button>
        </div>

        <div>
          <BookmarkButton
            postId={post.id}
            initialState={{
              isBookmarkedByUser: post.bookmarks.some(
                (bookmark) => bookmark.userId === user.id,
              ),
            }}
            onSaved={() => setShowCollectionSelector(true)}
          />
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
    </article>
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
      className="relative w-full aspect-[4/5] bg-zinc-900 rounded-xl sm:rounded-2xl overflow-hidden group select-none flex items-center justify-center border border-border/5"
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

// Loader icon helper
function Loader2(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
