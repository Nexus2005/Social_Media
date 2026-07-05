"use client";

import { useState, memo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import kyInstance from "@/lib/ky";
import { PostsPage, PostData } from "@/lib/types";
import { useSession } from "@/app/(main)/SessionProvider";
import Post from "@/components/posts/Post";
import PostsLoadingSkeleton from "@/components/posts/PostsLoadingSkeleton";
import InfiniteScrollContainer from "@/components/InfiniteScrollContainer";
import { Loader2, Grid, Repeat2, MessageSquare, Image as ImageIcon, Film, Heart } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface UserPostsProps {
  userId: string;
}

type ProfileTab = "posts" | "reels" | "reposts";

const ALLOWED_PROFILE_TABS: ProfileTab[] = ["posts", "reels", "reposts"];

export default function UserPosts({ userId }: UserPostsProps) {
  const { user: loggedInUser } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const rawTab = searchParams.get("tab");
  const activeTab: ProfileTab = ALLOWED_PROFILE_TABS.includes(rawTab as any)
    ? (rawTab as ProfileTab)
    : "posts";

  const handleTabChange = (tabName: ProfileTab) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tabName === "posts") {
      params.delete("tab");
    } else {
      params.set("tab", tabName);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const isOwner = userId === loggedInUser.id;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey: ["post-feed", "user-posts", userId, activeTab],
    queryFn: ({ pageParam }) =>
      kyInstance
        .get(
          `/api/users/${userId}/posts`,
          {
            searchParams: {
              ...(pageParam ? { cursor: pageParam } : {}),
              tab: activeTab,
            },
          }
        )
        .json<PostsPage>(),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: true,
  });

  const posts = data?.pages.flatMap((page) => page.posts) || [];

  if (status === "pending") {
    return (
      <div className="space-y-4">
        <TabsSelector activeTab={activeTab} onTabChange={handleTabChange} />
        <PostsLoadingSkeleton />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="space-y-4">
        <TabsSelector activeTab={activeTab} onTabChange={handleTabChange} />
        <p className="text-center text-destructive py-8 font-medium">
          An error occurred while loading posts.
        </p>
      </div>
    );
  }

  const isGridView = activeTab === "posts";
  const isReelsView = activeTab === "reels";

  return (
    <div className="space-y-0 select-none">
      <TabsSelector activeTab={activeTab} onTabChange={handleTabChange} />

      {!posts.length && !hasNextPage ? (
        <div className="flex flex-col items-center justify-center py-16 text-center select-none px-4">
          {activeTab === "reels" ? (
            <>
              <Film className="size-12 text-zinc-750 mb-3" strokeWidth={1.5} />
              <h3 className="text-[16px] font-bold text-white mb-1">No Reels</h3>
              <p className="text-[14px] text-zinc-500 max-w-[280px]">Videos shared by this user will appear here.</p>
            </>
          ) : activeTab === "reposts" ? (
            <>
              <Repeat2 className="size-12 text-zinc-750 mb-3" strokeWidth={1.5} />
              <h3 className="text-[16px] font-bold text-white mb-1">No Reposts</h3>
              <p className="text-[14px] text-zinc-500 max-w-[280px]">Reposted content will show up here.</p>
            </>
          ) : (
            <>
              <Grid className="size-12 text-zinc-550 mb-3" strokeWidth={1.5} />
              <h3 className="text-[16px] font-bold text-foreground mb-1">No Posts Yet</h3>
              <p className="text-[14px] text-muted-foreground max-w-[280px]">When this user posts, they will show up here.</p>
            </>
          )}
        </div>
      ) : isGridView ? (
        <InfiniteScrollContainer
          className="grid grid-cols-3 gap-0.5 w-full bg-instagram-lightBorder dark:bg-instagram-darkBorder"
          onBottomReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
        >
          {posts.map((post) => (
            <PostGridItem key={post.id} post={post} />
          ))}
          {isFetchingNextPage && (
            <div className="col-span-3 flex justify-center py-4">
              <Loader2 className="size-6 animate-spin text-zinc-500" />
            </div>
          )}
        </InfiniteScrollContainer>
      ) : isReelsView ? (
        <InfiniteScrollContainer
          className="grid grid-cols-3 gap-0.5 w-full bg-instagram-lightBorder dark:bg-instagram-darkBorder"
          onBottomReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
        >
          {posts.map((post) => (
            <ReelsGridItem key={post.id} post={post} />
          ))}
          {isFetchingNextPage && (
            <div className="col-span-3 flex justify-center py-4">
              <Loader2 className="size-6 animate-spin text-zinc-500" />
            </div>
          )}
        </InfiniteScrollContainer>
      ) : (
        <InfiniteScrollContainer
          className="space-y-0 divide-y divide-border/20"
          onBottomReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
        >
          {posts.map((post) => (
            <Post key={post.id} post={post} />
          ))}
          {isFetchingNextPage && <Loader2 className="mx-auto my-3 animate-spin text-primary" />}
        </InfiniteScrollContainer>
      )}
    </div>
  );
}

// 3-Column Square Post Grid Item
const PostGridItem = memo(({ post }: { post: PostData }) => {
  const router = useRouter();
  const attachment = post.attachments?.[0];
  const isVideo = attachment?.mediaType === "VIDEO";

  return (
    <div
      onClick={() => router.push(`/posts/${post.id}`)}
      className="relative aspect-square bg-zinc-900 overflow-hidden cursor-pointer hover:opacity-95 group transition-all"
    >
      {attachment?.url ? (
        isVideo ? (
          <video
            src={attachment.url}
            className="w-full h-full object-cover"
            muted
            playsInline
          />
        ) : (
          <img
            src={attachment.url}
            alt={post.content || ""}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        )
      ) : (
        <div className="p-3 w-full h-full flex items-center justify-center text-[11px] text-zinc-400 overflow-hidden text-ellipsis line-clamp-4 select-text leading-tight bg-zinc-950">
          {post.content}
        </div>
      )}
      {/* Hover Stats overlay */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white text-[14px] font-semibold">
        <span className="flex items-center gap-1">
          <Heart className="size-4 fill-white text-white" />
          {post._count.likes}
        </span>
        <span className="flex items-center gap-1">
          <MessageSquare className="size-4 fill-white text-white" />
          {post._count.comments}
        </span>
      </div>
    </div>
  );
});

PostGridItem.displayName = "PostGridItem";

// 3-Column 9:16 Reels Grid Item
const ReelsGridItem = memo(({ post }: { post: PostData }) => {
  const router = useRouter();
  const attachment = post.attachments?.[0];
  const viewCount = post._count.views;

  const formatViews = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  return (
    <div
      onClick={() => router.push(`/reels/${post.id}`)}
      className="relative aspect-[9/16] bg-zinc-900 overflow-hidden cursor-pointer hover:opacity-95 group transition-all"
    >
      {attachment?.url ? (
        <video
          src={attachment.url}
          className="w-full h-full object-cover"
          muted
          playsInline
        />
      ) : (
        <div className="p-3 w-full h-full flex items-center justify-center text-[11px] text-zinc-400 overflow-hidden text-ellipsis line-clamp-4 select-text leading-tight bg-zinc-950">
          {post.content}
        </div>
      )}
      {/* View count overlay at bottom left */}
      <div className="absolute bottom-2 left-2 flex items-center gap-0.5 text-white text-[12px] font-semibold drop-shadow-md">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-3.5 fill-white">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
        </svg>
        <span>{formatViews(viewCount)}</span>
      </div>
    </div>
  );
});

ReelsGridItem.displayName = "ReelsGridItem";

interface TabsSelectorProps {
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
}

function TabsSelector({ activeTab, onTabChange }: TabsSelectorProps) {
  const tabs: { value: ProfileTab; label: string }[] = [
    { value: "posts", label: "Posts" },
    { value: "reels", label: "Reels" },
    { value: "reposts", label: "Reposts" },
  ];

  return (
    <div className="flex border-b border-instagram-lightBorder dark:border-instagram-darkBorder w-full bg-instagram-lightBg/95 dark:bg-instagram-darkBg/95 backdrop-blur sticky top-[56px] z-20 overflow-x-auto scrollbar-none h-12 select-none px-4 gap-6">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.value;
        return (
          <button
            key={tab.value}
            onClick={() => onTabChange(tab.value)}
            className="flex items-center justify-center transition relative shrink-0 h-full px-2"
            title={tab.label}
          >
            <span className={`text-[15px] font-semibold transition-colors ${
              isActive ? "text-foreground" : "text-zinc-500"
            }`}>
              {tab.label}
            </span>
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-foreground rounded-t" />
            )}
          </button>
        );
      })}
    </div>
  );
}
