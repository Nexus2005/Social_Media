"use client";

import { useSession } from "@/app/(main)/SessionProvider";
import { PostData } from "@/lib/types";
import { cn, formatRelativeDate } from "@/lib/utils";
import { Media } from "@prisma/client";
import { MessageSquare, MapPin, ChevronLeft, ChevronRight, Globe, Lock, Users, EyeOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
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

interface PostProps {
  post: PostData;
}

export default function Post({ post }: PostProps) {
  const { user } = useSession();
  const [showComments, setShowComments] = useState(false);

  // Audience Icon picker
  const getAudienceIcon = (aud: string) => {
    switch (aud) {
      case "PUBLIC":
        return <span title="Public"><Globe className="size-3 text-muted-foreground" /></span>;
      case "FOLLOWERS":
        return <span title="Followers"><Users className="size-3 text-muted-foreground" /></span>;
      case "CLOSE_FRIENDS":
        return <span className="text-[10px] text-yellow-500 font-bold" title="Close Friends">⭐</span>;
      case "PRIVATE":
        return <span title="Only Me"><Lock className="size-3 text-muted-foreground" /></span>;
      default:
        return <span title="Public"><Globe className="size-3 text-muted-foreground" /></span>;
    }
  };

  return (
    <article className="group/post space-y-3 rounded-none sm:rounded-2xl bg-transparent sm:bg-card px-3 py-4 sm:p-5 shadow-none sm:shadow-sm border-b border-border/30 sm:border-b-0">
      <div className="flex justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <UserTooltip user={post.user}>
            <Link href={`/users/${post.user.username}`}>
              <UserAvatar avatarUrl={post.user.avatarUrl} />
            </Link>
          </UserTooltip>
          <div>
            <div className="flex items-center gap-1.5">
              <UserTooltip user={post.user}>
                <Link
                  href={`/users/${post.user.username}`}
                  className="block font-medium hover:underline"
                >
                  {post.user.displayName}
                </Link>
              </UserTooltip>
              {post.collaborators && Array.isArray(post.collaborators) && post.collaborators.map((collab: any) => (
                <span key={collab} className="text-xs text-muted-foreground font-semibold">
                  • colab @{collab}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
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
                  <div className="flex items-center gap-0.5 text-xs text-primary font-medium">
                    <MapPin className="size-3 flex-shrink-0" />
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
        <div className="whitespace-pre-line break-words">{post.content}</div>
      </Linkify>

      {/* POLL WIDGET */}
      {post.poll && (
        <PollWidget poll={post.poll} userId={user.id} />
      )}

      {/* MULTI-MEDIA CAROUSEL WITH INTERACTIVE TAGGING */}
      {!!post.attachments.length && (
        <MediaCarousel attachments={post.attachments} tags={post.tags} altText={post.altText} />
      )}

      <hr className="text-muted-foreground/20" />
      <div className="flex justify-between gap-5">
        <div className="flex items-center gap-5">
          <LikeButton
            postId={post.id}
            initialState={{
              likes: post._count.likes,
              isLikedByUser: post.likes.some((like) => like.userId === user.id),
            }}
            hideLikes={post.hideLikes}
          />
          <CommentButton
            post={post}
            onClick={() => setShowComments(!showComments)}
          />
        </div>
        <BookmarkButton
          postId={post.id}
          initialState={{
            isBookmarkedByUser: post.bookmarks.some(
              (bookmark) => bookmark.userId === user.id,
            ),
          }}
        />
      </div>
      {showComments && <Comments post={post} />}
    </article>
  );
}

// Media Carousel Component
interface MediaCarouselProps {
  attachments: Media[];
  tags: any;
  altText: string | null;
}

function MediaCarousel({ attachments, tags, altText }: MediaCarouselProps) {
  const [index, setIndex] = useState(0);
  const [showTags, setShowTags] = useState(false);

  if (!attachments.length) return null;

  const currentMedia = attachments[index];
  const isVideo = currentMedia.mediaType === "VIDEO";

  // Filter tags for the current active media index
  const activeTags = Array.isArray(tags)
    ? tags.filter((t: any) => t.mediaIndex === index)
    : [];

  return (
    <div className="relative w-full aspect-square bg-neutral-950 rounded-2xl overflow-hidden group select-none flex items-center justify-center">
      {/* Media Element */}
      <div
        className="w-full h-full flex items-center justify-center relative cursor-pointer"
        onClick={() => !isVideo && setShowTags(!showTags)}
      >
        {isVideo ? (
          <VideoPlayer src={currentMedia.url} />
        ) : (
          <Image
            src={currentMedia.url}
            alt={altText || "Attachment"}
            width={600}
            height={600}
            className="w-full h-full object-contain max-h-[500px]"
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
            className="absolute bottom-3 left-3 bg-black/75 hover:bg-black text-white px-2.5 py-1 rounded-full z-20 border border-neutral-750 transition-all text-[11px] font-bold"
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
        <div className="absolute bottom-3 right-3 bg-black/60 px-2 py-1 rounded-full flex gap-1 z-20">
          {attachments.map((_, dotIdx) => (
            <div
              key={dotIdx}
              className={cn(
                "size-1.5 rounded-full transition-all",
                index === dotIdx ? "bg-white scale-120" : "bg-white/40"
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
  
  // Sum votes
  const totalVotes = localPoll.options.reduce((acc, opt) => acc + opt.votes.length, 0);
  
  // Check if user already voted
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
      <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider text-neutral-450">
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
                {/* Vote Percentage progress background bar */}
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
                <span className="relative z-10 text-xs text-neutral-400">{pct}% ({voteCount})</span>
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

// Comments Count button
interface CommentButtonProps {
  post: PostData;
  onClick: () => void;
}

function CommentButton({ post, onClick }: CommentButtonProps) {
  return (
    <button onClick={onClick} className="flex items-center gap-2">
      <MessageSquare className="size-5" />
      <span className="text-sm font-medium tabular-nums">
        {post._count.comments}{" "}
        <span className="hidden sm:inline">comments</span>
      </span>
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
