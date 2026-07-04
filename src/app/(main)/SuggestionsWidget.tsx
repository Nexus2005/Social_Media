"use client";

import React, { useState } from "react";
import Link from "next/link";
import UserAvatar from "@/components/UserAvatar";
import UserTooltip from "@/components/UserTooltip";
import FollowButton from "@/components/FollowButton";
import { UserData } from "@/lib/types";

interface SuggestionsWidgetProps {
  initialSuggestions: UserData[];
  currentUserId: string;
}

export default function SuggestionsWidget({
  initialSuggestions,
  currentUserId,
}: SuggestionsWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [visibleCount, setVisibleCount] = useState(3);
  const [suggestions, setSuggestions] = useState<UserData[]>(initialSuggestions);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialSuggestions.length >= 12);

  const displayedSuggestions = suggestions.slice(0, isExpanded ? visibleCount : 3);

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isExpanded) {
      setIsExpanded(true);
      setVisibleCount(suggestions.length);
    } else {
      setIsExpanded(false);
      setVisibleCount(3);
    }
  };

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      // Simulate loading more or fetching next batch from database
      await new Promise((resolve) => setTimeout(resolve, 800));
      // In a real app we'd fetch from an API like `/api/users/suggestions?skip=...`
      // We will append a few mock suggestions or query more
      const mockMore: UserData[] = [
        {
          id: "mock-1",
          username: "style.inspiration",
          displayName: "Style Insp",
          avatarUrl: null,
          verified: false,
          createdAt: new Date(),
          followers: [],
          following: [],
          posts: [],
          _count: { followers: 15, following: 4, posts: 2, likes: 0, comments: 0, reposts: 0, views: 0 },
        },
        {
          id: "mock-2",
          username: "travel.mode",
          displayName: "Travel Mode",
          avatarUrl: null,
          verified: true,
          createdAt: new Date(),
          followers: [],
          following: [],
          posts: [],
          _count: { followers: 42, following: 12, posts: 8, likes: 0, comments: 0, reposts: 0, views: 0 },
        },
        {
          id: "mock-3",
          username: "foodie.delight",
          displayName: "Foodie Delight",
          avatarUrl: null,
          verified: false,
          createdAt: new Date(),
          followers: [],
          following: [],
          posts: [],
          _count: { followers: 98, following: 20, posts: 15, likes: 0, comments: 0, reposts: 0, views: 0 },
        }
      ] as any[];
      setSuggestions((prev) => [...prev, ...mockMore]);
      setVisibleCount((prev) => prev + mockMore.length);
      setHasMore(false); // only 1 batch of mock pagination
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMore(false);
    }
  };

  if (!suggestions.length) return null;

  return (
    <div className="p-4.5 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/80 bg-[#ffffff]/60 dark:bg-[#0c0d14]/40 backdrop-blur-md shadow-sm select-none flex flex-col gap-3.5 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[14px] font-black text-foreground tracking-wide uppercase">
          Who to follow
        </span>
        <button
          onClick={handleToggleExpand}
          className="text-[12px] font-extrabold text-indigo-500 hover:text-indigo-600 transition-colors cursor-pointer"
        >
          {isExpanded ? "Show less" : "View all"}
        </button>
      </div>

      {/* Suggested Users list */}
      <div className="flex flex-col gap-3">
        {displayedSuggestions.map((suggestedUser) => (
          <div key={suggestedUser.id} className="flex items-center justify-between gap-3 px-1">
            <UserTooltip user={suggestedUser}>
              <Link href={`/users/${suggestedUser.username}`} className="flex items-center gap-3 min-w-0">
                <UserAvatar avatarUrl={suggestedUser.avatarUrl} size={36} className="shrink-0" />
                <div className="flex flex-col text-start min-w-0">
                  <span className="font-bold text-[13px] leading-tight hover:underline text-foreground truncate">
                    {suggestedUser.username}
                  </span>
                  <span className="text-[11px] leading-none text-muted-foreground truncate">
                    {suggestedUser.displayName}
                  </span>
                </div>
              </Link>
            </UserTooltip>
            
            <FollowButton
              userId={suggestedUser.id}
              initialState={{
                followers: suggestedUser._count?.followers || 0,
                isFollowedByUser: false,
              }}
              variant="text"
            />
          </div>
        ))}
      </div>

      {/* Load More Button for expanded view */}
      {isExpanded && hasMore && (
        <button
          onClick={handleLoadMore}
          disabled={loadingMore}
          className="w-full text-center py-2 text-xs font-bold text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl transition-all disabled:opacity-50 cursor-pointer active:scale-[0.98]"
        >
          {loadingMore ? "Loading more..." : "Load more"}
        </button>
      )}
    </div>
  );
}
