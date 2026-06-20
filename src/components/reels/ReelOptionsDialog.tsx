"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { PostData } from "@/lib/types";

interface ReelOptionsDialogProps {
  post: PostData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ReelOptionsDialog({
  post,
  open,
  onOpenChange,
}: ReelOptionsDialogProps) {
  const { toast } = useToast();

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[280px] sm:max-w-xs p-0 overflow-hidden bg-card rounded-xl border border-border/40 gap-0 select-none">
        <DialogTitle className="sr-only">Post Options</DialogTitle>
        <button
          onClick={() => handlePlaceholderAction("Report")}
          className="w-full py-3.5 text-center text-sm font-bold text-destructive hover:bg-muted/30 border-b border-border/40 active:bg-muted/50 transition-colors"
        >
          Report
        </button>
        <button
          onClick={() => handlePlaceholderAction("Go to post")}
          className="w-full py-3.5 text-center text-sm hover:bg-muted/30 border-b border-border/40 active:bg-muted/50 transition-colors text-foreground"
        >
          Go to post
        </button>
        <button
          onClick={() => handlePlaceholderAction("Share to")}
          className="w-full py-3.5 text-center text-sm hover:bg-muted/30 border-b border-border/40 active:bg-muted/50 transition-colors text-foreground"
        >
          Share to...
        </button>
        <button
          onClick={handleCopyLink}
          className="w-full py-3.5 text-center text-sm hover:bg-muted/30 border-b border-border/40 active:bg-muted/50 transition-colors text-foreground"
        >
          Copy link
        </button>
        <button
          onClick={() => handlePlaceholderAction("Embed")}
          className="w-full py-3.5 text-center text-sm hover:bg-muted/30 border-b border-border/40 active:bg-muted/50 transition-colors text-foreground"
        >
          Embed
        </button>
        <button
          onClick={() => handlePlaceholderAction("About this account")}
          className="w-full py-3.5 text-center text-sm hover:bg-muted/30 active:bg-muted/50 transition-colors text-foreground"
        >
          About this account
        </button>
      </DialogContent>
    </Dialog>
  );
}
