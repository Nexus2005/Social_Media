"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Product } from "@/features/shop/types";
import { ProductService } from "@/features/shop/services/product";
import ProductCard from "@/features/shop/components/ProductCard";
import { Search, ChevronLeft, Loader2, AlertTriangle } from "lucide-react";

export default function ShopSearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("q") || "";

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [searchVal, setSearchVal] = useState(query);

  const fetchResults = async (q: string) => {
    setIsLoading(true);
    setIsError(false);
    try {
      const data = await ProductService.getProducts({ q });
      setProducts(data);
    } catch (e) {
      console.warn("Error running shop query search:", e);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResults(query);
    setSearchVal(query);
  }, [query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) {
      router.push(`/shop/search?q=${encodeURIComponent(searchVal.trim())}`);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 md:px-6 py-6 pb-24 text-white text-left select-none animate-in fade-in duration-300">
      
      {/* Back button and Header */}
      <div className="flex items-center gap-3 mb-6 select-none">
        <button
          onClick={() => router.push("/shop")}
          className="p-2 bg-zinc-900/40 border border-zinc-850 hover:bg-zinc-850 rounded-xl text-zinc-350 hover:text-white cursor-pointer transition-colors"
        >
          <ChevronLeft className="size-4.5" />
        </button>
        <div>
          <h1 className="text-lg font-black text-white tracking-tight">Search Results</h1>
          <p className="text-[10px] text-zinc-550 font-semibold mt-0.5">
            {products.length} items matching your query
          </p>
        </div>
      </div>

      {/* Search Input */}
      <form onSubmit={handleSearch} className="w-full mb-8 max-w-[650px]">
        <div className="relative w-full">
          <input
            type="text"
            placeholder="Search products..."
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            className="w-full bg-zinc-900/40 border border-zinc-850 focus:border-zinc-700 rounded-full py-3.5 pl-12 pr-5 text-sm text-white placeholder:text-zinc-500 outline-none transition-all shadow-md"
          />
          <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 size-4.5 text-zinc-500" />
        </div>
      </form>

      {/* Results Rendering */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="size-6 animate-spin text-indigo-400" />
          <span className="text-xs text-zinc-500">Searching products...</span>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-2">
          <AlertTriangle className="size-8 text-rose-500" />
          <h3 className="text-sm font-bold text-white">Search failed</h3>
          <p className="text-xs text-zinc-550">Failed to connect to backend search service.</p>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 select-none">
          <p className="text-sm font-bold text-zinc-400">No matching products found</p>
          <p className="text-xs text-zinc-550 mt-1">Try check spelling or use another keyword.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {products.map((prod) => (
            <ProductCard key={prod.id} product={prod} />
          ))}
        </div>
      )}

    </div>
  );
}
