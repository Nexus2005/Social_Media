"use client";

import React, { useState, useMemo, useRef } from "react";
import { 
  Search, ShoppingCart, Bell, Heart, ChevronLeft, ChevronRight, 
  ShieldCheck, RotateCcw, Truck, Check, Edit3, ShoppingBag 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";

interface ProductMatch {
  id: string;
  price: string;
  productUrl: string;
  merchant?: any;
  title?: string;
  imageUrl?: string;
  deliveryText?: string;
  sourceStore?: string;
}

interface DetectedProduct {
  id: string | number;
  label: string;
  brand?: string;
  category?: string;
  thumbnailUrl?: string;
  sourceFrameUrl?: string;
  confidence?: number;
  aiConfidence?: number;
  frameTimestamp?: number;
  isVerifiedMatch?: boolean;
  matches?: ProductMatch[];
  isBestSeller?: boolean;
}

interface FullScreenProductDetailProps {
  productId: string | number;
  detectedProducts: DetectedProduct[];
  onClose: () => void;
}

export default function FullScreenProductDetail({
  productId,
  detectedProducts,
  onClose,
}: FullScreenProductDetailProps) {
  const { toast } = useToast();
  const thumbsScrollRef = useRef<HTMLDivElement>(null);
  
  // Find selected product
  const product = detectedProducts.find((p) => String(p.id) === String(productId)) || detectedProducts[0];

  // Check if Nike Pegasus 41 or best seller
  const isPegasus = product?.label?.toLowerCase().includes("pegasus") || product?.label?.toLowerCase().includes("shoe") || product?.label?.toLowerCase().includes("sneaker");
  const isBestSeller = product?.isBestSeller || isPegasus;
  
  const brand = product?.brand || (isPegasus ? "Nike" : "Brand");
  const title = product?.label || (isPegasus ? "Nike Pegasus 41" : "Premium Product");
  const subtitle = isPegasus ? "Men's Road Running Shoes" : "Premium Lifestyle Collection";
  const ratingScore = 4.6;
  const reviewsCount = 2432;
  const boughtCountText = "12K+ bought in past month";
  
  const priceDisplay = isPegasus ? "₹13,999" : (product?.matches?.[0]?.price || "₹13,999");
  const originalPriceDisplay = isPegasus ? "₹15,995" : "₹15,995";
  const discountText = "12% off";

  // Dynamic theme matching for white/dark product images
  const isDarkImage = isPegasus || title.toLowerCase().includes("pegasus");
  const containerBg = isDarkImage ? "bg-[#161616]" : "bg-white";

  // Carousel images
  const galleryImages = useMemo(() => {
    const list = Array.from(new Set([
      product?.thumbnailUrl,
      product?.sourceFrameUrl,
      ...(product?.matches || []).map((m: any) => m.imageUrl)
    ].filter(Boolean) as string[]));

    if (list.length < 3 && isPegasus) {
      return [
        "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=600&auto=format&fit=crop&q=80"
      ];
    }
    return list;
  }, [product, isPegasus]);

  // States
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [selectedColor, setSelectedColor] = useState("Black/White-Anthracite");
  const [selectedSize, setSelectedSize] = useState(9);
  const [activeTab, setActiveTab] = useState("About");
  const [cartCount, setCartCount] = useState(2);
  const [searchQuery, setSearchQuery] = useState("");

  const colors = [
    { name: "Black/White-Anthracite", hex: "#1e1e24" },
    { name: "Pure White / Platinum", hex: "#f3f4f6" },
    { name: "Slate Dark Grey", hex: "#4b5563" },
    { name: "Racer Electric Blue", hex: "#1d4ed8" },
    { name: "Obsidian Deep Blue", hex: "#1e3a8a" },
  ];

  const sizes = [6, 7, 8, 9, 10, 11];

  const trustBadges = [
    { label: "100% Authentic", desc: "Original Products", icon: ShieldCheck },
    { label: "Easy Returns", desc: "7-Day Return Policy", icon: RotateCcw },
    { label: "Free Delivery", desc: "On orders above ₹999", icon: Truck },
  ];

  const specsList = [
    "Responsive React foam midsole for a smooth ride",
    "Engineered mesh upper for breathability",
    "Air Zoom unit in forefoot for added energy return",
    "Durable rubber outsole with waffle pattern",
    "Weight: Approx. 297g (UK 9)",
    "Ideal for daily runs and training",
  ];

  // Handler: Prev/Next Image
  const handlePrevImage = () => {
    setActiveImageIndex((prev) => (prev === 0 ? galleryImages.length - 1 : prev - 1));
  };
  const handleNextImage = () => {
    setActiveImageIndex((prev) => (prev === galleryImages.length - 1 ? 0 : prev + 1));
  };

  // Thumbnail list scroll
  const scrollThumbnails = (direction: "left" | "right") => {
    if (thumbsScrollRef.current) {
      const scrollAmt = direction === "left" ? -150 : 150;
      thumbsScrollRef.current.scrollBy({ left: scrollAmt, behavior: "smooth" });
    }
  };

  // Similar Products mock database
  const similarProducts = [
    {
      id: "sim1",
      label: "Nike Air Zoom Structure 25",
      price: "₹15,495",
      rating: 4.5,
      reviews: "1.8K",
      img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&auto=format&fit=crop&q=80"
    },
    {
      id: "sim2",
      label: "Nike React Infinity Run 4",
      price: "₹14,495",
      rating: 4.4,
      reviews: "980",
      img: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=200&auto=format&fit=crop&q=80"
    },
    {
      id: "sim3",
      label: "Nike Vomero 17",
      price: "₹16,995",
      rating: 4.6,
      reviews: "1.2K",
      img: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=200&auto=format&fit=crop&q=80"
    },
    {
      id: "sim4",
      label: "Asics Gel-Kayano 30",
      price: "₹16,999",
      rating: 4.7,
      reviews: "990",
      img: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=200&auto=format&fit=crop&q=80"
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: -100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="fixed inset-y-0 left-0 md:left-[72px] xl:left-[244px] right-0 z-[150] bg-[#07080d] border-l border-zinc-900/60 flex flex-col text-white overflow-y-auto scrollbar-none pb-12 px-8 pt-5 select-none"
    >
      {/* Uiverse Button Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          /* Shared Uiverse expand button — vinodjangid07 style */
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

          /* Individual labels */
          .uiverse-btn.cart-btn::before   { content: "Cart"; }
          .uiverse-btn.alerts-btn::before { content: "Alerts"; }
          .uiverse-btn.back-page-btn::before  { content: "Back"; }
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
          
          {/* Search Box */}
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

          {/* Cart Icon - Expandable Uiverse Button */}
          <button 
            onClick={() => toast({ description: "Opening your shopping cart..." })}
            className="uiverse-btn cart-btn group"
            title="Cart"
          >
            <ShoppingCart className="size-4.5 svgIcon text-zinc-200" />
            <span className="absolute top-1 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-650 text-[8px] font-bold text-white border border-[#07080d] shadow-sm select-none">
              {cartCount}
            </span>
          </button>

          {/* Alerts Bell - Expandable Uiverse Button */}
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

          {/* Back button - Uiverse vinodjangid07 style */}
          <button
            onClick={onClose}
            className="uiverse-btn back-page-btn"
            title="Back"
          >
            {/* Left-arrow SVG */}
            <svg className="svgIcon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* 2. MAIN 2-COLUMN GRID (Images/Tabs on Left, Purchases/Reviews on Right) */}
      {/* This unified structure avoids CSS Grid row-height stretching and removes the large vertical gaps! */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
        
        {/* ==================== LEFT COLUMN (Col-Span 8) ==================== */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          
          {/* Main Product Image Card - fits entirely and blends background */}
          <div className={cn(
            "w-full h-[330px] rounded-2xl relative overflow-hidden border border-zinc-800 flex items-center justify-center group shadow-md transition-colors duration-300",
            containerBg
          )}>
            {/* Best Seller tag - blue/indigo pill */}
            {isBestSeller && (
              <span className="absolute top-4 left-4 z-10 bg-[#5d55fa] text-[9.5px] font-black uppercase tracking-wider text-white px-2.5 py-0.5 rounded shadow-sm">
                Best seller
              </span>
            )}

            {/* Wishlist button */}
            <button
              onClick={() => {
                setIsWishlisted(!isWishlisted);
                toast({ description: isWishlisted ? "Removed from wishlist" : "Added to wishlist!" });
              }}
              className="absolute top-4 right-4 z-10 p-2.5 rounded-full bg-white text-zinc-855 hover:scale-105 active:scale-95 transition-all shadow-sm cursor-pointer border border-zinc-200"
            >
              <Heart className={cn("size-4 text-zinc-850 transition-colors", isWishlisted && "fill-rose-500 text-rose-500")} />
            </button>

            {/* Left Chevron */}
            <button
              onClick={handlePrevImage}
              className="absolute left-4 top-1/2 -translate-y-1/2 size-8 bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 hover:bg-black/80 transition-opacity cursor-pointer shadow-sm"
            >
              <ChevronLeft className="size-4.5" />
            </button>

            {/* Main Image - object-contain prevents zooming & cropping, blending with background */}
            {galleryImages[activeImageIndex] && (
              <img
                src={galleryImages[activeImageIndex]}
                alt={title}
                className="w-full h-full object-contain select-none transition-all duration-300 pointer-events-none"
              />
            )}

            {/* Right Chevron */}
            <button
              onClick={handleNextImage}
              className="absolute right-4 top-1/2 -translate-y-1/2 size-8 bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 hover:bg-black/80 transition-opacity cursor-pointer shadow-sm"
            >
              <ChevronRight className="size-4.5" />
            </button>
          </div>

          {/* Thumbnails Row - Single horizontal row with chevrons */}
          <div className="relative flex items-center group/thumbs w-full">
            
            {/* Left arrow overlay */}
            <button
              onClick={() => scrollThumbnails("left")}
              className="absolute left-1 bg-black/75 hover:bg-black p-1 rounded-full text-white z-10 opacity-0 group-hover/thumbs:opacity-100 transition-opacity size-7 flex items-center justify-center cursor-pointer shadow"
            >
              <ChevronLeft className="size-3.5" />
            </button>

            {/* Scroll Container - single line, never wraps, thumbnail fits entirely */}
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
                      "size-[68px] rounded-xl overflow-hidden border transition-all cursor-pointer shrink-0 relative shadow-sm hover:scale-[1.02]",
                      isDarkImage ? "bg-[#161616]" : "bg-white",
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

            {/* Right arrow overlay */}
            <button
              onClick={() => scrollThumbnails("right")}
              className="absolute right-1 bg-black/75 hover:bg-black p-1 rounded-full text-white z-10 opacity-0 group-hover/thumbs:opacity-100 transition-opacity size-7 flex items-center justify-center cursor-pointer shadow"
            >
              <ChevronRight className="size-3.5" />
            </button>

          </div>

          {/* Bottom Grid of Left Column (About & Similar Products aligned together) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-5 border-t border-zinc-900 mt-2">
            
            {/* Column 1A: Tabbed About Info (Col-Span 5) */}
            <div className="md:col-span-5 flex flex-col gap-4">
              
              {/* Tab bar header */}
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

              {/* Tab body */}
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

            {/* Column 1B: Similar Products (Col-Span 7, Fits exact 4 horizontal product cards) */}
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

              {/* Render 4 columns for 4 items side-by-side inside middle column */}
              <div className="grid grid-cols-4 gap-2">
                {similarProducts.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
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

        {/* ==================== RIGHT COLUMN (Col-Span 4) ==================== */}
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
                <span className="text-zinc-450">
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
                <span className="text-zinc-550 line-through text-xs font-semibold">
                  {originalPriceDisplay}
                </span>
                <span className="text-[9.5px] font-extrabold text-[#10b981] bg-[#10b981]/15 px-1.5 py-0.5 rounded shadow-sm">
                  {discountText}
                </span>
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

            {/* Color selection dots */}
            <div className="flex flex-col gap-2 border-b border-zinc-900 pb-3.5">
              <span className="text-[11px] font-bold tracking-wide text-zinc-400 uppercase">
                Color: <span className="text-white capitalize">{selectedColor}</span>
              </span>
              <div className="flex items-center gap-2">
                {colors.map((color) => {
                  const isActive = color.name === selectedColor;
                  return (
                    <button
                      key={color.name}
                      onClick={() => setSelectedColor(color.name)}
                      className={cn(
                        "size-7 rounded-full border transition-all cursor-pointer relative flex items-center justify-center shadow active:scale-90",
                        isActive ? "border-[#5d55fa] border-2 scale-102" : "border-zinc-800 hover:border-zinc-550"
                      )}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    >
                      {isActive && (
                        <span className={cn("size-1.5 rounded-full", color.hex === "#f3f4f6" ? "bg-black" : "bg-white")} />
                      )}
                    </button>
                  );
                })}
                <span className="text-[9.5px] font-bold text-zinc-500 bg-[#12131a] px-2 py-0.5 rounded-full border border-zinc-850 select-none cursor-pointer hover:text-white transition-colors">
                  +2
                </span>
              </div>
            </div>

            {/* Size selection row */}
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
                {sizes.map((size) => {
                  const isActive = size === selectedSize;
                  return (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
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

            {/* Stock details */}
            <div className="flex flex-col gap-3 mt-1 border-t border-zinc-900 pt-3.5">
              <div className="flex items-center gap-1.5">
                <span className="size-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[11px] font-bold text-emerald-450">In stock</span>
                <span className="text-zinc-700 text-xs font-normal">•</span>
                <span className="text-[11px] text-zinc-500 font-bold">Delivery by 28 May</span>
              </div>

              {/* Action buttons */}
              <div className="flex gap-4 items-center mt-1">
                <button
                  onClick={() => {
                    setCartCount((c) => c + 1);
                    toast({
                      description: `Added ${title} (UK Size ${selectedSize}) to your Cart!`,
                    });
                  }}
                  className="flex-1 border border-zinc-800 bg-transparent text-white hover:bg-zinc-900/70 hover:border-zinc-700 active:scale-[0.98] font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  <ShoppingCart className="size-4 shrink-0 text-zinc-300" />
                  <span>Add to cart</span>
                </button>

                <button
                  onClick={() => {
                    const url = product?.matches?.[0]?.productUrl || "https://nike.com";
                    window.open(url, "_blank", "noopener,noreferrer");
                  }}
                  className="flex-1 bg-[#5d55fa] text-white hover:bg-[#4d45ea] active:scale-[0.98] font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
                >
                  <ShoppingBag className="size-4 shrink-0 text-white" />
                  <span>Buy now</span>
                </button>
              </div>
            </div>

          </div>

          {/* Customer Reviews Section (placed tightly at the bottom of the right column flow) */}
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
                <span className="text-3xl font-extrabold text-white leading-none">4.6</span>
                <div className="flex items-center gap-0.5 text-amber-500 mt-1">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <span key={idx} className="text-xs">★</span>
                  ))}
                </div>
                <span className="text-[9px] font-black text-zinc-500 mt-1.5 uppercase tracking-wider">
                  2,482 ratings
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
                    <span className="text-[9px] text-zinc-500 font-bold shrink-0 w-6 text-right">{row.pct}%</span>
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
    </motion.div>
  );
}
