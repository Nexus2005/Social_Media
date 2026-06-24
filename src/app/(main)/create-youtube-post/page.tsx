"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/app/(main)/SessionProvider";
import UserAvatar from "@/components/UserAvatar";
import { X, Globe, ChevronDown, MoreHorizontal, AlignLeft, Image as ImageIcon, CheckSquare, Camera } from "lucide-react";

interface MediaAsset {
  id: string;
  uri: string;
  mediaType: "IMAGE" | "VIDEO";
}

// Initial mock images for Screen A visual parity, simulating native recent camera photos
const INITIAL_MOCK_MEDIA: MediaAsset[] = [
  { id: "mock-1", uri: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=300&auto=format&fit=crop&q=60", mediaType: "IMAGE" },
  { id: "mock-2", uri: "https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=300&auto=format&fit=crop&q=60", mediaType: "IMAGE" },
  { id: "mock-3", uri: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=300&auto=format&fit=crop&q=60", mediaType: "IMAGE" },
  { id: "mock-4", uri: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=300&auto=format&fit=crop&q=60", mediaType: "IMAGE" },
  { id: "mock-5", uri: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=300&auto=format&fit=crop&q=60", mediaType: "IMAGE" },
];

export default function CreateYoutubePostPage() {
  const router = useRouter();
  const { user } = useSession();
  
  const [mediaList, setMediaList] = useState<MediaAsset[]>(INITIAL_MOCK_MEDIA);
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Add page-specific class to body to override layout paddings
    document.body.classList.add("route-create-active");
    
    // Check if window.AndroidMediaStoreBridge exists to query native photos
    if (typeof window !== "undefined" && (window as any).AndroidMediaStoreBridge) {
      try {
        const nativeData = (window as any).AndroidMediaStoreBridge.queryMedia();
        const parsed = JSON.parse(nativeData) as any[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          const formatted = parsed.map((item, idx) => ({
            id: item.id || `native-${idx}`,
            uri: item.uri,
            mediaType: item.mediaType === "VIDEO" ? ("VIDEO" as const) : ("IMAGE" as const),
          }));
          setMediaList(formatted);
        }
      } catch (e) {
        console.error("Native MediaStore bridge query failed:", e);
      }
    }

    return () => {
      document.body.classList.remove("route-create-active");
    };
  }, []);

  const handleClose = () => {
    router.back();
  };

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newAssets: MediaAsset[] = files
      .filter((file) => file.type.startsWith("image/") || file.type.startsWith("video/"))
      .map((file, index) => ({
        id: `local-${Date.now()}-${index}`,
        uri: URL.createObjectURL(file),
        mediaType: file.type.startsWith("video/") ? ("VIDEO" as const) : ("IMAGE" as const),
      }));

    if (newAssets.length === 0) return;

    setMediaList((prev) => [...newAssets, ...prev]);
    setSelectedMediaId(newAssets[0].id); // Auto-highlight the first selected thumbnail
    
    // Reset file input
    e.target.value = "";
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen w-full bg-black flex flex-col justify-between select-none">
      {/* Inject styling overrides to remove layout sidebars/padding constraints */}
      <style jsx global>{`
        .route-create-active .main-content-wrapper {
          padding-left: 0 !important;
          padding-bottom: 0 !important;
        }
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-none {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Hidden input for loading device media */}
      <input
        type="file"
        multiple
        accept="image/*,video/*"
        ref={fileInputRef}
        onChange={handleFilesSelected}
        className="hidden"
      />

      {/* Main Composer Area */}
      <div className="flex flex-col flex-grow w-full max-w-[600px] mx-auto bg-black text-white relative">
        
        {/* Header */}
        <header className="h-14 flex items-center justify-between px-4 bg-black select-none z-10 shrink-0">
          <button 
            onClick={handleClose}
            className="p-2 hover:bg-[#272727] rounded-full transition-colors flex items-center justify-center"
            title="Cancel"
          >
            <X className="size-6 text-white" />
          </button>
          
          <button 
            disabled 
            className="bg-[#272727] text-[#71717A] text-sm font-semibold px-[18px] py-1.5 rounded-full cursor-not-allowed opacity-40 select-none"
          >
            Post
          </button>
        </header>

        {/* User profile row */}
        <div className="flex items-start gap-3.5 px-4 py-3 select-none shrink-0">
          <UserAvatar 
            avatarUrl={user?.avatarUrl} 
            size={40} 
            className="size-10 shrink-0 border border-zinc-800 rounded-full" 
          />
          <div className="flex flex-col gap-1.5">
            <span className="text-white text-[15px] font-semibold tracking-tight">
              {user?.displayName || user?.username || "AIM News"}
            </span>
            <div className="flex items-center gap-2">
              {/* Public visibility pill */}
              <div 
                className="h-7 px-3 flex items-center gap-1.5 bg-[#272727] hover:bg-[#3f3f3f] active:bg-[#4f4f4f] rounded-full text-white text-[13px] font-medium transition-colors cursor-pointer select-none"
              >
                <Globe className="size-3.5 text-white" />
                <span>Public</span>
                <ChevronDown className="size-3.5 text-white" />
              </div>
              
              {/* Options menu */}
              <div 
                className="size-7 flex items-center justify-center bg-[#272727] hover:bg-[#3f3f3f] active:bg-[#4f4f4f] rounded-full text-white transition-colors cursor-pointer select-none"
              >
                <MoreHorizontal className="size-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Large Text Editor area */}
        <div className="flex-grow px-5 py-4 flex flex-col justify-start w-full relative">
          <textarea
            readOnly
            className="w-full bg-transparent text-white placeholder-[#8e8e93] text-[18px] leading-[25px] font-normal resize-none focus:outline-none select-none pointer-events-none"
            placeholder="Share an image to start a caption contest"
            rows={4}
          />
        </div>

        {/* Gallery Strip Container - sits attached to the bottom switcher with large negative space above */}
        <div className="w-full flex flex-col bg-black shrink-0">
          
          {/* Gallery Media Strip */}
          <div className="h-[96px] py-1 bg-black flex items-center gap-2 overflow-x-auto scrollbar-none px-4 select-none">
            
            {/* Native camera/import item inside the strip */}
            <button 
              onClick={triggerFileSelect}
              className="w-20 h-20 shrink-0 bg-[#1A1A1A] hover:bg-[#2A2A2A] rounded-[8px] flex flex-col items-center justify-center transition-colors border border-dashed border-zinc-800"
              title="Camera/Import"
            >
              <Camera className="size-5 text-white/80" />
            </button>

            {mediaList.map((asset) => {
              const isSelected = selectedMediaId === asset.id;
              return (
                <div
                  key={asset.id}
                  onClick={() => setSelectedMediaId(isSelected ? null : asset.id)}
                  className={`w-20 h-20 shrink-0 rounded-[8px] overflow-hidden relative cursor-pointer select-none transition-all ${
                    isSelected ? "ring-2 ring-white scale-95" : "opacity-90 hover:opacity-100"
                  }`}
                >
                  <img
                    src={asset.uri}
                    alt="Gallery item"
                    className="w-full h-full object-cover select-none pointer-events-none"
                  />
                  {isSelected && (
                    <div className="absolute inset-0 bg-black/10 flex items-center justify-center select-none" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom actions row */}
          <div className="h-14 flex items-center justify-start gap-4 px-4 bg-black border-t border-[#1A1A1A] pb-safe shrink-0">
            {/* Active Caption Contest Item */}
            <button 
              className="bg-[#272727] p-2 rounded-full text-white flex items-center justify-center transition-all select-none"
              title="Caption Contest"
            >
              <AlignLeft className="size-[22px]" />
            </button>

            {/* Inactive Image Item */}
            <button 
              className="p-2 text-zinc-400 opacity-60 hover:opacity-85 flex items-center justify-center transition-all select-none cursor-not-allowed"
              title="Image"
              disabled
            >
              <ImageIcon className="size-[22px]" />
            </button>

            {/* Inactive Quiz Item */}
            <button 
              className="p-2 text-zinc-400 opacity-60 hover:opacity-85 flex items-center justify-center transition-all select-none cursor-not-allowed"
              title="Quiz"
              disabled
            >
              <CheckSquare className="size-[22px]" />
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
