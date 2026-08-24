"use client";

import useFollowerInfo from "@/hooks/useFollowerInfo";
import kyInstance from "@/lib/ky";
import { FollowerInfo } from "@/lib/types";
import { QueryKey, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "./ui/button";
import { useToast } from "./ui/use-toast";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface FollowButtonProps {
  userId: string;
  initialState?: FollowerInfo;
  variant?: "button" | "text" | "reel-pill" | "notification-pill" | "post-header";
}

export default function FollowButton({
  userId,
  initialState,
  variant = "button",
}: FollowButtonProps) {
  const { toast } = useToast();

  const queryClient = useQueryClient();

  const { data } = useFollowerInfo(userId, initialState);

  const queryKey: QueryKey = ["follower-info", userId];

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      data?.isFollowedByUser || data?.status === "PENDING"
        ? kyInstance.delete(`/api/users/${userId}/followers`)
        : kyInstance.post(`/api/users/${userId}/followers`),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });

      const previousState = queryClient.getQueryData<FollowerInfo>(queryKey);

      // Optimistically derive next state. For private accounts the server
      // responds with PENDING — we optimistically show Requested immediately.
      const wasActive =
        previousState?.isFollowedByUser || previousState?.status === "PENDING";

      if (previousState?.status === "PENDING") {
        // Cancelling a pending request → back to plain Follow
        queryClient.setQueryData<FollowerInfo>(queryKey, () => ({
          followers: previousState.followers,
          isFollowedByUser: false,
          followsYou: previousState.followsYou,
          status: null,
        }));
      } else if (!wasActive) {
        // Following a private account optimistically shows Requested; the
        // mutation response corrects it to Accepted for public accounts.
        queryClient.setQueryData<FollowerInfo>(queryKey, () => ({
          followers:
            (previousState?.followers || 0) + 1,
          isFollowedByUser: false,
          followsYou: previousState?.followsYou,
          status: "PENDING",
        }));
      }

      return { previousState };
    },
    onSuccess: (response: any) => {
      // Correct optimistic state with the authoritative server response
      queryClient.setQueryData<FollowerInfo>(queryKey, (prev) =>
        prev
          ? {
              ...prev,
              isFollowedByUser: response?.status === "ACCEPTED",
              status: response?.status ?? prev.status,
            }
          : prev,
      );
    },
    onError(error, variables, context) {
      queryClient.setQueryData(queryKey, context?.previousState);
      console.error(error);
      toast({
        variant: "destructive",
        description: "Something went wrong. Please try again.",
      });
    },
  });

  const getButtonText = () => {
    if (data?.isFollowedByUser) {
      return "Following";
    }
    if (data?.status === "PENDING") {
      return "Requested";
    }
    if (data?.followsYou) {
      return "Follow Back";
    }
    return "Follow";
  };

  if (variant === "text") {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          mutate();
        }}
        disabled={isPending}
        aria-label={getButtonText()}
        className={`text-xs font-bold hover:text-foreground transition-colors disabled:opacity-60 ${
          data?.isFollowedByUser ? "text-muted-foreground" : "text-primary hover:text-primary/80"
        }`}
      >
        {getButtonText()}
      </button>
    );
  }

  if (variant === "reel-pill") {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          mutate();
        }}
        disabled={isPending}
        aria-label={getButtonText()}
        className="h-7 px-3 flex items-center justify-center rounded-full text-[11px] font-semibold text-white bg-[#262626] hover:bg-zinc-800 border-0 transition-colors disabled:opacity-60"
      >
        {isPending ? <Loader2 className="size-3 animate-spin" /> : getButtonText()}
      </button>
    );
  }

  if (variant === "notification-pill") {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          mutate();
        }}
        disabled={isPending}
        aria-label={getButtonText()}
        className={cn(
          "h-12 px-6 flex items-center justify-center rounded-full text-sm font-bold transition-all active:scale-95 shrink-0 border-0 disabled:opacity-70",
          data?.isFollowedByUser || data?.status === "PENDING"
            ? "bg-[#262626] hover:bg-zinc-800 text-white"
            : "bg-[#0095f6] hover:bg-[#1877f2] text-white",
        )}
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          getButtonText()
        )}
      </button>
    );
  }

  if (variant === "post-header") {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          mutate();
        }}
        disabled={isPending}
        aria-label={getButtonText()}
        className={cn(
          "h-8 px-4 flex items-center justify-center rounded-lg text-sm font-semibold transition-all active:scale-95 shrink-0 border-0 disabled:opacity-70",
          data?.isFollowedByUser
            ? "bg-[#262626] hover:bg-zinc-800 text-white"
            : data?.status === "PENDING"
              ? "border border-zinc-700 bg-transparent hover:bg-zinc-900 text-white"
              : "bg-[#0095f6] hover:bg-[#1877f2] text-white",
        )}
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          getButtonText()
        )}
      </button>
    );
  }

  return (
    <Button
      variant={data?.isFollowedByUser ? "secondary" : "default"}
      onClick={(e) => {
        e.stopPropagation();
        mutate();
      }}
      disabled={isPending}
      aria-label={getButtonText()}
      className={cn(
        "h-9 px-6 rounded-[10px] text-xs font-semibold w-full transition-colors flex items-center justify-center border-0 disabled:opacity-70",
        data?.isFollowedByUser
          ? "bg-[#262626] hover:bg-zinc-800 text-white"
          : data?.status === "PENDING"
            ? "border border-zinc-700 bg-transparent hover:bg-zinc-900 text-white"
            : "bg-[#0095f6] hover:bg-[#1877f2] text-white",
      )}
    >
      {isPending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        getButtonText()
      )}
    </Button>
  );
}
