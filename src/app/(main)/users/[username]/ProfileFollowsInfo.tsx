"use client";

import useFollowerInfo from "@/hooks/useFollowerInfo";
import { FollowerInfo } from "@/lib/types";
import { formatNumber } from "@/lib/utils";
import Link from "next/link";

interface ProfileFollowsInfoProps {
  userId: string;
  username: string;
  initialFollowerState: FollowerInfo;
  initialFollowingCount: number;
  postsCount: number;
}

export default function ProfileFollowsInfo({
  userId,
  username,
  initialFollowerState,
  initialFollowingCount,
  postsCount,
}: ProfileFollowsInfoProps) {
  const { data: followerData } = useFollowerInfo(userId, initialFollowerState);

  return (
    <div className="flex items-center gap-x-3 gap-y-1.5 text-[14px] text-zinc-400 font-medium flex-wrap select-none leading-none pt-1">
      <span>@{username}</span>
      <span className="text-zinc-600 dark:text-zinc-700">•</span>
      <Link href={`/users/${username}/followers`} className="hover:underline hover:text-foreground text-zinc-700 dark:text-zinc-300 transition-colors">
        <span className="font-extrabold text-zinc-950 dark:text-foreground mr-1">{formatNumber(followerData?.followers ?? initialFollowerState.followers)}</span>
        followers
      </Link>
      <span className="text-zinc-600 dark:text-zinc-700">•</span>
      <Link href={`/users/${username}/following`} className="hover:underline hover:text-foreground text-zinc-700 dark:text-zinc-300 transition-colors">
        <span className="font-extrabold text-zinc-950 dark:text-foreground mr-1">{formatNumber(initialFollowingCount)}</span>
        following
      </Link>
      <span className="text-zinc-600 dark:text-zinc-700">•</span>
      <span className="text-zinc-700 dark:text-zinc-300">
        <span className="font-extrabold text-zinc-950 dark:text-foreground mr-1">{formatNumber(postsCount)}</span>
        posts
      </span>
    </div>
  );
}
