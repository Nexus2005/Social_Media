"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, X, Loader2, Video, Image as ImageIcon } from "lucide-react";
import { useUploadThing } from "@/lib/uploadthing";
import { useToast } from "@/components/ui/use-toast";
import { validateMediaFile } from "@/lib/validation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import LoadingButton from "./LoadingButton";
import Image from "next/image";
import VideoPlayer from "./VideoPlayer";

interface CreateStoryDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function CreateStoryDialog({ open, onClose }: CreateStoryDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handlePostStory = async () => {
    if (!selectedFile) return;
    try {
      await startUpload([selectedFile]);
    } catch (error) {
      console.error("Story upload failed:", error);
    }
  };

  const handleClose = () => {
    if (isUploading) return;
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setUploadProgress(undefined);
    onClose();
  };

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
          {previewUrl ? (
            <div className="w-full flex flex-col gap-4">
              <div className="relative mx-auto w-full max-h-[300px] rounded-xl overflow-hidden bg-black flex justify-center items-center">
                {selectedFile?.type.startsWith("image/") ? (
                  <div className="relative w-full h-[300px]">
                    <Image
                      src={previewUrl}
                      alt="Story preview"
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                ) : (
                  <video
                    src={previewUrl}
                    controls
                    className="w-full h-full max-h-[300px] object-contain"
                  />
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                  disabled={isUploading}
                >
                  Change
                </Button>
                <LoadingButton
                  onClick={handlePostStory}
                  loading={isUploading}
                  className="min-w-[120px] bg-gradient-to-r from-yellow-500 via-pink-500 to-purple-600 hover:opacity-95 text-white border-0 font-medium"
                >
                  {isUploading ? `Posting (${uploadProgress ?? 0}%)` : "Share to Story"}
                </LoadingButton>
              </div>
            </div>
          ) : (
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
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
