"use client";

import React, { useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { Product } from "../types";
import { useWishlist } from "../contexts/WishlistContext";
import { useCart } from "../contexts/CartContext";
import { Heart, ShoppingCart, Star, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

interface ProductCardProps {
  product: Product;
  className?: string;
}

export default function ProductCard({ product, className }: ProductCardProps) {
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const wishlisted = isWishlisted(product.id);
  const bestVariant = product.variants?.[0];

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!bestVariant) {
      toast({
        variant: "destructive",
        description: "No variants available for this product.",
      });
      return;
    }

    startTransition(async () => {
      await addToCart(bestVariant.id, 1);
    });
  };

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id);
  };

  return (
    <div
      className={cn(
        "flex flex-col bg-zinc-900/40 border border-zinc-850 hover:border-zinc-700/80 p-3 rounded-2xl transition-all duration-300 group/pcard justify-between w-full h-[360px] relative shadow-lg hover:shadow-black/40 select-none",
        className
      )}
    >
      <Link href={`/shop/products/${product.slug}`} className="flex flex-col flex-1">
        {/* Image Display */}
        <div className="w-full aspect-[4/5] max-h-[170px] bg-zinc-950 rounded-xl overflow-hidden relative border border-zinc-900/40 shrink-0">
          <img
            src={product.images[0]}
            alt={product.title}
            className="w-full h-full object-cover group-hover/pcard:scale-105 transition-transform duration-500"
          />

          {/* Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/pcard:opacity-100 transition-opacity" />

          {/* Discount Badge */}
          {product.discountPercentage && product.discountPercentage > 0 && (
            <span className="absolute top-2 left-2 text-[8.5px] font-black text-white bg-indigo-650 px-2 py-0.5 rounded-md tracking-wider shadow-sm uppercase">
              {product.discountPercentage}% OFF
            </span>
          )}

          {/* Free Delivery Badge */}
          {product.freeDelivery && (
            <span className="absolute bottom-2 left-2 text-[7.5px] font-bold text-emerald-400 bg-black/75 border border-emerald-950 px-1.5 py-0.5 rounded uppercase select-none">
              Free Delivery
            </span>
          )}

          {/* Heart Button Overlay */}
          <button
            onClick={handleWishlistClick}
            className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/85 text-zinc-300 hover:text-white rounded-full border border-white/5 shadow-md cursor-pointer transition-colors"
          >
            <Heart
              className={cn("size-3", wishlisted ? "fill-rose-500 text-rose-500" : "text-zinc-300")}
              strokeWidth={2.5}
            />
          </button>
        </div>

        {/* Product Info Block */}
        <div className="flex-1 flex flex-col justify-between mt-3 px-0.5 text-left">
          <div>
            {/* Brand Title */}
            <span className="text-[9.5px] font-bold tracking-wide uppercase text-zinc-550 block truncate">
              {product.brand}
            </span>

            {/* Product Title */}
            <h4 className="text-xs font-semibold text-white mt-1 leading-snug line-clamp-1 capitalize">
              {product.title}
            </h4>

            {/* Stars Rating Row */}
            <div className="flex items-center gap-1 mt-1 text-[10px] text-zinc-400 font-bold select-none">
              <div className="flex text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="size-2.5 fill-current shrink-0" />
                ))}
              </div>
              <span className="text-zinc-300 text-[9px] translate-y-[0.5px]">
                {product.rating || 4.5}
              </span>
            </div>
          </div>

          {/* Prices Row */}
          <div className="mt-3 flex items-end justify-between w-full">
            <div className="flex flex-col text-left">
              {product.compareAtPrice && product.compareAtPrice > product.price && (
                <span className="text-[10px] text-zinc-600 line-through leading-none font-medium mb-1 block">
                  ${product.compareAtPrice.toFixed(2)}
                </span>
              )}
              <span className="text-sm font-black text-white leading-none">
                ${product.price.toFixed(2)}
              </span>
            </div>

            {/* Quick Add Button */}
            <button
              onClick={handleQuickAdd}
              disabled={isPending}
              className="p-2 bg-zinc-950 border border-zinc-850 hover:border-zinc-800 hover:bg-zinc-850 text-indigo-400 hover:text-white rounded-xl shadow-md cursor-pointer flex items-center justify-center transition-all disabled:opacity-40 select-none shrink-0"
              title="Quick Add to Cart"
            >
              {isPending ? (
                <Loader2 className="size-3.5 animate-spin text-zinc-300" />
              ) : (
                <ShoppingCart className="size-3.5" />
              )}
            </button>
          </div>
        </div>
      </Link>
    </div>
  );
}
