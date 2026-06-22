"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import kyInstance from "@/lib/ky";
import { Loader2, Share2, Heart, Award, Grid, ArrowUpRight, Folder } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import UserAvatar from "@/components/UserAvatar";

interface StorefrontGridProps {
  userId: string;
  isOwner: boolean;
}

export default function StorefrontGrid({ userId, isOwner }: StorefrontGridProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: storefront, isLoading, error } = useQuery({
    queryKey: ["storefront", userId],
    queryFn: () => kyInstance.get(`/api/users/${userId}/storefront`).json<{
      profile: any;
      collections: any[];
      products: any[];
    }>(),
  });

  const [activeCollectionId, setActiveCollectionId] = useState<string>("all");

  const profile = storefront?.profile;
  const collections = storefront?.collections || [];
  const products = storefront?.products || [];

  // Follow Shop / Creator Logic
  const followQueryKey = ["shop-follower-info", userId];
  const { data: followData } = useQuery({
    queryKey: followQueryKey,
    queryFn: async () => {
      // Fetch user follower details
      const res = await kyInstance.get(`/api/users/${userId}/followers`).json<{
        followers: number;
        isFollowedByUser: boolean;
      }>();
      return res;
    },
    enabled: !!profile,
  });

  const { mutate: toggleFollow } = useMutation({
    mutationFn: () =>
      followData?.isFollowedByUser
        ? kyInstance.delete(`/api/users/${userId}/followers`)
        : kyInstance.post(`/api/users/${userId}/followers`),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: followQueryKey });
      const previousState = queryClient.getQueryData<any>(followQueryKey);

      queryClient.setQueryData(followQueryKey, (old: any) => ({
        followers: (old?.followers || 0) + (old?.isFollowedByUser ? -1 : 1),
        isFollowedByUser: !old?.isFollowedByUser,
      }));

      return { previousState };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(followQueryKey, context?.previousState);
      console.error(err);
    },
  });

  // Filter products by selected collection
  const filteredProducts = useMemo(() => {
    if (activeCollectionId === "all") return products;
    const selectedCol = collections.find(c => c.id === activeCollectionId);
    if (!selectedCol) return products;
    
    // Check both implicit products list and legacy items list
    const itemsList = selectedCol.products || [];
    const legacyList = selectedCol.items?.map((item: any) => item.product).filter(Boolean) || [];
    const combinedIds = new Set([...itemsList, ...legacyList].map(p => p.id));
    
    return products.filter(p => combinedIds.has(p.id));
  }, [activeCollectionId, collections, products]);

  const featuredProducts = useMemo(() => {
    // Sort products by featured first, then display order
    return products.filter(p => p.featured || p.assignments?.some((a: any) => a.featured));
  }, [products]);

  const handleShareShop = () => {
    const shopUrl = `${window.location.origin}/users/${profile?.username}?tab=storefront`;
    navigator.clipboard.writeText(shopUrl);
    toast({
      description: "Shop link copied to clipboard.",
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="text-center py-8 text-destructive font-medium">
        Failed to load storefront details.
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none pb-12">
      {/* 1. HERO SHOP BANNER */}
      <div className="relative w-full h-[140px] sm:h-[180px] bg-zinc-950 overflow-hidden border-b border-zinc-900">
        <img
          src={profile.headerBannerUrl || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1000&auto=format&fit=crop&q=80"}
          alt="Shop Banner"
          className="w-full h-full object-cover opacity-40 blur-[2px]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" />
        
        {/* Banner Details Overlay */}
        <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <UserAvatar avatarUrl={profile.avatarUrl} size={54} className="border border-white/20" />
            <div className="flex flex-col text-white">
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-1">
                <span>{profile.displayName}&apos;s Shop</span>
                <Award className="size-4.5 text-yellow-500 fill-yellow-500" />
              </h2>
              <span className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider mt-0.5">
                {followData?.followers || profile._count.followers} FOLLOWERS
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isOwner && (
              <button
                onClick={() => toggleFollow()}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all",
                  followData?.isFollowedByUser
                    ? "bg-zinc-800 text-white hover:bg-zinc-700"
                    : "bg-white text-black hover:bg-zinc-200"
                )}
              >
                {followData?.isFollowedByUser ? "Following Shop" : "Follow Shop"}
              </button>
            )}
            <button
              onClick={handleShareShop}
              className="p-2 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white transition"
              title="Share Shop"
            >
              <Share2 className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bio / Tagline */}
      {profile.bio && (
        <p className="text-xs text-zinc-400 px-4 leading-relaxed max-w-xl">
          {profile.bio}
        </p>
      )}

      {/* 2. FEATURED PRODUCTS (IF ANY) */}
      {featuredProducts.length > 0 && (
        <div className="space-y-3 px-4">
          <h3 className="text-xs font-black tracking-wider text-muted-foreground uppercase">
            FEATURED PICKS
          </h3>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
            {featuredProducts.map((prod) => {
              const bestPrice = prod.matches?.sort((a: any, b: any) => {
                const numA = parseInt(a.price.replace(/[^0-9]/g, ""), 10);
                const numB = parseInt(b.price.replace(/[^0-9]/g, ""), 10);
                return (isNaN(numA) ? Infinity : numA) - (isNaN(numB) ? Infinity : numB);
              })[0];

              return (
                <div
                  key={prod.id}
                  className="flex flex-col w-[160px] flex-shrink-0 bg-[#121212]/30 border border-border/20 p-2.5 rounded-2xl snap-center"
                >
                  <div className="w-full aspect-square rounded-xl overflow-hidden bg-zinc-950 mb-2.5 relative border border-zinc-900">
                    <img
                      src={prod.thumbnailUrl || prod.sourceFrameUrl || "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=200&auto=format&fit=crop&q=60"}
                      alt={prod.label}
                      className="w-full h-full object-cover"
                    />
                    {bestPrice && (
                      <span className="absolute bottom-1.5 right-1.5 bg-black/80 px-1.5 py-0.5 rounded text-[9px] font-black text-white">
                        {bestPrice.price}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-bold text-white capitalize truncate leading-tight block mb-0.5">
                    {prod.label}
                  </span>
                  {prod.brand && (
                    <span className="text-[9px] text-zinc-500 font-semibold block truncate">
                      {prod.brand}
                    </span>
                  )}
                  {bestPrice && (
                    <a
                      href={bestPrice.productUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2.5 w-full text-center bg-white text-black hover:bg-zinc-200 text-[10px] font-black py-1.5 rounded-lg transition uppercase tracking-wider"
                    >
                      Buy Deal
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. COLLECTION SELECTOR TABS */}
      <div className="px-4 space-y-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-zinc-900 scrollbar-none">
          <button
            onClick={() => setActiveCollectionId("all")}
            className={cn(
              "text-xs font-bold transition-all pb-2 px-1 relative shrink-0",
              activeCollectionId === "all" ? "text-white" : "text-zinc-500 hover:text-zinc-350"
            )}
          >
            All Items ({products.length})
            {activeCollectionId === "all" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" />
            )}
          </button>

          {collections.map((col) => {
            const colProdsCount = (col.products?.length || 0) + (col.items?.length || 0);
            return (
              <button
                key={col.id}
                onClick={() => setActiveCollectionId(col.id)}
                className={cn(
                  "text-xs font-bold transition-all pb-2 px-1 relative shrink-0",
                  activeCollectionId === col.id ? "text-white" : "text-zinc-500 hover:text-zinc-350"
                )}
              >
                {col.name} ({colProdsCount})
                {activeCollectionId === col.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* 4. PRODUCTS GRID DISPLAY */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm font-medium border border-dashed border-zinc-800 rounded-2xl">
            No products found in this section.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pb-8">
            {filteredProducts.map((prod) => {
              const bestPrice = prod.matches?.sort((a: any, b: any) => {
                const numA = parseInt(a.price.replace(/[^0-9]/g, ""), 10);
                const numB = parseInt(b.price.replace(/[^0-9]/g, ""), 10);
                return (isNaN(numA) ? Infinity : numA) - (isNaN(numB) ? Infinity : numB);
              })[0];

              // Find associated reel post if available
              const reelPostId = prod.postId || prod.assignments?.[0]?.postId;

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
                    {reelPostId ? (
                      <Link
                        href={`/reels?focusedPostId=${reelPostId}`}
                        className="text-[10px] font-extrabold text-muted-foreground hover:text-white flex items-center gap-1 transition"
                      >
                        <ArrowUpRight className="size-3" />
                        <span>Watch Reel</span>
                      </Link>
                    ) : (
                      <span className="text-[9px] font-bold text-zinc-600 uppercase">Store Only</span>
                    )}
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
        )}
      </div>
    </div>
  );
}
