"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import kyInstance from "@/lib/ky";
import { PostsPage } from "@/lib/types";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import Post from "@/components/posts/Post";
import InfiniteScrollContainer from "@/components/InfiniteScrollContainer";

interface HashtagPageProps {
  params: { hashtag: string };
}

type SortType = "latest" | "top" | "media" | "videos";

export default function HashtagPage({ params: { hashtag } }: HashtagPageProps) {
  const [activeTab, setActiveTab] = useState<SortType>("latest");

  const queryKey = ["hashtag-feed", hashtag, activeTab];

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) =>
      kyInstance
        .get(`/api/hashtag/${hashtag}`, {
          searchParams: {
            type: activeTab,
            ...(pageParam ? { cursor: pageParam } : {}),
          },
        })
        .json<{
          posts: any[];
          nextCursor: string | null;
          stats: {
            totalPosts: number;
            recentActivityCount: number;
            trendingScore: number;
          };
        }>(),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const posts = data?.pages.flatMap((page) => page.posts) || [];
  const stats = data?.pages?.[0]?.stats || {
    totalPosts: 0,
    recentActivityCount: 0,
    trendingScore: 0,
  };

  const tabs: { value: SortType; label: string }[] = [
    { value: "latest", label: "Latest" },
    { value: "top", label: "Top" },
    { value: "media", label: "Media" },
    { value: "videos", label: "Videos" },
  ];

  return (
    <div className="w-full min-h-screen bg-black text-white pb-14 md:pb-0 flex flex-col items-center">
      {/* Header Sticky */}
      <div className="sticky top-0 z-30 w-full bg-black/80 backdrop-blur-md border-b border-zinc-900 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 hover:bg-zinc-900 rounded-full transition-colors text-white">
            <ArrowLeft className="size-5" />
          </Link>
          <div className="flex flex-col">
            <h1 className="font-black text-lg md:text-xl">#{decodeURIComponent(hashtag)}</h1>
            <span className="text-xs text-zinc-500">{stats.totalPosts} posts</span>
          </div>
        </div>
        <span className="text-xs font-bold text-purple-400 bg-purple-950/40 border border-purple-900 px-3 py-1 rounded-full">
          Hashtag Hub
        </span>
      </div>

      <main className="w-full max-w-[600px] mt-4 px-4 flex flex-col md:px-0">
        {/* Statistics Dashboard Widget */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 flex flex-col gap-3 mb-6 animate-fade-in">
          <span className="text-xs font-black tracking-widest text-zinc-500 uppercase">Hashtag Dashboard</span>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-zinc-900 border border-zinc-850 rounded-xl p-3 flex flex-col">
              <span className="text-[10px] font-bold text-zinc-500 uppercase">Total Posts</span>
              <span className="text-lg font-black text-white mt-1">{stats.totalPosts}</span>
            </div>
            <div className="bg-zinc-900 border border-zinc-850 rounded-xl p-3 flex flex-col">
              <span className="text-[10px] font-bold text-zinc-500 uppercase">Last 24h</span>
              <span className="text-lg font-black text-purple-400 mt-1">{stats.recentActivityCount} new</span>
            </div>
            <div className="bg-zinc-900 border border-zinc-850 rounded-xl p-3 flex flex-col">
              <span className="text-[10px] font-bold text-zinc-500 uppercase">Trend Score</span>
              <span className="text-lg font-black text-sky-400 mt-1">{stats.trendingScore}</span>
            </div>
          </div>
        </div>

        {/* Dynamic Navigation Pill Strips */}
        <div className="w-full border-b border-zinc-900 flex mb-4">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className="flex-1 py-3 text-center font-bold text-xs sm:text-sm transition relative hover:bg-zinc-900/30"
              >
                <span className={isActive ? "text-white" : "text-zinc-500 hover:text-white"}>
                  {tab.label}
                </span>
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 sm:w-16 h-[3px] bg-purple-500 rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Posts Stream */}
        {status === "pending" ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-6 animate-spin text-zinc-500" />
          </div>
        ) : posts.length === 0 ? (
          <p className="text-center text-zinc-500 py-10">No posts contain this hashtag.</p>
        ) : (
          <InfiniteScrollContainer
            className="flex flex-col gap-4"
            onBottomReached={() => hasNextPage && !isFetching && fetchNextPage()}
          >
            {posts.map((post) => (
              <Post key={post.id} post={post} />
            ))}
            {isFetchingNextPage && <Loader2 className="mx-auto my-4 animate-spin text-purple-500" />}
          </InfiniteScrollContainer>
        )}
      </main>
    </div>
  );
}
