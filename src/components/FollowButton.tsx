"use client";

import useFollowerInfo from "@/hooks/useFollowerInfo";
import kyInstance from "@/lib/ky";
import { FollowerInfo } from "@/lib/types";
import { QueryKey, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "./ui/button";
import { useToast } from "./ui/use-toast";
import { cn } from "@/lib/utils";

interface FollowButtonProps {
  userId: string;
  initialState: FollowerInfo;
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

  const { mutate } = useMutation({
    mutationFn: () =>
      data.isFollowedByUser
        ? kyInstance.delete(`/api/users/${userId}/followers`)
        : kyInstance.post(`/api/users/${userId}/followers`),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });

      const previousState = queryClient.getQueryData<FollowerInfo>(queryKey);

      queryClient.setQueryData<FollowerInfo>(queryKey, () => ({
        followers:
          (previousState?.followers || 0) +
          (previousState?.isFollowedByUser ? -1 : 1),
        isFollowedByUser: !previousState?.isFollowedByUser,
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
  });

  const getButtonText = () => {
    if (data.isFollowedByUser) {
      return "Following";
    }
    if (data.followsYou) {
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
        className={`text-xs font-bold hover:text-foreground transition-colors ${
          data.isFollowedByUser ? "text-muted-foreground" : "text-primary hover:text-primary/80"
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
        className="h-7 px-3 flex items-center justify-center rounded-full text-[11px] font-semibold text-white bg-[#262626] hover:bg-zinc-800 border-0 transition-colors"
      >
        {getButtonText()}
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
        className={cn(
          "h-12 px-6 flex items-center justify-center rounded-full text-sm font-bold transition-all active:scale-95 shrink-0 border-0",
          data.isFollowedByUser
            ? "bg-[#262626] hover:bg-zinc-800 text-white"
            : "bg-[#0095f6] hover:bg-[#1877f2] text-white"
        )}
      >
        {getButtonText()}
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
        className={cn(
          "h-8 px-4 flex items-center justify-center rounded-lg text-sm font-semibold transition-all active:scale-95 shrink-0 border-0",
          "bg-[#262626] hover:bg-zinc-800 text-white"
        )}
      >
        {getButtonText()}
      </button>
    );
  }

  return (
    <Button
      variant={data.isFollowedByUser ? "secondary" : "default"}
      onClick={(e) => {
        e.stopPropagation();
        mutate();
      }}
      className={cn(
        "h-9 px-6 rounded-[10px] text-xs font-semibold w-full transition-colors flex items-center justify-center border-0",
        data.isFollowedByUser
          ? "bg-[#262626] hover:bg-zinc-800 text-white"
          : "bg-[#0095f6] hover:bg-[#1877f2] text-white"
      )}
    >
      {getButtonText()}
    </Button>
  );
}
