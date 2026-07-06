"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/features/shop/contexts/CartContext";
import { ChevronLeft, ShoppingBag, Trash2, Plus, Minus, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";

export default function ShopCartPage() {
  const router = useRouter();
  const { cart, isLoading, updateItemQty, removeItem } = useCart();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="size-8 animate-spin text-indigo-400" />
        <span className="text-xs text-zinc-500 font-medium">Loading cart...</span>
      </div>
    );
  }

  const isEmpty = !cart || !cart.items || cart.items.length === 0;

  return (
    <div className="mx-auto w-full max-w-[1000px] px-4 md:px-6 py-6 pb-24 text-white text-left select-none animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-8 select-none">
        <button
          onClick={() => router.push("/shop")}
          className="p-2 bg-zinc-900/40 border border-zinc-850 hover:bg-zinc-850 rounded-xl text-zinc-350 hover:text-white cursor-pointer transition-colors"
        >
          <ChevronLeft className="size-4.5" />
        </button>
        <div>
          <h1 className="text-lg font-black text-white tracking-tight">Shopping Bag</h1>
          <p className="text-[10px] text-zinc-550 font-semibold mt-0.5">
            {isEmpty ? "0 items" : `${cart.items.length} unique items in bag`}
          </p>
        </div>
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4 bg-zinc-900/20 border border-zinc-850/60 rounded-3xl p-8">
          <div className="p-4 bg-zinc-900 rounded-full border border-zinc-800">
            <ShoppingBag className="size-8 text-zinc-500" />
          </div>
          <div>
            <h2 className="text-base font-black text-white">Your bag is empty</h2>
            <p className="text-xs text-zinc-550 mt-1 max-w-xs">
              Explore our marketplace products and add items to your bag!
            </p>
          </div>
          <button
            onClick={() => router.push("/shop")}
            className="mt-2 px-6 py-2.5 bg-indigo-650 hover:bg-indigo-600 text-xs font-black text-white rounded-xl shadow-lg cursor-pointer transition-all"
          >
            Start Shopping
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          
          {/* Cart Items List (7 cols) */}
          <div className="md:col-span-7 flex flex-col gap-4">
            {cart.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 p-3.5 bg-zinc-900/40 border border-zinc-850 rounded-2xl relative group"
              >
                {/* Thumbnail */}
                <div className="w-20 h-20 bg-zinc-950 rounded-xl overflow-hidden shrink-0 border border-zinc-900">
                  <img
                    src={item.thumbnail || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200"}
                    alt={item.productTitle}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Meta details */}
                <div className="flex-1 flex flex-col justify-between min-w-0 pr-6">
                  <div>
                    <h3 className="text-xs font-bold text-white leading-tight truncate">
                      {item.productTitle}
                    </h3>
                    <p className="text-[10px] text-zinc-500 font-semibold mt-0.5">
                      {item.variantTitle}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs font-black text-white">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>

                    {/* Quantity controls */}
                    <div className="flex items-center gap-2 border border-zinc-800 bg-zinc-950 px-2 py-1 rounded-lg">
                      <button
                        onClick={() => updateItemQty(item.id, Math.max(1, item.quantity - 1))}
                        className="text-zinc-400 hover:text-white cursor-pointer"
                      >
                        <Minus className="size-3" />
                      </button>
                      <span className="text-[11px] font-bold text-white px-1">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateItemQty(item.id, item.quantity + 1)}
                        className="text-zinc-400 hover:text-white cursor-pointer"
                      >
                        <Plus className="size-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Remove button */}
                <button
                  onClick={() => removeItem(item.id)}
                  className="absolute top-3 right-3 text-zinc-600 hover:text-rose-500 transition-colors cursor-pointer p-1"
                  title="Remove item"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Order Summary Box (5 cols) */}
          <div className="md:col-span-5 flex flex-col gap-4">
            <div className="p-5 bg-zinc-900/40 border border-zinc-850 rounded-2xl flex flex-col gap-4 text-left">
              <h2 className="text-xs font-black text-white uppercase tracking-wider">
                Order Summary
              </h2>

              <div className="flex flex-col gap-2.5 border-b border-zinc-850/60 pb-4 text-xs">
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Subtotal</span>
                  <span className="text-white font-bold">${cart.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Estimated Shipping</span>
                  <span className="text-emerald-400 font-bold">
                    {cart.shippingTotal > 0 ? `$${cart.shippingTotal.toFixed(2)}` : "FREE"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Estimated Tax</span>
                  <span className="text-white font-bold">${cart.taxTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm font-black text-white">
                <span>Total</span>
                <span className="text-base text-indigo-400">${cart.total.toFixed(2)}</span>
              </div>

              <button
                onClick={() => router.push("/shop/checkout")}
                className="w-full py-3.5 bg-indigo-650 hover:bg-indigo-600 active:scale-[0.99] text-xs font-black text-white rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/40 cursor-pointer transition-all"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
