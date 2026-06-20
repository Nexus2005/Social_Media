"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "@/app/(main)/SessionProvider";
import kyInstance from "@/lib/ky";
import { PostsPage } from "@/lib/types";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Search, Loader2, Play, Heart, MessageCircle, VolumeX, X, Radio, ArrowLeft, ArrowUp, ArrowDown } from "lucide-react";
import Link from "next/link";
import UserAvatar from "@/components/UserAvatar";
import FollowButton from "@/components/FollowButton";
import InfiniteScrollContainer from "@/components/InfiniteScrollContainer";
import Post from "@/components/posts/Post";

// Staggered grid media item component playing video silently on viewport intersect
interface ExploreGridItemProps {
  post: any;
  isSpot: boolean;
  onClick: () => void;
}

function ExploreGridItem({ post, isSpot, onClick }: ExploreGridItemProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const media = post.attachments?.[0];
  const isVideo = media?.mediaType === "VIDEO" || isSpot;
  const mediaUrl = media?.url || "/placeholder-image.jpg";

  // Intersection observer for video autoplay
  useEffect(() => {
    if (!isVideo || !videoRef.current) return;
    const video = videoRef.current;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, [isVideo]);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative cursor-pointer overflow-hidden bg-zinc-950 group ${
        isSpot ? "col-span-1 row-span-2 aspect-[9/16]" : "aspect-square"
      }`}
    >
      {isVideo ? (
        <div className="w-full h-full relative">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            ref={videoRef}
            src={mediaUrl}
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white pointer-events-none">
            <VolumeX className="size-3" />
          </div>
          {isSpot && (
            <div className="absolute bottom-2 left-2 flex items-center gap-1 text-[10px] font-bold text-white bg-black/50 px-2 py-0.5 rounded backdrop-blur-sm pointer-events-none">
              <Play className="size-3 fill-white" /> Spot
            </div>
          )}
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={mediaUrl}
          alt="Explore post"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      )}

      {/* Quantitative Metric Analytics Overlay */}
      <div
        className={`absolute inset-0 bg-black/55 backdrop-blur-[1px] flex items-center justify-center gap-4 text-white font-bold transition-opacity duration-200 z-10 ${
          isHovered ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex items-center gap-1.5">
          <Heart className="size-4 fill-white text-white" />
          <span className="text-sm">{post._count?.likes || post.likes?.length || 0}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MessageCircle className="size-4 fill-white text-white" />
          <span className="text-sm">{post._count?.comments || post.comments?.length || 0}</span>
        </div>
      </div>
    </div>
  );
}

// Main Search Page Client Component
interface SearchPageClientProps {
  initialQuery?: string;
}

export default function SearchPageClient({ initialQuery = "" }: SearchPageClientProps) {
  const { user: sessionUser } = useSession();
  
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [committedQuery, setCommittedQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState(initialQuery ? "top" : "For You");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showRecentDropdown, setShowRecentDropdown] = useState(false);
  const [immersivePostIndex, setImmersivePostIndex] = useState<number | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const categories = ["For You", "Trending", "News", "Sports", "Entertainment", "IG TV / Live", "Shop", "Travel", "Style", "Food"];
  const filters = ["Top", "Latest", "People", "Posts", "Photos", "Videos", "Hashtags"];

  // Load recent searches
  useEffect(() => {
    const saved = localStorage.getItem("recent_searches");
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Save recent search
  const saveSearch = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    
    setRecentSearches((prev) => {
      const filtered = prev.filter((item) => item !== trimmed);
      const updated = [trimmed, ...filtered].slice(0, 10);
      localStorage.setItem("recent_searches", JSON.stringify(updated));
      return updated;
    });
  };

  // Clear specific recent search
  const removeRecentSearch = (e: React.MouseEvent, query: string) => {
    e.stopPropagation();
    setRecentSearches((prev) => {
      const updated = prev.filter((item) => item !== query);
      localStorage.setItem("recent_searches", JSON.stringify(updated));
      return updated;
    });
  };

  // Clear all recent searches
  const clearAllRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem("recent_searches");
  };

  // Handle search submission
  const handleSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    
    setCommittedQuery(searchQuery);
    saveSearch(searchQuery);
    setShowRecentDropdown(false);
    inputRef.current?.blur();
    
    // Automatically match appropriate filter tabs
    if (searchQuery.startsWith("@")) {
      setActiveTab("People");
    } else if (searchQuery.startsWith("#")) {
      setActiveTab("Hashtags");
    } else {
      setActiveTab("Top");
    }
  };

  // Query suggestions for Who to Follow widget
  const { data: suggestions = [] } = useQuery<any[]>({
    queryKey: ["users-suggestions"],
    queryFn: () => kyInstance.get("/api/users/suggestions").json<any[]>(),
    enabled: activeTab === "For You" || activeTab === "Trending",
  });

  // Query suggestions dynamically while typing
  const { data: autocompleteData } = useQuery<any>({
    queryKey: ["search-autocomplete", searchQuery],
    queryFn: () =>
      kyInstance
        .get("/api/search/autocomplete", {
          searchParams: { q: searchQuery },
        })
        .json<any>(),
    enabled: !!searchQuery.trim() && showRecentDropdown,
  });

  const autocompleteUsers = autocompleteData?.users || [];

  // Query dynamic trending hashtags from database activity
  const { data: trendingHashtags = [] } = useQuery<any[]>({
    queryKey: ["trending-hashtags"],
    queryFn: () => kyInstance.get("/api/trending").json<any[]>(),
    enabled: activeTab === "For You" || activeTab === "Trending" || !committedQuery,
  });

  // Query accounts directly if active tab is People
  const isAccountTab = activeTab === "People" || committedQuery.startsWith("@");
  
  const { data: accountsData, isLoading: accountsLoading } = useQuery<any>({
    queryKey: ["search-accounts", committedQuery],
    queryFn: () =>
      kyInstance
        .get("/api/search", {
          searchParams: {
            q: committedQuery.startsWith("@") ? committedQuery.slice(1) : committedQuery,
            type: "accounts",
          },
        })
        .json<any>(),
    enabled: !!committedQuery && isAccountTab,
  });

  // Infinite query for posts and media explore grid
  const searchTypeMap: Record<string, string> = {
    "Top": "top",
    "Latest": "latest",
    "People": "accounts",
    "Posts": "latest",
    "Photos": "photos",
    "Videos": "videos",
    "Hashtags": "latest",
  };

  const getQueryType = () => {
    if (!committedQuery) return "explore"; // Discovery Explore mode
    return searchTypeMap[activeTab] || "top";
  };

  const currentQueryKey = ["search-results", committedQuery, activeTab, getQueryType()];

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey: currentQueryKey,
    queryFn: ({ pageParam }) => {
      const type = getQueryType();
      const q = committedQuery.startsWith("#") ? committedQuery : committedQuery;
      
      return kyInstance
        .get("/api/search", {
          searchParams: {
            q,
            type,
            ...(pageParam ? { cursor: pageParam } : {}),
          },
        })
        .json<PostsPage>();
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !isAccountTab,
  });

  const posts = data?.pages.flatMap((page) => page.posts) || [];

  return (
    <div className="w-full min-h-screen bg-black text-white pb-14 md:pb-0 flex flex-col items-center">
      {/* Sticky top search input */}
      <div className="sticky top-0 z-30 w-full bg-black/80 backdrop-blur-md border-b border-zinc-900 px-4 py-3 flex flex-col items-center">
        <form onSubmit={handleSearchSubmit} className="w-full max-w-[600px] relative">
          <div className="bg-zinc-900 border border-transparent focus-within:border-purple-500 focus-within:bg-black rounded-full h-10 px-4 w-full flex items-center gap-3 transition-all">
            <Search className="size-4 text-zinc-500" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search people, tags, or topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowRecentDropdown(true)}
              onBlur={() => setTimeout(() => setShowRecentDropdown(false), 200)}
              className="flex-grow bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setCommittedQuery("");
                  setActiveTab("For You");
                }}
                className="p-1 text-zinc-500 hover:text-white rounded-full bg-zinc-800/40 hover:bg-zinc-800 transition-colors"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Autocomplete / Recent Searches dropdown modal */}
          {showRecentDropdown && (
            <div className="absolute top-12 left-0 right-0 z-40 bg-zinc-950 border border-zinc-900 rounded-2xl shadow-2xl p-4 flex flex-col gap-3 animate-fade-in max-h-[350px] overflow-y-auto">
              {searchQuery.trim() ? (
                // Autocomplete Suggestions (Twitter/X style)
                <>
                  <div className="flex justify-between items-center text-xs font-bold text-zinc-400 border-b border-zinc-900 pb-2">
                    <span>Search Suggestions</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {/* First option: Search literally */}
                    <div
                      onClick={() => {
                        setCommittedQuery(searchQuery);
                        saveSearch(searchQuery);
                        setShowRecentDropdown(false);
                        inputRef.current?.blur();
                      }}
                      className="px-2 py-2 rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer text-sm text-purple-400 font-semibold"
                    >
                      Search for &quot;{searchQuery}&quot;
                    </div>

                    {/* Matched Users list */}
                    {autocompleteUsers.map((acc: any) => (
                      <Link
                        key={acc.id}
                        href={`/users/${acc.username}`}
                        className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-zinc-900 transition-colors text-white"
                      >
                        <UserAvatar avatarUrl={acc.avatarUrl} size={36} />
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs hover:underline">{acc.displayName}</span>
                            {acc.verified && (
                              <span className="size-3.5 rounded-full bg-blue-500 text-[8px] text-white flex items-center justify-center font-bold select-none shrink-0">
                                ✓
                              </span>
                            )}
                            {acc.followsYou && (
                              <span className="text-[8px] bg-zinc-800 text-zinc-400 px-1 rounded">
                                Follows you
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-zinc-500">@{acc.username}</span>
                        </div>
                      </Link>
                    ))}
                    {autocompleteUsers.length === 0 && (
                      <p className="text-xs text-zinc-500 px-2 py-1">No matching profiles found.</p>
                    )}
                  </div>
                </>
              ) : recentSearches.length > 0 ? (
                // Recent Searches (Instagram style)
                <>
                  <div className="flex justify-between items-center text-xs font-bold text-zinc-400">
                    <span>Recent Searches</span>
                    <button type="button" onClick={clearAllRecent} className="text-purple-400 hover:text-purple-300">
                      Clear all
                    </button>
                  </div>
                  <div className="flex flex-col gap-2">
                    {recentSearches.map((item) => (
                      <div
                        key={item}
                        onClick={() => {
                          setSearchQuery(item);
                          setCommittedQuery(item);
                          setShowRecentDropdown(false);
                          setTimeout(() => handleSearchSubmit(), 50);
                        }}
                        className="flex justify-between items-center px-2 py-1.5 rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer text-sm"
                      >
                        <span>{item}</span>
                        <button
                          type="button"
                          onClick={(e) => removeRecentSearch(e, item)}
                          className="p-1 text-zinc-500 hover:text-white rounded-full transition-colors"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          )}
        </form>

        {/* Dynamic Navigation Pill Strips */}
        <div className="w-full max-w-[600px] mt-3 overflow-x-auto scrollbar-none snap-x flex gap-2">
          {committedQuery.length > 0
            ? filters.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-shrink-0 px-4 py-1.5 text-xs font-bold rounded-full border transition-all ${
                    activeTab === tab
                      ? "bg-white text-black border-white"
                      : "bg-transparent text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700"
                  }`}
                >
                  {tab}
                </button>
              ))
            : categories.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-shrink-0 px-4 py-1.5 text-xs font-bold rounded-full border transition-all snap-start ${
                    activeTab === tab
                      ? "bg-white text-black border-white"
                      : "bg-transparent text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700"
                  }`}
                >
                  {tab}
                </button>
              ))}
        </div>
      </div>

      {/* Main content body */}
      <main className="w-full max-w-[600px] mt-4 px-4 flex flex-col md:px-0">
        {committedQuery.length === 0 ? (
          // DEFAULT INITIAL VIEW STATE
          <>
            {/* For You / Trending categories show the top live spaces & text list */}
            {(activeTab === "For You" || activeTab === "Trending") && (
              <div className="flex flex-col w-full animate-fade-in mb-6">
                {/* Hero space banner */}
                <div className="relative w-full aspect-[2/1] rounded-2xl overflow-hidden mb-4 bg-gradient-to-tr from-purple-900 via-zinc-950 to-sky-950 border border-zinc-900 group">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10" />
                  <div className="absolute top-3 left-3 bg-red-600 px-2 py-0.5 rounded text-[9px] font-bold tracking-widest flex items-center gap-1 z-20">
                    <Radio className="size-3 animate-pulse" /> LIVE SPACES
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 z-20">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Trending Category</span>
                    <h3 className="text-lg font-extrabold leading-tight tracking-tight mt-1 mb-1">
                      Building Next.js 15 apps with Prisma & High Fidelity layouts
                    </h3>
                    <p className="text-xs text-zinc-400">1.2K people listening right now</p>
                  </div>
                </div>

                {/* Dynamic trending rows fetched from database */}
                <div className="flex flex-col gap-4">
                  {trendingHashtags.slice(0, 5).map((trend, idx) => (
                    <div key={trend.hashtag} className="flex flex-col w-full">
                      {/* Text Trending row */}
                      <Link
                        href={`/hashtag/${trend.hashtag.replace("#", "")}`}
                        className="flex justify-between items-start hover:bg-zinc-950 p-2 rounded-xl transition-colors cursor-pointer animate-fade-in"
                      >
                        <div className="flex flex-col">
                          <span className="text-[11px] text-zinc-500 font-semibold">Trending · #{idx + 1}</span>
                          <span className="font-bold text-sm text-white mt-0.5">{trend.hashtag}</span>
                          <span className="text-[11px] text-zinc-400 mt-0.5">
                            {trend.totalPosts} {trend.totalPosts === 1 ? "post" : "posts"} · {trend.totalEngagement} engagement
                          </span>
                        </div>
                        <span className="text-zinc-600 text-xs font-bold">···</span>
                      </Link>

                      {/* Inline Who to Follow widgets after index 3 */}
                      {idx === 3 && suggestions.length > 0 && (
                        <div className="my-6 bg-zinc-950 border border-zinc-900 rounded-2xl p-4 flex flex-col gap-3">
                          <span className="text-xs font-extrabold tracking-wide uppercase text-zinc-400">Who to follow</span>
                          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none snap-x">
                            {suggestions.map((suggestedUser) => (
                              <div
                                key={suggestedUser.id}
                                className="flex-shrink-0 w-[180px] bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex flex-col items-center text-center snap-start justify-between"
                              >
                                <Link href={`/users/${suggestedUser.username}`} className="flex flex-col items-center">
                                  <UserAvatar avatarUrl={suggestedUser.avatarUrl} size={50} />
                                  <span className="font-bold text-xs hover:underline mt-2 truncate max-w-[150px]">
                                    {suggestedUser.displayName}
                                  </span>
                                  <span className="text-[10px] text-zinc-500 truncate max-w-[150px]">
                                    @{suggestedUser.username}
                                  </span>
                                </Link>
                                <div className="mt-3 w-full flex justify-center">
                                  <FollowButton
                                    userId={suggestedUser.id}
                                    initialState={{
                                      followers: suggestedUser._count.followers,
                                      isFollowedByUser: suggestedUser.followers.some(
                                        ({ followerId }: any) => followerId === sessionUser.id
                                      ),
                                    }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {trendingHashtags.length === 0 && (
                    <p className="text-center text-zinc-500 py-4 text-xs">No active hashtags found in database.</p>
                  )}
                </div>
              </div>
            )}

            {/* LOWER HALF: Instagram explore staggered grid */}
            <div className="flex flex-col mt-4">
              <div className="flex items-center gap-2 mb-4 px-1">
                <span className="text-xs font-extrabold tracking-wider uppercase text-zinc-400">Explore Discoveries</span>
                <div className="h-px bg-zinc-900 flex-grow" />
              </div>

              {status === "pending" ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="size-6 animate-spin text-zinc-500" />
                </div>
              ) : posts.length === 0 ? (
                <p className="text-center text-zinc-500 py-10">No multimedia posts available.</p>
              ) : (
                <InfiniteScrollContainer
                  className="grid grid-cols-3 gap-0.5 md:gap-1.5"
                  onBottomReached={() => hasNextPage && !isFetching && fetchNextPage()}
                >
                  {posts.map((post, idx) => {
                    // Check if index matches the Spot (vertical Reels) slots pattern loop (every 10th post is Spot)
                    const isSpot = post.attachments?.[0]?.mediaType === "VIDEO" || idx % 10 === 3;
                    return (
                      <ExploreGridItem
                        key={post.id}
                        post={post}
                        isSpot={isSpot}
                        onClick={() => setImmersivePostIndex(idx)}
                      />
                    );
                  })}
                </InfiniteScrollContainer>
              )}
              {isFetchingNextPage && <Loader2 className="mx-auto my-4 animate-spin text-zinc-500" />}
            </div>
          </>
        ) : (
          // ACTIVE QUERY FILTERED VIEW STATE
          <div className="flex flex-col w-full animate-fade-in">
            {isAccountTab ? (
              // ACCOUNTS TAB RESULTS
              <div className="flex flex-col gap-4">
                {accountsLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="size-6 animate-spin text-zinc-500" />
                  </div>
                ) : !accountsData?.users?.length ? (
                  <p className="text-center text-zinc-500 py-10">No profiles found for &quot;{committedQuery}&quot;</p>
                ) : (
                  accountsData.users.map((acc: any) => (
                    <div key={acc.id} className="flex justify-between items-center gap-4 hover:bg-zinc-950 p-2.5 rounded-xl transition-colors">
                      <Link href={`/users/${acc.username}`} className="flex items-center gap-3">
                        <UserAvatar avatarUrl={acc.avatarUrl} size={48} />
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm hover:underline">{acc.displayName}</span>
                            {/* Verified check badge if popular */}
                            {(acc.followers?.length > 0 || acc.username === "Omkar") && (
                              <span className="size-4 rounded-full bg-blue-500 text-[10px] text-white flex items-center justify-center font-bold select-none">
                                ✓
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-zinc-500">@{acc.username}</span>
                          {acc.bio && <span className="text-xs text-zinc-400 mt-1 line-clamp-1 max-w-[320px]">{acc.bio}</span>}
                          <span className="text-[10px] text-zinc-500 mt-0.5">{acc.followers?.length || 0} followers</span>
                        </div>
                      </Link>
                      <FollowButton
                        userId={acc.id}
                        initialState={{
                          followers: acc.followers?.length || 0,
                          isFollowedByUser: acc.followers?.some((f: any) => f.followerId === sessionUser.id),
                        }}
                      />
                    </div>
                  ))
                )}
              </div>
            ) : activeTab === "Hashtags" ? (
              // HASHTAGS AGGREGATION VIEW STATE
              <div className="flex flex-col gap-4">
                {status === "pending" ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="size-6 animate-spin text-zinc-500" />
                  </div>
                ) : posts.length === 0 ? (
                  <p className="text-center text-zinc-500 py-10">No hashtag feeds matching &quot;{committedQuery}&quot;</p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {/* Hashtag volume card */}
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-lg font-black text-white">#{committedQuery.replace("#", "")}</span>
                        <span className="text-xs text-zinc-400 mt-1">{posts.length}+ active posts</span>
                      </div>
                      <span className="text-xs font-semibold text-purple-400">Tag aggregate</span>
                    </div>

                    <div className="flex flex-col gap-4">
                      {posts.map((post) => (
                        <Post key={post.id} post={post} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : activeTab === "Photos" || activeTab === "Videos" ? (
              // PHOTOS AND VIDEOS GRID RESULTS
              <div className="flex flex-col">
                {status === "pending" ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="size-6 animate-spin text-zinc-500" />
                  </div>
                ) : posts.length === 0 ? (
                  <p className="text-center text-zinc-500 py-10">No matches found.</p>
                ) : (
                  <InfiniteScrollContainer
                    className="grid grid-cols-3 gap-0.5 md:gap-1.5"
                    onBottomReached={() => hasNextPage && !isFetching && fetchNextPage()}
                  >
                    {posts.map((post, idx) => (
                      <ExploreGridItem
                        key={post.id}
                        post={post}
                        isSpot={false}
                        onClick={() => setImmersivePostIndex(idx)}
                      />
                    ))}
                  </InfiniteScrollContainer>
                )}
                {isFetchingNextPage && <Loader2 className="mx-auto my-4 animate-spin text-zinc-500" />}
              </div>
            ) : (
              // TOP / LATEST POST FEEDS
              <div className="flex flex-col gap-4">
                {status === "pending" ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="size-6 animate-spin text-zinc-500" />
                  </div>
                ) : posts.length === 0 ? (
                  <p className="text-center text-zinc-500 py-10">No search results matching &quot;{committedQuery}&quot;</p>
                ) : (
                  <InfiniteScrollContainer
                    className="flex flex-col gap-4"
                    onBottomReached={() => hasNextPage && !isFetching && fetchNextPage()}
                  >
                    {posts.map((post) => (
                      <Post key={post.id} post={post} />
                    ))}
                  </InfiniteScrollContainer>
                )}
                {isFetchingNextPage && <Loader2 className="mx-auto my-4 animate-spin text-zinc-500" />}
              </div>
            )}
          </div>
        )}
      </main>

      {/* FULL IMMERSIVE POPUP explore stream view */}
      {immersivePostIndex !== null && posts.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm overflow-hidden select-none animate-fade-in p-4">
          <div className="absolute inset-0" onClick={() => setImmersivePostIndex(null)} />
          
          <div className="relative w-full max-w-[500px] h-[90vh] bg-zinc-950 border border-zinc-900 rounded-3xl overflow-hidden flex flex-col z-10 shadow-2xl">
            {/* Modal sticky header */}
            <header className="flex justify-between items-center px-4 py-3 border-b border-zinc-900 bg-zinc-950 text-white">
              <button
                onClick={() => setImmersivePostIndex(null)}
                className="p-1 rounded-full hover:bg-zinc-900 flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-white"
              >
                <ArrowLeft className="size-4" /> Explore Stream
              </button>
              <div className="flex items-center gap-2">
                <button
                  disabled={immersivePostIndex === 0}
                  onClick={() => setImmersivePostIndex((prev) => prev! - 1)}
                  className="p-1 rounded-full hover:bg-zinc-900 text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ArrowUp className="size-4" />
                </button>
                <button
                  disabled={immersivePostIndex === posts.length - 1}
                  onClick={() => setImmersivePostIndex((prev) => prev! + 1)}
                  className="p-1 rounded-full hover:bg-zinc-900 text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ArrowDown className="size-4" />
                </button>
              </div>
            </header>

            {/* Immersive Scrollable Feed container */}
            <div className="flex-grow overflow-y-auto pr-1 p-4 scrollbar-none">
              <Post post={posts[immersivePostIndex]} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
