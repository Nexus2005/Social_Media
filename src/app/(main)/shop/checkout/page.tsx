"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/features/shop/contexts/CartContext";
import { CheckoutService } from "@/features/shop/services/checkout";
import { ChevronLeft, ShieldCheck, CreditCard, Lock, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

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
        // 1. Update email & shipping address on Medusa Cart
        await CheckoutService.updateEmail(cart.id, address.email);
        await CheckoutService.updateShippingAddress(cart.id, {
          firstName: address.firstName,
          lastName: address.lastName || "User",
          addressLine1: address.addressLine1,
          city: address.city,
          postalCode: address.postalCode || "00000",
          countryCode: address.countryCode,
        });

        // 2. Complete Cart Order API
        const result = await CheckoutService.completeCart(cart.id);

        if (result.type === "order") {
          localStorage.removeItem("cartly_cart_id");
          await refreshCart();
          toast({
            description: "Order placed successfully!",
          });
          router.push(`/shop/orders?id=${result.data.id}`);
        } else {
          toast({
            variant: "destructive",
            description: "Order requires additional payment verification.",
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
          <h1 className="text-lg font-black text-white tracking-tight">Checkout</h1>
          <p className="text-[10px] text-zinc-550 font-semibold mt-0.5">
            Complete your order information
          </p>
        </div>
      </div>

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Shipping Address Inputs (7 cols) */}
        <div className="md:col-span-7 flex flex-col gap-6">
          <div className="p-5 bg-zinc-900/40 border border-zinc-850 rounded-2xl flex flex-col gap-4 text-left">
            <h2 className="text-xs font-black text-white uppercase tracking-wider">
              Shipping Information
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 block mb-1">First Name *</label>
                <input
                  type="text"
                  required
                  value={address.firstName}
                  onChange={(e) => setAddress({ ...address, firstName: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-zinc-700"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 block mb-1">Last Name</label>
                <input
                  type="text"
                  value={address.lastName}
                  onChange={(e) => setAddress({ ...address, lastName: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-zinc-700"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-zinc-400 block mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={address.email}
                onChange={(e) => setAddress({ ...address, email: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-zinc-700"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-zinc-400 block mb-1">Address *</label>
              <input
                type="text"
                required
                value={address.addressLine1}
                onChange={(e) => setAddress({ ...address, addressLine1: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-zinc-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 block mb-1">City *</label>
                <input
                  type="text"
                  required
                  value={address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-zinc-700"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 block mb-1">Postal Code</label>
                <input
                  type="text"
                  value={address.postalCode}
                  onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-zinc-700"
                />
              </div>
            </div>
          </div>

          {/* Payment Methods Notice (Payment Coming Soon) */}
          <div className="p-5 bg-zinc-900/40 border border-zinc-850 rounded-2xl flex flex-col gap-3 text-left">
            <div className="flex items-center gap-2 text-indigo-400">
              <CreditCard className="size-4" />
              <h2 className="text-xs font-black uppercase tracking-wider">Payment Options</h2>
            </div>
            
            <div className="p-3 bg-zinc-950 border border-zinc-850/80 rounded-xl flex items-center justify-between text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <Lock className="size-3.5 text-zinc-500" />
                <span className="font-bold text-zinc-300">Payment Coming Soon</span>
              </div>
              <span className="text-[9.5px] font-bold text-indigo-400 bg-indigo-950/60 border border-indigo-900/60 px-2 py-0.5 rounded">
                Test Mode
              </span>
            </div>
            <p className="text-[10.5px] text-zinc-550 leading-relaxed">
              Payment integrations (Razorpay, Stripe) will be activated soon. Placing order directly records your cart for testing.
            </p>
          </div>
        </div>

        {/* Order Items & Place Order CTA (5 cols) */}
        <div className="md:col-span-5 flex flex-col gap-4">
          <div className="p-5 bg-zinc-900/40 border border-zinc-850 rounded-2xl flex flex-col gap-4 text-left">
            <h2 className="text-xs font-black text-white uppercase tracking-wider">
              Summary ({cart.items.length} items)
            </h2>

            <div className="flex flex-col gap-3 border-b border-zinc-850/60 pb-4 max-h-56 overflow-y-auto pr-1 scrollbar-none">
              {cart.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 text-xs">
                  <img
                    src={item.thumbnail || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100"}
                    alt=""
                    className="w-10 h-10 rounded-lg object-cover bg-zinc-950 border border-zinc-850 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-white truncate">{item.productTitle}</h4>
                    <span className="text-[10px] text-zinc-500">Qty: {item.quantity}</span>
                  </div>
                  <span className="font-bold text-white">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-sm font-black text-white pt-1">
              <span>Total Payable</span>
              <span className="text-base text-indigo-400">${cart.total.toFixed(2)}</span>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3.5 bg-indigo-650 hover:bg-indigo-600 active:scale-[0.99] text-xs font-black text-white rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/40 cursor-pointer transition-all disabled:opacity-40"
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="size-4" />
                  <span>Place Order</span>
                </>
              )}
            </button>
          </div>
        </div>

      </form>

    </div>
  );
}
