"use client";

export const dynamic = "force-dynamic";

import { use } from "react";
import { useSession } from "@/app/(main)/SessionProvider";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import kyInstance from "@/lib/ky";
import { Loader2, ArrowLeft, Trash2, Check, X, Link as LinkIcon, Eye, Star, Info, HelpCircle, Briefcase, Award, TrendingUp, Plus, Image as ImageIcon, Sparkles, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface PageProps {
  params: Promise<{ postId: string }> | { postId: string };
}

export default function ReelWorkspacePage({ params }: PageProps) {
  const resolvedParams = (params && typeof (params as any).then === "function")
    ? use(params as Promise<{ postId: string }>)
    : (params as { postId: string });
  const postId = resolvedParams.postId;
  return <ReelProductsStudioClient postId={postId} />;
}

function ReelProductsStudioClient({ postId }: { postId: string }) {
  const { user } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 1. Fetch creator's reels to get info for this reel
  const { data: reels, isLoading: loadingReels } = useQuery<any[]>({
    queryKey: ["creator-reels", user?.id],
    queryFn: () => kyInstance.get("/api/creator/reels").json<any[]>(),
    enabled: !!user,
  });

  // 2. Fetch assignments for this specific reel
  const { data: assignments, isLoading: loadingAssignments, refetch: refetchAssignments } = useQuery<any[]>({
    queryKey: ["creator-reel-products", postId],
    queryFn: () => kyInstance.get(`/api/creator/reels/${postId}/products`).json<any[]>(),
  });

  // 3. Fetch analytics for this specific reel
  const { data: analytics, isLoading: loadingAnalytics, refetch: refetchAnalytics } = useQuery<any>({
    queryKey: ["creator-reel-analytics", postId],
    queryFn: () => kyInstance.get(`/api/creator/reels/${postId}/analytics`).json<any>(),
  });

  // Find active reel metadata
  const activeReel = useMemo(() => {
    if (!reels) return null;
    return reels.find((r) => r.id === postId);
  }, [reels, postId]);

  // Review Queue logic (Tinder swipe)
  const pendingReviewItems = useMemo(() => {
    return assignments?.filter((a) => a.status === "PENDING_REVIEW") || [];
  }, [assignments]);

  const [reviewIndex, setReviewIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | "down" | null>(null);

  // Progressive Add Product state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addMode, setAddMode] = useState<"store" | "photo" | "manual">("store");
  const [selectedType, setSelectedType] = useState<"FEATURED" | "SIMILAR">("FEATURED");

  // Form States
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

  // iOS Toggle States
  const [allowComments, setAllowComments] = useState(true);
  const [allowReposts, setAllowReposts] = useState(true);
  const [allowRemixes, setAllowRemixes] = useState(false);
  const [allowProductDetection, setAllowProductDetection] = useState(true);
  const [allowRecommendations, setAllowRecommendations] = useState(true);

  useEffect(() => {
    if (reviewIndex >= pendingReviewItems.length) {
      setReviewIndex(0);
    }
  }, [pendingReviewItems.length, reviewIndex]);

  // Actions mutation
  const actionMutation = useMutation({
    mutationFn: (body: any) =>
      kyInstance.post("/api/creator/products", { json: { ...body, postId } }).json<any>(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creator-reel-products", postId] });
      queryClient.invalidateQueries({ queryKey: ["creator-reel-analytics", postId] });
      queryClient.invalidateQueries({ queryKey: ["creator-reels"] });
      refetchAssignments();
      refetchAnalytics();
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        description: err.message || "Action failed.",
      });
    },
  });

  // Tinder Swipe Handler
  const handleSwipe = (action: "approve" | "reject" | "skip", assignmentId: string) => {
    setSwipeDirection(action === "approve" ? "right" : action === "reject" ? "left" : "down");
    
    setTimeout(() => {
      if (action === "approve") {
        actionMutation.mutate({
          action: "approve",
          assignmentIds: [assignmentId],
        }, {
          onSuccess: () => {
            toast({ description: "Product match approved!" });
          }
        });
      } else if (action === "reject") {
        actionMutation.mutate({
          action: "reject",
          assignmentIds: [assignmentId],
          reviewReason: "Triage swipe reject",
        }, {
          onSuccess: () => {
            toast({ description: "Product match removed." });
          }
        });
      } else {
        toast({ description: "Skipped for later." });
      }

      setReviewIndex((prev) => (prev < pendingReviewItems.length - 1 ? prev + 1 : 0));
      setSwipeDirection(null);
    }, 300);
  };

  // URL Auto-Fill Scraper
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
          description: "Details auto-extracted!",
        });
      } else {
        toast({
          variant: "destructive",
          description: "Extraction failed. Enter details manually.",
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

  // Photo Upload Simulation
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormImage(reader.result as string);
        toast({ description: "Image preview generated!" });
      };
      reader.readAsDataURL(file);
    }
  };

  // Assign Product Form Submit
  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formCategory) {
      toast({
        variant: "destructive",
        description: "Name and Category are required.",
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
      productType: selectedType,
      productSource: "MANUAL",
    }, {
      onSuccess: () => {
        toast({
          description: "Product successfully assigned to reel!",
        });
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

  // Assignment modifications
  const toggleAssignmentType = (assignment: any) => {
    const newType = assignment.productType === "FEATURED" ? "SIMILAR" : "FEATURED";
    actionMutation.mutate({
      action: "update",
      assignmentId: assignment.id,
      productId: assignment.productId,
      productType: newType,
    }, {
      onSuccess: () => {
        toast({ description: `Moved to ${newType.toLowerCase()} list.` });
      }
    });
  };

  const handleHideAssignment = (assignmentId: string) => {
    actionMutation.mutate({
      action: "reject",
      assignmentIds: [assignmentId],
      reviewReason: "Hidden by creator",
    }, {
      onSuccess: () => {
        toast({ description: "Product hidden from public view." });
      }
    });
  };

  const handleDeleteAssignment = (assignmentId: string) => {
    actionMutation.mutate({
      action: "delete",
      assignmentIds: [assignmentId],
    }, {
      onSuccess: () => {
        toast({ description: "Assignment deleted." });
      }
    });
  };

  // Group verified assignments
  const featuredAssignments = useMemo(() => {
    return assignments?.filter((a) => a.status === "PUBLISHED" && a.productType === "FEATURED") || [];
  }, [assignments]);

  const similarAssignments = useMemo(() => {
    return assignments?.filter((a) => a.status === "PUBLISHED" && a.productType === "SIMILAR") || [];
  }, [assignments]);

  if (loadingReels || loadingAssignments || loadingAnalytics) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
        <Loader2 className="size-5 animate-spin text-[#A1A1AA]" strokeWidth={1.75} />
      </div>
    );
  }

  const currentReview = pendingReviewItems[reviewIndex];

  return (
    <div className="w-full min-h-screen bg-black text-white font-sans pb-24">
      {/* 1. Header */}
      <div className="px-4 pt-6 pb-4 border-b border-[#1A1A1A] sticky top-0 bg-black/95 backdrop-blur z-20 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => router.push("/creator")} className="text-[#A1A1AA] hover:text-white transition p-1 shrink-0">
            <ArrowLeft className="size-5" strokeWidth={1.75} />
          </button>
          
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-10 w-10 rounded-lg bg-zinc-900 border border-[#1A1A1A] overflow-hidden shrink-0">
              {activeReel?.videoUrl ? (
                <video src={activeReel.videoUrl} className="w-full h-full object-cover" muted />
              ) : (
                <div className="w-full h-full bg-zinc-900" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-white truncate max-w-[200px]" title={activeReel?.caption}>
                {activeReel?.caption || "Active Reel"}
              </h1>
              <span className="text-[12px] text-[#A1A1AA] block uppercase tracking-wider font-semibold">
                Reel Workspace
              </span>
            </div>
          </div>
        </div>

        <span className="px-2.5 py-0.5 rounded-full text-[12px] font-semibold bg-[#111111] border border-[#1A1A1A] text-white">
          {(activeReel?.status || "None").toLowerCase()}
        </span>
      </div>

      <div className="max-w-[600px] mx-auto px-4 mt-6 space-y-8">
        {/* 2. Reel Preview and Details */}
        <div className="flex flex-col gap-4">
          <div className="aspect-[9/16] w-full max-w-[320px] mx-auto rounded-xl overflow-hidden bg-zinc-950 border border-[#1A1A1A] shadow-xl relative">
            {activeReel?.videoUrl ? (
              <video src={activeReel.videoUrl} controls className="w-full h-full object-cover" muted />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#71717A] text-sm">No media</div>
            )}
          </div>

          <div className="space-y-1 mt-2 text-center md:text-left">
            <p className="text-sm text-[#A1A1AA] leading-relaxed italic">
              &ldquo;{activeReel?.caption || "No description."}&rdquo;
            </p>
          </div>
        </div>

        {/* 3. Review Queue (Tinder Swipe) */}
        {pendingReviewItems.length > 0 && currentReview && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-semibold text-white">Review Queue</h3>
              <span className="text-xs font-semibold text-[#A1A1AA]">
                {reviewIndex + 1} of {pendingReviewItems.length} suggested
              </span>
            </div>

            <div className="relative h-[340px] w-full flex items-center justify-center">
              <div
                className={cn(
                  "w-full max-w-[320px] bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl overflow-hidden shadow-2xl transform transition-all duration-300 ease-out flex flex-col h-full select-none",
                  swipeDirection === "right" && "translate-x-[150%] rotate-[12deg] opacity-0 scale-95",
                  swipeDirection === "left" && "-translate-x-[150%] rotate-[-12deg] opacity-0 scale-95",
                  swipeDirection === "down" && "translate-y-[150%] opacity-0 scale-95",
                  !swipeDirection && "translate-x-0 rotate-0 opacity-100 scale-100"
                )}
              >
                {/* Product Image */}
                <div className="flex-1 bg-black relative overflow-hidden border-b border-[#1A1A1A]">
                  <img
                    src={currentReview.product.thumbnailUrl || currentReview.product.sourceFrameUrl || "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&auto=format&fit=crop&q=80"}
                    alt={currentReview.product.label}
                    className="w-full h-full object-contain"
                  />
                  {/* Swipe overlays */}
                  {swipeDirection === "right" && (
                    <div className="absolute inset-0 bg-[#22C55E]/10 border-4 border-[#22C55E] rounded-2xl flex items-center justify-center z-10">
                      <span className="text-2xl font-semibold text-[#22C55E] uppercase tracking-wider rotate-[-12deg]">APPROVE</span>
                    </div>
                  )}
                  {swipeDirection === "left" && (
                    <div className="absolute inset-0 bg-[#EF4444]/10 border-4 border-[#EF4444] rounded-2xl flex items-center justify-center z-10">
                      <span className="text-2xl font-semibold text-[#EF4444] uppercase tracking-wider rotate-[12deg]">REMOVE</span>
                    </div>
                  )}
                  {swipeDirection === "down" && (
                    <div className="absolute inset-0 bg-zinc-800/10 border-4 border-zinc-500 rounded-2xl flex items-center justify-center z-10">
                      <span className="text-2xl font-semibold text-zinc-400 uppercase tracking-wider">LATER</span>
                    </div>
                  )}
                </div>

                {/* Product details */}
                <div className="p-4 space-y-1 shrink-0 bg-[#0A0A0A]">
                  <h4 className="text-sm font-semibold text-white capitalize truncate">
                    {currentReview.product.label}
                  </h4>
                  <div className="flex justify-between items-center text-xs text-[#A1A1AA]">
                    <span>{currentReview.product.brand || "Independent"}</span>
                    <span className="font-semibold text-white">
                      {currentReview.product.matches?.[0]?.price || "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Gesture Buttons */}
            <div className="flex justify-center items-center gap-4 py-2">
              <button
                onClick={() => handleSwipe("reject", currentReview.id)}
                className="w-12 h-12 rounded-full bg-[#0A0A0A] border border-[#1A1A1A] hover:bg-[#111111] text-[#EF4444] flex items-center justify-center transition active:scale-90"
                title="Remove"
              >
                <X className="size-5" strokeWidth={1.75} />
              </button>
              
              <button
                onClick={() => handleSwipe("skip", currentReview.id)}
                className="w-10 h-10 rounded-full bg-[#0A0A0A] border border-[#1A1A1A] hover:bg-[#111111] text-[#A1A1AA] flex items-center justify-center transition active:scale-90"
                title="Later"
              >
                <RefreshCw className="size-4" strokeWidth={1.75} />
              </button>

              <button
                onClick={() => handleSwipe("approve", currentReview.id)}
                className="w-12 h-12 rounded-full bg-[#0A0A0A] border border-[#1A1A1A] hover:bg-[#111111] text-[#22C55E] flex items-center justify-center transition active:scale-90"
                title="Approve"
              >
                <Check className="size-5" strokeWidth={1.75} />
              </button>
            </div>
          </div>
        )}

        {/* 4. Add Product Block */}
        <div className="space-y-4 pt-2">
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full h-10 rounded-lg bg-white hover:bg-zinc-200 text-black font-semibold text-sm flex items-center justify-center gap-2 transition"
            >
              <Plus className="size-5" strokeWidth={1.75} />
              <span>Add Product</span>
            </button>
          ) : (
            <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#1A1A1A] pb-3">
                <span className="text-sm font-semibold text-white uppercase tracking-wider">Add Product Assignment</span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-[#A1A1AA] hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>

              {/* Source selection */}
              <div className="grid grid-cols-3 gap-2">
                {(["store", "photo", "manual"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setAddMode(mode)}
                    className={cn(
                      "py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition border",
                      addMode === mode
                        ? "bg-white text-black border-transparent"
                        : "bg-black text-[#A1A1AA] border-[#1A1A1A] hover:border-[#71717A]"
                    )}
                  >
                    {mode === "store" ? "Store Link" : mode === "photo" ? "Upload Photo" : "Manually"}
                  </button>
                ))}
              </div>

              {/* Classification Type Selection */}
              <div className="flex items-center gap-4 text-xs font-semibold py-1">
                <span className="text-[#A1A1AA] uppercase tracking-wider">Type:</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={selectedType === "FEATURED"}
                    onChange={() => setSelectedType("FEATURED")}
                    className="accent-white size-4 cursor-pointer"
                  />
                  <span>Featured</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={selectedType === "SIMILAR"}
                    onChange={() => setSelectedType("SIMILAR")}
                    className="accent-white size-4 cursor-pointer"
                  />
                  <span>Similar</span>
                </label>
              </div>

              {/* Store Link input extraction */}
              {addMode === "store" && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[12px] font-semibold text-[#A1A1AA] uppercase tracking-wider block">Paste Product Link</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          placeholder="Amazon, Myntra, Ajio, Nykaa link..."
                          value={extractUrl}
                          onChange={(e) => setExtractUrl(e.target.value)}
                          className="bg-black border border-[#1A1A1A] text-white rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-[#71717A]"
                        />
                        <LinkIcon className="absolute right-3 top-2.5 size-4 text-[#71717A]" strokeWidth={1.75} />
                      </div>
                      <button
                        type="button"
                        onClick={handleUrlExtract}
                        disabled={isExtracting || !extractUrl}
                        className="h-10 px-4 rounded-lg text-xs font-semibold uppercase bg-[#111111] hover:bg-[#1A1A1A] border border-[#1A1A1A] text-white transition disabled:opacity-50 shrink-0"
                      >
                        {isExtracting ? <Loader2 className="size-4 animate-spin" /> : "Fill"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Photo upload inputs */}
              {addMode === "photo" && (
                <div className="space-y-3">
                  <label className="text-[12px] font-semibold text-[#A1A1AA] uppercase tracking-wider block">Upload Product Photo</label>
                  <div className="border border-dashed border-[#1A1A1A] rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-[#71717A] bg-black relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    {formImage ? (
                      <img src={formImage} className="h-28 w-28 object-contain rounded-lg" alt="" />
                    ) : (
                      <>
                        <ImageIcon className="size-8 text-[#71717A] mb-2" strokeWidth={1.75} />
                        <span className="text-xs text-[#A1A1AA]">Drag & drop or tap to select image</span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Common Manual Fields for inputs */}
              {(addMode === "photo" || addMode === "manual" || (addMode === "store" && formName)) && (
                <form onSubmit={handleProductSubmit} className="space-y-3 animate-in fade-in duration-200">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[12px] font-semibold text-[#A1A1AA] uppercase tracking-wider block">Product Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="Nike Running Shoe"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className="bg-black border border-[#1A1A1A] text-white rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-[#71717A]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[12px] font-semibold text-[#A1A1AA] uppercase tracking-wider block">Category *</label>
                      <input
                        type="text"
                        required
                        placeholder="Sneakers"
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value)}
                        className="bg-black border border-[#1A1A1A] text-white rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-[#71717A]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[12px] font-semibold text-[#A1A1AA] uppercase tracking-wider block">Brand</label>
                      <input
                        type="text"
                        placeholder="Nike"
                        value={formBrand}
                        onChange={(e) => setFormBrand(e.target.value)}
                        className="bg-black border border-[#1A1A1A] text-white rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-[#71717A]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[12px] font-semibold text-[#A1A1AA] uppercase tracking-wider block">Price</label>
                      <input
                        type="text"
                        placeholder="₹4,999"
                        value={formPrice}
                        onChange={(e) => setFormPrice(e.target.value)}
                        className="bg-black border border-[#1A1A1A] text-white rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-[#71717A]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[12px] font-semibold text-[#A1A1AA] uppercase tracking-wider block">Retailer Link URL</label>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={formRetailerUrl}
                      onChange={(e) => setFormRetailerUrl(e.target.value)}
                      className="bg-black border border-[#1A1A1A] text-white rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-[#71717A]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={actionMutation.isPending}
                    className="w-full h-10 rounded-lg bg-white hover:bg-zinc-200 text-black font-semibold text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
                  >
                    Assign to Reel
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* 5. Featured Products List */}
        <div className="space-y-3 pt-2">
          <h3 className="text-base font-semibold text-white">Featured Products</h3>
          {featuredAssignments.length === 0 ? (
            <p className="text-xs text-[#A1A1AA] py-4 text-center border border-[#1A1A1A] rounded-xl bg-[#0A0A0A]">
              No featured products tagged.
            </p>
          ) : (
            <div className="space-y-2">
              {featuredAssignments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 bg-[#0A0A0A] border border-[#1A1A1A] p-3 rounded-xl justify-between group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={a.product.thumbnailUrl || "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=100"}
                      className="h-12 w-12 rounded bg-black object-contain border border-[#1A1A1A] shrink-0"
                      alt=""
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-white truncate max-w-[180px]">
                        {a.product.label}
                      </h4>
                      <span className="text-[12px] text-[#A1A1AA] block">
                        {a.product.matches?.[0]?.price || "No Price"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => toggleAssignmentType(a)}
                      className="px-2.5 py-1 bg-[#111111] hover:bg-[#1A1A1A] border border-[#1A1A1A] text-white text-[12px] font-semibold rounded"
                    >
                      Make Similar
                    </button>
                    <button
                      onClick={() => handleHideAssignment(a.id)}
                      className="p-1.5 bg-[#111111] hover:bg-[#1A1A1A] border border-[#1A1A1A] text-[#A1A1AA] hover:text-white rounded"
                      title="Hide"
                    >
                      <X className="size-4" strokeWidth={1.75} />
                    </button>
                    <button
                      onClick={() => handleDeleteAssignment(a.id)}
                      className="p-1.5 bg-[#111111] hover:bg-[#1A1A1A] border border-[#1A1A1A] text-[#EF4444] rounded"
                      title="Delete"
                    >
                      <Trash2 className="size-4" strokeWidth={1.75} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 6. Similar Products List */}
        <div className="space-y-3 pt-2">
          <h3 className="text-base font-semibold text-white">Similar Products</h3>
          {similarAssignments.length === 0 ? (
            <p className="text-xs text-[#A1A1AA] py-4 text-center border border-[#1A1A1A] rounded-xl bg-[#0A0A0A]">
              No alternative products tagged.
            </p>
          ) : (
            <div className="space-y-2">
              {similarAssignments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 bg-[#0A0A0A] border border-[#1A1A1A] p-3 rounded-xl justify-between group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={a.product.thumbnailUrl || "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=100"}
                      className="h-12 w-12 rounded bg-black object-contain border border-[#1A1A1A] shrink-0"
                      alt=""
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-white truncate max-w-[180px]">
                        {a.product.label}
                      </h4>
                      <span className="text-[12px] text-[#A1A1AA] block">
                        {a.product.matches?.[0]?.price || "No Price"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => toggleAssignmentType(a)}
                      className="px-2.5 py-1 bg-[#111111] hover:bg-[#1A1A1A] border border-[#1A1A1A] text-white text-[12px] font-semibold rounded"
                    >
                      Make Featured
                    </button>
                    <button
                      onClick={() => handleHideAssignment(a.id)}
                      className="p-1.5 bg-[#111111] hover:bg-[#1A1A1A] border border-[#1A1A1A] text-[#A1A1AA] hover:text-white rounded"
                      title="Hide"
                    >
                      <X className="size-4" strokeWidth={1.75} />
                    </button>
                    <button
                      onClick={() => handleDeleteAssignment(a.id)}
                      className="p-1.5 bg-[#111111] hover:bg-[#1A1A1A] border border-[#1A1A1A] text-[#EF4444] rounded"
                      title="Delete"
                    >
                      <Trash2 className="size-4" strokeWidth={1.75} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 7. Insights / Performance */}
        <div className="space-y-4 pt-2">
          <h3 className="text-base font-semibold text-white">Insights</h3>
          <div className="grid grid-cols-2 gap-3 border-t border-[#1A1A1A] pt-4">
            <div className="flex flex-col py-2 border-b border-[#1A1A1A]/60">
              <span className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">Total Views</span>
              <span className="text-2xl font-semibold text-white leading-tight mt-1">
                {(analytics?.reelStats?.views ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="flex flex-col py-2 border-b border-[#1A1A1A]/60">
              <span className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">Drawer Opens</span>
              <span className="text-2xl font-semibold text-white leading-tight mt-1">
                {(analytics?.reelStats?.opens ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="flex flex-col py-2 border-b border-[#1A1A1A]/60">
              <span className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">Product Clicks</span>
              <span className="text-2xl font-semibold text-white leading-tight mt-1">
                {(analytics?.reelStats?.productClicks ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="flex flex-col py-2 border-b border-[#1A1A1A]/60">
              <span className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">Retailer Clicks</span>
              <span className="text-2xl font-semibold text-white leading-tight mt-1">
                {(analytics?.reelStats?.retailerClicks ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="flex flex-col py-2 border-b border-[#1A1A1A]/60 col-span-2">
              <span className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">Conversion CTR</span>
              <span className="text-2xl font-semibold text-[#22C55E] leading-tight mt-1">
                {((analytics?.reelStats?.productCtr ?? 0) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* 8. Reel Settings */}
        <div className="space-y-4 pt-2">
          <h3 className="text-base font-semibold text-white">Settings</h3>
          <div className="flex flex-col divide-y divide-[#1A1A1A] border-t border-[#1A1A1A]">
            <div className="flex items-center justify-between py-3">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-white">Allow Comments</span>
                <span className="text-[12px] text-[#A1A1AA]">Let viewers write reviews on this Reel</span>
              </div>
              <IosSwitch checked={allowComments} onChange={setAllowComments} />
            </div>

            <div className="flex items-center justify-between py-3">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-white">Allow Reposts</span>
                <span className="text-[12px] text-[#A1A1AA]">Allow users to share this Reel on their feeds</span>
              </div>
              <IosSwitch checked={allowReposts} onChange={setAllowReposts} />
            </div>

            <div className="flex items-center justify-between py-3">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-white">Allow Remixes</span>
                <span className="text-[12px] text-[#A1A1AA]">Let creators reuse this audio track</span>
              </div>
              <IosSwitch checked={allowRemixes} onChange={setAllowRemixes} />
            </div>

            <div className="flex items-center justify-between py-3">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-white">Allow Product Detection</span>
                <span className="text-[12px] text-[#A1A1AA]">Scan video automatically to detect items</span>
              </div>
              <IosSwitch checked={allowProductDetection} onChange={setAllowProductDetection} />
            </div>

            <div className="flex items-center justify-between py-3">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-white">Allow Recommendations</span>
                <span className="text-[12px] text-[#A1A1AA]">Show similar matches to increase affiliate commissions</span>
              </div>
              <IosSwitch checked={allowRecommendations} onChange={setAllowRecommendations} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function IosSwitch({ checked, onChange }: { checked: boolean; onChange: (val: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => {
        onChange(!checked);
      }}
      className={cn(
        "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
        checked ? "bg-white" : "bg-[#1A1A1A]"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}
