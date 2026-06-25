"use client";

import React, { useRef, useState, useEffect } from "react";
import { X, Camera, RotateCw, Undo2, Users, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

interface InstantCameraModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function InstantCameraModal({
  open,
  onClose,
  onSuccess,
}: InstantCameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [audience, setAudience] = useState<"FRIENDS" | "CLOSE_FRIENDS">("FRIENDS");
  const { toast } = useToast();

  // Snapped states
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const capturedBlobRef = useRef<Blob | null>(null);
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  
  // Undo/Send countdown states
  const [sending, setSending] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const timerRef = useRef<any>(null);

  // Initialize camera
  const startCamera = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: false,
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err) {
      console.error("Camera access failed:", err);
      toast({
        variant: "destructive",
        description: "Could not access camera. Please check permissions.",
      });
      onClose();
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (open && !capturedBlob) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [open, facingMode, capturedBlob]);

  // Capture frame
  const handleCapture = () => {
    if (!videoRef.current || !streamRef.current) return;
    
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Draw the current video frame onto canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to WebP format for storage compression
    canvas.toBlob(
      (blob) => {
        if (blob) {
          setCapturedBlob(blob);
          capturedBlobRef.current = blob;
          setCapturedDataUrl(canvas.toDataURL("image/webp", 0.8));
          stopCamera(); // Turn off camera during preview
          
          // Start 5-second countdown
          startCountdown();
        }
      },
      "image/webp",
      0.8
    );
  };

  const startCountdown = () => {
    setCountdown(5);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleUpload();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Undo snap
  const handleUndo = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setCapturedBlob(null);
    capturedBlobRef.current = null;
    setCapturedDataUrl(null);
    setCountdown(null);
    setSending(false);
    
    // Restart camera
    startCamera();
    
    toast({
      description: "Snap undone successfully.",
    });
  };

  // Upload Snap
  const handleUpload = async () => {
    // Check if there is a blob to upload
    const blobToUpload = capturedBlobRef.current;
    if (!blobToUpload) return;

    setSending(true);
    
    try {
      const fileName = "instant_snap.webp";
      const fileType = "image/webp";

      // 1. Get presigned URL
      const presignRes = await fetch(
        `/api/upload?endpoint=instant&filename=${encodeURIComponent(fileName)}&contentType=${encodeURIComponent(fileType)}`
      );
      if (!presignRes.ok) throw new Error("Failed to get upload signature");
      const { signedUrl, publicUrl, fileKey } = await presignRes.json();

      // 2. Direct upload to Supabase
      const uploadRes = await fetch(signedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": fileType,
        },
        body: blobToUpload,
      });
      if (!uploadRes.ok) throw new Error("Direct upload failed");

      // 3. Register instant snap in DB
      const registerRes = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          endpoint: "instant",
          audience,
          files: [{ name: fileName, url: publicUrl, fileKey, type: fileType }],
        }),
      });

      if (!registerRes.ok) throw new Error("Register failed");

      toast({
        description: `Snap shared to ${audience === "CLOSE_FRIENDS" ? "Close Friends" : "Friends"}!`,
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        description: "Failed to upload instant snap.",
      });
      // Allow retry / cancel on failure
      setSending(false);
    }
  };

  const handleClose = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setCapturedBlob(null);
    capturedBlobRef.current = null;
    setCapturedDataUrl(null);
    setCountdown(null);
    setSending(false);
    stopCamera();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 select-none">
      <div className="relative w-full max-w-lg h-full sm:h-[85vh] sm:max-h-[640px] flex flex-col justify-between p-4 bg-zinc-950 sm:rounded-3xl border border-zinc-900 overflow-hidden">
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-2">
          <h3 className="text-md font-bold tracking-wider text-zinc-400">SNAP INSTANT</h3>
          <button 
            onClick={handleClose}
            className="p-2 rounded-full bg-zinc-900/60 hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors"
            disabled={sending}
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Viewport Area */}
        <div className="relative flex-1 bg-zinc-900 rounded-2xl overflow-hidden flex items-center justify-center border border-zinc-900 shadow-inner">
          {!capturedDataUrl ? (
            // Live video stream
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {!cameraActive && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">
                  <Loader2 className="size-8 animate-spin text-zinc-500" />
                </div>
              )}
            </>
          ) : (
            // Preview snapped WebP image
            <>
              <img
                src={capturedDataUrl}
                alt="Snapped frame"
                className="w-full h-full object-cover"
              />
              
              {/* Countdown / Sending overlay */}
              {countdown !== null && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4 text-center">
                  <div className="relative flex items-center justify-center size-24 mb-4">
                    {/* Ring timer animation effect */}
                    <span className="absolute inset-0 rounded-full border-4 border-[#7c3aed]/20" />
                    <span className="absolute inset-0 rounded-full border-4 border-t-[#7c3aed] animate-spin" />
                    <span className="text-3xl font-black text-white">{countdown}s</span>
                  </div>
                  <h4 className="text-lg font-bold text-white mb-2">Sending Instant Snap</h4>
                  <p className="text-xs text-zinc-400 max-w-xs mb-6">
                    Delivering to {audience === "CLOSE_FRIENDS" ? "Close Friends" : "Friends"}
                  </p>
                  
                  <Button
                    onClick={handleUndo}
                    variant="outline"
                    className="border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800 gap-2 font-bold px-6 py-5 rounded-xl hover:text-white"
                  >
                    <Undo2 className="size-4" />
                    Undo Send
                  </Button>
                </div>
              )}

              {sending && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                  <Loader2 className="size-8 animate-spin text-[#7c3aed] mb-3" />
                  <p className="text-sm font-semibold text-zinc-300">Uploading snap...</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Bottom Control Actions */}
        <div className="pt-4 flex flex-col items-center gap-4">
          {!capturedDataUrl ? (
            <>
              {/* Audience selection toggle */}
              <div className="flex bg-zinc-900/60 p-1 rounded-xl border border-zinc-900 gap-1 select-none">
                <button
                  onClick={() => setAudience("FRIENDS")}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    audience === "FRIENDS"
                      ? "bg-zinc-800 text-white"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <Users className="size-3.5" />
                  Friends
                </button>
                <button
                  onClick={() => setAudience("CLOSE_FRIENDS")}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    audience === "CLOSE_FRIENDS"
                      ? "bg-green-500/10 text-green-400 border border-green-500/20"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <Star className="size-3.5 fill-green-400 text-green-400" />
                  Close Friends
                </button>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between w-full px-6">
                {/* Dummy placeholder for layout alignment */}
                <div className="size-10" />

                {/* Shutter capture button */}
                <button
                  onClick={handleCapture}
                  className="flex items-center justify-center size-20 rounded-full border-4 border-white/60 bg-white hover:bg-zinc-100 active:scale-95 transition-all shadow-lg"
                  title="Capture Snap"
                >
                  <div className="size-16 rounded-full border-2 border-zinc-950/20" />
                </button>

                {/* Flip camera button */}
                <button
                  onClick={() => setFacingMode((prev) => (prev === "user" ? "environment" : "user"))}
                  className="flex items-center justify-center size-10 rounded-full bg-zinc-900/60 hover:bg-zinc-900 text-zinc-300 hover:text-white transition-colors"
                  title="Flip Camera"
                >
                  <RotateCw className="size-5" />
                </button>
              </div>
            </>
          ) : (
            // Empty placeholder to align height during countdown preview
            <div className="h-[68px]" />
          )}
        </div>

      </div>
    </div>
  );
}

function Loader2({ className }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
