"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import kyInstance from "@/lib/ky";
import { Search, Loader2 } from "lucide-react";
import Link from "next/link";
import UserAvatar from "@/components/UserAvatar";
import FollowButton from "@/components/FollowButton";
import StandardDrawer from "@/components/ui/StandardDrawer";

interface LikesBottomSheetProps {
  postId: string;
  open: boolean;
  onClose: () => void;
}

export default function LikesBottomSheet({
  postId,
  open,
  onClose,
}: LikesBottomSheetProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: users = [], isLoading } = useQuery<any[]>({
    queryKey: ["post-likes-users", postId],
    queryFn: () => kyInstance.get(`/api/posts/${postId}/likes/users`).json<any[]>(),
    enabled: open,
  });

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      (u.displayName && u.displayName.toLowerCase().includes(q))
    );
  });

  return (
    <StandardDrawer open={open} onClose={onClose} title="Likes">
      <div className="flex flex-col h-full bg-[#0A0A0A]">
        {/* Search bar */}
        <div className="px-4 py-3 border-b border-zinc-900 shrink-0">
          <div className="relative flex items-center h-10 w-full bg-zinc-900 rounded-[10px] px-3 gap-2 border border-zinc-800">
            <Search className="size-4 text-zinc-500 shrink-0" strokeWidth={2} />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-grow bg-transparent text-[15px] text-white placeholder-zinc-500 outline-none h-full"
            />
          </div>
        </div>

        {/* Liking users list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-6 animate-spin text-zinc-500" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <p className="text-center text-zinc-500 py-8 text-sm">
              {searchQuery ? "No matching users" : "No likes yet"}
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredUsers.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3">
                  <Link
                    href={`/users/${item.username}`}
                    onClick={onClose}
                    className="flex items-center gap-3 min-w-0"
                  >
                    <UserAvatar avatarUrl={item.avatarUrl} size={40} className="size-10 shrink-0 border border-zinc-800" />
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
                  <div className="w-[100px] shrink-0">
                    <FollowButton
                      userId={item.id}
                      initialState={{
                        followers: item._count?.followers || 0,
                        isFollowedByUser: item.followers?.length > 0,
                        followsYou: item.following?.length > 0,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </StandardDrawer>
  );
}
