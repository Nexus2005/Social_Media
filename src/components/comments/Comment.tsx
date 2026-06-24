"use client";

import { useSession } from "@/app/(main)/SessionProvider";
import { formatRelativeDate } from "@/lib/utils";
import Link from "next/link";
import UserAvatar from "../UserAvatar";
import UserTooltip from "../UserTooltip";
import { useStoryViewer } from "../StoryViewerProvider";
import CommentMoreButton from "./CommentMoreButton";
import Linkify from "../Linkify";
import { useState } from "react";
import { Heart, Reply } from "lucide-react";
import { likeComment, unlikeComment, submitComment } from "./actions";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

interface CommentProps {
  comment: any;
  postUserId: string;
}

export default function Comment({ comment, postUserId }: CommentProps) {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const { showStory, groupedStories } = useStoryViewer();

  const hasActiveStory = groupedStories.some(
    (item) => item.user.id === comment.user.id && item.stories.length > 0
  );

  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLiked = comment.likes?.some((like: any) => like.userId === user.id);
  const likesCount = comment._count?.likes || 0;

  const handleLike = async () => {
    try {
      if (isLiked) {
        await unlikeComment(comment.id);
      } else {
        await likeComment(comment.id);
      }
      queryClient.invalidateQueries({ queryKey: ["comments", comment.postId] });
    } catch (err) {
      console.error(err);
    }
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await submitComment({
        postId: comment.postId,
        postUserId,
        content: replyText,
        parentCommentId: comment.id,
      });
      setReplyText("");
      setShowReplyInput(false);
      queryClient.invalidateQueries({ queryKey: ["comments", comment.postId] });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="group/comment py-3">
      <div className="flex gap-3">
        <UserTooltip user={comment.user}>
          <Link
            href={`/users/${comment.user.username}`}
            className="shrink-0"
            onClick={(e) => {
              if (hasActiveStory) {
                e.preventDefault();
                showStory(comment.user.id);
              }
            }}
          >
            {hasActiveStory ? (
              <div className="rounded-full p-[2px] bg-gradient-to-tr from-[#f58529] via-[#dd2a7b] to-[#8134af]">
                <div className="rounded-full p-[1px] bg-[#000000]">
                  <UserAvatar avatarUrl={comment.user.avatarUrl} size={36} />
                </div>
              </div>
            ) : (
              <UserAvatar avatarUrl={comment.user.avatarUrl} size={36} />
            )}
          </Link>
        </UserTooltip>
        <div className="flex-1 space-y-1 min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <UserTooltip user={comment.user}>
              <Link
                href={`/users/${comment.user.username}`}
                className="font-semibold text-neutral-250 hover:underline truncate max-w-[120px] sm:max-w-none"
              >
                {comment.user.displayName}
              </Link>
            </UserTooltip>
            <span>•</span>
            <span>{formatRelativeDate(comment.createdAt)}</span>
          </div>
          <Linkify>
            <div className="text-sm break-words whitespace-pre-wrap pr-4">{comment.content}</div>
          </Linkify>

          {/* Interaction row: Like & Reply */}
          <div className="flex items-center gap-4 pt-1 text-xs text-muted-foreground select-none">
            <button
              onClick={handleLike}
              className={cn(
                "flex items-center gap-1 hover:text-red-500 transition-colors",
                isLiked && "text-red-500"
              )}
            >
              <Heart className={cn("size-3.5", isLiked && "fill-red-500 text-red-500")} />
              {likesCount > 0 && <span className="font-semibold">{likesCount}</span>}
            </button>
            <button
              onClick={() => setShowReplyInput(!showReplyInput)}
              className="flex items-center gap-1 hover:text-primary transition-colors"
            >
              <Reply className="size-3.5" />
              <span>Reply</span>
            </button>
          </div>
        </div>

        {comment.user.id === user.id && (
          <CommentMoreButton
            comment={comment}
            className="opacity-0 transition-opacity group-hover/comment:opacity-100 self-start"
          />
        )}
      </div>

      {/* Reply input */}
      {showReplyInput && (
        <form onSubmit={handleReplySubmit} className="flex gap-2 items-center pl-11 mt-2">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder={`Reply to @${comment.user.username}...`}
            className="flex-1 text-xs px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-xl outline-none focus:border-primary transition-all text-white"
            autoFocus
          />
          <Button
            type="submit"
            disabled={isSubmitting || !replyText.trim()}
            className="rounded-xl px-3 py-2 text-xs font-semibold"
            size="sm"
          >
            Reply
          </Button>
        </form>
      )}

      {/* Recursive replies rendering */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="pl-11 border-l-2 border-border/10 space-y-3 mt-3 ml-4">
          {comment.replies.map((reply: any) => (
            <Comment key={reply.id} comment={reply} postUserId={postUserId} />
          ))}
        </div>
      )}
    </div>
  );
}
