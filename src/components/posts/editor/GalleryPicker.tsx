"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Check, Camera, Loader2, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectedFile {
  file: File;
  previewUrl: string;
}

interface GalleryPickerProps {
  onClose: () => void;
  onSelectImages: (files: File[]) => void;
  onOpenCamera: () => void;
}

export default function GalleryPicker({ onClose, onSelectImages, onOpenCamera }: GalleryPickerProps) {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pickedPhotos, setPickedPhotos] = useState<SelectedFile[]>([]);
  const [hasPickerOpened, setHasPickerOpened] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Automatically trigger the native photo picker on mount
  useEffect(() => {
    // Small delay so the UI renders first, then open the native picker
    const timer = setTimeout(() => {
      if (fileInputRef.current && !hasPickerOpened) {
        setHasPickerOpened(true);
        fileInputRef.current.click();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [hasPickerOpened]);

  // Clean up blob URLs on unmount
  useEffect(() => {
    return () => {
      pickedPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, [pickedPhotos]);

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) {
      // User cancelled the picker — if we have no photos yet, close
      if (pickedPhotos.length === 0) {
        onClose();
      }
      return;
    }

    const newPhotos: SelectedFile[] = files
      .filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"))
      .map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      }));

    if (newPhotos.length === 0) {
      if (pickedPhotos.length === 0) {
        onClose();
      }
      return;
    }

    setPickedPhotos((prev) => [...prev, ...newPhotos]);
    // Auto-select all newly picked photos
    setSelectedFiles((prev) => [...prev, ...newPhotos]);
    // Reset input so the same files can be re-selected if needed
    e.target.value = "";
  };

  const handleToggleSelect = (item: SelectedFile) => {
    const isSel = selectedFiles.some((s) => s.previewUrl === item.previewUrl);
    if (isSel) {
      setSelectedFiles(selectedFiles.filter((s) => s.previewUrl !== item.previewUrl));
    } else {
      if (selectedFiles.length >= 10) return;
      setSelectedFiles([...selectedFiles, item]);
    }
  };

  const handleAddMore = () => {
    fileInputRef.current?.click();
  };

  const handleDone = async () => {
    if (selectedFiles.length === 0) {
      onClose();
      return;
    }

    try {
      setIsProcessing(true);
      const files = selectedFiles.map((s) => s.file);
      onSelectImages(files);
      onClose();
    } catch (e) {
      console.error("Failed to process selected gallery assets", e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex-grow flex flex-col bg-black text-white select-none font-sans h-full relative">
      {/* Hidden native file input — this is what opens the real device photo picker */}
      <input
        type="file"
        accept="image/*, video/*"
        multiple
        capture={undefined}
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

        <span className="font-bold text-[17px] text-white">Gallery</span>

        <button
          type="button"
          onClick={handleDone}
          className={cn(
            "text-[15px] font-bold transition-all px-3 py-1 rounded-full",
            selectedFiles.length > 0
              ? "text-black bg-white hover:bg-zinc-200"
              : "text-zinc-500 cursor-not-allowed pointer-events-none"
          )}
        >
          {selectedFiles.length > 0 ? `Done (${selectedFiles.length})` : "Done"}
        </button>
      </div>

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

          {/* Slot 2: Add More photos from device tile */}
          <div
            onClick={handleAddMore}
            className="aspect-square bg-zinc-950 hover:bg-zinc-900 transition-colors border border-zinc-850 rounded-xl flex flex-col items-center justify-center text-[#A1A1AA] cursor-pointer group active:scale-95 transition-all select-none"
          >
            <div className="size-11 rounded-full bg-zinc-900 flex items-center justify-center text-emerald-500 border border-zinc-800 shadow-sm group-hover:bg-zinc-850">
              <ImageIcon className="size-5" strokeWidth={2} />
            </div>
            <span className="text-[11px] font-semibold text-zinc-400 mt-2">Add More</span>
          </div>

          {/* Selected photo library items from device */}
          {pickedPhotos.map((item, idx) => {
            const isSel = selectedFiles.some((s) => s.previewUrl === item.previewUrl);
            const selectedMatchIndex = selectedFiles.findIndex((s) => s.previewUrl === item.previewUrl);
            const selIdx = selectedMatchIndex + 1;
            const isVideo = item.file.type.startsWith("video/");

            return (
              <div
                key={idx}
                onClick={() => handleToggleSelect(item)}
                className="aspect-square rounded-xl overflow-hidden relative cursor-pointer group border border-zinc-900 bg-zinc-950 active:scale-95 transition-all"
              >
                {isVideo ? (
                  <video
                    src={item.previewUrl}
                    className={cn(
                      "w-full h-full object-cover transition-all duration-300",
                      isSel ? "scale-95 brightness-[0.65]" : "group-hover:scale-105"
                    )}
                    muted
                  />
                ) : (
                  <img
                    src={item.previewUrl}
                    className={cn(
                      "w-full h-full object-cover transition-all duration-300",
                      isSel ? "scale-95 brightness-[0.65]" : "group-hover:scale-105"
                    )}
                    alt={`photo-${idx}`}
                    loading="lazy"
                  />
                )}

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

        {/* Empty state when no photos have been picked yet */}
        {pickedPhotos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="size-16 rounded-full bg-zinc-900 flex items-center justify-center mb-4 border border-zinc-800">
              <ImageIcon className="size-8 text-zinc-500" strokeWidth={1.5} />
            </div>
            <h4 className="text-base font-bold text-white mb-1">Select photos from your device</h4>
            <p className="text-sm text-zinc-500 max-w-[280px] mb-4">
              Your device photo picker will open automatically. Choose the photos and videos you want to share.
            </p>
            <button
              type="button"
              onClick={handleAddMore}
              className="bg-white hover:bg-zinc-200 text-black font-semibold px-6 py-2.5 rounded-full text-sm transition-colors"
            >
              Open Photo Picker
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
