"use client";

import React, { useState, useEffect } from "react";
import { Store, ShieldCheck, ShieldAlert, RefreshCw, Check, XCircle, Search, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

interface SellerItem {
  id: string;
  storeName: string;
  description: string;
  logoUrl: string;
  bannerUrl: string;
  status: "PENDING" | "APPROVED" | "SUSPENDED";
  verified: boolean;
  kycSubmitted: boolean;
  kycData: any;
  createdAt: string;
  user?: {
    username: string;
    displayName: string;
    email: string;
  };
}

export default function AdminSellersPage() {
  const [sellers, setSellers] = useState<SellerItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const fetchSellers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/sellers");
      const data = await res.json();
      setSellers(data.sellers || []);
    } catch (e) {
      console.error("Error loading sellers", e);
      toast({
        variant: "destructive",
        description: "Failed to load merchant sellers list.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSellers();
  }, []);

  const handleUpdateStatus = async (sellerId: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/sellers/${sellerId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      toast({
        description: `Seller status updated to ${status}!`,
      });
      
      setSellers(prev => 
        prev.map(s => s.id === sellerId ? { ...s, status: status as any } : s)
      );
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        description: err.message || "Failed to update status.",
      });
    }
  };

  const handleToggleVerified = async (sellerId: string, currentVal: boolean) => {
    try {
      const res = await fetch(`/api/admin/sellers/${sellerId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verified: !currentVal })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      toast({
        description: `Seller verification status toggled!`,
      });
      
      setSellers(prev => 
        prev.map(s => s.id === sellerId ? { ...s, verified: !currentVal } : s)
      );
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        description: err.message || "Failed to toggle verification.",
      });
    }
  };

  const filteredSellers = sellers.filter(s => 
    s.storeName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.user?.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight uppercase font-sans">Merchant Sellers</h1>
          <p className="text-xs text-zinc-400 mt-1">Review vendor storefront registration status, payouts configuration, and KYC compliance.</p>
        </div>
        <button 
          onClick={fetchSellers}
          className="p-2.5 bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-zinc-350 hover:text-white rounded-xl cursor-pointer transition-colors"
        >
          <RefreshCw className="size-4" />
        </button>
      </div>

      {/* Filter and search */}
      <div className="flex justify-between items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-550" />
          <input 
            type="text" 
            placeholder="Search stores or owners..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-xs text-zinc-200 outline-none focus:border-indigo-650 placeholder-zinc-655 transition-colors"
          />
        </div>
      </div>

      {/* Sellers List */}
      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-400">
            <RefreshCw className="size-6 animate-spin text-indigo-400" />
            <span className="text-xs font-bold uppercase tracking-wider">Loading merchants list...</span>
          </div>
        ) : filteredSellers.length === 0 ? (
          <div className="text-center py-16 bg-zinc-900/10 border border-zinc-850 rounded-[20px] text-zinc-500 text-xs italic">
            <Store className="size-8 mx-auto mb-2 text-zinc-700" />
            No merchant stores registered yet.
          </div>
        ) : (
          filteredSellers.map((seller) => (
            <div key={seller.id} className="bg-zinc-900/20 border border-zinc-850 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:border-zinc-800">
              <div className="flex items-start gap-4">
                <img 
                  src={seller.logoUrl || "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100"} 
                  className="size-14 rounded-2xl object-cover bg-zinc-950 border border-zinc-800 flex-shrink-0"
                />
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">{seller.storeName}</h3>
                    {seller.verified ? (
                      <span className="text-[9px] uppercase font-black text-emerald-400 bg-emerald-950/20 border border-emerald-500/20 px-2 py-0.5 rounded-md flex items-center gap-0.5">
                        <ShieldCheck className="size-2.5" /> Verified
                      </span>
                    ) : (
                      <span className="text-[9px] uppercase font-black text-amber-400 bg-amber-950/20 border border-amber-500/20 px-2 py-0.5 rounded-md flex items-center gap-0.5">
                        <ShieldAlert className="size-2.5" /> Unverified
                      </span>
                    )}
                    <span className={cn(
                      "text-[9px] uppercase font-black px-2 py-0.5 rounded-md",
                      seller.status === "APPROVED" && "text-emerald-400 bg-emerald-950/20 border border-emerald-500/20",
                      seller.status === "PENDING" && "text-sky-400 bg-sky-950/20 border border-sky-500/20",
                      seller.status === "SUSPENDED" && "text-red-400 bg-red-950/20 border border-red-500/20"
                    )}>
                      {seller.status}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-400 line-clamp-2 max-w-xl">{seller.description || "No store description provided."}</p>
                  
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-zinc-550 font-bold mt-1">
                    <span>Owner: {seller.user?.displayName || seller.user?.username} (@{seller.user?.username})</span>
                    <span>Email: {seller.user?.email}</span>
                    <span>Registered: {new Date(seller.createdAt).toLocaleDateString()}</span>
                  </div>

                  {/* KYC Data disclosure */}
                  {seller.kycSubmitted && seller.kycData && (
                    <div className="mt-3 bg-zinc-950/40 border border-zinc-850 p-3 rounded-xl text-[10px] space-y-1 text-zinc-400 max-w-md">
                      <p className="font-bold text-zinc-300 uppercase tracking-widest text-[9px] border-b border-zinc-800 pb-1 mb-2">KYC Details</p>
                      <div className="flex justify-between"><span className="text-zinc-500">GSTIN:</span> <span className="font-bold text-zinc-300 font-mono">{seller.kycData.gstin || "N/A"}</span></div>
                      <div className="flex justify-between"><span className="text-zinc-500">PAN Card:</span> <span className="font-bold text-zinc-300 font-mono">{seller.kycData.pan || "N/A"}</span></div>
                      <div className="flex justify-between"><span className="text-zinc-500">Bank Account:</span> <span className="font-bold text-zinc-300 font-mono">{seller.kycData.bankAccount || "N/A"}</span></div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-row md:flex-col gap-2 justify-end items-end h-full">
                <button
                  onClick={() => handleToggleVerified(seller.id, seller.verified)}
                  className="px-4 py-2 border border-zinc-800 hover:border-zinc-700 bg-zinc-900/60 hover:bg-zinc-900 font-bold text-[10px] uppercase tracking-wider text-zinc-400 hover:text-white rounded-xl cursor-pointer flex items-center gap-1 transition-all"
                >
                  <UserCheck className="size-3.5" /> {seller.verified ? "Remove Verify" : "Verify Store"}
                </button>

                <div className="flex gap-2">
                  {seller.status !== "APPROVED" && (
                    <button
                      onClick={() => handleUpdateStatus(seller.id, "APPROVED")}
                      className="px-3.5 py-2 bg-emerald-650 hover:bg-emerald-600 font-bold text-[10px] uppercase tracking-wider text-white rounded-xl cursor-pointer transition-colors"
                    >
                      Approve
                    </button>
                  )}
                  {seller.status !== "SUSPENDED" && (
                    <button
                      onClick={() => handleUpdateStatus(seller.id, "SUSPENDED")}
                      className="px-3.5 py-2 bg-red-650 hover:bg-red-650/80 font-bold text-[10px] uppercase tracking-wider text-white rounded-xl cursor-pointer transition-colors"
                    >
                      Suspend
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
