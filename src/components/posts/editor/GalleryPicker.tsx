"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, ChevronDown, Check, Camera, Loader2, Image as ImageIcon, Lock, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

// Curated high-fidelity Unsplash mock images for gallery folders
const FOLDER_IMAGES: Record<string, string[]> = {
  Recents: [
    "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=500&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1488161628813-04466f872be2?w=500&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=500&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=500&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=500&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=500&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=500&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1472214222541-d510753a4707?w=500&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=500&auto=format&fit=crop&q=80"
  ],
  Screenshots: [
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=500&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1508921912186-1d1a45ebb3c1?w=500&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1600132806370-bf17e65e942f?w=500&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1618401471353-b98aedd07871?w=500&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=500&auto=format&fit=crop&q=80"
  ],
  Camera: [
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=500&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=500&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=500&auto=format&fit=crop&q=80"
  ],
  Downloads: [
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1557683316-973673baf926?w=500&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=500&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=500&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=500&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=500&auto=format&fit=crop&q=80"
  ]
};

interface GalleryItem {
  url: string;
  file?: File; // Present for user-loaded files
}

interface GalleryPickerProps {
  onClose: () => void;
  onSelectImages: (files: File[]) => void;
  onOpenCamera: () => void;
}

export default function GalleryPicker({ onClose, onSelectImages, onOpenCamera }: GalleryPickerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  
  // Real active user folders state
  const [userFolders, setUserFolders] = useState<Record<string, GalleryItem[]>>({});
  const [activeFolder, setActiveFolder] = useState<string>("Recents");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Multi selection states
  const [selectedItems, setSelectedItems] = useState<GalleryItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const directoryInputRef = useRef<HTMLInputElement>(null);

  // Set webkitdirectory attribute safely on mount
  useEffect(() => {
    if (directoryInputRef.current) {
      directoryInputRef.current.setAttribute("webkitdirectory", "true");
      directoryInputRef.current.setAttribute("directory", "");
    }
  }, []);

  // Check stored permission on mount
  useEffect(() => {
    const stored = localStorage.getItem("cartly_gallery_permission");
    if (stored === "granted") {
      setHasPermission(true);
    } else {
      setHasPermission(false);
    }
  }, []);

  const handleGrantPermission = () => {
    localStorage.setItem("cartly_gallery_permission", "granted");
    setHasPermission(true);
  };

  const handleToggleSelect = (item: GalleryItem) => {
    const isSel = selectedItems.some((s) => s.url === item.url);
    if (isSel) {
      setSelectedItems(selectedItems.filter((s) => s.url !== item.url));
    } else {
      if (selectedItems.length >= 10) return; // Maximum upload limit
      setSelectedItems([...selectedItems, item]);
    }
  };

  const handleSelectFromDeviceClick = () => {
    setIsDropdownOpen(false);
    fileInputRef.current?.click();
  };

  const handleImportFolderClick = () => {
    setIsDropdownOpen(false);
    directoryInputRef.current?.click();
  };

  const handleDeviceFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length) {
      onSelectImages(files);
      onClose();
    }
  };

  const handleDirectoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const grouped: Record<string, GalleryItem[]> = {};

    files.forEach((file) => {
      if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) return;

      // Group by folder names parsed from relative path
      const pathParts = file.webkitRelativePath ? file.webkitRelativePath.split("/") : [];
      let folderName = "Recents";
      if (pathParts.length > 2) {
        folderName = pathParts[pathParts.length - 2];
      } else if (pathParts.length === 2) {
        folderName = pathParts[0];
      }

      const item: GalleryItem = {
        url: URL.createObjectURL(file),
        file
      };

      if (!grouped[folderName]) {
        grouped[folderName] = [];
      }
      grouped[folderName].push(item);
    });

    const totalFound = Object.values(grouped).reduce((acc, curr) => acc + curr.length, 0);
    if (totalFound === 0) {
      alert("No image or video files found in the selected folder.");
      return;
    }

    // Update state to use imported local directory folders instead of mock folders
    setUserFolders(grouped);
    setSelectedItems([]); // reset selections
    
    // Default to the first found folder
    const firstFolder = Object.keys(grouped)[0];
    if (firstFolder) {
      setActiveFolder(firstFolder);
    }
  };

  const handleDone = async () => {
    if (selectedItems.length === 0) {
      onClose();
      return;
    }

    try {
      setIsProcessing(true);
      const files: File[] = [];

      for (let i = 0; i < selectedItems.length; i++) {
        const item = selectedItems[i];
        if (item.file) {
          // Real imported file object
          files.push(item.file);
        } else {
          // Fetch and upload mock Unsplash urls
          const res = await fetch(item.url);
          const blob = await res.blob();
          const extension = item.url.includes(".gif") ? "gif" : "jpg";
          const file = new File(
            [blob],
            `gallery_${Date.now()}_${i}.${extension}`,
            { type: blob.type || "image/jpeg" }
          );
          files.push(file);
        }
      }

      onSelectImages(files);
      onClose();
    } catch (e) {
      console.error("Failed to process selected gallery assets", e);
    } finally {
      setIsProcessing(false);
    }
  };

  // If permission state check is not yet loaded
  if (hasPermission === null) {
    return (
      <div className="flex-1 bg-black flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-[#A1A1AA]" />
      </div>
    );
  }

  // 1. Simulated Permission Screen
  if (!hasPermission) {
    return (
      <div className="flex-grow flex flex-col justify-between bg-black text-white p-6 select-none font-sans h-full">
        <div className="flex justify-between items-center py-2 flex-shrink-0">
          <button onClick={onClose} className="p-2 hover:bg-[#121212] rounded-full text-zinc-400 hover:text-white">
            <X className="size-6" />
          </button>
          <span className="font-bold text-[17px]">Gallery Access</span>
          <div className="w-10" />
        </div>

        <div className="flex-grow flex flex-col justify-center items-center text-center px-4 max-w-[400px] mx-auto space-y-6">
          <div className="size-20 rounded-full bg-zinc-900 flex items-center justify-center text-white border border-zinc-800 shadow-md">
            <Lock className="size-10 text-zinc-300" strokeWidth={1.5} />
          </div>
          <div className="space-y-2">
            <h4 className="text-xl font-bold tracking-tight text-white">Cartly Wants to Access Your Photo Library</h4>
            <p className="text-sm text-zinc-400 leading-relaxed">
              This allows you to select, edit, and share photos or videos from your library directly into your posts, stories, and threads.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 pb-6 flex-shrink-0 w-full max-w-[360px] mx-auto">
          <button
            onClick={handleGrantPermission}
            className="w-full bg-white hover:bg-zinc-200 text-black font-semibold py-3 rounded-full text-sm min-h-[44px] transition-colors shadow-sm"
          >
            Allow Access
          </button>
          <button
            onClick={onClose}
            className="w-full bg-transparent hover:bg-[#121212] text-zinc-400 hover:text-white font-semibold py-3 rounded-full text-sm min-h-[44px] transition-colors"
          >
            Not Now
          </button>
        </div>
      </div>
    );
  }

  // 2. Load Gallery Items: real userFolders if imported, else mock FOLDER_IMAGES
  const hasUserFolders = Object.keys(userFolders).length > 0;
  
  let currentImages: GalleryItem[] = [];
  if (hasUserFolders) {
    currentImages = userFolders[activeFolder] || [];
  } else {
    currentImages = (FOLDER_IMAGES[activeFolder] || []).map((url) => ({ url }));
  }

  return (
    <div className="flex-grow flex flex-col bg-black text-white select-none font-sans h-full relative">
      {/* Hidden file input for native device upload option */}
      <input
        type="file"
        accept="image/*, video/*"
        multiple
        ref={fileInputRef}
        className="sr-only hidden"
        onChange={handleDeviceFilesChange}
      />

      {/* Hidden file input for native webkitdirectory folder import option */}
      <input
        type="file"
        ref={directoryInputRef}
        className="sr-only hidden"
        onChange={handleDirectoryChange}
      />

      {/* Processing overlay */}
      {isProcessing && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-3">
          <Loader2 className="size-6 animate-spin text-white" />
          <span className="text-sm font-semibold tracking-wide">Processing local gallery assets...</span>
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

        {/* Folder Select Dropdown Trigger */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-1 font-bold text-[17px] hover:opacity-85 text-white active:scale-95 transition-transform"
          >
            <span>{activeFolder}</span>
            <ChevronDown className="size-4 text-zinc-400 mt-0.5" />
          </button>

          {isDropdownOpen && (
            <>
              {/* Dropdown Backdrop to close */}
              <div
                className="fixed inset-0 z-30"
                onClick={() => setIsDropdownOpen(false)}
              />
              {/* Dropdown Options Box */}
              <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-zinc-950 border border-zinc-800 rounded-2xl p-1.5 w-56 shadow-2xl z-40 animate-fade-in flex flex-col">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider px-3.5 py-1.5">Folders</span>
                
                {/* List Folders (user folders if imported, else fallback mocks) */}
                {(hasUserFolders ? Object.keys(userFolders) : Object.keys(FOLDER_IMAGES)).map((folder) => (
                  <button
                    key={folder}
                    type="button"
                    onClick={() => {
                      setActiveFolder(folder);
                      setIsDropdownOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-zinc-900/60 truncate",
                      activeFolder === folder ? "text-white bg-zinc-900" : "text-zinc-400 hover:text-white"
                    )}
                  >
                    {folder}
                  </button>
                ))}
                
                <div className="h-[1px] bg-zinc-850 my-1.5" />

                {/* Import actual folder option */}
                <button
                  type="button"
                  onClick={handleImportFolderClick}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors hover:bg-zinc-900/60 flex items-center gap-2"
                >
                  <FolderOpen className="size-4 shrink-0" />
                  <span>Import local folder...</span>
                </button>

                {/* Select files directly option */}
                <button
                  type="button"
                  onClick={handleSelectFromDeviceClick}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold text-sky-400 hover:text-sky-300 transition-colors hover:bg-zinc-900/60 flex items-center gap-2"
                >
                  <ImageIcon className="size-4 shrink-0" />
                  <span>Choose device files</span>
                </button>
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={handleDone}
          className={cn(
            "text-[15px] font-bold transition-all px-3 py-1 rounded-full",
            selectedItems.length > 0
              ? "text-black bg-white hover:bg-zinc-200"
              : "text-zinc-500 cursor-not-allowed pointer-events-none"
          )}
        >
          Done
        </button>
      </div>

      {/* Demo gallery warning info banner if mock photos are showing */}
      {!hasUserFolders && (
        <div className="bg-[#121212] px-4 py-2 border-b border-[#1A1A1A] flex justify-between items-center animate-fade-in flex-shrink-0">
          <span className="text-[12px] text-zinc-400">Viewing demo gallery. Tap import to load folder.</span>
          <button
            onClick={handleImportFolderClick}
            className="text-[11px] font-extrabold text-emerald-400 hover:text-emerald-300 uppercase tracking-wider shrink-0"
          >
            Import
          </button>
        </div>
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

          {/* Photo library items */}
          {currentImages.map((item, idx) => {
            const isSel = selectedItems.some((s) => s.url === item.url);
            const selectedMatchIndex = selectedItems.findIndex((s) => s.url === item.url);
            const selIdx = selectedMatchIndex + 1;

            return (
              <div
                key={idx}
                onClick={() => handleToggleSelect(item)}
                className="aspect-square rounded-xl overflow-hidden relative cursor-pointer group border border-zinc-900 bg-zinc-950 active:scale-95 transition-all"
              >
                <img
                  src={item.url}
                  className={cn(
                    "w-full h-full object-cover transition-all duration-300",
                    isSel ? "scale-95 brightness-[0.65]" : "group-hover:scale-105"
                  )}
                  alt={`photo-${idx}`}
                  loading="lazy"
                />

                {/* Numbered selection indicator circle */}
                <div
                  className={cn(
                    "absolute top-2 right-2 size-5 rounded-full border flex items-center justify-center text-[10px] font-bold transition-all shadow-sm",
                    isSel
                      ? "bg-sky-500 border-sky-500 text-white scale-110"
                      : "border-white/50 bg-black/40 text-transparent"
                  )}
                >
                  {isSel ? selIdx : <Check className="size-3 text-transparent" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
