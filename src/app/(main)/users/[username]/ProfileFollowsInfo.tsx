"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import kyInstance from "@/lib/ky";
import { FollowerInfo } from "@/lib/types";
import useFollowerInfo from "@/hooks/useFollowerInfo";
import { formatNumber } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, X } from "lucide-react";
import Link from "next/link";
import UserAvatar from "@/components/UserAvatar";
import FollowButton from "@/components/FollowButton";

interface ProfileFollowsInfoProps {
  userId: string;
  initialFollowerState: FollowerInfo;
  initialFollowingCount: number;
  postsCount: number;
}

export default function ProfileFollowsInfo({
  userId,
  initialFollowerState,
  initialFollowingCount,
  postsCount,
}: ProfileFollowsInfoProps) {
  const { data: followerData } = useFollowerInfo(userId, initialFollowerState);

  const [isFollowersOpen, setIsFollowersOpen] = useState(false);
  const [isFollowingOpen, setIsFollowingOpen] = useState(false);

  // Fetch followers list
  const { data: followersList = [], isLoading: followersLoading } = useQuery<any[]>({
    queryKey: ["user-followers-list", userId],
    queryFn: () => kyInstance.get(`/api/users/${userId}/followers/list`).json<any[]>(),
    enabled: isFollowersOpen,
  });

  // Fetch following list
  const { data: followingList = [], isLoading: followingLoading } = useQuery<any[]>({
    queryKey: ["user-following-list", userId],
    queryFn: () => kyInstance.get(`/api/users/${userId}/following/list`).json<any[]>(),
    enabled: isFollowingOpen,
  });

  return (
    <>
      {/* Stats row */}
      <div className="flex gap-5 text-sm pt-1 text-muted-foreground">
        <span>
          <strong className="text-foreground font-semibold">{formatNumber(postsCount)}</strong> posts
        </span>
        <button
          onClick={() => setIsFollowersOpen(true)}
          className="hover:underline text-muted-foreground"
        >
          <strong className="text-foreground font-semibold">{formatNumber(followerData.followers)}</strong> followers
        </button>
        <button
          onClick={() => setIsFollowingOpen(true)}
          className="hover:underline text-muted-foreground"
        >
          <strong className="text-foreground font-semibold">{formatNumber(initialFollowingCount)}</strong> following
        </button>
      </div>

      {/* Followers Modal */}
      <Dialog open={isFollowersOpen} onOpenChange={setIsFollowersOpen}>
        <DialogContent className="max-w-md w-[95vw] p-0 overflow-hidden bg-card rounded-2xl border border-zinc-800">
          <DialogHeader className="px-4 py-3 border-b border-zinc-900">
            <DialogTitle className="text-center font-bold text-base">Followers</DialogTitle>
          </DialogHeader>
          <div className="p-4 overflow-y-auto max-h-[60vh] flex flex-col gap-4">
            {followersLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="size-5 animate-spin text-zinc-500" />
              </div>
            ) : followersList.length === 0 ? (
              <p className="text-center text-zinc-500 py-6 text-sm">No followers yet.</p>
            ) : (
              followersList.map((item) => (
                <div key={item.id} className="flex justify-between items-start gap-3">
                  <Link
                    href={`/users/${item.username}`}
                    onClick={() => setIsFollowersOpen(false)}
                    className="flex gap-3 min-w-0"
                  >
                    <UserAvatar avatarUrl={item.avatarUrl} size={40} />
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs hover:underline text-foreground truncate max-w-[150px]">
                          {item.displayName}
                        </span>
                        {item.verified && (
                          <span className="size-3.5 rounded-full bg-blue-500 text-[8px] text-white flex items-center justify-center font-bold select-none shrink-0">
                            ✓
                          </span>
                        )}
                        {item.followsYou && (
                          <span className="text-[9px] bg-zinc-800 text-zinc-400 px-1 rounded font-medium shrink-0">
                            Follows you
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground truncate">@{item.username}</span>
                      {item.bio && <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">{item.bio}</p>}
                    </div>
                  </Link>
                  <FollowButton
                    userId={item.id}
                    initialState={{
                      followers: 0,
                      isFollowedByUser: item.isFollowedByUser,
                      followsYou: item.followsYou,
                    }}
                  />
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Following Modal */}
      <Dialog open={isFollowingOpen} onOpenChange={setIsFollowingOpen}>
        <DialogContent className="max-w-md w-[95vw] p-0 overflow-hidden bg-card rounded-2xl border border-zinc-800">
          <DialogHeader className="px-4 py-3 border-b border-zinc-900">
            <DialogTitle className="text-center font-bold text-base">Following</DialogTitle>
          </DialogHeader>
          <div className="p-4 overflow-y-auto max-h-[60vh] flex flex-col gap-4">
            {followingLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="size-5 animate-spin text-zinc-500" />
              </div>
            ) : followingList.length === 0 ? (
              <p className="text-center text-zinc-500 py-6 text-sm">Not following anyone yet.</p>
            ) : (
              followingList.map((item) => (
                <div key={item.id} className="flex justify-between items-start gap-3">
                  <Link
                    href={`/users/${item.username}`}
                    onClick={() => setIsFollowingOpen(false)}
                    className="flex gap-3 min-w-0"
                  >
                    <UserAvatar avatarUrl={item.avatarUrl} size={40} />
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs hover:underline text-foreground truncate max-w-[150px]">
                          {item.displayName}
                        </span>
                        {item.verified && (
                          <span className="size-3.5 rounded-full bg-blue-500 text-[8px] text-white flex items-center justify-center font-bold select-none shrink-0">
                            ✓
                          </span>
                        )}
                        {item.followsYou && (
                          <span className="text-[9px] bg-zinc-800 text-zinc-400 px-1 rounded font-medium shrink-0">
                            Follows you
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground truncate">@{item.username}</span>
                      {item.bio && <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">{item.bio}</p>}
                    </div>
                  </Link>
                  <FollowButton
                    userId={item.id}
                    initialState={{
                      followers: 0,
                      isFollowedByUser: item.isFollowedByUser,
                      followsYou: item.followsYou,
                    }}
                  />
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
