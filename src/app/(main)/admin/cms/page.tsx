"use client";

import React, { useState, useEffect } from "react";
import { Image, Layers, RefreshCw, Eye, EyeOff, ArrowUp, ArrowDown, ExternalLink } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface SectionItem {
  id: string;
  type: string;
  title: string;
  order: number;
  visible: boolean;
}

interface BannerItem {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  ctaText?: string;
  ctaLink?: string;
  active: boolean;
  order: number;
}

export default function AdminCmsPage() {
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadCmsData = async () => {
    setIsLoading(true);
    try {
      const [secRes, banRes] = await Promise.all([
        fetch("/api/shop/cms/sections"),
        fetch("/api/shop/banners")
      ]);
      const secData = await secRes.json();
      const banData = await banRes.json();
      // Ensure we sort sections by order field
      const sortedSecs = (secData.sections || []).sort((a: any, b: any) => a.order - b.order);
      const sortedBans = (banData.banners || []).sort((a: any, b: any) => a.order - b.order);
      setSections(sortedSecs);
      setBanners(sortedBans);
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        description: "Failed to load homepage CMS layout data.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCmsData();
  }, []);

  const handleToggleSectionVisibility = async (secId: string, currentVisible: boolean) => {
    try {
      const res = await fetch(`/api/admin/cms/sections/${secId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visible: !currentVisible })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      toast({
        description: `Section visibility toggled!`,
      });

      setSections(prev => 
        prev.map(s => s.id === secId ? { ...s, visible: !currentVisible } : s)
      );
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        description: err.message || "Failed to update visibility.",
      });
    }
  };

  const handleToggleBannerActive = async (banId: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/cms/banners/${banId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !currentActive })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      toast({
        description: `Banner status toggled!`,
      });

      setBanners(prev => 
        prev.map(b => b.id === banId ? { ...b, active: !currentActive } : b)
      );
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        description: err.message || "Failed to update banner status.",
      });
    }
  };

  const moveSection = async (index: number, direction: "up" | "down") => {
    const newSections = [...sections];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newSections.length) return;

    // Swap locally
    const temp = newSections[index];
    newSections[index] = newSections[targetIndex];
    newSections[targetIndex] = temp;

    // Reassign orders
    newSections.forEach((s, idx) => {
      s.order = idx + 1;
    });

    setSections(newSections);

    try {
      // Sync swapped sections to DB
      await Promise.all([
        fetch(`/api/admin/cms/sections/${newSections[index].id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: newSections[index].order })
        }),
        fetch(`/api/admin/cms/sections/${newSections[targetIndex].id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: newSections[targetIndex].order })
        })
      ]);

      toast({
        description: "Homepage layout order saved successfully!",
      });
    } catch (err) {
      console.error("Failed to save reorder", err);
      toast({
        variant: "destructive",
        description: "Failed to persist new layout order to database.",
      });
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight uppercase font-sans">Banners & Layout CMS</h1>
          <p className="text-xs text-zinc-400 mt-1">Configure promotional marketing sliders and dynamically reorder shop homepage components.</p>
        </div>
        <button 
          onClick={loadCmsData}
          className="p-2.5 bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-zinc-350 hover:text-white rounded-xl cursor-pointer transition-colors"
        >
          <RefreshCw className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Layout Order Editor */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xs font-black text-white uppercase tracking-widest pb-3 border-b border-zinc-800 flex items-center gap-2">
            <Layers className="size-4 text-indigo-400" /> Homepage Grid Sections
          </h2>
          <div className="bg-zinc-900/20 border border-zinc-850 rounded-[20px] divide-y divide-zinc-850/60 overflow-hidden">
            {isLoading ? (
              <div className="py-20 text-center text-zinc-500 animate-pulse text-xs">Loading sections layout...</div>
            ) : sections.length === 0 ? (
              <div className="py-20 text-center text-zinc-650 italic text-xs">No homepage sections registered.</div>
            ) : (
              sections.map((sec, idx) => (
                <div key={sec.id} className="p-4 flex items-center justify-between gap-4 bg-zinc-950/10 hover:bg-zinc-900/10 transition-colors">
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-mono text-zinc-500 bg-zinc-950 px-2 py-0.5 border border-zinc-850 rounded">
                      Order {sec.order}
                    </span>
                    <div>
                      <p className="font-bold text-zinc-200 text-xs">{sec.title}</p>
                      <p className="text-[9px] text-zinc-550 font-bold mt-0.5 uppercase tracking-wider text-indigo-400">{sec.type.replace("_", " ")}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleToggleSectionVisibility(sec.id, sec.visible)}
                      className={cn(
                        "p-1.5 border rounded-lg cursor-pointer transition-colors",
                        sec.visible 
                          ? "bg-emerald-950/20 border-emerald-500/20 text-emerald-400 hover:bg-emerald-900/20" 
                          : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:bg-zinc-800"
                      )}
                      title={sec.visible ? "Hide Section" : "Show Section"}
                    >
                      {sec.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                    </button>

                    <button
                      onClick={() => moveSection(idx, "up")}
                      disabled={idx === 0}
                      className={cn(
                        "p-1.5 bg-zinc-900 border border-zinc-800 text-zinc-450 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors",
                        idx === 0 && "opacity-30 cursor-not-allowed hover:bg-zinc-900 hover:text-zinc-450"
                      )}
                    >
                      <ArrowUp className="size-3.5" />
                    </button>

                    <button
                      onClick={() => moveSection(idx, "down")}
                      disabled={idx === sections.length - 1}
                      className={cn(
                        "p-1.5 bg-zinc-900 border border-zinc-800 text-zinc-450 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors",
                        idx === sections.length - 1 && "opacity-30 cursor-not-allowed hover:bg-zinc-900 hover:text-zinc-450"
                      )}
                    >
                      <ArrowDown className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Promo Banners Editor */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-xs font-black text-white uppercase tracking-widest pb-3 border-b border-zinc-800 flex items-center gap-2">
            <Image className="size-4 text-indigo-400" /> Active Banners Carousel
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {isLoading ? (
              <div className="py-12 text-center text-zinc-500 animate-pulse text-xs">Loading banners...</div>
            ) : banners.length === 0 ? (
              <div className="py-12 text-center text-zinc-650 italic text-xs">No banners registered.</div>
            ) : (
              banners.map((ban) => (
                <div key={ban.id} className="bg-zinc-900/20 border border-zinc-850 p-4 rounded-xl space-y-3">
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-200 line-clamp-1">{ban.title}</h4>
                      <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-1">{ban.subtitle || "No description."}</p>
                    </div>
                    <button
                      onClick={() => handleToggleBannerActive(ban.id, ban.active)}
                      className={cn(
                        "text-[9px] uppercase font-black px-2 py-0.5 rounded border transition-colors cursor-pointer",
                        ban.active 
                          ? "bg-emerald-950/20 border-emerald-500/20 text-emerald-400 hover:bg-emerald-900/20" 
                          : "bg-zinc-950 border-zinc-850 text-zinc-500 hover:bg-zinc-900"
                      )}
                    >
                      {ban.active ? "Active" : "Inactive"}
                    </button>
                  </div>

                  {ban.ctaLink && (
                    <a 
                      href={ban.ctaLink} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-[9px] font-bold text-zinc-450 hover:text-white flex items-center gap-1 mt-2.5 w-fit hover:underline"
                    >
                      <ExternalLink className="size-3" /> Visit Promo Link
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
