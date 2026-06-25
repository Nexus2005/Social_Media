"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Check, Camera, Loader2, Image as ImageIcon, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LocalMediaAsset {
  id: string;
  uri: string;
  mediaType: "IMAGE" | "VIDEO";
  dateAdded: number;
  bucketDisplayName: string;
  file?: File;
}

// Persistent session cache to simulate native background MediaStore/gallery query inline
let sessionGalleryAssets: LocalMediaAsset[] = [];

interface GalleryPickerProps {
  onClose: () => void;
  onSelectImages: (files: File[]) => void;
  onOpenCamera: () => void;
}

export default function GalleryPicker({ onClose, onSelectImages, onOpenCamera }: GalleryPickerProps) {
  const [galleryAssets, setGalleryAssets] = useState<LocalMediaAsset[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<LocalMediaAsset[]>([]);
  const [activeAlbum, setActiveAlbum] = useState<string>("Recent");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [galleryPermission, setGalleryPermission] = useState<"prompt" | "all" | "limited" | "denied">("limited");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAllowAll = () => {
    setGalleryPermission("all");
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 100);
  };

  // Load assets on mount (checks native bridge or session cache)
  useEffect(() => {
    const loadAssets = async () => {
      // 1. Check for injected Android MediaStore bridge
      if (typeof window !== "undefined" && (window as any).AndroidMediaStoreBridge) {
        try {
          const nativeData = await (window as any).AndroidMediaStoreBridge.queryMedia();
          const parsed = JSON.parse(nativeData) as LocalMediaAsset[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            setGalleryAssets(parsed);
            return;
          }
        } catch (e) {
          console.error("Native MediaStore bridge query failed:", e);
        }
      }

      // 2. Otherwise load session-stored media assets
      setGalleryAssets(sessionGalleryAssets);
    };

    loadAssets();
  }, []);

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newAssets: LocalMediaAsset[] = files
      .filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"))
      .map((file) => {
        // Dynamic classification based on file names or directory
        let bucketDisplayName = "Camera";
        const name = file.name.toLowerCase();
        
        if (name.includes("screenshot")) {
          bucketDisplayName = "Screenshots";
        } else if (name.includes("instagram") || name.includes("insta") || name.includes("ig_")) {
          bucketDisplayName = "Instagram";
        } else if (name.includes("whatsapp")) {
          bucketDisplayName = "WhatsApp";
        }

        return {
          id: Math.random().toString(),
          uri: URL.createObjectURL(file),
          mediaType: file.type.startsWith("video/") ? ("VIDEO" as const) : ("IMAGE" as const),
          dateAdded: file.lastModified || Date.now(),
          bucketDisplayName,
          file,
        };
      });

    if (newAssets.length === 0) return;

    // Append to global array and component state
    sessionGalleryAssets = [...newAssets, ...sessionGalleryAssets];
    setGalleryAssets(sessionGalleryAssets);

    // Auto-select newly imported assets
    setSelectedAssets((prev) => [...prev, ...newAssets]);

    // Reset input value
    e.target.value = "";
  };

  const handleToggleSelect = (item: LocalMediaAsset) => {
    const isSel = selectedAssets.some((s) => s.id === item.id);
    if (isSel) {
      setSelectedAssets(selectedAssets.filter((s) => s.id !== item.id));
    } else {
      if (selectedAssets.length >= 10) return;
      setSelectedAssets([...selectedAssets, item]);
    }
  };

  const handleRequestMoreFiles = () => {
    fileInputRef.current?.click();
  };

  const handleDone = async () => {
    if (selectedAssets.length === 0) {
      onClose();
      return;
    }

    try {
      setIsProcessing(true);
      // Retrieve raw files. If it's a native asset with only URI, fetch/convert it (or pass files directly)
      const files: File[] = [];
      
      for (const asset of selectedAssets) {
        if (asset.file) {
          files.push(asset.file);
        } else {
          // If no raw file, it's a native bridge file: fetch the blob and create a File object
          try {
            const res = await fetch(asset.uri);
            const blob = await res.blob();
            const filename = asset.uri.split("/").pop() || `native_file_${asset.id}.jpg`;
            const file = new File([blob], filename, { type: blob.type });
            files.push(file);
          } catch (err) {
            console.error("Failed to fetch native file blob:", err);
          }
        }
      }

      onSelectImages(files);
      onClose();
    } catch (e) {
      console.error("Failed to process selected gallery assets:", e);
    } finally {
      setIsProcessing(false);
    }
  };

  // Group unique albums based on BUCKET_DISPLAY_NAME
  const uniqueAlbums = Array.from(
    new Set(galleryAssets.map((asset) => asset.bucketDisplayName))
  ).filter(Boolean);

  // Filter assets based on active album
  const filteredAssets = activeAlbum === "Recent"
    ? galleryAssets
    : galleryAssets.filter((asset) => asset.bucketDisplayName === activeAlbum);

  // Sort by dateAdded DESC (newest first)
  const sortedAssets = [...filteredAssets].sort((a, b) => b.dateAdded - a.dateAdded);

  return (
    <div className="flex-grow flex flex-col bg-black text-white select-none font-sans h-full relative">
      {/* Hidden native file input */}
      <input
        type="file"
        accept="image/*, video/*"
        multiple
        ref={fileInputRef}
        className="sr-only hidden"
        onChange={handleFilesSelected}
      />

      {/* Processing overlay */}
      {isProcessing && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-3">
          <Loader2 className="size-6 animate-spin text-white" />
          <span className="text-sm font-semibold tracking-wide">Uploading selected media...</span>
        </div>
      )}

      {/* Header Row */}
      <div className="flex justify-between items-center px-4 py-3 border-b border-[#1A1A1A] bg-black flex-shrink-0 z-25">
        <button
          type="button"
          onClick={onClose}
          className="p-1 hover:bg-[#121212] rounded-full text-zinc-400 hover:text-white transition-colors"
        >
          <X className="size-6" />
        </button>

        {/* Dynamic Folders Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-1.5 font-bold text-[17px] text-white px-3.5 py-1.5 hover:bg-[#121212] rounded-full transition-colors active:scale-95"
          >
            <span>{activeAlbum}</span>
            <ChevronDown className={cn("size-4 text-zinc-400 transition-transform duration-200", isDropdownOpen && "rotate-180")} />
          </button>

          {isDropdownOpen && (
            <>
              {/* Click outside backdrop for dropdown */}
              <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
              
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl shadow-2xl py-2 z-50 animate-slide-up">
                <button
                  type="button"
                  onClick={() => {
                    setActiveAlbum("Recent");
                    setIsDropdownOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-white/[0.03]",
                    activeAlbum === "Recent" ? "text-sky-500" : "text-white"
                  )}
                >
                  Recent
                </button>
                {uniqueAlbums.map((album) => (
                  <button
                    key={album}
                    type="button"
                    onClick={() => {
                      setActiveAlbum(album);
                      setIsDropdownOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-white/[0.03]",
                      activeAlbum === album ? "text-sky-500" : "text-white"
                    )}
                  >
                    {album}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={handleDone}
          className={cn(
            "text-[15px] font-bold transition-all px-3 py-1 rounded-full",
            selectedAssets.length > 0
              ? "text-black bg-white hover:bg-zinc-200"
              : "text-zinc-500 cursor-not-allowed pointer-events-none"
          )}
        >
          {selectedAssets.length > 0 ? `Done (${selectedAssets.length})` : "Done"}
        </button>
      </div>

      {/* Limited Access Banner */}
      {galleryPermission === "limited" ? (
        <div className="px-4 py-3 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between text-xs text-zinc-300 select-none animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <p className="text-left leading-tight pr-2">Next Social only has access to selected items. Folders may be incomplete.</p>
          </div>
          <button 
            type="button" 
            onClick={handleAllowAll} 
            className="bg-white text-black px-3 py-1.5 rounded-full font-medium hover:bg-zinc-200 transition text-[10px] shrink-0 active:scale-95"
          >
            Allow All
          </button>
        </div>
      ) : (
        galleryAssets.length > 0 && (
          <div className="px-4 py-2.5 bg-[#0D0D0D] border-b border-[#1A1A1A] flex items-center justify-between text-xs text-zinc-400 select-none">
            <span>Viewing selected files & folders</span>
            <button 
              type="button" 
              onClick={handleRequestMoreFiles} 
              className="text-sky-500 hover:text-sky-400 font-bold transition-colors active:opacity-70"
            >
              Manage Access
            </button>
          </div>
        )
      )}

      {/* 3-Column Image Grid */}
      <div className="flex-1 overflow-y-auto scrollbar-none p-1.5">
        <div className="grid grid-cols-3 gap-1.5">
          {/* Slot 1: Camera shortcut tile */}
          <div
            onClick={onOpenCamera}
            className="aspect-square bg-zinc-950 hover:bg-zinc-900 transition-colors border border-zinc-850 rounded-xl flex flex-col items-center justify-center text-[#A1A1AA] cursor-pointer group active:scale-95 transition-all select-none"
          >
            <div className="size-11 rounded-full bg-zinc-900 flex items-center justify-center text-sky-500 border border-zinc-800 shadow-sm group-hover:bg-zinc-850">
              <Camera className="size-5" strokeWidth={2} />
            </div>
            <span className="text-[11px] font-semibold text-zinc-400 mt-2">Camera</span>
          </div>

          {/* Slot 2: Manage/Select More tile (strict/partial permissions access) */}
          <div
            onClick={handleRequestMoreFiles}
            className="aspect-square bg-zinc-950 hover:bg-zinc-900 transition-colors border border-zinc-850 rounded-xl flex flex-col items-center justify-center text-[#A1A1AA] cursor-pointer group active:scale-95 transition-all select-none"
          >
            <div className="size-11 rounded-full bg-zinc-900 flex items-center justify-center text-emerald-500 border border-zinc-800 shadow-sm group-hover:bg-zinc-850">
              <ImageIcon className="size-5" strokeWidth={2} />
            </div>
            <span className="text-[11px] font-semibold text-zinc-400 mt-2">Select More</span>
          </div>

          {/* Media Items */}
          {sortedAssets.map((item) => {
            const isSel = selectedAssets.some((s) => s.id === item.id);
            const selectedMatchIndex = selectedAssets.findIndex((s) => s.id === item.id);
            const selIdx = selectedMatchIndex + 1;
            const isVideo = item.mediaType === "VIDEO";

            return (
              <div
                key={item.id}
                onClick={() => handleToggleSelect(item)}
                className="aspect-square rounded-xl overflow-hidden relative cursor-pointer group border border-zinc-900 bg-zinc-950 active:scale-95 transition-all"
              >
                {isVideo ? (
                  <video
                    src={item.uri}
                    className={cn(
                      "w-full h-full object-cover transition-all duration-300",
                      isSel ? "scale-95 brightness-[0.65]" : "group-hover:scale-105"
                    )}
                    muted
                  />
                ) : (
                  <img
                    src={item.uri}
                    className={cn(
                      "w-full h-full object-cover transition-all duration-300",
                      isSel ? "scale-95 brightness-[0.65]" : "group-hover:scale-105"
                    )}
                    alt={`photo-${item.id}`}
                    loading="lazy"
                  />
                )}

                {/* Numbered selection circle */}
                <div
                  className={cn(
                    "absolute top-2 right-2 size-5 rounded-full border flex items-center justify-center text-[10px] font-bold transition-all shadow-sm z-10",
                    isSel
                      ? "bg-sky-500 border-sky-500 text-white scale-110"
                      : "border-white/50 bg-black/40 text-transparent"
                  )}
                >
                  {isSel ? selIdx : <Check className="size-3 text-transparent" />}
                </div>

                {/* Bucket name tag on hover */}
                <div className="absolute bottom-1 left-1.5 px-1.5 py-0.5 rounded bg-black/60 text-[9px] text-zinc-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  {item.bucketDisplayName}
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty state when no photos have been picked/cached yet */}
        {galleryAssets.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="size-16 rounded-full bg-zinc-900 flex items-center justify-center mb-4 border border-zinc-800">
              <ImageIcon className="size-8 text-zinc-500" strokeWidth={1.5} />
            </div>
            <h4 className="text-base font-bold text-white mb-1">Select photos from your device</h4>
            <p className="text-sm text-zinc-500 max-w-[280px] mb-6 leading-relaxed">
              Click below to grant media access and import photos/videos directly into the inline gallery list.
            </p>
            <button
              type="button"
              onClick={handleRequestMoreFiles}
              className="bg-white hover:bg-zinc-200 text-black font-semibold px-6 py-2.5 rounded-full text-sm transition-colors active:scale-95"
            >
              Grant Access & Select Photos
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
