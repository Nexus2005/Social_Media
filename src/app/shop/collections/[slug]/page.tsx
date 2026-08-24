"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Product } from "@/features/shop/types";
import { CartlyAdapter } from "@/features/shop/adapters/cartlyAdapter";
import CartlyProductCard from "@/features/shop/components/CartlyProductCard";
import { ChevronLeft, Loader2, AlertTriangle } from "lucide-react";

interface CollectionPageProps {
  params: Promise<{ slug: string }> | { slug: string };
}

const cartlyAdapter = new CartlyAdapter();

export default function ShopCollectionPage({ params }: CollectionPageProps) {
  const router = useRouter();
  const resolvedParams = params && typeof (params as any).then === "function" ? React.use(params as Promise<{ slug: string }>) : (params as { slug: string });
  const slug = resolvedParams.slug;

  const [products, setProducts] = useState<Product[]>([]);
  const [colTitle, setColTitle] = useState(slug);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const loadCollectionProducts = async () => {
      setIsLoading(true);
      setIsError(false);
      try {
        // Collections lookup and product fetch are independent — run in parallel
        const [collections, data] = await Promise.all([
          cartlyAdapter.getCollections().catch(() => []),
          cartlyAdapter.getProducts({ collection_id: slug }),
        ]);
        const matched = collections.find(c => c.handle === slug || c.id === slug);

        if (matched) {
          setColTitle(matched.title);
          // If the slug was a handle rather than the id, refetch with the id
          if (matched.id !== slug) {
            setProducts(await cartlyAdapter.getProducts({ collection_id: matched.id }));
          } else {
            setProducts(data);
          }
        } else {
          setProducts(data);
        }
      } catch (e) {
        console.warn("Failed to fetch collection products:", e);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadCollectionProducts();
  }, [slug]);

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 md:px-6 py-6 pb-24 text-white text-left select-none animate-in fade-in duration-300">
      
      {/* Back Header */}
      <div className="flex items-center gap-3 mb-8 select-none">
        <button
          onClick={() => router.push("/shop")}
          className="p-2 bg-zinc-900/40 border border-zinc-850 hover:bg-zinc-850 rounded-xl text-zinc-350 hover:text-white cursor-pointer transition-colors"
        >
          <ChevronLeft className="size-4.5" />
        </button>
        <div>
          <h1 className="text-lg font-black text-white tracking-tight capitalize">{colTitle}</h1>
          <p className="text-[10px] text-zinc-550 font-semibold mt-0.5">
            {products.length} curated products in this collection
          </p>
        </div>
      </div>

      {/* Grid rendering */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="size-6 animate-spin text-indigo-400" />
          <span className="text-xs text-zinc-500">Loading collection...</span>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-2">
          <AlertTriangle className="size-8 text-rose-500" />
          <h3 className="text-sm font-bold text-white">Connection error</h3>
          <p className="text-xs text-zinc-550">Failed to load items in this collection.</p>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 select-none">
          <p className="text-sm font-bold text-zinc-400">No products in collection</p>
          <p className="text-xs text-zinc-550 mt-1">Check back later for newly added items!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {products.map((prod) => (
            <CartlyProductCard key={prod.id} product={prod} />
          ))}
        </div>
      )}

    </div>
  );
}
