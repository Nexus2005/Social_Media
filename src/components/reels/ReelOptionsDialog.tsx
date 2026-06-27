"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import { PostData } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ExternalLink,
  Send,
  Copy,
  Code,
  Info,
  ShoppingBag,
  ChevronLeft,
  UserCircle2
} from "lucide-react";
import { VerifiedBadge } from "@/components/VerifiedBadge";

interface ReelOptionsDialogProps {
  post: PostData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasProducts?: boolean;
  onShopProductsClick?: () => void;
}

export default function ReelOptionsDialog({
  post,
  open,
  onOpenChange,
  hasProducts = false,
  onShopProductsClick,
}: ReelOptionsDialogProps) {
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<"menu" | "about_account">("menu");

  const handleClose = () => {
    setView("menu");
    onOpenChange(false);
  };

  useEffect(() => {
    setMounted(true);
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  const handleCopyLink = () => {
    const postUrl = `${window.location.origin}/posts/${post.id}`;
    navigator.clipboard.writeText(postUrl);
    toast({
      description: "Link copied to clipboard.",
    });
    handleClose();
  };

  const handlePlaceholderAction = (action: string) => {
    toast({
      description: `${action} action is not implemented yet.`,
    });
    handleClose();
  };

  const handleDragEnd = (event: any, info: any) => {
    const threshold = 100;
    if (info.offset.y > threshold) {
      handleClose();
    }
  };

  if (!open || !mounted) return null;

  // Shortcuts displayed in the top row grid
  const shortcuts = [
    {
      label: "Share",
      icon: Send,
      onClick: () => handlePlaceholderAction("Share to"),
    },
    {
      label: "Copy Link",
      icon: Copy,
      onClick: handleCopyLink,
    },
    ...(hasProducts && onShopProductsClick
      ? [
          {
            label: "Shop Looks",
            icon: ShoppingBag,
            onClick: onShopProductsClick,
            highlight: true,
          },
        ]
      : [
          {
            label: "Embed",
            icon: Code,
            onClick: () => handlePlaceholderAction("Embed"),
          },
        ]),
    {
      label: "Go to Post",
      icon: ExternalLink,
      onClick: () => handlePlaceholderAction("Go to post"),
    },
  ];

  // Additional options in the vertical list below
  const listItems = [
    ...(hasProducts
      ? [
          {
            label: "Embed",
            icon: Code,
            onClick: () => handlePlaceholderAction("Embed"),
          },
        ]
      : []),
    {
      label: "About this account",
      icon: Info,
      onClick: () => setView("about_account"),
    },
    {
      label: "Report Reel",
      icon: AlertTriangle,
      onClick: () => handlePlaceholderAction("Report"),
      color: "text-red-500 hover:bg-red-500/10 hover:text-red-400",
      iconColor: "text-red-500",
    },
  ];

  return createPortal(
    <>
      {/* Backdrop with blur & smooth fade */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] pointer-events-auto"
        onClick={() => onOpenChange(false)}
      />

      {/* Sliding Sheet */}
      <motion.div
        drag="y"
        dragElastic={{ top: 0.05, bottom: 0.3 }}
        dragConstraints={{ top: 0, bottom: 0 }}
        onDragEnd={handleDragEnd}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "tween", ease: "easeOut", duration: 0.25 }}
        className="fixed left-0 right-0 bottom-0 z-[100] w-full bg-[#1c222b] border-t border-[#262626] rounded-t-3xl shadow-2xl flex flex-col overflow-hidden text-white md:max-w-md md:mx-auto pb-6 px-6 pointer-events-auto select-none"
      >
        {/* Drag handle */}
        <div className="w-full flex justify-center py-3 flex-shrink-0 cursor-row-resize">
          <div className="w-12 h-1 bg-zinc-700/80 rounded-full" />
        </div>

        {/* Title */}
        <div className="sr-only">Post Options</div>

        {view === "menu" ? (
          <>
            {/* Grid of Shortcut Options */}
            <div className="grid grid-cols-4 gap-4 w-full py-4 justify-items-center">
              {shortcuts.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    onClick={item.onClick}
                    className="flex flex-col items-center gap-2 group w-full cursor-pointer max-w-[70px]"
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 group-hover:scale-105 active:scale-95 shrink-0 shadow-md",
                      item.highlight
                        ? "bg-amber-500/15 text-amber-400 border border-amber-500/25 hover:bg-amber-500/25"
                        : "bg-[#252c38] text-zinc-200 border border-[#2d3645] hover:bg-[#2e3747]"
                    )}>
                      <Icon className="size-5" />
                    </div>
                    <span className="text-[11px] font-bold text-zinc-400 group-hover:text-white transition-colors truncate w-full text-center">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Vertical List of Options */}
            <div className="w-full flex flex-col bg-[#252c38]/40 border border-[#2d3645]/45 rounded-2xl divide-y divide-[#2d3645]/40 overflow-hidden mt-2">
              {listItems.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    onClick={item.onClick}
                    className={cn(
                      "flex items-center gap-3.5 w-full py-4 px-4 text-left text-[14.5px] font-bold transition-all hover:bg-zinc-800/40 active:bg-zinc-800/70",
                      item.color || "text-zinc-250 hover:text-white"
                    )}
                  >
                    <Icon className={cn("size-4.5 shrink-0", item.iconColor || "text-zinc-400")} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Cancel Button */}
            <button
              onClick={handleClose}
              className="w-full py-3.5 mt-4 bg-[#252c38]/80 hover:bg-[#252c38] rounded-xl text-center font-bold text-zinc-400 hover:text-white text-[15px] transition-colors border border-[#2d3645]/30 shadow-md"
            >
              Cancel
            </button>
          </>
        ) : (
          /* About this Account view matching feed section */
          <div className="flex flex-col gap-4 py-2 text-start">
            <div className="flex items-center gap-3">
              <button onClick={() => setView("menu")} className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800/60">
                <ChevronLeft className="size-5" />
              </button>
              <span className="text-[16px] font-bold">About this account</span>
            </div>
            <div className="flex flex-col items-center gap-4 py-6 px-4 rounded-2xl bg-[#252c38]/40 border border-[#2d3645]/45 text-start w-full">
              <img src={post.user.avatarUrl || "/avatar-placeholder.png"} alt="avatar" className="size-16 rounded-full border border-[#2d3645] object-cover" />
              <div className="flex flex-col text-center">
                <span className="font-bold text-[17px] text-white flex items-center justify-center gap-1">
                  {post.user.displayName}
                  {post.user.verified && (
                    <VerifiedBadge size={14} className="ml-1" />
                  )}
                </span>
                <span className="text-sm text-zinc-400">@{post.user.username}</span>
              </div>
              <div className="w-full flex flex-col gap-3.5 border-t border-[#2d3645]/40 pt-4 mt-2">
                <div className="flex justify-between items-center text-[14px]">
                  <span className="text-zinc-400">Date joined</span>
                  <span className="font-semibold text-white">June 2024</span>
                </div>
                <div className="flex justify-between items-center text-[14px]">
                  <span className="text-zinc-400">Account location</span>
                  <span className="font-semibold text-white">India</span>
                </div>
                <div className="flex justify-between items-center text-[14px]">
                  <span className="text-zinc-400">Verified status</span>
                  <span className="font-semibold text-white">{post.user.verified ? "Verified badge" : "Standard member"}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </>,
    document.body
  );
}
