"use client";

import React, { useState, useEffect } from "react";
import { Smile, Gift, Layers, Search, Loader2, History } from "lucide-react";
import { motion } from "framer-motion";
import kyInstance from "@/lib/ky";

interface StickerPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onSelectGif: (url: string) => void;
  onSelectSticker: (url: string) => void;
}

const EMOJIS = [
  "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", 
  "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "😏", 
  "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", 
  "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🤭", "🤫", "🤥", 
  "😶", "😐", "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐", 
  "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕", "🤑", "🤠", "😈", "👿", "👹", "👹", "💀", "☠️", "👽"
];

const STATIC_STICKERS = [
  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f600/512.webp",
  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f609/512.webp",
  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f60d/512.webp",
  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f929/512.webp",
  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f914/512.webp",
  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f618/512.webp",
  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f60e/512.webp",
  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f602/512.webp",
  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f923/512.webp",
  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f60a/512.webp",
  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f607/512.webp",
  "https://fonts.gstatic.com/s/e/notoemoji/latest/1f61b/512.webp"
];

export default function StickerPicker({ onSelectEmoji, onSelectGif, onSelectSticker }: StickerPickerProps) {
  const [activeTab, setActiveTab] = useState<"recent" | "emoji" | "gif" | "sticker">("emoji");
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  
  // GIF state
  const [gifs, setGifs] = useState<string[]>([]);
  const [gifQuery, setGifQuery] = useState("");
  const [loadingGifs, setLoadingGifs] = useState(false);

  // Load recent emojis from local storage
  useEffect(() => {
    const stored = localStorage.getItem("cartly-recent-emojis");
    if (stored) {
      try {
        setRecentEmojis(JSON.parse(stored));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handleEmojiClick = (emoji: string) => {
    onSelectEmoji(emoji);
    setRecentEmojis((prev) => {
      const filtered = prev.filter((e) => e !== emoji);
      const updated = [emoji, ...filtered].slice(0, 32);
      localStorage.setItem("cartly-recent-emojis", JSON.stringify(updated));
      return updated;
    });
  };

  const fetchGifs = async (query: string) => {
    try {
      setLoadingGifs(true);
      const apiKey = process.env.NEXT_PUBLIC_GIPHY_API_KEY || "5N7a5gqhRaOStUVZlVxVJOZxXXHlSVdZ";
      const endpoint = query 
        ? `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${query}&limit=24&rating=g`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=24&rating=g`;

      const response = await fetch(endpoint);
      const data = await response.json();
      
      if (data.data) {
        setGifs(data.data.map((item: any) => item.images.fixed_height.url));
      }
    } catch (error) {
      console.error("Giphy API fetch failed:", error);
    } finally {
      setLoadingGifs(false);
    }
  };

  useEffect(() => {
    if (activeTab === "gif") {
      fetchGifs("");
    }
  }, [activeTab]);

  return (
    <div className="flex h-64 flex-col border-t bg-card select-none">
      {/* Search Bar for GIFs */}
      {activeTab === "gif" && (
        <div className="relative border-b px-3 py-2 flex items-center bg-muted/20">
          <Search className="absolute left-6 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search Giphy..."
            value={gifQuery}
            onChange={(e) => {
              setGifQuery(e.target.value);
              fetchGifs(e.target.value);
            }}
            className="w-full rounded-full border bg-background py-1.5 pe-4 ps-10 text-sm focus:outline-none"
          />
        </div>
      )}

      {/* Grid Content Area */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === "recent" && (
          <div>
            {recentEmojis.length > 0 ? (
              <div className="grid grid-cols-8 gap-2 text-center text-2xl">
                {recentEmojis.map((emoji, i) => (
                  <button
                    key={i}
                    onClick={() => handleEmojiClick(emoji)}
                    className="rounded p-1 transition-transform hover:scale-125 hover:bg-muted/50"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground mt-12">
                No recently used emojis.
              </p>
            )}
          </div>
        )}

        {activeTab === "emoji" && (
          <div className="grid grid-cols-8 gap-2 text-center text-2xl">
            {EMOJIS.map((emoji, i) => (
              <button
                key={i}
                onClick={() => handleEmojiClick(emoji)}
                className="rounded p-1 transition-transform hover:scale-125 hover:bg-muted/50"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {activeTab === "sticker" && (
          <div className="grid grid-cols-4 gap-3">
            {STATIC_STICKERS.map((url, i) => (
              <button
                key={i}
                onClick={() => onSelectSticker(url)}
                className="aspect-square relative cursor-pointer overflow-hidden rounded-lg p-2 transition-transform hover:scale-105 hover:bg-muted/50 flex items-center justify-center"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="Animated sticker" className="size-16 object-contain" />
              </button>
            ))}
          </div>
        )}

        {activeTab === "gif" && (
          loadingGifs ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {gifs.map((url, i) => (
                <button
                  key={i}
                  onClick={() => onSelectGif(url)}
                  className="aspect-video relative cursor-pointer overflow-hidden rounded bg-muted hover:opacity-90 flex items-center justify-center"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="GIF" className="h-full w-full object-cover" />
                </button>
              ))}
              {gifs.length === 0 && (
                <p className="col-span-3 text-center text-sm text-muted-foreground mt-12">
                  No GIFs found.
                </p>
              )}
            </div>
          )
        )}
      </div>

      {/* Footer Navigation Bar */}
      <div className="flex h-12 border-t text-muted-foreground bg-muted/30">
        <button
          onClick={() => setActiveTab("recent")}
          className={`flex flex-1 items-center justify-center py-2 transition-colors ${
            activeTab === "recent" ? "text-primary" : "hover:text-foreground"
          }`}
          title="Recent"
        >
          <History className="size-5" />
        </button>
        <button
          onClick={() => setActiveTab("emoji")}
          className={`flex flex-1 items-center justify-center py-2 transition-colors ${
            activeTab === "emoji" ? "text-primary" : "hover:text-foreground"
          }`}
          title="Emojis"
        >
          <Smile className="size-5" />
        </button>
        <button
          onClick={() => setActiveTab("sticker")}
          className={`flex flex-1 items-center justify-center py-2 transition-colors ${
            activeTab === "sticker" ? "text-primary" : "hover:text-foreground"
          }`}
          title="Stickers"
        >
          <Layers className="size-5" />
        </button>
        <button
          onClick={() => setActiveTab("gif")}
          className={`flex flex-1 items-center justify-center py-2 transition-colors ${
            activeTab === "gif" ? "text-primary" : "hover:text-foreground"
          }`}
          title="GIFs"
        >
          <Gift className="size-5" />
        </button>
      </div>
    </div>
  );
}
