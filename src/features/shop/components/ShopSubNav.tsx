"use client";
 
import React, { useState } from "react";
import Link from "next/link";
import { Menu, ChevronDown, Award, PackageCheck, Store } from "lucide-react";
 
export default function ShopSubNav() {
  const [showAllCategories, setShowAllCategories] = useState(false);
 
  const categories = [
    { name: "For You", slug: "for-you", href: "/shop" },
    { name: "Electronics", slug: "electronics", href: "/shop/categories/electronics" },
    { name: "Fashion", slug: "fashion", href: "/shop/categories/fashion" },
    { name: "Home & Living", slug: "home-living", href: "/shop/categories/home-living" },
    { name: "Beauty", slug: "beauty", href: "/shop/categories/beauty" },
    { name: "Sports", slug: "sports", href: "/shop/categories/sports" },
    { name: "Automotive", slug: "automotive", href: "/shop/categories/automotive" },
    { name: "Books", slug: "books", href: "/shop/categories/books" }
  ];
 
  return (
    <nav className="shop-full-width-container w-full bg-transparent text-zinc-300 select-none sticky top-20 z-30">
      <div className="max-w-[1650px] mx-auto px-3 lg:px-6 h-12 flex items-center justify-between gap-6 overflow-x-auto no-scrollbar">
        
        {/* Categories List */}
        <div className="flex items-center gap-6 text-xs font-bold tracking-wide flex-shrink-0">
          
          {/* All Categories Dropdown Pill */}
          <div className="relative">
            <button 
              onClick={() => setShowAllCategories(!showAllCategories)}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-950 to-violet-900 hover:from-indigo-900 hover:to-violet-800 text-white border border-violet-800/40 transition-all duration-150 text-xs font-bold whitespace-nowrap cursor-pointer shadow-md"
            >
              <Menu className="size-4 text-violet-300" />
              <span>All Categories</span>
              <ChevronDown className="size-3.5 text-zinc-400" />
            </button>
 
            {showAllCategories && (
              <div className="absolute left-0 mt-2.5 w-60 rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 shadow-2xl z-50">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-3 py-2 border-b border-zinc-800">Browse Departments</p>
                <div className="py-1">
                  <Link href="/shop/categories/electronics" onClick={() => setShowAllCategories(false)} className="block px-3 py-2 rounded-lg text-xs hover:bg-zinc-800 transition-colors">Consumer Electronics</Link>
                  <Link href="/shop/categories/fashion" onClick={() => setShowAllCategories(false)} className="block px-3 py-2 rounded-lg text-xs hover:bg-zinc-800 transition-colors">Apparel & Fashion</Link>
                  <Link href="/shop/categories/home-living" onClick={() => setShowAllCategories(false)} className="block px-3 py-2 rounded-lg text-xs hover:bg-zinc-800 transition-colors">Home & Kitchen Care</Link>
                  <Link href="/shop/categories/beauty" onClick={() => setShowAllCategories(false)} className="block px-3 py-2 rounded-lg text-xs hover:bg-zinc-800 transition-colors">Beauty & Cosmetics</Link>
                  <Link href="/shop/categories/sports" onClick={() => setShowAllCategories(false)} className="block px-3 py-2 rounded-lg text-xs hover:bg-zinc-800 transition-colors">Sports & Outdoors</Link>
                </div>
              </div>
            )}
          </div>
 
          {/* Regular Categories list */}
          {categories.map((cat) => (
            <Link 
              key={cat.slug} 
              href={cat.href}
              className="hover:text-white text-zinc-300 transition-colors duration-150"
            >
              {cat.name}
            </Link>
          ))}
          
          <Link href="/shop/categories/more" className="flex items-center gap-1 text-zinc-300 hover:text-white transition-colors duration-150">
            <span>More</span>
            <ChevronDown className="size-3 text-zinc-500" />
          </Link>
        </div>
 
        {/* Quick Links on the right */}
        <div className="flex items-center gap-6 text-xs font-bold tracking-wide flex-shrink-0 text-zinc-400">
          <Link 
            href="/shop#deals" 
            className="flex items-center gap-1.5 hover:text-white transition-colors duration-150"
          >
            <Award className="size-4 text-violet-400" />
            Deals
          </Link>
          <Link 
            href="/shop/orders" 
            className="flex items-center gap-1.5 hover:text-white transition-colors duration-150"
          >
            <PackageCheck className="size-4 text-violet-400" />
            Track Order
          </Link>
          <Link 
            href="/shop/sell" 
            className="flex items-center gap-1.5 hover:text-white transition-colors duration-150"
          >
            <Store className="size-4 text-violet-400" />
            Sell on Cartly
          </Link>
        </div>
 
      </div>
    </nav>
  );
}
