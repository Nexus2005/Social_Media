"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Product, ProductVariant } from "@/features/shop/types";
import { ProductService } from "@/features/shop/services/product";
import { useCart } from "@/features/shop/contexts/CartContext";
import { useWishlist } from "@/features/shop/contexts/WishlistContext";
import { useRecentlyViewed } from "@/features/shop/contexts/RecentlyViewedContext";
import ReviewsPlaceholder from "@/features/shop/components/ReviewsPlaceholder";
import ProductCard from "@/features/shop/components/ProductCard";
import {
  ChevronLeft,
  Heart,
  ShoppingCart,
  Star,
  Truck,
  ShieldCheck,
  RotateCcw,
  Loader2,
  AlertTriangle,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export default function ShopProductDetailsPage({ params }: ProductPageProps) {
  const router = useRouter();
  const resolvedParams = React.use(params);
  const slug = resolvedParams.slug;

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { addProductToRecentlyViewed, recentlyViewed } = useRecentlyViewed();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const loadProductData = async () => {
      setIsLoading(true);
      setIsError(false);
      try {
        const prod = await ProductService.getProductBySlug(slug);
        setProduct(prod);
        setSelectedImage(prod.images[0] || "");
        setSelectedVariant(prod.variants[0] || null);

        // Record in recently viewed
        addProductToRecentlyViewed(prod);

        // Load related items
        const list = await ProductService.getProducts({ limit: 4 });
        setRelatedProducts(list.filter(p => p.id !== prod.id));
      } catch (e) {
        console.warn(`Failed to load product details for ${slug}:`, e);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadProductData();
  }, [slug]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="size-8 animate-spin text-indigo-400" />
        <span className="text-xs text-zinc-500 font-medium">Loading product details...</span>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-3 px-6 select-none">
        <AlertTriangle className="size-10 text-rose-500" />
        <h2 className="text-base font-black text-white">Product Not Found</h2>
        <p className="text-xs text-zinc-550 max-w-sm">
          The product you are looking for may have been removed or is unavailable.
        </p>
        <button
          onClick={() => router.push("/shop")}
          className="mt-2 px-4 py-2 bg-zinc-900 border border-zinc-800 text-xs font-bold text-white rounded-xl hover:bg-zinc-850 cursor-pointer"
        >
          Back to Shop
        </button>
      </div>
    );
  }

  const wishlisted = isWishlisted(product.id);

  const handleAddToCart = () => {
    if (!selectedVariant) {
      toast({
        variant: "destructive",
        description: "Please select a product variant first.",
      });
      return;
    }

    startTransition(async () => {
      await addToCart(selectedVariant.id, 1);
    });
  };

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 md:px-6 py-6 pb-24 text-white text-left select-none animate-in fade-in duration-300">
      
      {/* Top Navigation Row */}
      <div className="flex items-center gap-3 mb-6 select-none">
        <button
          onClick={() => router.back()}
          className="p-2 bg-zinc-900/40 border border-zinc-850 hover:bg-zinc-850 rounded-xl text-zinc-350 hover:text-white cursor-pointer transition-colors"
        >
          <ChevronLeft className="size-4.5" />
        </button>
        <span className="text-xs font-semibold text-zinc-400 capitalize">
          Shop / Products / <span className="text-white">{product.title}</span>
        </span>
      </div>

      {/* Main Grid: Gallery & Info */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-12">
        
        {/* Left: Gallery (5 cols) */}
        <div className="md:col-span-6 flex flex-col gap-4">
          <div className="w-full aspect-square bg-zinc-950 rounded-3xl overflow-hidden border border-zinc-850 relative shadow-2xl">
            <img
              src={selectedImage}
              alt={product.title}
              className="w-full h-full object-cover"
            />
            {product.discountPercentage && product.discountPercentage > 0 && (
              <span className="absolute top-4 left-4 text-xs font-black text-white bg-indigo-650 px-3 py-1 rounded-lg tracking-wider shadow-md">
                {product.discountPercentage}% OFF
              </span>
            )}
          </div>

          {/* Thumbnails row */}
          {product.images.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(img)}
                  className={cn(
                    "w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 bg-zinc-950 transition-all cursor-pointer",
                    selectedImage === img ? "border-indigo-500 shadow-md scale-105" : "border-zinc-850 opacity-60 hover:opacity-100"
                  )}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Info & Actions (7 cols) */}
        <div className="md:col-span-6 flex flex-col justify-between text-left">
          <div>
            <span className="text-xs font-black uppercase text-indigo-400 tracking-wider">
              {product.brand}
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1 leading-tight">
              {product.title}
            </h1>

            {/* Rating */}
            <div className="flex items-center gap-2 mt-2.5">
              <div className="flex text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="size-3.5 fill-current shrink-0" />
                ))}
              </div>
              <span className="text-xs font-bold text-zinc-300">
                {product.rating || 4.5}
              </span>
              <span className="text-[10px] text-zinc-550">· (128 reviews)</span>
            </div>

            {/* Price section */}
            <div className="flex items-baseline gap-3 mt-4">
              <span className="text-2xl sm:text-3xl font-black text-white">
                ${(selectedVariant ? selectedVariant.price : product.price).toFixed(2)}
              </span>
              {product.compareAtPrice && product.compareAtPrice > product.price && (
                <span className="text-sm font-semibold text-zinc-550 line-through">
                  ${product.compareAtPrice.toFixed(2)}
                </span>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <p className="text-xs text-zinc-400 mt-4 leading-relaxed line-clamp-4">
                {product.description}
              </p>
            )}

            {/* Variants Selector */}
            {product.variants && product.variants.length > 1 && (
              <div className="mt-6 text-left">
                <span className="text-xs font-bold text-zinc-300 block mb-2.5">Select Variant</span>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(v)}
                      className={cn(
                        "px-3.5 py-2 border rounded-xl text-xs font-bold transition-all cursor-pointer",
                        selectedVariant?.id === v.id
                          ? "bg-indigo-650 border-indigo-500 text-white shadow-md"
                          : "bg-zinc-900/60 border-zinc-850 text-zinc-350 hover:text-white"
                      )}
                    >
                      {v.title} (${v.price.toFixed(2)})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Delivery indicators */}
            <div className="grid grid-cols-3 gap-3 mt-6 p-3.5 bg-zinc-900/40 border border-zinc-850/60 rounded-2xl text-[10px] text-zinc-400 font-bold">
              <div className="flex items-center gap-2">
                <Truck className="size-4 text-emerald-400 shrink-0" />
                <span>Free Delivery</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-indigo-400 shrink-0" />
                <span>Authentic</span>
              </div>
              <div className="flex items-center gap-2">
                <RotateCcw className="size-4 text-amber-400 shrink-0" />
                <span>7 Days Return</span>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-3 mt-8">
            <button
              onClick={handleAddToCart}
              disabled={isPending}
              className="flex-1 py-3.5 bg-indigo-650 hover:bg-indigo-600 active:scale-[0.99] text-xs font-black text-white rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/40 cursor-pointer transition-all disabled:opacity-40"
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <ShoppingCart className="size-4" />
                  <span>Add to Cart</span>
                </>
              )}
            </button>

            <button
              onClick={() => toggleWishlist(product.id)}
              className={cn(
                "p-3.5 border rounded-2xl cursor-pointer transition-all shadow-md shrink-0",
                wishlisted
                  ? "bg-rose-500/10 border-rose-500/40 text-rose-500"
                  : "bg-zinc-900 border-zinc-850 text-zinc-350 hover:text-white"
              )}
              title="Add to Wishlist"
            >
              <Heart className={cn("size-4.5", wishlisted && "fill-current")} />
            </button>
          </div>

        </div>

      </div>

      {/* Customer Reviews Section Placeholder */}
      <div className="mb-12">
        <ReviewsPlaceholder productId={product.id} />
      </div>

      {/* Related Products Shelf */}
      {relatedProducts.length > 0 && (
        <div className="mb-12 text-left">
          <h2 className="text-sm font-black text-white uppercase tracking-wider mb-4">
            You Might Also Like
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}

      {/* Recently Viewed Shelf */}
      {recentlyViewed.length > 1 && (
        <div className="text-left">
          <h2 className="text-sm font-black text-white uppercase tracking-wider mb-4">
            Recently Viewed
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {recentlyViewed.filter(p => p.id !== product.id).slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
