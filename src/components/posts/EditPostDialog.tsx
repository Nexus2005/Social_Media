"use client";

import { PostData } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import PostEditor from "./editor/PostEditor";

interface EditPostDialogProps {
  post: PostData;
  open: boolean;
  onClose: () => void;
}

export default function EditPostDialog({
  post,
  open,
  onClose,
}: EditPostDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-none w-full h-full md:h-auto md:w-[85vw] md:max-w-4xl p-0 overflow-hidden bg-transparent md:bg-card rounded-none md:rounded-2xl border-none md:border left-0 top-0 translate-x-0 translate-y-0 md:left-[50%] md:top-[50%] md:translate-x-[-50%] md:translate-y-[-50%] [&>button]:hidden md:[&>button]:inline-flex">
        <DialogHeader className="hidden md:flex px-6 py-4 border-b">
          <DialogTitle className="text-center font-bold text-lg">Edit post</DialogTitle>
        </DialogHeader>
        <div className="p-0 md:p-6 h-full md:h-auto">
          <PostEditor postToEdit={post} onClose={onClose} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
