"use client";

import kyInstance from "@/lib/ky";
import { CommentsPage, PostData } from "@/lib/types";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import ReelsComment from "./ReelsComment";
import ReelsCommentInput from "./ReelsCommentInput";

interface ReelsCommentsProps {
  post: PostData;
}

export default function ReelsComments({ post }: ReelsCommentsProps) {
  const { data, fetchNextPage, hasNextPage, isFetching, status } =
    useInfiniteQuery({
      queryKey: ["comments", post.id],
      queryFn: ({ pageParam }) =>
        kyInstance
          .get(
            `/api/posts/${post.id}/comments`,
            pageParam ? { searchParams: { cursor: pageParam } } : {},
          )
          .json<CommentsPage>(),
      initialPageParam: null as string | null,
      getNextPageParam: (firstPage) => firstPage.previousCursor,
      select: (data) => ({
        pages: [...data.pages].reverse(),
        pageParams: [...data.pageParams].reverse(),
      }),
    });

  const comments = data?.pages.flatMap((page) => page.comments) || [];

  if (post.disableComments) {
    return (
      <div className="text-center py-4 text-xs text-zinc-500 italic border-t border-zinc-900/60 select-none">
        Comments are turned off for this post.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full select-none bg-[#090909] overflow-hidden">
      {/* Scrollable list container */}
      <div className="flex-grow overflow-y-auto p-4 space-y-4 scrollbar-none">
        {hasNextPage && (
          <Button
            variant="link"
            className="mx-auto block text-xs font-semibold text-zinc-400 hover:text-white"
            disabled={isFetching}
            onClick={() => fetchNextPage()}
          >
            Load previous comments
          </Button>
        )}

        {status === "pending" && <Loader2 className="mx-auto animate-spin text-zinc-650" />}
        {status === "success" && !comments.length && (
          <p className="text-center text-xs text-zinc-550 py-8">No comments yet.</p>
        )}
        {status === "error" && (
          <p className="text-center text-xs text-destructive py-8">
            An error occurred while loading comments.
          </p>
        )}

        <div className="divide-y divide-zinc-900/40">
          {comments.map((comment) => (
            <ReelsComment key={comment.id} comment={comment} postUserId={post.user.id} />
          ))}
        </div>
      </div>

      {/* Input container strictly pinned at bottom */}
      <div className="border-t border-zinc-900/60 p-4 bg-[#090909] shrink-0">
        <ReelsCommentInput post={post} />
      </div>
    </div>
  );
}
