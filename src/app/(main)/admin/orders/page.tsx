"use client";

import React, { useState, useEffect } from "react";
import { 
  ClipboardList, Search, RefreshCw, ChevronDown, ChevronUp, 
  Truck, CheckCircle2, AlertTriangle, ShieldCheck, Mail, MapPin 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

type OrderStatus = "PENDING" | "CONFIRMED" | "PACKED" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "RETURNED" | "REFUNDED";

interface OrderItem {
  id: string;
  orderNumber: number;
  userId: string;
  subtotal: number;
  discountTotal: number;
  total: number;
  status: OrderStatus;
  trackingNumber?: string;
  courier?: string;
  estimatedDeliveryAt?: string;
  createdAt: string;
  user?: {
    username: string;
    displayName: string;
    email: string;
  };
  items: Array<{
    id: string;
    productTitle: string;
    variantTitle?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    thumbnailUrl?: string;
  }>;
  shippingAddress?: {
    firstName: string;
    lastName: string;
    addressLine1: string;
    city: string;
    postalCode: string;
    countryCode: string;
  };
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  
  // Tracking form states
  const [trackingForm, setTrackingForm] = useState({
    courier: "",
    trackingNumber: "",
    estimatedDeliveryAt: ""
  });

  const { toast } = useToast();

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/orders");
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        description: "Failed to fetch orders log.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      toast({
        description: `Order status updated to ${status}!`,
      });
      
      setOrders(prev => 
        prev.map(o => o.id === orderId ? { ...o, status } : o)
      );
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        description: err.message || "Failed to update order status.",
      });
    }
  };

  const handleUpdateShipping = async (e: React.FormEvent, orderId: string) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "SHIPPED", // auto mark as shipped when tracking is added
          courier: trackingForm.courier,
          trackingNumber: trackingForm.trackingNumber,
          estimatedDeliveryAt: trackingForm.estimatedDeliveryAt || undefined
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      toast({
        description: "Tracking information saved and marked as SHIPPED!",
      });

      setOrders(prev => 
        prev.map(o => o.id === orderId 
          ? { 
              ...o, 
              status: "SHIPPED", 
              courier: trackingForm.courier, 
              trackingNumber: trackingForm.trackingNumber,
              estimatedDeliveryAt: trackingForm.estimatedDeliveryAt
            } 
          : o
        )
      );
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        description: err.message || "Failed to save tracking details.",
      });
    }
  };

  const toggleExpand = (order: OrderItem) => {
    if (expandedOrderId === order.id) {
      setExpandedOrderId(null);
    } else {
      setExpandedOrderId(order.id);
      setTrackingForm({
        courier: order.courier || "Blue Dart",
        trackingNumber: order.trackingNumber || "",
        estimatedDeliveryAt: order.estimatedDeliveryAt ? order.estimatedDeliveryAt.split("T")[0] : ""
      });
    }
  };

  const filteredOrders = orders.filter(o => {
    const matchesSearch = 
      String(o.orderNumber).includes(searchTerm) || 
      o.user?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.user?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "ALL" || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case "DELIVERED":
        return <span className="text-[9px] uppercase font-bold text-emerald-400 bg-emerald-950/20 border border-emerald-500/20 px-2 py-0.5 rounded-md">Delivered</span>;
      case "SHIPPED":
        return <span className="text-[9px] uppercase font-bold text-sky-400 bg-sky-950/20 border border-sky-500/20 px-2 py-0.5 rounded-md flex items-center gap-1"><Truck className="size-3 animate-bounce" /> Shipped</span>;
      case "PENDING":
        return <span className="text-[9px] uppercase font-bold text-zinc-400 bg-zinc-800/40 border border-zinc-700/30 px-2 py-0.5 rounded-md">Pending</span>;
      case "CONFIRMED":
        return <span className="text-[9px] uppercase font-bold text-violet-400 bg-violet-950/20 border border-violet-500/20 px-2 py-0.5 rounded-md">Confirmed</span>;
      case "CANCELLED":
        return <span className="text-[9px] uppercase font-bold text-red-400 bg-red-950/20 border border-red-500/20 px-2 py-0.5 rounded-md">Cancelled</span>;
      default:
        return <span className="text-[9px] uppercase font-bold text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded-md">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight uppercase font-sans">Platform Orders</h1>
          <p className="text-xs text-zinc-400 mt-1">Review guest/customer order receipts, dispatch courier details, and manage delivery status.</p>
        </div>
        <button 
          onClick={fetchOrders}
          className="p-2.5 bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-zinc-350 hover:text-white rounded-xl cursor-pointer transition-colors"
        >
          <RefreshCw className="size-4" />
        </button>
      </div>

      {/* Filter controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-zinc-550" />
          <input 
            type="text" 
            placeholder="Search order number, user or email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-xs text-zinc-200 outline-none focus:border-indigo-650 placeholder-zinc-655 transition-colors"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          {["ALL", "PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"].map((st) => (
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
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-400">
            <RefreshCw className="size-6 animate-spin text-indigo-400" />
            <span className="text-xs font-bold uppercase tracking-wider">Loading orders log...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-16 bg-zinc-900/10 border border-zinc-850 rounded-[20px] text-zinc-500 text-xs italic">
            <ClipboardList className="size-8 mx-auto mb-2 text-zinc-700" />
            No orders found matching active filters.
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isExpanded = expandedOrderId === order.id;
            return (
              <div key={order.id} className="bg-zinc-900/15 border border-zinc-850 rounded-2xl overflow-hidden transition-all hover:border-zinc-800">
                
                {/* Header Summary */}
                <div 
                  onClick={() => toggleExpand(order)}
                  className="p-5 flex flex-wrap items-center justify-between gap-4 cursor-pointer hover:bg-zinc-900/5 select-none"
                >
                  <div className="flex items-center gap-5">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Order Ref</span>
                      <p className="text-xs font-black text-white mt-0.5">#{order.orderNumber}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Customer</span>
                      <p className="text-xs font-bold text-zinc-200 mt-0.5">{order.user?.displayName || "Guest Customer"}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Date</span>
                      <p className="text-xs font-semibold text-zinc-450 mt-0.5">{new Date(order.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Total Price</span>
                      <p className="text-xs font-black text-white mt-0.5">₹{Math.round(order.total).toLocaleString()}</p>
                    </div>
                    <div>
                      {getStatusBadge(order.status)}
                    </div>
                    {isExpanded ? <ChevronUp className="size-4 text-zinc-400" /> : <ChevronDown className="size-4 text-zinc-400" />}
                  </div>
                </div>

                {/* Details drop-panel */}
                {isExpanded && (
                  <div className="border-t border-zinc-850/60 p-5 bg-zinc-950/20 text-xs text-zinc-400 space-y-6 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      
                      {/* Products list summary */}
                      <div className="md:col-span-1 space-y-3">
                        <h4 className="font-bold text-zinc-300 uppercase tracking-widest text-[9px] border-b border-zinc-800 pb-1.5">Items Summary ({order.items.length})</h4>
                        <div className="divide-y divide-zinc-850/40">
                          {order.items.map(item => (
                            <div key={item.id} className="py-2.5 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <img src={item.thumbnailUrl || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=50"} className="size-8 rounded-lg object-contain bg-zinc-900 border border-zinc-800" />
                                <div>
                                  <p className="font-bold text-zinc-200 line-clamp-1">{item.productTitle}</p>
                                  <p className="text-[9px] text-zinc-500 mt-0.5">{item.variantTitle || "Standard"} x {item.quantity}</p>
                                </div>
                              </div>
                              <span className="font-bold text-white">₹{Math.round(item.totalPrice).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Shipping Details */}
                      <div className="md:col-span-1 space-y-3">
                        <h4 className="font-bold text-zinc-300 uppercase tracking-widest text-[9px] border-b border-zinc-800 pb-1.5">Shipping Address</h4>
                        {order.shippingAddress ? (
                          <div className="space-y-2 text-zinc-350">
                            <div className="flex items-center gap-2 text-zinc-300 font-semibold">
                              <MapPin className="size-3.5 text-indigo-400" />
                              <span>{order.shippingAddress.firstName} {order.shippingAddress.lastName}</span>
                            </div>
                            <p>{order.shippingAddress.addressLine1}</p>
                            <p>{order.shippingAddress.city}, {order.shippingAddress.postalCode}</p>
                            <p className="uppercase text-[10px] tracking-wider text-zinc-500 mt-1">{order.shippingAddress.countryCode}</p>
                          </div>
                        ) : (
                          <div className="text-zinc-650 italic text-[11px]">No shipping address captured.</div>
                        )}
                        
                        <div className="pt-3 border-t border-zinc-850/60 mt-4 space-y-1.5 text-[10px]">
                          <div className="flex items-center gap-1.5 text-zinc-400"><Mail className="size-3 text-zinc-550" /> {order.user?.email || "Guest checkout"}</div>
                        </div>
                      </div>

                      {/* Dispatch & Moderation */}
                      <div className="md:col-span-1 space-y-4">
                        <h4 className="font-bold text-zinc-300 uppercase tracking-widest text-[9px] border-b border-zinc-800 pb-1.5">Shipping Dispatch Panel</h4>
                        
                        {order.status === "PENDING" || order.status === "CONFIRMED" ? (
                          <form onSubmit={(e) => handleUpdateShipping(e, order.id)} className="space-y-3">
                            <div>
                              <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Courier Carrier</label>
                              <input 
                                type="text" 
                                required
                                value={trackingForm.courier}
                                onChange={e => setTrackingForm({ ...trackingForm, courier: e.target.value })}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-1.5 px-3 text-[11px] text-zinc-200 outline-none focus:border-indigo-650 transition-colors"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Tracking Number</label>
                              <input 
                                type="text" 
                                required
                                placeholder="e.g. BLD1234567"
                                value={trackingForm.trackingNumber}
                                onChange={e => setTrackingForm({ ...trackingForm, trackingNumber: e.target.value })}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-1.5 px-3 text-[11px] text-zinc-200 outline-none focus:border-indigo-650 transition-colors"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Est. Delivery Date</label>
                              <input 
                                type="date" 
                                value={trackingForm.estimatedDeliveryAt}
                                onChange={e => setTrackingForm({ ...trackingForm, estimatedDeliveryAt: e.target.value })}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-1.5 px-3 text-[11px] text-zinc-200 outline-none focus:border-indigo-650 transition-colors"
                              />
                            </div>
                            <button
                              type="submit"
                              className="w-full py-2 bg-indigo-650 hover:bg-indigo-600 font-bold text-[10px] uppercase tracking-wider text-white rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-1"
                            >
                              <Truck className="size-3.5" /> Dispatch Order
                            </button>
                          </form>
                        ) : order.status === "SHIPPED" ? (
                          <div className="space-y-3.5">
                            <div className="bg-sky-950/15 border border-sky-500/20 p-3.5 rounded-xl text-zinc-300 space-y-1.5">
                              <p className="font-bold text-[10px] uppercase text-sky-400 flex items-center gap-1"><Truck className="size-3.5 animate-bounce" /> Shipping Details</p>
                              <p className="text-[10px] mt-1"><span className="text-zinc-500">Carrier:</span> {order.courier}</p>
                              <p className="text-[10px]"><span className="text-zinc-500">Tracking:</span> <span className="font-mono font-bold text-zinc-200">{order.trackingNumber}</span></p>
                              {order.estimatedDeliveryAt && (
                                <p className="text-[10px]"><span className="text-zinc-500">Est. Delivery:</span> {new Date(order.estimatedDeliveryAt).toLocaleDateString()}</p>
                              )}
                            </div>
                            <button
                              onClick={() => handleUpdateStatus(order.id, "DELIVERED")}
                              className="w-full py-2.5 bg-emerald-650 hover:bg-emerald-600 font-bold text-[10px] uppercase tracking-wider text-white rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-1"
                            >
                              <CheckCircle2 className="size-3.5" /> Confirm Delivery
                            </button>
                          </div>
                        ) : (
                          <div className="p-3 bg-zinc-950 border border-zinc-850/60 rounded-xl text-center text-zinc-500">
                            {order.status === "DELIVERED" ? (
                              <p className="text-emerald-400 font-bold flex items-center justify-center gap-1"><ShieldCheck className="size-3.5" /> Handed to Customer</p>
                            ) : (
                              <p className="text-red-400 font-bold flex items-center justify-center gap-1"><AlertTriangle className="size-3.5" /> Order Cancelled/Closed</p>
                            )}
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                )}

              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
