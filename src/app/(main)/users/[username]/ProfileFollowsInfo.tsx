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
    <div className="grid grid-cols-3 w-full py-1 text-center select-none shrink-0 gap-1">
      <div className="flex flex-col items-center justify-center">
        <span className="text-[20px] font-bold text-white leading-none">
          {formatNumber(postsCount)}
        </span>
        <span className="text-[15px] font-normal text-zinc-400 mt-1 leading-none">
          posts
        </span>
      </div>
      
      <Link href={`/users/${username}/followers`} className="flex flex-col items-center justify-center hover:opacity-80 transition-opacity">
        <span className="text-[20px] font-bold text-white leading-none">
          {formatNumber(followerData.followers)}
        </span>
        <span className="text-[15px] font-normal text-zinc-400 mt-1 leading-none">
          followers
        </span>
      </Link>

      <Link href={`/users/${username}/following`} className="flex flex-col items-center justify-center hover:opacity-80 transition-opacity">
        <span className="text-[20px] font-bold text-white leading-none">
          {formatNumber(initialFollowingCount)}
        </span>
        <span className="text-[15px] font-normal text-zinc-400 mt-1 leading-none">
          following
        </span>
      </Link>
    </div>
  );
}
