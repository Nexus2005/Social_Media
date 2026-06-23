"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import kyInstance from "@/lib/ky";
import { ArrowLeft, Search, Loader2, Users } from "lucide-react";
import Link from "next/link";
import UserAvatar from "@/components/UserAvatar";
import FollowButton from "@/components/FollowButton";

interface FollowersClientProps {
  profileUserId: string;
  profileUsername: string;
  profileDisplayName: string | null;
}

export default function FollowersClient({
  profileUserId,
  profileUsername,
  profileDisplayName,
}: FollowersClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "mutual">("all");

  const { data: users = [], isLoading, error } = useQuery<any[]>({
    queryKey: ["followers-list", profileUserId],
    queryFn: () =>
      kyInstance
        .get(`/api/users/${profileUserId}/followers/list`)
        .json<any[]>(),
  });

  const filteredUsers = users.filter((u) => {
    // Search query match
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      u.username.toLowerCase().includes(q) ||
      (u.displayName && u.displayName.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    // Filter type
    if (filter === "mutual") {
      return u.isFollowedByUser; // We follow them back, so it is mutual follow (since they follow target/us)
    }

    return true;
  });

  return (
    <div className="flex flex-col min-h-screen bg-black">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-black/85 backdrop-blur-md border-b border-zinc-900 px-4 py-3 flex items-center gap-3">
        <Link href={`/users/${profileUsername}`} className="p-1 hover:bg-zinc-900 rounded-full transition">
          <ArrowLeft className="size-6 text-white" strokeWidth={1.75} />
        </Link>
        <div className="flex flex-col">
          <span className="font-bold text-[16px] text-white leading-none">
            Followers
          </span>
          <span className="text-[12px] text-zinc-500 mt-1 font-semibold leading-none">
            @{profileUsername}
          </span>
        </div>
      </div>

      {/* Sticky Filters & Search */}
      <div className="sticky top-[56px] z-20 bg-black border-b border-zinc-900 p-4 space-y-4">
        {/* Search Input */}
        <div className="relative flex items-center h-10 w-full bg-zinc-950 rounded-[10px] px-3 gap-2 border border-zinc-900 focus-within:border-zinc-800 transition-colors">
          <Search className="size-4 text-zinc-500 shrink-0" strokeWidth={2} />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-grow bg-transparent text-[15px] text-white placeholder-zinc-500 outline-none h-full"
          />
        </div>

        {/* Mutual Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              filter === "all"
                ? "bg-white text-black border-white"
                : "bg-transparent text-zinc-400 border-zinc-800 hover:text-white"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("mutual")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              filter === "mutual"
                ? "bg-white text-black border-white"
                : "bg-transparent text-zinc-400 border-zinc-800 hover:text-white"
            }`}
          >
            Mutual
          </button>
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
            Failed to load followers.
          </p>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center select-none">
            <Users className="size-12 text-zinc-700 mb-3" strokeWidth={1.5} />
            <h3 className="text-[16px] font-bold text-white mb-1">
              No followers found
            </h3>
            <p className="text-[14px] text-zinc-500 max-w-[240px]">
              {searchQuery ? "Try searching for a different name or username." : "This account doesn't have any followers yet."}
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
                  <UserAvatar avatarUrl={item.avatarUrl} size={40} className="size-10 shrink-0 border border-zinc-900 bg-zinc-950 object-cover" />
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-[15px] text-white hover:underline truncate">
                        {item.displayName || item.username}
                      </span>
                      {item.verified && (
                        <span className="text-[#0095f6] text-[12px] font-bold shrink-0" title="Verified Creator">☑</span>
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
