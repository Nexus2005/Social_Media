"use client";

import { useState, useEffect } from "react";
import ReelsComments from "./ReelsComments";
import { PostData } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ReelsCommentDialogProps {
  post: PostData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ReelsCommentDialog({
  post,
  open,
  onOpenChange,
}: ReelsCommentDialogProps) {
  const [active, setActive] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Handle sliding entry transition
  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => setActive(true));
      return () => cancelAnimationFrame(id);
    }
  }, [open]);

  // Handle closing with slide-down transition
  const handleClose = () => {
    setActive(false);
    setTimeout(() => {
      onOpenChange(false);
    }, 300); // Matches transition-all duration-300
  };

  // Track visual viewport to adjust bottom sheet height on soft keyboard resize
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;

    const handleResize = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      // Calculate keyboard height as difference between window height and visual viewport height
      const heightDiff = window.innerHeight - vv.height;
      setKeyboardHeight(Math.max(0, heightDiff));
    };

    window.visualViewport.addEventListener("resize", handleResize);
    handleResize();

    return () => {
      window.visualViewport?.removeEventListener("resize", handleResize);
    };
  }, []);

  // Lock root document scroll when drawer is open
  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    const originalBodyPosition = document.body.style.position;
    const originalBodyHeight = document.body.style.height;
    const originalBodyWidth = document.body.style.width;

    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalHtmlPosition = document.documentElement.style.position;
    const originalHtmlHeight = document.documentElement.style.height;
    const originalHtmlWidth = document.documentElement.style.width;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.height = "100%";
    document.body.style.width = "100%";

    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.position = "fixed";
    document.documentElement.style.height = "100%";
    document.documentElement.style.width = "100%";

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.position = originalBodyPosition;
      document.body.style.height = originalBodyHeight;
      document.body.style.width = originalBodyWidth;

      document.documentElement.style.overflow = originalHtmlOverflow;
      document.documentElement.style.position = originalHtmlPosition;
      document.documentElement.style.height = originalHtmlHeight;
      document.documentElement.style.width = originalHtmlWidth;
    };
  }, []);

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-black/60 backdrop-blur-sm z-45 transition-opacity duration-300",
          active ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={handleClose}
      />

      {/* Sheet Container */}
      <div
        className={cn(
          "fixed left-0 right-0 z-50 w-full bg-zinc-950 rounded-t-[16px] border-t border-zinc-800/80 shadow-2xl flex flex-col overflow-hidden text-white transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] md:max-w-md md:left-1/2 md:-translate-x-1/2",
          active ? "translate-y-0" : "translate-y-full"
        )}
        style={{
          top: "40dvh",
          bottom: `${keyboardHeight}px`,
          height: `calc(60dvh - ${keyboardHeight}px)`,
        }}
      >
        {/* Custom Header with close button */}
        <div className="px-6 py-4 border-b border-zinc-900/60 flex-shrink-0 flex items-center justify-between select-none">
          <div className="w-6" /> {/* Spacer to center the title */}
          <h3 className="text-center font-black text-white text-base">Comments</h3>
          <button
            onClick={handleClose}
            className="text-zinc-400 hover:text-white transition-colors p-1"
            title="Close comments"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Comments wrapper */}
        <div className="flex flex-col flex-grow overflow-hidden">
          <ReelsComments post={post} />
        </div>
      </div>
    </>
  );
}
