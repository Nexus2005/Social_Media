"use client";

import { useSession } from "@/app/(main)/SessionProvider";
import { CommentsPage, PostData } from "@/lib/types";
import { formatRelativeDate } from "@/lib/utils";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import {
  X,
  Heart,
  Reply,
  Loader2,
  ChevronDown,
  Image as ImageIcon,
  Share2,
  Bookmark,
  Repeat2,
  BarChart2,
  Send,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import UserAvatar from "../UserAvatar";
import UserTooltip from "../UserTooltip";
import Linkify from "../Linkify";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { likeComment, unlikeComment, submitComment } from "./actions";
import { useToast } from "../ui/use-toast";
import kyInstance from "@/lib/ky";
import GifPicker from "../stories/GifPicker";
import ShareDialog from "../posts/ShareDialog";

interface CommentsBottomSheetProps {
  post: PostData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SortOption = "top" | "newest" | "oldest";

export default function CommentsBottomSheet({
  post,
  open,
  onOpenChange,
}: CommentsBottomSheetProps) {
  const { user: loggedInUser } = useSession();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [mounted, setMounted] = useState(false);
  const [sheetHeight, setSheetHeight] = useState<"mid" | "max">("mid");
  const [sortBy, setSortBy] = useState<SortOption>("top");
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [replyToComment, setReplyToComment] = useState<any | null>(null);

  // Bottom Input States
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [selectedGifUrl, setSelectedGifUrl] = useState<string | null>(null);

  // Social Simulation States (Bookmarks/Reposts maps)
  const [localBookmarks, setLocalBookmarks] = useState<Record<string, boolean>>({});
  const [localReposts, setLocalReposts] = useState<Record<string, { count: number; active: boolean }>>({});
  const [localComments, setLocalComments] = useState<Record<string, number>>({});

  // Share Dialog Integration
  const [sharePostData, setSharePostData] = useState<PostData | null>(null);

  // Infinite Query for comments
  const { data, fetchNextPage, hasNextPage, isFetching, status } =
    useInfiniteQuery({
      queryKey: ["comments", post.id],
      queryFn: ({ pageParam }) =>
        kyInstance
          .get(
            `/api/posts/${post.id}/comments`,
            pageParam ? { searchParams: { cursor: pageParam } } : {}
          )
          .json<CommentsPage>(),
      initialPageParam: null as string | null,
      getNextPageParam: (firstPage) => firstPage.previousCursor,
      select: (data) => ({
        pages: [...data.pages].reverse(),
        pageParams: [...data.pageParams].reverse(),
      }),
    });

  const rawComments = data?.pages.flatMap((page) => page.comments) || [];

  // Group comments & replies
  // We want to filter top-level comments and map sorting
  const processedComments = useMemo(() => {
    // 1. Separate top-level comments and replies
    const topLevel = rawComments.filter((c) => !c.parentCommentId);
    const repliesMap: Record<string, any[]> = {};

    rawComments.forEach((c) => {
      if (c.parentCommentId) {
        if (!repliesMap[c.parentCommentId]) {
          repliesMap[c.parentCommentId] = [];
        }
        repliesMap[c.parentCommentId].push(c);
      }
    });

    // 2. Attach replies directly to top-level comments
    const commentsWithReplies = topLevel.map((c) => ({
      ...c,
      replies: repliesMap[c.id] || c.replies || [],
    }));

    // 3. Sort top-level comments
    return [...commentsWithReplies].sort((a, b) => {
      if (sortBy === "top") {
        const likesA = a._count?.likes || 0;
        const likesB = b._count?.likes || 0;
        const scoreA = likesA + (localReposts[a.id]?.count || 0);
        const scoreB = likesB + (localReposts[b.id]?.count || 0);
        return scoreB - scoreA;
      }
      if (sortBy === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return 0;
    });
  }, [rawComments, sortBy, localReposts]);

  // Lock scrolling when sheet is open
  useEffect(() => {
    setMounted(true);
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  // Drag Gesture Evaluator
  const handleDragEnd = (event: any, info: any) => {
    const threshold = 100;
    if (info.offset.y < -threshold) {
      setSheetHeight("max");
    } else if (info.offset.y > threshold) {
      if (sheetHeight === "max") {
        setSheetHeight("mid");
      } else {
        onOpenChange(false);
      }
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  // Submit new comment or reply
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!commentText.trim() && !selectedGifUrl) || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const content = selectedGifUrl 
        ? `${commentText} ${selectedGifUrl}`.trim()
        : commentText;

      await submitComment({
        postId: post.id,
        postUserId: post.user.id,
        content,
        parentCommentId: replyToComment?.id || null,
      });

      setCommentText("");
      setSelectedGifUrl(null);
      setReplyToComment(null);
      setShowGifPicker(false);
      
      // Update count locally
      if (replyToComment) {
        setLocalComments((prev) => ({
          ...prev,
          [replyToComment.id]: (prev[replyToComment.id] || replyToComment._count?.replies || 0) + 1,
        }));
      }

      queryClient.invalidateQueries({ queryKey: ["comments", post.id] });
      toast({ description: "Comment submitted successfully!" });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", description: "Failed to submit comment." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick reactions appender
  const handleEmojiClick = (emoji: string) => {
    setCommentText((prev) => prev + emoji);
  };

  if (!open || !mounted) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] transition-opacity duration-300 pointer-events-auto"
        onClick={handleClose}
      />

      {/* Sliding Sheet */}
      <motion.div
        drag="y"
        dragElastic={{ top: 0.05, bottom: 0.4 }}
        dragConstraints={{ top: 0, bottom: 0 }}
        onDragEnd={handleDragEnd}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 220 }}
        className="fixed left-0 right-0 bottom-0 z-[100] w-full bg-[#0c1017] border-t border-zinc-800/80 rounded-t-[20px] shadow-2xl flex flex-col overflow-hidden text-white md:max-w-xl md:mx-auto"
        style={{
          height: sheetHeight === "max" ? "93vh" : "60vh",
        }}
      >
        {/* Drag handle */}
        <div className="w-full flex justify-center py-2 flex-shrink-0 cursor-row-resize select-none">
          <div className="w-10 h-1 bg-zinc-700 rounded-full" />
        </div>

        {/* Header section */}
        <div className="px-5 pb-3 border-b border-zinc-900/60 flex items-center justify-between flex-shrink-0 select-none">
          <div className="flex items-center gap-3 relative">
            <h3 className="font-bold text-lg text-white">Comments</h3>
            
            {/* Sort Toggle Button */}
            <button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white font-semibold transition-colors bg-zinc-900/55 px-2.5 py-1 rounded-full border border-zinc-800/60"
            >
              <span>
                {sortBy === "top" ? "Top comments" : sortBy === "newest" ? "Newest" : "Oldest"}
              </span>
              <ChevronDown className="size-3" />
            </button>

            {/* Sort Dropdown Popup */}
            {showSortDropdown && (
              <div className="absolute top-full left-20 mt-1 w-36 bg-[#121212] border border-zinc-800 rounded-xl shadow-2xl z-[110] py-1 select-none overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                {(["top", "newest", "oldest"] as SortOption[]).map((option) => (
                  <button
                    key={option}
                    onClick={() => {
                      setSortBy(option);
                      setShowSortDropdown(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs hover:bg-zinc-800/65 transition-colors font-medium ${
                      sortBy === option ? "text-white bg-zinc-900 font-bold" : "text-zinc-400"
                    }`}
                  >
                    {option === "top" ? "Top comments" : option === "newest" ? "Newest" : "Oldest"}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleClose}
            className="text-zinc-400 hover:text-white transition-colors p-1"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Scrollable list container */}
        <div className="flex-grow overflow-y-auto p-4 space-y-4 scrollbar-none select-none">
          {hasNextPage && (
            <button
              disabled={isFetching}
              onClick={() => fetchNextPage()}
              className="mx-auto block text-xs font-semibold text-zinc-400 hover:text-white py-1"
            >
              {isFetching ? "Loading..." : "Load previous comments"}
            </button>
          )}

          {status === "pending" && (
            <div className="flex justify-center py-10">
              <Loader2 className="size-6 animate-spin text-zinc-650" />
            </div>
          )}
          {status === "success" && processedComments.length === 0 && (
            <p className="text-center text-xs text-zinc-500 py-12">No comments yet.</p>
          )}
          {status === "error" && (
            <p className="text-center text-xs text-red-400 py-12">
              An error occurred while loading comments.
            </p>
          )}

          {/* Render comments tree */}
          <div className="space-y-4">
            {processedComments.map((comment) => (
              <CommentNode
                key={comment.id}
                comment={comment}
                postUserId={post.user.id}
                loggedInUser={loggedInUser}
                onReply={(c) => {
                  setReplyToComment(c);
                  setCommentText(`@${c.user.username} `);
                }}
                localBookmarks={localBookmarks}
                toggleBookmark={(id) =>
                  setLocalBookmarks((prev) => ({ ...prev, [id]: !prev[id] }))
                }
                localReposts={localReposts}
                toggleRepost={(id) =>
                  setLocalReposts((prev) => {
                    const current = prev[id] || { count: Math.floor((id.charCodeAt(0) % 5) + 2), active: false };
                    return {
                      ...prev,
                      [id]: {
                        count: current.active ? current.count - 1 : current.count + 1,
                        active: !current.active,
                      },
                    };
                  })
                }
                localComments={localComments}
                onShareClick={(c) => {
                  // Simulate open post share sheet
                  setSharePostData({
                    id: c.postId,
                    content: c.content,
                    user: c.user,
                    attachments: [],
                    _count: { likes: c._count?.likes || 0, comments: 0, reposts: 0 },
                    likes: [],
                    bookmarks: [],
                  } as any);
                }}
                queryClient={queryClient}
              />
            ))}
          </div>
        </div>

        {/* Footer Area with Reactions and Input pill */}
        <div className="border-t border-zinc-900/60 bg-[#0c1017] shrink-0 pb-safe z-50">
          
          {/* Quick emoji reaction bar */}
          <div className="flex items-center justify-between px-6 py-2 select-none overflow-x-auto scrollbar-none gap-2 bg-[#0c1017] border-b border-zinc-900/40">
            {["❤️", "🙌", "🔥", "👏", "😢", "😍", "😮", "😂"].map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleEmojiClick(emoji)}
                className="text-xl transition-transform active:scale-90 hover:scale-110 cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Reply context notice if replying to someone */}
          {replyToComment && (
            <div className="px-5 py-1.5 bg-zinc-950/65 text-[11px] text-zinc-400 flex items-center justify-between border-b border-zinc-900/30 select-none">
              <span>
                Replying to <span className="font-semibold text-white">@{replyToComment.user.username}</span>
              </span>
              <button
                onClick={() => {
                  setReplyToComment(null);
                  setCommentText("");
                }}
                className="text-zinc-500 hover:text-white font-bold"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Main write comment grid */}
          <div className="p-4 flex items-center gap-3 relative select-none">
            {/* User Avatar */}
            <UserAvatar avatarUrl={loggedInUser?.avatarUrl} size={38} className="shrink-0" />

            {/* Input Composer Pill */}
            <div className="flex-1 bg-zinc-900/80 border border-zinc-800 rounded-full py-2 pl-4 pr-3.5 flex items-center gap-2 relative">
              <input
                type="text"
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmit();
                }}
                className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-550 outline-none pr-1"
              />

              {/* Action Buttons: Image, GIF */}
              <div className="flex items-center gap-2 text-zinc-450">
                <button
                  type="button"
                  title="Attach image"
                  onClick={() => toast({ description: "Image attachments in comments coming soon!" })}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  <ImageIcon className="size-4" />
                </button>
                <button
                  type="button"
                  title="Pick GIF"
                  onClick={() => setShowGifPicker(!showGifPicker)}
                  className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded border leading-none transition-colors cursor-pointer ${
                    showGifPicker
                      ? "border-sky-400 text-sky-400"
                      : "border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500"
                  }`}
                >
                  GIF
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={() => handleSubmit()}
              disabled={(!commentText.trim() && !selectedGifUrl) || isSubmitting}
              className="size-9 bg-white dark:bg-white text-black font-semibold rounded-full flex items-center justify-center shrink-0 disabled:opacity-40 hover:opacity-90 transition-opacity cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin text-black" />
              ) : (
                <Send className="size-4 text-black fill-black" />
              )}
            </button>

            {/* Gif Picker Popover overlay */}
            {showGifPicker && (
              <div className="absolute bottom-[75px] left-4 right-4 z-[120]">
                <GifPicker
                  onSelect={(url) => {
                    setSelectedGifUrl(url);
                    setShowGifPicker(false);
                    handleSubmit();
                  }}
                  onClose={() => setShowGifPicker(false)}
                />
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Share Dialog overlay integration */}
      {sharePostData && (
        <ShareDialog
          post={sharePostData}
          open={!!sharePostData}
          onOpenChange={(op) => {
            if (!op) setSharePostData(null);
          }}
        />
      )}
    </>,
    document.body
  );
}

// --- Comments Node Component supporting Visual Connected Branch Lines ---
interface CommentNodeProps {
  comment: any;
  postUserId: string;
  loggedInUser: any;
  onReply: (comment: any) => void;
  localBookmarks: Record<string, boolean>;
  toggleBookmark: (id: string) => void;
  localReposts: Record<string, { count: number; active: boolean }>;
  toggleRepost: (id: string) => void;
  localComments: Record<string, number>;
  onShareClick: (comment: any) => void;
  queryClient: any;
}

function CommentNode({
  comment,
  postUserId,
  loggedInUser,
  onReply,
  localBookmarks,
  toggleBookmark,
  localReposts,
  toggleRepost,
  localComments,
  onShareClick,
  queryClient,
}: CommentNodeProps) {
  const { toast } = useToast();
  const [showReplies, setShowReplies] = useState(false);

  const isLiked = comment.likes?.some((like: any) => like.userId === loggedInUser?.id);
  const likesCount = comment._count?.likes || 0;
  const repliesCount = localComments[comment.id] !== undefined ? localComments[comment.id] : (comment._count?.replies || 0);

  // Simulated metrics
  const isBookmarked = !!localBookmarks[comment.id];
  const repostInfo = localReposts[comment.id] || {
    count: Math.floor((comment.id.charCodeAt(0) % 6) + 1),
    active: false,
  };
  const viewsCount = Math.floor((likesCount * 12) + (comment.id.charCodeAt(0) % 200) + 120);

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

  const hasActiveStory = false; // Simplified

  // Helper to format views
  const formatViews = (val: number) => {
    if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
    return val.toString();
  };

  return (
    <div className="relative">
      
      {/* Visual Thread connector line connecting parent to replies */}
      {showReplies && comment.replies && comment.replies.length > 0 && (
        <div className="absolute left-[18px] top-10 bottom-6 w-0.5 bg-zinc-800/80 pointer-events-none rounded-full" />
      )}

      <div className="flex gap-3">
        
        {/* User avatar */}
        <UserTooltip user={comment.user}>
          <Link href={`/users/${comment.user.username}`} className="shrink-0 select-none">
            <UserAvatar avatarUrl={comment.user.avatarUrl} size={38} className="size-[38px] rounded-full object-cover" />
          </Link>
        </UserTooltip>

        {/* Comment block info */}
        <div className="flex-1 space-y-1 min-w-0">
          
          {/* Metadata header */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 text-zinc-400">
              <UserTooltip user={comment.user}>
                <Link href={`/users/${comment.user.username}`} className="font-bold text-white hover:underline flex items-center gap-0.5">
                  <span>{comment.user.displayName}</span>
                  {comment.user.verified && <VerifiedBadge size={12} />}
                </Link>
              </UserTooltip>
              <span className="text-zinc-650">@{comment.user.username}</span>
              <span className="text-zinc-700">•</span>
              <span>{formatRelativeDate(comment.createdAt)}</span>
            </div>
            
            {/* Options button */}
            <button className="text-zinc-600 hover:text-white select-none">
              <span className="text-sm font-bold">•••</span>
            </button>
          </div>

          {/* Replying indicator */}
          {comment.parentCommentId && (
            <div className="text-[11px] text-zinc-500">
              Replying to <span className="text-sky-400 font-medium">@NotionHQ</span>
            </div>
          )}

          {/* Content */}
          <Linkify>
            <div className="text-[13.5px] break-words text-zinc-150 leading-relaxed pr-2">
              {comment.content}
            </div>
          </Linkify>

          {/* Action toolbar matching user mockup */}
          <div className="flex items-center justify-between text-zinc-500 text-xs py-1.5 select-none pr-3 max-w-sm">
            
            {/* Replies button */}
            <button
              onClick={() => onReply(comment)}
              className="flex items-center gap-1 hover:text-zinc-300 transition-colors"
            >
              <Reply className="size-3.5 transform scale-x-[-1]" />
              {repliesCount > 0 && <span className="font-medium text-[11px]">{repliesCount}</span>}
            </button>

            {/* Repost button */}
            <button
              onClick={() => toggleRepost(comment.id)}
              className={`flex items-center gap-1 transition-colors ${
                repostInfo.active ? "text-green-500" : "hover:text-green-500"
              }`}
            >
              <Repeat2 className="size-4" />
              <span className="font-medium text-[11px]">{repostInfo.count}</span>
            </button>

            {/* Like button */}
            <button
              onClick={handleLike}
              className={`flex items-center gap-1 transition-colors ${
                isLiked ? "text-red-500" : "hover:text-red-500"
              }`}
            >
              <Heart className={`size-3.5 ${isLiked ? "fill-red-500 text-red-500" : ""}`} />
              {likesCount > 0 && <span className="font-medium text-[11px]">{likesCount}</span>}
            </button>

            {/* Views counter */}
            <div className="flex items-center gap-1 select-none text-zinc-600">
              <BarChart2 className="size-3.5" />
              <span className="text-[11px] font-medium">{formatViews(viewsCount)}</span>
            </div>

            {/* Bookmark button */}
            <button
              onClick={() => {
                toggleBookmark(comment.id);
                toast({
                  description: isBookmarked ? "Comment removed from bookmarks" : "Comment bookmarked!",
                });
              }}
              className={`transition-colors ${isBookmarked ? "text-yellow-500" : "hover:text-yellow-500"}`}
            >
              <Bookmark className={`size-3.5 ${isBookmarked ? "fill-yellow-500" : ""}`} />
            </button>

            {/* Share button */}
            <button
              onClick={() => onShareClick(comment)}
              className="hover:text-zinc-300 transition-colors"
            >
              <Share2 className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Show Nested Replies toggle */}
      {repliesCount > 0 && comment.replies && comment.replies.length > 0 && !showReplies && (
        <div className="pl-12 py-1 select-none flex items-center gap-2">
          <div className="w-8 h-px bg-zinc-800" />
          <button
            onClick={() => setShowReplies(true)}
            className="text-xs font-bold text-sky-400 hover:underline flex items-center"
          >
            Show replies ({repliesCount})
          </button>
        </div>
      )}

      {/* Render Nested Replies */}
      {showReplies && comment.replies && comment.replies.length > 0 && (
        <div className="pl-12 space-y-4 mt-2">
          {comment.replies.map((reply: any) => (
            <CommentNode
              key={reply.id}
              comment={reply}
              postUserId={postUserId}
              loggedInUser={loggedInUser}
              onReply={onReply}
              localBookmarks={localBookmarks}
              toggleBookmark={toggleBookmark}
              localReposts={localReposts}
              toggleRepost={toggleRepost}
              localComments={localComments}
              onShareClick={onShareClick}
              queryClient={queryClient}
            />
          ))}
          
          {/* Hide replies toggle button */}
          <div className="py-1 select-none flex items-center gap-2">
            <div className="w-8 h-px bg-zinc-800" />
            <button
              onClick={() => setShowReplies(false)}
              className="text-xs font-bold text-zinc-500 hover:text-white hover:underline"
            >
              Hide replies
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
