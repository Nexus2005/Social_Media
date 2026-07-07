"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/features/shop/contexts/CartContext";
import { CartlyAdapter } from "@/features/shop/adapters/cartlyAdapter";
import { ChevronLeft, ShieldCheck, CreditCard, Lock, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { shopEvents } from "@/features/shop/providers/events";

const cartlyAdapter = new CartlyAdapter();

export default function ShopCheckoutPage() {
  const router = useRouter();
  const { cart, refreshCart } = useCart();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [address, setAddress] = useState({
    firstName: "",
    lastName: "",
    email: "",
    addressLine1: "",
    city: "",
    postalCode: "",
    countryCode: "us",
  });

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-3 px-6">
        <h2 className="text-base font-black text-white">No active checkout</h2>
        <p className="text-xs text-zinc-550">Your cart is empty. Add products to proceed!</p>
        <button
          onClick={() => router.push("/shop")}
          className="mt-2 px-4 py-2 bg-indigo-650 text-xs font-bold text-white rounded-xl"
        >
          Back to Shop
        </button>
      </div>
    );
  }

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();

    if (!address.email || !address.firstName || !address.addressLine1 || !address.city) {
      toast({
        variant: "destructive",
        description: "Please fill out all required shipping fields.",
      });
      return;
    }

    startTransition(async () => {
      try {
        // Emit event for analytics
        shopEvents.emit("Checkout Started", {
          cartId: cart.id,
          totalAmount: cart.total
        });

        // 1. Update email & shipping address on Cart via adapter
        await cartlyAdapter.updateCart(cart.id, {
          email: address.email,
          shippingAddress: {
            firstName: address.firstName,
            lastName: address.lastName || "User",
            addressLine1: address.addressLine1,
            city: address.city,
            postalCode: address.postalCode || "00000",
            countryCode: address.countryCode,
          }
        });

        // 2. Complete Cart Order via adapter
        const order = await cartlyAdapter.completeCheckout(cart.id, {
          email: address.email,
          shippingAddress: {
            firstName: address.firstName,
            lastName: address.lastName || "User",
            addressLine1: address.addressLine1,
            city: address.city,
            postalCode: address.postalCode || "00000",
            countryCode: address.countryCode,
          }
        });

        if (order && order.id) {
          localStorage.removeItem("cartly_cart_id");
          await refreshCart();
          
          shopEvents.emit("Checkout Completed", {
            cartId: cart.id,
            orderId: order.id,
            totalAmount: cart.total
          });

          toast({
            description: "Order placed successfully!",
          });
          router.push(`/shop/orders?id=${order.id}`);
        } else {
          toast({
            variant: "destructive",
            description: "Failed to place order.",
          });
        }
      } catch (e) {
        console.error("Error completing checkout:", e);
        toast({
          variant: "destructive",
          description: "Failed to place order. Check backend connection.",
        });
      }
    });
  };

  return (
    <div className="mx-auto w-full max-w-[1000px] px-4 md:px-6 py-6 pb-24 text-white text-left select-none animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-8 select-none">
        <button
          onClick={() => router.push("/shop/cart")}
          className="p-2 bg-zinc-900/40 border border-zinc-850 hover:bg-zinc-850 rounded-xl text-zinc-350 hover:text-white cursor-pointer transition-colors"
        >
          <ChevronLeft className="size-4.5" />
        </button>
        <div>
          <h1 className="text-lg font-black text-white tracking-tight">Checkout Details</h1>
          <p className="text-[10px] text-zinc-550 font-semibold mt-0.5">
            Complete your shipping details below
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Form: Shipping Address */}
        <form onSubmit={handlePlaceOrder} className="lg:col-span-7 flex flex-col gap-5 text-left">
          <div className="bg-zinc-900/35 border border-zinc-850/60 p-5 rounded-2xl flex flex-col gap-4">
            <h3 className="text-xs font-black uppercase text-indigo-400 tracking-wider mb-1 flex items-center gap-2">
              <ShieldCheck className="size-4 text-indigo-400" />
              <span>Shipping Information</span>
            </h3>
            
            <div className="grid grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">First Name *</label>
                <input
                  type="text"
                  required
                  value={address.firstName}
                  onChange={(e) => setAddress({ ...address, firstName: e.target.value })}
                  placeholder="John"
                  className="bg-zinc-950 border border-zinc-850 hover:border-zinc-800 focus:border-zinc-700 rounded-xl py-2 px-3 text-xs text-white placeholder:text-zinc-650 outline-none transition-all"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Last Name</label>
                <input
                  type="text"
                  value={address.lastName}
                  onChange={(e) => setAddress({ ...address, lastName: e.target.value })}
                  placeholder="Doe"
                  className="bg-zinc-950 border border-zinc-850 hover:border-zinc-800 focus:border-zinc-700 rounded-xl py-2 px-3 text-xs text-white placeholder:text-zinc-650 outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase">Email Address *</label>
              <input
                type="email"
                required
                value={address.email}
                onChange={(e) => setAddress({ ...address, email: e.target.value })}
                placeholder="john.doe@example.com"
                className="bg-zinc-950 border border-zinc-850 hover:border-zinc-800 focus:border-zinc-700 rounded-xl py-2 px-3 text-xs text-white placeholder:text-zinc-650 outline-none transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase">Street Address *</label>
              <input
                type="text"
                required
                value={address.addressLine1}
                onChange={(e) => setAddress({ ...address, addressLine1: e.target.value })}
                placeholder="123 Main St, Apt 4"
                className="bg-zinc-950 border border-zinc-850 hover:border-zinc-800 focus:border-zinc-700 rounded-xl py-2 px-3 text-xs text-white placeholder:text-zinc-650 outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-3 gap-3.5">
              <div className="flex flex-col gap-1.5 col-span-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">City *</label>
                <input
                  type="text"
                  required
                  value={address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                  placeholder="New York"
                  className="bg-zinc-950 border border-zinc-850 hover:border-zinc-800 focus:border-zinc-700 rounded-xl py-2 px-3 text-xs text-white placeholder:text-zinc-650 outline-none transition-all"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase">Postal Code</label>
                <input
                  type="text"
                  value={address.postalCode}
                  onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
                  placeholder="10001"
                  className="bg-zinc-950 border border-zinc-850 hover:border-zinc-800 focus:border-zinc-700 rounded-xl py-2 px-3 text-xs text-white placeholder:text-zinc-650 outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase">Country Code</label>
              <select
                value={address.countryCode}
                onChange={(e) => setAddress({ ...address, countryCode: e.target.value })}
                className="bg-zinc-950 border border-zinc-850 hover:border-zinc-800 focus:border-zinc-700 rounded-xl py-2 px-3 text-xs text-white outline-none transition-all"
              >
                <option value="us">United States (US)</option>
                <option value="in">India (IN)</option>
                <option value="gb">United Kingdom (GB)</option>
                <option value="de">Germany (DE)</option>
              </select>
            </div>

          </div>

          {/* Secure Payment Block */}
          <div className="bg-zinc-900/35 border border-zinc-850/60 p-5 rounded-2xl flex flex-col gap-4">
            <h3 className="text-xs font-black uppercase text-indigo-400 tracking-wider mb-1 flex items-center gap-2">
              <CreditCard className="size-4 text-indigo-400" />
              <span>Mock Payment (Checkout Complete)</span>
            </h3>
            <p className="text-[11px] text-zinc-550 leading-relaxed">
              Order processing operates on sandbox configurations. Placing an order completes standard checkout flows immediately.
            </p>
            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3 bg-indigo-650 hover:bg-indigo-600 active:scale-[0.99] text-xs font-black text-white rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all disabled:opacity-40"
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <Lock className="size-3.5" />
                  <span>Place Securing Order (${cart.total.toFixed(2)})</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Right Summary: Cart list review */}
        <div className="lg:col-span-5 flex flex-col gap-5 text-left">
          <div className="bg-zinc-900/35 border border-zinc-850/60 p-5 rounded-2xl">
            <h3 className="text-xs font-black uppercase text-white tracking-wider mb-4">Order Summary</h3>
            
            <div className="flex flex-col gap-3.5 max-h-[220px] overflow-y-auto pr-1">
              {cart.items.map((item) => (
                <div key={item.id} className="flex gap-3 items-center">
                  <div className="size-11 rounded-lg overflow-hidden bg-zinc-950 shrink-0 border border-zinc-900/40">
                    {item.thumbnail && (
                      <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[11px] font-bold text-white truncate capitalize">{item.productTitle}</h4>
                    <p className="text-[9.5px] text-zinc-550 truncate font-semibold mt-0.5">
                      {item.variantTitle} · Qty {item.quantity}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-zinc-300">
                    ${(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Calculations */}
            <div className="border-t border-zinc-850/60 pt-4 mt-4 flex flex-col gap-2.5 text-xs select-none">
              <div className="flex justify-between text-zinc-400 font-semibold">
                <span>Subtotal</span>
                <span>${cart.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-zinc-400 font-semibold">
                <span>Shipping</span>
                <span>{cart.shippingTotal === 0 ? "Free" : `$${cart.shippingTotal.toFixed(2)}`}</span>
              </div>
              <div className="flex justify-between text-zinc-400 font-semibold">
                <span>Estimated Tax</span>
                <span>${cart.taxTotal.toFixed(2)}</span>
              </div>
              <div className="border-t border-zinc-850/60 pt-3 mt-1 flex justify-between font-black text-white text-sm select-none">
                <span>Total Amount</span>
                <span className="text-indigo-400">${cart.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
