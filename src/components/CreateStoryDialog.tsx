"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, X, Loader2 } from "lucide-react";
import { useUploadThing } from "@/lib/uploadthing";
import { useToast } from "@/components/ui/use-toast";
import { validateMediaFile } from "@/lib/validation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import dynamic from "next/dynamic";

const StoryEditor = dynamic(() => import("./stories/StoryEditor"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950 text-white">
      <Loader2 className="size-10 animate-spin text-sky-500" />
    </div>
  ),
});

interface CreateStoryDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function CreateStoryDialog({ open, onClose }: CreateStoryDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [rawMediaAsset, setRawMediaAsset] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>();

  const { startUpload, isUploading } = useUploadThing("story", {
    onUploadProgress: setUploadProgress,
    onClientUploadComplete() {
      toast({
        description: "Story posted successfully!",
      });
      // Invalidate stories cache to refresh the carousel
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      handleClose();
    },
    onUploadError(e) {
      toast({
        variant: "destructive",
        description: e.message || "Failed to post story. Please try again.",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const file = files[0];
    const errorMsg = validateMediaFile(file);
    if (errorMsg) {
      toast({
        variant: "destructive",
        description: `${file.name}: ${errorMsg}`,
      });
      return;
    }

    setRawMediaAsset(file);
  };

  const handlePostEditedStory = async (finalFile: File) => {
    try {
      await startUpload([finalFile]);
    } catch (error) {
      console.error("Story upload failed:", error);
    }
  };

  const handleClose = () => {
    if (isUploading) return;
    setRawMediaAsset(null);
    setUploadProgress(undefined);
    onClose();
  };

  if (isUploading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-neutral-950/80 backdrop-blur-sm text-white select-none">
        <Loader2 className="size-10 animate-spin text-sky-500 mb-4" />
        <span className="text-sm font-semibold">Sharing to Story ({uploadProgress ?? 0}%)</span>
      </div>
    );
  }

  if (rawMediaAsset) {
    return (
      <StoryEditor
        file={rawMediaAsset}
        onClose={handleClose}
        onComplete={handlePostEditedStory}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !val && handleClose()}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden bg-card border border-border/40 select-none">
        <DialogHeader className="p-4 border-b border-border/40 flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-center font-semibold text-lg flex-grow">
            Create new story
          </DialogTitle>
          {!isUploading && (
            <button
              onClick={handleClose}
              className="text-muted-foreground hover:text-foreground rounded-full p-1 hover:bg-muted transition-colors"
            >
              <X className="size-5" />
            </button>
          )}
        </DialogHeader>

        <div className="flex flex-col items-center justify-center p-6 min-h-[320px]">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-[260px] border-2 border-dashed border-border/60 hover:border-primary/60 rounded-2xl flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-muted/10 transition-all group"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*, video/*"
              className="hidden"
            />
            <div className="p-4 bg-muted rounded-full group-hover:scale-105 transition-transform text-muted-foreground group-hover:text-primary">
              <Upload className="size-8" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground">Upload photo or video</p>
              <p className="text-sm text-muted-foreground mt-1 px-4">
                Drag and drop files here or click to browse. Max size: 10MB images, 100MB videos.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
