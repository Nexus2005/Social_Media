"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Loader2, History, AlertTriangle } from "lucide-react";
import { FallbackGifProvider, GifData } from "@/lib/providers/gifProvider";

interface GifPickerProps {
  onSelect: (url: string) => void;
  onClose?: () => void;
}

const gifProvider = new FallbackGifProvider(
  process.env.NEXT_PUBLIC_TENOR_API_KEY || "",
  process.env.NEXT_PUBLIC_GIPHY_API_KEY || "5N7a5gqhRaOStUVZlVxVJOZxXXHlSVdZ"
);

export default function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"stickers" | "gifs">("stickers");
  const [results, setResults] = useState<GifData[]>([]);
  const [recents, setRecents] = useState<GifData[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const gridContainerRef = useRef<HTMLDivElement>(null);

  // Load recents on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("cartly_recent_gifs");
      if (stored) setRecents(JSON.parse(stored));
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Fetch initial results on tab / query changes
  useEffect(() => {
    setPage(0);
    setHasMore(true);
    setError(null);
    fetchData(0, true);
  }, [query, tab]);

  const fetchData = async (pageNum: number, isNewSearch: boolean) => {
    if (isNewSearch) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      let items: GifData[] = [];
      if (query.trim() === "") {
        items = await gifProvider.trending(pageNum, tab);
      } else {
        items = await gifProvider.search(query, pageNum, tab);
      }

      if (items.length === 0) {
        setHasMore(false);
      }

      setResults((prev) => (isNewSearch ? items : [...prev, ...items]));
    } catch (err: any) {
      console.error(err);
      setError("Failed to fetch GIFs. Please check your network connection.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Scroll handler for Infinite Scroll
  const handleScroll = () => {
    const container = gridContainerRef.current;
    if (!container || loading || loadingMore || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    // Trigger when scrolled to 85% of content height
    if (scrollTop + clientHeight >= scrollHeight - 80) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchData(nextPage, false);
    }
  };

  const handleSelect = (gif: GifData) => {
    onSelect(gif.url);

    // Save to recents
    try {
      const updated = [gif, ...recents.filter((r) => r.id !== gif.id)].slice(0, 10);
      setRecents(updated);
      localStorage.setItem("cartly_recent_gifs", JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col h-[380px] bg-neutral-950 border border-neutral-900 rounded-3xl overflow-hidden shadow-2xl p-4 text-white">
      {/* Tab Selectors */}
      <div className="flex gap-2 mb-3 bg-neutral-900/60 p-1 rounded-2xl flex-shrink-0">
        <button
          onClick={() => setTab("stickers")}
          className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
            tab === "stickers" ? "bg-neutral-800 text-white shadow" : "text-neutral-400 hover:text-white"
          }`}
        >
          Stickers
        </button>
        <button
          onClick={() => setTab("gifs")}
          className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
            tab === "gifs" ? "bg-neutral-800 text-white shadow" : "text-neutral-400 hover:text-white"
          }`}
        >
          GIFs
        </button>
      </div>

      {/* Search Input Bar */}
      <div className="relative mb-3 flex-shrink-0">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-neutral-500" />
        <input
          type="text"
          placeholder={`Search Giphy ${tab}...`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-neutral-900 border border-neutral-800/80 rounded-2xl py-2.5 pl-10 pr-4 text-sm outline-none placeholder:text-neutral-600 focus:border-neutral-700 transition-colors text-white"
        />
      </div>

      {/* Recent Gifs row if empty search query */}
      {query.trim() === "" && recents.length > 0 && (
        <div className="flex flex-col gap-1.5 mb-3 flex-shrink-0">
          <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-1 px-1">
            <History className="size-3" /> Recent GIFs
          </span>
          <div className="flex gap-2 overflow-x-auto py-1 scrollbar-none">
            {recents.map((gif) => (
              <button
                key={`recent-${gif.id}`}
                onClick={() => handleSelect(gif)}
                className="w-12 h-12 rounded-xl bg-neutral-900 border border-neutral-850 hover:border-neutral-700 overflow-hidden flex-shrink-0 flex items-center justify-center relative transition-colors"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={gif.previewUrl} alt={gif.title} className="w-full h-full object-cover pointer-events-none" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Grid containing Results with Infinite scroll */}
      <div
        ref={gridContainerRef}
        onScroll={handleScroll}
        className="flex-grow overflow-y-auto scrollbar-none pr-1"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="size-7 animate-spin text-neutral-500" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2 p-4 text-red-400">
            <AlertTriangle className="size-7" />
            <span className="text-xs font-semibold">{error}</span>
          </div>
        ) : results.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-neutral-500 font-medium">
            No results found
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-3 gap-2">
              {results.map((gif) => (
                <div
                  key={gif.id}
                  onClick={() => handleSelect(gif)}
                  className="aspect-square bg-neutral-900 rounded-xl overflow-hidden cursor-pointer border border-neutral-850 hover:border-neutral-600 transition-all flex items-center justify-center relative group"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={gif.previewUrl}
                    alt={gif.title}
                    className="w-full h-full object-cover pointer-events-none group-hover:scale-102 transition-transform"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>

            {/* Bottom loading indicator for pagination */}
            {loadingMore && (
              <div className="flex items-center justify-center py-3">
                <Loader2 className="size-5 animate-spin text-neutral-500" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
