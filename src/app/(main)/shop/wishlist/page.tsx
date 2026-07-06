"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWishlist } from "@/features/shop/contexts/WishlistContext";
import { ProductService } from "@/features/shop/services/product";
import { Product } from "@/features/shop/types";
import ProductCard from "@/features/shop/components/ProductCard";
import { ChevronLeft, Heart, Loader2 } from "lucide-react";

export default function ShopWishlistPage() {
  const router = useRouter();
  const { wishlistIds } = useWishlist();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadWishlistProducts = async () => {
      setIsLoading(true);
      try {
        if (wishlistIds.length === 0) {
          setProducts([]);
        } else {
          const all = await ProductService.getProducts({ limit: 50 });
          setProducts(all.filter((p) => wishlistIds.includes(p.id)));
        }
      } catch (e) {
        console.warn("Error loading wishlist products:", e);
      } finally {
        setIsLoading(false);
      }
    };

    loadWishlistProducts();
  }, [wishlistIds]);

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 md:px-6 py-6 pb-24 text-white text-left select-none animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-8 select-none">
        <button
          onClick={() => router.push("/shop")}
          className="p-2 bg-zinc-900/40 border border-zinc-850 hover:bg-zinc-850 rounded-xl text-zinc-350 hover:text-white cursor-pointer transition-colors"
        >
          <ChevronLeft className="size-4.5" />
        </button>
        <div>
          <h1 className="text-lg font-black text-white tracking-tight">Saved Wishlist</h1>
          <p className="text-[10px] text-zinc-550 font-semibold mt-0.5">
            {wishlistIds.length} saved products
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="size-6 animate-spin text-indigo-400" />
          <span className="text-xs text-zinc-500">Loading wishlist items...</span>
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3 bg-zinc-900/20 border border-zinc-850/60 rounded-3xl p-8">
          <div className="p-3.5 bg-zinc-900 rounded-full border border-zinc-850">
            <Heart className="size-6 text-zinc-550" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Your wishlist is empty</h2>
            <p className="text-xs text-zinc-550 mt-1 max-w-xs">
              Save items you love by tapping the heart icon on product cards while browsing!
            </p>
          </div>
          <button
            onClick={() => router.push("/shop")}
            className="mt-2 px-5 py-2 bg-indigo-650 hover:bg-indigo-600 text-xs font-black text-white rounded-xl cursor-pointer"
          >
            Explore Shop
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {products.map((prod) => (
            <ProductCard key={prod.id} product={prod} />
          ))}
        </div>
      )}

    </div>
  );
}
