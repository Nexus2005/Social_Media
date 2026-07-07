"use client";

import React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ChevronLeft, CheckCircle, PackageCheck, ArrowRight } from "lucide-react";

export default function ShopOrdersPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get("id");

  return (
    <div className="mx-auto w-full max-w-[800px] px-4 md:px-6 py-12 pb-24 text-white text-center select-none animate-in fade-in duration-300">
      
      <div className="p-8 bg-zinc-900/40 border border-zinc-850 rounded-3xl flex flex-col items-center justify-center gap-4 shadow-xl">
        <div className="p-4 bg-emerald-950/60 border border-emerald-900/60 rounded-full text-emerald-400">
          <CheckCircle className="size-10" />
        </div>

        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
            Order Confirmed
          </span>
          <h1 className="text-xl font-black text-white tracking-tight mt-1">
            Thank you for your purchase!
          </h1>
          {orderId && (
            <p className="text-xs text-zinc-500 font-mono mt-1">
              Order Reference ID: <span className="text-zinc-300 font-bold">{orderId}</span>
            </p>
          )}
        </div>

        <p className="text-xs text-zinc-400 max-w-md leading-relaxed mt-1">
          Your order has been recorded into the Medusa commerce backend. A confirmation receipt has been generated.
        </p>

        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={() => router.push("/shop")}
            className="px-6 py-2.5 bg-indigo-650 hover:bg-indigo-600 text-xs font-black text-white rounded-xl shadow-lg cursor-pointer transition-all flex items-center gap-2"
          >
            <span>Continue Shopping</span>
            <ArrowRight className="size-3.5" />
          </button>
        </div>
      </div>

    </div>
  );
}
