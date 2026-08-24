"use client";

import React, { useTransition } from "react";
import Link from "next/link";
import { Product } from "../types";
import { useWishlist } from "../contexts/WishlistContext";
import { useCart } from "../contexts/CartContext";
import { Heart, ShoppingCart, Star, Loader2, Cpu, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { shopEvents } from "../providers/events";

interface ProductCardProps {
  product: Product;
  className?: string;
  isAIPicked?: boolean;
  detectedFromVideoId?: string;
}

export default function CartlyProductCard({ 
  product, 
  className,
  isAIPicked,
  detectedFromVideoId
}: ProductCardProps) {
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { cart, addToCart, updateItemQty, removeItem } = useCart();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const wishlisted = isWishlisted(product.id);
  const bestVariant = product.variants?.[0];
  const price = typeof product.price === "number" ? product.price : 0;
  const compareAtPrice = typeof product.compareAtPrice === "number" ? product.compareAtPrice : 0;

  const lineItem = cart?.items?.find(item => item.productId === product.id || item.variantId === bestVariant?.id);
  const quantity = lineItem ? lineItem.quantity : 0;

  const handleCardClick = () => {
    shopEvents.emit("Product Clicked", {
      productId: product.id,
      productTitle: product.title
    });
  };

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
      try {
        await addToCart(bestVariant.id, 1);
        shopEvents.emit("Added To Cart", {
          productId: product.id,
          productTitle: product.title,
          variantId: bestVariant.id,
          quantity: 1,
          price: product.price
        });
      } catch (err) {
        toast({
          variant: "destructive",
          description: "Failed to add product to cart.",
        });
      }
    });
  };

  const handleIncrease = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (lineItem) {
      startTransition(async () => {
        try {
          await updateItemQty(lineItem.id, quantity + 1);
        } catch (err) {
          console.error(err);
        }
      });
    }
  };

  const handleDecrease = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (lineItem) {
      startTransition(async () => {
        try {
          if (quantity === 1) {
            await removeItem(lineItem.id);
          } else {
            await updateItemQty(lineItem.id, quantity - 1);
          }
        } catch (err) {
          console.error(err);
        }
      });
    }
  };

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id);
  };

  return (
    <div
      onClick={handleCardClick}
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
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover/pcard:scale-105 transition-transform duration-500"
          />

          {/* Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/pcard:opacity-100 transition-opacity" />

          {/* Badges Container */}
          <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
            {product.discountPercentage && product.discountPercentage > 0 && (
              <span className="text-[8.5px] font-black text-white bg-indigo-650 px-2 py-0.5 rounded-[4px] tracking-wider shadow-sm uppercase w-fit">
                {product.discountPercentage}% OFF
              </span>
            )}
            {isAIPicked && (
              <span className="text-[8.5px] font-black text-white bg-violet-750 border border-violet-600/30 px-1.5 py-0.5 rounded-[4px] tracking-wider shadow-sm uppercase flex items-center gap-1 w-fit">
                <Cpu className="size-2" />
                <span>AI Pick</span>
              </span>
            )}
            {detectedFromVideoId && (
              <span className="text-[8.5px] font-black text-white bg-rose-650 border border-rose-500/30 px-1.5 py-0.5 rounded-[4px] tracking-wider shadow-sm uppercase flex items-center gap-1 w-fit">
                <Video className="size-2" />
                <span>Seen in Spot</span>
              </span>
            )}
          </div>

          {/* Free Delivery Badge */}
          {product.freeDelivery && (
            <span className="absolute bottom-2 left-2 text-[7.5px] font-bold text-emerald-400 bg-black/75 border border-emerald-950 px-1.5 py-0.5 rounded uppercase select-none z-10">
              Free Delivery
            </span>
          )}

          {/* Heart Button Overlay */}
          <button
            onClick={handleWishlistClick}
            className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/85 text-zinc-300 hover:text-white rounded-full border border-white/5 shadow-md cursor-pointer transition-colors z-10"
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
              {compareAtPrice > price && (
                <span className="text-[10px] text-zinc-600 line-through leading-none font-medium mb-1 block">
                  ${compareAtPrice.toFixed(2)}
                </span>
              )}
              <span className="text-sm font-black text-white leading-none">
                ${price.toFixed(2)}
              </span>
            </div>

            {/* Quick Add Button / Quantity Selector */}
            {quantity === 0 ? (
              <button
                onClick={handleQuickAdd}
                disabled={isPending}
                className="w-24 h-8 flex items-center justify-center border border-violet-500/70 hover:border-violet-500 bg-violet-950/10 hover:bg-violet-950/20 text-violet-400 font-bold text-xs rounded-[6px] transition-all duration-150 active:scale-95 select-none shrink-0"
              >
                {isPending ? (
                  <Loader2 className="size-3 animate-spin text-zinc-300" />
                ) : (
                  "ADD"
                )}
              </button>
            ) : (
              <div 
                className="w-24 h-8 flex items-center justify-between bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-xs rounded-[6px] overflow-hidden select-none border border-violet-500/20 shrink-0"
              >
                <button 
                  disabled={isPending}
                  onClick={handleDecrease}
                  className="w-7 h-full flex items-center justify-center hover:bg-white/10 active:scale-90 text-sm disabled:opacity-50"
                >
                  -
                </button>
                <span className="flex-1 text-center font-black text-xs select-none">
                  {isPending ? (
                    <Loader2 className="size-3 animate-spin mx-auto text-white/80" />
                  ) : (
                    quantity
                  )}
                </span>
                <button 
                  disabled={isPending}
                  onClick={handleIncrease}
                  className="w-7 h-full flex items-center justify-center hover:bg-white/10 active:scale-90 text-sm disabled:opacity-50"
                >
                  +
                </button>
              </div>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
