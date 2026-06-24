"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ReelsComments from "./ReelsComments";
import { PostData } from "@/lib/types";

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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#090909] border border-zinc-800/80 rounded-2xl flex flex-col h-[75vh] md:h-[600px] p-0 overflow-hidden select-none">
        <DialogHeader className="px-6 py-4 border-b border-zinc-900/60 flex-shrink-0">
          <DialogTitle className="text-center font-black text-white text-base">Comments</DialogTitle>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto p-4 scrollbar-none">
          <ReelsComments post={post} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
