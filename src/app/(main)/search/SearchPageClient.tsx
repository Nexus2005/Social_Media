"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "@/app/(main)/SessionProvider";
import kyInstance from "@/lib/ky";
import { PostsPage } from "@/lib/types";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  Search,
  Loader2,
  Play,
  Heart,
  MessageCircle,
  VolumeX,
  X,
  Radio,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Mic,
  Scan,
  Sparkles,
  Star,
  Flame,
  ShoppingBag,
  Monitor,
  Trophy,
  Gamepad2,
  Plane,
  LayoutGrid,
  TrendingUp,
  ArrowRight,
  Tv,
  Eye,
  Plus,
  Compass,
  Instagram,
  Youtube,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import UserAvatar from "@/components/UserAvatar";
import FollowButton from "@/components/FollowButton";
import InfiniteScrollContainer from "@/components/InfiniteScrollContainer";
import Post from "@/components/posts/Post";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { cn } from "@/lib/utils";

// Staggered grid media item component for Pinterest-style masonry
interface ExploreMasonryItemProps {
  post: any;
  index: number;
  onClick: () => void;
}

function ExploreMasonryItem({ post, index, onClick }: ExploreMasonryItemProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Find first image/video attachment
  const media = post.attachments?.find((att: any) => att.mediaType === "IMAGE" || att.mediaType === "VIDEO") || post.attachments?.[0];
  const isVideo = media?.mediaType === "VIDEO";
  
  const fallbacks = [
    "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=500&q=80", // Fashion
    "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=500&q=80", // Tech / Business
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=500&q=80", // Travel
    "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=500&q=80", // Gaming
    "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=500&q=80"  // Sports
  ];
  const fallbackUrl = fallbacks[index % fallbacks.length];
  const mediaUrl = media?.url || fallbackUrl;

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

  // Preview loop of 4 seconds
  useEffect(() => {
    if (!isVideo || !videoRef.current) return;
    const video = videoRef.current;

    const handleTimeUpdate = () => {
      if (video.currentTime >= 4) {
        video.currentTime = 0;
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [isVideo]);

  // Reels have greater height, image posts have horizontal/square sizes
  const aspectClass = isVideo ? "aspect-[9/16]" : index % 2 === 0 ? "aspect-square" : "aspect-[4/3]";

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "relative cursor-pointer overflow-hidden bg-zinc-100 dark:bg-zinc-900 group rounded-[24px] shadow-sm border border-black/5 dark:border-white/5",
        aspectClass
      )}
    >
      {isVideo ? (
        <div className="w-full h-full relative">
          <video
            ref={videoRef}
            src={mediaUrl}
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2.5 right-2.5 p-1.5 bg-black/60 rounded-full text-white pointer-events-none z-20">
            <VolumeX className="size-3" />
          </div>
          <div className="absolute bottom-3 left-3 flex items-center gap-1 text-[10px] font-bold text-white bg-black/50 px-2 py-0.5 rounded-full backdrop-blur-sm pointer-events-none z-20 select-none">
            <Play className="size-2.5 fill-white" /> Spot
          </div>
        </div>
      ) : (
        <img
          src={mediaUrl}
          alt="Explore post"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
      )}

      {/* Analytics overlay */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent flex flex-col justify-end p-4 text-white transition-opacity duration-200 z-10 text-start",
          isHovered ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <span className="font-extrabold text-[12.5px] text-white block truncate leading-tight">
          {post.user?.displayName || "Creator"}
        </span>
        <div className="flex items-center gap-3 mt-1.5 text-white/90 text-xs font-bold select-none">
          <div className="flex items-center gap-1">
            <Heart className="size-3.5 fill-white text-white" />
            <span>{post._count?.likes || post.likes?.length || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageCircle className="size-3.5 fill-white text-white" />
            <span>{post._count?.comments || post.comments?.length || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Explore grid item component for search query results
interface ExploreGridItemProps {
  post: any;
  isSpot: boolean;
  onClick: () => void;
}

function ExploreGridItem({ post, isSpot, onClick }: ExploreGridItemProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Find first image/video attachment
  const media = post.attachments?.find((att: any) => att.mediaType === "IMAGE" || att.mediaType === "VIDEO") || post.attachments?.[0];
  const isVideo = media?.mediaType === "VIDEO" || isSpot;

  const fallbacks = [
    "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=500&q=80",
    "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=500&q=80",
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=500&q=80",
    "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=500&q=80",
    "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=500&q=80"
  ];
  const mediaUrl = media?.url || fallbacks[Math.floor(Math.random() * fallbacks.length)];

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

  // Preview loop of 4 seconds
  useEffect(() => {
    if (!isVideo || !videoRef.current) return;
    const video = videoRef.current;

    const handleTimeUpdate = () => {
      if (video.currentTime >= 4) {
        video.currentTime = 0;
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [isVideo]);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "relative cursor-pointer overflow-hidden bg-zinc-100 dark:bg-zinc-900 group aspect-square rounded-[24px] shadow-sm",
        isSpot && "col-span-1 row-span-2 aspect-[9/16]"
      )}
    >
      {isVideo ? (
        <div className="w-full h-full relative">
          <video
            ref={videoRef}
            src={mediaUrl}
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white pointer-events-none z-20">
            <VolumeX className="size-3" />
          </div>
          {isSpot && (
            <div className="absolute bottom-2 left-2 flex items-center gap-1 text-[10px] font-bold text-white bg-black/50 px-2 py-0.5 rounded backdrop-blur-sm pointer-events-none z-20">
              <Play className="size-3 fill-white" /> Spot
            </div>
          )}
        </div>
      ) : (
        <img
          src={mediaUrl}
          alt="Explore post"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      )}

      {/* Analytics overlay */}
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

// High fidelity micro India flag component
function IndiaFlag() {
  return (
    <div className="india-flag-canvas">
      <div className="india-flag-stripe saffron" />
      <div className="india-flag-stripe white">
        <svg className="india-flag-chakra" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="#000080" strokeWidth="2" />
          <circle cx="60" cy="60" r="10" fill="#000080" />
          <g stroke="#000080" strokeWidth="2.5">
            <line x1="60" y1="6" x2="60" y2="114" />
            <line x1="6" y1="60" x2="114" y2="60" />
            <line x1="21.8" y1="21.8" x2="98.2" y2="98.2" />
            <line x1="21.8" y1="98.2" x2="98.2" y2="21.8" />
            <g transform="rotate(15 60 60)"><line x1="60" y1="6" x2="60" y2="114" /><line x1="6" y1="60" x2="114" y2="60" /></g>
            <g transform="rotate(30 60 60)"><line x1="60" y1="6" x2="60" y2="114" /><line x1="6" y1="60" x2="114" y2="60" /></g>
            <g transform="rotate(45 60 60)"><line x1="60" y1="6" x2="60" y2="114" /><line x1="6" y1="60" x2="114" y2="60" /></g>
            <g transform="rotate(60 60 60)"><line x1="60" y1="6" x2="60" y2="114" /><line x1="6" y1="60" x2="114" y2="60" /></g>
            <g transform="rotate(75 60 60)"><line x1="60" y1="6" x2="60" y2="114" /><line x1="6" y1="60" x2="114" y2="60" /></g>
          </g>
          <circle cx="60" cy="60" r="57" fill="none" stroke="#000080" strokeWidth="1.5" />
        </svg>
      </div>
      <div className="india-flag-stripe green" />
      <div className="micro-mesh-distortion" />
      <div className="micro-lens-overlay" />
    </div>
  );
}

// High fidelity micro Pakistan flag component
function PakistanFlag() {
  return (
    <div className="pakistan-flag-canvas">
      <div className="pakistan-hoist-stripe" />
      <div className="pakistan-fly-field">
        <svg viewBox="0 0 100 100" className="w-2.5 h-2.5 fill-white rotate-[-45deg] shrink-0">
          <path d="M 50 10 A 40 40 0 1 0 90 50 A 30 30 0 1 1 50 10 Z" />
          <polygon points="75,25 78,33 87,33 80,38 82,47 75,42 68,47 70,38 63,33 72,33" />
        </svg>
      </div>
      <div className="micro-lighting-overlay" />
    </div>
  );
}

interface SportsTeam {
  name: string;
  flagClass: string;
  score: string;
  overs: string;
}

interface SportMatchDetail {
  matchMeta: string;
  statusText: string;
  teams: SportsTeam[];
  runRate?: string;
  requiredRate?: string;
  balls?: string[];
  venue?: string;
  toss?: string;
}

const SPORTS_DATA: Record<string, SportMatchDetail> = {
  cricket: {
    matchMeta: "3rd ODI: Pak Tour of Ind, 2026",
    statusText: "Ind needs 131 runs to win",
    teams: [
      {
        name: "PAK",
        flagClass: "flag-pak",
        score: "250-10",
        overs: "(50)",
      },
      {
        name: "IND",
        flagClass: "flag-ind",
        score: "120-1",
        overs: "(20.2)",
      },
    ],
    runRate: "6.24",
    requiredRate: "8.24",
    balls: ["4", "1", "6", "W", "1", "4"],
    venue: "Kensington Oval, Barbados",
    toss: "IND chose to bat",
  },
  football: {
    matchMeta: "Champions League: Semi-Final",
    statusText: "Real Madrid leads 4-3 on aggregate",
    teams: [
      {
        name: "RMA",
        flagClass: "flag-rma",
        score: "2",
        overs: "",
      },
      {
        name: "BAR",
        flagClass: "flag-bar",
        score: "1",
        overs: "78'",
      },
    ],
    runRate: "N/A",
    requiredRate: "N/A",
    balls: ["G", "S", "C", "F", "Y", "R"],
    venue: "Santiago Bernabéu",
    toss: "Real Madrid kicked off",
  },
};

// Data sets for exploration dashboard
const LIVE_STREAMS = [
  {
    title: "Gaming Live",
    host: "Raavan Op",
    viewers: "12.4K",
    image: "/gaming.jpg",
  },
  {
    title: "Shopping Deals",
    host: "StyleWithNeha",
    viewers: "5.2K",
    image: "/shopping.jpg",
  },
  {
    title: "Crypto Talk",
    host: "Tech With Rohit",
    viewers: "8.1K",
    image: "/crypto_talk.jpg",
  },
  {
    title: "Maldives Vlog",
    host: "TravelWithKaran",
    viewers: "2.7K",
    image: "/maldivees.jpg",
  },
  {
    title: "Match Watchalong",
    host: "FootyZone",
    viewers: "3.6K",
    image: "/match_watchlong.jpg",
  },
  {
    title: "Acoustic Nights",
    host: "Armaan Malik",
    viewers: "1.4K",
    image: "/acoustic.jpg",
  },
];

interface SearchPageClientProps {
  initialQuery?: string;
}

export default function SearchPageClient({ initialQuery = "" }: SearchPageClientProps) {
  const { user: sessionUser } = useSession();

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [committedQuery, setCommittedQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState(initialQuery ? "Top" : "For You");
  const [exploreFilter, setExploreFilter] = useState("All");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showRecentDropdown, setShowRecentDropdown] = useState(false);
  const [immersivePostIndex, setImmersivePostIndex] = useState<number | null>(null);
  const [activeSport, setActiveSport] = useState<"cricket" | "football">("cricket");
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);

  // Debounced query so typing does not fire an autocomplete request per keystroke
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 250);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const inputRef = useRef<HTMLInputElement>(null);
  const liveScrollRef = useRef<HTMLDivElement>(null);

  const scrollLive = (direction: "left" | "right") => {
    if (liveScrollRef.current) {
      const scrollAmount = 220;
      liveScrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  // Travel category is now handled within the More dropdown panel
  const categories = [
    { name: "For You", icon: Star },
    { name: "Trending", icon: Flame },
    { name: "Fashion", icon: ShoppingBag },
    { name: "Technology", icon: Monitor },
    { name: "Sports", icon: Trophy },
    { name: "Gaming", icon: Gamepad2 },
    { name: "Beauty", icon: Sparkles },
    { name: "More", icon: LayoutGrid },
  ];

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

    if (searchQuery.startsWith("@")) {
      setActiveTab("People");
    } else if (searchQuery.startsWith("#")) {
      setActiveTab("Hashtags");
    } else {
      setActiveTab("Top");
    }
  };

  // Query suggestions dynamically while typing (debounced)
  const { data: autocompleteData } = useQuery<any>({
    queryKey: ["search-autocomplete", debouncedQuery],
    queryFn: () =>
      kyInstance
        .get("/api/search/autocomplete", {
          searchParams: { q: debouncedQuery },
        })
        .json<any>(),
    enabled: !!debouncedQuery.trim() && showRecentDropdown,
    placeholderData: (prev: any) => prev,
  });

  const autocompleteUsers = autocompleteData?.users || [];

  // Query dynamic trending hashtags from database activity
  const { data: trendingHashtags = [] } = useQuery<any[]>({
    queryKey: ["trending-hashtags"],
    queryFn: () => kyInstance.get("/api/trending").json<any[]>(),
    enabled: activeTab === "For You" || activeTab === "Trending" || !committedQuery,
  });

  // Curate dynamic hashtags + fallback items
  const hashtagsToRender = [
    ...trendingHashtags,
    { hashtag: "#SummerFashion", count: 210 },
    { hashtag: "#TechLaunch2025", count: 128 },
    { hashtag: "#CryptoBoom", count: 95 },
    { hashtag: "#FitnessGoals", count: 87 },
    { hashtag: "#Wanderlust", count: 74 }
  ].reduce((acc: any[], current) => {
    const x = acc.find(item => item.hashtag.toLowerCase() === current.hashtag.toLowerCase());
    if (!x) {
      return acc.concat([current]);
    } else {
      return acc;
    }
  }, []).slice(0, 5);

  const formatHashtagCount = (count: any) => {
    const num = Number(count);
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k posts`;
    }
    if (num > 20) {
      return `${num}k posts`; // For fallback mock values
    }
    return `${num} ${num === 1 ? "post" : "posts"}`;
  };

  const getTrendStats = (tag: string, index: number) => {
    const percentages = ["+18%", "+12%", "+9%", "+6%", "-4%"];
    const directions = [true, true, true, true, false];
    return {
      pct: percentages[index % percentages.length],
      up: directions[index % directions.length]
    };
  };

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
    Top: "top",
    Latest: "latest",
    People: "accounts",
    Posts: "latest",
    Photos: "photos",
    Videos: "videos",
    Hashtags: "latest",
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

  // Group actual database posts into columns for Pinterest masonry layout
  const col1 = posts.filter((_, idx) => idx % 3 === 0);
  const col2 = posts.filter((_, idx) => idx % 3 === 1);
  const col3 = posts.filter((_, idx) => idx % 3 === 2);

  // Common Search bar form builder
  const renderSearchForm = () => (
    <form onSubmit={handleSearchSubmit} className="w-full relative">
      <div className="bg-zinc-100 dark:bg-zinc-900 border border-transparent focus-within:border-instagram-lightText dark:focus-within:border-instagram-darkText focus-within:bg-white dark:focus-within:bg-instagram-darkBg rounded-full h-11 px-4 w-full flex items-center gap-3 transition-all">
        <Search className="size-4.5 text-zinc-500" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search people, products, hashtags, brands..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setShowRecentDropdown(true)}
          onBlur={() => setTimeout(() => setShowRecentDropdown(false), 200)}
          className="flex-grow bg-transparent text-sm text-current outline-none placeholder:text-zinc-500"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setCommittedQuery("");
              setActiveTab("For You");
            }}
            className="p-1 text-zinc-500 hover:text-current rounded-full bg-zinc-200/40 hover:bg-zinc-200 dark:bg-zinc-800/40 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="size-3.5" />
          </button>
        )}

        <div className="flex items-center gap-2.5 text-zinc-400 shrink-0">
          <button
            type="button"
            className="hover:text-foreground transition-colors p-1"
            title="Voice Search"
          >
            <Mic className="size-4" />
          </button>
          <button
            type="button"
            className="hover:text-foreground transition-colors p-1"
            title="Scan QR Code"
          >
            <Scan className="size-4" />
          </button>
          <button
            type="button"
            className="bg-indigo-650 dark:bg-indigo-500 hover:bg-indigo-700 hover:dark:bg-indigo-650 text-white font-extrabold text-[10.5px] px-3 py-1.5 rounded-full flex items-center gap-1 shadow-sm transition-all shrink-0"
          >
            <Sparkles className="size-3 fill-current" /> AI Search
          </button>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 px-2 py-0.5 rounded text-[10px] font-mono select-none">
            <span>⌘</span>K
          </kbd>
        </div>
      </div>

      {showRecentDropdown && (
        <div className="absolute top-12 left-0 right-0 z-40 bg-white dark:bg-zinc-955 border border-instagram-lightBorder dark:border-instagram-darkBorder rounded-2xl shadow-2xl p-4 flex flex-col gap-3 animate-fade-in max-h-[350px] overflow-y-auto">
          {searchQuery.trim() ? (
            <>
              <div className="flex justify-between items-center text-xs font-bold text-muted-foreground border-b border-instagram-lightBorder dark:border-instagram-darkBorder pb-2">
                <span>Search Suggestions</span>
              </div>
              <div className="flex flex-col gap-2">
                <div
                  onClick={() => {
                    setCommittedQuery(searchQuery);
                    saveSearch(searchQuery);
                    setShowRecentDropdown(false);
                    inputRef.current?.blur();
                  }}
                  className="px-2 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer text-sm text-current font-semibold text-start"
                >
                  Search for &quot;{searchQuery}&quot;
                </div>

                {autocompleteUsers.map((acc: any) => (
                  <Link
                    key={acc.id}
                    href={`/users/${acc.username}`}
                    className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors text-current"
                  >
                    <UserAvatar avatarUrl={acc.avatarUrl} size={36} />
                    <div className="flex flex-col text-start">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs hover:underline">{acc.displayName}</span>
                        {acc.verified && (
                          <VerifiedBadge size={13} />
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
            <>
              <div className="flex justify-between items-center text-xs font-bold text-muted-foreground">
                <span>Recent Searches</span>
                <button
                  type="button"
                  onClick={clearAllRecent}
                  className="text-current hover:opacity-80"
                >
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
                    className="flex justify-between items-center px-2 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer text-sm"
                  >
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={(e) => removeRecentSearch(e, item)}
                      className="p-1 text-zinc-500 hover:text-current rounded-full transition-colors"
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
  );

  return (
    <div className="w-full min-h-screen bg-white dark:bg-instagram-darkBg text-instagram-lightText dark:text-instagram-darkText pb-14 md:pb-0 flex flex-col items-center">
      {/* Main content body */}
      <main className="w-full transition-all duration-350 flex justify-center">
        
        {committedQuery.length === 0 ? (
          // INITIAL DISCOVERY DASHBOARD (Left Content + Right Pane Redesign)
          <div className="w-full max-w-[1250px] flex gap-6 text-start items-start pb-10 mt-4 px-4 md:px-0">
            
            {/* LEFT MAIN EXPLORE CONTAINER (Search bar fits here to end at middle sections end!) */}
            <div className="flex-1 min-w-0 space-y-6">
              
              {/* Search bar inside left column */}
              <div className="space-y-4">
                {renderSearchForm()}

                {/* Categories strip inside left column */}
                <div className="w-full overflow-x-auto scrollbar-none flex gap-2.5 pb-1">
                  {categories.map((cat) => {
                    const Icon = cat.icon;
                    const isActive = cat.name === "More"
                      ? (activeTab === "More" || activeTab === "Travel")
                      : (activeTab === cat.name);
                    return (
                      <button
                        key={cat.name}
                        onClick={() => {
                          if (cat.name === "More") {
                            setShowMoreDropdown(!showMoreDropdown);
                          } else {
                            setActiveTab(cat.name);
                            setShowMoreDropdown(false);
                          }
                        }}
                        className={cn(
                          "pill-expand-button flex-shrink-0 w-auto px-4 py-2 text-xs font-bold rounded-full border transition-all flex items-center gap-1.5 cursor-pointer shadow-sm select-none",
                          isActive
                            ? "active"
                            : "bg-background text-zinc-550 border-black/10 dark:border-white/10 hover:border-transparent"
                        )}
                      >
                        <Icon className="size-3.5 shrink-0 z-10" />
                        <span className="z-10">{cat.name}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Dropdown panel under More categories */}
                {showMoreDropdown && (
                  <div className="w-full p-3 bg-zinc-50 dark:bg-zinc-900 border border-black/10 dark:border-white/5 rounded-[24px] flex flex-wrap gap-2.5 animate-fade-in shadow-inner">
                    <span className="text-[10px] font-black uppercase text-muted-foreground w-full mb-1 pl-1">More Categories</span>
                    <button
                      onClick={() => {
                        setActiveTab("Travel");
                        setShowMoreDropdown(false);
                      }}
                      className={cn(
                        "pill-expand-button flex-shrink-0 w-auto px-4 py-2 text-xs font-bold rounded-full border transition-all flex items-center gap-1.5 cursor-pointer shadow-sm select-none",
                        activeTab === "Travel"
                          ? "active"
                          : "bg-background text-zinc-550 border-black/10 dark:border-white/10 hover:border-transparent"
                      )}
                    >
                      <Plane className="size-3.5 shrink-0 z-10" />
                      <span className="z-10">Travel</span>
                    </button>
                  </div>
                )}
              </div>

              {/* HERO BANNER SECTION (Covered fully by user banner top-1782823947.avif) */}
              <div className="relative w-full border border-black/10 dark:border-white/5 rounded-3xl overflow-hidden min-h-[350px] flex items-center p-6 md:p-12 select-none bg-zinc-955">
                {/* Full cover background image */}
                <img
                  src="/top-1782823947.avif"
                  alt="Summer Fashion"
                  className="absolute inset-0 w-full h-full object-cover z-0 select-none pointer-events-none"
                />
                {/* Dark Vignette Overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-transparent z-10" />

                {/* Content on top */}
                <div className="relative z-20 text-start max-w-lg">
                  <div className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-500 text-[10px] font-black tracking-wide px-3 py-1 rounded-full mb-4">
                    <Flame className="size-3.5 fill-current animate-pulse" /> Trending Now
                  </div>
                  <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-none mb-3">
                    Summer Fashion 2025
                  </h2>
                  <p className="text-sm text-zinc-300 max-w-md mb-6 leading-relaxed">
                    Explore the hottest styles, creators and collections curated for you.
                  </p>

                  <div className="flex flex-wrap items-center gap-4">
                    <button className="animated-button select-none">
                      <span className="text">Explore Now</span>
                      <svg className="arr-1" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z" />
                      </svg>
                      <svg className="arr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z" />
                      </svg>
                      <div className="circle" />
                    </button>

                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        <div className="size-6 rounded-full border border-zinc-900 bg-zinc-400 overflow-hidden">
                          <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&h=50&fit=crop" className="object-cover size-full" alt="avatar" />
                        </div>
                        <div className="size-6 rounded-full border border-zinc-900 bg-zinc-500 overflow-hidden">
                          <img src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=50&h=50&fit=crop" className="object-cover size-full" alt="avatar" />
                        </div>
                        <div className="size-6 rounded-full border border-zinc-900 bg-zinc-650 overflow-hidden">
                          <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&h=50&fit=crop" className="object-cover size-full" alt="avatar" />
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-zinc-300">
                        12.4K people exploring
                      </span>
                    </div>
                  </div>
                </div>

                {/* Slider Dots */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-1.5 z-20">
                  <span className="size-2 rounded-full bg-indigo-500 cursor-pointer" />
                  <span className="size-2 rounded-full bg-white/35 cursor-pointer" />
                  <span className="size-2 rounded-full bg-white/35 cursor-pointer" />
                  <span className="size-2 rounded-full bg-white/35 cursor-pointer" />
                </div>
              </div>

              {/* LIVE NOW SECTION */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[15px] font-black tracking-tight text-foreground">
                      Live Now
                    </h3>
                    <span className="inline-block size-2 bg-red-650 rounded-full animate-pulse" />
                  </div>
                  <Link
                    href="/live"
                    className="text-xs font-bold text-indigo-500 hover:text-indigo-400 transition-colors"
                  >
                    View all
                  </Link>
                </div>

                {/* Horizontal Scrollable Row containing Custom live-now-card */}
                <div className="relative group">
                  {/* Left scroll control arrow */}
                  <button
                    onClick={() => scrollLive("left")}
                    className="absolute left-1.5 top-1/2 -translate-y-1/2 z-30 h-8 w-8 rounded-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-black/10 dark:border-white/10 flex items-center justify-center text-foreground shadow-md hover:bg-white hover:dark:bg-zinc-800 transition-all cursor-pointer select-none opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Scroll Left"
                  >
                    <ChevronLeft className="size-5" />
                  </button>

                  <div
                    ref={liveScrollRef}
                    className="flex gap-5.5 overflow-x-auto pb-4 pt-1 scrollbar-none snap-x"
                  >
                    {LIVE_STREAMS.map((stream, idx) => (
                      <div
                        key={idx}
                        className="live-now-card group snap-start cursor-pointer border border-black/10 dark:border-white/5"
                      >
                        <img
                          src={stream.image}
                          alt={stream.title}
                          className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent z-10" />

                        <div className="absolute top-3 left-3 bg-red-650 text-white font-extrabold text-[8px] px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md z-20 select-none">
                          <Radio className="size-2.5 text-white animate-pulse" /> Live {stream.viewers}
                        </div>

                        <div className="p-3.5 relative z-20 text-start w-full min-w-0">
                          <span className="font-extrabold text-[12.5px] text-white block truncate leading-tight">
                            {stream.title}
                          </span>
                          <span className="text-[9.5px] font-bold text-white/70 block mt-0.5 leading-none">
                            {stream.host}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Right scroll control arrow */}
                  <button
                    onClick={() => scrollLive("right")}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 z-30 h-8 w-8 rounded-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-black/10 dark:border-white/10 flex items-center justify-center text-foreground shadow-md hover:bg-white hover:dark:bg-zinc-800 transition-all cursor-pointer select-none opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Scroll Right"
                  >
                    <ChevronRight className="size-5" />
                  </button>
                </div>
              </div>

              {/* THREE-COLUMN GRID SECTION */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 w-full mt-4">
                {/* Column 1: Trending Now */}
                <div className="monolith-card uiverse-neumorphic-card rounded-[30px] p-5 flex flex-col gap-4 text-start">
                  <div className="flex justify-between items-center border-b border-black/5 dark:border-white/5 pb-3">
                    <span className="text-xs font-black tracking-wider text-foreground">
                      Trending Now
                    </span>
                    <Link
                      href="/trends"
                      className="text-[10px] font-bold text-indigo-500 hover:text-indigo-400"
                    >
                      View all
                    </Link>
                  </div>

                  <div className="flex flex-col gap-3">
                    {hashtagsToRender.map((item, idx) => {
                      const trend = getTrendStats(item.hashtag, idx);
                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            setSearchQuery(item.hashtag);
                            setCommittedQuery(item.hashtag);
                            setActiveTab("Hashtags");
                          }}
                          className="flex justify-between items-center hover:bg-black/[0.01] dark:hover:bg-white/[0.02] -mx-2 px-2 py-1.5 rounded-xl transition-all cursor-pointer"
                        >
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-[12.5px] text-foreground truncate">
                              {item.hashtag}
                            </span>
                            <span className="text-[10px] text-muted-foreground mt-0.5">
                              {formatHashtagCount(item.count)}
                            </span>
                          </div>
                          <div
                            className={cn(
                              "flex items-center gap-0.5 text-[10px] font-extrabold px-2 py-0.5 rounded-full select-none",
                              trend.up
                                ? "text-emerald-500 bg-emerald-500/10"
                                : "text-rose-500 bg-rose-500/10"
                            )}
                          >
                            <TrendingUp className={cn("size-3", !trend.up && "rotate-90")} />
                            {trend.pct}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Column 2: Top News */}
                <div className="monolith-card uiverse-neumorphic-card rounded-[30px] p-5 flex flex-col gap-4 text-start">
                  <div className="flex justify-between items-center border-b border-black/5 dark:border-white/5 pb-3">
                    <span className="text-xs font-black tracking-wider text-foreground">
                      Top News
                    </span>
                    <Link
                      href="/news"
                      className="text-[10px] font-bold text-indigo-500 hover:text-indigo-400"
                    >
                      View all
                    </Link>
                  </div>

                  <div className="flex flex-col gap-3">
                    {[
                      {
                        title: "SpaceX Starship Flight 9 Success",
                        source: "TechCrunch",
                        time: "2h ago",
                        comments: "8.2K",
                        img: "https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?w=100&q=80",
                      },
                      {
                        title: "Inflation drops to 3.4% in India",
                        source: "ET Now",
                        time: "3h ago",
                        comments: "5.4K",
                        img: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=100&q=80",
                      },
                      {
                        title: "Apple iOS 19 with AI upgrades",
                        source: "The Verge",
                        time: "5h ago",
                        comments: "6.1K",
                        img: "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=100&q=80",
                      },
                    ].map((news, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 hover:bg-black/[0.01] dark:hover:bg-white/[0.02] -mx-2 px-2 py-1.5 rounded-xl transition-all cursor-pointer"
                      >
                        <img
                          src={news.img}
                          className="size-11 rounded-lg object-cover bg-zinc-350 shrink-0"
                          alt="news"
                        />
                        <div className="flex-1 min-w-0 flex flex-col text-start">
                          <span className="font-bold text-[12px] text-foreground leading-tight line-clamp-2">
                            {news.title}
                          </span>
                          <div className="flex items-center gap-2 mt-1 text-[9.5px] text-muted-foreground">
                            <span>{news.source}</span>
                            <span>•</span>
                            <span>{news.time}</span>
                            <span>•</span>
                            <span className="flex items-center gap-0.5">
                              <MessageCircle className="size-2.5" /> {news.comments}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Column 3: Sports Highlights */}
                <div className="monolith-card uiverse-neumorphic-card rounded-[30px] p-5 flex flex-col gap-4 text-start md:col-span-2 lg:col-span-1">
                  <div className="flex justify-between items-center border-b border-black/5 dark:border-white/5 pb-3">
                    <span className="text-xs font-black tracking-wider text-foreground">
                      Sports Highlights
                    </span>
                    <Link
                      href="/sports"
                      className="text-[10px] font-bold text-indigo-500 hover:text-indigo-400"
                    >
                      View all
                    </Link>
                  </div>

                  <div className="flex flex-col gap-3">
                    {/* Highlight Item 1: IPL Live Score */}
                    <div className="p-3 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/5 rounded-2xl flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-extrabold tracking-wider text-red-500 flex items-center gap-1 select-none">
                          <span className="size-1.5 bg-red-650 rounded-full animate-pulse" /> IPL 2025 · Live
                        </span>
                        <span className="text-[9px] font-semibold text-muted-foreground">
                          Kensington Oval
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-[12.5px]">CSK</span>
                          <span className="font-mono text-xs text-muted-foreground">137/4 (17.2)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs text-muted-foreground">110/6 (17.2)</span>
                          <span className="font-extrabold text-[12.5px]">RCB</span>
                        </div>
                      </div>
                      <div className="text-[10px] text-center text-muted-foreground font-bold tracking-wide mt-0.5">
                        RCB needs 28 runs in 16 balls
                      </div>
                    </div>

                    {/* Highlight Item 2: NBA Score */}
                    <div className="p-3 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/5 rounded-2xl flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-extrabold tracking-wider text-zinc-400 select-none">
                          NBA · Q3 - 07:21
                        </span>
                        <span className="text-[9px] font-semibold text-muted-foreground">
                          Crypto.com Arena
                        </span>
                      </div>
                      <div className="flex justify-between items-center font-bold text-[12.5px]">
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-500">LAL</span>
                          <span>72</span>
                        </div>
                        <span className="text-zinc-500 font-normal">vs</span>
                        <div className="flex items-center gap-2">
                          <span>68</span>
                          <span className="text-zinc-500">BOS</span>
                        </div>
                      </div>
                    </div>

                    {/* Highlight Item 3: UCL Score */}
                    <div className="p-3 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/5 rounded-2xl flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-extrabold tracking-wider text-indigo-500 select-none">
                          UCL Final · Live
                        </span>
                        <span className="text-[9px] font-semibold text-muted-foreground font-mono">
                          68:45
                        </span>
                      </div>
                      <div className="flex justify-between items-center font-bold text-[12.5px]">
                        <div className="flex items-center gap-2">
                          <span>RMA</span>
                          <span>2</span>
                        </div>
                        <span className="text-zinc-500 font-normal">-</span>
                        <div className="flex items-center gap-2">
                          <span>1</span>
                          <span>BVB</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* EXPLORE SECTION (Pinterest Masonry layout showing database reels and posts) */}
              <div className="space-y-4 pt-2">
                <div className="flex flex-wrap items-center gap-4 border-b border-black/5 dark:border-white/5 pb-3">
                  <h3 className="text-[15px] font-black tracking-tight text-foreground select-none mr-2">
                    Explore
                  </h3>

                  {/* Filter tabs close to explore title with small gap */}
                  <div className="flex flex-wrap items-center gap-1.5 bg-black/5 dark:bg-white/5 p-1 rounded-full border border-black/10 dark:border-white/5">
                    {["All", "Videos", "Images", "Products", "Creators", "Places"].map((f) => (
                      <button
                        key={f}
                        onClick={() => setExploreFilter(f)}
                        className={cn(
                          "pill-expand-button flex-shrink-0 w-auto px-4 py-2 text-xs font-bold rounded-full border transition-all flex items-center gap-1.5 cursor-pointer shadow-sm select-none",
                          exploreFilter === f
                            ? "active"
                            : "bg-background text-zinc-550 border-black/10 dark:border-white/10 hover:border-transparent"
                        )}
                      >
                        <span className="z-10">{f}</span>
                      </button>
                    ))}
                  </div>

                  {/* Sort and grid layout controls aligned to the far right */}
                  <div className="ml-auto flex items-center gap-2 select-none">
                    <select className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/5 rounded-lg px-2 py-1 text-[10px] font-bold outline-none text-muted-foreground">
                      <option>Trending</option>
                      <option>Latest</option>
                      <option>Popular</option>
                    </select>
                    <button className="p-1 text-muted-foreground hover:text-foreground">
                      <LayoutGrid className="size-4.5" />
                    </button>
                  </div>
                </div>

                {/* Staggered Pinterest-style masonry grid layout */}
                {status === "pending" ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="size-6 animate-spin text-zinc-500" />
                  </div>
                ) : posts.length === 0 ? (
                  <p className="text-center text-zinc-500 py-10">No multimedia explore posts available.</p>
                ) : (
                  <InfiniteScrollContainer
                    className="grid grid-cols-2 md:grid-cols-3 gap-3.5 items-start w-full"
                    onBottomReached={() => hasNextPage && !isFetching && fetchNextPage()}
                  >
                    {/* Column 1 */}
                    <div className="flex flex-col gap-3.5">
                      {col1.map((post, idx) => (
                        <ExploreMasonryItem
                          key={post.id}
                          post={post}
                          index={idx * 3}
                          onClick={() => setImmersivePostIndex(idx * 3)}
                        />
                      ))}
                    </div>
                    {/* Column 2 */}
                    <div className="flex flex-col gap-3.5">
                      {col2.map((post, idx) => (
                        <ExploreMasonryItem
                          key={post.id}
                          post={post}
                          index={idx * 3 + 1}
                          onClick={() => setImmersivePostIndex(idx * 3 + 1)}
                        />
                      ))}
                    </div>
                    {/* Column 3 */}
                    <div className="hidden md:flex flex-col gap-3.5">
                      {col3.map((post, idx) => (
                        <ExploreMasonryItem
                          key={post.id}
                          post={post}
                          index={idx * 3 + 2}
                          onClick={() => setImmersivePostIndex(idx * 3 + 2)}
                        />
                      ))}
                    </div>
                  </InfiniteScrollContainer>
                )}
                {isFetchingNextPage && <Loader2 className="mx-auto my-4 animate-spin text-indigo-500" />}
              </div>
            </div>

            {/* RIGHT SIDEBAR PANE SECTION (Aligned at the top parallel to Search & Category pills!) */}
            <div className="hidden lg:flex w-[340px] shrink-0 flex-col gap-5 select-none">
              
              {/* 1. Live Score Card */}
              <div className="monolith-card uiverse-neumorphic-card rounded-[30px] p-5 flex flex-col gap-4 text-start">
                <div className="flex justify-between items-center border-b border-black/5 dark:border-white/5 pb-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setActiveSport((prev) => (prev === "cricket" ? "football" : "cricket"))}
                      className="h-5 w-5 flex items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                      title="Previous Sport"
                    >
                      <ChevronLeft className="size-3.5" />
                    </button>
                    <span className="text-xs font-black tracking-wider text-foreground select-none">
                      {activeSport} Match
                    </span>
                    <button
                      onClick={() => setActiveSport((prev) => (prev === "cricket" ? "football" : "cricket"))}
                      className="h-5 w-5 flex items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                      title="Next Sport"
                    >
                      <ChevronRight className="size-3.5" />
                    </button>
                  </div>
                  <span className="flex items-center gap-1 text-red-500 text-[9px] font-black tracking-wide animate-pulse select-none">
                    <span className="inline-block size-1.5 bg-red-650 rounded-full" /> Live
                  </span>
                </div>

                <div className="flex justify-between items-center text-[11px] font-bold text-muted-foreground select-none">
                  <span>{SPORTS_DATA[activeSport].matchMeta}</span>
                </div>

                <div className="space-y-3.5 py-1">
                  {SPORTS_DATA[activeSport].teams.map((team, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <div className="flex items-center gap-2.5">
                        {team.flagClass === "flag-ind" ? (
                          <IndiaFlag />
                        ) : team.flagClass === "flag-pak" ? (
                          <PakistanFlag />
                        ) : (
                          <div className={cn("flag shrink-0", team.flagClass)} />
                        )}
                        <span className="font-extrabold text-[13px]">{team.name}</span>
                      </div>
                      <div className="text-right font-mono flex flex-col justify-center">
                        <span className="font-bold text-sm">{team.score}</span>
                        {team.overs && (
                          <span className="text-[9.5px] text-muted-foreground leading-none mt-0.5">{team.overs}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="h-[1px] bg-black/5 dark:bg-white/5" />

                <div className="text-[10px] text-center text-muted-foreground font-bold tracking-wide">
                  {SPORTS_DATA[activeSport].statusText}
                </div>

                {/* Neumorphic Tabs */}
                <div className="flex border-t border-b border-black/10 dark:border-white/5 bg-black/[0.01] dark:bg-black/15 -mx-5">
                  <button
                    onClick={() => {
                      alert(`${activeSport} schedule view will be loaded shortly.`);
                    }}
                    className="flex-1 py-2 text-center text-[9px] font-extrabold tracking-widest text-muted-foreground hover:text-foreground hover:bg-black/[0.03] dark:hover:bg-white/[0.01] border-r border-black/10 dark:border-white/5 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <Calendar className="size-3" />
                      Schedule
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      alert(`${activeSport} points table view will be loaded shortly.`);
                    }}
                    className="flex-1 py-2 text-center text-[9px] font-extrabold tracking-widest text-muted-foreground hover:text-foreground hover:bg-black/[0.03] dark:hover:bg-white/[0.01] transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <Trophy className="size-3" />
                      Points Table
                    </div>
                  </button>
                </div>

                {SPORTS_DATA[activeSport].venue && (
                  <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground">
                    <span className="truncate max-w-[180px]">Venue: {SPORTS_DATA[activeSport].venue}</span>
                    {SPORTS_DATA[activeSport].toss && (
                      <span className="font-bold text-foreground shrink-0">{SPORTS_DATA[activeSport].toss}</span>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-3 mt-1">
                  <button className="flex-1 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-extrabold text-xs py-3 rounded-full hover:shadow-lg transition-all cursor-pointer text-center">
                    View Full Scorecard
                  </button>
                  <button className="h-10 w-10 flex items-center justify-center rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/5 text-muted-foreground hover:text-foreground transition-all cursor-pointer">
                    <Bookmark className="size-4" />
                  </button>
                </div>
              </div>

              {/* 2. Who to Follow Card */}
              <div className="monolith-card uiverse-neumorphic-card rounded-[30px] p-5 flex flex-col gap-4 text-start">
                <div className="flex justify-between items-center border-b border-black/5 dark:border-white/5 pb-2">
                  <span className="text-xs font-black tracking-wider text-foreground">
                    Who to follow
                  </span>
                  <Link
                    href="/users/suggestions"
                    className="text-[10px] font-bold text-indigo-500 hover:text-indigo-400"
                  >
                    See all
                  </Link>
                </div>

                <div className="flex flex-col gap-4">
                  {[
                    {
                      name: "MrBeast",
                      tag: "@MrBeast",
                      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&h=50&fit=crop",
                      category: "Entertainment",
                      desc: "Followed by MrBeast + 6 friends",
                    },
                    {
                      name: "Shraddha Kapoor",
                      tag: "@shraddhakapoor",
                      avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=50&h=50&fit=crop",
                      category: "Actor",
                      desc: "Followed by 8 friends",
                    },
                    {
                      name: "Tech Burner",
                      tag: "@techburner",
                      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&h=50&fit=crop",
                      category: "Tech Creator",
                      desc: "Followed by 15 friends",
                    },
                  ].map((creator, idx) => (
                    <div key={idx} className="flex justify-between items-center gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={creator.avatar}
                          className="size-9 rounded-full object-cover shrink-0 border border-black/5"
                          alt="avatar"
                        />
                        <div className="flex flex-col min-w-0 text-start">
                          <span className="font-bold text-[12px] text-foreground truncate flex items-center gap-1 leading-tight">
                            {creator.name}
                            <VerifiedBadge size={12} />
                          </span>
                          <span className="text-[9.5px] text-muted-foreground mt-0.5 leading-none">
                            {creator.tag} · {creator.category}
                          </span>
                          <span className="text-[8.5px] text-muted-foreground mt-1 line-clamp-1 leading-none select-none">
                            {creator.desc}
                          </span>
                        </div>
                      </div>

                      <button className="bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold text-[9.5px] px-3.5 py-1.5 rounded-full cursor-pointer shadow-sm transition-all select-none">
                        Follow
                      </button>
                    </div>
                  ))}
                </div>

                <Link
                  href="/users/suggestions"
                  className="text-[10px] font-bold text-indigo-500 hover:text-indigo-400 mt-1 pl-1"
                >
                  Show more
                </Link>
              </div>

              {/* 3. Spot. Shop. Share. Banner Card */}
              <div className="relative border border-black/10 dark:border-white/5 rounded-[30px] overflow-hidden bg-zinc-950 aspect-[1.9/1] w-full select-none shadow-sm">
                {/* Full cover background image */}
                <img
                  src="/spot_share_promo.png"
                  alt="Spot Shop Share"
                  className="absolute inset-0 w-full h-full object-cover z-0 select-none pointer-events-none"
                />

                <Link href="/spots" className="absolute bottom-3 left-3 z-20">
                  <button className="animated-button select-none scale-[0.85] origin-bottom-left">
                    <span className="text">Try Spotting Something</span>
                    <svg className="arr-1" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z" />
                    </svg>
                    <svg className="arr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z" />
                    </svg>
                    <div className="circle" />
                  </button>
                </Link>
              </div>

            </div>

          </div>
        ) : (
          // ACTIVE SEARCH RESULTS VIEW STATE (Preserves database results rendering inside single max-w-[600px] column!)
          <div className="w-full max-w-[600px] flex flex-col gap-4 pb-10 mt-4 px-4 md:px-0">
            {renderSearchForm()}

            <div className="w-full overflow-x-auto scrollbar-none flex gap-2.5 pb-1">
              {filters.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "pill-expand-button flex-shrink-0 w-auto px-4 py-1.5 text-xs font-bold rounded-full border transition-all cursor-pointer select-none",
                    activeTab === tab
                      ? "active"
                      : "bg-transparent text-zinc-500 border-black/10 dark:border-white/10 hover:border-transparent"
                  )}
                >
                  <span className="z-10">{tab}</span>
                </button>
              ))}
            </div>

            {isAccountTab ? (
              <div className="flex flex-col gap-4 mt-2">
                {accountsLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="size-6 animate-spin text-zinc-500" />
                  </div>
                ) : !accountsData?.users?.length ? (
                  <p className="text-center text-zinc-500 py-10">
                    No profiles found for &quot;{committedQuery}&quot;
                  </p>
                ) : (
                  accountsData.users.map((acc: any) => (
                    <div
                      key={acc.id}
                      className="flex justify-between items-center gap-4 hover:bg-zinc-100 dark:hover:bg-zinc-955 p-2.5 rounded-xl transition-colors"
                    >
                      <Link href={`/users/${acc.username}`} className="flex items-center gap-3">
                        <UserAvatar avatarUrl={acc.avatarUrl} size={48} />
                        <div className="flex flex-col text-start">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm hover:underline text-current">
                              {acc.displayName}
                            </span>
                            {acc.verified && (
                              <VerifiedBadge size={14} />
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">@{acc.username}</span>
                          {acc.bio && (
                            <span className="text-xs text-muted-foreground mt-1 line-clamp-1 max-w-[320px]">
                              {acc.bio}
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground mt-0.5">
                            {acc.followers?.length || 0} followers
                          </span>
                        </div>
                      </Link>
                      <FollowButton
                        userId={acc.id}
                        initialState={{
                          followers: acc.followers?.length || 0,
                          isFollowedByUser: acc.followers?.some(
                            (f: any) => f.followerId === sessionUser.id
                          ),
                        }}
                      />
                    </div>
                  ))
                )}
              </div>
            ) : activeTab === "Hashtags" ? (
              <div className="flex flex-col gap-4 mt-2">
                {status === "pending" ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="size-6 animate-spin text-zinc-500" />
                  </div>
                ) : posts.length === 0 ? (
                  <p className="text-center text-zinc-500 py-10">
                    No hashtag feeds matching &quot;{committedQuery}&quot;
                  </p>
                ) : (
                  <div className="flex flex-col gap-4 text-start">
                    <div className="bg-zinc-100 dark:bg-zinc-900 border border-instagram-lightBorder dark:border-instagram-darkBorder rounded-2xl p-4 flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-lg font-black text-current">
                          #{committedQuery.replace("#", "")}
                        </span>
                        <span className="text-xs text-muted-foreground mt-1">
                          {posts.length}+ active posts
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-current">Tag aggregate</span>
                    </div>

                    <div className="flex flex-col gap-2">
                      {posts.map((post) => (
                        <Post key={post.id} post={post} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : activeTab === "Photos" || activeTab === "Videos" ? (
              <div className="flex flex-col mt-2">
                {status === "pending" ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="size-6 animate-spin text-zinc-500" />
                  </div>
                ) : posts.length === 0 ? (
                  <p className="text-center text-zinc-500 py-10">No matches found.</p>
                ) : (
                  <InfiniteScrollContainer
                    className="grid grid-cols-3 gap-1 md:gap-1.5"
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
                {isFetchingNextPage && (
                  <Loader2 className="mx-auto my-4 animate-spin text-zinc-500" />
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-4 mt-2">
                {status === "pending" ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="size-6 animate-spin text-zinc-500" />
                  </div>
                ) : posts.length === 0 ? (
                  <p className="text-center text-zinc-500 py-10">
                    No search results matching &quot;{committedQuery}&quot;
                  </p>
                ) : (
                  <InfiniteScrollContainer
                    className="flex flex-col gap-2"
                    onBottomReached={() => hasNextPage && !isFetching && fetchNextPage()}
                  >
                    {posts.map((post) => (
                      <Post key={post.id} post={post} />
                    ))}
                  </InfiniteScrollContainer>
                )}
                {isFetchingNextPage && (
                  <Loader2 className="mx-auto my-4 animate-spin text-zinc-500" />
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* FULL IMMERSIVE POPUP explore stream view */}
      {immersivePostIndex !== null && posts.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm overflow-hidden select-none animate-fade-in p-4">
          <div className="absolute inset-0" onClick={() => setImmersivePostIndex(null)} />

          <div className="relative w-full max-w-[500px] h-[90vh] bg-white dark:bg-zinc-955 border border-instagram-lightBorder dark:border-instagram-darkBorder rounded-3xl overflow-hidden flex flex-col z-10 shadow-2xl">
            {/* Modal sticky header */}
            <header className="flex justify-between items-center px-4 py-3 border-b border-instagram-lightBorder dark:border-instagram-darkBorder bg-white dark:bg-zinc-955 text-instagram-lightText dark:text-instagram-darkText">
              <button
                onClick={() => setImmersivePostIndex(null)}
                className="p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-current"
              >
                <ArrowLeft className="size-4" /> Explore Stream
              </button>
              <div className="flex items-center gap-2">
                <button
                  disabled={immersivePostIndex === 0}
                  onClick={() => setImmersivePostIndex((prev) => prev! - 1)}
                  className="p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 text-muted-foreground hover:text-current disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ArrowUp className="size-4" />
                </button>
                <button
                  disabled={immersivePostIndex === posts.length - 1}
                  onClick={() => setImmersivePostIndex((prev) => prev! + 1)}
                  className="p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 text-muted-foreground hover:text-current disabled:opacity-30 disabled:hover:bg-transparent"
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
