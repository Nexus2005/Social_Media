"use client";

import { useState } from "react";
import { useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import kyInstance from "@/lib/ky";
import { PostsPage } from "@/lib/types";
import { useSession } from "@/app/(main)/SessionProvider";
import Post from "@/components/posts/Post";
import PostsLoadingSkeleton from "@/components/posts/PostsLoadingSkeleton";
import InfiniteScrollContainer from "@/components/InfiniteScrollContainer";
import { Loader2 } from "lucide-react";
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
        <p className="text-center text-muted-foreground py-12 text-sm">
          No posts found in this category.
        </p>
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
  const tabs: { value: ProfileTab; label: string }[] = [
    { value: "posts", label: "Posts" },
    { value: "reposts", label: "Reposts" },
    { value: "replies", label: "Replies" },
    { value: "media", label: "Media" },
    { value: "reels", label: "Reels" },
    { value: "storefront", label: "Shop" },
    { value: "saved-products", label: "Saved" },
    { value: "likes", label: "Likes" },
  ];

  if (showCollections) {
    tabs.push({ value: "collections", label: "Collections" });
  }

  return (
    <div className="flex border-b border-border/40 w-full bg-background/95 backdrop-blur sticky top-11 sm:top-0 z-20 overflow-x-auto scrollbar-none">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.value;
        return (
          <button
            key={tab.value}
            onClick={() => onTabChange(tab.value)}
            className="flex-1 min-w-[70px] sm:min-w-0 py-3.5 text-center font-semibold text-xs sm:text-sm transition relative hover:bg-muted/30 shrink-0"
          >
            <span className={isActive ? "text-foreground font-bold" : "text-muted-foreground font-medium"}>
              {tab.label}
            </span>
            {isActive && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 sm:w-16 h-[3px] bg-primary rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}
