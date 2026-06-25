"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import { PostData } from "@/lib/types";
import {
  AlertTriangle,
  ExternalLink,
  Send,
  Copy,
  Code,
  Info,
  ShoppingBag,
} from "lucide-react";

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
    onOpenChange(false);
  };

  const handlePlaceholderAction = (action: string) => {
    toast({
      description: `${action} action is not implemented yet.`,
    });
    onOpenChange(false);
  };

  const handleDragEnd = (event: any, info: any) => {
    const threshold = 100;
    if (info.offset.y > threshold) {
      onOpenChange(false);
    }
  };

  if (!open || !mounted) return null;

  const menuItems = [
    ...(hasProducts && onShopProductsClick
      ? [
          {
            label: "Shop Products in Video",
            icon: ShoppingBag,
            onClick: onShopProductsClick,
            color: "text-yellow-500 hover:text-yellow-400",
            iconColor: "text-yellow-500",
          },
        ]
      : []),
    {
      label: "Report",
      icon: AlertTriangle,
      onClick: () => handlePlaceholderAction("Report"),
      color: "text-red-500 hover:text-red-400",
      iconColor: "text-red-500",
    },
    {
      label: "Go to post",
      icon: ExternalLink,
      onClick: () => handlePlaceholderAction("Go to post"),
    },
    {
      label: "Share to...",
      icon: Send,
      onClick: () => handlePlaceholderAction("Share to"),
    },
    {
      label: "Copy link",
      icon: Copy,
      onClick: handleCopyLink,
    },
    {
      label: "Embed",
      icon: Code,
      onClick: () => handlePlaceholderAction("Embed"),
    },
    {
      label: "About this account",
      icon: Info,
      onClick: () => handlePlaceholderAction("About this account"),
    },
  ];

  return createPortal(
    <>
      {/* Backdrop */}
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
        className="fixed left-0 right-0 bottom-0 z-[100] w-full bg-[#121212] border-t border-zinc-800 rounded-t-[24px] shadow-2xl flex flex-col overflow-hidden text-white md:max-w-md md:mx-auto pb-4 pointer-events-auto"
      >
        {/* Drag handle */}
        <div className="w-full flex justify-center py-3 flex-shrink-0 cursor-row-resize select-none">
          <div className="w-10 h-1 bg-zinc-700 rounded-full" />
        </div>

        {/* Title */}
        <div className="sr-only">Post Options</div>

        {/* Options List */}
        <div className="flex flex-col px-3 pb-2 select-none max-h-[70vh] overflow-y-auto scrollbar-none">
          {menuItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                onClick={item.onClick}
                className={`flex items-center gap-4 w-full py-4 px-4 text-left text-[15px] font-semibold transition-colors hover:bg-zinc-800/40 active:bg-zinc-800/70 rounded-xl ${
                  item.color || "text-zinc-200 hover:text-white"
                }`}
              >
                <Icon className={`size-5 ${item.iconColor || "text-zinc-400"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Cancel Button */}
        <div className="px-3">
          <button
            onClick={() => onOpenChange(false)}
            className="w-full py-3.5 text-center text-[15px] font-bold text-zinc-400 hover:text-white bg-zinc-800/40 hover:bg-zinc-800/80 active:bg-zinc-800 transition-colors rounded-xl border border-zinc-800/60"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </>,
    document.body
  );
}
