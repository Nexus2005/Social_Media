"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Product, ProductVariant } from "@/features/shop/types";
import { CartlyAdapter } from "@/features/shop/adapters/cartlyAdapter";
import { useCart } from "@/features/shop/contexts/CartContext";
import { useWishlist } from "@/features/shop/contexts/WishlistContext";
import { useRecentlyViewed } from "@/features/shop/contexts/RecentlyViewedContext";
import { marketplaceComparisonAdapter } from "@/features/shop/adapters/marketplaceComparisonImpl";
import { MarketplaceOffer } from "@/features/shop/adapters/marketplaceComparison";
import { useAI } from "@/features/shop/providers/AIProvider";
import ReviewsPlaceholder from "@/features/shop/components/ReviewsPlaceholder";
import CartlyProductCard from "@/features/shop/components/CartlyProductCard";
import {
  ChevronLeft, Heart, ShoppingCart, Star, Truck, ShieldCheck, RotateCcw,
  Loader2, AlertTriangle, Play, ExternalLink, Sparkles, User, Tag
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { shopEvents } from "@/features/shop/providers/events";

interface ProductPageProps {
  params: Promise<{ slug: string }> | { slug: string };
}

const cartlyAdapter = new CartlyAdapter();

const formatPrice = (price: number) => {
  if (price >= 100) {
    return `₹${price.toLocaleString()}`;
  }
  return `₹${price.toFixed(2)}`;
};


export default function ShopProductDetailsPage({ params }: ProductPageProps) {
  const router = useRouter();
  const resolvedParams = params && typeof (params as any).then === "function" ? React.use(params as Promise<{ slug: string }>) : (params as { slug: string });
  const slug = resolvedParams.slug;

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  
  // Custom adapter states
  const [comparisonOffers, setComparisonOffers] = useState<MarketplaceOffer[]>([]);
  const [foundInVideos, setFoundInVideos] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { addProductToRecentlyViewed, recentlyViewed } = useRecentlyViewed();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const { getSimilarProducts } = useAI();

  useEffect(() => {
    const loadProductData = async () => {
      setIsLoading(true);
      setIsError(false);
      try {
        // Load main product via CommerceAdapter
        const prod = await cartlyAdapter.getProduct(slug);
        setProduct(prod);
        setSelectedImage(prod.images[0] || "");
        setSelectedVariant(prod.variants[0] || null);

        // Record locally in recently viewed
        addProductToRecentlyViewed(prod);

        // Emit typed pub/sub analytic event
        shopEvents.emit("Product Viewed", {
          productId: prod.id,
          productTitle: prod.title,
          price: prod.price,
          brand: prod.brand
        });

        // Load alternative offers and related items in parallel (independent)
        const [offers, list] = await Promise.all([
          marketplaceComparisonAdapter.getAlternativeOffers(prod.id),
          cartlyAdapter.getProducts({ limit: 4 }),
        ]);
        setComparisonOffers(offers);
        setRelatedProducts(list.filter(p => p.id !== prod.id));

        // Load mock "Found In" videos mapping
        setFoundInVideos([
          {
            id: "vid_1",
            title: "Summer outfit ideas for beach trips",
            creator: "@ElenaStylist",
            views: "1.2M",
            thumbnail: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=240&q=80"
          },
          {
            id: "vid_2",
            title: "Streetwear lookbook autumn essentials",
            creator: "@MarcusWear",
            views: "850K",
            thumbnail: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=240&q=80"
          }
        ]);

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
        <span className="text-xs text-zinc-550 font-semibold">Resolving product variables...</span>
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
      try {
        await addToCart(selectedVariant.id, 1);
        shopEvents.emit("Added To Cart", {
          productId: product.id,
          productTitle: product.title,
          variantId: selectedVariant.id,
          quantity: 1,
          price: selectedVariant.price
        });
        toast({
          description: "Added to Cart!",
        });
      } catch (err) {
        toast({
          variant: "destructive",
          description: "Failed to add to cart.",
        });
      }
    });
  };

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 md:px-6 py-6 pb-24 text-white text-left select-none animate-in fade-in duration-300">
      
      {/* Top Navigation Navigation */}
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

      {/* SLOT 1: PRODUCT SPECS OVERVIEW */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-12 border-b border-zinc-900/60 pb-12">
        
        {/* Left: Gallery (6 cols) */}
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

        {/* Right: Info & Product Specs Actions (6 cols) */}
        <div className="md:col-span-6 flex flex-col justify-between text-left">
          <div>
            <span className="text-xs font-black uppercase text-indigo-400 tracking-wider">
              {product.brand}
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1 leading-tight capitalize">
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
                {formatPrice(selectedVariant ? selectedVariant.price : product.price)}
              </span>
              {product.compareAtPrice && product.compareAtPrice > product.price && (
                <span className="text-sm font-semibold text-zinc-550 line-through">
                  {formatPrice(product.compareAtPrice)}
                </span>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <p className="text-xs text-zinc-400 mt-4 leading-relaxed">
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
                      {v.title} ({formatPrice(v.price)})
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

      {/* SLOT 2: FOUND IN (VIDEOS & SPOTS) */}
      {foundInVideos.length > 0 && (
        <div className="mb-12 border-b border-zinc-900/60 pb-8 text-left">
          <div className="flex items-center gap-2 text-indigo-400 mb-4">
            <Play className="size-4.5" />
            <h3 className="text-xs font-black uppercase tracking-wider text-white">Found in Creator Spots</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {foundInVideos.map((vid) => (
              <div 
                key={vid.id}
                onClick={() => {
                  shopEvents.emit("Video Product Clicked", {
                    videoId: vid.id,
                    productId: product.id,
                    productTitle: product.title
                  });
                  router.push(`/reels?v=${vid.id}`);
                }}
                className="flex gap-4 bg-zinc-900/30 border border-zinc-850 hover:border-zinc-800 p-3 rounded-2xl cursor-pointer hover:bg-zinc-900/50 transition-all"
              >
                <div className="size-16 rounded-xl overflow-hidden relative shrink-0">
                  <img src={vid.thumbnail} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                    <Play className="size-4 text-white fill-white" />
                  </div>
                </div>
                <div className="flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white line-clamp-1">{vid.title}</h4>
                    <p className="text-[10px] text-zinc-550 mt-0.5">Uploaded by <span className="font-bold text-zinc-400">{vid.creator}</span></p>
                  </div>
                  <span className="text-[9px] font-semibold text-zinc-500">{vid.views} views</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SLOT 3: CREATOR DETAILS */}
      <div className="mb-12 border-b border-zinc-900/60 pb-8 text-left">
        <div className="flex items-center gap-2 text-indigo-400 mb-4">
          <User className="size-4.5" />
          <h3 className="text-xs font-black uppercase tracking-wider text-white">Verified Creator Style</h3>
        </div>
        <div className="bg-zinc-900/20 border border-zinc-900 p-5 rounded-2xl flex items-center gap-4">
          <img 
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&q=80" 
            alt="Elena" 
            className="size-14 rounded-full object-cover border border-zinc-800"
          />
          <div>
            <h4 className="text-xs font-black text-white">Style curated by @ElenaStylist</h4>
            <p className="text-[11px] text-zinc-500 mt-1 max-w-lg leading-relaxed">
              Elena wears and showcases this style in her trending summer outfit lookbooks. Browse her exclusive collections inside the Creator Hub.
            </p>
          </div>
          <button 
            onClick={() => router.push("/shop/collections/elena")}
            className="ml-auto px-4 py-2 border border-zinc-800 text-xs font-bold rounded-xl hover:border-zinc-700 cursor-pointer text-zinc-300 whitespace-nowrap"
          >
            View Collection
          </button>
        </div>
      </div>

      {/* SLOT 4: SIMILAR VIDEOS */}
      <div className="mb-12 border-b border-zinc-900/60 pb-8 text-left">
        <div className="flex items-center gap-2 text-indigo-400 mb-4">
          <Sparkles className="size-4.5" />
          <h3 className="text-xs font-black uppercase tracking-wider text-white">Similar Styling Videos</h3>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
          {[
            { id: "sim_1", title: "Autumn layered styling outfit ideas", views: "340K", thumb: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=200&q=80" },
            { id: "sim_2", title: "Minimalist fashion essential review", views: "120K", thumb: "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=200&q=80" },
            { id: "sim_3", title: "How to style premium jackets cleanly", views: "520K", thumb: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=200&q=80" }
          ].map((vid) => (
            <div 
              key={vid.id}
              onClick={() => router.push(`/reels?v=${vid.id}`)}
              className="flex flex-col gap-2 bg-zinc-900/35 border border-zinc-850 p-2 rounded-2xl cursor-pointer hover:border-zinc-800 transition-all min-w-[170px]"
            >
              <div className="h-28 rounded-xl overflow-hidden relative">
                <img src={vid.thumb} alt="" className="w-full h-full object-cover" />
                <span className="absolute bottom-2 right-2 text-[8px] bg-black/70 px-1.5 py-0.5 rounded text-white">{vid.views} views</span>
              </div>
              <h5 className="text-[11px] font-bold text-white line-clamp-1 px-1">{vid.title}</h5>
            </div>
          ))}
        </div>
      </div>

      {/* SLOT 5: PRICE COMPARISON & ALTERNATIVE SELLERS */}
      {comparisonOffers.length > 0 && (
        <div className="mb-12 border-b border-zinc-900/60 pb-8 text-left">
          <div className="flex items-center gap-2 text-indigo-400 mb-4">
            <Tag className="size-4.5" />
            <h3 className="text-xs font-black uppercase tracking-wider text-white">Marketplace Price Comparison</h3>
          </div>
          <div className="flex flex-col gap-2.5 max-w-[650px]">
            {comparisonOffers.map((offer, idx) => (
              <a
                key={idx}
                href={offer.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3.5 bg-zinc-900/40 border border-zinc-850 rounded-2xl hover:border-zinc-700 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black uppercase tracking-wide text-zinc-500 bg-zinc-950 px-2.5 py-1 border border-zinc-900 rounded-lg">
                    {offer.marketplace}
                  </span>
                  <span className="text-[11px] text-zinc-400 font-semibold">
                    Seller: <span className="text-white font-bold">{offer.sellerName || "Verified"}</span>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-white">
                    {formatPrice(offer.price)}
                  </span>
                  <ExternalLink className="size-3.5 text-zinc-550" />
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* SLOT 6: COMPLETE OUTFIT */}
      <div className="mb-12 border-b border-zinc-900/60 pb-8 text-left">
        <div className="flex items-center gap-2 text-indigo-400 mb-4">
          <Sparkles className="size-4.5 animate-pulse" />
          <h3 className="text-xs font-black uppercase tracking-wider text-white">Style with the Complete Outfit</h3>
        </div>
        <p className="text-[11px] text-zinc-550 italic mb-2">AI styling bundles coming soon for this product.</p>
      </div>

      {/* SLOT 7: CUSTOMER REVIEWS */}
      <div className="mb-12 border-b border-zinc-900/60 pb-8">
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
              <CartlyProductCard key={p.id} product={p} />
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
              <CartlyProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
