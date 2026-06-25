"use client";

import { useState, memo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import kyInstance from "@/lib/ky";
import { PostsPage, PostData } from "@/lib/types";
import { useSession } from "@/app/(main)/SessionProvider";
import Post from "@/components/posts/Post";
import PostsLoadingSkeleton from "@/components/posts/PostsLoadingSkeleton";
import InfiniteScrollContainer from "@/components/InfiniteScrollContainer";
import { ArrowLeft, Folder, Plus, Heart, MessageSquare, Loader2, Bookmark, MessageCircle, ChevronLeft } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";

type ActivityTab = "collections" | "saved" | "likes" | "replies";

interface CollectionItem {
  id: string;
  name: string;
  items: { postId: string }[];
  createdAt: string;
}

export default function ActivityPage() {
  const router = useRouter();
  const { user: loggedInUser } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<ActivityTab>("collections");
  const [selectedCollection, setSelectedCollection] = useState<CollectionItem | null>(null);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Fetch collections
  const { data: collections = [], isLoading: isLoadingCollections } = useQuery<CollectionItem[]>({
    queryKey: ["saved-collections"],
    queryFn: () => kyInstance.get("/api/saved-collections").json<CollectionItem[]>(),
    enabled: activeTab === "collections",
  });

  // Create new collection mutation
  const createCollectionMutation = useMutation({
    mutationFn: (name: string) =>
      kyInstance.post("/api/saved-collections", { json: { name } }).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-collections"] });
      setNewCollectionName("");
      setShowCreateForm(false);
      toast({ description: "Collection created successfully." });
    },
    onError: (err) => {
      console.error(err);
      toast({ variant: "destructive", description: "Failed to create collection." });
    },
  });

  const handleCreateCollectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionName.trim() || createCollectionMutation.isPending) return;
    createCollectionMutation.mutate(newCollectionName.trim());
  };

  return (
    <div className="w-full max-w-[600px] mx-auto min-h-screen bg-background text-foreground border-x border-border pb-12 select-none">
      {/* Page Header */}
      <header className="sticky top-0 z-30 flex items-center h-14 px-4 bg-background/80 backdrop-blur-md border-b border-border select-none">
        <button
          onClick={() => {
            if (selectedCollection) {
              setSelectedCollection(null);
            } else {
              router.push("/settings");
            }
          }}
          className="p-2 hover:bg-secondary/60 rounded-full text-foreground/80 transition-colors"
          title="Back"
        >
          <ArrowLeft className="size-5.5" strokeWidth={2} />
        </button>
        <h1 className="text-[19px] font-bold ml-2 select-text">
          {selectedCollection ? selectedCollection.name : "Your Activity"}
        </h1>
      </header>

      {/* Text Tabs (no icons) */}
      {!selectedCollection && (
        <div className="flex border-b border-border w-full bg-background sticky top-14 z-20 h-11 items-center justify-around text-sm font-semibold select-none">
          <button
            onClick={() => setActiveTab("collections")}
            className={`flex-1 text-center h-full flex items-center justify-center relative transition-colors ${
              activeTab === "collections" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Collections</span>
            {activeTab === "collections" && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground animate-in fade-in duration-100" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("saved")}
            className={`flex-1 text-center h-full flex items-center justify-center relative transition-colors ${
              activeTab === "saved" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Saved Media</span>
            {activeTab === "saved" && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground animate-in fade-in duration-100" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("likes")}
            className={`flex-1 text-center h-full flex items-center justify-center relative transition-colors ${
              activeTab === "likes" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Likes</span>
            {activeTab === "likes" && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground animate-in fade-in duration-100" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("replies")}
            className={`flex-1 text-center h-full flex items-center justify-center relative transition-colors ${
              activeTab === "replies" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Replies</span>
            {activeTab === "replies" && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground animate-in fade-in duration-100" />
            )}
          </button>
        </div>
      )}

      {/* Main View Area */}
      <div className="p-4">
        {selectedCollection ? (
          <CollectionPostsView
            userId={loggedInUser?.id || ""}
            collectionId={selectedCollection.id}
            onBack={() => setSelectedCollection(null)}
          />
        ) : activeTab === "collections" ? (
          <div className="space-y-4">
            {/* Create Collection Header */}
            <div className="flex justify-between items-center select-none pt-2">
              <span className="text-[13px] uppercase font-bold text-muted-foreground tracking-wider">My Folders</span>
              {!showCreateForm && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="flex items-center gap-1 text-xs text-sky-500 hover:text-sky-400 font-semibold transition-colors"
                >
                  <Plus className="size-4" />
                  <span>Create Collection</span>
                </button>
              )}
            </div>

            {/* Create Collection Form */}
            {showCreateForm && (
              <form onSubmit={handleCreateCollectionSubmit} className="bg-card border border-border p-3 rounded-xl flex items-center gap-2.5">
                <input
                  type="text"
                  placeholder="New collection name..."
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground outline-none focus:border-muted-foreground transition-colors"
                  autoFocus
                />
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewCollectionName("");
                    }}
                    className="px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground font-semibold"
                  >
                    Cancel
                  </button>
                  <Button
                    type="submit"
                    disabled={createCollectionMutation.isPending || !newCollectionName.trim()}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold h-auto"
                    size="sm"
                  >
                    {createCollectionMutation.isPending ? "Creating..." : "Create"}
                  </Button>
                </div>
              </form>
            )}

            {/* Folders List Grid */}
            {isLoadingCollections ? (
              <div className="flex justify-center py-12">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : collections.length === 0 ? (
              <div className="text-center py-16 px-4 flex flex-col items-center">
                <Folder className="size-12 text-muted-foreground/60 mb-3" strokeWidth={1.5} />
                <h3 className="text-[15px] font-bold text-foreground mb-1">No Collections</h3>
                <p className="text-[13px] text-muted-foreground max-w-[260px]">Create folders to keep posts and media saved for later.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3.5">
                {collections.map((coll) => (
                  <div
                    key={coll.id}
                    onClick={() => setSelectedCollection(coll)}
                    className="bg-card border border-border p-4 rounded-2xl cursor-pointer hover:border-muted-foreground hover:bg-secondary/10 transition-all flex flex-col justify-between aspect-[1.3] group relative overflow-hidden select-none"
                  >
                    <Folder className="size-7.5 text-muted-foreground group-hover:scale-105 transition-transform" strokeWidth={1.75} />
                    <div className="mt-4">
                      <h4 className="font-bold text-sm text-foreground group-hover:text-foreground leading-tight truncate">{coll.name}</h4>
                      <p className="text-[11.5px] text-muted-foreground mt-1">{coll.items.length} items</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === "saved" ? (
          <SavedMediaView />
        ) : activeTab === "likes" ? (
          <LikesView userId={loggedInUser?.id || ""} />
        ) : (
          <RepliesView userId={loggedInUser?.id || ""} />
        )}
      </div>
    </div>
  );
}

// --- SAVED MEDIA (BOOKMARKS) SUB-VIEW ---
function SavedMediaView() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey: ["post-feed", "bookmarks"],
    queryFn: ({ pageParam }) =>
      kyInstance
        .get(
          "/api/posts/bookmarked",
          pageParam ? { searchParams: { cursor: pageParam } } : {},
        )
        .json<PostsPage>(),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const posts = data?.pages.flatMap((page) => page.posts) || [];

  if (status === "pending") {
    return <PostsLoadingSkeleton />;
  }

  if (status === "success" && !posts.length && !hasNextPage) {
    return (
      <div className="text-center py-16 px-4 flex flex-col items-center">
        <Bookmark className="size-12 text-muted-foreground/60 mb-3" strokeWidth={1.5} />
        <h3 className="text-[15px] font-bold text-foreground mb-1">No Saved Media</h3>
        <p className="text-[13px] text-muted-foreground max-w-[260px]">Saved photos and videos will appear here.</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <p className="text-center text-xs text-destructive py-8">
        An error occurred while loading saved media.
      </p>
    );
  }

  return (
    <InfiniteScrollContainer
      className="space-y-3.5"
      onBottomReached={() => hasNextPage && !isFetching && fetchNextPage()}
    >
      {posts.map((post) => (
        <Post key={post.id} post={post} />
      ))}
      {isFetchingNextPage && <Loader2 className="mx-auto my-3 animate-spin text-muted-foreground" />}
    </InfiniteScrollContainer>
  );
}

// --- LIKES (LIKED POSTS) SUB-VIEW ---
function LikesView({ userId }: { userId: string }) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey: ["post-feed", "user-posts", userId, "likes"],
    queryFn: ({ pageParam }) =>
      kyInstance
        .get(
          `/api/users/${userId}/posts`,
          {
            searchParams: {
              ...(pageParam ? { cursor: pageParam } : {}),
              tab: "likes",
            },
          }
        )
        .json<PostsPage>(),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const posts = data?.pages.flatMap((page) => page.posts) || [];

  if (status === "pending") {
    return <PostsLoadingSkeleton />;
  }

  if (status === "success" && !posts.length && !hasNextPage) {
    return (
      <div className="text-center py-16 px-4 flex flex-col items-center">
        <Heart className="size-12 text-muted-foreground/60 mb-3" strokeWidth={1.5} />
        <h3 className="text-[15px] font-bold text-foreground mb-1">No Liked Content</h3>
        <p className="text-[13px] text-muted-foreground max-w-[260px]">Posts and reels you like will show up here.</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <p className="text-center text-xs text-destructive py-8">
        An error occurred while loading liked content.
      </p>
    );
  }

  return (
    <InfiniteScrollContainer
      className="space-y-3.5"
      onBottomReached={() => hasNextPage && !isFetching && fetchNextPage()}
    >
      {posts.map((post) => (
        <Post key={post.id} post={post} />
      ))}
      {isFetchingNextPage && <Loader2 className="mx-auto my-3 animate-spin text-muted-foreground" />}
    </InfiniteScrollContainer>
  );
}

// --- REPLIES (COMMENTED POSTS) SUB-VIEW ---
function RepliesView({ userId }: { userId: string }) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey: ["post-feed", "user-posts", userId, "replies"],
    queryFn: ({ pageParam }) =>
      kyInstance
        .get(
          `/api/users/${userId}/posts`,
          {
            searchParams: {
              ...(pageParam ? { cursor: pageParam } : {}),
              tab: "replies",
            },
          }
        )
        .json<PostsPage>(),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const posts = data?.pages.flatMap((page) => page.posts) || [];

  if (status === "pending") {
    return <PostsLoadingSkeleton />;
  }

  if (status === "success" && !posts.length && !hasNextPage) {
    return (
      <div className="text-center py-16 px-4 flex flex-col items-center">
        <MessageCircle className="size-12 text-muted-foreground/60 mb-3" strokeWidth={1.5} />
        <h3 className="text-[15px] font-bold text-foreground mb-1">No Replies</h3>
        <p className="text-[13px] text-muted-foreground max-w-[260px]">Posts you commented on will show up here.</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <p className="text-center text-xs text-destructive py-8">
        An error occurred while loading replies.
      </p>
    );
  }

  return (
    <InfiniteScrollContainer
      className="space-y-3.5"
      onBottomReached={() => hasNextPage && !isFetching && fetchNextPage()}
    >
      {posts.map((post) => (
        <Post key={post.id} post={post} />
      ))}
      {isFetchingNextPage && <Loader2 className="mx-auto my-3 animate-spin text-muted-foreground" />}
    </InfiniteScrollContainer>
  );
}

// --- FOLDER SPECIFIC POSTS GRID SUB-VIEW ---
function CollectionPostsView({
  userId,
  collectionId,
  onBack,
}: {
  userId: string;
  collectionId: string;
  onBack: () => void;
}) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey: ["post-feed", "user-posts", userId, "collections", collectionId],
    queryFn: ({ pageParam }) =>
      kyInstance
        .get(
          `/api/users/${userId}/posts`,
          {
            searchParams: {
              ...(pageParam ? { cursor: pageParam } : {}),
              tab: "collections",
              collectionId,
            },
          }
        )
        .json<PostsPage>(),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const posts = data?.pages.flatMap((page) => page.posts) || [];

  if (status === "pending") {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status === "success" && !posts.length && !hasNextPage) {
    return (
      <div className="text-center py-16 px-4 flex flex-col items-center">
        <Bookmark className="size-10 text-muted-foreground/60 mb-3" strokeWidth={1.5} />
        <h4 className="text-sm font-bold text-foreground mb-1">No items in this collection</h4>
        <p className="text-xs text-muted-foreground max-w-[240px] mt-1">Bookmark posts and select this collection to see them here.</p>
        <button
          onClick={onBack}
          className="mt-5 text-xs text-muted-foreground hover:text-foreground font-semibold flex items-center gap-1 hover:underline"
        >
          <ChevronLeft className="size-4" />
          <span>Back to Collections</span>
        </button>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="text-center py-8">
        <p className="text-xs text-destructive">An error occurred while loading collection items.</p>
        <button onClick={onBack} className="mt-3 text-xs text-muted-foreground hover:underline">Back</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between select-none">
        <button
          onClick={onBack}
          className="text-xs text-muted-foreground hover:text-foreground font-semibold flex items-center gap-0.5 hover:underline"
        >
          <ChevronLeft className="size-4" />
          <span>Back to Collections</span>
        </button>
        <span className="text-[11.5px] text-muted-foreground font-medium">{posts.length} items</span>
      </div>

      <InfiniteScrollContainer
        className="grid grid-cols-3 gap-0.5 w-full bg-border"
        onBottomReached={() => hasNextPage && !isFetching && fetchNextPage()}
      >
        {posts.map((post) => (
          <PostGridItem key={post.id} post={post} />
        ))}
        {isFetchingNextPage && (
          <div className="col-span-3 flex justify-center py-4">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </InfiniteScrollContainer>
    </div>
  );
}

// 3-Column Square Post Grid Item Helper
const PostGridItem = memo(({ post }: { post: PostData }) => {
  const router = useRouter();
  const attachment = post.attachments?.[0];
  const isVideo = attachment?.mediaType === "VIDEO";

  return (
    <div
      onClick={() => router.push(`/posts/${post.id}`)}
      className="relative aspect-square bg-card overflow-hidden cursor-pointer hover:opacity-95 group transition-all"
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
        <div className="p-3 w-full h-full flex items-center justify-center text-[10px] text-muted-foreground overflow-hidden text-ellipsis line-clamp-4 select-text leading-tight bg-card">
          {post.content}
        </div>
      )}
      {/* Hover Stats overlay */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white text-[13px] font-semibold">
        <span className="flex items-center gap-1">
          <Heart className="size-3.5 fill-white text-white" />
          {post._count?.likes || 0}
        </span>
        <span className="flex items-center gap-1">
          <MessageSquare className="size-3.5 fill-white text-white" />
          {post._count?.comments || 0}
        </span>
      </div>
    </div>
  );
});

PostGridItem.displayName = "PostGridItem";
