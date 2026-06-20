"use client";

import InfiniteScrollContainer from "@/components/InfiniteScrollContainer";
import Post from "@/components/posts/Post";
import PostsLoadingSkeleton from "@/components/posts/PostsLoadingSkeleton";
import kyInstance from "@/lib/ky";
import { PostsPage } from "@/lib/types";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

interface UserPostsProps {
  userId: string;
}

export default function UserPosts({ userId }: UserPostsProps) {
  const [activeTab, setActiveTab] = useState<"posts" | "reels">("posts");

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey: ["post-feed", "user-posts", userId],
    queryFn: ({ pageParam }) =>
      kyInstance
        .get(
          `/api/users/${userId}/posts`,
          pageParam ? { searchParams: { cursor: pageParam } } : {},
        )
        .json<PostsPage>(),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const posts = data?.pages.flatMap((page) => page.posts) || [];

  // Programmatic classification filter logic
  const filteredPosts = posts.filter((post) => {
    const isReel = post.attachments.some((att) => {
      if (att.mediaType !== "VIDEO") return false;
      // Flagged explicitly as vertical video (height > width)
      if (att.width !== null && att.height !== null) {
        return att.height > att.width;
      }
      // Fallback if dimensions are unavailable: treat as Reel/Spot
      return true;
    });

    return activeTab === "reels" ? isReel : !isReel;
  });

  // Prefetch next page if filtering results in an empty visible set but more posts exist
  useEffect(() => {
    if (hasNextPage && !isFetching && filteredPosts.length === 0 && posts.length > 0) {
      fetchNextPage();
    }
  }, [filteredPosts.length, hasNextPage, isFetching, fetchNextPage, posts.length]);

  if (status === "pending") {
    return (
      <div className="space-y-5">
        <TabsSelector activeTab={activeTab} onTabChange={setActiveTab} />
        <PostsLoadingSkeleton />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="space-y-5">
        <TabsSelector activeTab={activeTab} onTabChange={setActiveTab} />
        <p className="text-center text-destructive py-8">
          An error occurred while loading posts.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      <TabsSelector activeTab={activeTab} onTabChange={setActiveTab} />

      {!filteredPosts.length && !hasNextPage ? (
        <p className="text-center text-muted-foreground py-12 text-sm">
          {activeTab === "reels"
            ? "No Reels found."
            : "No posts found."}
        </p>
      ) : (
        <InfiniteScrollContainer
          className="space-y-0 divide-y divide-border/30"
          onBottomReached={() => hasNextPage && !isFetching && fetchNextPage()}
        >
          {filteredPosts.map((post) => (
            <Post key={post.id} post={post} />
          ))}
          {isFetchingNextPage && <Loader2 className="mx-auto my-3 animate-spin text-primary" />}
        </InfiniteScrollContainer>
      )}
    </div>
  );
}

interface TabsSelectorProps {
  activeTab: "posts" | "reels";
  onTabChange: (tab: "posts" | "reels") => void;
}

function TabsSelector({ activeTab, onTabChange }: TabsSelectorProps) {
  return (
    <div className="flex border-b border-border/40 w-full bg-background/95 backdrop-blur sticky top-11 sm:top-0 z-20">
      <button
        onClick={() => onTabChange("posts")}
        className="flex-1 py-3.5 text-center font-semibold text-sm transition relative hover:bg-muted/30"
      >
        <span className={activeTab === "posts" ? "text-foreground font-bold" : "text-muted-foreground font-medium"}>
          Posts
        </span>
        {activeTab === "posts" && (
          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-[3px] bg-primary rounded-full" />
        )}
      </button>
      <button
        onClick={() => onTabChange("reels")}
        className="flex-1 py-3.5 text-center font-semibold text-sm transition relative hover:bg-muted/30"
      >
        <span className={activeTab === "reels" ? "text-foreground font-bold" : "text-muted-foreground font-medium"}>
          Reels
        </span>
        {activeTab === "reels" && (
          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-[3px] bg-primary rounded-full" />
        )}
      </button>
    </div>
  );
}
