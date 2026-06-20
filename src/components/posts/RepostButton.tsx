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

interface RepostButtonProps {
  post: PostData;
}

interface RepostInfo {
  reposts: number;
  isRepostedByUser: boolean;
}

export default function RepostButton({ post }: RepostButtonProps) {
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

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center gap-2 hover:text-green-500 transition-colors text-muted-foreground"
            title="Repost"
          >
            <Repeat2
              className={cn(
                "size-[22px]",
                data.isRepostedByUser && "text-green-500"
              )}
              strokeWidth={1.75}
            />
            {data.reposts > 0 && (
              <span className="text-xs font-semibold tabular-nums">
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
