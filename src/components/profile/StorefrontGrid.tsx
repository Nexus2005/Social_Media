"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import kyInstance from "@/lib/ky";
import { Loader2, Share2, Grid, ArrowUpRight, Folder, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { cn, formatNumber } from "@/lib/utils";
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
    
    const itemsList = selectedCol.products || [];
    const legacyList = selectedCol.items?.map((item: any) => item.product).filter(Boolean) || [];
    const combinedIds = new Set([...itemsList, legacyList].flatMap(list => (Array.isArray(list) ? list : [list]).filter(Boolean).map(p => p.id)));
    
    return products.filter(p => combinedIds.has(p.id));
  }, [activeCollectionId, collections, products]);

  const featuredProducts = useMemo(() => {
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
      <div className="flex justify-center py-12 bg-black">
        <Loader2 className="size-5 animate-spin text-[#A1A1AA]" strokeWidth={1.75} />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="text-center py-8 text-[#EF4444] text-sm font-semibold bg-black">
        Failed to load storefront details.
      </div>
    );
  }

  return (
    <div className="space-y-8 select-none pb-12 bg-black text-[#FFFFFF] font-sans px-4">
      {/* 1. Shop Header */}
      <div className="pt-6 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1A1A1A]">
        <div className="flex items-center gap-3">
          <UserAvatar avatarUrl={profile.avatarUrl} size={56} className="border border-[#1A1A1A] rounded-full" />
          <div className="flex flex-col">
            <h2 className="text-[28px] font-semibold tracking-tight text-white leading-tight">
              {profile.displayName}&apos;s Shop
            </h2>
            <span className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider mt-1">
              {formatNumber(followData?.followers || profile._count.followers)} Followers
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isOwner && (
            <button
              onClick={() => toggleFollow()}
              className={cn(
                "h-9 px-4 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center",
                followData?.isFollowedByUser
                  ? "bg-[#111111] text-[#FFFFFF] border border-[#1A1A1A] hover:bg-[#1A1A1A]"
                  : "bg-white text-black hover:bg-zinc-200"
              )}
            >
              {followData?.isFollowedByUser ? "Following" : "Follow"}
            </button>
          )}
          <button
            onClick={handleShareShop}
            className="w-11 h-9 rounded-lg bg-[#0A0A0A] border border-[#1A1A1A] text-[#A1A1AA] hover:text-white flex items-center justify-center transition"
            title="Share Shop"
          >
            <Share2 className="size-5" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {profile.bio && (
        <p className="text-sm text-[#A1A1AA] leading-relaxed max-w-xl">
          {profile.bio}
        </p>
      )}

      {/* 2. Collections (Horizontal Slider) */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-white">Collections</h3>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
          {/* "All" Card */}
          <button
            onClick={() => setActiveCollectionId("all")}
            className={cn(
              "flex flex-col items-center w-[90px] flex-shrink-0 snap-center transition-all",
              activeCollectionId === "all" ? "scale-100" : "opacity-70"
            )}
          >
            <div className={cn(
              "w-16 h-16 rounded-2xl flex items-center justify-center bg-[#0A0A0A] mb-2 transition border",
              activeCollectionId === "all" ? "border-white" : "border-[#1A1A1A]"
            )}>
              <Grid className="size-5 text-white" strokeWidth={1.75} />
            </div>
            <span className="text-xs font-semibold text-white text-center truncate w-full">All Items</span>
          </button>

          {/* User Collections */}
          {collections.map((col) => {
            const isActive = activeCollectionId === col.id;
            const count = (col.products?.length || 0) + (col.items?.length || 0);
            return (
              <button
                key={col.id}
                onClick={() => setActiveCollectionId(col.id)}
                className={cn(
                  "flex flex-col items-center w-[90px] flex-shrink-0 snap-center transition-all",
                  isActive ? "scale-100" : "opacity-70"
                )}
              >
                <div className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center bg-[#0A0A0A] mb-2 transition border relative overflow-hidden",
                  isActive ? "border-white" : "border-[#1A1A1A]"
                )}>
                  {col.coverImage ? (
                    <img src={col.coverImage} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <Folder className="size-5 text-white" strokeWidth={1.75} />
                  )}
                  <span className="absolute bottom-1 right-1.5 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-semibold text-[#A1A1AA]">
                    {count}
                  </span>
                </div>
                <span className="text-xs font-semibold text-white text-center truncate w-full">{col.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Featured Products Section */}
      {featuredProducts.length > 0 && activeCollectionId === "all" && (
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-white">Featured Products</h3>
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
                  className="flex flex-col w-[150px] flex-shrink-0 bg-[#0A0A0A] border border-[#1A1A1A] p-2.5 rounded-xl snap-center"
                >
                  <div className="w-full aspect-square rounded-lg overflow-hidden bg-black mb-2 relative border border-[#1A1A1A]">
                    <img
                      src={prod.thumbnailUrl || prod.sourceFrameUrl || "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=200&auto=format&fit=crop&q=60"}
                      alt={prod.label}
                      className="w-full h-full object-cover"
                    />
                    {bestPrice && (
                      <span className="absolute bottom-1.5 right-1.5 bg-black/80 px-1.5 py-0.5 rounded text-[12px] font-semibold text-white">
                        {bestPrice.price}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-white truncate block">
                    {prod.label}
                  </span>
                  {prod.brand && (
                    <span className="text-xs text-[#A1A1AA] truncate block mt-0.5">
                      {prod.brand}
                    </span>
                  )}
                  {bestPrice && (
                    <a
                      href={bestPrice.productUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 w-full h-8 leading-8 text-center bg-white text-black hover:bg-zinc-200 text-xs font-semibold rounded-lg transition-colors block uppercase tracking-wider"
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

      {/* 4. All Products Grid */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between border-t border-[#1A1A1A] pt-4">
          <h3 className="text-base font-semibold text-white">
            {activeCollectionId === "all" ? "All Products" : "Collection Products"}
          </h3>
          {activeCollectionId !== "all" && (
            <button
              onClick={() => setActiveCollectionId("all")}
              className="text-xs font-semibold text-[#A1A1AA] hover:text-white transition"
            >
              Clear Filter
            </button>
          )}
        </div>

        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center select-none bg-[#0A0A0A] border border-zinc-850 rounded-2xl">
            <ShoppingBag className="size-12 text-zinc-700 mb-3" strokeWidth={1.5} />
            <h3 className="text-[16px] font-bold text-white mb-1">No Products Found</h3>
            <p className="text-[14px] text-zinc-500 max-w-[280px]">
              There are no products listed in this section of the storefront.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pb-8">
            {filteredProducts.map((prod) => {
              const bestPrice = prod.matches?.sort((a: any, b: any) => {
                const numA = parseInt(a.price.replace(/[^0-9]/g, ""), 10);
                const numB = parseInt(b.price.replace(/[^0-9]/g, ""), 10);
                return (isNaN(numA) ? Infinity : numA) - (isNaN(numB) ? Infinity : numB);
              })[0];

              const reelPostId = prod.postId || prod.assignments?.[0]?.postId;

              return (
                <div
                  key={prod.id}
                  className="flex flex-col bg-[#0A0A0A] border border-[#1A1A1A] p-3 rounded-xl hover:bg-[#111111] transition duration-200 group"
                >
                  <div className="w-full aspect-square rounded-lg overflow-hidden bg-black relative mb-2.5 border border-[#1A1A1A]">
                    <img
                      src={prod.thumbnailUrl || prod.sourceFrameUrl || "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=200&auto=format&fit=crop&q=60"}
                      alt={prod.label}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {bestPrice && (
                      <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[12px] font-semibold px-2 py-0.5 rounded">
                        {bestPrice.price}
                      </div>
                    )}
                  </div>

                  <span className="text-sm font-semibold text-white truncate block mb-0.5">
                    {prod.label}
                  </span>
                  {prod.brand && (
                    <span className="text-xs text-[#A1A1AA] truncate block mb-2">
                      {prod.brand}
                    </span>
                  )}

                  <div className="mt-auto flex items-center justify-between gap-2 pt-2 border-t border-[#1A1A1A]/80">
                    {reelPostId ? (
                      <Link
                        href={`/reels?focusedPostId=${reelPostId}`}
                        className="text-xs font-semibold text-[#A1A1AA] hover:text-white flex items-center gap-1 transition"
                      >
                        <ArrowUpRight className="size-4" strokeWidth={1.75} />
                        <span>Watch</span>
                      </Link>
                    ) : (
                      <span className="text-[12px] font-semibold text-[#71717A] uppercase">Store</span>
                    )}
                    {bestPrice && (
                      <a
                        href={bestPrice.productUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-black bg-white hover:bg-zinc-200 px-3 py-1 rounded transition-colors uppercase tracking-wide"
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
