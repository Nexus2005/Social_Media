"use client";

import { useEffect, useState } from "react";
import { Search, Loader2 } from "lucide-react";

interface GifPickerProps {
  onSelect: (url: string) => void;
  onClose?: () => void;
}

export default function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"stickers" | "gifs">("stickers");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_GIPHY_API_KEY;

  useEffect(() => {
    const fetchGiphy = async () => {
      if (!apiKey) return;
      setLoading(true);
      try {
        let endpoint = "";
        if (query.trim() === "") {
          endpoint =
            tab === "stickers"
              ? `https://api.giphy.com/v1/stickers/trending?api_key=${apiKey}&limit=30&rating=g`
              : `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=30&rating=g`;
        } else {
          endpoint =
            tab === "stickers"
              ? `https://api.giphy.com/v1/stickers/search?api_key=${apiKey}&q=${encodeURIComponent(
                  query
                )}&limit=30&rating=g`
              : `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(
                  query
                )}&limit=30&rating=g`;
        }

        const res = await fetch(endpoint);
        const json = await res.json();
        if (json.data) {
          setResults(json.data);
        }
      } catch (err) {
        console.error("Giphy fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    const delayDebounce = setTimeout(() => {
      fetchGiphy();
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [query, tab, apiKey]);

  return (
    <div className="flex flex-col h-[380px] bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl p-4 text-white">
      {/* Tab Selectors */}
      <div className="flex gap-2 mb-3 bg-neutral-950 p-1 rounded-xl">
        <button
          onClick={() => setTab("stickers")}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            tab === "stickers" ? "bg-neutral-800 text-white" : "text-neutral-400 hover:text-white"
          }`}
        >
          Stickers
        </button>
        <button
          onClick={() => setTab("gifs")}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            tab === "gifs" ? "bg-neutral-800 text-white" : "text-neutral-400 hover:text-white"
          }`}
        >
          GIFs
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400 pointer-events-none" />
        <input
          type="text"
          placeholder={`Search Giphy ${tab}...`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2 pl-9 pr-4 text-sm outline-none placeholder:text-neutral-500 focus:border-neutral-700 transition-colors"
        />
      </div>

      {/* Grid of Results */}
      <div className="flex-grow overflow-y-auto scrollbar-none pr-1">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="size-6 animate-spin text-neutral-500" />
          </div>
        ) : results.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-neutral-500">
            No results found
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {results.map((gif) => {
              // Extract the fixed height or original downsized URL
              const url = gif.images?.fixed_width_small?.url || gif.images?.downsized?.url;
              if (!url) return null;
              return (
                <div
                  key={gif.id}
                  onClick={() => onSelect(url)}
                  className="aspect-square bg-neutral-950 rounded-lg overflow-hidden cursor-pointer border border-neutral-800 hover:scale-102 hover:border-neutral-600 transition-all flex items-center justify-center relative group"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={gif.title || "Giphy"}
                    className="w-full h-full object-contain pointer-events-none"
                    loading="lazy"
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
