"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface StandardDrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  hideHeader?: boolean;
}

export default function StandardDrawer({
  open,
  onClose,
  title,
  children,
  className,
  hideHeader = false,
}: StandardDrawerProps) {
  React.useEffect(() => {
    if (!open) return;
    document.body.classList.add("drawer-active");
    return () => {
      document.body.classList.remove("drawer-active");
    };
  }, [open]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogPrimitive.Portal>
        {/* Backdrop overlay */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        
        {/* Drawer Content */}
        <DialogPrimitive.Content
          className={cn(
            "fixed bottom-0 left-0 right-0 z-[100] flex flex-col max-h-[85vh] w-full bg-[#121212] border-t border-[#262626] rounded-t-3xl outline-none select-none overflow-hidden duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom sm:left-[50%] sm:top-[50%] sm:bottom-auto sm:right-auto sm:translate-x-[-50%] sm:translate-y-[-50%] sm:max-w-[480px] sm:max-h-[600px] sm:rounded-2xl sm:border pb-[env(safe-area-inset-bottom)] sm:pb-0",
            className
          )}
        >
          {/* Top drag handle indicator for mobile */}
          <div className="sm:hidden flex justify-center py-2 shrink-0">
            <div className="w-10 h-1 bg-zinc-700/80 rounded-full" />
          </div>

          {/* Header */}
          {!hideHeader && (
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#262626] shrink-0">
              {title ? (
                <DialogPrimitive.Title className="text-base font-bold text-white">
                  {title}
                </DialogPrimitive.Title>
              ) : (
                <div />
              )}
              <DialogPrimitive.Close className="p-1 rounded-full hover:bg-zinc-800/60 text-zinc-400 hover:text-white transition-colors">
                <X className="size-5" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            </div>
          )}

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {children}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
