"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Product } from "../types";

interface RecentlyViewedContextType {
  recentlyViewed: Product[];
  addProductToRecentlyViewed: (product: Product) => void;
}

const RecentlyViewedContext = createContext<RecentlyViewedContextType | undefined>(undefined);

export function RecentlyViewedProvider({ children }: { children: React.ReactNode }) {
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("cartly_recently_viewed");
    if (saved) {
      try {
        setRecentlyViewed(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse recently viewed storage", e);
      }
    }
  }, []);

  const addProductToRecentlyViewed = (product: Product) => {
    setRecentlyViewed((prev) => {
      // Remove duplicate if it already exists
      const filtered = prev.filter((p) => p.id !== product.id);
      // Keep only first 8 items
      const updated = [product, ...filtered].slice(0, 8);
      localStorage.setItem("cartly_recently_viewed", JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <RecentlyViewedContext.Provider value={{ recentlyViewed, addProductToRecentlyViewed }}>
      {children}
    </RecentlyViewedContext.Provider>
  );
}

export function useRecentlyViewed() {
  const context = useContext(RecentlyViewedContext);
  if (!context) {
    throw new Error("useRecentlyViewed must be used within a RecentlyViewedProvider");
  }
  return context;
}
