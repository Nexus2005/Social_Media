"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Image as ImageIcon, Camera, FileText, MapPin, User, ShoppingBag, Film, BookOpen, Layers, Loader2 } from "lucide-react";
import kyInstance from "@/lib/ky";

interface AttachmentPickerProps {
  onClose: () => void;
  onSelectShare: (payload: {
    type: "POST" | "REEL" | "PRODUCT" | "PROFILE" | "COLLECTION";
    id: string;
    title: string;
    thumbnailUrl?: string;
    deepLink: string;
    price?: string;
    originalPrice?: string;
  }) => void;
  onSelectFile: (file: File) => void;
}

export default function AttachmentPicker({ onClose, onSelectShare, onSelectFile }: AttachmentPickerProps) {
  const [activeSheet, setActiveSheet] = useState<"menu" | "products" | "reels" | "posts" | "collections" | "profiles">("menu");
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch shareable elements from API
  const fetchItems = async (type: string, query: string) => {
    try {
      setLoading(true);
      let endpoint = "";
      if (type === "products") endpoint = `/api/search?q=${query}&type=products`;
      else if (type === "posts") endpoint = `/api/posts?q=${query}`;
      else if (type === "profiles") endpoint = `/api/users/suggestions`; // suggestions list as proxy
      else if (type === "collections") endpoint = `/api/saved-collections`; // fetch saved collections

      const data = await kyInstance.get(endpoint).json<any>();
      
      // Map API outputs to unified picker interface
      if (type === "products") {
        setItems((data.products || []).map((p: any) => {
          const match = p.matches?.[0];
          return {
            id: p.id,
            title: p.label,
            thumb: p.thumbnailUrl || p.sourceFrameUrl,
            link: `/shop/product/${p.id}`,
            price: match?.price || "₹2,499",
            originalPrice: (() => {
              if (!match || !match.price) return "₹3,499";
              const numStr = match.price.replace(/[^\d.]/g, "");
              const val = parseFloat(numStr);
              if (isNaN(val)) return "₹3,499";
              const isINR = match.currency === "INR" || match.price.includes("₹");
              const symbol = isINR ? "₹" : "$";
              return `${symbol}${Math.round(val * 1.4)}`;
            })()
          };
        }));
      } else if (type === "posts") {
        setItems((data.posts || []).map((p: any) => ({ id: p.id, title: p.content, thumb: p.attachments?.[0]?.url, link: `/posts/${p.id}` })));
      } else if (type === "profiles") {
        setItems((data || []).map((u: any) => ({ id: u.id, title: u.displayName, thumb: u.avatarUrl, link: `/users/${u.username}` })));
      } else if (type === "collections") {
        setItems((data || []).map((c: any) => ({ id: c.id, title: c.name, thumb: undefined, link: `/collections/${c.id}` })));
      }
    } catch (error) {
      console.error(`Failed to load ${type}:`, error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectType = (type: "products" | "reels" | "posts" | "collections" | "profiles") => {
    setActiveSheet(type);
    setItems([]);
    fetchItems(type, "");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onSelectFile(e.target.files[0]);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose}>
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-0 left-0 right-0 max-h-[85vh] rounded-t-2xl bg-background p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-xl flex flex-col"
        >
          {/* Snap Drag Handle */}
          <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-zinc-300" />

          {/* Main Action Menu Sheet */}
          {activeSheet === "menu" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="font-semibold text-base text-foreground">Share Attachment</span>
                <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted text-muted-foreground">
                  <X className="size-5" />
                </button>
              </div>

              {/* Grid 1: Basic Files and Camera */}
              <div className="grid grid-cols-4 gap-x-2 gap-y-5 p-2 text-center text-[11px] font-medium text-muted-foreground">
                <label className="flex cursor-pointer flex-col items-center gap-2 hover:opacity-85">
                  <input type="file" className="hidden" onChange={handleFileChange} />
                  <div className="flex size-11 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                    <ImageIcon className="size-5" />
                  </div>
                  <span>Gallery</span>
                </label>
                <div className="flex cursor-pointer flex-col items-center gap-2 hover:opacity-85">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                    <Camera className="size-5" />
                  </div>
                  <span>Camera</span>
                </div>
                <label className="flex cursor-pointer flex-col items-center gap-2 hover:opacity-85">
                  <input type="file" className="hidden" onChange={handleFileChange} />
                  <div className="flex size-11 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                    <FileText className="size-5" />
                  </div>
                  <span>File</span>
                </label>
                <div className="flex cursor-pointer flex-col items-center gap-2 hover:opacity-85">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                    <MapPin className="size-5" />
                  </div>
                  <span>Location</span>
                </div>
              </div>

              {/* Grid 2: Cartly-specific Social Commerce shares */}
              <div className="border-t pt-4">
                <span className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cartly Shares</span>
                <div className="grid grid-cols-4 gap-x-2 gap-y-5 p-2 mt-2 text-center text-[11px] font-medium text-muted-foreground">
                  <button onClick={() => handleSelectType("products")} className="flex flex-col items-center gap-2 hover:opacity-85">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                      <ShoppingBag className="size-5" />
                    </div>
                    <span>Product</span>
                  </button>
                  <button onClick={() => handleSelectType("posts")} className="flex flex-col items-center gap-2 hover:opacity-85">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                      <Layers className="size-5" />
                    </div>
                    <span>Post</span>
                  </button>
                  <button onClick={() => handleSelectType("profiles")} className="flex flex-col items-center gap-2 hover:opacity-85">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                      <User className="size-5" />
                    </div>
                    <span>Profile</span>
                  </button>
                  <button onClick={() => handleSelectType("collections")} className="flex flex-col items-center gap-2 hover:opacity-85">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                      <BookOpen className="size-5" />
                    </div>
                    <span>Collection</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Social Commerce Item Selector Sheets */}
          {activeSheet !== "menu" && (
            <div className="flex flex-col h-[50vh]">
              <div className="flex items-center gap-3 border-b pb-3">
                <button onClick={() => setActiveSheet("menu")} className="text-sm font-semibold text-primary hover:underline">
                  Back
                </button>
                <input
                  type="text"
                  placeholder={`Search ${activeSheet}...`}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    fetchItems(activeSheet, e.target.value);
                  }}
                  className="flex-1 rounded-lg border bg-muted px-3 py-1.5 text-sm focus:outline-none"
                  autoFocus
                />
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto mt-2">
                {loading ? (
                  <div className="flex h-32 items-center justify-center">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          onSelectShare({
                            type: activeSheet === "products" ? "PRODUCT" : activeSheet === "posts" ? "POST" : activeSheet === "profiles" ? "PROFILE" : "COLLECTION",
                            id: item.id,
                            title: item.title,
                            thumbnailUrl: item.thumb,
                            deepLink: item.link,
                            price: (item as any).price,
                            originalPrice: (item as any).originalPrice,
                          });
                          onClose();
                        }}
                        className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/50 text-start w-full"
                      >
                        {item.thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.thumb} alt={item.title} className="size-10 rounded object-cover border" />
                        ) : (
                          <div className="flex size-10 items-center justify-center rounded bg-muted">
                            <Layers className="size-5 text-muted-foreground" />
                          </div>
                        )}
                        <span className="text-sm font-medium truncate">{item.title}</span>
                      </button>
                    ))}
                    {items.length === 0 && (
                      <p className="text-center text-sm text-muted-foreground mt-8">No items found.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
