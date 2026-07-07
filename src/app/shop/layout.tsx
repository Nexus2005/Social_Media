import React from "react";
import { validateRequest } from "@/auth";
import { redirect } from "next/navigation";
import SessionProvider from "@/app/(main)/SessionProvider";
import { CartProvider } from "@/features/shop/contexts/CartContext";
import { WishlistProvider } from "@/features/shop/contexts/WishlistContext";
import { RecentlyViewedProvider } from "@/features/shop/contexts/RecentlyViewedContext";
import { ThemeBridgeProvider } from "@/features/shop/providers/ThemeBridgeProvider";
import { AIProvider } from "@/features/shop/providers/AIProvider";
import ShopHeader from "@/features/shop/components/ShopHeader";
import ShopSubNav from "@/features/shop/components/ShopSubNav";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const session = await validateRequest();
  
  // Guard routing - redirect to login if unauthenticated
  if (!session.user) {
    redirect("/login");
  }

  return (
    <SessionProvider value={JSON.parse(JSON.stringify(session))}>
      <CartProvider>
        <WishlistProvider>
          <RecentlyViewedProvider>
            <ThemeBridgeProvider>
              <AIProvider>
                <div className="min-h-screen bg-zinc-950 text-white flex flex-col font-sans select-text">
                  {/* Top Level E-Commerce Navigation Bar */}
                  <ShopHeader />

                  {/* Departments and Quick Links Bar */}
                  <ShopSubNav />

                  {/* Commerce Route Wrapper */}
                  <main className="flex-grow w-full max-w-[1650px] mx-auto px-3 lg:px-6 pt-1 pb-6">
                    {children}
                  </main>

                  {/* Premium Footers */}
                  <footer className="w-full border-t border-zinc-800 bg-zinc-950 py-8 text-zinc-500 mt-16 text-center text-xs">
                    <p className="font-semibold text-zinc-400">© 2026 Cartly Marketplace Inc. All rights reserved.</p>
                    <p className="mt-1">Integrating Social Connections & Smarter Price Discoveries.</p>
                  </footer>
                </div>
              </AIProvider>
            </ThemeBridgeProvider>
          </RecentlyViewedProvider>
        </WishlistProvider>
      </CartProvider>
    </SessionProvider>
  );
}
