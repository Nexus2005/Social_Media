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
import { Repeat2, MessageSquareQuote } from "lucide-react";
import { useToast } from "../ui/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import QuotePostDialog from "./QuotePostDialog";
import { motion } from "framer-motion";

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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex flex-col items-center">
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.9 }}
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
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#090909] border border-zinc-800 rounded-xl text-white">
            <DropdownMenuItem
              onClick={() => mutate()}
              className="flex items-center gap-2.5 text-xs font-semibold cursor-pointer hover:bg-zinc-900 focus:bg-zinc-900 py-2 px-3 text-white"
            >
              <Repeat2 className="size-4" />
              <span>{data.isRepostedByUser ? "Undo repost" : "Repost"}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setShowQuoteDialog(true)}
              className="flex items-center gap-2.5 text-xs font-semibold cursor-pointer hover:bg-zinc-900 focus:bg-zinc-900 py-2 px-3 text-white"
            >
              <MessageSquareQuote className="size-4" />
              <span>Quote</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
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
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="bg-card border-border rounded-xl">
          <DropdownMenuItem
            onClick={() => mutate()}
            className="flex items-center gap-2.5 text-xs font-medium cursor-pointer"
          >
            <Repeat2 className="size-4" />
            <span>{data.isRepostedByUser ? "Undo repost" : "Repost"}</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setShowQuoteDialog(true)}
            className="flex items-center gap-2.5 text-xs font-medium cursor-pointer"
          >
            <MessageSquareQuote className="size-4" />
            <span>Quote</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <QuotePostDialog
        post={post}
        open={showQuoteDialog}
        onClose={() => setShowQuoteDialog(false)}
      />
    </>
  );
}
