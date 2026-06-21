"use client";

import { useState } from "react";
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
          <h1 className="text-3xl font-black tracking-tight font-sans cartly-gradient-text">AI Processing Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Monitor product detection pipelines, worker heartbeats, and consumer conversion analytics.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="flex items-center justify-center gap-2 px-4 py-2 border border-border/40 rounded-xl bg-card hover:bg-accent/40 text-sm font-bold transition-all disabled:opacity-50"
          >
            <RefreshCw className={cn("size-4", isRefetching && "animate-spin")} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

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
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 rounded-xl border border-border/30 bg-muted/10 text-center">
              <span className="block text-2xl font-black font-mono text-foreground">{stats.completed}</span>
              <span className="text-[10px] font-bold text-emerald-500 uppercase mt-1 flex items-center justify-center gap-1">
                <CheckCircle2 className="size-3" /> Completed
              </span>
            </div>
            <div className="p-3 rounded-xl border border-border/30 bg-muted/10 text-center">
              <span className="block text-2xl font-black font-mono text-foreground">{stats.pending + stats.processing}</span>
              <span className="text-[10px] font-bold text-amber-500 uppercase mt-1 flex items-center justify-center gap-1 animate-pulse">
                <Loader2 className="size-3 animate-spin" /> Scanning
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

        {/* Category Insights */}
        <div className="p-6 rounded-2xl border border-border/40 bg-card shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 pb-4">
            <span className="text-sm font-black tracking-wider text-muted-foreground uppercase">Top Detected Categories</span>
            <BarChart3 className="size-4 text-primary" />
          </div>
          <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
            {categories.length === 0 ? (
              <span className="text-xs text-muted-foreground italic block">No classification statistics recorded.</span>
            ) : (
              categories.map((c: any, idx: number) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">{c.category}</span>
                    <span className="font-black text-muted-foreground font-mono">{c.percentage}%</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full cartly-gradient"
                      style={{ width: `${c.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Admin Actions Panel */}
        <div className="p-6 rounded-2xl border border-border/40 bg-card shadow-sm space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-border/40 pb-4">
            <span className="text-sm font-black tracking-wider text-muted-foreground uppercase">Global Queue Actions</span>
            <Tv className="size-4 text-muted-foreground" />
          </div>
          <div className="grid grid-cols-2 gap-3 flex-grow pt-2">
            <button
              onClick={() => handleBulkAction("unfinished")}
              disabled={actionInProgress !== null}
              className="flex flex-col items-center justify-center p-3 border border-border/40 rounded-xl bg-muted/20 hover:bg-muted/60 transition-all gap-1.5 disabled:opacity-50 text-center"
            >
              <Play className="size-5 text-primary" />
              <span className="text-xs font-bold text-foreground">Reprocess Unfinished</span>
            </button>
            <button
              onClick={() => handleBulkAction("failed")}
              disabled={actionInProgress !== null}
              className="flex flex-col items-center justify-center p-3 border border-border/40 rounded-xl bg-muted/20 hover:bg-muted/60 transition-all gap-1.5 disabled:opacity-50 text-center"
            >
              <AlertTriangle className="size-5 text-destructive" />
              <span className="text-xs font-bold text-foreground">Reprocess Failed</span>
            </button>
            <button
              onClick={() => handleBulkAction("no-products")}
              disabled={actionInProgress !== null}
              className="flex flex-col items-center justify-center p-3 border border-border/40 rounded-xl bg-muted/20 hover:bg-muted/60 transition-all gap-1.5 disabled:opacity-50 text-center"
            >
              <ShoppingBag className="size-5 text-muted-foreground" />
              <span className="text-xs font-bold text-foreground">Reprocess Muted</span>
            </button>
            <button
              onClick={() => handleBulkAction("clear")}
              disabled={actionInProgress !== null}
              className="flex flex-col items-center justify-center p-3 border border-border/40 rounded-xl bg-destructive/10 hover:bg-destructive/20 border-destructive/20 transition-all gap-1.5 disabled:opacity-50 text-center"
            >
              <Trash2 className="size-5 text-destructive" />
              <span className="text-xs font-bold text-destructive">Clear Active Queue</span>
            </button>
          </div>
        </div>
      </div>

      {/* Reels Table */}
      <div className="p-6 rounded-2xl border border-border/40 bg-card shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-border/40 pb-4">
          <span className="text-sm font-black tracking-wider text-muted-foreground uppercase">Reels List ({reels.length})</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/40 text-xs text-muted-foreground uppercase tracking-wider font-bold">
                <th className="py-3 px-4">Preview</th>
                <th className="py-3 px-4">Creator</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Products</th>
                <th className="py-3 px-4">Last Activity</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reels.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-muted-foreground italic">
                    No reels found in the database.
                  </td>
                </tr>
              ) : (
                reels.map((r: any) => {
                  const isExpanded = expandedReelId === r.id;
                  const isProcessing = r.status === "pending" || r.status === "processing";
                  const lastScanStr = r.lastScan ? new Date(r.lastScan).toLocaleString() : "Never";

                  return (
                    <>
                      <tr
                        key={r.id}
                        className={cn(
                          "border-b border-border/30 hover:bg-muted/10 transition-colors text-sm cursor-pointer",
                          isExpanded && "bg-muted/10 border-b-0"
                        )}
                        onClick={() => setExpandedReelId(isExpanded ? null : r.id)}
                      >
                        {/* Preview Thumbnail */}
                        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                          <div className="relative size-12 rounded-lg bg-black border overflow-hidden flex items-center justify-center">
                            {r.thumbnail ? (
                              <video
                                src={r.thumbnail}
                                className="w-full h-full object-cover"
                                muted
                                playsInline
                              />
                            ) : (
                              <Tv className="size-5 text-muted-foreground" />
                            )}
                            <button
                              onClick={() => setExpandedReelId(isExpanded ? null : r.id)}
                              className="absolute inset-0 bg-black/40 hover:bg-black/20 flex items-center justify-center transition-colors"
                            >
                              <Eye className="size-4 text-white" />
                            </button>
                          </div>
                        </td>

                        {/* Creator Profile */}
                        <td className="py-3 px-4 font-semibold text-foreground">
                          <div className="flex items-center gap-2.5">
                            <UserAvatar avatarUrl={r.creator.avatarUrl} size={32} />
                            <div className="flex flex-col">
                              <span className="font-bold truncate max-w-[120px]">{r.creator.displayName}</span>
                              <span className="text-[11px] text-muted-foreground font-mono">@{r.creator.username}</span>
                            </div>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 px-4">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide uppercase",
                              r.status === "completed" && "bg-emerald-500/10 text-emerald-500",
                              isProcessing && "bg-amber-500/10 text-amber-500 animate-pulse",
                              r.status === "failed" && "bg-destructive/10 text-destructive",
                              r.status === "no_products" && "bg-muted text-muted-foreground",
                              r.status === "none" && "bg-muted/40 text-muted-foreground/60"
                            )}
                          >
                            {r.status === "none" ? "Unprocessed" : r.status.replace("_", " ")}
                          </span>
                        </td>

                        {/* Product Counts */}
                        <td className="py-3 px-4 text-center font-bold font-mono text-foreground">
                          {r.productsCount}
                        </td>

                        {/* Last Scan Time */}
                        <td className="py-3 px-4 text-xs text-muted-foreground font-mono">
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
    </div>
  );
}
