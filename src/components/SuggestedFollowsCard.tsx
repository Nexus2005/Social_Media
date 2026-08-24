"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import UserAvatar from "@/components/UserAvatar";
import UserTooltip from "@/components/UserTooltip";
import FollowButton from "@/components/FollowButton";
import { Loader2 } from "lucide-react";
import { useInfiniteQuery } from "@tanstack/react-query";
import kyInstance from "@/lib/ky";

interface SuggestedUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  followers: { followerId: string }[];
  _count: {
    followers: number;
  };
}

interface SuggestedFollowsCardProps {
  initialSuggestions: SuggestedUser[];
  currentUserId: string;
}

export default function SuggestedFollowsCard({
  initialSuggestions,
  currentUserId,
}: SuggestedFollowsCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Infinite query to load more suggestions when expanded
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey: ["user-suggestions-infinite"],
    queryFn: ({ pageParam = 1 }) =>
      kyInstance.get(`/api/users/suggestions?page=${pageParam}&limit=8`).json<SuggestedUser[]>(),
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 8 ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: isExpanded,
  });

  // Intersection Observer for scroll triggers
  useEffect(() => {
    if (!isExpanded || !hasNextPage || isFetchingNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );
    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }
    return () => observer.disconnect();
  }, [isExpanded, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Combine initial suggestions or paginated results
  let displayedUsers = initialSuggestions;
  if (isExpanded && data) {
    // Flatten all pages
    const loadedUsers = data.pages.flat();
    // Filter duplicates between initial and loaded
    const uniqueLoaded = loadedUsers.filter(
      (lu) => !initialSuggestions.some((is) => is.id === lu.id)
    );
    displayedUsers = [...initialSuggestions, ...uniqueLoaded];
  }

  return (
    <div className="monolith-card uiverse-neumorphic-card w-full relative overflow-hidden transition-all duration-300 p-4">
      {/* Texture Overlay */}
      <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.01)_3px)] pointer-events-none z-10" />

      <div className="relative z-10 space-y-4 text-start">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-black tracking-tight text-foreground uppercase">
            Suggested for you
          </span>
          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            className="text-[11px] font-bold text-indigo-500 hover:text-indigo-400 transition-colors cursor-pointer select-none"
          >
            {isExpanded ? "Show less" : "See all"}
          </button>
        </div>

        {/* Suggested Users List */}
        <div className="flex flex-col gap-3.5">
          {displayedUsers.map((suggestedUser) => {
            const isFollowed = suggestedUser.followers.some(
              (f: any) => f.followerId === currentUserId
            );

            return (
              <div
                key={suggestedUser.id}
                className="flex items-center justify-between gap-3 py-0.5 animate-in fade-in duration-200"
              >
                <UserTooltip user={suggestedUser as any}>
                  <Link
                    href={`/users/${suggestedUser.username}`}
                    className="flex items-center gap-3 min-w-0 group"
                  >
                    <UserAvatar avatarUrl={suggestedUser.avatarUrl} size={36} className="shrink-0" />
                    <div className="flex flex-col text-start min-w-0">
                      <span className="font-bold text-[13px] leading-tight hover:underline text-foreground group-hover:text-indigo-500 transition-colors truncate">
                        {suggestedUser.username}
                      </span>
                      <span className="text-[10px] leading-none text-muted-foreground mt-0.5 select-none">
                        Suggested for you
                      </span>
                    </div>
                  </Link>
                </UserTooltip>

                <FollowButton
                  userId={suggestedUser.id}
                  initialState={{
                    followers: suggestedUser._count.followers,
                    isFollowedByUser: isFollowed,
                  }}
                  variant="text"
                />
              </div>
            );
          })}
        </div>

        {/* Infinite Scroll Sentinel / Loading indicator */}
        {isExpanded && (
          <div ref={sentinelRef} className="flex justify-center py-2 select-none">
            {isFetchingNextPage ? (
              <Loader2 className="animate-spin size-4 text-indigo-500" />
            ) : hasNextPage ? (
              <span className="text-[10px] text-muted-foreground font-semibold">Scroll down for more</span>
            ) : (
              <span className="text-[10px] text-muted-foreground font-semibold">No more suggestions</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
