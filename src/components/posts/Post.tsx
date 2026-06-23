"use client";

import { useSession } from "@/app/(main)/SessionProvider";
import { PostData } from "@/lib/types";
import { cn, formatRelativeDate } from "@/lib/utils";
import { Media } from "@prisma/client";
import {
  Globe,
  Lock,
  Users,
  MapPin,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Share2,
  Repeat2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Comments from "../comments/Comments";
import Linkify from "../Linkify";
import UserAvatar from "../UserAvatar";
import UserTooltip from "../UserTooltip";
import BookmarkButton from "./BookmarkButton";
import LikeButton from "./LikeButton";
import PostMoreButton from "./PostMoreButton";
import VideoPlayer from "../VideoPlayer";
import { useToast } from "../ui/use-toast";
import { formatDistanceToNow } from "date-fns";
import MediaViewer from "./MediaViewer";
import RepostButton from "./RepostButton";
import CollectionSelector from "./CollectionSelector";
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

export default function Post({ post }: PostProps) {
  const { user } = useSession();
  const { toast } = useToast();
  const [showComments, setShowComments] = useState(false);
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

  const { data: groupedStories = [] } = useQuery<any[]>({
    queryKey: ["stories"],
    queryFn: () => kyInstance.get("/api/stories").json<any[]>(),
    staleTime: 60 * 1000,
  });

  const hasActiveStory = groupedStories.some(
    (item) => item.user.id === post.user.id && item.stories.length > 0
  );

  const getAudienceIcon = (aud: string) => {
    switch (aud) {
      case "PUBLIC":
        return <span title="Public"><Globe className="size-3 text-[#8e8e93]" /></span>;
      case "FOLLOWERS":
        return <span title="Followers"><Users className="size-3 text-[#8e8e93]" /></span>;
      case "CLOSE_FRIENDS":
        return <span className="text-[10px] text-yellow-500 font-bold" title="Close Friends">⭐</span>;
      case "PRIVATE":
        return <span title="Only Me"><Lock className="size-3 text-[#8e8e93]" /></span>;
      default:
        return <span title="Public"><Globe className="size-3 text-[#8e8e93]" /></span>;
    }
  };

  const renderLikesText = () => {
    const count = post._count.likes;
    if (count === 0 || likingUsers.length === 0) return null;
    const names = likingUsers.map(u => u.displayName || u.username);
    if (count === 1) {
      return (
        <span>
          Liked by <span className="font-bold text-white">{names[0]}</span>
        </span>
      );
    }
    if (count === 2) {
      return (
        <span>
          Liked by <span className="font-bold text-white">{names[0]}</span> and <span className="font-bold text-white">{names[1]}</span>
        </span>
      );
    }
    const diff = count - 2;
    if (diff <= 0) {
      return (
        <span>
          Liked by <span className="font-bold text-white">{names[0]}</span> and <span className="font-bold text-white">{names[1]}</span>
        </span>
      );
    }
    return (
      <span>
        Liked by <span className="font-bold text-white">{names[0]}</span>, <span className="font-bold text-white">{names[1]}</span> and <span className="font-bold text-white">{diff} other{diff > 1 ? "s" : ""}</span>
      </span>
    );
  };

  const handleShare = () => {
    const url = `${window.location.origin}/posts/${post.id}`;
    navigator.clipboard.writeText(url);
    toast({
      description: "Post link copied to clipboard.",
    });
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

  return (
    <article className="group/post space-y-3.5 py-4 border-b border-neutral-900 bg-black relative w-full">
      {/* Track Post View */}
      <PostViewTracker postId={post.id} />

      {/* Repost Header */}
      {repostInfo && (
        <div className="flex items-center gap-1.5 text-xs text-[#8e8e93] font-semibold px-1 -mt-1 mb-2">
          <Repeat2 className="size-3.5 text-green-500" strokeWidth={2.25} />
          <span>{repostInfo.user.displayName} reposted</span>
        </div>
      )}

      <div className="flex justify-between gap-3 px-1">
        <div className="flex flex-wrap gap-3">
          <UserTooltip user={post.user}>
            <Link href={`/users/${post.user.username}`} className="flex-shrink-0">
              {hasActiveStory ? (
                <div className="rounded-full p-[2px] bg-gradient-to-tr from-[#f58529] via-[#dd2a7b] to-[#8134af]">
                  <div className="rounded-full p-[1.5px] bg-[#000000]">
                    <UserAvatar avatarUrl={post.user.avatarUrl} size={48} className="w-[48px] h-[48px]" />
                  </div>
                </div>
              ) : (
                <UserAvatar avatarUrl={post.user.avatarUrl} size={48} className="w-[48px] h-[48px]" />
              )}
            </Link>
          </UserTooltip>
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-1.5">
              <UserTooltip user={post.user}>
                <Link
                  href={`/users/${post.user.username}`}
                  className="block text-[16px] font-semibold hover:underline text-white flex items-center gap-1"
                >
                  <span>{post.user.username}</span>
                  {post.user.verified && (
                    <span className="text-[#0095f6] font-bold text-[13px]" title="Verified Creator">☑</span>
                  )}
                </Link>
              </UserTooltip>
              {post.collaborators && Array.isArray(post.collaborators) && post.collaborators.map((collab: any) => (
                <span key={collab} className="text-xs text-[#8e8e93] font-semibold">
                  • colab @{collab}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-[14px] text-[#8e8e93]">
              <Link
                href={`/posts/${post.id}`}
                className="hover:underline"
                suppressHydrationWarning
              >
                {formatRelativeDate(post.createdAt)}
              </Link>
              <span>•</span>
              {getAudienceIcon(post.audience)}

              {post.location && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-0.5 font-medium text-[#8e8e93]">
                    <MapPin className="size-3.5 flex-shrink-0" />
                    <span>{post.location}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        {post.user.id === user.id && (
          <PostMoreButton
            post={post}
            className="opacity-0 transition-opacity group-hover/post:opacity-100"
          />
        )}
      </div>

      <Linkify>
        <div className="whitespace-pre-line break-words text-[16px] leading-[24px] text-white px-1 mt-3">{post.content}</div>
      </Linkify>

      {/* POLL WIDGET */}
      {post.poll && (
        <div className="px-1">
          <PollWidget poll={post.poll} userId={user.id} />
        </div>
      )}

      {/* MULTI-MEDIA CAROUSEL WITH INTERACTIVE TAGGING */}
      {!!post.attachments.length && (
        <div className="mt-2">
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
      <div className="flex justify-between items-center gap-5 pt-3 px-1">
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
            className="h-11 w-11 flex items-center justify-center hover:opacity-85 transition-opacity text-white"
            title="Share"
          >
            <Share2 className="size-6" strokeWidth={1.75} />
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

      {/* Likes row */}
      {!post.hideLikes && post._count.likes > 0 && (
        <div 
          onClick={() => setShowLikesSheet(true)}
          className="flex items-center gap-2 mt-2 px-1 cursor-pointer hover:opacity-85 transition-opacity select-none"
        >
          {likingUsers.length > 0 ? (
            <>
              <div className="flex -space-x-1.5 overflow-hidden">
                {likingUsers.slice(0, 3).map((u: any) => (
                  <img
                    key={u.id}
                    className="inline-block size-5 rounded-full ring-1 ring-black object-cover shrink-0"
                    src={u.avatarUrl || "/avatar-placeholder.png"}
                    alt={u.username}
                  />
                ))}
              </div>
              <span className="text-[14px] text-[#8e8e93] leading-none">
                {renderLikesText()}
              </span>
            </>
          ) : (
            <span className="text-[14px] font-semibold text-white leading-none">
              {post._count.likes} {post._count.likes === 1 ? "like" : "likes"}
            </span>
          )}
        </div>
      )}

      {/* Quote Post Card */}
      {post.quotedPost && (
        <div className="px-1">
          <Link
            href={`/posts/${post.quotedPost.id}`}
            className="block border border-border/80 hover:border-border/60 hover:bg-neutral-800/10 rounded-xl p-3 mt-2 text-xs transition-colors"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <UserAvatar avatarUrl={post.quotedPost.user.avatarUrl} size={20} />
              <span className="font-semibold text-neutral-200 flex items-center gap-0.5">
                <span>{post.quotedPost.user.displayName}</span>
                {post.quotedPost.user.verified && (
                  <span className="text-primary font-bold text-[10px]" title="Verified Creator">☑</span>
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

      {showComments && <Comments post={post} />}

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

  if (!attachments.length) return null;

  const currentMedia = attachments[index];
  const isVideo = currentMedia.mediaType === "VIDEO";

  const activeTags = Array.isArray(tags)
    ? tags.filter((t: any) => t.mediaIndex === index)
    : [];

  return (
    <div className="relative w-full aspect-[4/5] bg-zinc-900 rounded-xl sm:rounded-2xl overflow-hidden group select-none flex items-center justify-center border border-border/5">
      {/* Media Element */}
      <div
        className="w-full h-full flex items-center justify-center relative cursor-pointer"
        onClick={() => {
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
        <span>📊 Poll</span>
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
                    isSelected ? "bg-primary/25" : "bg-neutral-800/40"
                  )}
                />

                <span className="relative z-10 flex items-center gap-1.5">
                  {option.text}
                  {isSelected && <span className="text-[10px] text-primary">✔ voted</span>}
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
      className="h-11 px-2 flex items-center gap-2 hover:opacity-80 transition-opacity text-white"
      title="Comment"
    >
      <MessageCircle className="size-6" strokeWidth={1.75} />
      {post._count.comments > 0 && (
        <span className="text-[15px] font-semibold tabular-nums text-white">
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
