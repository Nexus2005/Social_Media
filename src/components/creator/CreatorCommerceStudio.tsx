"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import kyInstance from "@/lib/ky";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Plus, Sparkles, Check, X, ShieldAlert, ChevronLeft, LayoutGrid, Trash2, Edit2, Link as LinkIcon, Eye, Star, Info, HelpCircle, Briefcase, DollarSign, Award, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreatorCommerceStudioProps {
  userId: string;
}

export default function CreatorCommerceStudio({ userId }: CreatorCommerceStudioProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [studioTab, setStudioTab] = useState<"spots" | "campaigns">("spots");

  // Fetch creator's reels
  const { data: reels, isLoading: loadingReels, refetch: refetchReels } = useQuery({
    queryKey: ["creator-reels", userId],
    queryFn: () => kyInstance.get("/api/creator/reels").json<any[]>(),
  });

  if (loadingReels) {
    return (
      <div className="flex justify-center py-20 gap-2.5 text-zinc-400 text-sm select-none">
        <Loader2 className="size-5 animate-spin text-primary" />
        <span>Loading Creator Studio...</span>
      </div>
    );
  }

  if (selectedPostId) {
    const activeReel = reels?.find((r) => r.id === selectedPostId);
    return (
      <ReelProductManager
        postId={selectedPostId}
        onBack={() => {
          setSelectedPostId(null);
          refetchReels();
        }}
        reelCaption={activeReel?.caption || ""}
        videoUrl={activeReel?.videoUrl || ""}
      />
    );
  }

  return (
    <div className="space-y-6 select-none pb-12 animate-in fade-in duration-300">
      <div className="px-4 py-2 flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-900 pb-5 gap-3.5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            <span>Commerce Manager</span>
          </h2>
          <p className="text-zinc-500 text-xs mt-1 leading-relaxed">
            Verify AI detections, manually assign items, and track storefront collections.
          </p>
        </div>
      </div>

      <div className="px-4 flex border-b border-zinc-900 gap-6 select-none pb-0.5">
        <button
          onClick={() => setStudioTab("spots")}
          className={cn(
            "py-2 font-bold text-xs relative tracking-wide uppercase transition-colors shrink-0",
            studioTab === "spots" ? "text-white font-black" : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          <span>Spots Commerce</span>
          {studioTab === "spots" && (
            <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full" />
          )}
        </button>
        <button
          onClick={() => setStudioTab("campaigns")}
          className={cn(
            "py-2 font-bold text-xs relative tracking-wide uppercase transition-colors shrink-0",
            studioTab === "campaigns" ? "text-white font-black" : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          <span>Campaigns & Revenue</span>
          {studioTab === "campaigns" && (
            <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full" />
          )}
        </button>
      </div>

      {studioTab === "spots" ? (
        !reels || reels.length === 0 ? (
          <div className="text-center py-20 px-4">
            <ShieldAlert className="size-10 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-400 font-medium text-sm">No Spots detected for this profile.</p>
            <p className="text-zinc-500 text-xs mt-1">Upload a Spot video to activate commerce tags.</p>
          </div>
        ) : (
          <div className="px-4 grid grid-cols-2 sm:grid-cols-3 gap-3.5">
            {reels.map((reel) => (
              <button
                key={reel.id}
                onClick={() => setSelectedPostId(reel.id)}
                className="flex flex-col text-left bg-zinc-950/40 border border-zinc-900 hover:border-zinc-800 rounded-2xl overflow-hidden group transition-all"
              >
                {/* Thumbnail / Video Preview */}
                <div className="aspect-[9/16] w-full bg-black relative flex items-center justify-center border-b border-zinc-900/60">
                  {reel.videoUrl ? (
                    <video
                      src={reel.videoUrl}
                      className="w-full h-full object-cover opacity-75 group-hover:scale-102 transition-transform duration-300"
                      muted
                      playsInline
                    />
                  ) : (
                    <LayoutGrid className="size-8 text-zinc-700" />
                  )}
                  {/* Stats badge overlay */}
                  <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 items-end">
                    {reel.pendingCount > 0 && (
                      <span className="bg-orange-500/10 text-orange-400 border border-orange-500/25 px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase backdrop-blur-sm">
                        {reel.pendingCount} Needs Review
                      </span>
                    )}
                    {reel.publishedCount > 0 && (
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase backdrop-blur-sm">
                        {reel.publishedCount} Tagged
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Info section */}
                <div className="p-3.5 space-y-1.5 flex-1 flex flex-col justify-between">
                  <p className="text-xs text-zinc-300 font-bold truncate line-clamp-2 leading-relaxed">
                    {reel.caption || "No description provided."}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono font-medium pt-1.5 border-t border-zinc-900/60 mt-1">
                    <span>{new Date(reel.createdAt).toLocaleDateString()}</span>
                    <span className="text-primary font-bold">Manage Products →</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )
      ) : (
        <div className="px-4">
          <BrandCampaignsView userId={userId} />
        </div>
      )}
    </div>
  );
}

// Single Reel Product overrides manager
function ReelProductManager({
  postId,
  onBack,
  reelCaption,
  videoUrl,
}: {
  postId: string;
  onBack: () => void;
  reelCaption: string;
  videoUrl: string;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // Tab selections: "review" (Inbox workflow) or "list" (Manual override panel)
  const [activeView, setActiveView] = useState<"review" | "list">("review");

  // Manual Add Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [extractUrl, setExtractUrl] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);

  const [formName, setFormName] = useState("");
  const [formBrand, setFormBrand] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formImage, setFormImage] = useState("");
  const [formRetailerUrl, setFormRetailerUrl] = useState("");
  const [formRetailerName, setFormRetailerName] = useState("");

  // Bulk actions checklist state
  const [checkedAssignments, setCheckedAssignments] = useState<string[]>([]);

  // Fetch reel assignments
  const { data: assignments, isLoading, refetch } = useQuery({
    queryKey: ["creator-reel-products", postId],
    queryFn: () => kyInstance.get(`/api/creator/reels/${postId}/products`).json<any[]>(),
  });

  // Fetch dynamic conversion analytics
  const { data: analytics, refetch: refetchAnalytics } = useQuery({
    queryKey: ["creator-reel-analytics", postId],
    queryFn: () => kyInstance.get(`/api/creator/reels/${postId}/analytics`).json<any>(),
  });

  const activeAssignment = assignments?.find((a) => a.productId === selectedProductId) || assignments?.[0];

  const pendingReviewItems = assignments?.filter((a) => a.status === "PENDING_REVIEW") || [];
  const [reviewIndex, setReviewIndex] = useState(0);

  // Switch to management tab if no pending items
  useEffect(() => {
    if (pendingReviewItems.length === 0 && activeView === "review" && assignments && assignments.length > 0) {
      setActiveView("list");
    }
  }, [pendingReviewItems, activeView, assignments]);

  const currentReviewAssignment = pendingReviewItems[reviewIndex];

  // Actions mutation
  const actionMutation = useMutation({
    mutationFn: (body: any) =>
      kyInstance.post("/api/creator/products", { json: { ...body, postId } }).json<any>(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["creator-reel-products", postId] });
      queryClient.invalidateQueries({ queryKey: ["creator-reel-analytics", postId] });
      queryClient.invalidateQueries({ queryKey: ["creator-reels"] });
      refetch();
      refetchAnalytics();
      setCheckedAssignments([]);
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        description: err.message || "Action failed.",
      });
    },
  });

  // Fetch URL details for auto-fill
  const handleUrlExtract = async () => {
    if (!extractUrl) return;
    setIsExtracting(true);
    try {
      const res = await fetch(`/api/creator/extract-metadata?url=${encodeURIComponent(extractUrl)}`);
      if (res.ok) {
        const data = await res.json();
        setFormName(data.title || "");
        setFormBrand(data.brand || "");
        setFormDescription(data.description || "");
        setFormPrice(data.price || "");
        setFormImage(data.image || "");
        setFormRetailerUrl(extractUrl);
        setFormRetailerName(data.brand || "");
        toast({
          description: "Product metadata successfully extracted and auto-filled!",
        });
      } else {
        toast({
          variant: "destructive",
          description: "Could not auto-extract info. Form fallback activated.",
        });
      }
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        description: "Failed to extract metadata.",
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleManualAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formCategory) {
      toast({
        variant: "destructive",
        description: "Please fill out Name and Category.",
      });
      return;
    }

    actionMutation.mutate({
      action: "create",
      label: formName,
      category: formCategory,
      brand: formBrand,
      description: formDescription,
      price: formPrice,
      imageUrl: formImage,
      retailerUrl: formRetailerUrl,
      retailerName: formRetailerName,
    }, {
      onSuccess: () => {
        toast({
          description: "Product successfully assigned to reel!",
        });
        // reset form
        setShowAddForm(false);
        setExtractUrl("");
        setFormName("");
        setFormBrand("");
        setFormCategory("");
        setFormDescription("");
        setFormPrice("");
        setFormImage("");
        setFormRetailerUrl("");
        setFormRetailerName("");
      }
    });
  };

  // Override / Verification Actions
  const handleApprove = (assignmentId: string) => {
    actionMutation.mutate({
      action: "approve",
      assignmentIds: [assignmentId],
    }, {
      onSuccess: () => {
        toast({ description: "Product verified and published!" });
      }
    });
  };

  const handleReject = (assignmentId: string, reason?: string) => {
    actionMutation.mutate({
      action: "reject",
      assignmentIds: [assignmentId],
      reviewReason: reason || "Rejected by creator",
    }, {
      onSuccess: () => {
        toast({ description: "Product rejected and hidden from public." });
      }
    });
  };

  // Bulk actions
  const handleBulkApprove = () => {
    if (checkedAssignments.length === 0) return;
    actionMutation.mutate({
      action: "approve",
      assignmentIds: checkedAssignments,
    }, {
      onSuccess: () => {
        toast({ description: `${checkedAssignments.length} products approved!` });
      }
    });
  };

  const handleBulkReject = () => {
    if (checkedAssignments.length === 0) return;
    actionMutation.mutate({
      action: "reject",
      assignmentIds: checkedAssignments,
      reviewReason: "Bulk rejected by creator",
    }, {
      onSuccess: () => {
        toast({ description: `${checkedAssignments.length} products hidden!` });
      }
    });
  };

  const handleBulkDelete = () => {
    if (checkedAssignments.length === 0) return;
    actionMutation.mutate({
      action: "delete",
      assignmentIds: checkedAssignments,
    }, {
      onSuccess: () => {
        toast({ description: `${checkedAssignments.length} products deleted!` });
      }
    });
  };

  // Swipe Deck Verification Triage Handles
  const handleSwipeApprove = (assignmentId: string) => {
    actionMutation.mutate({
      action: "approve",
      assignmentIds: [assignmentId],
    });
    // Move to next
    if (reviewIndex >= pendingReviewItems.length - 1) {
      setReviewIndex(0);
    }
  };

  const handleSwipeReject = (assignmentId: string) => {
    actionMutation.mutate({
      action: "reject",
      assignmentIds: [assignmentId],
      reviewReason: "Triage swipe reject",
    });
    // Move to next
    if (reviewIndex >= pendingReviewItems.length - 1) {
      setReviewIndex(0);
    }
  };

  const handleSwipeSkip = () => {
    if (reviewIndex < pendingReviewItems.length - 1) {
      setReviewIndex((prev) => prev + 1);
    } else {
      setReviewIndex(0);
    }
  };

  const toggleCheck = (assignmentId: string) => {
    setCheckedAssignments((prev) =>
      prev.includes(assignmentId)
        ? prev.filter((id) => id !== assignmentId)
        : [...prev, assignmentId]
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING_REVIEW":
        return <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold">Needs Review</span>;
      case "PUBLISHED":
        return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold">Published</span>;
      case "HIDDEN":
        return <span className="bg-zinc-500/10 text-zinc-400 border border-zinc-800 px-2 py-0.5 rounded-full text-[10px] font-bold">Hidden</span>;
      case "ARCHIVED":
        return <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold">Archived</span>;
      default:
        return <span className="bg-zinc-500/10 text-zinc-400 border border-zinc-800 px-2 py-0.5 rounded-full text-[10px] font-bold">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-300 pb-16 px-4">
      {/* Header back button */}
      <div className="flex items-center gap-3 border-b border-zinc-900 pb-4">
        <button onClick={onBack} className="p-2 hover:bg-zinc-900 rounded-full text-zinc-400 hover:text-white transition">
          <ChevronLeft className="size-5" />
        </button>
        <div>
          <h3 className="font-bold text-white text-sm truncate max-w-[280px]">
            {reelCaption || "Active Reel"}
          </h3>
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Reel Products Studio</span>
        </div>
      </div>

      {/* Dynamic Conversion Analytics Card */}
      {analytics?.reelStats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 bg-zinc-950/20 border border-zinc-900 rounded-[20px] p-4.5">
          <div className="flex flex-col gap-1 p-3 bg-[#090909]/40 border border-zinc-900/60 rounded-xl">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Total Views</span>
            <span className="text-lg font-black text-white font-mono">{analytics.reelStats.views.toLocaleString()}</span>
          </div>
          <div className="flex flex-col gap-1 p-3 bg-[#090909]/40 border border-zinc-900/60 rounded-xl">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Drawer Opens</span>
            <span className="text-lg font-black text-white font-mono">{analytics.reelStats.opens.toLocaleString()}</span>
          </div>
          <div className="flex flex-col gap-1 p-3 bg-[#090909]/40 border border-zinc-900/60 rounded-xl">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Product Clicks</span>
            <span className="text-lg font-black text-white font-mono">{analytics.reelStats.productClicks.toLocaleString()}</span>
          </div>
          <div className="flex flex-col gap-1 p-3 bg-[#090909]/40 border border-zinc-900/60 rounded-xl">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Retailer Clicks</span>
            <span className="text-lg font-black text-white font-mono">{analytics.reelStats.retailerClicks.toLocaleString()}</span>
          </div>
          <div className="flex flex-col gap-1 p-3 bg-[#090909]/40 border border-zinc-900/60 rounded-xl col-span-2 sm:col-span-1">
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Product CTR / Retailer CTR</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-lg font-black text-white font-mono">{(analytics.reelStats.productCtr * 100).toFixed(1)}%</span>
              <span className="text-xs text-zinc-500 font-mono">/ {(analytics.reelStats.retailerCtr * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Main double column split layout on Desktop */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* Left column: Video and form inputs */}
        <div className="md:col-span-4 space-y-5">
          <div className="aspect-[9/16] w-full rounded-2xl overflow-hidden bg-black border border-zinc-900 shadow-xl relative max-w-[280px] mx-auto md:max-w-none">
            {videoUrl ? (
              <video src={videoUrl} controls className="w-full h-full object-cover" muted />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-700">No media</div>
            )}
          </div>

          {/* Quick manual product shortcut button */}
          {!showAddForm ? (
            <Button
              onClick={() => setShowAddForm(true)}
              className="w-full rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs gap-1.5 h-11"
            >
              <Plus className="size-4" />
              <span>Add Custom Product</span>
            </Button>
          ) : (
            <div className="bg-zinc-950/40 border border-zinc-900 p-4 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Manual Product</span>
                <button onClick={() => setShowAddForm(false)} className="text-zinc-500 hover:text-white text-xs font-medium">Cancel</button>
              </div>

              {/* Paste URL auto fill parser input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Paste Store Link (Amazon, Myntra, Ajio)</label>
                <div className="flex gap-1.5">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="https://..."
                      value={extractUrl}
                      onChange={(e) => setExtractUrl(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 text-white rounded-xl px-3 py-2 text-xs w-full focus:outline-none focus:border-zinc-700"
                    />
                    <LinkIcon className="absolute right-3 top-2.5 size-3.5 text-zinc-600" />
                  </div>
                  <Button
                    onClick={handleUrlExtract}
                    disabled={isExtracting || !extractUrl}
                    variant="secondary"
                    className="h-9 px-3 rounded-xl text-[10px] font-black uppercase text-zinc-300"
                  >
                    {isExtracting ? <Loader2 className="size-3 animate-spin" /> : "Fill"}
                  </Button>
                </div>
              </div>

              {/* Standard inputs */}
              <form onSubmit={handleManualAddSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase">Product Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Nike Sneaker"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 text-white rounded-lg px-2.5 py-1.5 text-xs w-full focus:outline-none focus:border-zinc-700"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase">Category *</label>
                    <input
                      type="text"
                      required
                      placeholder="Shoes"
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 text-white rounded-lg px-2.5 py-1.5 text-xs w-full focus:outline-none focus:border-zinc-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase">Brand</label>
                    <input
                      type="text"
                      placeholder="Nike"
                      value={formBrand}
                      onChange={(e) => setFormBrand(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 text-white rounded-lg px-2.5 py-1.5 text-xs w-full focus:outline-none focus:border-zinc-700"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase">Price</label>
                    <input
                      type="text"
                      placeholder="₹4,999"
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 text-white rounded-lg px-2.5 py-1.5 text-xs w-full focus:outline-none focus:border-zinc-700"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-zinc-500 uppercase">Product Image URL</label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={formImage}
                    onChange={(e) => setFormImage(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 text-white rounded-lg px-2.5 py-1.5 text-xs w-full focus:outline-none focus:border-zinc-700"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase">Retailer URL</label>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={formRetailerUrl}
                      onChange={(e) => setFormRetailerUrl(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 text-white rounded-lg px-2.5 py-1.5 text-xs w-full focus:outline-none focus:border-zinc-700"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase">Store Name</label>
                    <input
                      type="text"
                      placeholder="Amazon"
                      value={formRetailerName}
                      onChange={(e) => setFormRetailerName(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 text-white rounded-lg px-2.5 py-1.5 text-xs w-full focus:outline-none focus:border-zinc-700"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={actionMutation.isPending}
                  className="w-full mt-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold py-2"
                >
                  {actionMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Assign to Reel"}
                </Button>
              </form>
            </div>
          )}
        </div>

        {/* Right column: Triage dashboard */}
        <div className="md:col-span-8 space-y-6">
          {/* Studio tabs */}
          <div className="flex border-b border-zinc-900 gap-6 select-none pb-0.5">
            {pendingReviewItems.length > 0 && (
              <button
                onClick={() => setActiveView("review")}
                className={cn(
                  "py-2 font-bold text-xs relative tracking-wide uppercase transition-colors shrink-0",
                  activeView === "review" ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <span>Needs Review ({pendingReviewItems.length})</span>
                {activeView === "review" && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full" />
                )}
              </button>
            )}
            <button
              onClick={() => setActiveView("list")}
              className={cn(
                "py-2 font-bold text-xs relative tracking-wide uppercase transition-colors shrink-0",
                activeView === "list" ? "text-white" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <span>Manage Matches ({assignments?.length || 0})</span>
              {activeView === "list" && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full" />
              )}
            </button>
          </div>

          {/* VIEW: 1. NEEDS REVIEW QUEUE (Tinder-style Swipe Verification) */}
          {activeView === "review" && currentReviewAssignment ? (
            <div className="space-y-4 max-w-lg mx-auto py-4">
              <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider text-center">
                Suggestion {reviewIndex + 1} of {pendingReviewItems.length}
              </div>

              {/* Swipe Card Deck Layout */}
              <div className="bg-[#090909] border border-zinc-900 rounded-[24px] overflow-hidden shadow-2xl relative select-none p-5 flex flex-col gap-4 animate-in zoom-in duration-200">
                <div className="aspect-square w-full rounded-2xl overflow-hidden bg-black border border-zinc-800/80 relative">
                  <img
                    src={currentReviewAssignment.product.thumbnailUrl || "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&auto=format&fit=crop&q=60"}
                    alt={currentReviewAssignment.product.label}
                    className="w-full h-full object-cover"
                  />
                  {/* AI Confidence badge */}
                  {currentReviewAssignment.aiConfidence !== null && (
                    <span className="absolute bottom-3 right-3 bg-black/75 backdrop-blur text-[10px] font-mono font-bold text-zinc-300 px-2.5 py-1 rounded-md border border-zinc-850">
                      AI Match Score: {(currentReviewAssignment.aiConfidence * 100).toFixed(0)}%
                    </span>
                  )}
                </div>

                <div className="space-y-1 px-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{currentReviewAssignment.product.category}</span>
                    {currentReviewAssignment.product.brand && (
                      <span className="text-[11px] text-zinc-400 font-medium capitalize">by {currentReviewAssignment.product.brand}</span>
                    )}
                  </div>
                  <h4 className="text-lg font-bold text-white leading-snug capitalize">
                    {currentReviewAssignment.product.label}
                  </h4>
                  {currentReviewAssignment.product.description && (
                    <p className="text-zinc-500 text-xs mt-1 leading-relaxed line-clamp-2">
                      {currentReviewAssignment.product.description}
                    </p>
                  )}
                </div>

                {/* Tinder Swipe Buttons Tray */}
                <div className="grid grid-cols-3 gap-3.5 pt-3 select-none">
                  {/* Swipe Left - Rejection */}
                  <Button
                    onClick={() => handleSwipeReject(currentReviewAssignment.id)}
                    variant="outline"
                    className="rounded-2xl border-red-950 text-red-500 hover:bg-red-950/20 py-6 font-extrabold flex flex-col gap-1 text-[11px] uppercase tracking-wider"
                  >
                    <X className="size-5" />
                    <span>Wrong</span>
                  </Button>

                  {/* Swipe Down - Review Later / Skip */}
                  <Button
                    onClick={handleSwipeSkip}
                    variant="outline"
                    className="rounded-2xl border-zinc-800 text-zinc-400 hover:bg-zinc-900 py-6 font-extrabold flex flex-col gap-1 text-[11px] uppercase tracking-wider"
                  >
                    <HelpCircle className="size-5" />
                    <span>Skip</span>
                  </Button>

                  {/* Swipe Right - Approval */}
                  <Button
                    onClick={() => handleSwipeApprove(currentReviewAssignment.id)}
                    className="rounded-2xl bg-white hover:bg-zinc-200 text-black py-6 font-extrabold flex flex-col gap-1 text-[11px] uppercase tracking-wider"
                  >
                    <Check className="size-5" />
                    <span>Correct</span>
                  </Button>
                </div>
              </div>
            </div>
          ) : activeView === "review" ? (
            <div className="text-center py-16">
              <Check className="size-10 text-emerald-500 mx-auto mb-3" />
              <p className="text-zinc-400 font-bold text-sm">Inbox Cleared!</p>
              <p className="text-zinc-500 text-xs mt-1">All AI suggested product matches have been reviewed.</p>
            </div>
          ) : null}

          {/* VIEW: 2. MANAGE PRODUCT MATCHES (Override Panel & Lists) */}
          {activeView === "list" && (
            <div className="space-y-4">
              {/* Bulk actions toolbar */}
              {checkedAssignments.length > 0 && (
                <div className="flex items-center justify-between bg-zinc-950 border border-zinc-900 p-3 rounded-xl animate-in slide-in-from-top duration-200 text-xs">
                  <span className="font-bold text-zinc-300 font-mono">{checkedAssignments.length} Selected</span>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleBulkApprove}
                      variant="secondary"
                      className="h-8 px-3 rounded-lg text-[10px] font-bold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/20"
                    >
                      Approve
                    </Button>
                    <Button
                      onClick={handleBulkReject}
                      variant="secondary"
                      className="h-8 px-3 rounded-lg text-[10px] font-bold text-zinc-400 hover:text-zinc-300"
                    >
                      Hide
                    </Button>
                    <Button
                      onClick={handleBulkDelete}
                      variant="destructive"
                      className="h-8 px-3 rounded-lg text-[10px] font-bold gap-1"
                    >
                      <Trash2 className="size-3" />
                      <span>Delete</span>
                    </Button>
                  </div>
                </div>
              )}

              {/* Assignments list */}
              {!assignments || assignments.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-zinc-900 rounded-2xl">
                  <ShieldAlert className="size-8 text-zinc-700 mx-auto mb-2" />
                  <p className="text-zinc-500 text-xs">No products assigned to this Spot yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {assignments.map((asg) => {
                    const isChecked = checkedAssignments.includes(asg.id);
                    const matchedCount = asg.product?.matches?.length || 0;
                    
                    return (
                      <div
                        key={asg.id}
                        className={cn(
                          "bg-zinc-950/20 border border-zinc-900 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-zinc-800 transition-colors",
                          isChecked && "border-zinc-800 bg-zinc-900/10"
                        )}
                      >
                        <div className="flex items-start gap-3.5 min-w-0">
                          {/* Checkbox */}
                          <button
                            onClick={() => toggleCheck(asg.id)}
                            className={cn(
                              "size-4 rounded border flex items-center justify-center mt-1 flex-shrink-0 cursor-pointer",
                              isChecked
                                ? "bg-white border-transparent text-black"
                                : "border-zinc-800 hover:border-zinc-700 text-transparent"
                            )}
                          >
                            <Check className="size-3" strokeWidth={3} />
                          </button>

                          {/* Image */}
                          <div className="size-14 rounded-xl overflow-hidden bg-black flex-shrink-0 border border-zinc-900">
                            <img
                              src={asg.product?.thumbnailUrl || "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=100&auto=format&fit=crop&q=60"}
                              alt={asg.product?.label}
                              className="w-full h-full object-cover"
                            />
                          </div>

                          {/* Info */}
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h5 className="font-bold text-white text-xs truncate max-w-[180px] capitalize">
                                {asg.product?.label}
                              </h5>
                              {getStatusBadge(asg.status)}
                            </div>
                            <p className="text-[10px] text-zinc-500 flex flex-wrap gap-x-2 gap-y-0.5 leading-tight">
                              <span className="font-bold">Cat: {asg.product?.category}</span>
                              {asg.product?.brand && <span>• Brand: {asg.product?.brand}</span>}
                              <span>• Stores: {matchedCount}</span>
                            </p>
                            {analytics?.productStats?.[asg.id] && (
                              <div className="flex items-center gap-2 flex-wrap text-[9.5px] font-mono text-zinc-400 mt-1 select-none">
                                <span className="bg-[#121212] px-2 py-0.5 rounded text-zinc-300">Views: {analytics.productStats[asg.id].views}</span>
                                <span className="bg-[#121212] px-2 py-0.5 rounded text-zinc-300">Clicks: {analytics.productStats[asg.id].productClicks}</span>
                                <span className="bg-[#121212] px-2 py-0.5 rounded text-zinc-300">Store Clicks: {analytics.productStats[asg.id].retailerClicks}</span>
                                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded font-bold">CTR: {(analytics.productStats[asg.id].productCtr * 100).toFixed(1)}%</span>
                              </div>
                            )}
                            {asg.reviewReason && (
                              <p className="text-[9px] text-red-400 font-mono italic">
                                Note: {asg.reviewReason}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto border-t border-zinc-900 sm:border-t-0 pt-2 sm:pt-0">
                          {asg.status !== "PUBLISHED" ? (
                            <Button
                              onClick={() => handleApprove(asg.id)}
                              variant="secondary"
                              className="h-8 rounded-lg text-[10px] font-bold text-emerald-400 hover:text-emerald-350 hover:bg-emerald-950/20"
                            >
                              Approve
                            </Button>
                          ) : (
                            <Button
                              onClick={() => handleReject(asg.id)}
                              variant="secondary"
                              className="h-8 rounded-lg text-[10px] font-bold text-zinc-400 hover:text-zinc-300"
                            >
                              Hide
                            </Button>
                          )}
                          <Button
                            onClick={() => {
                              actionMutation.mutate({
                                action: "delete",
                                assignmentIds: [asg.id],
                              });
                            }}
                            variant="destructive"
                            className="h-8 w-8 p-0 rounded-lg"
                            title="Delete Tag"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// Brand Partnerships and Commission Tracking dashboard
function BrandCampaignsView({ userId }: { userId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [commissionRate, setCommissionRate] = useState("10");
  const [campaignStatus, setCampaignStatus] = useState("ACTIVE");

  const { data: campaigns, isLoading, refetch } = useQuery({
    queryKey: ["creator-campaigns", userId],
    queryFn: () => kyInstance.get("/api/creator/campaigns").json<any[]>(),
  });

  const createMutation = useMutation({
    mutationFn: (body: any) =>
      kyInstance.post("/api/creator/campaigns", { json: body }).json<any>(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creator-campaigns", userId] });
      refetch();
      setShowAddForm(false);
      setBrandName("");
      setCampaignName("");
      setCommissionRate("10");
      toast({
        description: "New brand campaign created successfully!",
      });
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        description: err.message || "Failed to create campaign",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName || !campaignName) {
      toast({
        variant: "destructive",
        description: "Please fill out Brand Name and Campaign Name",
      });
      return;
    }
    createMutation.mutate({
      brandName,
      campaignName,
      commissionRate: parseFloat(commissionRate) || 0,
      status: campaignStatus,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded-full text-[10px] font-bold">Active</span>;
      case "PAUSED":
        return <span className="bg-orange-500/10 text-orange-400 border border-orange-500/25 px-2 py-0.5 rounded-full text-[10px] font-bold">Paused</span>;
      case "COMPLETED":
        return <span className="bg-blue-500/10 text-blue-400 border border-blue-500/25 px-2 py-0.5 rounded-full text-[10px] font-bold">Completed</span>;
      case "DRAFT":
        return <span className="bg-zinc-500/10 text-zinc-400 border border-zinc-800 px-2 py-0.5 rounded-full text-[10px] font-bold">Draft</span>;
      case "CANCELLED":
        return <span className="bg-red-500/10 text-red-400 border border-red-500/25 px-2 py-0.5 rounded-full text-[10px] font-bold">Cancelled</span>;
      default:
        return <span className="bg-zinc-500/10 text-zinc-400 border border-zinc-800 px-2 py-0.5 rounded-full text-[10px] font-bold">{status}</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20 gap-2.5 text-zinc-400 text-sm select-none">
        <Loader2 className="size-5 animate-spin text-primary" />
        <span>Loading Campaigns...</span>
      </div>
    );
  }

  // Summary Metrics
  const activeCount = campaigns?.filter((c) => c.status === "ACTIVE").length || 0;
  const totalEarnings = campaigns?.reduce((acc, c) => acc + (c.commissionEarned || 0), 0) || 0;
  const avgRate = campaigns && campaigns.length > 0
    ? campaigns.reduce((acc, c) => acc + (c.commissionRate || 0), 0) / campaigns.length
    : 0;

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#090909]/40 border border-zinc-900 p-4.5 rounded-2xl flex items-center gap-4.5">
          <div className="size-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Briefcase className="size-5" />
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Active Campaigns</span>
            <span className="text-xl font-black text-white font-mono">{activeCount}</span>
          </div>
        </div>
        <div className="bg-[#090909]/40 border border-zinc-900 p-4.5 rounded-2xl flex items-center gap-4.5">
          <div className="size-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <DollarSign className="size-5" />
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Partner Revenue</span>
            <span className="text-xl font-black text-white font-mono">₹{totalEarnings.toLocaleString()}</span>
          </div>
        </div>
        <div className="bg-[#090909]/40 border border-zinc-900 p-4.5 rounded-2xl flex items-center gap-4.5">
          <div className="size-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
            <TrendingUp className="size-5" />
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Avg Commission Rate</span>
            <span className="text-xl font-black text-white font-mono">{avgRate.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Campaigns Header & Add Contract trigger */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black tracking-wider text-zinc-400 uppercase">Active Partnerships</h3>
        {!showAddForm && (
          <Button
            onClick={() => setShowAddForm(true)}
            className="rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold gap-1 px-4 py-2"
          >
            <Plus className="size-3.5" />
            <span>Create Campaign</span>
          </Button>
        )}
      </div>

      {/* Add Campaign contract inline Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-zinc-950/40 border border-zinc-900 p-5 rounded-2xl space-y-4 max-w-lg animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-2.5">
            <span className="text-xs font-bold text-white uppercase tracking-wider">New Partnership Agreement</span>
            <button type="button" onClick={() => setShowAddForm(false)} className="text-zinc-500 hover:text-white text-xs font-medium">Cancel</button>
          </div>
          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-zinc-500 uppercase">Brand Partner Name *</label>
              <input
                type="text"
                required
                placeholder="Nike, Adidas, Zara"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 text-white rounded-lg px-2.5 py-1.5 text-xs w-full focus:outline-none focus:border-zinc-700"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-zinc-500 uppercase">Campaign Title *</label>
              <input
                type="text"
                required
                placeholder="Summer Essentials Promo"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 text-white rounded-lg px-2.5 py-1.5 text-xs w-full focus:outline-none focus:border-zinc-700"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-zinc-500 uppercase">Commission Rate (%)</label>
              <input
                type="number"
                step="0.1"
                placeholder="10.5"
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 text-white rounded-lg px-2.5 py-1.5 text-xs w-full focus:outline-none focus:border-zinc-700"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-zinc-500 uppercase">Status</label>
              <select
                value={campaignStatus}
                onChange={(e) => setCampaignStatus(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 text-white rounded-lg px-2.5 py-1.5 text-xs w-full focus:outline-none focus:border-zinc-700"
              >
                <option value="ACTIVE">Active</option>
                <option value="DRAFT">Draft</option>
                <option value="PAUSED">Paused</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
          <Button
            type="submit"
            disabled={createMutation.isPending}
            className="w-full rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold py-2.5 mt-2"
          >
            {createMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Establish Campaign"}
          </Button>
        </form>
      )}

      {/* Campaigns Listing */}
      {!campaigns || campaigns.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-zinc-900 rounded-2xl bg-zinc-950/20">
          <Award className="size-8 text-zinc-700 mx-auto mb-2" />
          <p className="text-zinc-500 text-xs">No active brand campaigns or partnership agreements tracked.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((camp) => (
            <div
              key={camp.id}
              className="bg-zinc-950/20 border border-zinc-900 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-zinc-800 transition-colors"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                {/* Brand Logo clearbit */}
                <div className="size-11 rounded-xl overflow-hidden bg-white flex-shrink-0 border border-zinc-900 p-1 flex items-center justify-center">
                  <img
                    src={camp.brand.logoUrl || `https://logo.clearbit.com/${camp.brand.name.toLowerCase().replace(/\s+/g, "")}.com`}
                    alt={camp.brand.name}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as any).style.display = "none";
                      const parent = (e.target as any).parentElement;
                      if (parent) {
                        parent.innerHTML = `<span class="text-xs font-black text-black select-none">${camp.brand.name.slice(0, 2).toUpperCase()}</span>`;
                      }
                    }}
                  />
                </div>

                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h5 className="font-bold text-white text-xs truncate max-w-[200px]">
                      {camp.name}
                    </h5>
                    {getStatusBadge(camp.status)}
                  </div>
                  <p className="text-[10px] text-zinc-500 font-medium">
                    Partner: <span className="font-bold text-zinc-300 uppercase">{camp.brand.name}</span>
                  </p>
                </div>
              </div>

              {/* Commission/Revenue details */}
              <div className="flex items-center gap-5.5 self-end sm:self-auto text-right">
                <div className="flex flex-col">
                  <span className="text-[8.5px] text-zinc-500 font-bold uppercase tracking-wider">Commission</span>
                  <span className="text-xs font-mono font-bold text-zinc-300">{(camp.commissionRate || 0).toFixed(1)}%</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[8.5px] text-zinc-500 font-bold uppercase tracking-wider">Earnings</span>
                  <span className="text-sm font-mono font-black text-emerald-400 font-semibold">₹{(camp.commissionEarned || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
