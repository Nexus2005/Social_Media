"use client";

import { useState } from "react";
import { PostData } from "@/lib/types";
import { cn } from "@/lib/utils";
import kyInstance from "@/lib/ky";
import {
  QueryKey,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useSession } from "@/app/(main)/SessionProvider";
import { Repeat2, MessageSquareQuote, PenLine } from "lucide-react";
import { useToast } from "../ui/use-toast";
import QuotePostDialog from "./QuotePostDialog";
import { motion } from "framer-motion";
import StandardDrawer from "../ui/StandardDrawer";

interface RepostButtonProps {
  post: PostData;
  variant?: "feed" | "reel" | "reel-desktop";
}

interface RepostInfo {
  reposts: number;
  isRepostedByUser: boolean;
}

export default function RepostButton({ post, variant = "feed" }: RepostButtonProps) {
  const { user } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);

  const queryKey: QueryKey = ["repost-info", post.id];
  const [showRepostSheet, setShowRepostSheet] = useState(false);

  const initialState: RepostInfo = {
    reposts: post._count.reposts,
    isRepostedByUser: post.reposts.some((r) => r.userId === user.id),
  };

  // Wait, let's fetch the actual state from DB so it stays in sync
  const { data } = useQuery({
    queryKey,
    queryFn: () =>
      kyInstance.get(`/api/posts/${post.id}/repost`).json<RepostInfo>(),
    initialData: initialState,
    staleTime: Infinity,
  });

  const { mutate } = useMutation({
    mutationFn: () =>
      data.isRepostedByUser
        ? kyInstance.delete(`/api/posts/${post.id}/repost`)
        : kyInstance.post(`/api/posts/${post.id}/repost`),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });

      const previousState = queryClient.getQueryData<RepostInfo>(queryKey);

      queryClient.setQueryData<RepostInfo>(queryKey, () => ({
        reposts:
          (previousState?.reposts || 0) + (previousState?.isRepostedByUser ? -1 : 1),
        isRepostedByUser: !previousState?.isRepostedByUser,
      }));

      return { previousState };
    },
    onError(error, variables, context) {
      queryClient.setQueryData(queryKey, context?.previousState);
      console.error(error);
      toast({
        variant: "destructive",
        description: "Something went wrong. Please try again.",
      });
    },
    onSuccess: () => {
      // Invalidate the post feeds to refresh repost list
      queryClient.invalidateQueries({ queryKey: ["post-feed"] });
    },
  });

  if (variant === "reel" || variant === "reel-desktop") {
    const isDesktop = variant === "reel-desktop";
    return (
      <>
        <div className="flex flex-col items-center">
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowRepostSheet(true)}
            className="h-10 w-10 flex items-center justify-center text-white"
            title="Repost"
          >
            <Repeat2
              className={cn(
                "w-7 h-7 transition-colors",
                data.isRepostedByUser && "text-green-500"
              )}
              strokeWidth={1.75}
            />
          </motion.button>
          <span className={cn(
            "text-[11px] font-semibold mt-0.5",
            isDesktop ? "text-zinc-300" : "text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
          )}>
            {data.reposts > 0 ? data.reposts.toLocaleString() : "Repost"}
          </span>
        </div>

        <StandardDrawer
          open={showRepostSheet}
          onClose={() => setShowRepostSheet(false)}
          hideHeader
          className="bg-zinc-950 border-t border-zinc-800 text-white sm:max-w-[420px]"
        >
          <div className="flex flex-col py-6 px-4 gap-1.5 select-none text-start bg-zinc-950">
            <button
              onClick={() => {
                mutate();
                setShowRepostSheet(false);
              }}
              className="flex items-start gap-4 px-4 py-4 rounded-2xl hover:bg-zinc-900 active:bg-zinc-900 transition-colors w-full text-start group"
            >
              <Repeat2
                className={cn(
                  "size-6 mt-0.5 shrink-0 transition-colors text-zinc-400 group-hover:text-white",
                  data.isRepostedByUser && "text-green-500 group-hover:text-green-400"
                )}
                strokeWidth={2}
              />
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-[16px] text-white leading-tight">
                  {data.isRepostedByUser ? "Undo repost" : "Repost"}
                </span>
                <span className="text-[13px] text-zinc-500 mt-1 font-medium leading-tight">
                  Share this post with your followers
                </span>
              </div>
            </button>

            <button
              onClick={() => {
                setShowRepostSheet(false);
                setShowQuoteDialog(true);
              }}
              className="flex items-start gap-4 px-4 py-4 rounded-2xl hover:bg-zinc-900 active:bg-zinc-900 transition-colors w-full text-start group"
            >
              <PenLine className="size-6 mt-0.5 shrink-0 transition-colors text-zinc-400 group-hover:text-white" strokeWidth={2} />
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-[16px] text-white leading-tight">
                  Quote
                </span>
                <span className="text-[13px] text-zinc-500 mt-1 font-medium leading-tight">
                  Add a comment, photo or GIF before you share this post
                </span>
              </div>
            </button>
          </div>
        </StandardDrawer>

        <QuotePostDialog
          post={post}
          open={showQuoteDialog}
          onClose={() => setShowQuoteDialog(false)}
        />
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowRepostSheet(true)}
        className="h-11 px-2 flex items-center gap-2 hover:opacity-80 transition-opacity text-white"
        title="Repost"
      >
        <Repeat2
          className={cn(
            "size-6",
            data.isRepostedByUser && "text-green-500"
          )}
          strokeWidth={1.75}
        />
        {data.reposts > 0 && (
          <span className="text-[15px] font-semibold tabular-nums text-white">
            {data.reposts}
          </span>
        )}
      </button>

      <StandardDrawer
        open={showRepostSheet}
        onClose={() => setShowRepostSheet(false)}
        hideHeader
        className="bg-zinc-950 border-t border-zinc-800 text-white sm:max-w-[420px]"
      >
        <div className="flex flex-col py-6 px-4 gap-1.5 select-none text-start bg-zinc-950">
          <button
            onClick={() => {
              mutate();
              setShowRepostSheet(false);
            }}
            className="flex items-start gap-4 px-4 py-4 rounded-2xl hover:bg-zinc-900 active:bg-zinc-900 transition-colors w-full text-start group"
          >
            <Repeat2
              className={cn(
                "size-6 mt-0.5 shrink-0 transition-colors text-zinc-400 group-hover:text-white",
                data.isRepostedByUser && "text-green-500 group-hover:text-green-400"
              )}
              strokeWidth={2}
            />
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-[16px] text-white leading-tight">
                {data.isRepostedByUser ? "Undo repost" : "Repost"}
              </span>
              <span className="text-[13px] text-zinc-500 mt-1 font-medium leading-tight">
                Share this post with your followers
              </span>
            </div>
          </button>

          <button
            onClick={() => {
              setShowRepostSheet(false);
              setShowQuoteDialog(true);
            }}
            className="flex items-start gap-4 px-4 py-4 rounded-2xl hover:bg-zinc-900 active:bg-zinc-900 transition-colors w-full text-start group"
          >
            <PenLine className="size-6 mt-0.5 shrink-0 transition-colors text-zinc-400 group-hover:text-white" strokeWidth={2} />
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-[16px] text-white leading-tight">
                Quote
              </span>
              <span className="text-[13px] text-zinc-500 mt-1 font-medium leading-tight">
                Add a comment, photo or GIF before you share this post
              </span>
            </div>
          </button>
        </div>
      </StandardDrawer>

      <QuotePostDialog
        post={post}
        open={showQuoteDialog}
        onClose={() => setShowQuoteDialog(false)}
      />
    </>
  );
}
