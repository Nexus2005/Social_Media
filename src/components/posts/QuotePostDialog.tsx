"use client";

import { useState } from "react";
import { PostData } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Button } from "../ui/button";
import LoadingButton from "../LoadingButton";
import { useSubmitPostMutation } from "./editor/mutations";
import UserAvatar from "../UserAvatar";
import { formatRelativeDate } from "@/lib/utils";

interface QuotePostDialogProps {
  post: PostData;
  open: boolean;
  onClose: () => void;
}

export default function QuotePostDialog({ post, open, onClose }: QuotePostDialogProps) {
  const [content, setContent] = useState("");
  const mutation = useSubmitPostMutation();

  const handlePost = () => {
    if (!content.trim()) return;

    mutation.mutate(
      {
        content,
        quotedPostId: post.id,
      },
      {
        onSuccess: () => {
          setContent("");
          onClose();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-lg p-5 bg-card text-card-foreground border border-border rounded-2xl shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Quote Post</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 my-2">
          {/* Write Quote text */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add a comment..."
            className="w-full min-h-[80px] bg-transparent border-0 outline-none resize-none placeholder-muted-foreground text-sm focus:ring-0"
            autoFocus
          />

          {/* Embedded original post preview */}
          <div className="border border-border/85 rounded-xl p-3 bg-neutral-900/10 flex flex-col gap-2 text-xs select-none">
            <div className="flex items-center gap-2">
              <UserAvatar avatarUrl={post.user.avatarUrl} size={20} />
              <span className="font-semibold text-neutral-200">{post.user.displayName}</span>
              <span className="text-neutral-500">@{post.user.username}</span>
              <span className="text-neutral-500">•</span>
              <span className="text-neutral-500">{formatRelativeDate(post.createdAt)}</span>
            </div>
            <p className="text-neutral-300 line-clamp-3 break-words whitespace-pre-wrap">{post.content}</p>
            {post.attachments.length > 0 && (
              <div className="text-neutral-500 italic text-[11px]">
                {post.attachments.length} attachment{post.attachments.length > 1 ? "s" : ""}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex items-center justify-end gap-2 border-t border-border/20 pt-3">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={mutation.isPending}
            className="text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40 rounded-full text-xs font-semibold px-4 py-2"
          >
            Cancel
          </Button>
          <LoadingButton
            onClick={handlePost}
            loading={mutation.isPending}
            disabled={!content.trim()}
            className="rounded-full text-xs font-semibold px-5 py-2 bg-primary text-primary-foreground hover:bg-primary/95"
          >
            Post
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
