"use client";

import useFollowerInfo from "@/hooks/useFollowerInfo";
import kyInstance from "@/lib/ky";
import { FollowerInfo } from "@/lib/types";
import { QueryKey, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "./ui/button";
import { useToast } from "./ui/use-toast";

interface FollowButtonProps {
  userId: string;
  initialState: FollowerInfo;
  variant?: "button" | "text" | "reel-pill";
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
        className="h-7 px-3 flex items-center justify-center rounded-full text-[11px] font-semibold text-white bg-black/40 hover:bg-black/60 border border-white/10 transition-colors"
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
      className={data.isFollowedByUser ? "" : "bg-primary text-primary-foreground hover:bg-primary/90 rounded-full font-bold px-4"}
    >
      {getButtonText()}
    </Button>
  );
}
