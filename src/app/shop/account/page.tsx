"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/app/(main)/SessionProvider";
import UserAvatar from "@/components/UserAvatar";
import { ChevronLeft, User, Package, Heart, CreditCard, Shield, MapPin } from "lucide-react";
import Link from "next/link";

export default function ShopAccountPage() {
  const router = useRouter();
  const { user } = useSession();

  return (
    <div className="mx-auto w-full max-w-[800px] px-4 md:px-6 py-6 pb-24 text-white text-left select-none animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-8 select-none">
        <button
          onClick={() => router.push("/shop")}
          className="p-2 bg-zinc-900/40 border border-zinc-850 hover:bg-zinc-850 rounded-xl text-zinc-350 hover:text-white cursor-pointer transition-colors"
        >
          <ChevronLeft className="size-4.5" />
        </button>
        <div>
          <h1 className="text-lg font-black text-white tracking-tight">Commerce Account</h1>
          <p className="text-[10px] text-zinc-550 font-semibold mt-0.5">
            Manage your orders, addresses, and shopping settings
          </p>
        </div>
      </div>

      {/* User profile card */}
      <div className="flex items-center gap-4 p-5 bg-zinc-900/40 border border-zinc-850 rounded-3xl mb-8">
        <UserAvatar avatarUrl={user?.avatarUrl} size={54} className="border-2 border-indigo-500/40" />
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-black text-white truncate">{user?.displayName || user?.username}</h2>
          <p className="text-xs text-zinc-500 font-medium">@{user?.username}</p>
        </div>
      </div>

      {/* Quick Access Menu Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        <Link
          href="/shop/orders"
          className="flex items-center gap-3 p-4 bg-zinc-900/30 border border-zinc-850 hover:border-zinc-700/80 rounded-2xl transition-all cursor-pointer group"
        >
          <div className="p-2.5 bg-indigo-950/60 border border-indigo-900/60 rounded-xl text-indigo-400 group-hover:scale-105 transition-transform">
            <Package className="size-5" />
          </div>
          <div>
            <h3 className="text-xs font-black text-white">Order History</h3>
            <p className="text-[10px] text-zinc-550">Track recent receipts & packages</p>
          </div>
        </Link>

        <Link
          href="/shop/wishlist"
          className="flex items-center gap-3 p-4 bg-zinc-900/30 border border-zinc-850 hover:border-zinc-700/80 rounded-2xl transition-all cursor-pointer group"
        >
          <div className="p-2.5 bg-rose-950/60 border border-rose-900/60 rounded-xl text-rose-400 group-hover:scale-105 transition-transform">
            <Heart className="size-5" />
          </div>
          <div>
            <h3 className="text-xs font-black text-white">Saved Wishlist</h3>
            <p className="text-[10px] text-zinc-550">View bookmarked products</p>
          </div>
        </Link>

        <div className="flex items-center gap-3 p-4 bg-zinc-900/30 border border-zinc-850/60 rounded-2xl opacity-60">
          <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-400">
            <MapPin className="size-5" />
          </div>
          <div>
            <h3 className="text-xs font-black text-white">Saved Addresses</h3>
            <p className="text-[10px] text-zinc-550">Default shipping destinations</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 bg-zinc-900/30 border border-zinc-850/60 rounded-2xl opacity-60">
          <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-400">
            <CreditCard className="size-5" />
          </div>
          <div>
            <h3 className="text-xs font-black text-white">Payment Methods</h3>
            <p className="text-[10px] text-zinc-550">Manage saved payment options</p>
          </div>
        </div>

      </div>

    </div>
  );
}
