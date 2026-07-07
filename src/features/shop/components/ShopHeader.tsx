"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/app/(main)/SessionProvider";
import { useCart } from "@/features/shop/contexts/CartContext";
import { useWishlist } from "@/features/shop/contexts/WishlistContext";
import { 
  Search, Sparkles, Heart, Bell, ShoppingBag, MapPin, 
  ChevronDown, LogOut, User, ShoppingCart, LayoutDashboard, ArrowLeftRight
} from "lucide-react";
import { logout } from "@/app/(auth)/actions";

export default function ShopHeader() {
  const router = useRouter();
  const { user } = useSession();
  const { cart } = useCart();
  const { wishlistIds } = useWishlist();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState({ postcode: "422001", city: "Nashik" });
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Load postcode from backend
  useEffect(() => {
    fetch("/api/shop/location")
      .then(res => res.json())
      .then(data => {
        if (data.postcode) {
          setLocation({ postcode: data.postcode, city: data.city });
        }
      })
      .catch(err => console.error("Error loading location", err));

    // Mock initial notifications
    setNotifications([
      { id: "1", title: "Seller KYC Approved", message: "Your store registration has been verified.", time: "2h ago" },
      { id: "2", title: "Price Drop Alert", message: "Sony WH-1000XM5 price dropped by 10%!", time: "5h ago" }
    ]);
  }, []);

  const handlePostcodeChange = async (postcode: string) => {
    try {
      const res = await fetch("/api/shop/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postcode })
      });
      const data = await res.json();
      if (data.success) {
        setLocation({ postcode: data.postcode, city: data.city });
        setShowLocationDropdown(false);
        // Reload page to update catalog delivery context if needed
        window.location.reload();
      }
    } catch (err) {
      console.error("Error updating location", err);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/shop/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const cartCount = cart?.items?.reduce((acc, item) => acc + item.quantity, 0) || 0;
  const wishlistCount = wishlistIds?.length || 0;
  const unreadNotificationsCount = notifications.length;

  return (
    <header className="shop-full-width-container w-full bg-zinc-950 border-b border-zinc-800 text-white sticky top-0 z-40 backdrop-blur-md bg-opacity-95">
      <div className="max-w-[1650px] mx-auto px-3 lg:px-6 h-20 flex items-center justify-between gap-6">
        
        {/* Logo and Back Link */}
        <div className="flex items-center gap-4 whitespace-nowrap">
          <Link href="/shop" className="flex items-center gap-2 group whitespace-nowrap">
            <img 
              src="/android-chrome-192x192-Photoroom.png" 
              alt="Cartly Logo" 
              className="size-9 object-contain group-hover:scale-105 transition-transform duration-300"
            />
            <span className="text-2xl font-black tracking-tight text-white font-nunito flex items-center whitespace-nowrap">
              Cartly<span className="text-violet-500 font-extrabold text-sm tracking-widest uppercase ml-1.5">Shop</span>
            </span>
          </Link>
        </div>

        {/* Deliver Location Selector */}
        <div className="relative">
          <button 
            onClick={() => setShowLocationDropdown(!showLocationDropdown)}
            className="flex items-center gap-1.5 bg-transparent hover:text-zinc-200 transition-all duration-200 cursor-pointer"
          >
            <MapPin className="w-4.5 h-4.5 text-zinc-400 shrink-0" />
            <div className="text-left leading-tight hidden sm:block text-xs font-semibold text-zinc-400">
              <span>Deliver to <span className="text-zinc-200 font-bold">{location.city}, {location.postcode}</span></span>
            </div>
            <ChevronDown className="size-3.5 text-zinc-400 shrink-0" />
          </button>
          
          {showLocationDropdown && (
            <div className="absolute left-0 mt-2.5 w-56 rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 shadow-2xl z-50">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-3 py-2 border-b border-zinc-800">Select Postcode</p>
              <button 
                onClick={() => handlePostcodeChange("422001")}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium hover:bg-zinc-800 transition-all duration-150 ${location.postcode === "422001" ? "text-violet-400 font-bold bg-violet-950/20" : "text-zinc-300"}`}
              >
                Nashik (422001) - Fallback
              </button>
              <button 
                onClick={() => handlePostcodeChange("400001")}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium hover:bg-zinc-800 transition-all duration-150 ${location.postcode === "400001" ? "text-violet-400 font-bold bg-violet-950/20" : "text-zinc-300"}`}
              >
                Mumbai (400001)
              </button>
              <button 
                onClick={() => handlePostcodeChange("110001")}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium hover:bg-zinc-800 transition-all duration-150 ${location.postcode === "110001" ? "text-violet-400 font-bold bg-violet-950/20" : "text-zinc-300"}`}
              >
                New Delhi (110001)
              </button>
            </div>
          )}
        </div>

        {/* Large Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex-grow max-w-[620px] hidden md:block">
          <label className="sr-only" htmlFor="voice-search">Search</label>
          <div className="relative w-full flex items-center">
            <div className="relative w-full">
              <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                <svg
                  viewBox="0 0 21 21"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                  className="w-4 h-4 text-zinc-500"
                >
                  <path
                    d="M11.15 5.6h.01m3.337 1.913h.01m-6.979 0h.01M5.541 11h.01M15 15h2.706a1.957 1.957 0 0 0 1.883-1.325A9 9 0 1 0 2.043 11.89 9.1 9.1 0 0 0 7.2 19.1a8.62 8.62 0 0 0 3.769.9A2.013 2.013 0 0 0 13 18v-.857A2.034 2.034 0 0 1 15 15Z"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    stroke="currentColor"
                  ></path>
                </svg>
              </div>
              <input
                type="text"
                required
                placeholder="Search for products, brands, creators..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 text-sm rounded-xl focus:border-violet-600 focus:ring-1 focus:ring-violet-600 block ps-10 pe-10 py-2.5 placeholder-zinc-500 transition-all duration-200 outline-none"
                id="voice-search"
              />
              <button
                className="absolute inset-y-0 end-0 flex items-center pe-3 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                type="button"
                title="Voice Search"
              >
                <svg
                  viewBox="0 0 16 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                  className="w-4 h-4 hover:text-white transition-colors"
                >
                  <path
                    d="M15 7v3a5.006 5.006 0 0 1-5 5H6a5.006 5.006 0 0 1-5-5V7m7 9v3m-3 0h6M7 1h2a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V4a3 3 0 0 1 3-3Z"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    stroke="currentColor"
                  ></path>
                </svg>
              </button>
            </div>
            <button
              className="inline-flex items-center justify-center p-2.5 ms-2 text-sm font-medium text-white bg-violet-600 rounded-xl border border-violet-600 hover:bg-violet-500 focus:ring-4 focus:outline-none focus:ring-violet-900 transition-all cursor-pointer h-[42px] w-12 shrink-0"
              type="submit"
            >
              <svg
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                className="w-4 h-4"
              >
                <path
                  d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  stroke="currentColor"
                ></path>
              </svg>
            </button>
          </div>
        </form>

        {/* Right Action Icons */}
        <div className="flex items-center gap-4 lg:gap-6">
          
          {/* AI Shopping Animating Search */}
          <div className="ask-ai-wrapper">
            <div className="ai-input-container">
              <input 
                type="text" 
                className="ai-input" 
                placeholder="AI Shopping..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const val = (e.target as HTMLInputElement).value.trim();
                    if (val) {
                      router.push(`/shop/search?q=${encodeURIComponent(val)}&ai=true`);
                    }
                  }
                }}
              />
              <div className="icon-container">
                <Sparkles className="ai-icon w-4 h-4 text-zinc-400" />
              </div>
              <div className="underline-effect"></div>
              <div className="ripple-circle"></div>
              <div className="bg-fade"></div>
              <div className="floating-dots">
                <span></span>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>

          {/* Wishlist Icon */}
          <Link href="/shop/wishlist" className="relative p-2 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-white transition-all duration-150">
            <Heart className="size-5" />
            {wishlistCount > 0 && (
              <span className="absolute top-1.5 right-1.5 bg-red-500 text-[10px] text-white font-bold h-4 w-4 rounded-full flex items-center justify-center leading-none">
                {wishlistCount}
              </span>
            )}
          </Link>

          {/* Notifications Center Dropdown */}
          <div className="relative">
            <button 
              onClick={() => {
                setShowNotificationDropdown(!showNotificationDropdown);
                setShowProfileDropdown(false);
              }}
              className="relative p-2 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-white transition-all duration-150"
            >
              <Bell className="size-5" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 bg-violet-600 text-[10px] text-white font-bold h-4 w-4 rounded-full flex items-center justify-center leading-none">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            {showNotificationDropdown && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl border border-zinc-800 bg-zinc-900 p-2 shadow-2xl z-50">
                <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
                  <p className="text-xs font-bold text-zinc-300">Notifications</p>
                  <button className="text-[10px] text-violet-400 font-semibold hover:underline">Mark all as read</button>
                </div>
                <div className="divide-y divide-zinc-800 max-h-72 overflow-y-auto">
                  {notifications.map(n => (
                    <div key={n.id} className="p-3 hover:bg-zinc-800/40 transition-colors duration-150">
                      <div className="flex justify-between items-start">
                        <p className="text-xs font-bold text-zinc-200">{n.title}</p>
                        <span className="text-[9px] text-zinc-500">{n.time}</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1 leading-normal">{n.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Cart Icon */}
          <Link href="/shop/cart" className="relative p-2 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-white transition-all duration-150">
            <ShoppingBag className="size-5" />
            {cartCount > 0 && (
              <span className="absolute top-1.5 right-1.5 bg-violet-500 text-[10px] text-white font-bold h-4 w-4 rounded-full flex items-center justify-center leading-none">
                {cartCount}
              </span>
            )}
          </Link>

          {/* User Profile Trigger */}
          <div className="relative">
            <button 
              onClick={() => {
                setShowProfileDropdown(!showProfileDropdown);
                setShowNotificationDropdown(false);
              }}
              className="flex items-center gap-1.5 p-1 rounded-full border border-zinc-800 hover:border-zinc-700 transition-all duration-150"
            >
              <img 
                src={user?.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&q=80"}
                alt="Avatar"
                className="w-8 h-8 rounded-full object-cover"
              />
            </button>

            {showProfileDropdown && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-zinc-800 bg-zinc-900 p-2 shadow-2xl z-50">
                <div className="px-3 py-2 border-b border-zinc-800">
                  <p className="text-xs font-bold text-zinc-200">{user?.displayName || "Omkar Ahirrao"}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5 truncate">@{user?.username || "omkar"}</p>
                </div>
                <div className="py-1">
                  <Link 
                    href="/shop/orders" 
                    onClick={() => setShowProfileDropdown(false)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all duration-150"
                  >
                    <ShoppingCart className="size-4" />
                    My Orders
                  </Link>
                  <Link 
                    href="/shop/sell" 
                    onClick={() => setShowProfileDropdown(false)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all duration-150"
                  >
                    <LayoutDashboard className="size-4" />
                    Sell on Cartly
                  </Link>
                  <Link 
                    href="/" 
                    onClick={() => setShowProfileDropdown(false)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all duration-150 border-t border-zinc-800/80"
                  >
                    <User className="size-4" />
                    Back to Feed
                  </Link>
                </div>
                <div className="border-t border-zinc-800 pt-1">
                  <button 
                    onClick={() => {
                      logout();
                      setShowProfileDropdown(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2.5 rounded-lg text-xs text-red-400 hover:bg-red-950/20 hover:text-red-300 transition-all duration-150"
                  >
                    <LogOut className="size-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  );
}
