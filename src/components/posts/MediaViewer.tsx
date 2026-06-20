"use client";

import { useEffect, useState, useRef } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface MediaViewerProps {
  urls: string[];
  initialIndex: number;
  onClose: () => void;
}

export default function MediaViewer({ urls, initialIndex, onClose }: MediaViewerProps) {
  const [index, setIndex] = useState(initialIndex);
  
  // Gesture & Zoom states
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [dragY, setDragY] = useState(0); // for swipe down to dismiss
  const [isSwipingDown, setIsSwipingDown] = useState(false);

  const lastTapRef = useRef<number>(0);
  const startTouchRef = useRef<{ x: number; y: number; dist: number } | null>(null);
  const currentTranslateRef = useRef({ x: 0, y: 0 });

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowRight" && index < urls.length - 1) {
        handleNext();
      } else if (e.key === "ArrowLeft" && index > 0) {
        handlePrev();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [index, urls]);

  const handleNext = () => {
    if (index < urls.length - 1) {
      setIndex((prev) => prev + 1);
      resetZoom();
    }
  };

  const handlePrev = () => {
    if (index > 0) {
      setIndex((prev) => prev - 1);
      resetZoom();
    }
  };

  const resetZoom = () => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
    currentTranslateRef.current = { x: 0, y: 0 };
    setDragY(0);
    setIsSwipingDown(false);
  };

  // Double tap handler
  const handleDoubleTap = (e: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      if (scale > 1) {
        resetZoom();
      } else {
        setScale(2);
      }
    }
    lastTapRef.current = now;
  };

  // Touch event handlers for zoom & swipe down
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // Single finger: drag pan or swipe down
      const touch = e.touches[0];
      startTouchRef.current = {
        x: touch.clientX - translate.x,
        y: touch.clientY - translate.y,
        dist: 0,
      };
      if (scale === 1) {
        setIsSwipingDown(true);
      }
    } else if (e.touches.length === 2) {
      // Two fingers: pinch zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      startTouchRef.current = {
        x: 0,
        y: 0,
        dist,
      };
      setIsSwipingDown(false);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!startTouchRef.current) return;

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - startTouchRef.current.x;
      const deltaY = touch.clientY - startTouchRef.current.y;

      if (isSwipingDown) {
        const pull = touch.clientY - (startTouchRef.current.y + translate.y);
        if (pull > 0) {
          setDragY(pull);
        }
      } else if (scale > 1) {
        setTranslate({ x: deltaX, y: deltaY });
      }
    } else if (e.touches.length === 2 && startTouchRef.current.dist > 0) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      const newScale = Math.max(1, Math.min(4, (dist / startTouchRef.current.dist) * scale));
      setScale(newScale);
    }
  };

  const handleTouchEnd = () => {
    startTouchRef.current = null;
    if (isSwipingDown) {
      if (dragY > 150) {
        onClose();
      } else {
        setDragY(0);
        setIsSwipingDown(false);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black z-[99999] flex flex-col justify-center items-center select-none overflow-hidden animate-in fade-in duration-200"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={onClose}
      style={{
        backgroundColor: `rgba(0, 0, 0, ${Math.max(0.4, 1 - dragY / 500)})`,
      }}
    >
      {/* Top Header Controls */}
      <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black/60 to-transparent flex items-center justify-between px-4 z-[100002] pointer-events-none">
        <div className="text-white text-sm font-semibold pointer-events-auto">
          {urls.length > 1 && `${index + 1} / ${urls.length}`}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="p-2 text-white hover:text-neutral-300 transition-colors pointer-events-auto bg-black/40 rounded-full"
          title="Close Viewer"
        >
          <X className="size-6" />
        </button>
      </div>

      {/* Main Image Container */}
      <div
        className="w-full h-full flex items-center justify-center relative pointer-events-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="transition-transform duration-75 ease-out flex items-center justify-center w-full h-full pointer-events-auto"
          style={{
            transform: `translate(${translate.x}px, ${translate.y + dragY}px) scale(${scale})`,
          }}
          onClick={handleDoubleTap}
        >
          <img
            src={urls[index]}
            alt="Viewer content"
            className="max-w-full max-h-full object-contain pointer-events-none"
          />
        </div>

        {/* Dynamic Image Prefetching (loads adjacent images invisibly) */}
        {index > 0 && (
          <img src={urls[index - 1]} alt="Prefetch prev" className="hidden" />
        )}
        {index < urls.length - 1 && (
          <img src={urls[index + 1]} alt="Prefetch next" className="hidden" />
        )}
      </div>

      {/* Horizontal Nav Chevrons (Desktop only) */}
      {urls.length > 1 && index > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/40 hover:bg-black/60 border border-white/10 rounded-full text-white z-[100001] transition-all hidden md:block"
        >
          <ChevronLeft className="size-6" />
        </button>
      )}
      {urls.length > 1 && index < urls.length - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/40 hover:bg-black/60 border border-white/10 rounded-full text-white z-[100001] transition-all hidden md:block"
        >
          <ChevronRight className="size-6" />
        </button>
      )}
    </div>
  );
}
