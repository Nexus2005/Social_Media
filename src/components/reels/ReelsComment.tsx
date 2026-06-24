"use client";

import { useSession } from "@/app/(main)/SessionProvider";
import { formatRelativeDate } from "@/lib/utils";
import Link from "next/link";
import UserAvatar from "../UserAvatar";
import UserTooltip from "../UserTooltip";
import { useStoryViewer } from "../StoryViewerProvider";
import CommentMoreButton from "../comments/CommentMoreButton";
import Linkify from "../Linkify";
import { useState } from "react";
import { Heart, Reply, ChevronDown, ChevronUp } from "lucide-react";
import { likeComment, unlikeComment, submitComment } from "../comments/actions";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import ReelsCommentInput from "./ReelsCommentInput";

interface ReelsCommentProps {
  comment: any;
  postUserId: string;
}

export default function ReelsComment({ comment, postUserId }: ReelsCommentProps) {
  const { user: loggedInUser } = useSession();
  const queryClient = useQueryClient();
  const { showStory, groupedStories } = useStoryViewer();

  const hasActiveStory = groupedStories.some(
    (item) => item.user.id === comment.user.id && item.stories.length > 0
  );

  const [showReplyInput, setShowReplyInput] = useState(false);
  const [showReplies, setShowReplies] = useState(false);

  const isLiked = comment.likes?.some((like: any) => like.userId === loggedInUser.id);
  const likesCount = comment._count?.likes || 0;
  const repliesCount = comment._count?.replies || 0;

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

  return (
    <div className="group/comment py-3.5 border-b border-zinc-900/40 select-none">
      <div className="flex gap-3">
        {/* Left: User Avatar */}
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

        {/* Right: Comment details */}
        <div className="flex-1 space-y-1 min-w-0">
          <div className="text-sm break-words pr-4 leading-normal text-white">
            {/* Inline Username + Message layout */}
            <UserTooltip user={comment.user}>
              <Link
                href={`/users/${comment.user.username}`}
                className="font-bold hover:underline mr-2 text-zinc-150 inline-block"
              >
                {comment.user.username}
              </Link>
            </UserTooltip>
            
            <Linkify>
              <span className="text-[13px] text-zinc-200">{comment.content}</span>
            </Linkify>
          </div>

          {/* Comment actions row */}
          <div className="flex items-center gap-4 pt-1.5 text-xs text-zinc-500 font-semibold select-none">
            {/* Timeline Metadata */}
            <span className="text-zinc-550 font-normal">{formatRelativeDate(comment.createdAt)}</span>

            {/* Like count & action */}
            <button
              onClick={handleLike}
              className={cn(
                "flex items-center gap-1.5 hover:text-red-500 transition-colors duration-150",
                isLiked && "text-red-500"
              )}
            >
              <Heart className={cn("size-3.5", isLiked && "fill-red-500 text-red-500")} />
              {likesCount > 0 && <span>{likesCount}</span>}
            </button>

            {/* Reply action */}
            <button
              onClick={() => setShowReplyInput(!showReplyInput)}
              className="flex items-center gap-1.5 hover:text-primary transition-colors duration-150"
            >
              <Reply className="size-3.5" />
              <span>Reply</span>
            </button>

            {/* View nested replies count indicator */}
            {repliesCount > 0 && (
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors duration-150 ml-1 font-bold text-[11px]"
              >
                {showReplies ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                <span>
                  {showReplies ? "Hide" : "View"} {repliesCount === 1 ? "1 reply" : `${repliesCount} replies`}
                </span>
              </button>
            )}
          </div>
        </div>

        {comment.user.id === loggedInUser.id && (
          <CommentMoreButton
            comment={comment}
            className="opacity-0 transition-opacity group-hover/comment:opacity-100 self-start text-zinc-400 hover:text-white"
          />
        )}
      </div>

      {/* Slide down Reply Input Composer */}
      <AnimatePresence initial={false}>
        {showReplyInput && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
            className="overflow-hidden pl-11 mt-2 pr-2"
          >
            <ReelsCommentInput
              post={{ id: comment.postId, user: { id: postUserId } } as any}
              parentCommentId={comment.id}
              onSuccess={() => setShowReplyInput(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nested Replies sub-tree toggled smoothly */}
      <AnimatePresence initial={false}>
        {showReplies && comment.replies && comment.replies.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden pl-11 border-l border-zinc-800 space-y-2 mt-2 ml-4"
          >
            {comment.replies.map((reply: any) => (
              <ReelsComment key={reply.id} comment={reply} postUserId={postUserId} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
