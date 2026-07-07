"use client";

import React, { useState, useEffect } from "react";
import { 
  ShoppingBag, CheckCircle, AlertTriangle, XCircle, Search, 
  Trash2, RefreshCw, ExternalLink, Inbox, Check, Slash 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

type ProductStatus = "DRAFT" | "PENDING_REVIEW" | "CHANGES_REQUESTED" | "REJECTED" | "PUBLISHED" | "ARCHIVED";

interface ProductItem {
  id: string;
  title: string;
  price: number;
  status: ProductStatus;
  images: string[];
  category?: string;
  brand?: string;
  seller?: {
    storeName: string;
  };
  createdAt: string;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const { toast } = useToast();

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      // Fetch all products via commerce list (we can call public shop endpoint with admin query,
      // or fetch directly from our custom API that supports all statuses)
      const res = await fetch("/api/shop/products?limit=100");
      const data = await res.json();
      
      // Wait, public shop products endpoint only returns PUBLISHED status by default.
      // Let's create a dedicated admin products fetch endpoint or fetch via a new endpoint!
      // Ah! Since we need all products including drafts, let's load from a dedicated endpoint
      // GET /api/admin/products that returns all products in PostgreSQL database.
      // Let's implement that route or let this client page fetch it.
      const adminRes = await fetch("/api/admin/products");
      const adminData = await adminRes.json();
      setProducts(adminData.products || []);
    } catch (e) {
      console.error("Error loading products", e);
      toast({
        variant: "destructive",
        description: "Failed to load products list for moderation.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleUpdateStatus = async (productId: string, status: ProductStatus) => {
    try {
      const res = await fetch(`/api/admin/products/${productId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      toast({
        description: `Product status updated to ${status}!`,
      });
      
      // Update local state
      setProducts(prev => 
        prev.map(p => p.id === productId ? { ...p, status } : p)
      );
    } catch (err: any) {
      console.error("Failed to update status", err);
      toast({
        variant: "destructive",
        description: err.message || "Failed to update status.",
      });
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.seller?.storeName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: ProductStatus) => {
    switch (status) {
      case "PUBLISHED":
        return (
          <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-950/20 border border-emerald-500/20 px-2 py-0.5 rounded-md flex items-center gap-1 w-fit">
            <CheckCircle className="size-3" /> Published
          </span>
        );
      case "DRAFT":
        return (
          <span className="text-[10px] uppercase font-bold text-zinc-400 bg-zinc-800/40 border border-zinc-700/30 px-2 py-0.5 rounded-md flex items-center gap-1 w-fit">
            <Inbox className="size-3" /> Draft
          </span>
        );
      case "PENDING_REVIEW":
        return (
          <span className="text-[10px] uppercase font-bold text-sky-400 bg-sky-950/20 border border-sky-500/20 px-2 py-0.5 rounded-md flex items-center gap-1 w-fit animate-pulse">
            <RefreshCw className="size-3 animate-spin duration-1000" /> Pending Review
          </span>
        );
      case "REJECTED":
        return (
          <span className="text-[10px] uppercase font-bold text-red-400 bg-red-950/20 border border-red-500/20 px-2 py-0.5 rounded-md flex items-center gap-1 w-fit">
            <XCircle className="size-3" /> Rejected
          </span>
        );
      case "CHANGES_REQUESTED":
        return (
          <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-950/20 border border-amber-500/20 px-2 py-0.5 rounded-md flex items-center gap-1 w-fit">
            <AlertTriangle className="size-3" /> Changes Requested
          </span>
        );
      default:
        return (
          <span className="text-[10px] uppercase font-bold text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-md w-fit">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight uppercase font-sans">Moderation Catalog</h1>
          <p className="text-xs text-zinc-400 mt-1">Review and approve vendor products submitted to the marketplace platform.</p>
        </div>
        <button 
          onClick={fetchProducts}
          className="p-2.5 bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-zinc-350 hover:text-white rounded-xl cursor-pointer transition-colors"
        >
          <RefreshCw className="size-4" />
        </button>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-550" />
          <input 
            type="text" 
            placeholder="Search products or stores..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-xs text-zinc-200 outline-none focus:border-indigo-650 placeholder-zinc-655 transition-colors"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          {["ALL", "PENDING_REVIEW", "PUBLISHED", "DRAFT", "CHANGES_REQUESTED", "REJECTED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer border",
                statusFilter === st 
                  ? "bg-indigo-600 border-indigo-500 text-white" 
                  : "bg-zinc-900/40 border-zinc-850 text-zinc-400 hover:text-white hover:bg-zinc-800"
              )}
            >
              {st.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Catalog Table */}
      <div className="bg-zinc-900/25 border border-zinc-850 rounded-[20px] overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-400">
            <RefreshCw className="size-6 animate-spin text-indigo-400" />
            <span className="text-xs font-bold uppercase tracking-wider">Loading Moderation Catalog...</span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16 text-zinc-500 text-xs italic">
            <ShoppingBag className="size-8 mx-auto mb-2 text-zinc-700" />
            No products found matching filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-850 bg-zinc-900/20 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-4">Product Details</th>
                  <th className="p-4">Seller Store</th>
                  <th className="p-4">Price</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850/60">
                {filteredProducts.map((prod) => (
                  <tr key={prod.id} className="hover:bg-zinc-900/10 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={prod.images?.[0] || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100"} 
                          className="size-10 rounded-lg object-contain bg-zinc-950 p-1 border border-zinc-800"
                        />
                        <div>
                          <p className="font-bold text-zinc-150 line-clamp-1">{prod.title}</p>
                          <p className="text-[10px] text-zinc-500 mt-0.5">{prod.category || "Uncategorized"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-zinc-300 font-medium">
                      {prod.seller?.storeName || "Platform Store"}
                    </td>
                    <td className="p-4 text-white font-bold">
                      ₹{Math.round(prod.price).toLocaleString()}
                    </td>
                    <td className="p-4">
                      {getStatusBadge(prod.status)}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {prod.status !== "PUBLISHED" && (
                          <button
                            onClick={() => handleUpdateStatus(prod.id, "PUBLISHED")}
                            className="p-1.5 bg-emerald-950/20 hover:bg-emerald-900 border border-emerald-500/20 text-emerald-400 rounded-lg cursor-pointer transition-colors"
                            title="Approve & Publish"
                          >
                            <Check className="size-3.5" />
                          </button>
                        )}
                        {prod.status !== "REJECTED" && prod.status !== "CHANGES_REQUESTED" && (
                          <button
                            onClick={() => handleUpdateStatus(prod.id, "CHANGES_REQUESTED")}
                            className="p-1.5 bg-amber-950/20 hover:bg-amber-900 border border-amber-500/20 text-amber-400 rounded-lg cursor-pointer transition-colors"
                            title="Request Changes"
                          >
                            <AlertTriangle className="size-3.5" />
                          </button>
                        )}
                        {prod.status !== "REJECTED" && (
                          <button
                            onClick={() => handleUpdateStatus(prod.id, "REJECTED")}
                            className="p-1.5 bg-red-950/20 hover:bg-red-900 border border-red-500/20 text-red-400 rounded-lg cursor-pointer transition-colors"
                            title="Reject Product"
                          >
                            <XCircle className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
