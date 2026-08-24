"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { 
  Search, ShoppingCart, Bell, Heart, ChevronLeft, ChevronRight, 
  ShieldCheck, RotateCcw, Truck, Check, Edit3, ShoppingBag,
  Trash2, X, ArrowRight, Star
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";

import { DetectedProduct as PrismaDetectedProduct, ShoppingMatch as PrismaShoppingMatch, ProductVariant } from "@/generated/client";

export type ProductMatch = Omit<PrismaShoppingMatch, "variants"> & {
  variants?: any[];
};

export type DetectedProduct = Omit<PrismaDetectedProduct, "matches"> & {
  matches?: ProductMatch[];
};

interface FullScreenProductDetailProps {
  productId: string | number;
  detectedProducts: DetectedProduct[];
  onClose: () => void;
}

const COLOR_HEX_MAP: Record<string, string> = {
  black: "#1e1e24",
  white: "#f3f4f6",
  grey: "#4b5563",
  gray: "#4b5563",
  blue: "#1d4ed8",
  red: "#dc2626",
  green: "#16a34a",
  yellow: "#ca8a04",
  orange: "#ea580c",
  pink: "#db2777",
  purple: "#9333ea",
  brown: "#78350f",
  gold: "#eab308",
  silver: "#cbd5e1",
};

function resolveColorHex(colorName: string): string {
  const clean = colorName.toLowerCase().trim();
  for (const [key, hex] of Object.entries(COLOR_HEX_MAP)) {
    if (clean.includes(key)) return hex;
  }
  return "#6366f1"; // fallback to indigo accent
}

export default function FullScreenProductDetail({
  productId,
  detectedProducts,
  onClose,
}: FullScreenProductDetailProps) {
  const { toast } = useToast();
  const thumbsScrollRef = useRef<HTMLDivElement>(null);
  
  const [activeProductId, setActiveProductId] = useState<string | number>(productId);

  useEffect(() => {
    setActiveProductId(productId);
  }, [productId]);

  // Find selected product
  const product = detectedProducts.find((p) => String(p.id) === String(activeProductId)) || detectedProducts[0];

  const bestMatch = useMemo(() => {
    if (!product?.matches || product.matches.length === 0) return null;
    const bm = [...product.matches].sort((a, b) => (b.verificationScore || 0) - (a.verificationScore || 0))[0];
    if (!bm) return null;

    const mappedVariants = (bm.variants || []).map((v: any) => ({
      id: v.id,
      type: v.variantType || "Option",
      value: v.variantValue || "",
      price: v.price,
      sku: v.sku,
      imageUrl: v.imageUrl,
      availability: v.availability,
    }));

    return {
      ...bm,
      variants: mappedVariants as any,
    };
  }, [product]);

  // Group variants by type
  const variantsByType = useMemo(() => {
    const groups: Record<string, any[]> = {};
    if (!bestMatch?.variants) return groups;
    for (const v of bestMatch.variants) {
      const type = (v.type || "Option").toLowerCase();
      const capitalized = type.charAt(0).toUpperCase() + type.slice(1);
      if (!groups[capitalized]) groups[capitalized] = [];
      // avoid duplicates
      if (!groups[capitalized].some((item: any) => item.value === v.value)) {
        groups[capitalized].push(v);
      }
    }
    return groups;
  }, [bestMatch]);

  const hasColors = "Color" in variantsByType && variantsByType["Color"].length > 0;
  const hasSizes = "Size" in variantsByType && variantsByType["Size"].length > 0;

  // Selected Variant States
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [activeTab, setActiveTab] = useState("About");
  const [cart, setCart] = useState<any[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Sync cart from LocalStorage and listen to updates
  useEffect(() => {
    const syncCart = () => {
      const savedCart = localStorage.getItem("cartly_cart");
      if (savedCart) {
        try {
          setCart(JSON.parse(savedCart));
        } catch (e) {
          console.error("Failed to parse cart", e);
        }
      } else {
        setCart([]);
      }
    };

    syncCart();
    window.addEventListener("cart_updated", syncCart);
    window.addEventListener("storage", syncCart);
    return () => {
      window.removeEventListener("cart_updated", syncCart);
      window.removeEventListener("storage", syncCart);
    };
  }, []);

  const saveCartToStorage = (updatedCart: any[]) => {
    setCart(updatedCart);
    localStorage.setItem("cartly_cart", JSON.stringify(updatedCart));
    window.dispatchEvent(new Event("cart_updated"));
  };

  const handleAddToCart = () => {
    if (!product) return;
    const currentBestMatch = bestMatch || { price: "Contact Store" };
    const existingIndex = cart.findIndex((item) => String(item.product.id) === String(product.id));
    let updated = [...cart];
    if (existingIndex > -1) {
      updated[existingIndex].quantity += 1;
    } else {
      updated.push({ product, bestMatch: currentBestMatch, quantity: 1 });
    }
    saveCartToStorage(updated);
    toast({
      description: `Added ${title} to your Cart!`,
    });
  };

  const handleUpdateQuantity = (productId: string | number, delta: number) => {
    const updated = cart.map((item) => {
      if (String(item.product.id) === String(productId)) {
        const newQty = item.quantity + delta;
        return { ...item, quantity: newQty > 0 ? newQty : 1 };
      }
      return item;
    });
    saveCartToStorage(updated);
  };

  const handleRemoveFromCart = (productId: string | number) => {
    const updated = cart.filter((item) => String(item.product.id) !== String(productId));
    saveCartToStorage(updated);
  };

  const parsePrice = (priceStr: string): number => {
    const num = parseInt(priceStr.replace(/[^0-9]/g, ""), 10);
    return isNaN(num) ? 0 : num;
  };

  // Initialize selected values
  useEffect(() => {
    if (hasColors) {
      setSelectedColor(variantsByType["Color"][0].value);
    }
    if (hasSizes) {
      setSelectedSize(variantsByType["Size"][0].value);
    }
  }, [variantsByType, hasColors, hasSizes]);

  // Find active variant match to customize price / image
  const activeVariantObj = useMemo(() => {
    if (!bestMatch?.variants) return null;
    return bestMatch.variants.find((v: any) => {
      let match = true;
      if (hasColors && v.type?.toLowerCase() === "color" && v.value !== selectedColor) match = false;
      if (hasSizes && v.type?.toLowerCase() === "size" && v.value !== selectedSize) match = false;
      return match;
    }) || null;
  }, [bestMatch, selectedColor, selectedSize, hasColors, hasSizes]);

  // Dynamic values
  const brand = product?.brand || bestMatch?.matchBrand || "Premium Brand";
  const title = product?.label || bestMatch?.title || "Premium Product";
  const subtitle = bestMatch?.categoryPath || product?.category || "Premium Lifestyle Collection";
  
  const priceDisplay = activeVariantObj?.price || bestMatch?.price || "Contact Store";
  const originalPriceDisplay = bestMatch?.originalPrice || null;
  const discountText = bestMatch?.discountPercent ? `${bestMatch.discountPercent}% off` : null;

  const ratingScore = bestMatch?.rating || 4.6;
  const reviewsCount = bestMatch?.reviewCount || 243;
  const boughtCountText = bestMatch?.condition ? `Condition: ${bestMatch.condition}` : "Highly rated match";

  // Gallery carousel construction
  const galleryImages = useMemo(() => {
    const list: string[] = [];
    if (product?.thumbnailUrl) list.push(product.thumbnailUrl);
    if (product?.sourceFrameUrl) list.push(product.sourceFrameUrl);
    
    // Add variant image if available
    if (activeVariantObj?.imageUrl) {
      list.push(activeVariantObj.imageUrl);
    }

    if (bestMatch) {
      if (bestMatch.imageUrl) list.push(bestMatch.imageUrl);
      if (bestMatch.galleryImageUrls && Array.isArray(bestMatch.galleryImageUrls)) {
        for (const url of bestMatch.galleryImageUrls) {
          if (url) list.push(url);
        }
      }
    }

    const uniqueList = Array.from(new Set(list.filter(Boolean)));
    if (uniqueList.length === 0) {
      uniqueList.push("https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600");
    }
    return uniqueList;
  }, [product, bestMatch, activeVariantObj]);

  // When active variant image changes, auto-select it in carousel
  useEffect(() => {
    if (activeVariantObj?.imageUrl) {
      const idx = galleryImages.indexOf(activeVariantObj.imageUrl);
      if (idx !== -1) {
        setActiveImageIndex(idx);
      }
    }
  }, [activeVariantObj, galleryImages]);

  // Handlers
  const handlePrevImage = () => {
    setActiveImageIndex((prev) => (prev === 0 ? galleryImages.length - 1 : prev - 1));
  };
  const handleNextImage = () => {
    setActiveImageIndex((prev) => (prev === galleryImages.length - 1 ? 0 : prev + 1));
  };

  const scrollThumbnails = (direction: "left" | "right") => {
    if (thumbsScrollRef.current) {
      const scrollAmt = direction === "left" ? -150 : 150;
      thumbsScrollRef.current.scrollBy({ left: scrollAmt, behavior: "smooth" });
    }
  };

  const trustBadges = [
    { label: "100% Authentic", desc: "Original Products", icon: ShieldCheck },
    { label: "Easy Returns", desc: "7-Day Return Policy", icon: RotateCcw },
    { label: "Free Delivery", desc: "For verified matches", icon: Truck },
  ];

  const specsList = useMemo(() => {
    if (bestMatch?.features && bestMatch.features.length > 0) {
      return bestMatch.features.slice(0, 6);
    }
    if (bestMatch?.highlights && bestMatch.highlights.length > 0) {
      return bestMatch.highlights.slice(0, 6);
    }
    return [
      "Responsive lightweight cushion lining for all-day comfort",
      "High grade exterior materials offering premium durability",
      "Ergonomically structured framework tailored for custom fits",
      "Robust performance traction sole designed for modern surfaces",
      "Optimized breathability vents maintaining perfect temperature",
      "Seamlessly engineered structure suitable for daily lifestyle",
    ];
  }, [bestMatch]);

  const [similarProducts, setSimilarProducts] = useState<any[]>([]);

  useEffect(() => {
    if (!product?.id) return;
    
    let isMounted = true;
    fetch(`/api/products/similar?productId=${product.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          const mapped = data.map((p) => {
            const best = [...(p.matches || [])].sort((a, b) => (b.verificationScore || 0) - (a.verificationScore || 0))[0] || null;
            return {
              id: p.id,
              label: p.label,
              price: best?.price || "Contact Store",
              rating: best?.rating || 4.5,
              reviews: best?.reviewCount ? `${(best.reviewCount / 1000).toFixed(1)}K` : "120",
              img: best?.imageUrl || p.thumbnailUrl || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200",
            };
          });
          setSimilarProducts(mapped);
        }
      })
      .catch((err) => console.error("[Similar] Error fetching similar products:", err));

    return () => {
      isMounted = false;
    };
  }, [product?.id]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="fixed inset-y-0 left-0 md:left-[72px] xl:left-[244px] right-0 z-[150] bg-[#07080d] border-l border-zinc-900/60 flex flex-col text-white overflow-y-auto scrollbar-none pb-12 px-8 pt-5 select-none"
    >
      <style dangerouslySetInnerHTML={{
        __html: `
          .uiverse-btn {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background-color: rgb(20, 20, 20);
            border: none;
            font-weight: 600;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0px 0px 0px 4px rgba(79, 70, 229, 0.25);
            cursor: pointer;
            transition-duration: 0.3s;
            overflow: hidden;
            position: relative;
          }

          .uiverse-btn .svgIcon {
            width: 16px;
            transition-duration: 0.3s;
          }

          .uiverse-btn .svgIcon path {
            fill: white;
          }

          .uiverse-btn:hover {
            width: 140px;
            border-radius: 50px;
            transition-duration: 0.3s;
            background-color: #4f46e5;
            align-items: center;
          }

          .uiverse-btn:hover .svgIcon {
            transition-duration: 0.3s;
            transform: translateY(-200%);
          }

          .uiverse-btn::before {
            position: absolute;
            bottom: -20px;
            color: white;
            font-size: 0px;
            font-weight: 700;
          }

          .uiverse-btn:hover::before {
            font-size: 13px;
            opacity: 1;
            bottom: unset;
            transition-duration: 0.3s;
          }

          .uiverse-btn.cart-btn::before   { content: "Cart"; }
          .uiverse-btn.alerts-btn::before { content: "Alerts"; }
          .uiverse-btn.back-page-btn::before  { content: "Back"; }

          /* Animated Buy Now Button from Uiverse.io - scaled for 50px height */
          .buy-now-container {
            background-color: #12131a;
            display: flex;
            width: 100%;
            height: 50px;
            position: relative;
            border-radius: 12px;
            transition: 0.3s ease-in-out;
            border: 1px solid #1c1c1e;
            overflow: hidden;
          }

          .buy-now-container:hover {
            transform: scale(1.02);
            border-color: rgba(93, 85, 250, 0.4);
          }

          .buy-now-container:hover .left-side {
            width: 100%;
          }

          .buy-now-container .left-side {
            background-color: #5d55fa;
            width: 50px;
            height: 48px;
            border-radius: 11px;
            position: relative;
            display: flex;
            justify-content: center;
            align-items: center;
            cursor: pointer;
            transition: 0.3s;
            flex-shrink: 0;
            overflow: hidden;
          }

          .buy-now-container .right-side {
            display: flex;
            align-items: center;
            overflow: hidden;
            cursor: pointer;
            justify-content: space-between;
            white-space: nowrap;
            transition: 0.3s;
            flex-grow: 1;
            padding: 0 16px;
          }

          .buy-now-container .right-side:hover {
            background-color: #1c1c24;
          }

          .buy-now-container .arrow {
            width: 16px;
            height: 16px;
            color: #5d55fa;
            transition: transform 0.3s;
          }
          
          .buy-now-container:hover .arrow {
            transform: translateX(3px);
            color: white;
          }

          .buy-now-container .new {
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: white;
          }

          .buy-now-container .card {
            width: 32px;
            height: 20px;
            background-color: #c7c4ff;
            border-radius: 3px;
            position: absolute;
            display: flex;
            z-index: 10;
            flex-direction: column;
            align-items: center;
            box-shadow: 3px 3px 5px rgba(93, 85, 250, 0.3);
          }

          .buy-now-container .card-line {
            width: 28px;
            height: 5px;
            background-color: #7971ff;
            border-radius: 1px;
            margin-top: 3px;
          }

          .buy-now-container .buttons {
            width: 4px;
            height: 4px;
            background-color: #4d45ea;
            box-shadow: 0 -5px 0 0 #3d35da, 0 5px 0 0 #8c85ff;
            border-radius: 50%;
            margin-top: 2px;
            transform: rotate(90deg);
            margin: 4px 0 0 -12px;
          }

          .buy-now-container:hover .card {
            animation: slide-top 1.2s cubic-bezier(0.645, 0.045, 0.355, 1) both;
          }

          .buy-now-container:hover .post {
            animation: slide-post 1s cubic-bezier(0.165, 0.84, 0.44, 1) both;
          }

          @keyframes slide-top {
            0% {
              transform: translateY(0);
            }

            50% {
              transform: translateY(-30px) rotate(90deg);
            }

            60% {
              transform: translateY(-30px) rotate(90deg);
            }

            100% {
              transform: translateY(-3px) rotate(90deg);
            }
          }

          .buy-now-container .post {
            width: 26px;
            height: 32px;
            background-color: #dddde0;
            position: absolute;
            z-index: 11;
            bottom: 4px;
            top: 50px;
            border-radius: 3px;
            overflow: hidden;
          }

          .buy-now-container .post-line {
            width: 20px;
            height: 4px;
            background-color: #545354;
            position: absolute;
            border-radius: 0px 0px 1px 1px;
            right: 3px;
            top: 3px;
          }

          .buy-now-container .post-line:before {
            content: "";
            position: absolute;
            width: 20px;
            height: 4px;
            background-color: #757375;
            top: -3px;
          }

          .buy-now-container .screen {
            width: 20px;
            height: 10px;
            background-color: #ffffff;
            position: absolute;
            top: 9px;
            right: 3px;
            border-radius: 1px;
          }

          .buy-now-container .numbers {
            width: 5px;
            height: 5px;
            background-color: #838183;
            box-shadow: 0 -8px 0 0 #838183, 0 8px 0 0 #838183;
            border-radius: 1px;
            position: absolute;
            transform: rotate(90deg);
            left: 10px;
            top: 22px;
          }

          .buy-now-container .numbers-line2 {
            width: 5px;
            height: 5px;
            background-color: #aaa9ab;
            box-shadow: 0 -8px 0 0 #aaa9ab, 0 8px 0 0 #aaa9ab;
            border-radius: 1px;
            position: absolute;
            transform: rotate(90deg);
            left: 10px;
            top: 28px;
          }

          @keyframes slide-post {
            50% {
              transform: translateY(0);
            }

            100% {
              transform: translateY(-30px);
            }
          }

          .buy-now-container .dollar {
            position: absolute;
            font-size: 8px;
            font-family: "Lexend Deca", sans-serif;
            width: 100%;
            left: 0;
            top: 0;
            color: #4f46e5;
            text-align: center;
          }

          .buy-now-container:hover .dollar {
            animation: fade-in-fwd 0.3s 1s backwards;
          }

          @keyframes fade-in-fwd {
            0% {
              opacity: 0;
              transform: translateY(-2px);
            }

            100% {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `
      }} />

      {/* 1. HEADER BREADCRUMB & SEARCH BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-3 flex-shrink-0 select-none">
        
        {/* Left: Breadcrumbs */}
        <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-semibold tracking-wide select-none">
          <span className="cursor-pointer hover:text-white transition-colors" onClick={onClose}>Reels</span>
          <span className="text-zinc-700 font-normal">/</span>
          <span className="cursor-pointer hover:text-white transition-colors" onClick={onClose}>Shop</span>
          <span className="text-zinc-700 font-normal">/</span>
          <span className="cursor-pointer hover:text-white transition-colors" onClick={onClose}>All products</span>
          <span className="text-zinc-700 font-normal">/</span>
          <span className="text-white truncate max-w-[150px] capitalize font-bold">{title}</span>
        </div>

        {/* Right Controls: Search, Cart, Alerts, Close */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search products"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-900/80 border border-zinc-800 rounded-full pl-9 pr-4 py-1.5 text-xs text-zinc-200 focus:outline-none w-[180px] focus:border-zinc-700 focus:w-[220px] transition-all duration-300 font-medium"
            />
          </div>

          <button 
            onClick={() => setIsCartOpen(true)}
            className="uiverse-btn cart-btn group"
            title="Cart"
          >
            <ShoppingCart className="size-4.5 svgIcon text-zinc-200" />
            <span className="absolute top-1 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-650 text-[8px] font-bold text-white border border-[#07080d] shadow-sm select-none">
              {cart.reduce((total, item) => total + item.quantity, 0)}
            </span>
          </button>

          <button 
            onClick={() => toast({ description: "You have no new commerce notifications." })}
            className="uiverse-btn alerts-btn group"
            title="Alerts"
          >
            <Bell className="size-4.5 svgIcon text-zinc-200" />
            <span className="absolute top-1 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-650 text-[8px] font-bold text-white border border-[#07080d] shadow-sm select-none">
              2
            </span>
          </button>

          <button
            onClick={onClose}
            className="uiverse-btn back-page-btn"
            title="Back"
          >
            <svg className="svgIcon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* 2. MAIN 2-COLUMN GRID */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
        
        {/* ==================== LEFT COLUMN ==================== */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          
          {/* Main Product Image Card */}
          <div className="w-full h-[330px] rounded-2xl relative overflow-hidden border border-zinc-800 flex items-center justify-center group shadow-md bg-[#161616]">
            {product?.isVerifiedMatch && (
              <span className="absolute top-4 left-4 z-10 bg-[#5d55fa] text-[9.5px] font-black uppercase tracking-wider text-white px-2.5 py-0.5 rounded shadow-sm">
                Verified Match
              </span>
            )}

            <button
              onClick={() => {
                setIsWishlisted(!isWishlisted);
                toast({ description: isWishlisted ? "Removed from wishlist" : "Added to wishlist!" });
              }}
              className="absolute top-4 right-4 z-10 p-2.5 rounded-full bg-white text-zinc-855 hover:scale-105 active:scale-95 transition-all shadow-sm cursor-pointer border border-zinc-200"
            >
              <Heart className={cn("size-4 text-zinc-850 transition-colors", isWishlisted && "fill-rose-500 text-rose-500")} />
            </button>

            <button
              onClick={handlePrevImage}
              className="absolute left-4 top-1/2 -translate-y-1/2 size-8 bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 hover:bg-black/80 transition-opacity cursor-pointer shadow-sm"
            >
              <ChevronLeft className="size-4.5" />
            </button>

            {galleryImages[activeImageIndex] && (
              <img
                src={galleryImages[activeImageIndex]}
                alt={title}
                className="w-full h-full object-contain select-none transition-all duration-300 pointer-events-none"
              />
            )}

            <button
              onClick={handleNextImage}
              className="absolute right-4 top-1/2 -translate-y-1/2 size-8 bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 hover:bg-black/80 transition-opacity cursor-pointer shadow-sm"
            >
              <ChevronRight className="size-4.5" />
            </button>
          </div>

          {/* Thumbnails Row */}
          <div className="relative flex items-center group/thumbs w-full">
            <button
              onClick={() => scrollThumbnails("left")}
              className="absolute left-1 bg-black/75 hover:bg-black p-1 rounded-full text-white z-10 opacity-0 group-hover/thumbs:opacity-100 transition-opacity size-7 flex items-center justify-center cursor-pointer shadow"
            >
              <ChevronLeft className="size-3.5" />
            </button>

            <div
              ref={thumbsScrollRef}
              className="flex items-center gap-3 overflow-x-auto scrollbar-none flex-nowrap w-full py-0.5 select-none"
            >
              {galleryImages.map((imgUrl, index) => {
                const isActive = index === activeImageIndex;
                return (
                  <button
                    key={index}
                    onClick={() => setActiveImageIndex(index)}
                    className={cn(
                      "size-[68px] rounded-xl overflow-hidden border transition-all cursor-pointer shrink-0 relative shadow-sm hover:scale-[1.02] bg-[#161616]",
                      isActive 
                        ? "border-[#5d55fa] border-2" 
                        : "border-zinc-850 opacity-60 hover:opacity-100"
                    )}
                  >
                    <img
                      src={imgUrl}
                      alt={`${title} Thumbnail ${index + 1}`}
                      className="w-full h-full object-contain p-1 pointer-events-none"
                    />
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => scrollThumbnails("right")}
              className="absolute right-1 bg-black/75 hover:bg-black p-1 rounded-full text-white z-10 opacity-0 group-hover/thumbs:opacity-100 transition-opacity size-7 flex items-center justify-center cursor-pointer shadow"
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>

          {/* Bottom Grid of Left Column */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-5 border-t border-zinc-900 mt-2">
            
            {/* Column 1A: Tabbed About Info */}
            <div className="md:col-span-5 flex flex-col gap-4">
              <div className="flex items-center gap-3 border-b border-zinc-900 pb-1.5 overflow-x-auto scrollbar-none shrink-0">
                {["About", "Features", "Specifications"].map((tab) => {
                  const isActive = activeTab.startsWith(tab);
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={cn(
                        "text-xs font-bold transition-colors pb-2 relative whitespace-nowrap cursor-pointer",
                        isActive ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      {tab}
                      {isActive && (
                        <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#5d55fa] rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col gap-2 text-left">
                <h4 className="text-[11px] font-bold tracking-wider text-zinc-450 uppercase mb-1">
                  Product highlights
                </h4>
                
                <div className="flex flex-col gap-2">
                  {specsList.map((spec, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <Check className="size-3.5 text-[#5d55fa] shrink-0 mt-0.5" />
                      <span className="text-[11px] font-semibold text-zinc-400 leading-normal">
                        {spec}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Column 1B: Similar Products */}
            <div className="md:col-span-7 flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                <span className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
                  Similar products
                </span>
                <button 
                  onClick={() => toast({ description: "Opening similar products catalogue..." })}
                  className="text-[11px] font-bold text-zinc-550 hover:text-indigo-400 cursor-pointer"
                >
                  View all
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {similarProducts.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setActiveProductId(item.id);
                      toast({ description: `Opening details for ${item.label}...` });
                    }}
                    className="flex flex-col bg-[#12131a] border border-zinc-850 hover:border-zinc-700 transition-all p-1.5 rounded-xl cursor-pointer relative shadow-sm group/sim w-full"
                  >
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        toast({ description: `Saved ${item.label} to your collection.` });
                      }}
                      className="absolute top-1 right-1 p-0.5 bg-black/60 hover:bg-black rounded-full text-zinc-400 hover:text-rose-500 z-10 transition-all"
                    >
                      <Heart className="size-2.5" />
                    </button>

                    <div className="w-full aspect-square rounded-lg overflow-hidden bg-zinc-950 flex items-center justify-center border border-zinc-900 group-hover/sim:scale-[1.02] transition-transform duration-300">
                      <img src={item.img} alt={item.label} className="w-auto h-full max-h-[85%] object-contain" />
                    </div>

                    <span className="text-[9.5px] font-bold text-white mt-1.5 truncate w-full capitalize leading-tight">
                      {item.label}
                    </span>

                    <div className="flex items-center justify-between gap-1 mt-1 w-full">
                      <span className="text-[9.5px] font-black text-zinc-300">{item.price}</span>
                      <span className="text-[8.5px] font-bold text-amber-500 flex items-center gap-0.5">
                        ★ {item.rating}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

        {/* ==================== RIGHT COLUMN ==================== */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          
          {/* Purchase Details Panel */}
          <div className="flex flex-col gap-4">
            
            {/* Brand, Title, Rating */}
            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-[#5d55fa] font-bold tracking-wider uppercase block">
                {brand}
              </span>
              <h1 className="text-xl font-bold tracking-tight text-white capitalize leading-tight">
                {title}
              </h1>
              <p className="text-zinc-550 text-[12px] font-semibold tracking-wide mt-0.5">
                {subtitle}
              </p>

              <div className="flex items-center gap-1.5 mt-1 text-[11px] text-zinc-400 font-bold flex-wrap">
                <span className="text-amber-500 font-extrabold flex items-center gap-0.5">
                  ★ {ratingScore}
                </span>
                <button 
                  onClick={() => toast({ description: "Opening reviews list..." })}
                  className="hover:underline text-zinc-450"
                >
                  ({reviewsCount.toLocaleString()} reviews)
                </button>
                <span className="text-zinc-700 font-normal">•</span>
                <span className="text-zinc-455">
                  {boughtCountText}
                </span>
              </div>
            </div>

            {/* Pricing Info */}
            <div className="flex flex-col border-b border-zinc-900 pb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-2xl font-black text-white leading-none">
                  {priceDisplay}
                </span>
                {originalPriceDisplay && (
                  <span className="text-zinc-550 line-through text-xs font-semibold">
                    {originalPriceDisplay}
                  </span>
                )}
                {discountText && (
                  <span className="text-[9.5px] font-extrabold text-[#10b981] bg-[#10b981]/15 px-1.5 py-0.5 rounded shadow-sm">
                    {discountText}
                  </span>
                )}
              </div>
              <span className="text-zinc-650 text-[10px] font-bold mt-1 uppercase tracking-wide">
                Inclusive of all taxes
              </span>
            </div>

            {/* Trust Badges Row */}
            <div className="grid grid-cols-3 gap-2 border-b border-zinc-900 pb-3.5">
              {trustBadges.map((badge, idx) => {
                const IconComp = badge.icon;
                return (
                  <div key={idx} className="flex gap-1.5 items-start p-1.5 bg-zinc-900/35 border border-zinc-850/50 rounded-lg shadow-sm">
                    <IconComp className="size-3.5 text-[#5d55fa] shrink-0 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-[9.5px] font-black text-zinc-200 leading-none">{badge.label}</span>
                      <span className="text-[8px] font-bold text-zinc-500 mt-1 leading-tight">{badge.desc}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Dynamic Variant Selector: Colors */}
            {hasColors && (
              <div className="flex flex-col gap-2 border-b border-zinc-900 pb-3.5">
                <span className="text-[11px] font-bold tracking-wide text-zinc-400 uppercase">
                  Color: <span className="text-white capitalize">{selectedColor}</span>
                </span>
                <div className="flex items-center gap-2">
                  {variantsByType["Color"].map((color) => {
                    const isActive = color.value === selectedColor;
                    const hex = resolveColorHex(color.value);
                    return (
                      <button
                        key={color.value}
                        onClick={() => setSelectedColor(color.value)}
                        className={cn(
                          "size-7 rounded-full border transition-all cursor-pointer relative flex items-center justify-center shadow active:scale-90",
                          isActive ? "border-[#5d55fa] border-2 scale-102" : "border-zinc-800 hover:border-zinc-550"
                        )}
                        style={{ backgroundColor: hex }}
                        title={color.value}
                      >
                        {isActive && (
                          <span className={cn("size-1.5 rounded-full", hex === "#f3f4f6" ? "bg-black" : "bg-white")} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Dynamic Variant Selector: Sizes */}
            {hasSizes && (
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-wide">
                  <span className="text-zinc-400">
                    Select Size
                  </span>
                  <button 
                    onClick={() => toast({ description: "Size Guide is custom to brand standards." })}
                    className="text-[#5d55fa] hover:underline transition-colors lowercase font-bold"
                  >
                    Size guide
                  </button>
                </div>
                
                <div className="grid grid-cols-6 gap-2">
                  {variantsByType["Size"].map((sizeObj) => {
                    const isActive = sizeObj.value === selectedSize;
                    return (
                      <button
                        key={sizeObj.value}
                        onClick={() => setSelectedSize(sizeObj.value)}
                        className={cn(
                          "py-2 rounded-lg border text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95",
                          isActive 
                            ? "bg-[#5d55fa] border-transparent text-white" 
                            : "bg-transparent border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900/30"
                        )}
                      >
                        {sizeObj.value}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Fallback to default sizing if no sizes in DB */}
            {!hasSizes && (
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-wide">
                  <span className="text-zinc-400">
                    Select Size (UK)
                  </span>
                  <button 
                    onClick={() => toast({ description: "Size Guide: UK sizes are identical to standard Indian shoe sizes." })}
                    className="text-[#5d55fa] hover:underline transition-colors lowercase font-bold"
                  >
                    Size guide
                  </button>
                </div>
                
                <div className="grid grid-cols-6 gap-2">
                  {[6, 7, 8, 9, 10, 11].map((size) => {
                    const isActive = String(size) === selectedSize;
                    return (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(String(size))}
                        className={cn(
                          "py-2 rounded-lg border text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95",
                          isActive 
                            ? "bg-[#5d55fa] border-transparent text-white" 
                            : "bg-transparent border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900/30"
                        )}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Stock details */}
            <div className="flex flex-col gap-3 mt-1 border-t border-[#12131a] pt-3.5">
              <div className="flex items-center gap-1.5">
                <span className="size-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[11px] font-bold text-emerald-450">In stock</span>
                <span className="text-zinc-700 text-xs font-normal">•</span>
                <span className="text-[11px] text-zinc-555 font-bold">Usually ships in 24 hours</span>
              </div>

              {/* Action buttons */}
              <div className="flex gap-4 items-center mt-1">
                <button
                  onClick={handleAddToCart}
                  className="flex-1 border border-zinc-800 bg-transparent text-white hover:bg-zinc-900/70 hover:border-zinc-700 active:scale-[0.98] font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-wider transition-all cursor-pointer h-[50px]"
                >
                  <ShoppingCart className="size-4 shrink-0 text-zinc-300" />
                  <span>Add to cart</span>
                </button>

                <div
                  onClick={() => {
                    const url = bestMatch?.productUrl || "https://www.google.com";
                    window.open(url, "_blank", "noopener,noreferrer");
                  }}
                  className="buy-now-container flex-1"
                >
                  <div className="left-side">
                    <div className="card">
                      <div className="card-line"></div>
                      <div className="buttons"></div>
                    </div>
                    <div className="post">
                      <div className="post-line"></div>
                      <div className="screen">
                        <div className="dollar">$</div>
                      </div>
                      <div className="numbers"></div>
                      <div className="numbers-line2"></div>
                    </div>
                  </div>
                  <div className="right-side">
                    <div className="new">Buy now</div>
                    <ArrowRight className="arrow" />
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Customer Reviews Section */}
          <div className="flex flex-col gap-3.5 pt-5 border-t border-zinc-900 mt-2">
            <div className="flex justify-between items-center pb-1">
              <span className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
                Customer reviews
              </span>
              <button 
                onClick={() => toast({ description: "Opening detailed review page..." })}
                className="text-[11px] font-bold text-zinc-555 hover:text-[#5d55fa] cursor-pointer"
              >
                View all
              </button>
            </div>

            <div className="flex gap-4 items-center">
              <div className="flex flex-col text-left">
                <span className="text-3xl font-extrabold text-white leading-none">{ratingScore}</span>
                <div className="flex items-center gap-0.5 text-amber-500 mt-1">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <span key={idx} className="text-xs">★</span>
                  ))}
                </div>
                <span className="text-[9px] font-black text-zinc-500 mt-1.5 uppercase tracking-wider">
                  {reviewsCount} ratings
                </span>
              </div>
              
              <div className="flex-1 flex flex-col gap-1">
                {[
                  { star: 5, pct: 75 },
                  { star: 4, pct: 15 },
                  { star: 3, pct: 6 },
                  { star: 2, pct: 2 },
                  { star: 1, pct: 2 }
                ].map((row) => (
                  <div key={row.star} className="flex items-center gap-1.5">
                    <span className="text-[9.5px] text-zinc-400 font-bold shrink-0 w-3">{row.star}★</span>
                    <div className="flex-grow h-1 bg-zinc-900 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${row.pct}%` }} />
                    </div>
                    <span className="text-[9px] text-zinc-550 font-bold shrink-0 w-6 text-right">{row.pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                toast({
                  description: "Review modal is coming soon. Thank you for your feedback!",
                });
              }}
              className="w-full mt-1 border border-zinc-800 bg-transparent text-zinc-400 hover:text-white hover:bg-zinc-900/60 font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 text-xs tracking-wider uppercase transition-all cursor-pointer active:scale-98 shadow-sm"
            >
              <Edit3 className="size-3.5 shrink-0" />
              <span>Write a review</span>
            </button>
          </div>

        </div>

      </div>

      {/* 3. CART OVERLAY DRAWER PANEL */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="absolute inset-0 bg-black z-[200] cursor-pointer"
            />

            {/* Sidebar Cart panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute right-0 top-0 bottom-0 w-full sm:w-[420px] shadow-2xl z-[210] flex flex-col bg-[#0b0c10] border-l border-[#1b1c26] text-white"
            >
              {/* Cart Header */}
              <div className="flex items-center justify-between p-6 border-b border-zinc-900/60 select-none bg-[#0b0c10]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl border bg-zinc-900 border-zinc-800">
                    <ShoppingCart className="size-4.5 text-[#5d55fa]" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-black uppercase tracking-wider text-white">Shopping Cart</h3>
                    <p className="text-[10px] font-bold mt-0.5 text-zinc-500">
                      {cart.reduce((total, item) => total + item.quantity, 0)} items added
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-2 rounded-full border hover:bg-zinc-800/80 border-white/5 text-zinc-400 hover:text-white transition-all cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Cart Items List */}
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 select-none">
                {cart.length === 0 ? (
                  <div className="flex-grow flex flex-col items-center justify-center py-20 text-zinc-500">
                    <ShoppingCart className="size-14 mb-4 animate-bounce text-zinc-800" />
                    <p className="text-sm font-bold">Your cart is empty.</p>
                    <p className="text-[11px] mt-1 text-zinc-650">Add items from the spots list to buy.</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="flex gap-4 p-3 border rounded-2xl bg-zinc-900/35 border-zinc-900 hover:border-zinc-800 transition-all"
                    >
                      {/* Thumbnail */}
                      <div className="w-16 h-20 bg-zinc-950 rounded-xl overflow-hidden shrink-0 border border-white/5">
                        <img
                          src={item.product.thumbnailUrl || item.product.sourceFrameUrl || ""}
                          alt={item.product.label}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Info & Quantity controls */}
                      <div className="flex-grow flex flex-col justify-between text-left">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-xs font-bold line-clamp-2 pr-2 text-white">
                              {item.product.label}
                            </h4>
                            <button
                              onClick={() => handleRemoveFromCart(item.product.id)}
                              className="text-zinc-500 hover:text-rose-500 transition-colors p-1 cursor-pointer"
                              title="Remove item"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                          <span className="text-[11px] font-black text-indigo-500 block mt-1">
                            {item.bestMatch?.price || "Contact Store"}
                          </span>
                        </div>

                        {/* Quantity Counter */}
                        <div className="flex items-center justify-between mt-2.5">
                          <div className="flex items-center gap-1.5 border rounded-lg p-0.5 border-zinc-800 bg-[#12131a]">
                            <button
                              onClick={() => handleUpdateQuantity(item.product.id, -1)}
                              className="w-5 h-5 rounded flex items-center justify-center text-xs cursor-pointer select-none font-bold hover:bg-zinc-800 text-zinc-400"
                            >
                              -
                            </button>
                            <span className="text-[10px] font-black px-1 select-none text-white">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => handleUpdateQuantity(item.product.id, 1)}
                              className="w-5 h-5 rounded flex items-center justify-center text-xs cursor-pointer select-none font-bold hover:bg-zinc-800 text-zinc-400"
                            >
                              +
                            </button>
                          </div>

                          {/* Item total */}
                          <span className="text-[10px] font-black text-zinc-400">
                            Total: {item.bestMatch?.price?.includes("$") ? `$${(parseFloat(item.bestMatch.price.replace("$", "")) * item.quantity).toFixed(2)}` : `₹${parsePrice(item.bestMatch?.price || "0") * item.quantity}`}
                          </span>
                        </div>

                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Cart Footer / Checkout */}
              {cart.length > 0 && (
                <div className="border-t p-6 flex flex-col gap-4 select-none border-zinc-900/60 bg-[#0c0d14]">
                  {/* Totals */}
                  <div className="flex items-center justify-between text-sm font-bold">
                    <span className="text-zinc-450">Subtotal:</span>
                    <span className="text-base font-black text-white">
                      {cart[0].bestMatch?.price?.includes("$")
                        ? `$${cart.reduce((sum, item) => sum + parseFloat(item.bestMatch?.price?.replace("$", "") || "0") * item.quantity, 0).toFixed(2)}`
                        : `₹${cart.reduce((sum, item) => sum + parsePrice(item.bestMatch?.price || "0") * item.quantity, 0)}`
                      }
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      toast({
                        description: "Checkout features are integrated directly with merchant stores.",
                      });
                      setIsCartOpen(false);
                    }}
                    className="w-full bg-[#4f46e5] hover:bg-[#4338ca] text-white font-black py-4 rounded-2xl text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-650/20 active:scale-[0.98] cursor-pointer"
                  >
                    Buy through merchant shops &rarr;
                  </button>
                </div>
              )}

            </motion.div>
          </>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
