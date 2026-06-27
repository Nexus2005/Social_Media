"use client";

import { useSession } from "@/app/(main)/SessionProvider";
import { CommentsPage, PostData } from "@/lib/types";
import { formatRelativeDate } from "@/lib/utils";
import { useInfiniteQuery, useQueryClient, useMutation, QueryKey } from "@tanstack/react-query";
import useFollowerInfo from "@/hooks/useFollowerInfo";
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
  VolumeX,
  Ban,
  Flag,
  UserPlus,
  UserMinus,
  BellOff,
  Volume2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import UserAvatar from "../UserAvatar";
import UserTooltip from "../UserTooltip";
import Linkify from "../Linkify";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import {
  likeComment,
  unlikeComment,
  submitComment,
  repostComment,
  unrepostComment,
  bookmarkComment,
  unbookmarkComment,
  toggleMuteUser,
  toggleBlockUser,
  toggleMuteConversation,
  reportContent,
} from "./actions";
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

function CommentFollowOption({
  user,
  loggedInUserId,
  onDone,
}: {
  user: any;
  loggedInUserId: string;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const initialState = {
    followers: user._count?.followers || 0,
    isFollowedByUser: Array.isArray(user.followers)
      ? user.followers.some((f: any) => f.followerId === loggedInUserId)
      : false,
  };

  const { data } = useFollowerInfo(user.id, initialState);
  const queryKey: QueryKey = ["follower-info", user.id];

  const { mutate } = useMutation({
    mutationFn: () =>
      data.isFollowedByUser
        ? kyInstance.delete(`/api/users/${user.id}/followers`)
        : kyInstance.post(`/api/users/${user.id}/followers`),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const previousState = queryClient.getQueryData<any>(queryKey);

      const nextState = {
        followers: (previousState?.followers || 0) + (previousState?.isFollowedByUser ? -1 : 1),
        isFollowedByUser: !previousState?.isFollowedByUser,
      };

      queryClient.setQueryData(queryKey, nextState);

      toast({
        description: previousState?.isFollowedByUser
          ? `Unfollowed @${user.username}`
          : `Followed @${user.username}`,
      });

      return { previousState };
    },
    onError(error, variables, context) {
      queryClient.setQueryData(queryKey, context?.previousState);
      toast({
        variant: "destructive",
        description: "Something went wrong updating follow state.",
      });
    },
  });

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        mutate();
        onDone();
      }}
      className="flex items-center gap-3.5 py-4 w-full text-left text-[15px] font-semibold text-white active:bg-zinc-900/40"
    >
      {data.isFollowedByUser ? (
        <>
          <UserMinus className="size-5 text-zinc-400" />
          <span>Unfollow @{user.username}</span>
        </>
      ) : (
        <>
          <UserPlus className="size-5 text-zinc-400" />
          <span>Follow @{user.username}</span>
        </>
      )}
    </button>
  );
}

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

  // Options Sheet comment target
  const [optionComment, setOptionComment] = useState<any | null>(null);

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
        const repostsA = a._count?.reposts || 0;
        const repostsB = b._count?.reposts || 0;
        const scoreA = likesA + repostsA;
        const scoreB = likesB + repostsB;
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
  }, [rawComments, sortBy]);

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
        transition={{ type: "tween", ease: "easeOut", duration: 0.25 }}
        className="fixed left-0 right-0 bottom-0 z-[100] w-full bg-[#0c1017] border-t border-zinc-800/80 rounded-t-[20px] shadow-2xl flex flex-col overflow-hidden text-white md:max-w-xl md:mx-auto pb-safe"
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
            <h3 className="font-bold text-xl text-white">Comments</h3>
            
            {/* Sort Toggle Button */}
            <button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="flex items-center gap-1 text-sm text-zinc-400 hover:text-white font-semibold transition-colors bg-zinc-900/55 px-2.5 py-1 rounded-full border border-zinc-800/60"
            >
              <span>
                {sortBy === "top" ? "Top comments" : sortBy === "newest" ? "Newest" : "Oldest"}
              </span>
              <ChevronDown className="size-3.5" />
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
            <X className="size-6" />
          </button>
        </div>

        {/* Scrollable list container */}
        <div className="flex-grow overflow-y-auto p-4 space-y-5 scrollbar-none select-none">
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
          <div className="space-y-6">
            {processedComments.map((comment) => (
              <div 
                key={comment.id}
                className="border-b border-zinc-900/60 pb-5 mb-5 last:border-b-0 last:pb-0 last:mb-0"
              >
                <CommentNode
                  comment={comment}
                  postUserId={post.user.id}
                  loggedInUser={loggedInUser}
                  onReply={(c) => {
                    setReplyToComment(c);
                    setCommentText(`@${c.user.username} `);
                  }}
                  onShareClick={(c) => {
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
                  onShowOptions={(c) => setOptionComment(c)}
                  queryClient={queryClient}
                />
              </div>
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
                className="text-2xl transition-transform active:scale-90 hover:scale-110 cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Reply context notice if replying to someone */}
          {replyToComment && (
            <div className="px-5 py-2 bg-zinc-950/65 text-xs text-zinc-400 flex items-center justify-between border-b border-zinc-900/30 select-none">
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
          <div className="p-2.5 sm:p-4 flex items-center gap-2 sm:gap-3 relative select-none">
            {/* User Avatar */}
            <UserAvatar avatarUrl={loggedInUser?.avatarUrl} size={32} className="shrink-0 size-8 sm:size-10" />

            {/* Input Composer Pill */}
            <div className="flex-1 bg-zinc-900/80 border border-zinc-800 rounded-full py-1.5 sm:py-2.5 pl-3 sm:pl-4 pr-2 sm:pr-3.5 flex items-center gap-1.5 sm:gap-2 relative min-w-0">
              <input
                type="text"
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmit();
                }}
                className="flex-1 bg-transparent text-sm sm:text-[15px] text-white placeholder:text-zinc-550 outline-none pr-1 min-w-0"
              />

              {/* Action Buttons: Image, GIF */}
              <div className="flex items-center gap-1.5 sm:gap-2 text-zinc-450 shrink-0">
                <button
                  type="button"
                  title="Attach image"
                  onClick={() => toast({ description: "Image attachments in comments coming soon!" })}
                  className="hover:text-white transition-colors cursor-pointer p-0.5"
                >
                  <ImageIcon className="size-4 sm:size-4.5" />
                </button>
                <button
                  type="button"
                  title="Pick GIF"
                  onClick={() => setShowGifPicker(!showGifPicker)}
                  className={`text-[10px] sm:text-[11px] font-extrabold px-1.5 py-0.5 rounded border leading-none transition-colors cursor-pointer ${
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
              className="size-8 sm:size-10 bg-white dark:bg-white text-black font-semibold rounded-full flex items-center justify-center shrink-0 disabled:opacity-40 hover:opacity-90 transition-opacity cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 sm:size-4.5 animate-spin text-black" />
              ) : (
                <Send className="size-4 sm:size-4.5 text-black fill-black" />
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

      {/* Option Options Bottom Sheet Drawer */}
      <AnimatePresence>
        {optionComment && (
          <>
            {/* Backdrop for option sheet */}
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[130] transition-opacity duration-300 pointer-events-auto"
              onClick={() => setOptionComment(null)}
            />
            {/* Sheet content */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed left-0 right-0 bottom-0 z-[140] w-full bg-[#121212] border-t border-zinc-800 rounded-t-[24px] p-5 pb-safe flex flex-col gap-4 select-none md:max-w-md md:mx-auto text-white shadow-2xl"
            >
              {/* Drag handle */}
              <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto" />
              
              {/* Menu items */}
              <div className="flex flex-col mt-2 divide-y divide-zinc-900/60">
                {/* Follow / Unfollow */}
                <CommentFollowOption
                  user={optionComment.user}
                  loggedInUserId={loggedInUser?.id || ""}
                  onDone={() => setOptionComment(null)}
                />

                {/* Mute user */}
                <button
                  onClick={async () => {
                    try {
                      const res = await toggleMuteUser(optionComment.user.id);
                      toast({
                        description: res.muted
                          ? `@${optionComment.user.username} muted successfully. You won't see their comments or posts.`
                          : `@${optionComment.user.username} unmuted.`,
                      });
                      queryClient.invalidateQueries({ queryKey: ["comments", post.id] });
                    } catch (err) {
                      console.error(err);
                      toast({ variant: "destructive", description: "Failed to mute user." });
                    }
                    setOptionComment(null);
                  }}
                  className="flex items-center gap-3.5 py-4 w-full text-left text-[15px] font-semibold text-white active:bg-zinc-900/40"
                >
                  <VolumeX className="size-5 text-zinc-400" />
                  <span>Mute @{optionComment.user.username}</span>
                </button>

                {/* Mute Conversation */}
                <button
                  onClick={async () => {
                    try {
                      const res = await toggleMuteConversation(optionComment.id);
                      toast({
                        description: res.muted
                          ? "Conversation muted. You will not receive any new notifications about it."
                          : "Conversation unmuted.",
                      });
                      queryClient.invalidateQueries({ queryKey: ["comments", post.id] });
                    } catch (err) {
                      console.error(err);
                      toast({ variant: "destructive", description: "Failed to mute conversation." });
                    }
                    setOptionComment(null);
                  }}
                  className="flex items-center gap-3.5 py-4 w-full text-left text-[15px] font-semibold text-white active:bg-zinc-900/40"
                >
                  <BellOff className="size-5 text-zinc-400" />
                  <span>
                    {optionComment.mutedConversations?.some((mc: any) => mc.userId === loggedInUser?.id)
                      ? "Unmute conversation"
                      : "Mute conversation"}
                  </span>
                </button>

                {/* Block user */}
                <button
                  onClick={async () => {
                    try {
                      const res = await toggleBlockUser(optionComment.user.id);
                      toast({
                        description: res.blocked
                          ? `@${optionComment.user.username} blocked successfully.`
                          : `@${optionComment.user.username} unblocked.`,
                      });
                      queryClient.invalidateQueries({ queryKey: ["comments", post.id] });
                    } catch (err) {
                      console.error(err);
                      toast({ variant: "destructive", description: "Failed to block user." });
                    }
                    setOptionComment(null);
                  }}
                  className="flex items-center gap-3.5 py-4 w-full text-left text-[15px] font-semibold text-white active:bg-zinc-900/40"
                >
                  <Ban className="size-5 text-zinc-400" />
                  <span>Block @{optionComment.user.username}</span>
                </button>

                {/* Divider line before Report post */}
                <div className="h-px bg-zinc-850/70 w-full my-2" />

                {/* Report post */}
                <button
                  onClick={async () => {
                    try {
                      await reportContent({ postId: post.id, reason: "Inappropriate content" });
                      toast({ description: "Post has been reported successfully." });
                    } catch (err) {
                      console.error(err);
                      toast({ variant: "destructive", description: "Failed to report post." });
                    }
                    setOptionComment(null);
                  }}
                  className="flex items-center gap-3.5 py-4 w-full text-left text-[15px] font-semibold text-red-500 active:bg-zinc-900/40"
                >
                  <Flag className="size-5 text-red-500" />
                  <span>Report post</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
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
  onShareClick: (comment: any) => void;
  onShowOptions: (comment: any) => void;
  queryClient: any;
}

function CommentNode({
  comment,
  postUserId,
  loggedInUser,
  onReply,
  onShareClick,
  onShowOptions,
  queryClient,
}: CommentNodeProps) {
  const { toast } = useToast();
  const [showReplies, setShowReplies] = useState(false);

  // Real Database fields (100% live state mappings)
  const isLiked = comment.likes?.some((like: any) => like.userId === loggedInUser?.id);
  const likesCount = comment._count?.likes || 0;
  
  const isReposted = comment.reposts?.some((rp: any) => rp.userId === loggedInUser?.id);
  const repostsCount = comment._count?.reposts || 0;
  
  const isBookmarked = comment.bookmarks?.some((bm: any) => bm.userId === loggedInUser?.id);
  const viewsCount = comment.viewsCount || 0;
  const repliesCount = comment._count?.replies || 0;

  // Optimistic UI state hooks
  const [localIsLiked, setLocalIsLiked] = useState(isLiked);
  const [localLikesCount, setLocalLikesCount] = useState(likesCount);
  const [localIsReposted, setLocalIsReposted] = useState(isReposted);
  const [localRepostsCount, setLocalRepostsCount] = useState(repostsCount);
  const [localIsBookmarked, setLocalIsBookmarked] = useState(isBookmarked);

  // Sync state if props change (e.g. from outer query refreshes)
  useEffect(() => {
    setLocalIsLiked(isLiked);
    setLocalLikesCount(likesCount);
  }, [isLiked, likesCount]);

  useEffect(() => {
    setLocalIsReposted(isReposted);
    setLocalRepostsCount(repostsCount);
  }, [isReposted, repostsCount]);

  useEffect(() => {
    setLocalIsBookmarked(isBookmarked);
  }, [isBookmarked]);

  const handleLike = async () => {
    const nextIsLiked = !localIsLiked;
    const nextCount = localLikesCount + (nextIsLiked ? 1 : -1);

    setLocalIsLiked(nextIsLiked);
    setLocalLikesCount(nextCount);

    try {
      if (localIsLiked) {
        await unlikeComment(comment.id);
      } else {
        await likeComment(comment.id);
      }
      
      // Update cache silently
      queryClient.setQueryData(["comments", comment.postId], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            comments: page.comments.map((c: any) => {
              if (c.id === comment.id) {
                return {
                  ...c,
                  likes: nextIsLiked
                    ? [...(c.likes || []), { userId: loggedInUser?.id }]
                    : (c.likes || []).filter((l: any) => l.userId !== loggedInUser?.id),
                  _count: {
                    ...c._count,
                    likes: nextCount,
                  }
                };
              }
              return c;
            })
          }))
        };
      });
    } catch (err) {
      console.error(err);
      // Revert state
      setLocalIsLiked(!nextIsLiked);
      setLocalLikesCount(localLikesCount);
      toast({ variant: "destructive", description: "Failed to update like." });
    }
  };

  const handleRepost = async () => {
    const nextIsReposted = !localIsReposted;
    const nextCount = localRepostsCount + (nextIsReposted ? 1 : -1);

    setLocalIsReposted(nextIsReposted);
    setLocalRepostsCount(nextCount);

    try {
      if (localIsReposted) {
        await unrepostComment(comment.id);
        toast({ description: "Repost removed" });
      } else {
        await repostComment(comment.id);
        toast({ description: "Comment reposted!" });
      }

      queryClient.setQueryData(["comments", comment.postId], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            comments: page.comments.map((c: any) => {
              if (c.id === comment.id) {
                return {
                  ...c,
                  reposts: nextIsReposted
                    ? [...(c.reposts || []), { userId: loggedInUser?.id }]
                    : (c.reposts || []).filter((r: any) => r.userId !== loggedInUser?.id),
                  _count: {
                    ...c._count,
                    reposts: nextCount,
                  }
                };
              }
              return c;
            })
          }))
        };
      });
    } catch (err) {
      console.error(err);
      setLocalIsReposted(!nextIsReposted);
      setLocalRepostsCount(localRepostsCount);
      toast({ variant: "destructive", description: "Failed to update repost." });
    }
  };

  const handleBookmark = async () => {
    const nextIsBookmarked = !localIsBookmarked;

    setLocalIsBookmarked(nextIsBookmarked);

    try {
      if (localIsBookmarked) {
        await unbookmarkComment(comment.id);
        toast({ description: "Comment removed from bookmarks" });
      } else {
        await bookmarkComment(comment.id);
        toast({ description: "Comment bookmarked!" });
      }

      queryClient.setQueryData(["comments", comment.postId], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            comments: page.comments.map((c: any) => {
              if (c.id === comment.id) {
                return {
                  ...c,
                  bookmarks: nextIsBookmarked
                    ? [...(c.bookmarks || []), { userId: loggedInUser?.id }]
                    : (c.bookmarks || []).filter((b: any) => b.userId !== loggedInUser?.id),
                };
              }
              return c;
            })
          }))
        };
      });
    } catch (err) {
      console.error(err);
      setLocalIsBookmarked(!nextIsBookmarked);
      toast({ variant: "destructive", description: "Failed to update bookmark." });
    }
  };

  // Helper to format views
  const formatViews = (val: number) => {
    if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
    return val.toString();
  };

  return (
    <div className="relative">
      
      {/* Visual Thread connector line connecting parent to replies */}
      {showReplies && comment.replies && comment.replies.length > 0 && (
        <div className="absolute left-[20px] top-11 bottom-6 w-0.5 bg-zinc-800/80 pointer-events-none rounded-full" />
      )}

      <div className="flex gap-3">
        
        {/* User avatar */}
        <UserTooltip user={comment.user}>
          <Link href={`/users/${comment.user.username}`} className="shrink-0 select-none">
            <UserAvatar avatarUrl={comment.user.avatarUrl} size={40} className="size-[40px] rounded-full object-cover" />
          </Link>
        </UserTooltip>

        {/* Comment block info */}
        <div className="flex-1 space-y-1 min-w-0">
          
          {/* Metadata header */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5 text-zinc-450">
              <UserTooltip user={comment.user}>
                <Link href={`/users/${comment.user.username}`} className="font-bold text-white hover:underline flex items-center gap-0.5">
                  <span>{comment.user.displayName}</span>
                  {comment.user.verified && <VerifiedBadge size={14} />}
                </Link>
              </UserTooltip>
              <span className="text-zinc-550">@{comment.user.username}</span>
              <span className="text-zinc-650 select-none">•</span>
              <span>{formatRelativeDate(comment.createdAt)}</span>
            </div>
            
            {/* Options button */}
            <button 
              onClick={() => onShowOptions(comment)}
              className="text-zinc-550 hover:text-white select-none px-1 py-0.5 active:opacity-70 transition-opacity"
            >
              <span className="text-sm font-bold">•••</span>
            </button>
          </div>

          {/* Replying indicator */}
          {comment.parentCommentId && (
            <div className="text-[12.5px] text-zinc-550">
              Replying to <span className="text-sky-400 font-medium">@{comment.user.username}</span>
            </div>
          )}

          {/* Content */}
          <Linkify>
            <div className="text-[15px] break-words text-zinc-150 leading-relaxed pr-2">
              {comment.content}
            </div>
          </Linkify>

          {/* Action toolbar matching user mockup */}
          <div className="flex items-center justify-between text-zinc-500 text-[13px] py-2 select-none pr-3 max-w-sm">
            
            {/* Replies button */}
            <button
              onClick={() => onReply(comment)}
              className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors"
            >
              <Reply className="size-4.5 transform scale-x-[-1]" />
              {repliesCount > 0 && <span className="font-semibold text-xs">{repliesCount}</span>}
            </button>

            {/* Repost button */}
            <button
              onClick={handleRepost}
              className={`flex items-center gap-1.5 transition-colors ${
                localIsReposted ? "text-green-500" : "hover:text-green-500"
              }`}
            >
              <Repeat2 className="size-[19px]" />
              {localRepostsCount > 0 && <span className="font-semibold text-xs">{localRepostsCount}</span>}
            </button>

            {/* Like button */}
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 transition-colors ${
                localIsLiked ? "text-red-500" : "hover:text-red-500"
              }`}
            >
              <Heart className={`size-4.5 ${localIsLiked ? "fill-red-500 text-red-500" : ""}`} />
              {localLikesCount > 0 && <span className="font-semibold text-xs">{localLikesCount}</span>}
            </button>

            {/* Views counter */}
            <div className="flex items-center gap-1.5 select-none text-zinc-650">
              <BarChart2 className="size-4.5" />
              <span className="text-xs font-semibold">{formatViews(viewsCount)}</span>
            </div>

            {/* Bookmark button */}
            <button
              onClick={handleBookmark}
              className={`transition-colors ${localIsBookmarked ? "text-yellow-500" : "hover:text-yellow-500"}`}
            >
              <Bookmark className={`size-4.5 ${localIsBookmarked ? "fill-yellow-500" : ""}`} />
            </button>

            {/* Share button */}
            <button
              onClick={() => onShareClick(comment)}
              className="hover:text-zinc-300 transition-colors"
            >
              <Share2 className="size-4.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Show Nested Replies toggle */}
      {repliesCount > 0 && comment.replies && comment.replies.length > 0 && !showReplies && (
        <div className="pl-13 py-1 select-none flex items-center gap-2">
          <div className="w-8 h-px bg-zinc-800" />
          <button
            onClick={() => setShowReplies(true)}
            className="text-[13px] font-bold text-sky-400 hover:underline flex items-center"
          >
            Show replies ({repliesCount})
          </button>
        </div>
      )}

      {/* Render Nested Replies */}
      {showReplies && comment.replies && comment.replies.length > 0 && (
        <div className="pl-13 space-y-4 mt-2">
          {comment.replies.map((reply: any) => (
            <CommentNode
              key={reply.id}
              comment={reply}
              postUserId={postUserId}
              loggedInUser={loggedInUser}
              onReply={onReply}
              onShareClick={onShareClick}
              onShowOptions={onShowOptions}
              queryClient={queryClient}
            />
          ))}
          
          {/* Hide replies toggle button */}
          <div className="py-1 select-none flex items-center gap-2">
            <div className="w-8 h-px bg-zinc-800" />
            <button
              onClick={() => setShowReplies(false)}
              className="text-[13px] font-bold text-zinc-500 hover:text-white hover:underline"
            >
              Hide replies
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
