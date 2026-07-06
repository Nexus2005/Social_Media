"use client";

import React from "react";
import { CartProvider } from "@/features/shop/contexts/CartContext";
import { WishlistProvider } from "@/features/shop/contexts/WishlistContext";
import { RecentlyViewedProvider } from "@/features/shop/contexts/RecentlyViewedContext";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <WishlistProvider>
        <RecentlyViewedProvider>
          {children}
        </RecentlyViewedProvider>
      </WishlistProvider>
    </CartProvider>
  );
}
