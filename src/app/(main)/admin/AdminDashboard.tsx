"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import kyInstance from "@/lib/ky";
import {
  Activity,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  TrendingUp,
  BarChart3,
  ShoppingBag,
  Trash2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Eye,
  Tv,
  Plus,
  EyeOff,
} from "lucide-react";
import Link from "next/link";
import UserAvatar from "@/components/UserAvatar";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

// Sub-component to load and display product details on row expansion
function ReelDetails({ postId }: { postId: string }) {
  const [showLowConfidence, setShowLowConfidence] = useState(true);
  const { toast } = useToast();

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-reel-products", postId],
    queryFn: () =>
      kyInstance
        .get(`/api/videos/${postId}/products?showAll=true`)
        .json<{ products: any[]; matches: any[] }>(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground text-sm">
        <Loader2 className="size-4 animate-spin text-primary" />
        <span>Loading product detections...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-sm flex items-center gap-2">
        <AlertTriangle className="size-5 flex-shrink-0" />
        <span>Failed to load product detections for this reel.</span>
      </div>
    );
  }

  const allProducts = data?.products || [];
  const filteredProducts = showLowConfidence
    ? allProducts
    : allProducts.filter((p) => (p.confidence ?? 0) >= 0.8);

  return (
    <div className="p-6 rounded-2xl border border-border/40 bg-muted/30 mt-2 space-y-4">
      <div className="flex items-center justify-between border-b border-border/40 pb-3">
        <h4 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
          <ShoppingBag className="size-4 text-primary" />
          <span>Detected Products ({allProducts.length})</span>
        </h4>
        {allProducts.some((p) => (p.confidence ?? 0) < 0.8) && (
          <button
            onClick={() => setShowLowConfidence(!showLowConfidence)}
            className="text-xs text-primary hover:underline font-medium"
          >
            {showLowConfidence ? "Hide low confidence (< 0.80)" : "Show all (including low confidence)"}
          </button>
        )}
      </div>

      {filteredProducts.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No products matched the active filters.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProducts.map((p) => {
            const productMatches = data?.matches.filter((m) => m.detectedProductId === p.id) || [];
            const isHighConfidence = (p.confidence ?? 0) >= 0.8;

            return (
              <div
                key={p.id}
                className={cn(
                  "p-4 rounded-xl border flex flex-col justify-between bg-card gap-3 transition-colors",
                  isHighConfidence ? "border-border/40" : "border-amber-500/20 bg-amber-500/5"
                )}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-bold text-foreground capitalize">{p.description}</span>
                    <span
                      className={cn(
                        "text-[10px] font-mono px-2 py-0.5 rounded-full font-bold",
                        isHighConfidence
                          ? "bg-emerald-500/10 text-emerald-500"
                          : "bg-amber-500/10 text-amber-500"
                      )}
                    >
                      Score: {((p.confidence ?? 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-1.5 text-xs text-muted-foreground">
                    <span className="bg-muted px-2 py-0.5 rounded font-medium">Category: {p.category}</span>
                    <span className="bg-muted px-2 py-0.5 rounded font-medium">Color: {p.color || "unknown"}</span>
                    {p.frameTimestamp !== null && (
                      <span className="bg-muted px-2 py-0.5 rounded font-medium">
                        At: {p.frameTimestamp.toFixed(1)}s
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-border/40">
                  <span className="text-[11px] font-bold text-muted-foreground tracking-wider uppercase block">
                    Shopping Matches ({productMatches.length})
                  </span>
                  {productMatches.length === 0 ? (
                    <span className="text-xs text-muted-foreground italic block">No shopping matches found.</span>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {productMatches.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/40 hover:bg-muted/80 transition-colors"
                        >
                          <div className="flex flex-col truncate pr-2">
                            <span className="font-medium text-foreground truncate max-w-[200px]" title={m.title}>
                              {m.title}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {m.sourceStore} • Clicks: {m.clickCount}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="font-bold text-primary">{m.price}</span>
                            <a
                              href={m.affiliateUrl || m.productUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-foreground transition-colors p-1"
                            >
                              <ExternalLink className="size-3.5" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [expandedReelId, setExpandedReelId] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<"pipeline" | "banners">("pipeline");
  const [bannersList, setBannersList] = useState<any[]>([]);
  const [bannersLoading, setBannersLoading] = useState(false);
  const [editingBanner, setEditingBanner] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchBanners = async () => {
    setBannersLoading(true);
    try {
      const res = await kyInstance.get("/api/admin/banners").json<any>();
      setBannersList(res.banners || []);
    } catch (err) {
      console.error("Failed to fetch admin banners:", err);
    } finally {
      setBannersLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "banners") {
      fetchBanners();
    }
  }, [activeTab]);

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBanner) return;
    setIsSubmitting(true);
    try {
      const res = await kyInstance.post("/api/admin/banners", { json: editingBanner }).json<any>();
      if (res.success) {
        toast({ title: "Success", description: "Banner saved successfully!" });
        setEditingBanner(null);
        fetchBanners();
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Failed to save banner." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!confirm("Are you sure you want to delete this banner?")) return;
    try {
      const res = await kyInstance.post("/api/admin/banners", { json: { action: "delete", id } }).json<any>();
      if (res.success) {
        toast({ title: "Success", description: "Banner deleted." });
        fetchBanners();
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete banner." });
    }
  };

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => kyInstance.get("/api/admin/stats").json<any>(),
    refetchInterval: 15000, // Poll statistics every 15s
  });

  const handleBulkAction = async (action: string) => {
    setActionInProgress(action);
    try {
      const res = await kyInstance
        .post("/api/admin/reprocess", { json: { action } })
        .json<{ success: boolean; count?: number; message?: string }>();

      if (res.success) {
        toast({
          title: "Action Succeeded",
          description: res.message || `Successfully processed ${res.count ?? 0} jobs.`,
        });
        refetch();
      } else {
        toast({
          variant: "destructive",
          title: "Action Skipped",
          description: res.message || "Failed to trigger the queue action.",
        });
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Action Failed",
        description: "A network error occurred while running the action.",
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleSingleReprocess = async (postId: string) => {
    setActionInProgress(postId);
    try {
      const res = await kyInstance
        .post("/api/admin/reprocess", { json: { action: "single", postId } })
        .json<{ success: boolean; message?: string }>();

      if (res.success) {
        toast({
          title: "Reel Enqueued",
          description: res.message,
        });
        refetch();
      } else {
        toast({
          variant: "destructive",
          title: "Skipped",
          description: res.message,
        });
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed",
        description: "Failed to queue this reel.",
      });
    } finally {
      setActionInProgress(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[70vh] w-full flex-col items-center justify-center gap-4 text-center">
        <Loader2 className="size-12 text-primary animate-spin" />
        <h2 className="text-xl font-bold tracking-tight">Loading AI Dashboard Data...</h2>
        <p className="text-muted-foreground text-sm">Aggregating processing queues, health monitors, and click metrics.</p>
      </div>
    );
  }

  const worker = data?.worker || { status: "offline", queueLength: 0, jobsRunning: 0, lastActivity: "Never" };
  const stats = data?.stats || { totalReels: 0, completed: 0, pending: 0, processing: 0, failed: 0, noProducts: 0, unprocessed: 0 };
  const business = data?.business || { totalProducts: 0, totalClicks: 0, totalViews: 0, ctr: 0, clicksByMerchant: [] };
  const categories = data?.categories || [];
  const reels = data?.reels || [];

  return (
    <div className="space-y-8 select-none">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-3xl font-black tracking-tight font-sans cartly-gradient-text">Admin Control Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Monitor product detection pipelines, worker heartbeats, and manage storefront banner sliders.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              refetch();
              if (activeTab === "banners") fetchBanners();
            }}
            disabled={isRefetching || bannersLoading}
            className="flex items-center justify-center gap-2 px-4 py-2 border border-border/40 rounded-xl bg-card hover:bg-accent/40 text-sm font-bold transition-all disabled:opacity-50"
          >
            <RefreshCw className={cn("size-4", (isRefetching || bannersLoading) && "animate-spin")} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 border-b border-border/40 pb-px">
        <button
          onClick={() => setActiveTab("pipeline")}
          className={cn(
            "pb-3 text-sm font-black border-b-2 px-3 transition-all",
            activeTab === "pipeline"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          AI Detection Pipeline
        </button>
        <button
          onClick={() => setActiveTab("banners")}
          className={cn(
            "pb-3 text-sm font-black border-b-2 px-3 transition-all",
            activeTab === "banners"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Storefront Banners
        </button>
      </div>

      {activeTab === "pipeline" ? (
        <>
          {/* Health & System Monitoring Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Worker Health Card */}
            <div className="p-6 rounded-2xl border border-border/40 bg-card flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-4">
                <span className="text-sm font-black tracking-wider text-muted-foreground uppercase">Worker Health</span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wide uppercase",
                    worker.status === "online"
                      ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                      : "bg-destructive/10 text-destructive border border-destructive/20 animate-pulse"
                  )}
                >
                  <span className={cn("size-2 rounded-full", worker.status === "online" ? "bg-emerald-500" : "bg-destructive")} />
                  {worker.status}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-xl bg-muted/40">
                  <span className="block text-xl font-black font-mono text-foreground">{worker.queueLength}</span>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Queued</span>
                </div>
                <div className="p-2 rounded-xl bg-muted/40">
                  <span className="block text-xl font-black font-mono text-primary animate-pulse">{worker.jobsRunning}</span>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Running</span>
                </div>
                <div className="p-2 rounded-xl bg-muted/40">
                  <span className="block text-xs font-black font-mono text-foreground truncate mt-2 py-0.5">{worker.lastActivity}</span>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block mt-1">Activity</span>
                </div>
              </div>
            </div>

            {/* AI Job Stats Card */}
            <div className="p-6 rounded-2xl border border-border/40 bg-card flex flex-col justify-between shadow-sm lg:col-span-2">
              <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-4">
                <span className="text-sm font-black tracking-wider text-muted-foreground uppercase">Queue Processing States</span>
                <span className="text-xs font-bold text-muted-foreground">Total Reels: {stats.totalReels}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                <div className="p-3 rounded-xl border border-border/30 bg-muted/10 text-center">
                  <span className="block text-2xl font-black font-mono text-foreground">{stats.completed}</span>
                  <span className="text-[10px] font-bold text-emerald-500 uppercase mt-1 flex items-center justify-center gap-1">
                    <CheckCircle2 className="size-3" /> Completed
                  </span>
                </div>
                <div className="p-3 rounded-xl border border-border/30 bg-muted/10 text-center">
                  <span className="block text-2xl font-black font-mono text-foreground">{stats.processing}</span>
                  <span className="text-[10px] font-bold text-amber-500 uppercase mt-1 flex items-center justify-center gap-1 animate-pulse">
                    <Loader2 className="size-3 animate-spin" /> Processing
                  </span>
                </div>
                <div className="p-3 rounded-xl border border-border/30 bg-muted/10 text-center">
                  <span className="block text-2xl font-black font-mono text-foreground">{stats.pending}</span>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase mt-1 flex items-center justify-center gap-1">
                    <Activity className="size-3" /> Pending
                  </span>
                </div>
                <div className="p-3 rounded-xl border border-border/30 bg-muted/10 text-center">
                  <span className="block text-2xl font-black font-mono text-foreground">{stats.failed}</span>
                  <span className="text-[10px] font-bold text-destructive uppercase mt-1 flex items-center justify-center gap-1">
                    <XCircle className="size-3" /> Failed
                  </span>
                </div>
                <div className="p-3 rounded-xl border border-border/30 bg-muted/10 text-center">
                  <span className="block text-2xl font-black font-mono text-foreground">{stats.noProducts}</span>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase mt-1 flex items-center justify-center gap-1">
                    Muted
                  </span>
                </div>
                <div className="p-3 rounded-xl border border-border/30 bg-muted/10 text-center col-span-2 sm:col-span-1">
                  <span className="block text-2xl font-black font-mono text-foreground">{stats.unprocessed}</span>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase mt-1 block">
                    Unqueued
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Business Analytics & Category Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Business Metrics */}
            <div className="p-6 rounded-2xl border border-border/40 bg-card shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-border/40 pb-4">
                <span className="text-sm font-black tracking-wider text-muted-foreground uppercase">Conversion & CTR</span>
                <TrendingUp className="size-4 text-emerald-500 animate-bounce" />
              </div>
              <div className="grid grid-cols-3 gap-2 border-b border-border/40 pb-4">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Detections</span>
                  <span className="text-lg font-black font-mono text-foreground mt-0.5 block">{business.totalProducts}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Clicks</span>
                  <span className="text-lg font-black font-mono text-primary mt-0.5 block">{business.totalClicks}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-emerald-500 uppercase block">CTR</span>
                  <span className="text-lg font-black font-mono text-emerald-500 mt-0.5 block">{business.ctr}%</span>
                </div>
              </div>

              <div className="space-y-3">
                <span className="text-[11px] font-bold text-muted-foreground tracking-wider uppercase block">
                  Clicks By Retailer Partner
                </span>
                {business.clicksByMerchant.length === 0 ? (
                  <span className="text-xs text-muted-foreground italic block">No conversion clicks logged yet.</span>
                ) : (
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {business.clicksByMerchant.map((m: any, idx: number) => {
                      const share =
                        business.totalClicks > 0 ? ((m.count / business.totalClicks) * 100).toFixed(0) : "0";
                      return (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-foreground truncate pr-2 capitalize">{m.merchant}</span>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="font-bold text-muted-foreground font-mono">{m.count} clicks</span>
                            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded font-bold font-mono">
                              {share}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Category Performance */}
            <div className="p-6 rounded-2xl border border-border/40 bg-card shadow-sm space-y-5 lg:col-span-2">
              <div className="flex items-center justify-between border-b border-border/40 pb-4">
                <span className="text-sm font-black tracking-wider text-muted-foreground uppercase">
                  Detections By Category
                </span>
                <BarChart3 className="size-4 text-primary" />
              </div>
              {categories.length === 0 ? (
                <div className="flex h-40 items-center justify-center text-xs text-muted-foreground italic">
                  No categorized product detections logged.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-h-52 overflow-y-auto pr-1">
                  {categories.map((c: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-xl border border-border/30 bg-muted/15 flex flex-col justify-between">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase truncate tracking-wider">
                        {c.category}
                      </span>
                      <span className="text-lg font-black font-mono text-foreground mt-2 block">{c.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Videos Table Section */}
          <div className="border border-border/40 bg-card rounded-2xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Tv className="size-5 text-primary" />
                <h3 className="font-sans font-black tracking-tight text-lg text-foreground">Video Processing Queue Log</h3>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleBulkAction("reprocess_failed")}
                  disabled={actionInProgress !== null || stats.failed === 0}
                  className="px-3 py-1.5 border border-amber-500/20 hover:bg-amber-500/10 text-amber-500 font-bold text-xs rounded-xl transition-all disabled:opacity-50"
                >
                  Reprocess Failed ({stats.failed})
                </button>
                <button
                  onClick={() => handleBulkAction("reprocess_all")}
                  disabled={actionInProgress !== null}
                  className="px-3 py-1.5 border border-primary/20 hover:bg-primary/10 text-primary font-bold text-xs rounded-xl transition-all disabled:opacity-50"
                >
                  Reprocess All
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/15 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                    <th className="py-3.5 px-4">Creator</th>
                    <th className="py-3.5 px-4">Reel ID</th>
                    <th className="py-3.5 px-4">AI Status</th>
                    <th className="py-3.5 px-4 text-center">Products</th>
                    <th className="py-3.5 px-4">Processed At</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20 text-xs">
                  {reels.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted-foreground italic">
                        No reels processed yet. Write posts with attached video reels to trigger the model!
                      </td>
                    </tr>
                  ) : (
                    reels.map((r: any) => {
                      const isExpanded = expandedReelId === r.id;
                      const isProcessing = r.status === "processing" || r.status === "pending";
                      
                      let statusBadge = (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-500/10 text-zinc-500 font-bold text-[10px] uppercase">
                          Pending
                        </span>
                      );
                      if (r.status === "completed") {
                        statusBadge = (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-bold text-[10px] uppercase">
                            Success
                          </span>
                        );
                      } else if (r.status === "failed") {
                        statusBadge = (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-destructive/10 text-destructive font-bold text-[10px] uppercase">
                            Failed
                          </span>
                        );
                      } else if (r.status === "processing") {
                        statusBadge = (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-bold text-[10px] uppercase animate-pulse">
                            Active
                          </span>
                        );
                      }

                      const lastScanStr = r.processedAt ? new Date(r.processedAt).toLocaleString() : "Pending";

                      return (
                        <>
                          <tr
                            key={r.id}
                            onClick={() => setExpandedReelId(isExpanded ? null : r.id)}
                            className={cn(
                              "hover:bg-muted/15 transition-colors cursor-pointer border-b border-border/10",
                              isExpanded && "bg-muted/10 hover:bg-muted/10 border-b-0"
                            )}
                          >
                            {/* User details */}
                            <td className="py-3.5 px-4 font-medium text-foreground">
                              <div className="flex items-center gap-2">
                                <UserAvatar avatarUrl={r.userAvatar} size={28} />
                                <span className="font-bold">{r.username}</span>
                              </div>
                            </td>

                            {/* Reel ID */}
                            <td className="py-3.5 px-4 font-mono text-muted-foreground text-[10px] max-w-[120px] truncate" title={r.id}>
                              {r.id}
                            </td>

                            {/* AI Status */}
                            <td className="py-3.5 px-4">
                              {statusBadge}
                            </td>

                            {/* Products count */}
                            <td className="py-3.5 px-4 text-center font-bold font-mono">
                              {r.productsCount}
                            </td>

                            {/* Processed At */}
                            <td className="py-3.5 px-4 text-muted-foreground text-[11px]">
                              {lastScanStr}
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleSingleReprocess(r.id)}
                                  disabled={isProcessing || actionInProgress !== null}
                                  className={cn(
                                    "flex items-center justify-center p-2 rounded-xl border border-border/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-all disabled:opacity-50",
                                    isProcessing && "cursor-not-allowed"
                                  )}
                                  title={isProcessing ? "Queue active. Reprocess locked." : "Queue re-scan"}
                                >
                                  {actionInProgress === r.id ? (
                                    <Loader2 className="size-4 animate-spin text-primary" />
                                  ) : (
                                    <RefreshCw className="size-4" />
                                  )}
                                </button>
                                <button
                                  onClick={() => setExpandedReelId(isExpanded ? null : r.id)}
                                  className="p-2 rounded-xl border border-border/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                                >
                                  {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Expanded View */}
                          {isExpanded && (
                            <tr className="bg-muted/5 border-b border-border/30">
                              <td colSpan={6} className="py-4 px-6">
                                <div className="space-y-4">
                                  {/* Error display if job failed */}
                                  {r.status === "failed" && r.error && (
                                    <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-xs space-y-1">
                                      <span className="font-bold flex items-center gap-1">
                                        <AlertTriangle className="size-3.5" /> Pipeline Error Logs:
                                      </span>
                                      <p className="font-mono">{r.error}</p>
                                    </div>
                                  )}

                                  {/* Reels Caption Display */}
                                  <div className="space-y-1">
                                    <span className="text-[11px] font-bold text-muted-foreground tracking-wider uppercase block">
                                      Reel Caption
                                    </span>
                                    <p className="text-sm text-foreground italic bg-card p-3 rounded-xl border border-border/40">
                                      {r.caption || "No description provided."}
                                    </p>
                                  </div>

                                  {/* Manual Product Scanner list */}
                                  <ReelDetails postId={r.id} />
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Storefront Banners CMS Tab */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Banners List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-foreground">Active Slideshow Banners</h2>
              <button
                onClick={() => setEditingBanner({
                  title: "",
                  subtitle: "",
                  imageUrl: "/1.png",
                  ctaText: "Shop Collection",
                  ctaLink: "",
                  active: true,
                  order: bannersList.length + 1
                })}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/95 text-white font-bold text-xs rounded-xl shadow-lg active:scale-95 transition-all"
              >
                <Plus className="size-4" />
                <span>Create Banner</span>
              </button>
            </div>

            {bannersLoading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="size-8 animate-spin text-primary" />
              </div>
            ) : bannersList.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-border/40 rounded-2xl bg-card">
                <span className="text-sm text-muted-foreground">No storefront banners found. Seed them by visiting the Shop homepage once.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bannersList.map((banner) => (
                  <div key={banner.id} className="border border-border/40 bg-card rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="relative aspect-[2.65/1] bg-muted w-full">
                        <img src={banner.imageUrl} alt="" className="w-full h-full object-cover" />
                        {!banner.active && (
                          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center text-xs font-bold text-white uppercase tracking-wider gap-1.5">
                            <EyeOff className="size-4 text-muted-foreground" /> Inactive
                          </div>
                        )}
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/75 text-[10px] font-black text-white font-mono">
                          Order: {banner.order}
                        </span>
                      </div>
                      <div className="p-4 space-y-1.5">
                        <h3 className="font-bold text-sm text-foreground truncate">{banner.title || "Untitled"}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2">{banner.subtitle || "No subtitle"}</p>
                        <div className="text-[10px] text-muted-foreground truncate font-mono">
                          Link: <a href={banner.ctaLink} target="_blank" rel="noreferrer" className="text-primary hover:underline">{banner.ctaLink}</a>
                        </div>
                      </div>
                    </div>
                    <div className="px-4 pb-4 flex items-center gap-2 border-t border-border/20 pt-3">
                      <button
                        onClick={() => setEditingBanner(banner)}
                        className="flex-1 py-1.5 px-3 border border-border hover:bg-muted text-xs font-bold rounded-lg transition-all"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteBanner(banner.id)}
                        className="p-1.5 border border-destructive/20 hover:bg-destructive/10 text-destructive rounded-lg transition-all"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Create/Edit Sidebar Panel */}
          <div>
            {editingBanner ? (
              <form onSubmit={handleSaveBanner} className="p-6 border border-border/40 bg-card rounded-2xl space-y-4 shadow-sm">
                <h3 className="text-base font-black text-foreground">
                  {editingBanner.id ? "Edit Slideshow Banner" : "New Slideshow Banner"}
                </h3>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Banner Title</label>
                  <input
                    type="text"
                    required
                    value={editingBanner.title}
                    onChange={e => setEditingBanner({ ...editingBanner, title: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-border bg-muted/30 focus:outline-none focus:border-primary text-foreground"
                    placeholder="Nike Store Collection"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Subtitle / Caption</label>
                  <textarea
                    rows={2}
                    value={editingBanner.subtitle}
                    onChange={e => setEditingBanner({ ...editingBanner, subtitle: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-border bg-muted/30 focus:outline-none focus:border-primary text-foreground"
                    placeholder="Explore premium sports gear and sneakers."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Image URL (e.g. /1.png, /2.png, /3.png)</label>
                  <input
                    type="text"
                    required
                    value={editingBanner.imageUrl}
                    onChange={e => setEditingBanner({ ...editingBanner, imageUrl: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-border bg-muted/30 focus:outline-none focus:border-primary text-foreground font-mono"
                    placeholder="/1.png"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">CTA Text</label>
                    <input
                      type="text"
                      required
                      value={editingBanner.ctaText}
                      onChange={e => setEditingBanner({ ...editingBanner, ctaText: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-lg border border-border bg-muted/30 focus:outline-none focus:border-primary text-foreground"
                      placeholder="Shop Collection"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Display Order</label>
                    <input
                      type="number"
                      required
                      value={editingBanner.order}
                      onChange={e => setEditingBanner({ ...editingBanner, order: parseInt(e.target.value) || 1 })}
                      className="w-full text-xs p-2.5 rounded-lg border border-border bg-muted/30 focus:outline-none focus:border-primary text-foreground font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">CTA Target Link</label>
                  <input
                    type="text"
                    required
                    value={editingBanner.ctaLink}
                    onChange={e => setEditingBanner({ ...editingBanner, ctaLink: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-border bg-muted/30 focus:outline-none focus:border-primary text-foreground font-mono"
                    placeholder="https://..."
                  />
                </div>

                <div className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    id="active-toggle"
                    checked={editingBanner.active}
                    onChange={e => setEditingBanner({ ...editingBanner, active: e.target.checked })}
                    className="rounded text-primary focus:ring-primary size-4"
                  />
                  <label htmlFor="active-toggle" className="text-xs font-semibold text-foreground select-none cursor-pointer">
                    Visible / Active on storefront
                  </label>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingBanner(null)}
                    className="py-2 px-4 border border-border hover:bg-muted text-xs font-bold rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-6 border border-dashed border-border/40 rounded-2xl bg-card text-center space-y-2">
                <span className="block text-sm font-bold text-foreground">Banner Preview & Edit</span>
                <p className="text-xs text-muted-foreground">Select a banner card to edit its properties, visibility toggle, display order index, or upload configurations.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
