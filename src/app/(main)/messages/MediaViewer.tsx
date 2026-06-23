"use client";

import React from "react";
import { X, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface MediaViewerState {
  attachments: { url: string; type: string; name?: string }[];
  initialIndex: number;
}

interface MediaViewerProps {
  state: MediaViewerState;
  onClose: () => void;
}

export default function MediaViewer({ state, onClose }: MediaViewerProps) {
  const [index, setIndex] = React.useState(state.initialIndex);
  const current = state.attachments[index];

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (index > 0) setIndex(index - 1);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (index < state.attachments.length - 1) setIndex(index + 1);
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(current.url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = current.name || current.url.split("/").pop() || "download";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Failed to download media:", error);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-black/95 p-4 text-white"
      >
        {/* Header Controls */}
        <div className="flex w-full items-center justify-between p-2">
          <span className="text-sm text-zinc-400">
            {index + 1} / {state.attachments.length}
          </span>
          <div className="flex items-center gap-4">
            <button
              onClick={handleDownload}
              className="rounded-full bg-zinc-800/80 p-2.5 transition-colors hover:bg-zinc-700"
              title="Download"
            >
              <Download className="size-5" />
            </button>
            <button
              onClick={onClose}
              className="rounded-full bg-zinc-800/80 p-2.5 transition-colors hover:bg-zinc-700"
              title="Close"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer Panel */}
        <div className="relative flex flex-1 w-full items-center justify-center">
          {/* Navigation Left */}
          {index > 0 && (
            <button
              onClick={handlePrev}
              className="absolute left-4 z-10 rounded-full bg-zinc-800/60 p-3 hover:bg-zinc-700"
            >
              <ChevronLeft className="size-6" />
            </button>
          )}

          {/* Current Media Render */}
          <motion.div
            key={index}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[80vh] max-w-full overflow-hidden flex items-center justify-center"
          >
            {current.type === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={current.url}
                alt={current.name || "Viewer media"}
                className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl select-none"
              />
            ) : current.type === "video" ? (
              <video
                src={current.url}
                controls
                autoPlay
                className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
              />
            ) : (
              <div className="flex flex-col items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
                <p className="text-lg font-medium">{current.name || "Document"}</p>
                <a
                  href={current.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-primary px-6 py-2.5 font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Open in browser
                </a>
              </div>
            )}
          </motion.div>

          {/* Navigation Right */}
          {index < state.attachments.length - 1 && (
            <button
              onClick={handleNext}
              className="absolute right-4 z-10 rounded-full bg-zinc-800/60 p-3 hover:bg-zinc-700"
            >
              <ChevronRight className="size-6" />
            </button>
          )}
        </div>

        {/* Footer info (optional file name) */}
        <div className="p-4 text-center text-sm text-zinc-400">
          {current.name || ""}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
