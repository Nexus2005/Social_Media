"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import kyInstance from "@/lib/ky";
import { Loader2, Grid, FolderHeart, Calendar, User, ExternalLink } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface SavedProductsGridProps {
  userId: string;
}

type GroupByOption = "collection" | "category" | "creator";

export default function SavedProductsGrid({ userId }: SavedProductsGridProps) {
  const [groupBy, setGroupBy] = useState<GroupByOption>("collection");

  const { data: collections, isLoading, error } = useQuery({
    queryKey: ["saved-products", userId],
    queryFn: () => kyInstance.get(`/api/users/${userId}/saved-products`).json<any[]>(),
  });

  // Extract all saved products from all collections
  const savedProducts = useMemo(() => {
    if (!collections) return [];
    
    const productsMap = new Map<string, any>();
    
    collections.forEach((col) => {
      // Check both implicit products list and legacy items list
      const itemsList = col.products || [];
      const legacyList = col.items?.map((item: any) => item.product).filter(Boolean) || [];
      const combined = [...itemsList, ...legacyList];

      combined.forEach((prod) => {
        if (!productsMap.has(prod.id)) {
          productsMap.set(prod.id, {
            ...prod,
            savedAt: col.createdAt, // fallback saved date
            collectionName: col.name,
            collectionId: col.id,
          });
        }
      });
    });

    return Array.from(productsMap.values());
  }, [collections]);

  // Group products based on selection
  const groupedData = useMemo(() => {
    if (groupBy === "collection") {
      const groups: { [key: string]: any[] } = {};
      collections?.forEach((col) => {
        const itemsList = col.products || [];
        const legacyList = col.items?.map((item: any) => item.product).filter(Boolean) || [];
        const combined = [...itemsList, ...legacyList];
        
        if (combined.length > 0) {
          groups[col.name] = combined.map(p => ({
            ...p,
            collectionName: col.name,
            collectionId: col.id
          }));
        }
      });
      return Object.entries(groups).map(([title, items]) => ({ title, items }));
    }

    if (groupBy === "category") {
      const groups: { [key: string]: any[] } = {};
      savedProducts.forEach((prod) => {
        const cat = prod.category ? prod.category.charAt(0).toUpperCase() + prod.category.slice(1).toLowerCase() : "Uncategorized";
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(prod);
      });
      return Object.entries(groups).map(([title, items]) => ({ title, items }));
    }

    if (groupBy === "creator") {
      const groups: { [key: string]: any[] } = {};
      savedProducts.forEach((prod) => {
        const creatorName = prod.creator?.displayName || prod.creator?.username || "AI Detected";
        if (!groups[creatorName]) groups[creatorName] = [];
        groups[creatorName].push(prod);
      });
      return Object.entries(groups).map(([title, items]) => ({ title, items }));
    }

    return [];
  }, [groupBy, collections, savedProducts]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-destructive font-medium">
        Failed to load saved products.
      </div>
    );
  }

  if (savedProducts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center select-none">
        <FolderHeart className="size-12 text-zinc-700 mb-3" strokeWidth={1.5} />
        <h3 className="text-[16px] font-bold text-white mb-1">No Saved Products</h3>
        <p className="text-[14px] text-zinc-500 max-w-[280px]">
          Add items to collections in Spot product lists to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-4 px-4 select-none">
      {/* Grouping Filters */}
      <div className="flex items-center gap-2 justify-end">
        <span className="text-xs text-muted-foreground font-semibold mr-1">Group by:</span>
        <div className="flex items-center bg-[#121212] p-0.5 rounded-lg border border-border/20">
          <button
            onClick={() => setGroupBy("collection")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all",
              groupBy === "collection" ? "bg-zinc-800 text-white" : "text-muted-foreground hover:text-zinc-350"
            )}
          >
            <FolderHeart className="size-3.5" />
            <span>Board</span>
          </button>
          <button
            onClick={() => setGroupBy("category")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all",
              groupBy === "category" ? "bg-zinc-800 text-white" : "text-muted-foreground hover:text-zinc-350"
            )}
          >
            <Grid className="size-3.5" />
            <span>Category</span>
          </button>
          <button
            onClick={() => setGroupBy("creator")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all",
              groupBy === "creator" ? "bg-zinc-800 text-white" : "text-muted-foreground hover:text-zinc-350"
            )}
          >
            <User className="size-3.5" />
            <span>Creator</span>
          </button>
        </div>
      </div>

      {/* Group List Display */}
      <div className="space-y-8 pb-10">
        {groupedData.map(({ title, items }) => (
          <div key={title} className="space-y-3.5">
            <h3 className="text-sm font-black tracking-wider text-muted-foreground uppercase pl-1">
              {title} ({items.length})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {items.map((prod) => {
                const bestPrice = prod.matches?.sort((a: any, b: any) => {
                  const numA = parseInt(a.price.replace(/[^0-9]/g, ""), 10);
                  const numB = parseInt(b.price.replace(/[^0-9]/g, ""), 10);
                  return (isNaN(numA) ? Infinity : numA) - (isNaN(numB) ? Infinity : numB);
                })[0];

                return (
                  <div
                    key={prod.id}
                    className="flex flex-col bg-[#121212]/30 border border-border/20 p-3 rounded-2xl hover:bg-[#121212]/60 hover:border-border/30 transition duration-300 group"
                  >
                    <div className="w-full aspect-square rounded-xl overflow-hidden bg-zinc-950 relative mb-3 border border-zinc-900">
                      <img
                        src={prod.thumbnailUrl || prod.sourceFrameUrl || "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=200&auto=format&fit=crop&q=60"}
                        alt={prod.label}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {bestPrice && (
                        <div className="absolute bottom-2.5 right-2.5 bg-black/85 text-white text-[10px] font-black px-2 py-1 rounded-lg">
                          {bestPrice.price}
                        </div>
                      )}
                    </div>

                    <span className="text-xs font-bold text-white capitalize truncate leading-tight block mb-1 px-0.5">
                      {prod.label}
                    </span>
                    {prod.brand && (
                      <span className="text-[10px] text-zinc-500 font-semibold block px-0.5 truncate mb-2.5">
                        {prod.brand}
                      </span>
                    )}

                    <div className="mt-auto flex items-center justify-between gap-1.5 px-0.5 pt-1.5 border-t border-zinc-900/60">
                      <Link
                        href={`/reels?focusedPostId=${prod.postId}`}
                        className="text-[10px] font-extrabold text-muted-foreground hover:text-white flex items-center gap-1 transition"
                      >
                        <ExternalLink className="size-3" />
                        <span>Watch Reel</span>
                      </Link>
                      {bestPrice && (
                        <a
                          href={bestPrice.productUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-black text-black bg-white hover:bg-zinc-200 px-2.5 py-1 rounded-md transition shadow-sm uppercase tracking-wide"
                        >
                          Buy
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
