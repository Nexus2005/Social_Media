"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Product, Collection, Category } from "@/features/shop/types";
import { ProductService } from "@/features/shop/services/product";
import ProductCard from "@/features/shop/components/ProductCard";
import { Search, AlertTriangle, Sparkles, Brain, Cpu, TrendingUp, Users, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

function ShopSkeleton() {
  return (
    <div className="flex flex-col gap-6 w-full animate-pulse p-4">
      <div className="h-44 w-full bg-zinc-900 rounded-[28px]" />
      <div className="h-10 w-full bg-zinc-900 rounded-xl" />
      <div className="h-8 w-1/4 bg-zinc-900 rounded-lg mt-2" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-[360px] bg-zinc-900/60 rounded-2xl border border-zinc-850/40" />
        ))}
      </div>
    </div>
  );
}

function ShopOffline({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4 px-6 select-none">
      <AlertTriangle className="size-12 text-indigo-400 animate-pulse" />
      <div>
        <h2 className="text-lg font-black text-white tracking-tight">Shop temporarily unavailable</h2>
        <p className="text-xs text-zinc-550 max-w-sm mt-1.5 leading-normal">
          The commerce backend is currently offline. Start the Medusa engine or check your network connection!
        </p>
      </div>
      <button
        onClick={onRetry}
        className="mt-2 px-5 py-2.5 bg-indigo-650 hover:bg-indigo-600 text-xs font-black text-white rounded-xl transition-all cursor-pointer shadow-lg active:scale-95 flex items-center gap-2"
      >
        <RefreshCw className="size-3.5" />
        <span>Retry Connection</span>
      </button>
    </div>
  );
}

export default function ShopHubHome() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [searchVal, setSearchVal] = useState("");

  const loadData = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const [prodData, colData, catData] = await Promise.all([
        ProductService.getProducts({ limit: 12 }),
        ProductService.getCollections(),
        ProductService.getCategories()
      ]);
      setProducts(prodData);
      setCollections(colData);
      setCategories(catData);
    } catch (e) {
      console.warn("Failed to fetch Medusa storefront data:", e);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) {
      router.push(`/shop/search?q=${encodeURIComponent(searchVal.trim())}`);
    }
  };

  if (isLoading) return <ShopSkeleton />;
  if (isError) return <ShopOffline onRetry={loadData} />;

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 md:px-6 py-6 pb-24 text-white select-none">
      
      {/* 1. HERO PROMOTIONAL BANNER */}
      <div className="relative w-full h-44 sm:h-52 bg-gradient-to-r from-indigo-900/60 to-purple-950/40 border border-indigo-500/20 rounded-[28px] overflow-hidden p-6 sm:p-8 flex flex-col justify-center text-left mb-6 shadow-xl shadow-indigo-950/15 animate-in fade-in duration-500">
        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10 blur-[1px] hidden sm:block">
          <Sparkles className="size-36 text-white" />
        </div>
        <span className="text-[10px] sm:text-xs font-black uppercase text-indigo-400 tracking-wider">
          Premium Marketplace
        </span>
        <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight mt-1 max-w-md leading-tight">
          Explore Curated Styles & Collections
        </h1>
        <p className="text-xs text-zinc-400 font-medium mt-2 max-w-sm leading-relaxed">
          Discover shoppable items directly cataloged from verified creators.
        </p>
      </div>

      {/* 2. SEARCH INPUT BAR */}
      <form onSubmit={handleSearchSubmit} className="w-full mb-8">
        <div className="relative w-full max-w-[650px] mx-auto">
          <input
            type="text"
            placeholder="Search products, brands, collections..."
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            className="w-full bg-zinc-900/40 border border-zinc-850 hover:border-zinc-800 focus:border-zinc-700 rounded-full py-3.5 pl-12 pr-5 text-sm text-white placeholder:text-zinc-500 outline-none transition-all shadow-md"
          />
          <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 size-4.5 text-zinc-500" />
        </div>
      </form>

      {/* 3. CATEGORIES CAROUSEL BAR */}
      {categories.length > 0 && (
        <div className="mb-8 text-left">
          <h2 className="text-sm font-black text-white uppercase tracking-wider mb-3">Browse Categories</h2>
          <div className="flex gap-3 overflow-x-auto pb-2.5 scrollbar-none select-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => router.push(`/shop/categories/${cat.handle}`)}
                className="px-4 py-2 bg-zinc-900/35 border border-zinc-850 hover:border-zinc-800 text-zinc-300 hover:text-white text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer shadow-sm"
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 4. PRODUCT GRID */}
      <div className="mb-10 text-left">
        <h2 className="text-sm font-black text-white uppercase tracking-wider mb-4">Featured Products</h2>
        {products.length === 0 ? (
          <p className="text-xs text-zinc-550 italic">No products found in the database.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {products.map((prod) => (
              <ProductCard key={prod.id} product={prod} />
            ))}
          </div>
        )}
      </div>

      {/* 5. EXTENSIBLE CARTLY AI SECTIONS (PLACEHOLDERS) */}
      <div className="border-t border-zinc-900/60 pt-8 mt-10 text-left flex flex-col gap-8">
        
        {/* Placeholder: AI Recommended */}
        <div className="flex flex-col gap-3 p-5 bg-zinc-900/10 border border-zinc-900 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center gap-2 text-indigo-400">
            <Brain className="size-4.5 animate-pulse" />
            <h3 className="text-xs font-black uppercase tracking-wider">AI Recommended</h3>
          </div>
          <p className="text-[11px] text-zinc-550 leading-relaxed max-w-md">
            Personalized styles chosen specifically for you by Cartly AI engines based on search interactions.
          </p>
          <span className="text-[9px] font-bold text-zinc-600 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-900/40 w-fit">
            Coming Soon
          </span>
        </div>

        {/* Placeholder: Detected from Videos */}
        <div className="flex flex-col gap-3 p-5 bg-zinc-900/10 border border-zinc-900 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center gap-2 text-indigo-400">
            <Cpu className="size-4.5" />
            <h3 className="text-xs font-black uppercase tracking-wider">Detected from Videos</h3>
          </div>
          <p className="text-[11px] text-zinc-550 leading-relaxed max-w-md">
            Browse real products detected inside your favorite Spots, clips, and creator videos dynamically.
          </p>
          <span className="text-[9px] font-bold text-zinc-600 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-900/40 w-fit">
            Coming Soon
          </span>
        </div>

        {/* Placeholder: Creators Collections */}
        <div className="flex flex-col gap-3 p-5 bg-zinc-900/10 border border-zinc-900 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center gap-2 text-indigo-400">
            <Users className="size-4.5" />
            <h3 className="text-xs font-black uppercase tracking-wider">Creator Collections</h3>
          </div>
          <p className="text-[11px] text-zinc-550 leading-relaxed max-w-md">
            Shop exclusive lines, handpicked styles, and custom wardrobes launched by verified creators.
          </p>
          <span className="text-[9px] font-bold text-zinc-600 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-900/40 w-fit">
            Coming Soon
          </span>
        </div>

      </div>

    </div>
  );
}
