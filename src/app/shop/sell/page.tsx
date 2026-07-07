"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "@/app/(main)/SessionProvider";
import { 
  Store, LayoutDashboard, ShoppingBag, ClipboardList, Tags, 
  Wallet, Settings, ShieldCheck, HelpCircle, Plus, Edit, CheckCircle, 
  TrendingUp, Users, DollarSign, AlertCircle, Eye, ArrowRight, RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = 
  | "dashboard" | "orders" | "products" | "inventory" 
  | "coupons" | "payouts" | "settings" | "kyc" | "support";

export default function SellerPortal() {
  const { user } = useSession();
  
  // Registration and Dashboard states
  const [seller, setSeller] = useState<any>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [isLoading, setIsLoading] = useState(true);

  // Forms
  const [regForm, setRegForm] = useState({
    storeName: "",
    description: "",
    logoUrl: "",
    bannerUrl: "",
    panNumber: "",
    gstin: "",
    bankAccount: ""
  });
  
  const [productForm, setProductForm] = useState({
    title: "",
    description: "",
    price: "",
    imageUrl: "",
    categoryId: "cat_apparel"
  });

  const [productsList, setProductsList] = useState<any[]>([]);
  const [dashboardStats, setDashboardStats] = useState({
    revenue: 48900,
    orders: 34,
    itemsSold: 56,
    commissionPaid: 4890
  });

  const loadSellerData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/shop/seller");
      const data = await res.json();
      if (data.seller) {
        setSeller(data.seller);
        setIsRegistered(true);
        // Load seller's uploaded products from custom backend
        const prodRes = await fetch("/api/shop/seller/products");
        const prodData = await prodRes.json();
        setProductsList(prodData.products || []);
      }
    } catch (err) {
      console.error("Error loading seller info", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSellerData();
  }, []);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regForm.storeName) return;

    try {
      const res = await fetch("/api/shop/seller", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName: regForm.storeName,
          description: regForm.description,
          logoUrl: regForm.logoUrl || "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100",
          bannerUrl: regForm.bannerUrl || "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800",
          kycData: {
            pan: regForm.panNumber,
            gstin: regForm.gstin,
            bankAccount: regForm.bankAccount
          }
        })
      });
      const data = await res.json();
      if (data.seller) {
        setSeller(data.seller);
        setIsRegistered(true);
        loadSellerData();
      }
    } catch (err) {
      console.error("Error registering store", err);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.title || !productForm.price) return;

    try {
      const res = await fetch("/api/shop/seller/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: productForm.title,
          description: productForm.description,
          price: parseFloat(productForm.price),
          imageUrl: productForm.imageUrl || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400",
          categoryId: productForm.categoryId
        })
      });
      const data = await res.json();
      if (data.success) {
        // Clear form and reload products list
        setProductForm({
          title: "",
          description: "",
          price: "",
          imageUrl: "",
          categoryId: "cat_apparel"
        });
        loadSellerData();
        alert("Product created and injected into catalog successfully!");
      }
    } catch (err) {
      console.error("Error creating product", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-zinc-500 text-xs">
        <RefreshCw className="size-5 animate-spin" />
        <span className="ml-2 font-bold uppercase tracking-wider">Loading Seller Portal...</span>
      </div>
    );
  }

  // ----------------------------------------------------
  // VIEW: REGISTRATION FORM
  // ----------------------------------------------------
  if (!isRegistered) {
    return (
      <div className="max-w-[720px] mx-auto bg-zinc-900/50 border border-zinc-850 p-6 sm:p-8 rounded-[24px] text-left shadow-2xl">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-800/80">
          <div className="p-2.5 bg-violet-600/10 rounded-xl">
            <Store className="size-6 text-violet-400" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white uppercase font-nunito tracking-wide">Sell on Cartly</h1>
            <p className="text-xs text-zinc-500 mt-0.5">Register your business details to setup your vendor catalog store instantly.</p>
          </div>
        </div>

        <form onSubmit={handleRegisterSubmit} className="space-y-5 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Store Name *</label>
              <input 
                type="text" 
                required
                placeholder="e.g. Elena Boutique"
                value={regForm.storeName}
                onChange={e => setRegForm({ ...regForm, storeName: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-4 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-violet-600 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">GSTIN Number (Optional)</label>
              <input 
                type="text" 
                placeholder="e.g. 27AAAAA1111A1Z1"
                value={regForm.gstin}
                onChange={e => setRegForm({ ...regForm, gstin: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-4 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-violet-600 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Description</label>
            <textarea 
              rows={3}
              placeholder="Tell customers about your store collection..."
              value={regForm.description}
              onChange={e => setRegForm({ ...regForm, description: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-4 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-violet-600 transition-colors resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Store Logo URL</label>
              <input 
                type="url" 
                placeholder="https://images.unsplash.com/..."
                value={regForm.logoUrl}
                onChange={e => setRegForm({ ...regForm, logoUrl: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-4 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-violet-600 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Store Banner URL</label>
              <input 
                type="url" 
                placeholder="https://images.unsplash.com/..."
                value={regForm.bannerUrl}
                onChange={e => setRegForm({ ...regForm, bannerUrl: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-4 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-violet-600 transition-colors"
              />
            </div>
          </div>

          <div className="border-t border-zinc-800 pt-5">
            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">KYC & Settlement Credentials</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">PAN Number *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. ABCDE1234F"
                  value={regForm.panNumber}
                  onChange={e => setRegForm({ ...regForm, panNumber: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-4 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-violet-600 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Bank Account Number *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. 501002345678"
                  value={regForm.bankAccount}
                  onChange={e => setRegForm({ ...regForm, bankAccount: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 px-4 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-violet-600 transition-colors"
                />
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            className="w-full mt-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 font-bold text-xs text-white flex items-center justify-center gap-1.5 shadow-lg shadow-violet-500/10 transition-colors cursor-pointer"
          >
            <CheckCircle className="size-4" /> Initialize Store & Dashboard
          </button>
        </form>
      </div>
    );
  }

  // ----------------------------------------------------
  // VIEW: DASHBOARD SHELL
  // ----------------------------------------------------
  const renderDashboardTab = () => (
    <div className="space-y-6 text-left">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Gross Revenue", val: `₹${dashboardStats.revenue.toLocaleString()}`, icon: DollarSign, color: "text-emerald-400 bg-emerald-950/20" },
          { label: "Orders Placed", val: dashboardStats.orders, icon: ClipboardList, color: "text-blue-400 bg-blue-950/20" },
          { label: "Total Items Sold", val: dashboardStats.itemsSold, icon: ShoppingBag, color: "text-violet-400 bg-violet-950/20" },
          { label: "Platform Commission", val: `₹${dashboardStats.commissionPaid.toLocaleString()}`, icon: TrendingUp, color: "text-red-400 bg-red-950/20" }
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-2xl flex items-center gap-4">
              <div className={cn("p-2.5 rounded-xl", stat.color)}>
                <Icon className="size-5" />
              </div>
              <div>
                <p className="text-[10px] text-zinc-550 font-bold uppercase tracking-wider">{stat.label}</p>
                <h3 className="text-base font-black text-white mt-0.5">{stat.val}</h3>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Recent Products Uploaded */}
        <div className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-2xl">
          <div className="flex justify-between items-center pb-3 border-b border-zinc-800 mb-4">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Active Store Products</h3>
            <button onClick={() => setActiveTab("products")} className="text-[10px] font-bold text-violet-400 hover:underline">Manage All</button>
          </div>
          <div className="divide-y divide-zinc-850">
            {productsList.slice(0, 4).map(prod => (
              <div key={prod.id} className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img src={prod.images?.[0] || prod.thumbnail} className="size-8 rounded-lg object-contain bg-zinc-950" />
                  <div>
                    <p className="text-xs font-semibold text-zinc-200 line-clamp-1">{prod.title}</p>
                    <p className="text-[9px] text-zinc-500 mt-0.5 capitalize">{prod.brand}</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-white">₹{Math.round(prod.price).toLocaleString()}</span>
              </div>
            ))}
            {productsList.length === 0 && (
              <p className="text-xs text-zinc-500 py-4 italic">No products uploaded yet.</p>
            )}
          </div>
        </div>

        {/* Payout & Settings summary */}
        <div className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest pb-3 border-b border-zinc-800 mb-4">Settlement Balances</h3>
            <div className="flex justify-between items-center py-2.5">
              <span className="text-xs text-zinc-400">Available Payout Balance</span>
              <span className="text-base font-black text-emerald-400">₹{Math.round(dashboardStats.revenue - dashboardStats.commissionPaid).toLocaleString()}</span>
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">Payouts are settled within 3 business days of delivery confirmation.</p>
          </div>
          <button 
            onClick={() => setActiveTab("payouts")}
            className="w-full mt-4 py-2 rounded-xl border border-zinc-850 hover:border-zinc-700 bg-zinc-900/60 hover:bg-zinc-900 hover:text-white font-bold text-xs text-zinc-400 flex items-center justify-center gap-1 transition-all"
          >
            <Wallet className="size-3.5" /> Request Settlement
          </button>
        </div>
      </div>
    </div>
  );

  const renderProductsTab = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
      
      {/* Upload Product Form */}
      <div className="md:col-span-1 bg-zinc-900/35 border border-zinc-800 p-5 rounded-2xl">
        <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest pb-3 border-b border-zinc-800 mb-4 flex items-center gap-2">
          <Plus className="size-4 text-violet-400" />
          Add Store Product
        </h3>
        <form onSubmit={handleCreateProduct} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Product Title *</label>
            <input 
              type="text" 
              required
              placeholder="e.g. Leather Jacket"
              value={productForm.title}
              onChange={e => setProductForm({ ...productForm, title: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:border-violet-600 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Price in INR (₹) *</label>
            <input 
              type="number" 
              required
              placeholder="e.g. 2999"
              value={productForm.price}
              onChange={e => setProductForm({ ...productForm, price: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:border-violet-600 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Image URL</label>
            <input 
              type="url" 
              placeholder="https://images.unsplash.com/..."
              value={productForm.imageUrl}
              onChange={e => setProductForm({ ...productForm, imageUrl: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:border-violet-600 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Category *</label>
            <select 
              value={productForm.categoryId}
              onChange={e => setProductForm({ ...productForm, categoryId: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-zinc-200 outline-none focus:border-violet-600 transition-colors"
            >
              <option value="cat_apparel">Apparel & Fashion</option>
              <option value="cat_electronics">Electronics & Tech</option>
              <option value="cat_watches">Watches & Accessories</option>
              <option value="cat_footwear">Footwear & Kicks</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Description</label>
            <textarea 
              rows={3}
              placeholder="Product technical specifications..."
              value={productForm.description}
              onChange={e => setProductForm({ ...productForm, description: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:border-violet-600 transition-colors resize-none"
            />
          </div>

          <button 
            type="submit" 
            className="w-full mt-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 font-bold text-xs text-white transition-colors cursor-pointer"
          >
            Publish Product
          </button>
        </form>
      </div>

      {/* Active Listings Grid */}
      <div className="md:col-span-2 bg-zinc-900/35 border border-zinc-800 p-5 rounded-2xl">
        <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest pb-3 border-b border-zinc-800 mb-4">Active Listings ({productsList.length})</h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {productsList.map(prod => (
            <div key={prod.id} className="border border-zinc-800 rounded-xl p-3 bg-zinc-950/20 hover:border-zinc-700 transition-colors">
              <img src={prod.images?.[0] || prod.thumbnail} className="aspect-square w-full object-contain p-1.5 rounded-lg bg-zinc-950" />
              <h4 className="text-xs font-bold text-zinc-200 mt-2 truncate">{prod.title}</h4>
              <div className="flex justify-between items-center mt-2.5 pt-1.5 border-t border-zinc-800/80">
                <span className="text-xs font-black text-white">₹{Math.round(prod.price).toLocaleString()}</span>
                <span className="text-[8.5px] uppercase tracking-wider font-bold text-violet-400 bg-violet-950/20 px-1.5 py-0.5 rounded-md">Published</span>
              </div>
            </div>
          ))}
          {productsList.length === 0 && (
            <div className="col-span-full py-8 text-center text-zinc-500 text-xs italic">No listings added yet. Use the form on the left to add items.</div>
          )}
        </div>
      </div>

    </div>
  );

  const renderPayoutsTab = () => (
    <div className="max-w-[620px] mx-auto bg-zinc-900/40 border border-zinc-800 p-5 rounded-2xl text-left space-y-5">
      <div>
        <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest pb-3 border-b border-zinc-800 mb-4">KYC Verified Settlements</h3>
        <div className="flex items-center gap-3 p-3 bg-emerald-950/10 border border-emerald-500/20 text-emerald-400 rounded-xl mb-4 text-xs font-semibold">
          <ShieldCheck className="size-4" />
          Store KYC Verification Status: Approved
        </div>
      </div>

      <div className="bg-zinc-950/40 border border-zinc-850 p-4 rounded-xl space-y-3.5">
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">Gross Sales</span>
          <span className="font-bold text-zinc-200">₹{dashboardStats.revenue.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">Platform Commission (10%)</span>
          <span className="font-bold text-red-400">-₹{dashboardStats.commissionPaid.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-xs border-t border-zinc-800 pt-3">
          <span className="text-zinc-400 font-bold">Settlement balance</span>
          <span className="font-black text-emerald-400 text-base">₹{(dashboardStats.revenue - dashboardStats.commissionPaid).toLocaleString()}</span>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest pb-3 border-b border-zinc-800 mb-4">Payout History</h3>
        <div className="text-xs text-zinc-500 text-center py-6 italic">No settlement disbursements recorded yet.</div>
      </div>

      <button className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 font-bold text-xs text-white transition-colors cursor-pointer">
        Request Bank Settlement Transfer
      </button>
    </div>
  );

  const renderSettingsTab = () => (
    <div className="max-w-[620px] mx-auto bg-zinc-900/40 border border-zinc-800 p-5 rounded-2xl text-left space-y-4">
      <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest pb-3 border-b border-zinc-800 mb-4">Store Policies & Details</h3>
      
      <div>
        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Shipping Policy</label>
        <textarea 
          rows={3}
          defaultValue="Items are processed and shipped within 24-48 hours. Express delivery is available."
          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-zinc-200 outline-none focus:border-violet-600 transition-colors resize-none"
        />
      </div>

      <div>
        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Return & Refund Policy</label>
        <textarea 
          rows={3}
          defaultValue="7-day easy returns policy if product is unopened and in original packaging."
          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-zinc-200 outline-none focus:border-violet-600 transition-colors resize-none"
        />
      </div>

      <button className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 font-bold text-xs text-white transition-colors cursor-pointer">
        Save Store Settings
      </button>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return renderDashboardTab();
      case "products":
        return renderProductsTab();
      case "payouts":
        return renderPayoutsTab();
      case "settings":
        return renderSettingsTab();
      default:
        return (
          <div className="bg-zinc-900/40 border border-zinc-800 p-8 rounded-2xl text-center text-zinc-500 text-xs italic">
            <AlertCircle className="size-8 text-zinc-600 mx-auto mb-2" />
            {activeTab.toUpperCase()} section placeholder - routing setup active.
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col gap-6 text-white min-h-[70vh]">
      
      {/* Seller Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-zinc-900/50 border border-zinc-850 rounded-[20px] text-left">
        <div className="flex items-center gap-3">
          <img 
            src={seller?.logoUrl || "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100"} 
            alt="Store Logo" 
            className="size-12 rounded-xl object-cover bg-zinc-950 ring-1 ring-zinc-800"
          />
          <div>
            <h1 className="text-base font-black text-white uppercase tracking-wider font-nunito">{seller?.storeName}</h1>
            <p className="text-[10px] text-zinc-500 mt-0.5">{seller?.description || "Marketplace Vendor"}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[9px] uppercase tracking-wider font-black text-emerald-400 bg-emerald-950/20 border border-emerald-500/20 px-2 py-1 rounded-md flex items-center gap-1">
            <ShieldCheck className="size-3" />
            KYC Verified
          </span>
          <span className="text-[9px] uppercase tracking-wider font-black text-violet-400 bg-violet-950/20 border border-violet-500/20 px-2 py-1 rounded-md">
            Commission Rate: {seller?.commissionRate}%
          </span>
        </div>
      </div>

      {/* Main Grid with Sidebar navigation */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        
        {/* Sidebar tabs */}
        <div className="md:col-span-1 bg-zinc-900/35 border border-zinc-800 p-2 rounded-[20px] flex flex-col gap-1 text-left">
          {[
            { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
            { id: "orders", label: "Orders Log", icon: ClipboardList },
            { id: "products", label: "Manage Products", icon: Plus },
            { id: "inventory", label: "Inventory Levels", icon: ShoppingBag },
            { id: "coupons", label: "Store Coupons", icon: Tags },
            { id: "payouts", label: "Payouts & KYC", icon: Wallet },
            { id: "settings", label: "Store settings", icon: Settings },
            { id: "support", label: "Support Desk", icon: HelpCircle }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer",
                  activeTab === tab.id 
                    ? "bg-violet-600 text-white font-bold" 
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800/40"
                )}
              >
                <Icon className="size-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab contents window */}
        <div className="md:col-span-3">
          {renderTabContent()}
        </div>

      </div>

    </div>
  );
}
