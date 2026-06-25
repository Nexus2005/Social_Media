"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import kyInstance from "@/lib/ky";
import { ArrowLeft, Search, Loader2, Users } from "lucide-react";
import Link from "next/link";
import UserAvatar from "@/components/UserAvatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import FollowButton from "@/components/FollowButton";

interface FollowingClientProps {
  profileUserId: string;
  profileUsername: string;
  profileDisplayName: string | null;
}

export default function FollowingClient({
  profileUserId,
  profileUsername,
  profileDisplayName,
}: FollowingClientProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: users = [], isLoading, error } = useQuery<any[]>({
    queryKey: ["following-list", profileUserId],
    queryFn: () =>
      kyInstance
        .get(`/api/users/${profileUserId}/following/list`)
        .json<any[]>(),
  });

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      (u.displayName && u.displayName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-instagram-darkBg text-instagram-lightText dark:text-instagram-darkText">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-white/85 dark:bg-instagram-darkBg/85 backdrop-blur-md border-b border-instagram-lightBorder dark:border-instagram-darkBorder px-4 py-3 flex items-center gap-3">
        <Link href={`/users/${profileUsername}`} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full transition">
          <ArrowLeft className="size-6 text-current" strokeWidth={1.75} />
        </Link>
        <div className="flex flex-col">
          <span className="font-bold text-[16px] text-current leading-none">
            Following
          </span>
          <span className="text-[12px] text-zinc-500 mt-1 font-semibold leading-none">
            @{profileUsername}
          </span>
        </div>
      </div>

      {/* Sticky Search */}
      <div className="sticky top-[56px] z-20 bg-white dark:bg-instagram-darkBg border-b border-instagram-lightBorder dark:border-instagram-darkBorder p-4">
        <div className="relative flex items-center h-10 w-full bg-zinc-100 dark:bg-zinc-900/60 rounded-[10px] px-3 gap-2 border border-instagram-lightBorder dark:border-instagram-darkBorder focus-within:border-zinc-400 dark:focus-within:border-zinc-700 transition-colors">
          <Search className="size-4 text-zinc-500 shrink-0" strokeWidth={2} />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-grow bg-transparent text-[15px] text-current placeholder-zinc-500 outline-none h-full"
          />
        </div>
      </div>

      {/* Users List Container */}
      <div className="flex-grow p-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-8 animate-spin text-zinc-500" />
          </div>
        ) : error ? (
          <p className="text-center text-red-500 py-8">
            Failed to load following list.
          </p>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center select-none">
            <Users className="size-12 text-zinc-400 dark:text-zinc-600 mb-3" strokeWidth={1.5} />
            <h3 className="text-[16px] font-bold text-current mb-1">
              No following found
            </h3>
            <p className="text-[14px] text-zinc-500 max-w-[240px]">
              {searchQuery ? "Try searching for a different name or username." : "This account isn't following anyone yet."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredUsers.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3">
                <Link
                  href={`/users/${item.username}`}
                  className="flex items-center gap-3 min-w-0"
                >
                  <UserAvatar avatarUrl={item.avatarUrl} size={40} className="size-10 shrink-0 border border-instagram-lightBorder dark:border-instagram-darkBorder bg-zinc-100 dark:bg-zinc-900 object-cover" />
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-[15px] text-current hover:underline truncate">
                        {item.displayName || item.username}
                      </span>
                      {item.verified && (
                        <VerifiedBadge size={14} className="shrink-0" />
                      )}
                    </div>
                    <span className="text-[14px] text-zinc-400 truncate">@{item.username}</span>
                  </div>
                </Link>
                <div className="w-[110px] shrink-0">
                  <FollowButton
                    userId={item.id}
                    initialState={{
                      followers: 0,
                      isFollowedByUser: item.isFollowedByUser,
                      followsYou: item.followsYou,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
