"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/features/shop/contexts/CartContext";
import { cartlyAdapter } from "@/features/shop/adapters/cartlyAdapter";
import { useSession } from "@/app/(main)/SessionProvider";
import {
  MapPin,
  Mic,
  Search,
  Sparkles,
  Heart,
  Bell,
  ShoppingCart,
  ChevronDown,
  Menu,
  Percent,
  Package,
  Store,
  Trash2,
  Tag,
  CheckCircle2,
  HelpCircle,
  Lock,
  ArrowRight,
  Truck,
  RotateCcw,
  Award,
  Star,
  ShieldCheck,
  ChevronRight,
  Loader2
} from "lucide-react";
import Link from "next/link";
import CartlyProductCard from "@/features/shop/components/CartlyProductCard";

export default function ShopCartPage() {
  const router = useRouter();
  const { user } = useSession();
  const {
    cart,
    isLoading,
    updateItemQty,
    removeItem,
    applyCoupon,
    removeCoupon,
    updateSelection,
    batchUpdateSelection,
    batchRemoveItems,
    batchMoveToWishlist,
    checkout
  } = useCart();

  // Location / CMS / Recommendations States
  const [location, setLocation] = useState<{ formatted: string } | null>(null);
  const [wishlistCount, setWishlistCount] = useState<number>(0);
  const [cmsFeatures, setCmsFeatures] = useState<any[]>([]);
  const [cmsTrust, setCmsTrust] = useState<{ title: string; description: string } | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Recommendations Blocks
  const [recommendations, setRecommendations] = useState<{
    frequentlyBought: any[];
    recommended: any[];
    recentlyViewed: any[];
    creatorPicks: any[];
  } | null>(null);

  // Load auxiliary data on mount
  useEffect(() => {
    const fetchAuxiliaryData = async () => {
      try {
        const [loc, count, features, trust, recs] = await Promise.all([
          cartlyAdapter.getLocation(),
          cartlyAdapter.getWishlistCount(),
          cartlyAdapter.getCartFeaturesCMS(),
          cartlyAdapter.getCartFooterCMS(),
          cartlyAdapter.getCartRecommendations()
        ]);
        setLocation(loc);
        setWishlistCount(count);
        setCmsFeatures(features);
        setCmsTrust(trust);
        setRecommendations(recs);
      } catch (err) {
        console.error("Error loading auxiliary cart data:", err);
      }
    };
    fetchAuxiliaryData();
  }, [cart]);

  if (isLoading && !cart) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-white">
        <Loader2 className="size-8 animate-spin text-indigo-400" />
        <span className="text-xs text-zinc-500 font-medium">Loading cart details...</span>
      </div>
    );
  }

  const items = cart?.items || [];
  const isEmpty = items.length === 0;

  // Checkbox calculations
  const selectedItems = items.filter(item => item.selected);
  const selectedItemIds = selectedItems.map(item => item.id);
  const allChecked = items.length > 0 && selectedItems.length === items.length;

  const handleToggleAll = () => {
    const itemIds = items.map(item => item.id);
    batchUpdateSelection(itemIds, !allChecked);
  };

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    try {
      await applyCoupon(couponCode);
      setCouponCode("");
    } catch (err) {
      // toast shown in context
    }
  };

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    try {
      const result = await checkout();
      if (result && result.success) {
        router.push("/shop/checkout");
      }
    } catch (err) {
      // error handled in context
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/shop/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="w-full bg-[#03040b] text-white font-sans text-[13px] antialiased text-left select-none pb-24">
      {/* ────────────────────────────────────────────────────────
          HEADER Section - Matching visually layout variables
         ──────────────────────────────────────────────────────── */}
      <header className="bg-[#070913] border-b border-[#14172a] select-none">
        <div className="flex items-center px-6 py-3.5 gap-6 max-w-[1600px] mx-auto">
          {/* Logo */}
          <Link href="/shop" className="text-[20px] font-bold tracking-tight flex items-center gap-1 cursor-pointer">
            Cartly<span className="text-[#8b5cf6] text-[10px] font-black tracking-widest">SHOP</span>
          </Link>
          
          {/* Deliver location */}
          <div className="flex items-center gap-2 text-[11px] text-slate-400 cursor-pointer hover:text-white transition-colors">
            <MapPin className="size-4 text-[#8b5cf6]" />
            <div className="flex flex-col leading-none text-left">
              <span>Deliver to</span>
              <span className="font-bold text-white flex items-center gap-1 mt-0.5">
                {location?.formatted || "Nashik, 422001"} <ChevronDown className="size-3" />
              </span>
            </div>
          </div>
          
          {/* Search container */}
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-[620px] flex items-center bg-[#0f1123] border border-[#1e2243] rounded-full px-4 py-1 relative">
            <input 
              type="text" 
              placeholder="Search for products, brands, creators..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-0 outline-none text-white text-[13px] py-1.5 pr-12 placeholder-slate-500"
            />
            <Mic className="absolute right-14 size-4 text-slate-400 cursor-pointer hover:text-white" />
            <button type="submit" className="absolute right-1.5 size-8.5 rounded-full bg-[#4f46e5] flex items-center justify-center cursor-pointer hover:bg-indigo-600 transition-all border-0">
              <Search className="size-4 text-white" />
            </button>
          </form>
          
          {/* AI Shopping Button */}
          <button 
            onClick={() => router.push("/shop/search?ai=true")} 
            className="flex items-center gap-1.5 bg-gradient-to-r from-[#1e1b4b] to-[#311b92] border border-[#4338ca] px-4 py-2 rounded-full text-xs font-semibold text-[#c7d2fe] cursor-pointer hover:brightness-110 active:scale-98 transition-all shrink-0"
          >
            <Sparkles className="size-3.5" /> AI Shopping
          </button>
          
          {/* Header Actions */}
          <div className="flex items-center gap-5 ml-auto">
            <Link href="/shop/wishlist" className="relative p-1.5 text-slate-400 hover:text-white transition-colors">
              <Heart className="size-5" />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#4f46e5] text-white text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none">
                  {wishlistCount}
                </span>
              )}
            </Link>
            <div className="relative p-1.5 text-slate-400 hover:text-white cursor-pointer transition-colors">
              <Bell className="size-5" />
              <span className="absolute -top-1 -right-1 bg-[#4f46e5] text-white text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none">2</span>
            </div>
            <Link href="/shop/cart" className="relative p-1.5 text-white hover:brightness-110 transition-all">
              <ShoppingCart className="size-5 text-indigo-400" />
              {cart && cart.items.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#4f46e5] text-white text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none">
                  {cart.itemsCount}
                </span>
              )}
            </Link>
            <div className="flex items-center gap-2 cursor-pointer hover:brightness-110 transition-all select-none">
              <div className="size-8 rounded-full overflow-hidden border border-[#14172a]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={user?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=64&q=80"} 
                  alt="Profile" 
                  className="w-full h-full object-cover" 
                />
              </div>
              <span className="hidden md:flex items-center gap-1 font-medium text-xs">
                {user?.displayName || "Omkar"} <ChevronDown className="size-3 text-slate-400" />
              </span>
            </div>
          </div>
        </div>
        
        {/* Categories Bar */}
        <div className="flex items-center px-6 py-2 bg-[#070913] border-t border-[#14172a] gap-6 text-[12px] text-slate-400 max-w-[1600px] mx-auto">
          <button className="bg-[#1e1b4b] text-white px-3.5 py-1.5 rounded-md font-semibold flex items-center gap-2 cursor-pointer border-0 hover:bg-indigo-950 transition-colors">
            <Menu className="size-3.5" /> All Categories <ChevronDown className="size-3" />
          </button>
          <span onClick={() => router.push("/shop?tab=foryou")} className="cursor-pointer hover:text-white transition-colors">For You</span>
          <span onClick={() => router.push("/shop/categories/electronics")} className="cursor-pointer hover:text-white transition-colors">Electronics</span>
          <span onClick={() => router.push("/shop/categories/fashion")} className="cursor-pointer hover:text-white transition-colors">Fashion</span>
          <span onClick={() => router.push("/shop/categories/home")} className="cursor-pointer hover:text-white transition-colors">Home & Living</span>
          <span onClick={() => router.push("/shop/categories/beauty")} className="cursor-pointer hover:text-white transition-colors">Beauty</span>
          <span onClick={() => router.push("/shop/categories/sports")} className="cursor-pointer hover:text-white transition-colors">Sports</span>
          <span className="hidden lg:inline cursor-pointer hover:text-white transition-colors">Automotive</span>
          <span className="hidden lg:inline cursor-pointer hover:text-white transition-colors">Books</span>
          <span className="cursor-pointer hover:text-white transition-colors flex items-center gap-1">More <ChevronDown className="size-3" /></span>
          
          <div className="ml-auto flex items-center gap-5">
            <div onClick={() => router.push("/shop?tab=deals")} className="flex items-center gap-1 text-slate-400 hover:text-white cursor-pointer transition-colors">
              <Percent className="size-3.5 text-[#8b5cf6]" /> Deals
            </div>
            <div onClick={() => router.push("/shop/orders")} className="flex items-center gap-1 text-slate-400 hover:text-white cursor-pointer transition-colors">
              <Package className="size-3.5" /> Track Order
            </div>
            <div onClick={() => router.push("/shop/sell")} className="flex items-center gap-1 text-slate-400 hover:text-white cursor-pointer transition-colors">
              <Store className="size-3.5 text-[#8b5cf6]" /> Sell on Cartly
            </div>
          </div>
        </div>
      </header>

      {/* ────────────────────────────────────────────────────────
          MAIN WORKSPACE LAYOUT
         ──────────────────────────────────────────────────────── */}
      <main className="max-w-[1600px] mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 select-none">
        
        {/* Left Column: Product Entries (8 cols on lg) */}
        <section className="lg:col-span-8 flex flex-col">
          <div className="flex items-center justify-between mb-4 select-none">
            <h1 className="text-[22px] font-semibold flex items-baseline gap-2">
              Your Shopping Cart <span className="text-zinc-550 text-sm font-bold">({items.length})</span>
            </h1>
            <div className="flex gap-5 text-[12px] text-slate-400">
              <span className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors">
                <i data-lucide="share-2" className="size-3.5"></i> Share Cart
              </span>
              <span 
                onClick={() => {
                  const ids = items.map(i => i.id);
                  if (ids.length > 0) batchMoveToWishlist(ids);
                }} 
                className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors"
              >
                <Heart className="size-3.5" /> Move all to wishlist
              </span>
            </div>
          </div>

          {cart && cart.subtotal >= 1000 && (
            <div className="flex items-center gap-2 text-[#10b981] font-semibold text-[12px] mb-4 select-none animate-in fade-in duration-300">
              <CheckCircle2 className="size-3.5" /> You're eligible for FREE Delivery
            </div>
          )}

          {isEmpty ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-4 bg-[#090d1a] border border-[#14172a] rounded-2xl p-8 select-none">
              <div className="p-4 bg-[#03040b] rounded-full border border-[#14172a]">
                <ShoppingCart className="size-8 text-zinc-500" />
              </div>
              <div>
                <h2 className="text-base font-black text-white">Your cart is empty</h2>
                <p className="text-xs text-zinc-500 mt-1 max-w-xs leading-relaxed">
                  Browse products and add items to your cart to see them here!
                </p>
              </div>
              <button
                onClick={() => router.push("/shop")}
                className="mt-2 px-6 py-2.5 bg-[#4f46e5] hover:bg-indigo-600 text-xs font-bold text-white rounded-xl shadow-lg cursor-pointer transition-all border-0"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            <>
              {/* Checkbox Select All Toggle Header */}
              <div className="flex items-center gap-3 px-5 py-3 bg-[#090d1a]/50 border border-[#14172a] rounded-xl mb-4 select-none">
                <input 
                  type="checkbox" 
                  checked={allChecked} 
                  onChange={handleToggleAll} 
                  className="accent-[#6366f1] size-4 cursor-pointer"
                />
                <span className="text-xs text-slate-400 font-semibold">Select All ({selectedItems.length}/{items.length} items checked)</span>
              </div>

              {/* Items List */}
              <div className="flex flex-col gap-4 select-none">
                {items.map((item) => {
                  const savedPrice = (item.snapPrice || item.price);

                  return (
                    <div 
                      key={item.id} 
                      className={`relative bg-[#090d1a] border border-[#14172a] hover:border-[#1e2243] rounded-2xl p-5 flex gap-5 transition-all duration-300 ${
                        item.recentlyAdded ? "ring-1 ring-violet-500/20 bg-[#0c1122]/30" : ""
                      }`}
                    >
                      {/* Checkbox wrapper */}
                      <div className="flex items-start pt-1 shrink-0">
                        <input 
                          type="checkbox" 
                          checked={item.selected} 
                          onChange={() => updateSelection(item.id, !item.selected)} 
                          className="accent-[#6366f1] size-4 cursor-pointer"
                        />
                      </div>
                      
                      {/* Thumbnail Box */}
                      <div className="w-[100px] h-[100px] bg-[#0c1122] border border-[#14172a] rounded-xl flex items-center justify-center overflow-hidden p-2 shrink-0 select-none">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={item.snapThumbnailUrl || item.thumbnail || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200"} 
                          alt={item.productTitle} 
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      
                      {/* Middle Details */}
                      <div className="flex-1 flex flex-col justify-between pr-4">
                        <div className="text-left">
                          <div className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold">{item.snapBrand || "Generic"}</div>
                          <h2 className="text-sm font-semibold text-white mt-1 leading-snug line-clamp-1">{item.productTitle}</h2>
                          
                          <div className="flex items-center gap-3 text-[11px] mt-1.5">
                            <span className="text-[#fbbf24] font-bold flex items-center gap-0.5">
                              4.6 ★ <span className="text-slate-500 font-normal">(12.4K reviews)</span>
                            </span>
                            <span className="bg-[#1e1b4b] text-[#6366f1] text-[10px] px-1.5 py-0.5 rounded-[4px] font-semibold tracking-wide">Assured</span>
                          </div>
                          
                          <div className="text-[11px] text-slate-400 mt-2 font-medium">{item.variantTitle || "Default Configuration"}</div>
                        </div>
                        
                        <div className="text-[11px] text-slate-500 mt-3 font-semibold">
                          Delivery by Fri, 16 May • <span className="text-[#10b981]">FREE</span>
                        </div>
                      </div>
                      
                      {/* Right quantity controls */}
                      <div className="flex flex-col items-center justify-between h-[100px] shrink-0">
                        <button 
                          onClick={() => removeItem(item.id)} 
                          className="text-slate-500 hover:text-red-500 p-1 cursor-pointer transition-colors border-0"
                          title="Remove item"
                        >
                          <Trash2 className="size-4" />
                        </button>
                        
                        <div className="flex items-center border border-[#1e2243] bg-[#0f1123] rounded-lg overflow-hidden shrink-0 select-none">
                          <button 
                            onClick={() => updateItemQty(item.id, Math.max(1, item.quantity - 1))}
                            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:bg-[#14172a] hover:text-white cursor-pointer active:scale-95 transition-all text-sm font-black border-0"
                          >
                            −
                          </button>
                          <span className="qty-val px-2 text-[12px] font-bold text-white min-w-[20px] text-center select-none">{item.quantity}</span>
                          <button 
                            onClick={() => updateItemQty(item.id, item.quantity + 1)}
                            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:bg-[#14172a] hover:text-white cursor-pointer active:scale-95 transition-all text-sm font-black border-0"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      
                      {/* Pricing right aligned */}
                      <div className="text-right shrink-0 min-w-[100px] flex flex-col justify-start">
                        <span className="item-final-price text-base font-bold">
                          ₹{Math.round(savedPrice * item.quantity).toLocaleString("en-IN")}
                        </span>
                        <span className="original-slashed-price text-[11px] text-slate-500 line-through mt-0.5">
                          ₹{Math.round(savedPrice * 1.25 * item.quantity).toLocaleString("en-IN")}
                        </span>
                        <span className="discount-savings-green-tag text-[11px] text-[#10b981] font-semibold mt-0.5">20% OFF</span>
                        <div className="text-[#10b981] text-[10px] font-medium mt-1">
                          Save ₹{Math.round(savedPrice * 0.25 * item.quantity).toLocaleString("en-IN")}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Ticker Ribbon notice */}
              <div className="bg-[#050814] border border-[#14172a] rounded-xl px-5 py-3 flex justify-between items-center text-[12px] text-slate-400 mt-6 select-none animate-in slide-in-from-bottom duration-300">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="size-4 text-[#8b5cf6]" /> Yay! You saved <span className="text-[#10b981] font-bold">₹{cart ? Math.round(cart.savings).toLocaleString("en-IN") : "0"}</span> on this order
                </span>
                <span className="flex items-center gap-1.5"><RotateCcw className="size-4" /> 10 days return policy</span>
                <span className="flex items-center gap-1.5"><ShieldCheck className="size-4" /> Secure payments</span>
              </div>

              {/* Bottom selection actions */}
              <div className="flex gap-3 mt-4 select-none">
                <button 
                  onClick={() => batchRemoveItems(selectedItemIds)} 
                  disabled={selectedItems.length === 0}
                  className="bg-transparent border border-[#1e2243] hover:border-slate-400 px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5"
                >
                  <Trash2 className="size-3.5" /> Remove Selected
                </button>
                <button 
                  onClick={() => batchMoveToWishlist(selectedItemIds)} 
                  disabled={selectedItems.length === 0}
                  className="bg-transparent border border-[#1e2243] hover:border-slate-400 px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5"
                >
                  <Heart className="size-3.5" /> Move to Wishlist
                </button>
              </div>
            </>
          )}
        </section>

        {/* Right Column: Checkout Summary (4 cols on lg) */}
        <aside className="lg:col-span-4 flex flex-col gap-5">
          {/* Coupon module */}
          <div className="bg-[#090d1a] border border-[#14172a] rounded-2xl p-5 select-none text-left">
            <div className="text-sm font-semibold flex items-center gap-2 mb-4">
              <Tag className="size-4 text-[#8b5cf6]" /> Coupons & Offers
            </div>
            
            <form onSubmit={handleApplyCoupon} className="flex gap-2 mb-4">
              <input 
                type="text" 
                placeholder="Apply Coupon Code" 
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                disabled={isEmpty}
                className="flex-1 bg-[#0f1123] border border-[#1e2243] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-slate-400 disabled:opacity-50"
              />
              <button 
                type="submit" 
                disabled={isEmpty || !couponCode.trim()}
                className="bg-[#4f46e5] hover:bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-40 disabled:pointer-events-none transition-colors border-0 shrink-0"
              >
                Apply
              </button>
            </form>

            {cart && cart.couponDiscount > 0 && (
              <div className="bg-[#10b981]/5 border border-dashed border-[#10b981]/20 rounded-xl p-3 flex gap-2.5 items-start animate-in zoom-in-95 duration-300">
                <CheckCircle2 className="size-4 text-[#10b981] mt-0.5 shrink-0" />
                <div className="flex flex-col text-left">
                  <h5 className="text-[12px] font-bold text-white">BESTDEAL10 applied</h5>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    You saved extra <span className="text-[#10b981] font-semibold">₹{Math.round(cart.couponDiscount).toLocaleString("en-IN")}</span>
                  </p>
                </div>
                <span onClick={removeCoupon} className="ml-auto text-[11px] text-indigo-300 hover:text-white font-semibold cursor-pointer transition-colors select-none">
                  Remove
                </span>
              </div>
            )}
          </div>

          {/* Pricing Summary Ledger */}
          <div className="bg-[#090d1a] border border-[#14172a] rounded-2xl p-5 select-none text-left">
            <div className="text-sm font-semibold mb-4">Price Details</div>
            
            <div className="border-t border-[#14172a] pt-4 flex flex-col gap-3 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>Total MRP ({selectedItems.length} items)</span>
                <span>₹{cart ? Math.round(cart.totalMrp).toLocaleString("en-IN") : "0"}</span>
              </div>
              
              <div className="flex justify-between text-[#10b981]">
                <span>Discount on MRP</span>
                <span>- ₹{cart ? Math.round(cart.discountOnMrp).toLocaleString("en-IN") : "0"}</span>
              </div>

              {cart && cart.couponDiscount > 0 && (
                <div className="flex justify-between text-[#10b981]">
                  <span>Coupon Discount</span>
                  <span>- ₹{Math.round(cart.couponDiscount).toLocaleString("en-IN")}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Platform Fee</span>
                <span>₹{cart ? Math.round(cart.platformFee).toLocaleString("en-IN") : "0"}</span>
              </div>
              
              <div className="flex justify-between">
                <span>Delivery Charges <HelpCircle className="size-3.5 inline cursor-pointer hover:text-white" /></span>
                <span className="text-[#10b981] font-semibold">
                  {cart && cart.shippingTotal === 0 ? "FREE" : `₹${cart?.shippingTotal}`}
                </span>
              </div>
              
              <div className="flex justify-between border-t border-dashed border-[#14172a] pt-3.5 mt-1 text-[15px] font-bold text-white">
                <span>Total Amount</span>
                <span className="text-[18px] text-indigo-400">
                  ₹{cart ? Math.round(cart.total).toLocaleString("en-IN") : "0"}
                </span>
              </div>

              {cart && cart.savings > 0 && (
                <div className="text-[#10b981] text-[11px] font-medium mt-1">
                  You saved ₹{Math.round(cart.savings).toLocaleString("en-IN")} on this order
                </div>
              )}
            </div>

            <button 
              onClick={handleCheckout}
              disabled={isEmpty || selectedItems.length === 0 || isCheckingOut}
              className="w-full bg-[#4f46e5] hover:bg-indigo-600 text-white py-3.5 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-40 disabled:pointer-events-none active:scale-[0.99] flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/40 transition-all border-0 mt-5"
            >
              {isCheckingOut ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <Lock className="size-4" /> Proceed to Checkout
                </>
              )}
            </button>
          </div>

          {/* Secure assurance */}
          <div className="bg-transparent border border-dashed border-[#14172a] rounded-2xl p-5 flex gap-3 items-center text-left">
            <ShieldCheck className="size-6 text-indigo-400 shrink-0" />
            <div>
              <h4 className="text-[12px] font-bold text-white">
                {cmsTrust?.title || "Secure & Safe Payments"}
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                {cmsTrust?.description || "100% secure payments. Your data is protected."}
              </p>
            </div>
          </div>
        </aside>

        {/* Footer features banner strip */}
        <footer className="col-span-1 lg:col-span-12 grid grid-cols-2 md:grid-cols-5 gap-6 border-t border-[#14172a] pt-6 mt-6 select-none">
          {cmsFeatures.map((feat, idx) => {
            const IconMap: Record<string, any> = {
              "truck": Truck,
              "rotate-ccw": RotateCcw,
              "award": Award,
              "shield-check": ShieldCheck,
              "star": Star
            };
            const FeatIcon = IconMap[feat.icon] || ShieldCheck;

            return (
              <div key={idx} className="flex items-center gap-3.5 text-left">
                <div className="size-9 rounded-full bg-[#0c1226] flex items-center justify-center text-[#6366f1] shrink-0">
                  <FeatIcon className="size-4.5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <h4 className="text-[12px] font-bold text-white truncate">{feat.title}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-tight truncate">{feat.description}</p>
                </div>
              </div>
            );
          })}
        </footer>

        {/* ────────────────────────────────────────────────────────
            RECOMMENDATIONS ROW (AMAZON/FLIPKART CAROUSELS)
           ──────────────────────────────────────────────────────── */}
        {recommendations && (
          <section className="col-span-1 lg:col-span-12 border-t border-[#14172a] pt-10 mt-6 select-none">
            {/* 1. Frequently Bought Together */}
            {recommendations.frequentlyBought?.length > 0 && (
              <div className="mb-10 text-left">
                <h2 className="text-base font-black tracking-tight text-white flex items-center gap-2 mb-5">
                  <Sparkles className="size-4.5 text-[#8b5cf6]" /> Frequently Bought Together
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
                  {recommendations.frequentlyBought.map((prod) => (
                    <CartlyProductCard key={prod.id} product={prod} />
                  ))}
                </div>
              </div>
            )}

            {/* 2. Creator Picks */}
            {recommendations.creatorPicks?.length > 0 && (
              <div className="mb-10 text-left">
                <h2 className="text-base font-black tracking-tight text-white flex items-center gap-2 mb-5">
                  <Star className="size-4.5 text-[#fbbf24]" /> Handpicked Creator Favorites ✨
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
                  {recommendations.creatorPicks.map((prod) => (
                    <CartlyProductCard key={prod.id} product={prod} />
                  ))}
                </div>
              </div>
            )}

            {/* 3. Recommended for You */}
            {recommendations.recommended?.length > 0 && (
              <div className="mb-10 text-left">
                <h2 className="text-base font-black tracking-tight text-white flex items-center gap-2 mb-5">
                  <Heart className="size-4.5 text-indigo-400" /> Recommended For You
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
                  {recommendations.recommended.map((prod) => (
                    <CartlyProductCard key={prod.id} product={prod} />
                  ))}
                </div>
              </div>
            )}

            {/* 4. Recently Viewed */}
            {recommendations.recentlyViewed?.length > 0 && (
              <div className="text-left">
                <h2 className="text-base font-black tracking-tight text-white flex items-center gap-2 mb-5">
                  <RotateCcw className="size-4.5 text-slate-400" /> Inspired by Your Shopping History
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
                  {recommendations.recentlyViewed.map((prod) => (
                    <CartlyProductCard key={prod.id} product={prod} />
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

      </main>
    </div>
  );
}
