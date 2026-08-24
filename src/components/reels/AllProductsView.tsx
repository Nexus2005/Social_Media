"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useTheme } from "next-themes";
import {
  Search,
  Bell,
  ShoppingBag,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Heart,
  ShoppingCart,
  Check,
  Trash2,
  Share2,
  Plus,
  Star,
  Sparkles,
  Shield,
  Scale,
  Ruler,
  Wind,
  Palette,
  Tag,
  RotateCcw,
  Truck,
  ShieldCheck,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import { useSession } from "@/app/(main)/SessionProvider";
import UserAvatar from "@/components/UserAvatar";
import FullScreenProductDetail from "@/components/reels/FullScreenProductDetail";
import { createPortal } from "react-dom";

import { DetectedProduct as PrismaDetectedProduct, ShoppingMatch as PrismaShoppingMatch, ProductVariant } from "@/generated/client";

export type ProductMatch = PrismaShoppingMatch & {
  variants?: ProductVariant[];
};

export type DetectedProduct = PrismaDetectedProduct & {
  matches?: ProductMatch[];
};

interface AllProductsViewProps {
  products: DetectedProduct[];
  onClose: () => void;
}

const COMPARE_PRODUCTS = [
  {
    id: "nike-peg-41",
    brand: "Nike",
    label: "Nike Pegasus 41",
    subtitle: "Men's Road Running Shoes",
    price: "₹13,995",
    listPrice: "₹15,995",
    discount: "12% off",
    imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80",
    rating: "4.6",
    reviewsCount: "2,432",
    bestFor: "Daily Running",
    cushioning: "High",
    weight: "297g",
    heelDrop: "10mm",
    breathability: "High",
    durability: "High"
  },
  {
    id: "nike-str-25",
    brand: "Nike",
    label: "Nike Air Zoom Structure 25",
    subtitle: "Men's Road Running Shoes",
    price: "₹15,495",
    listPrice: "",
    discount: "",
    imageUrl: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&q=80",
    rating: "4.5",
    reviewsCount: "1,845",
    bestFor: "Overpronation Support",
    cushioning: "High",
    weight: "318g",
    heelDrop: "12mm",
    breathability: "High",
    durability: "High"
  },
  {
    id: "nike-inf-4",
    brand: "Nike",
    label: "Nike React Infinity Run 4",
    subtitle: "Men's Road Running Shoes",
    price: "₹14,495",
    listPrice: "",
    discount: "",
    imageUrl: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=400&q=80",
    rating: "4.4",
    reviewsCount: "980",
    bestFor: "Long Distance",
    cushioning: "Very High",
    weight: "310g",
    heelDrop: "9mm",
    breathability: "Medium",
    durability: "High"
  },
  {
    id: "asics-kay-30",
    brand: "Asics",
    label: "Asics Gel-Kayano 30",
    subtitle: "Men's Road Running Shoes",
    price: "₹16,999",
    listPrice: "",
    discount: "",
    imageUrl: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400&q=80",
    rating: "4.7",
    reviewsCount: "1,250",
    bestFor: "Stability & Support",
    cushioning: "Maximum",
    weight: "305g",
    heelDrop: "10mm",
    breathability: "Medium",
    durability: "Very High"
  }
];

const CATEGORY_ITEMS = [
  { id: "tops", label: "Tops", count: "2 products", imageUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=200&q=80" },
  { id: "bottoms", label: "Bottoms", count: "1 product", imageUrl: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=200&q=80" },
  { id: "footwear", label: "Footwear", count: "2 products", imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&q=80" },
  { id: "watches", label: "Watches", count: "1 product", imageUrl: "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=200&q=80" },
  { id: "accessories", label: "Accessories", count: "3 products", imageUrl: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=200&q=80" },
  { id: "jewellery", label: "Jewellery", count: "2 products", imageUrl: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=200&q=80" },
  { id: "bags", label: "Bags", count: "1 product", imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=200&q=80" }
];

const CATEGORY_PRODUCTS_MAP = {
  tops: [
    {
      id: "cat-top-1",
      label: "Zara Halter Neck Top",
      brand: "Zara",
      price: "₹1,990",
      rating: "4.6",
      reviewsCount: "1,248",
      imageUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=80",
      colors: ["#ffffff", "#27272a"],
      isBestMatch: true
    },
    {
      id: "cat-top-2",
      label: "H&M Ribbed Tank Top",
      brand: "H&M",
      price: "₹1,499",
      rating: "4.3",
      reviewsCount: "892",
      imageUrl: "https://images.unsplash.com/photo-1554412933-514a83d2f3c8?w=400&q=80",
      colors: ["#d7ccc8", "#27272a", "#ffffff"]
    }
  ],
  bottoms: [
    {
      id: "cat-bot-1",
      label: "Zara High-Waist Trousers",
      brand: "Zara",
      price: "₹2,990",
      rating: "4.5",
      reviewsCount: "530",
      imageUrl: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400&q=80",
      colors: ["#1a237e", "#ffffff"]
    }
  ],
  footwear: [
    {
      id: "cat-foot-1",
      label: "Nike Pegasus 41",
      brand: "Nike",
      price: "₹13,995",
      rating: "4.6",
      reviewsCount: "2,432",
      imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80",
      colors: ["#27272a", "#ffffff"]
    }
  ]
};

interface CartItem {
  product: DetectedProduct;
  bestMatch: ProductMatch;
  quantity: number;
}

export default function AllProductsView({ products, onClose }: AllProductsViewProps) {
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  const { user } = useSession();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Local Cart State with LocalStorage sync
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Filters
  const [priceRange, setPriceRange] = useState({ min: 0, max: 15000 });
  const [minInput, setMinInput] = useState("0");
  const [maxInput, setMaxInput] = useState("15000");
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("Relevance");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  // Wishlist state
  const [wishlist, setWishlist] = useState<Record<string | number, boolean>>({});

  // Full Screen product detail overlay state
  const [fullProductDetailId, setFullProductDetailId] = useState<string | number | null>(null);

  const handleOpenProductDetail = (id: string | number) => {
    setFullProductDetailId(id);
    onClose();
  };

  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [compareList, setCompareList] = useState<any[]>([]);

  const toggleCompare = (prod: any) => {
    setCompareList((prev) => {
      const isAlreadyIn = prev.some((p) => p.id === prod.id);
      if (isAlreadyIn) {
        return prev.filter((p) => p.id !== prod.id);
      } else {
        if (prev.length >= 4) {
          toast({ description: "You can compare a maximum of 4 products." });
          return prev;
        }
        return [...prev, prod];
      }
    });
  };

  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isCategoriesPageOpen, setIsCategoriesPageOpen] = useState(false);
  const [selectedCategoryCarousel, setSelectedCategoryCarousel] = useState("tops");

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

  // Sync cart to LocalStorage
  const saveCartToStorage = (updatedCart: CartItem[]) => {
    setCart(updatedCart);
    localStorage.setItem("cartly_cart", JSON.stringify(updatedCart));
    window.dispatchEvent(new Event("cart_updated"));
  };

  // Add to cart helper
  const handleAddToCart = (product: DetectedProduct, bestMatch: ProductMatch) => {
    const existingIndex = cart.findIndex((item) => item.product.id === product.id);
    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      saveCartToStorage(updated);
    } else {
      const updated = [...cart, { product, bestMatch, quantity: 1 }];
      saveCartToStorage(updated);
    }
  };

  // Remove/Quantity helpers
  const handleUpdateQuantity = (productId: string | number, delta: number) => {
    const updated = cart.map((item) => {
      if (item.product.id === productId) {
        const newQty = item.quantity + delta;
        return { ...item, quantity: newQty > 0 ? newQty : 1 };
      }
      return item;
    });
    saveCartToStorage(updated);
  };

  const handleRemoveFromCart = (productId: string | number) => {
    const updated = cart.filter((item) => item.product.id !== productId);
    saveCartToStorage(updated);
  };

  const toggleWishlist = (id: string | number) => {
    setWishlist((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Helper to parse price string to number
  const parsePrice = (priceStr: string): number => {
    const num = parseInt(priceStr.replace(/[^0-9]/g, ""), 10);
    return isNaN(num) ? 0 : num;
  };

  // Best match helper for a product
  const getBestMatch = (prod: DetectedProduct): ProductMatch | null => {
    if (!prod.matches || prod.matches.length === 0) return null;
    return [...prod.matches].sort((a, b) => parsePrice(a.price) - parsePrice(b.price))[0];
  };

  // Helper to safely extract brand name from best match or product label
  const getBrandName = (bm: ProductMatch | null, prod: DetectedProduct): string => {
    if (prod.brand) return prod.brand;
    if (bm?.matchBrand) return bm.matchBrand;
    return prod.label.split(" ")[0] || "Unknown";
  };

  // Extract all brands/merchants from products
  const brands = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      const bm = getBestMatch(p);
      const brand = getBrandName(bm, p);
      set.add(brand);
    });
    return Array.from(set);
  }, [products]);

  // Extract categories & counts
  const categories = useMemo(() => {
    const counts: Record<string, number> = { All: products.length };
    products.forEach((p) => {
      const cat = p.category || "Top";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [products]);

  // Filtered and sorted products list
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // 1. Search Query filter
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matchLabel = p.label.toLowerCase().includes(q);
          const matchCat = p.category?.toLowerCase().includes(q);
          if (!matchLabel && !matchCat) return false;
        }

        // 2. Category filter
        if (selectedCategory !== "All") {
          if (p.category !== selectedCategory) return false;
        }

        const bm = getBestMatch(p);
        const price = bm ? parsePrice(bm.price) : 0;

        // 3. Price filter
        if (price < priceRange.min || price > priceRange.max) return false;

        // 4. Brand filter
        if (selectedBrands.length > 0) {
          const brand = getBrandName(bm, p);
          if (!selectedBrands.includes(brand)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const bmA = getBestMatch(a);
        const bmB = getBestMatch(b);
        const priceA = bmA ? parsePrice(bmA.price) : 0;
        const priceB = bmB ? parsePrice(bmB.price) : 0;

        if (sortBy === "Price: Low to High") return priceA - priceB;
        if (sortBy === "Price: High to Low") return priceB - priceA;
        return 0; // Default: Relevance
      });
  }, [products, searchQuery, selectedCategory, priceRange, selectedBrands, sortBy]);

  // Pagination logic
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  const handleMinSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.min(Number(e.target.value), priceRange.max - 500);
    setPriceRange((prev) => ({ ...prev, min: val }));
    setMinInput(val.toString());
    setCurrentPage(1);
  };

  const handleMaxSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.max(Number(e.target.value), priceRange.min + 500);
    setPriceRange((prev) => ({ ...prev, max: val }));
    setMaxInput(val.toString());
    setCurrentPage(1);
  };

  const handleApplyPrice = () => {
    const minVal = parseInt(minInput, 10) || 0;
    const maxVal = parseInt(maxInput, 10) || 15000;
    setPriceRange({ min: minVal, max: maxVal });
    setCurrentPage(1);
  };

  const handleBrandToggle = (brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
    setCurrentPage(1);
  };

  const handleCategorySelect = (cat: string) => {
    setSelectedCategory(cat);
    setCurrentPage(1);
  };

  if (!mounted) return null;

  return createPortal(
    <div className="sidebar-aware-overlay fixed inset-0 bg-[#07080d] z-[999] flex flex-col overflow-hidden text-white animate-in slide-in-from-right duration-300">

      {/* CSS to keep left sidebar visible on desktop */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media (min-width: 640px) {
            .sidebar-aware-overlay {
              left: 72px !important;
              width: calc(100vw - 72px) !important;
            }
          }
          @media (min-width: 1280px) {
            .sidebar-aware-overlay {
              left: 244px !important;
              width: calc(100vw - 244px) !important;
            }
            aside.minimized-sidebar ~ .sidebar-aware-overlay {
              left: 72px !important;
              width: calc(100vw - 72px) !important;
            }
          }
        `
      }} />

      {/* Back Button, Double Slider, and Checkbox Styling */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .uiverse-shop-btn {
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 10px 18px;
            gap: 10px;
            background-color: #007ACC;
            outline: 3px #007ACC solid;
            outline-offset: -3px;
            border-radius: 8px;
            border: none;
            cursor: pointer;
            transition: 400ms;
            position: relative;
          }

          .uiverse-shop-btn .text {
            color: white;
            font-weight: 750;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            transition: 400ms;
          }

          .uiverse-shop-btn svg {
            transition: 400ms;
            color: white;
            stroke-width: 2.5;
          }

          .uiverse-shop-btn:hover {
            background-color: transparent;
            outline-color: #007ACC;
          }

          .uiverse-shop-btn:hover .text {
            color: #007ACC;
          }

          .uiverse-shop-btn:hover svg {
            color: #007ACC !important;
            stroke: #007ACC !important;
          }

          .styled-wrapper .back-btn {
            display: block;
            position: relative;
            width: 56px;
            height: 56px;
            margin: 0;
            overflow: hidden;
            outline: none;
            background-color: transparent;
            cursor: pointer;
            border: 0;
          }

          .styled-wrapper .back-btn:before {
            content: "";
            position: absolute;
            border-radius: 50%;
            inset: 5px;
            border: 3px solid rgba(255, 255, 255, 0.3);
            transition:
              opacity 0.4s cubic-bezier(0.77, 0, 0.175, 1) 80ms,
              transform 0.5s cubic-bezier(0.455, 0.03, 0.515, 0.955) 80ms;
          }

          .styled-wrapper .back-btn:after {
            content: "";
            position: absolute;
            border-radius: 50%;
            inset: 5px;
            border: 4px solid #4f46e5;
            transform: scale(1.3);
            transition:
              opacity 0.4s cubic-bezier(0.165, 0.84, 0.44, 1),
              transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            opacity: 0;
          }

          .styled-wrapper .back-btn:hover:before,
          .styled-wrapper .back-btn:focus:before {
            opacity: 0;
            transform: scale(0.7);
            transition:
              opacity 0.4s cubic-bezier(0.165, 0.84, 0.44, 1),
              transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          }

          .styled-wrapper .back-btn:hover:after,
          .styled-wrapper .back-btn:focus:after {
            opacity: 1;
            transform: scale(1);
            transition:
              opacity 0.4s cubic-bezier(0.77, 0, 0.175, 1) 80ms,
              transform 0.5s cubic-bezier(0.455, 0.03, 0.515, 0.955) 80ms;
          }

          .styled-wrapper .button-box {
            display: flex;
            position: absolute;
            top: 0;
            left: 0;
          }

          .styled-wrapper .button-elem {
            display: block;
            width: 20px;
            height: 20px;
            margin: 18px 13px 0 17px;
            transform: rotate(360deg);
            fill: currentColor;
          }

          .styled-wrapper .back-btn:hover .button-box,
          .styled-wrapper .back-btn:focus .button-box {
            transition: 0.4s;
            transform: translateX(-50px);
          }

          /* Double Slider Styles */
          .double-slider-container input[type="range"] {
            -webkit-appearance: none;
            appearance: none;
            width: 100%;
            background: transparent;
            position: absolute;
            pointer-events: none;
            outline: none;
          }

          .double-slider-container input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: #4f46e5;
            cursor: pointer;
            pointer-events: auto;
            border: 2px solid white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.3);
            transition: transform 0.1s ease;
          }

          .double-slider-container input[type="range"]::-webkit-slider-thumb:hover {
            transform: scale(1.2);
          }

          .double-slider-container input[type="range"]::-moz-range-thumb {
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: #4f46e5;
            cursor: pointer;
            pointer-events: auto;
            border: 2px solid white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.3);
            transition: transform 0.1s ease;
          }

          .double-slider-container input[type="range"]::-moz-range-thumb:hover {
            transform: scale(1.2);
          }

          /* Uiverse Checkbox Custom Styles - Scaled & Themed */
          .brand-cb-container {
            display: block;
            position: relative;
            cursor: pointer;
            user-select: none;
            width: 18px;
            height: 18px;
          }

          .brand-cb-container input {
            position: absolute;
            opacity: 0;
            cursor: pointer;
            height: 0;
            width: 0;
          }

          .brand-checkmark {
            position: absolute;
            top: 0;
            left: 0;
            height: 18px;
            width: 18px;
            background-color: #27272a;
            border: 1px solid #3f3f46;
            border-radius: 4px;
            transition: .4s;
          }

          .brand-checkmark:hover {
            box-shadow: inset 3px 3px 3px #18181b,
                        inset -3px -3px 3px #3f3f46;
          }

          .brand-cb-container input:checked ~ .brand-checkmark {
            box-shadow: none;
            background-color: #4f46e5;
            border-color: #6366f1;
            transform: rotateX(360deg);
          }

          .brand-cb-container input:checked ~ .brand-checkmark:hover {
            box-shadow: 0 2px 4px rgba(79, 70, 229, 0.4);
          }

          .brand-checkmark:after {
            content: "";
            position: absolute;
            display: none;
          }

          .brand-cb-container input:checked ~ .brand-checkmark:after {
            display: block;
          }

          .brand-cb-container .brand-checkmark:after {
            left: 6px;
            top: 2px;
            width: 5px;
            height: 10px;
            border: solid white;
            border-width: 0 2px 2px 0;
            transform: rotate(45deg);
          }

          /* Uiverse Cart & Notification Expand Button — vinodjangid07 style */
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

          .light .uiverse-btn {
            background-color: rgb(235, 235, 245);
            box-shadow: 0px 0px 0px 4px rgba(79, 70, 229, 0.18);
          }

          .uiverse-btn .svgIcon {
            width: 16px;
            transition-duration: 0.3s;
          }

          .uiverse-btn .svgIcon path {
            fill: white;
          }

          .light .uiverse-btn .svgIcon path {
            fill: #1f2937;
          }

          .uiverse-btn:hover {
            width: 140px;
            border-radius: 50px;
            transition-duration: 0.3s;
            background-color: #4f46e5;
            align-items: center;
          }

          .light .uiverse-btn:hover {
            background-color: #4f46e5;
          }

          .uiverse-btn:hover .svgIcon {
            transition-duration: 0.3s;
            transform: translateY(-200%);
          }

          .uiverse-btn:hover .svgIcon path {
            fill: white;
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

          /* alexroumi view-product button */
          .view-prod-btn {
            padding: 10px 18px;
            border: unset;
            border-radius: 12px;
            color: #212121;
            z-index: 1;
            background: #e8e8e8;
            position: relative;
            font-weight: 800;
            font-size: 11px;
            box-shadow: 4px 8px 19px -3px rgba(0,0,0,0.27);
            transition: all 250ms;
            overflow: hidden;
            cursor: pointer;
            letter-spacing: 0.04em;
          }

          .view-prod-btn::before {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            height: 100%;
            width: 0;
            border-radius: 12px;
            background-color: #212121;
            z-index: -1;
            box-shadow: 4px 8px 19px -3px rgba(0,0,0,0.27);
            transition: all 250ms;
          }

          .view-prod-btn:hover {
            color: #e8e8e8;
          }

          .view-prod-btn:hover::before {
            width: 100%;
          }
        `
      }} />

      {/* 1. Header Section */}
      <div className={cn(
        "flex items-center justify-between px-8 py-2 border-b sticky top-0 z-20 transition-colors duration-300",
        isLight ? "border-zinc-200/80 bg-white/80 backdrop-blur-md" : "border-[#1b1c26]/60 bg-[#07080d]/80 backdrop-blur-md"
      )}>

        {/* Left: Breadcrumbs & Back */}
        <div className="flex items-center gap-2">
          <div className="styled-wrapper -ml-3">
            <button 
              onClick={() => {
                if (isCompareOpen) {
                  setIsCompareOpen(false);
                } else if (isCategoriesPageOpen) {
                  setIsCategoriesPageOpen(false);
                } else {
                  onClose();
                }
              }} 
              className={cn("back-btn", isLight ? "text-zinc-800" : "text-zinc-100")} 
              title="Back"
            >
              <div className="button-box">
                {/* Arrow icon 1 */}
                <svg className="button-elem" viewBox="0 0 24 24">
                  <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                </svg>
                {/* Arrow icon 2 */}
                <svg className="button-elem" viewBox="0 0 24 24">
                  <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                </svg>
              </div>
            </button>
          </div>

          <div className={cn(
            "flex items-center gap-2 text-xs font-semibold select-none transition-colors",
            isLight ? "text-zinc-500" : "text-zinc-400"
          )}>
            <span className={cn("cursor-pointer transition-colors", isLight ? "hover:text-zinc-800" : "hover:text-white")} onClick={onClose}>Reels</span>
            <span className={isLight ? "text-zinc-400 font-normal" : "text-zinc-650 font-normal"}>/</span>
            <span className={cn("cursor-pointer transition-colors", isLight ? "hover:text-zinc-800" : "hover:text-white")} onClick={onClose}>Shop</span>
            <span className={isLight ? "text-zinc-400 font-normal" : "text-zinc-650 font-normal"}>/</span>
            {isCompareOpen ? (
              <>
                <span className={cn("cursor-pointer transition-colors", isLight ? "hover:text-zinc-800" : "hover:text-white")} onClick={() => setIsCompareOpen(false)}>All products</span>
                <span className={isLight ? "text-zinc-400 font-normal" : "text-zinc-650 font-normal"}>/</span>
                <span className={isLight ? "text-zinc-800 font-bold" : "text-white"}>Compare</span>
              </>
            ) : isCategoriesPageOpen ? (
              <>
                <span className={cn("cursor-pointer transition-colors", isLight ? "hover:text-zinc-800" : "hover:text-white")} onClick={() => setIsCategoriesPageOpen(false)}>All products</span>
                <span className={isLight ? "text-zinc-400 font-normal" : "text-zinc-650 font-normal"}>/</span>
                <span className={isLight ? "text-zinc-800 font-bold" : "text-white"}>Categories</span>
              </>
            ) : (
              <span className={isLight ? "text-zinc-800 font-bold" : "text-white"}>All products</span>
            )}
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">

          {/* Search bar */}
          <div className="relative w-[280px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className={cn(
                "w-full backdrop-blur-md border rounded-full py-2 pl-10 pr-4 text-[12px] focus:outline-none transition-all shadow-sm duration-300",
                isLight
                  ? "bg-white border-zinc-200 text-zinc-800 placeholder-zinc-400 focus:border-indigo-500/50"
                  : "bg-[#12131a]/40 border-[#1b1c26]/80 text-zinc-200 placeholder-zinc-500 focus:border-zinc-700/60 focus:bg-[#12131a]/80"
              )}
            />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-450" />
          </div>

          {/* Cart Icon - Expandable Uiverse Button */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="uiverse-btn cart-btn group"
            title="Cart"
          >
            <ShoppingCart className={cn("size-4.5 svgIcon transition-all", isLight ? "text-zinc-700 group-hover:text-white" : "text-zinc-200")} />
            {cart.length > 0 && (
              <span className="absolute top-1 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[8px] font-bold text-white border border-[#07080d] shadow-sm select-none">
                {cart.reduce((total, item) => total + item.quantity, 0)}
              </span>
            )}
          </button>

          {/* Notifications bell - Expandable Uiverse Button */}
          <button className="uiverse-btn alerts-btn group" title="Alerts">
            <Bell className={cn("size-4.5 svgIcon transition-all", isLight ? "text-zinc-700 group-hover:text-white" : "text-zinc-200")} />
            <span className="absolute top-1 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[8px] font-bold text-white border border-[#07080d] shadow-sm select-none">
              3
            </span>
          </button>

          {/* Profile Avatar */}
          <UserAvatar avatarUrl={user?.avatarUrl} size={36} className="border border-white/20 ml-1 rounded-full cursor-pointer hover:opacity-85 transition-opacity shrink-0" />
        </div>
      </div>

      <div className={cn(
        "flex-1 flex overflow-hidden transition-colors duration-300",
        isLight ? "bg-[#f8f9fc]" : (isCompareOpen ? "bg-[#050608]" : "bg-[#07080d]")
      )}>

        {isCompareOpen ? (
          /* Compare content layout */
          <div className="w-full overflow-y-auto bg-[#050608]">
            <div className="w-full grid grid-cols-12 gap-8 p-8 max-w-[1440px] mx-auto">
              
              {/* Left Section: Table (9 columns) */}
              <div className="col-span-9 flex flex-col gap-6 text-left">
                
                {/* Header Title & Subtitle + Top right actions */}
                <div className="flex items-center justify-between select-none">
                  <div>
                    <h1 className="text-2xl font-black tracking-tight text-white leading-none">Compare products</h1>
                    <p className="text-xs font-semibold text-zinc-500 mt-2">
                      Compare up to 4 products to find the best for you
                    </p>
                  </div>
                  
                  {/* Actions group */}
                  <div className="flex items-center gap-3">
                    {/* Share comparison */}
                    <button className="flex items-center gap-2 px-4 py-2 border border-zinc-800 bg-[#0c0d14]/40 hover:bg-[#12131a] rounded-xl text-xs font-bold text-zinc-200 transition-all cursor-pointer">
                      <Share2 className="size-3.5" />
                      <span>Share comparison</span>
                    </button>
                    {/* Clear all */}
                    <button 
                      onClick={() => setCompareList([])}
                      className="flex items-center gap-2 px-4 py-2 border border-zinc-800 bg-[#0c0d14]/40 hover:bg-[#12131a] rounded-xl text-xs font-bold text-zinc-200 transition-all cursor-pointer"
                    >
                      <Trash2 className="size-3.5" />
                      <span>Clear all</span>
                    </button>
                    {/* + Add product */}
                    <button 
                      onClick={() => setIsCompareOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 bg-[#007ACC] hover:bg-[#007ACC]/90 border-none rounded-xl text-xs font-bold text-white transition-all cursor-pointer shadow-lg shadow-blue-500/10"
                    >
                      <Plus className="size-3.5 text-white" />
                      <span>Add product</span>
                    </button>
                  </div>
                </div>

                {compareList.length === 0 ? (
                  <div className="border border-[#1b1c26]/60 bg-[#0c0d14]/30 backdrop-blur-md rounded-[32px] overflow-hidden shadow-2xl p-16 flex flex-col items-center justify-center gap-4 text-center">
                    <Scale className="size-16 text-zinc-650 animate-pulse mb-2" />
                    <h3 className="text-sm font-bold text-white">No products selected for comparison</h3>
                    <p className="text-xs text-zinc-550 max-w-md leading-normal">
                      Close the comparison panel and toggle the comparison scale icon on any product cards to add them to your comparison dashboard.
                    </p>
                    <button 
                      onClick={() => setIsCompareOpen(false)}
                      className="mt-2 px-5 py-2 bg-[#007ACC] hover:bg-[#007ACC]/90 text-xs font-bold text-white rounded-xl transition-all cursor-pointer"
                    >
                      Back to Products
                    </button>
                  </div>
                ) : (
                  /* Compare Table Grid */
                  <div className="border border-[#1b1c26]/60 bg-[#0c0d14]/30 backdrop-blur-md rounded-[32px] overflow-hidden shadow-2xl p-6 flex flex-col gap-4">
                    
                    {/* Table Header Row (Products Info cards) */}
                    <div className="flex w-full items-stretch">
                      {/* Left Label column */}
                      <div className="w-[180px] shrink-0 pr-4 flex flex-col justify-end pb-6 select-none">
                        <span className="text-[15px] font-black text-white">Products</span>
                        <span className="text-[12px] text-zinc-550 mt-1 font-semibold">{compareList.length} selected</span>
                        <button 
                          onClick={() => setIsCompareOpen(false)}
                          className="mt-3 w-fit px-4 py-1.5 border border-zinc-800 hover:bg-[#12131a] text-[11px] font-bold text-zinc-300 rounded-xl transition-all cursor-pointer"
                        >
                          Change
                        </button>
                      </div>

                      {/* Compared products columns */}
                      <div className={`flex-1 grid grid-cols-${compareList.length} gap-4`}>
                        {compareList.map((prod) => {
                          const bm = getBestMatch(prod);
                          const thumbnail = prod.thumbnailUrl || prod.sourceFrameUrl || "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400";
                          return (
                            <div key={prod.id} className="flex flex-col relative group/card border border-[#1b1c26]/40 bg-[#0c0d14]/45 rounded-2xl overflow-hidden p-3.5">
                              
                              {/* Remove X button */}
                              <button 
                                onClick={() => toggleCompare(prod)}
                                className="absolute top-2.5 right-2.5 z-10 p-1.5 bg-black/60 hover:bg-black/85 border border-white/5 rounded-full text-zinc-400 hover:text-white transition-colors cursor-pointer"
                              >
                                <X className="size-3" />
                              </button>

                              {/* Image wrapper */}
                              <div className="w-full h-[105px] rounded-xl overflow-hidden bg-zinc-950 border border-white/5 shrink-0">
                                <img src={thumbnail} alt={prod.label} className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500" />
                              </div>

                              {/* Text detail */}
                              <div className="mt-3 flex-1 flex flex-col justify-between">
                                <div>
                                  <h4 className="text-xs font-black text-white leading-tight line-clamp-1 capitalize">{prod.label}</h4>
                                  <p className="text-[9.5px] text-zinc-550 font-semibold mt-0.5 line-clamp-1 leading-tight capitalize">{prod.category || "General"}</p>
                                </div>
                                
                                <div className="mt-3 flex flex-col gap-2.5">
                                  <div className="flex items-baseline gap-1.5">
                                    <span className="text-xs font-black text-white">{bm?.price || "Contact Store"}</span>
                                  </div>

                                  <button 
                                    onClick={() => handleOpenProductDetail(prod.id)}
                                    className="w-full py-1.5 border border-[#007ACC]/30 hover:border-[#007ACC]/60 text-[10.5px] font-bold text-[#007ACC] hover:text-[#007ACC]/85 hover:bg-[#007ACC]/5 rounded-xl transition-all cursor-pointer"
                                  >
                                    View product
                                  </button>
                                </div>
                              </div>

                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="h-[1px] bg-[#1b1c26]/60 my-2" />

                    {/* Feature Rows */}
                    <div className="flex flex-col gap-2">
                      
                      {/* Price Row */}
                      <div className="flex w-full items-center py-2.5 border-b border-[#1b1c26]/20">
                        <div className="w-[180px] shrink-0 flex items-center gap-2 select-none text-zinc-400">
                          <ShoppingBag className="size-4 text-zinc-450" />
                          <span className="text-xs font-bold">Price</span>
                        </div>
                        <div className={`flex-1 grid grid-cols-${compareList.length} gap-4`}>
                          {compareList.map((prod) => {
                            const bm = getBestMatch(prod);
                            return (
                              <span key={prod.id} className="text-[11.5px] font-black text-white pl-3.5">
                                {bm?.price || "Contact Store"}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {/* Brand Row */}
                      <div className="flex w-full items-center py-2.5 border-b border-[#1b1c26]/20">
                        <div className="w-[180px] shrink-0 flex items-center gap-2 select-none text-zinc-400">
                          <Tag className="size-4 text-zinc-450" />
                          <span className="text-xs font-bold">Brand</span>
                        </div>
                        <div className={`flex-1 grid grid-cols-${compareList.length} gap-4`}>
                          {compareList.map((prod) => {
                            const bm = getBestMatch(prod);
                            const brand = prod.brand || bm?.matchBrand || "Unknown";
                            return (
                              <span key={prod.id} className="text-[11.5px] font-bold text-zinc-200 pl-3.5 capitalize truncate">
                                {brand}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {/* Rating Row */}
                      <div className="flex w-full items-center py-2.5 border-b border-[#1b1c26]/20">
                        <div className="w-[180px] shrink-0 flex items-center gap-2 select-none text-zinc-400">
                          <Star className="size-4 text-zinc-450" />
                          <span className="text-xs font-bold">Rating</span>
                        </div>
                        <div className={`flex-1 grid grid-cols-${compareList.length} gap-4`}>
                          {compareList.map((prod) => {
                            const bm = getBestMatch(prod);
                            return (
                              <div key={prod.id} className="text-xs font-bold text-white flex items-center gap-1.5 pl-3.5">
                                <Star className="size-3 text-amber-500 fill-amber-500 shrink-0" />
                                <span className="text-zinc-100">{bm?.rating || "4.5"}</span>
                                <span className="text-[10px] text-zinc-550">({bm?.reviewCount || "120"})</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Seller Row */}
                      <div className="flex w-full items-center py-2.5 border-b border-[#1b1c26]/20">
                        <div className="w-[180px] shrink-0 flex items-center gap-2 select-none text-zinc-400">
                          <User className="size-4 text-zinc-450" />
                          <span className="text-xs font-bold">Seller</span>
                        </div>
                        <div className={`flex-1 grid grid-cols-${compareList.length} gap-4`}>
                          {compareList.map((prod) => {
                            const bm = getBestMatch(prod);
                            return (
                              <span key={prod.id} className="text-[11.5px] font-bold text-zinc-200 pl-3.5 capitalize truncate">
                                {bm?.sellerName || "Direct Store"}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {/* Shipping Row */}
                      <div className="flex w-full items-center py-2.5 border-b border-[#1b1c26]/20">
                        <div className="w-[180px] shrink-0 flex items-center gap-2 select-none text-zinc-400">
                          <Truck className="size-4 text-zinc-450" />
                          <span className="text-xs font-bold">Shipping</span>
                        </div>
                        <div className={`flex-1 grid grid-cols-${compareList.length} gap-4`}>
                          {compareList.map((prod) => {
                            const bm = getBestMatch(prod);
                            return (
                              <span key={prod.id} className="text-[11.5px] font-bold text-zinc-200 pl-3.5 truncate">
                                {bm?.shippingCost || "Free Standard"}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {/* Returns Row */}
                      <div className="flex w-full items-center py-2.5 border-b border-[#1b1c26]/20">
                        <div className="w-[180px] shrink-0 flex items-center gap-2 select-none text-zinc-400">
                          <RotateCcw className="size-4 text-zinc-450" />
                          <span className="text-xs font-bold">Returns</span>
                        </div>
                        <div className={`flex-1 grid grid-cols-${compareList.length} gap-4`}>
                          {compareList.map((prod) => {
                            const bm = getBestMatch(prod);
                            return (
                              <span key={prod.id} className="text-[11.5px] font-bold text-zinc-200 pl-3.5 truncate">
                                {bm?.returnPolicy || "30-Day Returns"}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {/* Condition Row */}
                      <div className="flex w-full items-center py-2.5 border-b border-[#1b1c26]/20">
                        <div className="w-[180px] shrink-0 flex items-center gap-2 select-none text-zinc-400">
                          <ShieldCheck className="size-4 text-zinc-450" />
                          <span className="text-xs font-bold">Condition</span>
                        </div>
                        <div className={`flex-1 grid grid-cols-${compareList.length} gap-4`}>
                          {compareList.map((prod) => {
                            const bm = getBestMatch(prod);
                            return (
                              <span key={prod.id} className="text-[11.5px] font-bold text-zinc-200 pl-3.5 truncate">
                                {bm?.condition || "New"}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {/* Colors Row */}
                      <div className="flex w-full items-center py-2.5 border-b border-[#1b1c26]/20">
                        <div className="w-[180px] shrink-0 flex items-center gap-2 select-none text-zinc-400">
                          <Palette className="size-4 text-zinc-450" />
                          <span className="text-xs font-bold">Colors</span>
                        </div>
                        <div className={`flex-1 grid grid-cols-${compareList.length} gap-4`}>
                          {compareList.map((prod) => {
                            const bm = getBestMatch(prod);
                            const colors = Array.isArray(bm?.variants) 
                              ? Array.from(new Set(bm.variants.filter((v: any) => v.variantType?.toLowerCase() === "color").map((v: any) => v.variantValue)))
                              : [];
                            return (
                              <span key={prod.id} className="text-[11.5px] font-bold text-zinc-200 pl-3.5 truncate">
                                {colors.length > 0 ? colors.join(", ") : (prod.color || "Standard")}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {/* Sizes Row */}
                      <div className="flex w-full items-center py-2.5 border-b border-[#1b1c26]/20">
                        <div className="w-[180px] shrink-0 flex items-center gap-2 select-none text-zinc-400">
                          <Sparkles className="size-4 text-zinc-450" />
                          <span className="text-xs font-bold">Sizes</span>
                        </div>
                        <div className={`flex-1 grid grid-cols-${compareList.length} gap-4`}>
                          {compareList.map((prod) => {
                            const bm = getBestMatch(prod);
                            const sizes = Array.isArray(bm?.variants) 
                              ? Array.from(new Set(bm.variants.filter((v: any) => v.variantType?.toLowerCase() === "size").map((v: any) => v.variantValue)))
                              : [];
                            return (
                              <span key={prod.id} className="text-[11.5px] font-bold text-zinc-200 pl-3.5 truncate">
                                {sizes.length > 0 ? sizes.join(", ") : "Standard"}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {/* Material Row */}
                      <div className="flex w-full items-center py-2.5 border-b border-[#1b1c26]/20">
                        <div className="w-[180px] shrink-0 flex items-center gap-2 select-none text-zinc-400">
                          <Scale className="size-4 text-zinc-450" />
                          <span className="text-xs font-bold">Material</span>
                        </div>
                        <div className={`flex-1 grid grid-cols-${compareList.length} gap-4`}>
                          {compareList.map((prod) => {
                            const bm = getBestMatch(prod);
                            return (
                              <span key={prod.id} className="text-[11.5px] font-bold text-zinc-200 pl-3.5 truncate">
                                {prod.material || "Synthetic / Cotton"}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {/* Marketplace Row */}
                      <div className="flex w-full items-center py-2.5">
                        <div className="w-[180px] shrink-0 flex items-center gap-2 select-none text-zinc-400">
                          <ShoppingCart className="size-4 text-zinc-450" />
                          <span className="text-xs font-bold">Marketplace</span>
                        </div>
                        <div className={`flex-1 grid grid-cols-${compareList.length} gap-4`}>
                          {compareList.map((prod) => {
                            const bm = getBestMatch(prod);
                            const store = bm?.sourceStore || "Online Store";
                            return (
                              <span key={prod.id} className="text-[11.5px] font-extrabold text-[#007ACC] pl-3.5 uppercase">
                                {store}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                    </div>
                  </div>
                )}

              </div>

              {/* Right Section: Sidebar (3 columns) */}
              <div className="col-span-3 flex flex-col gap-6 text-left select-none">
                
                {/* Card 1: Which one is best for you? */}
                <div className="border border-[#1b1c26]/60 bg-[#0c0d14]/40 backdrop-blur-md rounded-[28px] p-5 flex flex-col gap-4 shadow-xl">
                  <div>
                    <h3 className="text-sm font-black text-white tracking-tight">Which one is best for you?</h3>
                    <p className="text-[10px] font-semibold text-zinc-550 mt-1 leading-tight">Based on your preferences</p>
                  </div>

                  {compareList.length === 0 ? (
                    <div className="p-4 border border-dashed border-zinc-800 rounded-2xl text-center text-xs text-zinc-600">
                      Select products to determine best match.
                    </div>
                  ) : (
                    <div className="border border-[#1b1c26]/30 bg-[#0c0d14]/30 rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden">
                      {/* Best match tag */}
                      <span className="absolute top-3 left-3 bg-[#007ACC] text-white text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
                        Best match
                      </span>

                      {/* Best match Image */}
                      <div className="w-full h-[110px] rounded-xl overflow-hidden bg-zinc-950 border border-white/5 mt-4 shrink-0">
                        <img 
                          src={compareList[0].thumbnailUrl || compareList[0].sourceFrameUrl || "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400"} 
                          alt="Best Match" 
                          className="w-full h-full object-cover" 
                        />
                      </div>

                      <h4 className="text-xs font-black text-white mt-1 capitalize">{compareList[0].label}</h4>

                      {/* Bullets with checkmarks */}
                      <div className="flex flex-col gap-2 mt-1">
                        <div className="flex items-center gap-2 text-[10.5px] font-bold text-zinc-300">
                          <Check className="size-3.5 text-[#007ACC] shrink-0" strokeWidth={3.5} />
                          <span>Highest match confidence</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10.5px] font-bold text-zinc-300">
                          <Check className="size-3.5 text-[#007ACC] shrink-0" strokeWidth={3.5} />
                          <span>Verified product listing</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10.5px] font-bold text-zinc-300">
                          <Check className="size-3.5 text-[#007ACC] shrink-0" strokeWidth={3.5} />
                          <span>Fast standard shipping</span>
                        </div>
                      </div>

                      <button 
                        onClick={() => handleOpenProductDetail(compareList[0].id)}
                        className="flex items-center gap-1.5 text-[10.5px] font-black text-[#007ACC] hover:text-[#007ACC]/80 mt-3 group cursor-pointer w-fit"
                      >
                        <span>View product</span>
                        <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Card 2: Similar alternatives */}
                <div className="border border-[#1b1c26]/60 bg-[#0c0d14]/40 backdrop-blur-md rounded-[28px] p-5 flex flex-col gap-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-white tracking-tight">Similar alternatives</h3>
                    <button className="text-[10px] font-black text-[#007ACC] hover:underline cursor-pointer">
                      View all
                    </button>
                  </div>

                  {/* Alternatives List */}
                  <div className="flex flex-col gap-3">
                    {[
                      { label: "Brooks Ghost 16", price: "₹14,990", rating: "4.6", reviews: "802", img: "https://images.unsplash.com/photo-1539185441755-769473a23570?w=100&q=80" },
                      { label: "New Balance 880 v14", price: "₹13,499", rating: "4.5", reviews: "760", img: "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=100&q=80" },
                      { label: "Adidas Ultraboost Light", price: "₹17,999", rating: "4.4", reviews: "540", img: "https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?w=100&q=80" }
                    ].map((alt, idx) => (
                      <div key={idx} className="flex items-center gap-3 border-b border-[#1b1c26]/10 pb-3 last:border-0 last:pb-0 group/alt">
                        {/* Image */}
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-950 border border-white/5 shrink-0">
                          <img src={alt.img} alt={alt.label} className="w-full h-full object-cover group-hover/alt:scale-105 transition-transform duration-300" />
                        </div>
                        
                        {/* Info */}
                        <div className="flex-1 flex flex-col min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[11px] font-bold text-white truncate">{alt.label}</span>
                            <Heart className="size-3 text-zinc-550 hover:text-rose-500 hover:fill-rose-500 cursor-pointer shrink-0" />
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[10px] font-black text-zinc-300">{alt.price}</span>
                            <div className="flex items-center gap-0.5 text-[9.5px] text-zinc-400 font-bold">
                              <Star className="size-2.5 text-amber-500 fill-amber-500 shrink-0" />
                              <span>{alt.rating}</span>
                              <span className="text-[8.5px] opacity-60">({alt.reviews})</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card 3: Need help choosing? */}
                <div className="border border-[#1b1c26]/60 bg-[#0c0d14]/40 backdrop-blur-md rounded-[28px] p-5 flex flex-col gap-4 shadow-xl">
                  <div>
                    <h3 className="text-sm font-black text-white tracking-tight">Need help choosing?</h3>
                    <p className="text-[10.5px] font-semibold text-zinc-550 mt-1 leading-normal">
                      {"Answer a few questions and we'll recommend the perfect shoe for you."}
                    </p>
                  </div>
                  
                  <button className="w-full py-3 bg-[#007ACC] hover:bg-[#007ACC]/90 text-[11px] font-black text-white rounded-2xl flex items-center justify-center gap-2 group cursor-pointer shadow-lg shadow-blue-500/10 transition-transform active:scale-[0.98]">
                    <span>Find my perfect shoe</span>
                    <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
                  </button>
                </div>

              </div>

            </div>
          </div>
        ) : isCategoriesPageOpen ? (
          /* Categories Page View layout */
          <div className="w-full flex overflow-hidden bg-[#050608]">
            {/* Left Area: categories row carousel + category product sections */}
            <div className="flex-1 flex flex-col p-8 overflow-y-auto">
              
              {/* Title & Subtitle */}
              <div className="text-left select-none mb-8">
                <h1 className="text-2xl font-black tracking-tight text-white leading-none">Shop by categories</h1>
                <p className="text-xs font-semibold text-zinc-500 mt-2">
                  Find products from the reel, organized for you
                </p>
              </div>

              {/* Horizontal Category Cards Carousel Row */}
              <div className="relative flex items-center mb-10 group/carousel">
                <div className="flex items-center gap-4 overflow-x-auto no-scrollbar scroll-smooth pb-2 flex-1 pr-12 select-none">
                  {CATEGORY_ITEMS.map((catItem) => {
                    const isSelected = selectedCategoryCarousel === catItem.id;
                    return (
                      <div
                        key={catItem.id}
                        onClick={() => setSelectedCategoryCarousel(catItem.id)}
                        className={cn(
                          "relative w-[130px] h-[130px] rounded-2xl overflow-hidden cursor-pointer border transition-all duration-300 shrink-0 select-none",
                          isSelected 
                            ? "border-[#007ACC] shadow-lg shadow-blue-500/10" 
                            : "border-[#1b1c26]/60 hover:border-[#1b1c26]/90"
                        )}
                      >
                        {/* Image background */}
                        <img 
                          src={catItem.imageUrl} 
                          alt={catItem.label} 
                          className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500" 
                        />
                        
                        {/* Dark gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/10" />

                        {/* Selected check circle at top right */}
                        {isSelected && (
                          <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-[#007ACC] border border-white/25 flex items-center justify-center">
                            <Check className="size-3 text-white" strokeWidth={3.5} />
                          </div>
                        )}

                        {/* Text labels at bottom left */}
                        <div className="absolute bottom-3.5 left-3.5 text-left">
                          <span className="text-xs font-black text-white">{catItem.label}</span>
                          <span className="block text-[9px] text-zinc-400 font-bold mt-0.5">{catItem.count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Right Arrow Button to slide */}
                <button className="absolute right-0 p-2.5 rounded-full border border-zinc-800 bg-[#0c0d14]/80 hover:bg-[#12131a] text-zinc-300 hover:text-white transition-all cursor-pointer shadow-lg active:scale-95">
                  <ChevronRight className="size-4" />
                </button>
              </div>

              {/* Sub-sections rendering (e.g. Tops, Bottoms) */}
              <div className="flex flex-col gap-10">
                {/* 1. Selected Category Section (e.g. Tops or whichever is selected) */}
                {Object.keys(CATEGORY_PRODUCTS_MAP)
                  .filter((catKey) => catKey === selectedCategoryCarousel)
                  .map((catKey) => {
                    const productsList = CATEGORY_PRODUCTS_MAP[catKey as keyof typeof CATEGORY_PRODUCTS_MAP] || [];
                    const catTitle = catKey.charAt(0).toUpperCase() + catKey.slice(1);
                    
                    return (
                      <div key={catKey} className="flex flex-col gap-6">
                        
                        {/* Sub-section Header and Sort Dropdown */}
                        <div className="flex items-center justify-between select-none">
                          <div className="text-left">
                            <h2 className="text-lg font-black text-white leading-none">
                              {catTitle} <span className="text-sm font-bold text-zinc-500 ml-1">({productsList.length})</span>
                            </h2>
                            <p className="text-[11px] font-semibold text-zinc-500 mt-1.5">
                              Stylish {catKey} from the reel
                            </p>
                          </div>

                          {/* Relevance Sort dropdown */}
                          <div className="relative">
                            <select
                              className="border text-xs font-bold rounded-xl px-4 py-2 focus:outline-none transition-all cursor-pointer bg-[#12131a]/40 border-[#1b1c26]/60 text-zinc-300 hover:bg-zinc-800/40 appearance-none pr-8"
                            >
                              <option value="Relevance">Sort: Relevance</option>
                              <option value="Price: Low to High">Sort: Price: Low to High</option>
                              <option value="Price: High to Low">Sort: Price: High to Low</option>
                            </select>
                            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-[9px]">&darr;</div>
                          </div>
                        </div>

                        {/* Two Columns Grid for Products */}
                        <div className="grid grid-cols-2 gap-6">
                          {productsList.map((prod) => (
                            <div 
                              key={prod.id}
                              onClick={() => handleOpenProductDetail(prod.id)}
                              className="flex flex-col border border-zinc-900 bg-[#12131a]/30 rounded-[28px] overflow-hidden group/pcard cursor-pointer hover:border-indigo-500/40 transition-all duration-300 relative shadow-2xl h-[450px]"
                            >
                              
                              {/* Product Image */}
                              <div className="w-full h-[320px] bg-zinc-950 relative overflow-hidden shrink-0">
                                <img 
                                  src={prod.imageUrl} 
                                  alt={prod.label} 
                                  className="w-full h-full object-cover group-hover/pcard:scale-105 transition-transform duration-500" 
                                  />

                                {/* Dark overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />

                          {/* Best match tag */}
                                {"isBestMatch" in prod && prod.isBestMatch && (
                                  <span className="absolute top-4 left-4 text-[9px] font-black text-white bg-emerald-600 px-2.5 py-0.5 rounded-md uppercase tracking-wider select-none">
                                    Best match
                                  </span>
                                )}

                                {/* Favorite Heart button */}
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleWishlist(prod.id);
                                  }}
                                  className="absolute top-4 right-4 p-1.5 bg-black/60 hover:bg-black/85 rounded-full border border-white/5 text-zinc-200 transition-colors duration-200 shadow-md cursor-pointer"
                                >
                                  <Heart className={cn("size-3.5", wishlist[prod.id] ? "fill-rose-500 text-rose-500" : "text-zinc-200")} strokeWidth={2.5} />
                                </button>

                                {/* Compare/Scale Toggle button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleCompare(prod);
                                  }}
                                  className={cn(
                                    "absolute top-4 right-12 p-1.5 rounded-full border border-white/5 transition-colors duration-200 shadow-md cursor-pointer",
                                    compareList.some((p) => p.id === prod.id)
                                      ? "bg-indigo-650 text-white border-indigo-500"
                                      : "bg-black/60 hover:bg-black/85 text-zinc-200"
                                  )}
                                  title="Add to compare list"
                                >
                                  <Scale className="size-3.5" strokeWidth={2.5} />
                                </button>

                                {/* Color badge dots at bottom left of image */}
                                <div className="absolute bottom-4 left-4 flex items-center gap-1.5 select-none">
                                  {prod.colors.map((color, cIdx) => (
                                    <div 
                                      key={cIdx} 
                                      className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-md"
                                      style={{ backgroundColor: color }}
                                    />
                                  ))}
                                </div>
                              </div>

                              {/* Meta Info */}
                              <div className="p-5 flex-1 flex flex-col justify-between text-left select-none bg-[#12131a]/10">
                                <div>
                                  <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-wider">{prod.brand}</span>
                                  <h4 className="text-sm font-black text-white leading-tight mt-0.5 line-clamp-1">{prod.label}</h4>
                                  
                                  {/* Price & Rating */}
                                  <div className="flex items-center justify-between mt-2.5">
                                    <span className="text-base font-black text-white">{prod.price}</span>
                                    <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-bold">
                                      <Star className="size-3 text-amber-500 fill-amber-500 shrink-0" />
                                      <span className="text-zinc-200">{prod.rating}</span>
                                      <span className="text-[9px] opacity-60">({prod.reviewsCount})</span>
                                    </div>
                                  </div>
                                </div>

                                {/* View Details & Cart row */}
                                <div className="flex items-center gap-2 mt-4">
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenProductDetail(prod.id);
                                    }}
                                    className="flex-1 py-2.5 border border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 hover:bg-zinc-800/40 rounded-xl text-[10.5px] font-black text-zinc-300 hover:text-white transition-all cursor-pointer text-center uppercase tracking-wider"
                                  >
                                    View details
                                  </button>

                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddToCart(
                                        { id: prod.id, label: prod.label, category: catTitle } as any, 
                                        { id: prod.id, price: prod.price, productUrl: "#" } as any
                                      );
                                    }}
                                    className="p-2.5 border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800/40 rounded-xl text-zinc-300 hover:text-white transition-all cursor-pointer flex items-center justify-center shrink-0 active:scale-95"
                                  >
                                    <ShoppingCart className="size-4" />
                                  </button>
                                </div>
                              </div>

                            </div>
                          ))}
                        </div>

                      </div>
                    );
                  })}

                {/* 2. Other categories shown for continuity (e.g. Bottoms (1)) */}
                {selectedCategoryCarousel !== "bottoms" && (
                  <div className="flex flex-col gap-6 opacity-65 hover:opacity-100 transition-opacity">
                    
                    {/* Header */}
                    <div className="text-left select-none">
                      <h2 className="text-lg font-black text-white leading-none">
                        Bottoms <span className="text-sm font-bold text-zinc-500 ml-1">(1)</span>
                      </h2>
                      <p className="text-[11px] font-semibold text-zinc-500 mt-1.5">
                        Bottoms that complete the look
                      </p>
                    </div>

                    {/* One product card preview */}
                    <div className="grid grid-cols-2 gap-6">
                      <div 
                        onClick={() => handleOpenProductDetail("cat-bot-1")}
                        className="flex flex-col border border-zinc-900 bg-[#12131a]/30 rounded-[28px] overflow-hidden group/pcard cursor-pointer hover:border-indigo-500/40 transition-all duration-300 relative shadow-2xl h-[450px]"
                      >
                        <div className="w-full h-[320px] bg-zinc-950 relative overflow-hidden shrink-0">
                          <img 
                            src={CATEGORY_PRODUCTS_MAP.bottoms[0].imageUrl} 
                            alt={CATEGORY_PRODUCTS_MAP.bottoms[0].label} 
                            className="w-full h-full object-cover group-hover/pcard:scale-105 transition-transform duration-500" 
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
                          <button className="absolute top-4 right-4 p-1.5 bg-black/60 rounded-full border border-white/5 text-zinc-200">
                            <Heart className="size-3.5 text-zinc-200" />
                          </button>
                          <div className="absolute bottom-4 left-4 flex items-center gap-1.5">
                            {CATEGORY_PRODUCTS_MAP.bottoms[0].colors.map((c, cIdx) => (
                              <div key={cIdx} className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ backgroundColor: c }} />
                            ))}
                          </div>
                        </div>

                        <div className="p-5 flex-1 flex flex-col justify-between text-left select-none bg-[#12131a]/10">
                          <div>
                            <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-wider">{CATEGORY_PRODUCTS_MAP.bottoms[0].brand}</span>
                            <h4 className="text-sm font-black text-white leading-tight mt-0.5 line-clamp-1">{CATEGORY_PRODUCTS_MAP.bottoms[0].label}</h4>
                            <div className="flex items-center justify-between mt-2.5">
                              <span className="text-base font-black text-white">{CATEGORY_PRODUCTS_MAP.bottoms[0].price}</span>
                              <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-bold">
                                <Star className="size-3 text-amber-500 fill-amber-500 shrink-0" />
                                <span className="text-zinc-200">{CATEGORY_PRODUCTS_MAP.bottoms[0].rating}</span>
                                <span className="text-[9px] opacity-60">({CATEGORY_PRODUCTS_MAP.bottoms[0].reviewsCount})</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 mt-4">
                            <button className="flex-1 py-2.5 border border-zinc-800 bg-zinc-900/40 rounded-xl text-[10.5px] font-black text-zinc-300 text-center uppercase tracking-wider">
                              View details
                            </button>
                            <button className="p-2.5 border border-zinc-800 bg-zinc-900/40 rounded-xl text-zinc-300 flex items-center justify-center shrink-0">
                              <ShoppingCart className="size-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Right Sidebar: Filters */}
            <div className="w-[300px] shrink-0 border-l border-[#1b1c26]/60 bg-[#0c0d14]/40 p-6 overflow-y-auto text-left select-none">
              
              {/* Filter title */}
              <div className="flex items-center justify-between mb-6">
                <span className="text-sm font-black text-white uppercase tracking-wider">Filter</span>
                <button className="text-[11px] font-black text-[#007ACC] hover:underline cursor-pointer">
                  Clear all
                </button>
              </div>

              {/* Category section */}
              <div className="border-b border-[#1b1c26]/30 pb-5 mb-5 flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs font-black text-white cursor-pointer">
                  <span>Category</span>
                  <span>v</span>
                </div>

                <div className="flex flex-col gap-2.5 mt-2">
                  {[
                    { label: "All Categories", count: 6, checked: true },
                    { label: "Tops", count: 2 },
                    { label: "Bottoms", count: 1 },
                    { label: "Footwear", count: 2 },
                    { label: "Watches", count: 1 },
                    { label: "Accessories", count: 3 },
                    { label: "Jewellery", count: 2 },
                    { label: "Bags", count: 1 }
                  ].map((catFilter, fIdx) => (
                    <label key={fIdx} className="flex items-center justify-between text-[11px] font-bold text-zinc-350 cursor-pointer group/label">
                      <div className="flex items-center gap-2">
                        <div className="brand-cb-container">
                          <input type="checkbox" defaultChecked={catFilter.checked} />
                          <span className="brand-checkmark" />
                        </div>
                        <span className="group-hover/label:text-white transition-colors">{catFilter.label}</span>
                      </div>
                      <span className="text-[10px] text-zinc-500">{catFilter.count}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Range section */}
              <div className="border-b border-[#1b1c26]/30 pb-5 mb-5 flex flex-col gap-3">
                <div className="text-xs font-black text-white">
                  <span>Price Range</span>
                </div>
                
                {/* Double Slider mockup */}
                <div className="flex flex-col gap-3 mt-2">
                  <div className="relative w-full h-1 bg-[#1b1c26] rounded-full">
                    <div className="absolute left-0 right-0 h-full bg-[#007ACC] rounded-full" />
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-[#007ACC] border-2 border-white shadow cursor-pointer" />
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-[#007ACC] border-2 border-white shadow cursor-pointer" />
                  </div>
                  
                  <div className="flex items-center justify-between text-[10px] text-zinc-550 font-bold">
                    <span>₹0</span>
                    <span>₹20,000+</span>
                  </div>

                  {/* Input boxes */}
                  <div className="flex items-center gap-2.5 mt-1 select-none">
                    <div className="flex-1 flex items-center border border-[#1b1c26] bg-[#0c0d14]/45 rounded-xl px-3 py-1.5 text-[10.5px] font-semibold text-zinc-300">
                      <span className="opacity-40 mr-1.5">₹</span>
                      <input type="text" defaultValue="0" className="w-full bg-transparent focus:outline-none text-white text-[10.5px]" />
                    </div>
                    <div className="flex-1 flex items-center border border-[#1b1c26] bg-[#0c0d14]/45 rounded-xl px-3 py-1.5 text-[10.5px] font-semibold text-zinc-300">
                      <span className="opacity-40 mr-1.5">₹</span>
                      <input type="text" defaultValue="20000" className="w-full bg-transparent focus:outline-none text-white text-[10.5px]" />
                    </div>
                  </div>

                  <button className="w-full py-2.5 bg-[#007ACC] hover:bg-[#007ACC]/90 text-[10.5px] font-black text-white rounded-xl transition-all cursor-pointer mt-1">
                    Apply
                  </button>
                </div>
              </div>

              {/* Brand section */}
              <div className="border-b border-[#1b1c26]/30 pb-5 mb-5 flex flex-col gap-3">
                <div className="text-xs font-black text-white">
                  <span>Brand</span>
                </div>
                
                <div className="relative mt-1">
                  <input 
                    type="text" 
                    placeholder="Search brand" 
                    className="w-full bg-[#0c0d14]/50 border border-[#1b1c26] rounded-xl py-2 pl-3 pr-8 text-[10px] focus:outline-none text-zinc-300 placeholder-zinc-550"
                  />
                </div>

                <div className="flex flex-col gap-2.5 mt-2">
                  {[
                    { label: "Nike", count: 2 },
                    { label: "Zara", count: 2 },
                    { label: "H&M", count: 1 },
                    { label: "Fossil", count: 1 },
                    { label: "Mango", count: 1 }
                  ].map((brandFilter, bIdx) => (
                    <label key={bIdx} className="flex items-center justify-between text-[11px] font-bold text-zinc-300 cursor-pointer group/label">
                      <div className="flex items-center gap-2">
                        <div className="brand-cb-container">
                          <input type="checkbox" />
                          <span className="brand-checkmark" />
                        </div>
                        <span className="group-hover/label:text-white transition-colors">{brandFilter.label}</span>
                      </div>
                      <span className="text-[10px] text-zinc-500">{brandFilter.count}</span>
                    </label>
                  ))}
                  
                  <span className="text-[10.5px] font-black text-[#007ACC] hover:underline cursor-pointer w-fit mt-1">
                    Show more &darr;
                  </span>
                </div>
              </div>

              {/* Rating section */}
              <div className="flex flex-col gap-3">
                <div className="text-xs font-black text-white">
                  <span>Rating</span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-1">
                  {[
                    { label: "4★ & above", value: "4" },
                    { label: "4★ & above", value: "4" },
                    { label: "3★ & above", value: "3" },
                    { label: "2★ & above", value: "2" }
                  ].map((ratingFilter, rIdx) => (
                    <button 
                      key={rIdx}
                      className="py-2 border border-zinc-800 hover:border-zinc-700 bg-[#0c0d14]/30 hover:bg-[#12131a] rounded-xl text-[10px] font-bold text-zinc-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Star className="size-2.5 text-amber-500 fill-amber-500 shrink-0" />
                      <span>{ratingFilter.label}</span>
                    </button>
                  ))}
                </div>
              </div>

            </div>

          </div>
        ) : (
          /* Products Catalog Area - full width */
          <div className={cn(
            "w-full flex flex-col p-8 overflow-y-auto transition-colors duration-300",
            isLight ? "bg-[#f1f3f9]" : "bg-[#07080d]"
          )}>

          <div className="flex-1 flex flex-col justify-between min-h-full">
            <div>
              {/* Section Title & Subtitle + Top Bar Controls (Relevance, Filter) */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 select-none">
                <div className="text-left">
                  <h2 className={cn("text-2xl font-black tracking-tight leading-none transition-colors", isLight ? "text-zinc-800" : "text-white")}>
                    All products <span className={cn("text-lg font-bold ml-1 transition-colors", isLight ? "text-zinc-500" : "text-zinc-400")}>({filteredProducts.length})</span>
                  </h2>
                  <p className={cn("text-xs font-semibold mt-1.5 transition-colors", isLight ? "text-zinc-500" : "text-zinc-400")}>
                    Products detected in this reel
                  </p>
                </div>

                {/* Dropdown controls */}
                <div className="flex items-center gap-4">
                  {/* Shop by Category Button */}
                  <button
                    onClick={() => setIsCategoriesPageOpen(true)}
                    className="uiverse-shop-btn"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="size-4"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                    <span className="text">Shop by Category</span>
                  </button>

                  {/* Compare Button */}
                  <button
                    onClick={() => setIsCompareOpen(true)}
                    className="uiverse-shop-btn"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="size-4"><path d="M16 3h5v5"></path><path d="M8 21H3v-5"></path><path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"></path><path d="M21 3L14 10"></path><path d="M3 21l7-7"></path></svg>
                    <span className="text">Compare</span>
                  </button>
                </div>
              </div>

              {/* 3. Products Grid */}
              {filteredProducts.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center select-none py-20">
                  <ShoppingBag className="size-16 text-zinc-600 animate-pulse mb-4" />
                  <p className={cn("text-sm font-bold", isLight ? "text-zinc-400" : "text-zinc-550")}>
                    No products match your active filters.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-6">
                  {paginatedProducts.map((prod) => {
                    const bm = getBestMatch(prod);
                    const brandName = getBrandName(bm, prod);
                    const categoryLabel = prod.category || "Top";

                    return (
                      <div
                        key={prod.id}
                        onClick={() => handleOpenProductDetail(prod.id)}
                        className={cn(
                          "flex flex-col border transition-all duration-300 relative group/card w-full overflow-hidden shadow-sm max-h-[350px] rounded-[24px] cursor-pointer hover:border-indigo-500/55",
                          isLight
                            ? "bg-white border-zinc-205 hover:border-zinc-300 hover:shadow-md"
                            : "bg-[#12131a]/30 border-zinc-900 hover:border-zinc-800 shadow-2xl"
                        )}
                      >
                        {/* Thumbnail Image Container - compact height */}
                        <div className="w-full h-[180px] md:h-[200px] bg-zinc-950 relative shrink-0 overflow-hidden">
                          <img
                            src={prod.thumbnailUrl || prod.sourceFrameUrl || "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&auto=format&fit=crop&q=60"}
                            alt={prod.label}
                            className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500"
                          />

                          {/* Dark gradient overlay at the bottom of the image */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />

                          {/* Category Label Tag on top-left of image */}
                          <span className="absolute top-3.5 left-3.5 text-[8px] font-black text-white bg-black/75 px-2 py-0.5 rounded-md border border-white/10 uppercase tracking-widest select-none">
                            {categoryLabel}
                          </span>

                          {/* Favorite/Heart button on top-right of image */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleWishlist(prod.id);
                            }}
                            className="absolute top-3.5 right-3.5 p-1.5 bg-black/60 hover:bg-black/85 rounded-full border border-white/5 text-zinc-200 transition-colors duration-200 shadow-md cursor-pointer"
                          >
                            <Heart
                              className={cn("size-3", wishlist[prod.id] ? "fill-rose-500 text-rose-500" : "text-zinc-200")}
                              strokeWidth={2.5}
                            />
                          </button>

                          {/* Compare/Scale Toggle button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCompare(prod);
                            }}
                            className={cn(
                              "absolute top-3.5 right-11 p-1.5 rounded-full border border-white/5 transition-colors duration-200 shadow-md cursor-pointer",
                              compareList.some((p) => p.id === prod.id)
                                ? "bg-indigo-600 text-white border-indigo-500"
                                : "bg-black/60 hover:bg-black/85 text-zinc-200"
                            )}
                            title="Add to compare list"
                          >
                            <Scale className="size-3" strokeWidth={2.5} />
                          </button>
                        </div>

                        {/* Meta info below image - compact padding */}
                        <div className={cn(
                          "p-4 flex-1 flex flex-col justify-between text-left select-none transition-colors duration-300",
                          isLight ? "bg-zinc-50/40" : "bg-[#12131a]/10"
                        )}>
                          <div>
                            <span className={cn("text-[9px] font-bold uppercase tracking-wider transition-colors", isLight ? "text-zinc-400" : "text-zinc-550")}>
                              {brandName}
                            </span>
                            <h4 className={cn("text-xs font-bold tracking-tight mt-0.5 line-clamp-1 transition-colors", isLight ? "text-zinc-800" : "text-white")}>
                              {prod.label}
                            </h4>
                            {bm && (
                              <div className="flex items-baseline gap-1.5 mt-1">
                                <span className={cn("text-sm font-black transition-colors", isLight ? "text-zinc-900" : "text-white")}>
                                  {bm.price}
                                </span>
                                <span className={cn("text-[9px] line-through font-semibold transition-colors", isLight ? "text-zinc-400" : "text-zinc-500")}>
                                  {bm.price.includes("$") ? `$${(parseFloat(bm.price.replace("$", "")) * 1.25).toFixed(2)}` : `₹${Math.round(parsePrice(bm.price) * 1.25)}`}
                                </span>
                                <span className="text-emerald-500 text-[9px] font-black uppercase">20% OFF</span>
                              </div>
                            )}
                          </div>

                          {/* View product + Add to Cart buttons row */}
                          <div className="flex items-center gap-1.5 mt-3">

                            {/* alexroumi view product button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenProductDetail(prod.id);
                              }}
                              className="view-prod-btn flex-1"
                            >
                              View Products
                            </button>

                            {/* Cart Button next to it */}
                            {bm && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddToCart(prod, bm);
                                }}
                                className={cn(
                                  "p-2 border rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 active:scale-95",
                                  isLight ? "bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-700" : "bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white"
                                )}
                                title="Add to Cart"
                              >
                                <ShoppingCart className="size-3.5" />
                              </button>
                            )}

                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 4. Bottom Pagination Section */}
            <div className={cn(
              "flex flex-col sm:flex-row items-center justify-between gap-4 border-t mt-10 pt-6 select-none text-xs transition-colors duration-300",
              isLight ? "border-zinc-200 text-zinc-500" : "border-[#1b1c26]/60 text-zinc-400"
            )}>
              <div className="font-bold">
                Showing {filteredProducts.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-
                {Math.min(currentPage * itemsPerPage, filteredProducts.length)} of {filteredProducts.length} products
              </div>

              {/* Page buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none",
                    isLight ? "bg-white border border-zinc-200 hover:border-zinc-300 text-zinc-650" : "bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-450 hover:text-white"
                  )}
                >
                  <ChevronLeft className="size-4" />
                </button>

                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs transition-all cursor-pointer",
                      currentPage === i + 1
                        ? "bg-indigo-650 text-white shadow-md shadow-indigo-600/10"
                        : (isLight ? "bg-white border border-zinc-200 hover:border-zinc-300 text-zinc-650" : "bg-zinc-900 border border-zinc-800 hover:border-zinc-750 text-zinc-400 hover:text-white")
                    )}
                  >
                    {i + 1}
                  </button>
                ))}

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none",
                    isLight ? "bg-white border border-zinc-200 hover:border-zinc-300 text-zinc-650" : "bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-450 hover:text-white"
                  )}
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>

              {/* Items Per Page Selector - themed */}
              <div className={cn("flex items-center gap-2 font-bold select-none transition-colors", isLight ? "text-zinc-600" : "text-zinc-400")}>
                <span>Items per page:</span>
                <div className="relative">
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(parseInt(e.target.value, 10));
                      setCurrentPage(1);
                    }}
                    className={cn(
                      "border text-xs font-bold rounded-lg px-2.5 py-1 pr-7 focus:outline-none cursor-pointer appearance-none transition-all duration-300",
                      isLight
                        ? "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                        : "bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-850"
                    )}
                  >
                    <option value={6}>6</option>
                    <option value={12}>12</option>
                    <option value={24}>24</option>
                  </select>
                  <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-[9px]">&darr;</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>

      {/* 5. Cart Sidebar Drawer Component */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="absolute inset-0 bg-black z-40 cursor-pointer"
            />

            {/* Sidebar Cart panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className={cn(
                "absolute right-0 top-0 bottom-0 w-full sm:w-[420px] shadow-2xl z-50 flex flex-col transition-all duration-300",
                isLight ? "bg-white border-l border-zinc-200 text-zinc-800" : "bg-[#0b0c10] border-l border-[#1b1c26] text-white"
              )}
            >
              {/* Cart Header */}
              <div className={cn("flex items-center justify-between p-6 border-b select-none", isLight ? "border-zinc-150" : "border-zinc-900/60")}>
                <div className="flex items-center gap-2.5">
                  <div className={cn("p-2.5 rounded-xl border", isLight ? "bg-zinc-50 border-zinc-200" : "bg-zinc-900 border-zinc-800")}>
                    <ShoppingCart className="size-4.5 text-indigo-500" />
                  </div>
                  <div className="text-left">
                    <h3 className={cn("text-sm font-black uppercase tracking-wider", isLight ? "text-zinc-800" : "text-white")}>Shopping Cart</h3>
                    <p className={cn("text-[10px] font-bold mt-0.5", isLight ? "text-zinc-400" : "text-zinc-500")}>
                      {cart.reduce((total, item) => total + item.quantity, 0)} items added
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className={cn(
                    "p-2 rounded-full border transition-all cursor-pointer",
                    isLight
                      ? "hover:bg-zinc-100 border-zinc-200 text-zinc-500 hover:text-zinc-800"
                      : "hover:bg-zinc-800/80 border-white/5 text-zinc-400 hover:text-white"
                  )}
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Cart Items List */}
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 select-none">
                {cart.length === 0 ? (
                  <div className="flex-grow flex flex-col items-center justify-center py-20 text-zinc-500">
                    <ShoppingCart className={cn("size-14 mb-4 animate-bounce", isLight ? "text-zinc-200" : "text-zinc-800")} />
                    <p className="text-sm font-bold">Your cart is empty.</p>
                    <p className={cn("text-[11px] mt-1", isLight ? "text-zinc-400" : "text-zinc-650")}>Add items from the spots list to buy.</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.product.id}
                      className={cn(
                        "flex gap-4 p-3 border rounded-2xl transition-all",
                        isLight ? "bg-zinc-50/50 border-zinc-150 hover:border-zinc-250" : "bg-zinc-900/35 border-zinc-900 hover:border-zinc-800"
                      )}
                    >
                      {/* Thumbnail */}
                      <div className={cn("w-16 h-20 bg-zinc-950 rounded-xl overflow-hidden shrink-0 border", isLight ? "border-zinc-200" : "border-white/5")}>
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
                            <h4 className={cn("text-xs font-bold line-clamp-2 pr-2", isLight ? "text-zinc-800" : "text-white")}>
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
                            {item.bestMatch.price}
                          </span>
                        </div>

                        {/* Quantity Counter */}
                        <div className="flex items-center justify-between mt-2.5">
                          <div className={cn(
                            "flex items-center gap-1.5 border rounded-lg p-0.5",
                            isLight ? "border-zinc-200 bg-white" : "border-zinc-800 bg-[#12131a]"
                          )}>
                            <button
                              onClick={() => handleUpdateQuantity(item.product.id, -1)}
                              className={cn(
                                "w-5 h-5 rounded flex items-center justify-center text-xs cursor-pointer select-none font-bold",
                                isLight ? "hover:bg-zinc-100 text-zinc-500" : "hover:bg-zinc-800 text-zinc-400"
                              )}
                            >
                              -
                            </button>
                            <span className={cn("text-[10px] font-black px-1 select-none", isLight ? "text-zinc-800" : "text-white")}>
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => handleUpdateQuantity(item.product.id, 1)}
                              className={cn(
                                "w-5 h-5 rounded flex items-center justify-center text-xs cursor-pointer select-none font-bold",
                                isLight ? "hover:bg-zinc-100 text-zinc-500" : "hover:bg-zinc-800 text-zinc-400"
                              )}
                            >
                              +
                            </button>
                          </div>

                          {/* Item total */}
                          <span className={cn("text-[10px] font-black", isLight ? "text-zinc-500" : "text-zinc-400")}>
                            Total: {item.bestMatch.price.includes("$") ? `$${(parseFloat(item.bestMatch.price.replace("$", "")) * item.quantity).toFixed(2)}` : `₹${parsePrice(item.bestMatch.price) * item.quantity}`}
                          </span>
                        </div>

                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Cart Footer / Checkout */}
              {cart.length > 0 && (
                <div className={cn(
                  "border-t p-6 flex flex-col gap-4 select-none transition-all duration-300",
                  isLight ? "border-zinc-200 bg-zinc-50/50" : "border-zinc-900/60 bg-[#0c0d14]"
                )}>
                  {/* Totals */}
                  <div className="flex items-center justify-between text-sm font-bold">
                    <span className={isLight ? "text-zinc-550" : "text-zinc-400"}>Subtotal:</span>
                    <span className={cn("text-base font-black", isLight ? "text-zinc-900" : "text-white")}>
                      {cart[0].bestMatch.price.includes("$")
                        ? `$${cart.reduce((sum, item) => sum + parseFloat(item.bestMatch.price.replace("$", "")) * item.quantity, 0).toFixed(2)}`
                        : `₹${cart.reduce((sum, item) => sum + parsePrice(item.bestMatch.price) * item.quantity, 0)}`
                      }
                    </span>
                  </div>

                  {/* Checkout Action */}
                  <button
                    onClick={() => {
                      alert("Successfully checked out! Redirecting you to merchant shops in new tabs...");
                      cart.forEach((item) => {
                        window.open(item.bestMatch.productUrl, "_blank");
                      });
                      saveCartToStorage([]);
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

      <AnimatePresence>
        {fullProductDetailId && (
          <FullScreenProductDetail
            productId={fullProductDetailId}
            detectedProducts={products}
            onClose={() => setFullProductDetailId(null)}
          />
        )}
      </AnimatePresence>

    </div>,
    document.body
  );
}
