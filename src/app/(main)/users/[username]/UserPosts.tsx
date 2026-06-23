"use client";

import { useState } from "react";
import { useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import kyInstance from "@/lib/ky";
import { PostsPage } from "@/lib/types";
import { useSession } from "@/app/(main)/SessionProvider";
import Post from "@/components/posts/Post";
import PostsLoadingSkeleton from "@/components/posts/PostsLoadingSkeleton";
import InfiniteScrollContainer from "@/components/InfiniteScrollContainer";
import { Loader2, Grid, Repeat2, MessageSquare, Image as ImageIcon, Film, ShoppingBag, Bookmark, Heart, FolderOpen } from "lucide-react";
import SavedProductsGrid from "@/components/profile/SavedProductsGrid";
import StorefrontGrid from "@/components/profile/StorefrontGrid";
import CreatorCommerceStudio from "@/components/creator/CreatorCommerceStudio";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface UserPostsProps {
  userId: string;
}

type ProfileTab = "posts" | "reposts" | "replies" | "media" | "reels" | "likes" | "collections" | "saved-products" | "storefront";

export default function UserPosts({ userId }: UserPostsProps) {
  const { user: loggedInUser } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const activeTab = (searchParams.get("tab") as ProfileTab) || "posts";

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
  const isPostTab = activeTab !== "storefront" && activeTab !== "saved-products";

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
    enabled: isPostTab,
  });

  const posts = data?.pages.flatMap((page) => page.posts) || [];

  if (isPostTab && status === "pending") {
    return (
      <div className="space-y-5">
        <TabsSelector activeTab={activeTab} onTabChange={handleTabChange} showCollections={isOwner} />
        <PostsLoadingSkeleton />
      </div>
    );
  }

  if (isPostTab && status === "error") {
    return (
      <div className="space-y-5">
        <TabsSelector activeTab={activeTab} onTabChange={handleTabChange} showCollections={isOwner} />
        <p className="text-center text-destructive py-8">
          An error occurred while loading posts.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      <TabsSelector activeTab={activeTab} onTabChange={handleTabChange} showCollections={isOwner} />

      {activeTab === "storefront" ? (
        <StorefrontGrid userId={userId} isOwner={isOwner} />
      ) : activeTab === "saved-products" ? (
        <SavedProductsGrid userId={userId} />
      ) : !posts.length && !hasNextPage ? (
        <div className="flex flex-col items-center justify-center py-16 text-center select-none">
          {activeTab === "reels" ? (
            <>
              <Film className="size-12 text-zinc-700 mb-3" strokeWidth={1.5} />
              <h3 className="text-[16px] font-bold text-white mb-1">No Reels</h3>
              <p className="text-[14px] text-zinc-500 max-w-[280px]">Videos shared by this user will appear here.</p>
            </>
          ) : activeTab === "media" ? (
            <>
              <ImageIcon className="size-12 text-zinc-700 mb-3" strokeWidth={1.5} />
              <h3 className="text-[16px] font-bold text-white mb-1">No Media</h3>
              <p className="text-[14px] text-zinc-500 max-w-[280px]">Photos and videos shared by this user will appear here.</p>
            </>
          ) : activeTab === "likes" ? (
            <>
              <Heart className="size-12 text-zinc-700 mb-3" strokeWidth={1.5} />
              <h3 className="text-[16px] font-bold text-white mb-1">No Liked Posts</h3>
              <p className="text-[14px] text-zinc-500 max-w-[280px]">Liked posts will show up here.</p>
            </>
          ) : activeTab === "reposts" ? (
            <>
              <Repeat2 className="size-12 text-zinc-700 mb-3" strokeWidth={1.5} />
              <h3 className="text-[16px] font-bold text-white mb-1">No Reposts</h3>
              <p className="text-[14px] text-zinc-500 max-w-[280px]">Reposted content will show up here.</p>
            </>
          ) : activeTab === "replies" ? (
            <>
              <MessageSquare className="size-12 text-zinc-700 mb-3" strokeWidth={1.5} />
              <h3 className="text-[16px] font-bold text-white mb-1">No Replies</h3>
              <p className="text-[14px] text-zinc-500 max-w-[280px]">Comments and replies will show up here.</p>
            </>
          ) : (
            <>
              <Grid className="size-12 text-zinc-700 mb-3" strokeWidth={1.5} />
              <h3 className="text-[16px] font-bold text-white mb-1">No Posts Yet</h3>
              <p className="text-[14px] text-zinc-500 max-w-[280px]">When this user posts, they will show up here.</p>
            </>
          )}
        </div>
      ) : (
        <InfiniteScrollContainer
          className="space-y-0 divide-y divide-border/30"
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

interface TabsSelectorProps {
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
  showCollections: boolean;
}

function TabsSelector({ activeTab, onTabChange, showCollections }: TabsSelectorProps) {
  const tabs: { value: ProfileTab; icon: any; label: string }[] = [
    { value: "posts", icon: Grid, label: "Posts" },
    { value: "reposts", icon: Repeat2, label: "Reposts" },
    { value: "replies", icon: MessageSquare, label: "Replies" },
    { value: "media", icon: ImageIcon, label: "Media" },
    { value: "reels", icon: Film, label: "Reels" },
    { value: "storefront", icon: ShoppingBag, label: "Shop" },
    { value: "saved-products", icon: Bookmark, label: "Saved" },
    { value: "likes", icon: Heart, label: "Likes" },
  ];

  if (showCollections) {
    tabs.push({ value: "collections", icon: FolderOpen, label: "Collections" });
  }

  return (
    <div className="flex border-b border-[#1A1A1A] w-full bg-black/95 backdrop-blur sticky top-[56px] sm:top-0 z-20 overflow-x-auto scrollbar-none h-12">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.value;
        const Icon = tab.icon;
        return (
          <button
            key={tab.value}
            onClick={() => onTabChange(tab.value)}
            className="flex-1 min-w-[50px] sm:min-w-0 flex items-center justify-center transition relative hover:bg-zinc-900/30 shrink-0 h-full"
            title={tab.label}
          >
            <Icon
              className="size-[26px] transition-colors"
              stroke={isActive ? "white" : "#71717A"}
              strokeWidth={1.75}
            />
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-white" />
            )}
          </button>
        );
      })}
    </div>
  );
}
