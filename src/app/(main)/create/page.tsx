"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/app/(main)/SessionProvider";
import UserAvatar from "@/components/UserAvatar";
import { useSubmitPostMutation } from "@/components/posts/editor/mutations";
import useMediaUpload from "@/components/posts/editor/useMediaUpload";
import { useToast } from "@/components/ui/use-toast";
import { 
  X, Globe, ChevronDown, MoreHorizontal, Image as ImageIcon, 
  CheckSquare, Camera, RotateCw, Mic, MicOff, Video as VideoIcon, 
  VideoOff, Smartphone, Calendar, Share2, Sparkles, Music, 
  Play, Loader2, Pencil, Trash2, Check, ArrowRight, Clock, AlignLeft,
  ArrowLeft, Edit3, Smile, FileText, CheckCircle2, Lock, AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MediaAsset {
  id: string;
  uri: string;
  mediaType: "IMAGE" | "VIDEO";
  duration?: string;
}

// Persistent session cache to query real local media files chosen via the browser
let sessionGalleryAssets: MediaAsset[] = [];

const SIMULATED_COMMENTS = [
  "Wow, nice stream!",
  "Great to see you live, AIM News!",
  "What is the topic today?",
  "Love from California! ❤️",
  "Is this public?",
  "Can you answer my question?",
  "Amazing setup",
  "Hello from India! 🇮🇳",
  "Looking good!",
  "End stream soon?",
];

export default function CreatePage() {
  const router = useRouter();
  const { user } = useSession();
  const { toast } = useToast();
  const submitMutation = useSubmitPostMutation();

  // Wizard state machine
  const [creatorStep, setCreatorStep] = useState<"composer" | "trimmer" | "shortEditor">("composer");
  
  // Trimmer states
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
  const [trimmedDuration, setTrimmedDuration] = useState(2.0);
  const [predefinedLength, setPredefinedLength] = useState<"15 s" | "20 s" | "30 s">("15 s");
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Short Editor states
  const [activeFilter, setActiveFilter] = useState<"none" | "grayscale" | "sepia" | "hue-rotate" | "invert">("none");
  const [showTextOverlay, setShowTextOverlay] = useState(false);
  const [showStickerOverlay, setShowStickerOverlay] = useState(false);

  // Bottom selector modes
  const modes = ["Video", "Short", "Live", "Post"] as const;
  type CreatorMode = typeof modes[number];
  const [activeMode, setActiveMode] = useState<CreatorMode>("Post");

  // Post mode states
  const [postText, setPostText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const permissionInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Real local media gallery list loaded dynamically from device database/file chooser
  const [galleryAssets, setGalleryAssets] = useState<MediaAsset[]>([]);

  // Emulated Photo Permissions & Local Gallery states
  const [galleryPermission, setGalleryPermission] = useState<"prompt" | "all" | "limited" | "denied">("prompt");
  const [limitedAccessibleIds, setLimitedAccessibleIds] = useState<string[]>([]);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showLimitedAccessSelector, setShowLimitedAccessSelector] = useState(false);
  
  // Gallery view overlay states
  const [showGalleryView, setShowGalleryView] = useState(false);
  const [selectedGalleryIds, setSelectedGalleryIds] = useState<string[]>([]);

  // Media upload hook from project setup (used only for native camera fallback)
  const {
    startUpload,
    attachments,
    setAttachments,
    isUploading,
    uploadProgress,
    removeAttachment,
    reset: resetUploads,
  } = useMediaUpload();

  // Camera states (for Short and Live modes)
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoHidden, setIsVideoHidden] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Short mode states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const recordingTimerRef = useRef<any>(null);

  // Live mode states
  const [liveStarted, setLiveStarted] = useState(false);
  const [liveComments, setLiveComments] = useState<string[]>([]);
  const [liveViews, setLiveViews] = useState(100);
  const liveTimerRef = useRef<any>(null);

  // Video mode dropdown states
  const [showVideosDropdown, setShowVideosDropdown] = useState(false);
  const [videoDropdownSelection, setVideoDropdownSelection] = useState("Videos");

  useEffect(() => {
    document.body.classList.add("route-create-active");
    return () => {
      document.body.classList.remove("route-create-active");
      stopCamera();
    };
  }, []);

  // Control camera stream based on mode
  useEffect(() => {
    if (creatorStep === "composer" && (activeMode === "Short" || activeMode === "Live")) {
      startCamera();
    } else {
      stopCamera();
    }
  }, [activeMode, facingMode, creatorStep]);

  // Load assets on mount / permission state change (checks native bridge or session cache)
  useEffect(() => {
    const loadAssets = async () => {
      // 1. Check for injected Android MediaStore bridge
      if (typeof window !== "undefined" && (window as any).AndroidMediaStoreBridge) {
        try {
          const nativeData = await (window as any).AndroidMediaStoreBridge.queryMedia();
          const parsed = JSON.parse(nativeData) as MediaAsset[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            setGalleryAssets(parsed);
            return;
          }
        } catch (e) {
          console.error("Native MediaStore bridge query failed:", e);
        }
      }
      
      // 2. Otherwise load session-stored media assets
      setGalleryAssets(sessionGalleryAssets);
    };

    loadAssets();
  }, [galleryPermission]);

  const startCamera = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      // Try video and audio
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: true,
        });
      } catch {
        // Fallback to video only if audio is blocked or unavailable
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: false,
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err) {
      console.error("Camera access failed:", err);
      toast({
        variant: "destructive",
        description: "Could not access camera. Please check browser permissions.",
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const toggleFlip = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  const toggleMute = () => {
    setIsMuted((prev) => {
      const text = !prev;
      if (streamRef.current) {
        streamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = !text;
        });
      }
      return text;
    });
  };

  const toggleHideVideo = () => {
    setIsVideoHidden((prev) => {
      const text = !prev;
      if (streamRef.current) {
        streamRef.current.getVideoTracks().forEach((track) => {
          track.enabled = !text;
        });
      }
      return text;
    });
  };

  const handleClose = () => {
    router.back();
  };

  // Gallery opening logic checking permissions
  const openGallery = () => {
    if (galleryPermission === "prompt") {
      setShowPermissionModal(true);
    } else {
      setShowGalleryView(true);
    }
  };

  // Helper to filter media according to permissions (displays actual local files only)
  const getAccessibleMedia = () => {
    if (galleryPermission === "all") {
      return galleryAssets;
    }
    if (galleryPermission === "limited") {
      return galleryAssets.filter(item => limitedAccessibleIds.includes(item.id));
    }
    return []; // Denied or prompt
  };

  // Handle files selected via the native-looking permissions file input triggers
  const handlePermissionFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newAssets: MediaAsset[] = files
      .filter((file) => file.type.startsWith("image/") || file.type.startsWith("video/"))
      .map((file) => ({
        id: `local-${Date.now()}-${Math.random()}`,
        uri: URL.createObjectURL(file),
        mediaType: file.type.startsWith("video/") ? ("VIDEO" as const) : ("IMAGE" as const),
        duration: file.type.startsWith("video/") ? "0:05" : undefined,
      }));

    if (newAssets.length === 0) return;

    // Append to global cache and set component state
    sessionGalleryAssets = [...newAssets, ...sessionGalleryAssets];
    setGalleryAssets(sessionGalleryAssets);

    if (showLimitedAccessSelector) {
      setLimitedAccessibleIds((prev) => [...prev, ...newAssets.map(a => a.id)]);
      setGalleryPermission("limited");
      setShowLimitedAccessSelector(false);
    } else {
      setGalleryPermission("all");
    }

    setShowGalleryView(true);
    e.target.value = "";
  };

  // Handle files chosen from native system dialog (fallback upload system)
  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    startUpload(files);
    e.target.value = "";
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Publish Post Handler (Strictly does not upload gallery items)
  const handlePublish = async () => {
    if (!postText.trim() && selectedGalleryIds.length === 0 && attachments.length === 0) return;

    setIsSubmitting(true);
    try {
      let finalMediaIds: string[] = [];

      // Only upload actual files that were explicitly selected via the camera import (attachments)
      if (attachments.length > 0) {
        finalMediaIds = attachments.map(a => a.mediaId).filter(Boolean) as string[];
      }

      await submitMutation.mutateAsync({
        content: postText,
        mediaIds: finalMediaIds,
        audience: "public",
      });

      // Clear states and redirect
      setPostText("");
      setSelectedGalleryIds([]);
      resetUploads();
      setCreatorStep("composer");
      router.push("/");
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        description: "Failed to publish post. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Short Mode: record simulation
  const handleShortRecordToggle = () => {
    if (isRecording) {
      // Stop recording
      clearInterval(recordingTimerRef.current);
      setIsRecording(false);
      setRecordingProgress(0);
      captureWebcamSnapAndSwitch();
    } else {
      // Start recording
      setIsRecording(true);
      setRecordingProgress(0);
      const startTime = Date.now();
      recordingTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min((elapsed / 15000) * 100, 100);
        setRecordingProgress(progress);
        
        if (elapsed >= 15000) {
          clearInterval(recordingTimerRef.current);
          setIsRecording(false);
          setRecordingProgress(0);
          captureWebcamSnapAndSwitch();
        }
      }, 50);
    }
  };

  // Capture actual camera frame as attachment and switch to Post mode
  const captureWebcamSnapAndSwitch = () => {
    if (!videoRef.current || !streamRef.current) {
      // Fallback: select first gallery asset if any
      const assets = getAccessibleMedia();
      if (assets.length > 0) {
        setSelectedAsset(assets[0]);
        setCreatorStep("trimmer");
      } else {
        toast({ description: "Please load photos via gallery to capture snaps!" });
      }
      return;
    }

    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const capturedAsset: MediaAsset = {
              id: `capture-${Date.now()}`,
              uri: url,
              mediaType: "IMAGE",
            };
            setSelectedAsset(capturedAsset);
            setCreatorStep("trimmer");
          }
        }, "image/jpeg", 0.95);
      }
    } catch (e) {
      console.error(e);
      const assets = getAccessibleMedia();
      if (assets.length > 0) {
        setSelectedAsset(assets[0]);
        setCreatorStep("trimmer");
      }
    }
  };

  // Live Mode next button click
  const handleLiveNext = () => {
    setLiveStarted(true);
    setLiveComments(["Live broadcast starting..."]);
    setLiveViews(Math.floor(Math.random() * 200) + 120);

    // Simulate chat comments pouring in
    let commentIdx = 0;
    liveTimerRef.current = setInterval(() => {
      setLiveComments(prev => [...prev, SIMULATED_COMMENTS[commentIdx % SIMULATED_COMMENTS.length]]);
      setLiveViews(v => v + Math.floor(Math.random() * 20) - 8);
      commentIdx++;
    }, 2000);
  };

  const handleEndLive = () => {
    if (liveTimerRef.current) {
      clearInterval(liveTimerRef.current);
    }
    setLiveStarted(false);
    setLiveComments([]);
    toast({
      description: "Live broadcast ended successfully.",
    });
  };

  // Video Mode dropdown select
  const handleSelectVideoFromGrid = (video: MediaAsset) => {
    setSelectedAsset(video);
    setCreatorStep("trimmer");
  };

  // Trimmer Slider Physics
  const handleTrimmerDrag = (clientX: number) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    
    const maxVal = predefinedLength === "30 s" ? 30 : predefinedLength === "20 s" ? 20 : 15;
    const val = 1.0 + (pct / 100) * (maxVal - 1.0);
    setTrimmedDuration(val);
  };

  const onTimelineMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleTrimmerDrag(e.clientX);
  };

  const onTimelineTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    const touch = e.touches[0];
    handleTrimmerDrag(touch.clientX);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      handleTrimmerDrag(e.clientX);
    };
    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, predefinedLength]);

  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      const touch = e.touches[0];
      handleTrimmerDrag(touch.clientX);
    };
    const handleTouchEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("touchmove", handleTouchMove, { passive: true });
      window.addEventListener("touchend", handleTouchEnd);
    }
    return () => {
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging, predefinedLength]);

  // Predefined length cycler
  const cyclePredefinedLength = () => {
    setPredefinedLength((prev) => {
      if (prev === "15 s") {
        setTrimmedDuration(20.0);
        return "20 s";
      }
      if (prev === "20 s") {
        setTrimmedDuration(30.0);
        return "30 s";
      }
      setTrimmedDuration(15.0);
      return "15 s";
    });
  };

  return (
    <div className="min-h-screen w-full bg-black flex flex-col justify-between select-none relative">
      {/* Inject styling overrides to remove layout sidebars/padding constraints */}
      <style jsx global>{`
        .route-create-active .main-content-wrapper {
          padding-left: 0 !important;
          padding-bottom: 0 !important;
          max-width: 100% !important;
        }
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-none {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Hidden file input for native camera file selections */}
      <input
        type="file"
        multiple
        accept="image/*,video/*"
        ref={fileInputRef}
        onChange={handleFilesSelected}
        className="hidden"
      />

      {/* Hidden file input for emulated photos permissions browser selector */}
      <input 
        type="file"
        multiple
        accept="image/*,video/*"
        ref={permissionInputRef}
        onChange={handlePermissionFilesSelected}
        className="hidden"
      />

      {/* Main Composer Area */}
      <div className="flex flex-col flex-grow w-full max-w-[600px] mx-auto bg-black text-white relative">
        
        {/* ==================== WIZARD STEP 1: COMPOSER ==================== */}
        {creatorStep === "composer" && (
          <div className="flex flex-col flex-grow w-full h-full relative">
            
            {/* 1.1 POST MODE */}
            {activeMode === "Post" && (
              <div className="flex flex-col flex-grow w-full h-full relative">
                {/* Header */}
                <header className="h-14 flex items-center justify-between px-4 bg-black select-none z-10 shrink-0 border-b border-[#1A1A1A]">
                  <button 
                    onClick={handleClose}
                    className="p-2 hover:bg-[#272727] rounded-full transition-colors flex items-center justify-center"
                    title="Cancel"
                  >
                    <X className="size-6 text-white" />
                  </button>
                  
                  <div className="flex-1 pl-4 text-left">
                    <span className="text-lg font-bold text-white tracking-wide">Create post</span>
                  </div>
                  
                  <button 
                    onClick={handlePublish}
                    disabled={isSubmitting || isUploading || (!postText.trim() && selectedGalleryIds.length === 0 && attachments.length === 0)}
                    className={cn(
                      "px-[18px] py-1.5 rounded-full font-bold text-sm transition-all select-none",
                      (!postText.trim() && selectedGalleryIds.length === 0 && attachments.length === 0) || isSubmitting || isUploading
                        ? "bg-[#272727] text-[#71717A] cursor-not-allowed opacity-50"
                        : "bg-[#272727] text-white hover:bg-[#3f3f3f]"
                    )}
                  >
                    {isSubmitting ? (
                      <Loader2 className="size-4 animate-spin text-white" />
                    ) : (
                      "Post"
                    )}
                  </button>
                </header>

                {/* User details row */}
                <div className="flex items-start gap-3.5 px-4 py-3 select-none shrink-0">
                  <UserAvatar 
                    avatarUrl={user?.avatarUrl} 
                    size={40} 
                    className="size-10 shrink-0 border border-zinc-800 rounded-full" 
                  />
                  <div className="flex flex-col gap-1">
                    <span className="text-white text-[15px] font-bold tracking-tight">
                      {user?.displayName || user?.username || "AIM News"}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {/* Public visibility pill */}
                      <div 
                        className="h-7 px-3 flex items-center gap-1.5 bg-[#272727] hover:bg-[#3f3f3f] active:bg-[#4f4f4f] rounded-full text-white text-[13px] font-semibold transition-colors cursor-pointer select-none"
                      >
                        <Globe className="size-3.5 text-white" />
                        <span>Public</span>
                        <ChevronDown className="size-3.5 text-white" />
                      </div>
                      
                      {/* Options menu */}
                      <div 
                        className="size-7 flex items-center justify-center bg-[#272727] hover:bg-[#3f3f3f] active:bg-[#4f4f4f] rounded-full text-white transition-colors cursor-pointer select-none"
                      >
                        <MoreHorizontal className="size-4" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Text Editor Area */}
                <div className="flex-grow px-5 py-2 flex flex-col justify-start w-full relative">
                  <textarea
                    value={postText}
                    onChange={(e) => setPostText(e.target.value)}
                    className="w-full bg-transparent text-white placeholder-[#8e8e93] text-[18px] leading-[25px] font-normal resize-none focus:outline-none"
                    placeholder="What's on your mind?"
                    rows={8}
                  />
                </div>

                {/* Selected Gallery Items Draft List (strictly local - zero upload requests) */}
                {selectedGalleryIds.length > 0 && (
                  <div className="px-5 py-3 border-t border-[#1A1A1A]/40 bg-black select-none shrink-0">
                    <div className="flex items-center gap-3 overflow-x-auto scrollbar-none py-1">
                      {selectedGalleryIds.map((id) => {
                        const media = galleryAssets.find(m => m.id === id);
                        if (!media) return null;
                        return (
                          <div 
                            key={id} 
                            className="relative w-28 h-28 rounded-xl overflow-hidden border border-zinc-800 shrink-0"
                          >
                            <img 
                              src={media.uri} 
                              className="w-full h-full object-cover animate-fade-in" 
                              alt="Draft attachment" 
                            />
                            {media.mediaType === "VIDEO" && (
                              <div className="absolute bottom-1.5 right-1.5 bg-black/60 px-1 py-0.5 rounded text-[9px] text-white flex items-center gap-0.5 font-semibold">
                                <Play className="size-2 fill-white text-white" />
                                <span>{media.duration || "0:05"}</span>
                              </div>
                            )}
                            {/* Remove item button */}
                            <button
                              onClick={() => {
                                setSelectedGalleryIds(prev => prev.filter(gid => gid !== id));
                              }}
                              className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-all"
                            >
                              <X className="size-3.5 stroke-[2.5]" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Attachments preview container if importing via native camera */}
                {attachments.length > 0 && (
                  <div className="px-4 py-2 flex flex-wrap gap-2.5">
                    {attachments.map((att, idx) => (
                      <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-zinc-800">
                        <img src={att.previewUrl} className="w-full h-full object-cover" alt="Attachment" />
                        {att.isUploading && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <Loader2 className="size-4 animate-spin text-white" />
                          </div>
                        )}
                        <button
                          onClick={() => removeAttachment(att.file.name)}
                          className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 transition-all"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Gallery Strip Container */}
                <div className="w-full flex flex-col bg-black shrink-0 border-t border-[#1A1A1A]">
                  
                  {/* Gallery Media Strip */}
                  <div className="h-[96px] py-1 bg-black flex items-center gap-2 overflow-x-auto scrollbar-none px-4 select-none">
                    
                    {/* Dash camera button: opens the custom gallery browser overlay */}
                    <button 
                      onClick={openGallery}
                      className="w-20 h-20 shrink-0 bg-[#1A1A1A] hover:bg-[#2A2A2A] rounded-[8px] flex flex-col items-center justify-center transition-colors border border-dashed border-zinc-800"
                      title="Open Gallery"
                    >
                      <Camera className="size-5 text-white/80" />
                    </button>

                    {galleryPermission === "denied" ? (
                      <div className="flex-1 flex items-center justify-between px-3 text-xs text-zinc-400">
                        <span>Photos access denied.</span>
                        <button 
                          onClick={() => setShowPermissionModal(true)} 
                          className="text-sky-500 font-bold hover:underline"
                        >
                          Grant Access
                        </button>
                      </div>
                    ) : galleryPermission === "prompt" ? (
                      <div className="flex-1 flex items-center justify-between px-3 text-xs text-zinc-400">
                        <span>Access photos to select media.</span>
                        <button 
                          onClick={() => setShowPermissionModal(true)} 
                          className="text-sky-500 font-bold hover:underline"
                        >
                          Allow Access
                        </button>
                      </div>
                    ) : (
                      getAccessibleMedia().map((asset) => {
                        const isSelected = selectedGalleryIds.includes(asset.id);
                        return (
                          <div
                            key={asset.id}
                            onClick={() => {
                              setSelectedGalleryIds(prev => 
                                prev.includes(asset.id) 
                                  ? prev.filter(id => id !== asset.id)
                                  : [...prev, asset.id]
                              );
                            }}
                            className={cn(
                              "w-20 h-20 shrink-0 rounded-[8px] overflow-hidden relative cursor-pointer select-none transition-all",
                              isSelected ? "ring-2 ring-white scale-95" : "opacity-90 hover:opacity-100"
                            )}
                          >
                            <img
                              src={asset.uri}
                              alt="Gallery item"
                              className="w-full h-full object-cover select-none pointer-events-none"
                            />
                            {asset.mediaType === "VIDEO" && (
                              <div className="absolute bottom-1 right-1 bg-black/70 px-1 py-0.5 rounded text-[9px] text-white flex items-center gap-0.5">
                                <Play className="size-2 fill-white text-white" />
                                <span>{asset.duration || "0:05"}</span>
                              </div>
                            )}
                            {isSelected && (
                              <div className="absolute inset-0 bg-black/25 flex items-center justify-center select-none">
                                <div className="bg-white rounded-full p-1 text-black">
                                  <Check className="size-3.5 stroke-[3]" />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Bottom actions row */}
                  <div className="h-14 flex items-center justify-start gap-4 px-4 bg-black border-t border-[#1A1A1A] pb-safe shrink-0">
                    <button 
                      className="bg-[#272727] p-2 rounded-full text-white flex items-center justify-center transition-all select-none"
                      title="Caption Contest"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className="size-[22px]">
                        <line x1="6" y1="4" x2="6" y2="20" />
                        <line x1="6" y1="8" x2="18" y2="8" />
                        <line x1="18" y1="6" x2="18" y2="10" />
                        <line x1="6" y1="12" x2="15" y2="12" />
                        <line x1="15" y1="10" x2="15" y2="14" />
                        <line x1="6" y1="16" x2="12" y2="16" />
                        <line x1="12" y1="14" x2="12" y2="18" />
                      </svg>
                    </button>

                    <button 
                      className="p-2 text-zinc-400 opacity-60 hover:opacity-85 flex items-center justify-center transition-all select-none cursor-pointer"
                      onClick={openGallery}
                      title="Image"
                    >
                      <ImageIcon className="size-[22px]" />
                    </button>

                    <button 
                      className="p-2 text-zinc-400 opacity-60 hover:opacity-85 flex items-center justify-center transition-all select-none cursor-pointer"
                      onClick={() => toast({ description: "Quiz features coming soon!" })}
                      title="Quiz"
                    >
                      <CheckSquare className="size-[22px]" />
                    </button>
                  </div>

                </div>
              </div>
            )}

            {/* 1.2 VIDEO MODE */}
            {activeMode === "Video" && (
              <div className="flex flex-col flex-grow w-full h-full relative">
                {/* Header */}
                <header className="h-14 flex items-center justify-between px-4 bg-black select-none z-10 shrink-0 border-b border-[#1A1A1A]">
                  <div className="relative">
                    <button 
                      onClick={() => setShowVideosDropdown(!showVideosDropdown)}
                      className="flex items-center gap-1.5 text-lg font-bold text-white pl-1"
                    >
                      <span>{videoDropdownSelection}</span>
                      <ChevronDown className="size-5 text-white" />
                    </button>

                    {showVideosDropdown && (
                      <div className="absolute left-0 mt-2 bg-[#212121] border border-zinc-800 rounded-xl overflow-hidden shadow-2xl z-50 w-44">
                        {["Videos", "Shorts", "Uploads"].map((opt) => (
                          <button
                            key={opt}
                            onClick={() => {
                              setVideoDropdownSelection(opt);
                              setShowVideosDropdown(false);
                            }}
                            className={cn(
                              "w-full text-left px-4 py-3.5 text-sm font-semibold hover:bg-zinc-800 transition-colors",
                              videoDropdownSelection === opt ? "text-white bg-zinc-800/40" : "text-zinc-300"
                            )}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={handleClose}
                    className="p-2 hover:bg-[#272727] rounded-full transition-colors flex items-center justify-center"
                    title="Close"
                  >
                    <X className="size-6 text-white" />
                  </button>
                </header>

                {/* Video Grid display */}
                <div className="flex-grow overflow-y-auto flex flex-col bg-black">
                  {galleryPermission === "denied" || galleryPermission === "prompt" ? (
                    <div className="flex-grow flex flex-col items-center justify-center px-6 text-center gap-4 py-12">
                      <div className="size-16 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-500 border border-zinc-800">
                        <VideoIcon className="size-8 animate-pulse text-zinc-400" />
                      </div>
                      <div className="space-y-1.5">
                        <h4 className="font-bold text-white text-md">Access to Videos Required</h4>
                        <p className="text-xs text-zinc-400 max-w-xs">
                          Allow access to your device&apos;s photos and videos in order to select and edit video files.
                        </p>
                      </div>
                      <button
                        onClick={() => setShowPermissionModal(true)}
                        className="bg-white text-black font-bold text-xs px-5 py-2.5 rounded-full hover:bg-zinc-150 transition-colors shadow-lg"
                      >
                        Grant Access
                      </button>
                    </div>
                  ) : getAccessibleMedia().filter(item => item.mediaType === "VIDEO").length === 0 ? (
                    <div className="flex-grow flex flex-col items-center justify-center px-6 text-center gap-4 py-12">
                      <div className="size-16 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-500 border border-zinc-800">
                        <VideoIcon className="size-8 text-zinc-400" />
                      </div>
                      <div className="space-y-1.5">
                        <h4 className="font-bold text-white text-md">No Videos Found</h4>
                        <p className="text-xs text-zinc-400 max-w-xs">
                          No local video files have been imported. Click below to choose video files from your device.
                        </p>
                      </div>
                      <button
                        onClick={() => permissionInputRef.current?.click()}
                        className="bg-white text-black font-bold text-xs px-5 py-2.5 rounded-full hover:bg-zinc-150 transition-colors shadow-lg"
                      >
                        Select Videos
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-0.5 p-0.5 scrollbar-none">
                      {getAccessibleMedia().filter(item => item.mediaType === "VIDEO").map((vid) => (
                        <div
                          key={vid.id}
                          onClick={() => handleSelectVideoFromGrid(vid)}
                          className="aspect-square relative group cursor-pointer select-none bg-zinc-950 overflow-hidden"
                        >
                          <img
                            src={vid.uri}
                            alt="Video thumbnail"
                            className="w-full h-full object-cover group-hover:scale-105 transition-all"
                          />
                          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                          <div className="absolute bottom-1.5 right-1.5 bg-black/60 px-1 py-0.5 rounded text-[10px] text-white font-bold tracking-wider">
                            {vid.duration || "0:05"}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 1.3 SHORT MODE */}
            {activeMode === "Short" && (
              <div className="flex flex-col flex-grow w-full h-full relative overflow-hidden bg-black">
                <div className="absolute inset-0 z-0">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {!cameraActive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/90 z-10">
                      <Loader2 className="size-8 animate-spin text-zinc-500" />
                    </div>
                  )}
                </div>

                {/* Overlay Elements */}
                <div className="absolute inset-x-0 top-0 z-10 p-4 flex flex-col gap-2">
                  {isRecording && (
                    <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden mb-2">
                      <div 
                        className="bg-red-600 h-full rounded-full transition-all duration-75"
                        style={{ width: `${recordingProgress}%` }}
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between w-full">
                    <button 
                      onClick={handleClose}
                      className="p-2 bg-black/40 hover:bg-black/60 rounded-full transition-colors flex items-center justify-center border border-white/5"
                    >
                      <X className="size-6 text-white" />
                    </button>

                    <div className="flex items-center gap-1.5 px-4 py-2 bg-black/40 border border-white/5 backdrop-blur-md rounded-full text-white text-xs font-bold cursor-pointer hover:bg-black/60 select-none">
                      <Music className="size-3.5" />
                      <span>Add sound</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <button className="p-2 bg-black/40 hover:bg-black/60 rounded-full transition-colors flex items-center justify-center border border-white/5">
                        <Sparkles className="size-5 text-white" />
                      </button>

                      <div className="flex items-center gap-1 px-3 py-1 bg-green-500/90 border border-green-400 rounded-full shadow-lg">
                        <VideoIcon className="size-3.5 text-white" />
                        <Mic className="size-3.5 text-white" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right stack panel */}
                <div className="absolute right-4 top-24 z-10 flex flex-col gap-5 items-center">
                  <button onClick={toggleFlip} className="flex flex-col items-center gap-1 group">
                    <div className="size-10 bg-black/40 hover:bg-black/60 border border-white/5 rounded-full flex items-center justify-center transition-colors">
                      <RotateCw className="size-5 text-white" />
                    </div>
                  </button>

                  <button className="flex flex-col items-center gap-1">
                    <div className="size-10 bg-black/40 hover:bg-black/60 border border-white/5 rounded-full flex items-center justify-center transition-colors">
                      <Clock className="size-5 text-white" />
                    </div>
                  </button>

                  <div className="flex flex-col items-center justify-center size-10 bg-black/40 border border-white/5 rounded-full font-bold text-xs select-none">
                    15s
                  </div>

                  <button className="flex flex-col items-center gap-1">
                    <div className="size-10 bg-black/40 hover:bg-black/60 border border-white/5 rounded-full flex items-center justify-center transition-colors">
                      <Sparkles className="size-5 text-white" />
                    </div>
                  </button>

                  <div className="flex flex-col items-center justify-center size-10 bg-black/40 border border-white/5 rounded-full font-bold text-xs select-none">
                    1x
                  </div>

                  <button className="flex flex-col items-center gap-1">
                    <div className="size-10 bg-black/40 hover:bg-black/60 border border-white/5 rounded-full flex items-center justify-center transition-colors">
                      <AlignLeft className="size-5 text-white" />
                    </div>
                  </button>

                  <button className="flex flex-col items-center gap-1">
                    <div className="size-10 bg-black/40 hover:bg-black/60 border border-white/5 rounded-full flex items-center justify-center transition-colors">
                      <ChevronDown className="size-5 text-white" />
                    </div>
                  </button>
                </div>

                {/* Bottom Section controls */}
                <div className="absolute inset-x-0 bottom-2 z-10 px-6 pb-4 flex items-center justify-between">
                  {/* Gallery add button trigger */}
                  <button 
                    onClick={openGallery}
                    className="flex flex-col items-center gap-1"
                  >
                    <div className="size-12 rounded-lg overflow-hidden border-2 border-white/80 bg-zinc-900 shadow-md">
                      <img 
                        src={galleryAssets.length > 0 ? galleryAssets[0].uri : "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%2024%2024'%20fill%3D'none'%20stroke%3D'%23555'%20stroke-width%3D'2'%3E%3Crect%20x%3D'3'%20y%3D'3'%20width%3D'18'%20height%3D'18'%20rx%3D'2'%20ry%3D'2'%2F%3E%3Ccircle%20cx%3D'8.5'%20cy%3D'8.5'%20r%3D'1.5'%2F%3E%3Cpolyline%20points%3D'21%2015%2016%2010%205%2021'%2F%3E%3C%2Fsvg%3E"} 
                        className="w-full h-full object-cover animate-fade-in" 
                        alt="Gallery icon"
                      />
                    </div>
                    <span className="text-[11px] font-bold text-white tracking-wide">Add</span>
                  </button>

                  <button 
                    onClick={handleShortRecordToggle}
                    className={cn(
                      "flex items-center justify-center size-20 rounded-full border-4 border-white select-none transition-all shadow-xl active:scale-95",
                      isRecording ? "scale-110" : ""
                    )}
                  >
                    <div 
                      className={cn(
                        "bg-red-600 transition-all duration-300",
                        isRecording 
                          ? "size-8 rounded-lg" 
                          : "size-14 rounded-full"
                      )}
                    />
                  </button>

                  <div className="size-12" />
                </div>
              </div>
            )}

            {/* 1.4 LIVE MODE */}
            {activeMode === "Live" && (
              <div className="flex flex-col flex-grow w-full h-full relative overflow-hidden bg-black">
                <div className="absolute inset-0 z-0">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {isVideoHidden && (
                    <div className="absolute inset-0 bg-zinc-950 flex flex-col items-center justify-center gap-2">
                      <VideoOff className="size-12 text-zinc-650" strokeWidth={1.5} />
                      <span className="text-zinc-500 font-bold text-sm">Video feed disabled</span>
                    </div>
                  )}
                  {!cameraActive && !isVideoHidden && (
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/90 z-10">
                      <Loader2 className="size-8 animate-spin text-zinc-500" />
                    </div>
                  )}
                </div>

                <div className="absolute inset-x-0 top-0 z-10 p-4 flex items-center justify-between">
                  <button 
                    onClick={liveStarted ? handleEndLive : handleClose}
                    className="p-2 bg-black/40 hover:bg-black/60 rounded-full transition-colors border border-white/5"
                  >
                    <X className="size-6 text-white" />
                  </button>

                  {liveStarted && (
                    <div className="flex items-center gap-2.5">
                      <span className="bg-red-600 text-white font-bold text-[11px] px-2 py-0.5 rounded tracking-widest flex items-center gap-1 select-none animate-pulse">
                        <span className="size-1.5 rounded-full bg-white block" />
                        LIVE
                      </span>
                      <span className="bg-black/40 border border-white/5 backdrop-blur-md px-2 py-0.5 rounded text-[11px] font-bold text-white select-none">
                        👁 {liveViews}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2.5">
                    <button className="p-2 bg-black/40 hover:bg-black/60 rounded-full transition-colors border border-white/5">
                      <Calendar className="size-5 text-white" />
                    </button>
                    <button className="p-2 bg-black/40 hover:bg-black/60 rounded-full transition-colors border border-white/5">
                      <Share2 className="size-5 text-white" />
                    </button>
                  </div>
                </div>

                <div className="absolute right-4 top-20 z-10 flex flex-col gap-4 items-end">
                  <button onClick={toggleFlip} className="flex items-center gap-2 group">
                    <span className="text-[13px] font-bold text-white drop-shadow bg-black/30 px-2 py-0.5 rounded border border-white/5 opacity-85 group-hover:opacity-100 transition-opacity">Flip</span>
                    <div className="size-10 bg-black/45 border border-white/5 rounded-full flex items-center justify-center shadow-lg">
                      <RotateCw className="size-5 text-white" />
                    </div>
                  </button>

                  <button onClick={toggleMute} className="flex items-center gap-2 group">
                    <span className="text-[13px] font-bold text-white drop-shadow bg-black/30 px-2 py-0.5 rounded border border-white/5 opacity-85 group-hover:opacity-100 transition-opacity">
                      {isMuted ? "Unmute" : "Mute"}
                    </span>
                    <div className="size-10 bg-black/45 border border-white/5 rounded-full flex items-center justify-center shadow-lg">
                      {isMuted ? <MicOff className="size-5 text-white" /> : <Mic className="size-5 text-white" />}
                    </div>
                  </button>

                  <button onClick={toggleHideVideo} className="flex items-center gap-2 group">
                    <span className="text-[13px] font-bold text-white drop-shadow bg-black/30 px-2 py-0.5 rounded border border-white/5 opacity-85 group-hover:opacity-100 transition-opacity">
                      {isVideoHidden ? "Show video" : "Hide live video"}
                    </span>
                    <div className="size-10 bg-black/45 border border-white/5 rounded-full flex items-center justify-center shadow-lg">
                      {isVideoHidden ? <VideoOff className="size-5 text-white" /> : <VideoIcon className="size-5 text-white" />}
                    </div>
                  </button>

                  <button className="flex items-center gap-2 group">
                    <span className="text-[13px] font-bold text-white drop-shadow bg-black/30 px-2 py-0.5 rounded border border-white/5 opacity-85 group-hover:opacity-100 transition-opacity">Orientation</span>
                    <div className="size-10 bg-black/45 border border-white/5 rounded-full flex items-center justify-center shadow-lg">
                      <Smartphone className="size-5 text-white" />
                    </div>
                  </button>

                  <button className="flex items-center gap-2 group">
                    <span className="text-[13px] font-bold text-white drop-shadow bg-black/30 px-2 py-0.5 rounded border border-white/5 opacity-85 group-hover:opacity-100 transition-opacity">More</span>
                    <div className="size-10 bg-black/45 border border-white/5 rounded-full flex items-center justify-center shadow-lg">
                      <ChevronDown className="size-5 text-white" />
                    </div>
                  </button>
                </div>

                {!liveStarted ? (
                  <div className="absolute inset-x-0 bottom-4 z-10 px-4 flex flex-col gap-4 pb-4.5 bg-gradient-to-t from-black/60 to-transparent">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <UserAvatar 
                          avatarUrl={user?.avatarUrl} 
                          size={40} 
                          className="size-10 shrink-0 border border-zinc-800 rounded-full" 
                        />
                        <div className="flex flex-col text-left">
                          <span className="text-white text-sm font-bold">{user?.displayName || user?.username || "AIM News"} is live</span>
                          <span className="text-zinc-300 text-xs font-semibold">Public · Select audience (required)</span>
                        </div>
                      </div>

                      <button className="size-9 bg-black/45 border border-white/5 rounded-full flex items-center justify-center text-white">
                        <Pencil className="size-4" />
                      </button>
                    </div>

                    <button
                      onClick={handleLiveNext}
                      className="w-full bg-white text-black font-bold text-[16px] py-3.5 rounded-full shadow-lg hover:bg-zinc-150 transition-all select-none text-center block"
                    >
                      Next
                    </button>
                  </div>
                ) : (
                  <div className="absolute inset-x-0 bottom-4 z-10 px-4 pb-4.5 flex flex-col justify-end bg-gradient-to-t from-black/85 via-black/40 to-transparent max-h-[30vh]">
                    <div className="overflow-y-auto space-y-2 max-h-[22vh] scrollbar-none text-left mb-4">
                      {liveComments.map((com, index) => (
                        <div 
                          key={index} 
                          className="bg-black/50 border border-white/5 px-3 py-1.5 rounded-xl inline-block max-w-[85%] text-xs font-semibold text-zinc-100 animate-slide-up"
                        >
                          <span className="text-purple-400 font-bold mr-1">User_{index}:</span>
                          {com}
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={handleEndLive}
                      className="w-full bg-red-600 text-white font-bold text-[16px] py-3.5 rounded-full shadow-lg hover:bg-red-700 transition-all select-none text-center block"
                    >
                      End Live Stream
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Bottom Switcher */}
            <div className="h-16 flex items-center justify-center gap-6 bg-black border-t border-[#1A1A1A] px-4 select-none shrink-0 z-30">
              {modes.map((m) => {
                const isActive = activeMode === m;
                return (
                  <button
                    key={m}
                    onClick={() => {
                      if (liveStarted) {
                        handleEndLive();
                      }
                      setActiveMode(m);
                    }}
                    className={cn(
                      "text-[14px] font-bold tracking-wide transition-all px-5 py-2.5 rounded-full leading-none",
                      isActive 
                        ? "bg-[#272727] text-white" 
                        : "text-[#71717A] hover:text-white"
                    )}
                  >
                    {m}
                  </button>
                );
              })}
            </div>

          </div>
        )}

        {/* ==================== WIZARD STEP 2: VIDEO/PHOTO TRIMMER (Image 2) ==================== */}
        {creatorStep === "trimmer" && selectedAsset && (
          <div className="flex flex-col flex-grow w-full h-full bg-black relative select-none">
            {/* Header */}
            <header className="h-14 flex items-center justify-between px-4 bg-black select-none shrink-0 z-20">
              <button
                onClick={() => {
                  setCreatorStep("composer");
                  setShowGalleryView(true);
                }}
                className="p-2.5 bg-zinc-900/60 hover:bg-zinc-800 rounded-full flex items-center justify-center transition-colors"
                title="Back to Gallery"
              >
                <ArrowLeft className="size-5 text-white" />
              </button>

              {/* Sparkle Option Button */}
              <button className="flex items-center gap-2 bg-[#272727] hover:bg-[#3f3f3f] px-[18px] py-2 rounded-full border border-zinc-800 shadow-md">
                <Sparkles className="size-4.5 text-purple-400" />
                <span className="text-sm font-semibold text-white">Photo to video</span>
              </button>

              {/* Predefined length cycler */}
              <button
                onClick={cyclePredefinedLength}
                className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white text-sm font-bold px-[18px] py-2 rounded-full shadow-md transition-colors"
              >
                {predefinedLength}
              </button>
            </header>

            {/* Asset Preview Frame */}
            <div className="flex-1 flex items-center justify-center bg-black px-4 relative overflow-hidden">
              <div className="w-full max-w-[360px] aspect-[9/16] rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-900 relative shadow-2xl">
                {selectedAsset.mediaType === "VIDEO" ? (
                  <video
                    src={selectedAsset.uri}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={selectedAsset.uri}
                    alt="Preview asset"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            </div>

            {/* Trimming Control Panel */}
            <div className="bg-black px-4 pb-6 flex flex-col gap-5.5 select-none z-10 shrink-0">
              
              {/* Timeline Container */}
              <div className="relative w-full flex flex-col gap-2">
                <div 
                  ref={timelineRef}
                  onMouseDown={onTimelineMouseDown}
                  onTouchStart={onTimelineTouchStart}
                  className="h-16 w-full bg-zinc-900/60 rounded-xl overflow-hidden relative cursor-pointer select-none border border-zinc-800 flex items-center shadow-inner"
                >
                  {/* Filmstrip thumbnails preview */}
                  <div className="absolute inset-0 flex gap-0.5 opacity-40 pointer-events-none">
                    {Array.from({ length: 8 }).map((_, idx) => (
                      <div key={idx} className="flex-1 h-full overflow-hidden bg-zinc-950">
                        <img 
                          src={selectedAsset.uri} 
                          className="w-full h-full object-cover" 
                          alt="filmstrip frame" 
                        />
                      </div>
                    ))}
                  </div>

                  {/* Active segment overlay */}
                  <div 
                    className="absolute left-0 top-0 h-full border-y-[3.5px] border-l-[3.5px] border-white bg-white/10 flex items-center justify-end rounded-l-lg pointer-events-none"
                    style={{ 
                      width: `${Math.max(12, ((trimmedDuration - 1.0) / (predefinedLength === "30 s" ? 29 : predefinedLength === "20 s" ? 19 : 14)) * 100)}%` 
                    }}
                  >
                    {/* Width handle indicator */}
                    <div className="w-1.5 h-full bg-white rounded-r-md pointer-events-none" />
                  </div>

                  {/* Dynamic Time Flag Bubble */}
                  <div 
                    className="absolute bg-white text-black font-extrabold text-xs px-2.5 py-2.5 rounded-xl shadow-2xl flex items-center justify-center gap-1 border border-zinc-200 pointer-events-none transition-all select-none"
                    style={{ 
                      left: `calc(${Math.max(6, Math.min(88, ((trimmedDuration - 1.0) / (predefinedLength === "30 s" ? 29 : predefinedLength === "20 s" ? 19 : 14)) * 100))}% - 22px)` 
                    }}
                  >
                    <span>|</span>
                    <span>{trimmedDuration.toFixed(1)}s</span>
                    <span>|</span>
                  </div>
                </div>
              </div>

              {/* Bottom control row */}
              <div className="flex items-center justify-between w-full">
                <span className="text-zinc-400 font-semibold text-[13px] tracking-wide pl-1.5">
                  Drag to adjust video
                </span>

                <button
                  onClick={() => setCreatorStep("shortEditor")}
                  className="bg-white hover:bg-zinc-150 active:scale-95 text-black font-black text-[15px] px-[26px] py-2.5 rounded-full shadow-lg transition-all"
                >
                  Done
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ==================== WIZARD STEP 3: SHORT EDITING COMPOSER (Image 1) ==================== */}
        {creatorStep === "shortEditor" && selectedAsset && (
          <div className="flex flex-col flex-grow w-full h-full bg-black relative select-none">
            
            {/* Main Preview (webcam style filter overlays) */}
            <div className="absolute inset-0 z-0">
              {selectedAsset.mediaType === "VIDEO" ? (
                <video
                  src={selectedAsset.uri}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover transition-all duration-300"
                  style={{ 
                    filter: activeFilter === "none" ? "none" : 
                            activeFilter === "grayscale" ? "grayscale(100%)" : 
                            activeFilter === "sepia" ? "sepia(100%)" : 
                            activeFilter === "hue-rotate" ? "hue-rotate(90deg)" : "invert(100%)" 
                  }}
                />
              ) : (
                <img
                  src={selectedAsset.uri}
                  alt="Preview asset"
                  className="w-full h-full object-cover transition-all duration-300"
                  style={{ 
                    filter: activeFilter === "none" ? "none" : 
                            activeFilter === "grayscale" ? "grayscale(100%)" : 
                            activeFilter === "sepia" ? "sepia(100%)" : 
                            activeFilter === "hue-rotate" ? "hue-rotate(90deg)" : "invert(100%)" 
                  }}
                />
              )}
            </div>

            {/* Custom interactive text overlays (Toggleable via Aa) */}
            {showTextOverlay && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-between py-24 px-8 pointer-events-none select-none font-sans">
                <div className="bg-white/85 text-black font-black text-xl px-5 py-2.5 rounded-xl shadow-lg border border-white tracking-wide animate-fade-in select-none">
                  Omega-3 Fatty Acid
                </div>
                <div className="bg-white/85 text-black font-black text-xl px-5 py-2.5 rounded-xl shadow-lg border border-white tracking-wide animate-fade-in select-none">
                  Dietary Alternative
                </div>
              </div>
            )}

            {/* Custom Sticker overlay */}
            {showStickerOverlay && (
              <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none select-none animate-slide-up">
                <div className="bg-black/60 border border-white/10 backdrop-blur-md px-4 py-3 rounded-2xl flex items-center gap-2 shadow-2xl select-none">
                  <Smile className="size-6 text-yellow-400 fill-yellow-400" />
                  <span className="text-white font-bold text-sm tracking-wide">Stickers Active</span>
                </div>
              </div>
            )}

            {/* Header overlay */}
            <div className="absolute inset-x-0 top-0 z-20 p-4 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent">
              <button
                onClick={() => setCreatorStep("trimmer")}
                className="p-2 bg-black/40 hover:bg-black/60 rounded-full transition-colors flex items-center justify-center border border-white/5"
                title="Back to Trimmer"
              >
                <ArrowLeft className="size-6 text-white" />
              </button>

              {/* Add sound pill */}
              <div className="flex items-center gap-1.5 px-4 py-2 bg-black/40 border border-white/5 backdrop-blur-md rounded-full text-white text-xs font-bold cursor-pointer hover:bg-black/60 select-none">
                <Music className="size-3.5" />
                <span>Add sound</span>
              </div>

              {/* Empty placeholder to balance spacing */}
              <div className="size-10" />
            </div>

            {/* Right-hand vertical control panel */}
            <div className="absolute right-4 top-24 z-20 flex flex-col gap-4 items-center bg-black/10 p-2 rounded-2xl backdrop-blur-[2px]">
              {/* Aa Text */}
              <button 
                onClick={() => setShowTextOverlay(!showTextOverlay)}
                className="flex flex-col items-center gap-1 text-center group cursor-pointer"
              >
                <div className={cn(
                  "size-10 border border-white/5 rounded-full flex items-center justify-center shadow-lg transition-all",
                  showTextOverlay ? "bg-white text-black" : "bg-black/45 text-white"
                )}>
                  <span className="font-extrabold text-[15px] select-none">Aa</span>
                </div>
                <span className="text-[10px] font-bold text-white drop-shadow">Text</span>
              </button>

              {/* Effects */}
              <button 
                onClick={() => toast({ description: "Effects toggled!" })}
                className="flex flex-col items-center gap-1 text-center group cursor-pointer"
              >
                <div className="size-10 bg-black/45 border border-white/5 rounded-full flex items-center justify-center shadow-lg">
                  <Sparkles className="size-5 text-white" />
                </div>
                <span className="text-[10px] font-bold text-white drop-shadow">Effects</span>
              </button>

              {/* Stickers */}
              <button 
                onClick={() => setShowStickerOverlay(!showStickerOverlay)}
                className="flex flex-col items-center gap-1 text-center group cursor-pointer"
              >
                <div className={cn(
                  "size-10 border border-white/5 rounded-full flex items-center justify-center shadow-lg transition-all",
                  showStickerOverlay ? "bg-white text-black animate-pulse" : "bg-black/45 text-white"
                )}>
                  <Smile className="size-5" />
                </div>
                <span className="text-[10px] font-bold text-white drop-shadow">Stickers</span>
              </button>

              {/* Filters */}
              <button 
                onClick={() => {
                  const filterCycles: typeof activeFilter[] = ["none", "grayscale", "sepia", "hue-rotate", "invert"];
                  const nextIdx = (filterCycles.indexOf(activeFilter) + 1) % filterCycles.length;
                  setActiveFilter(filterCycles[nextIdx]);
                  toast({ description: `Applied filter: ${filterCycles[nextIdx]}` });
                }}
                className="flex flex-col items-center gap-1 text-center group cursor-pointer"
              >
                <div className={cn(
                  "size-10 border border-white/5 rounded-full flex items-center justify-center shadow-lg transition-all",
                  activeFilter !== "none" ? "bg-purple-600 text-white" : "bg-black/45 text-white"
                )}>
                  <ImageIcon className="size-5" />
                </div>
                <span className="text-[10px] font-bold text-white drop-shadow">Filters</span>
              </button>

              {/* Captions */}
              <button 
                onClick={() => toast({ description: "Captions generated!" })}
                className="flex flex-col items-center gap-1 text-center group cursor-pointer"
              >
                <div className="size-10 bg-black/45 border border-white/5 rounded-full flex items-center justify-center shadow-lg">
                  <FileText className="size-5 text-white" />
                </div>
                <span className="text-[10px] font-bold text-white drop-shadow">Captions</span>
              </button>

              {/* More */}
              <button className="flex flex-col items-center gap-1 text-center group cursor-pointer">
                <div className="size-10 bg-black/45 border border-white/5 rounded-full flex items-center justify-center shadow-lg">
                  <ChevronDown className="size-5 text-white" />
                </div>
                <span className="text-[10px] font-bold text-white drop-shadow">More</span>
              </button>
            </div>

            {/* Bottom details card (Image 1 profile footer) */}
            <div className="absolute inset-x-0 bottom-18 z-10 px-4 pb-4 flex flex-col gap-2.5 bg-gradient-to-t from-black/80 via-black/30 to-transparent">
              <div className="flex items-center gap-3 text-left">
                <UserAvatar 
                  avatarUrl={user?.avatarUrl} 
                  size={36} 
                  className="size-9 shrink-0 border border-zinc-800 rounded-full" 
                />
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-white text-sm font-bold tracking-tight">doctorshailya</span>
                    <CheckCircle2 className="size-3 text-white fill-sky-500 text-sky-500" />
                    <button className="bg-white/10 hover:bg-white/20 text-white font-bold text-[11px] px-2.5 py-0.5 rounded-full border border-white/15">
                      Follow
                    </button>
                  </div>
                  <div className="flex items-center gap-1 text-zinc-300 text-xs mt-0.5">
                    <Music className="size-3 text-zinc-300" />
                    <span>akhya Mai Aakh Ghali Jo | Instrumental ...</span>
                  </div>
                </div>
              </div>

              <p className="text-left text-zinc-150 text-xs font-medium leading-relaxed mt-1 px-1">
                Comment your skin & hair concerns below 💕💕...
              </p>

              <div className="text-[11px] text-zinc-400 font-semibold tracking-wide mt-1.5 select-none animate-pulse">
                Swipe up to edit
              </div>
            </div>

            {/* Bottom Action buttons */}
            <div className="absolute inset-x-0 bottom-0 z-20 h-18 px-4 flex items-center justify-between border-t border-[#1A1A1A] bg-black shrink-0">
              <button
                onClick={() => setCreatorStep("trimmer")}
                className="bg-[#272727] hover:bg-[#3e3e3e] text-white font-bold text-sm px-6 py-2.5 rounded-full flex items-center gap-1.5 transition-colors"
              >
                <Edit3 className="size-4 text-white" />
                <span>Edit</span>
              </button>

              <button
                onClick={() => {
                  // Add this edited asset to selected gallery draft list
                  setSelectedGalleryIds(prev => 
                    prev.includes(selectedAsset.id) ? prev : [...prev, selectedAsset.id]
                  );
                  setCreatorStep("composer");
                  setActiveMode("Post");
                  toast({
                    description: "Trimmed and edited media loaded into draft!",
                  });
                }}
                className="bg-white hover:bg-zinc-150 text-black font-extrabold text-sm px-7 py-2.5 rounded-full flex items-center gap-1.5 transition-all shadow-lg active:scale-95"
              >
                <span>Next</span>
                <ArrowRight className="size-4" />
              </button>
            </div>

          </div>
        )}

      </div>

      {/* ==================== PHOTO PERMISSIONS & GALLERY VIEW OVERLAYS ==================== */}

      {/* 1. iOS-style Permission Modal Overlay */}
      {showPermissionModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] animate-fade-in p-4">
          <div className="bg-[#1c1c1e] text-white rounded-[14px] w-full max-w-[280px] text-center font-sans overflow-hidden shadow-2xl border border-zinc-800">
            <div className="px-4.5 pt-5 pb-3.5 border-b border-[#3a3a3c]">
              <h3 className="font-semibold text-[17px] leading-tight text-white px-2">
                &quot;Next Social&quot; Would Like to Access Your Photos
              </h3>
              <p className="text-[13px] text-zinc-400 mt-2 leading-tight px-1">
                This app needs access to your photos and videos to let you choose files for posts and short videos.
              </p>
            </div>
            <div className="flex flex-col">
              <button
                onClick={() => {
                  setShowPermissionModal(false);
                  setShowLimitedAccessSelector(true);
                  setTimeout(() => {
                    permissionInputRef.current?.click();
                  }, 100);
                }}
                className="text-[#007aff] text-[17px] font-normal py-3 border-b border-[#3a3a3c] hover:bg-white/5 active:bg-white/10 transition-colors w-full text-center"
              >
                Select Photos...
              </button>
              <button
                onClick={() => {
                  setGalleryPermission("all");
                  setShowPermissionModal(false);
                  setShowGalleryView(true);
                  setTimeout(() => {
                    permissionInputRef.current?.click();
                  }, 100);
                }}
                className="text-[#007aff] text-[17px] font-semibold py-3 border-b border-[#3a3a3c] hover:bg-white/5 active:bg-white/10 transition-colors w-full text-center"
              >
                Allow Access to All Photos
              </button>
              <button
                onClick={() => {
                  setGalleryPermission("denied");
                  setShowPermissionModal(false);
                  setShowGalleryView(true);
                }}
                className="text-[#007aff] text-[17px] font-normal py-3 hover:bg-white/5 active:bg-white/10 transition-colors w-full text-center"
              >
                Don&apos;t Allow
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Limited Photos Access Selector dialog */}
      {showLimitedAccessSelector && (
        <div className="fixed inset-0 bg-[#121212] z-[9999] flex flex-col justify-between select-none">
          {/* Header */}
          <header className="h-14 flex items-center justify-between px-4 border-b border-zinc-800 bg-[#121212] shrink-0">
            <button
              onClick={() => {
                setShowLimitedAccessSelector(false);
                setShowPermissionModal(true);
              }}
              className="text-zinc-400 hover:text-white font-semibold text-sm"
            >
              Cancel
            </button>
            <span className="text-white font-bold text-[16px]">Select Photos</span>
            <button
              onClick={() => {
                setGalleryPermission("limited");
                setShowLimitedAccessSelector(false);
                setShowGalleryView(true);
              }}
              className="text-sky-500 hover:text-sky-400 font-bold text-sm"
            >
              Done
            </button>
          </header>

          {/* Media Grid of all items */}
          <div className="flex-grow overflow-y-auto grid grid-cols-3 gap-0.5 p-0.5 scrollbar-none bg-[#121212]">
            {galleryAssets.map((item) => {
              const isChecked = limitedAccessibleIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    setLimitedAccessibleIds(prev =>
                      prev.includes(item.id)
                        ? prev.filter(id => id !== item.id)
                        : [...prev, item.id]
                    );
                  }}
                  className="aspect-square relative cursor-pointer bg-zinc-950 overflow-hidden"
                >
                  <img
                    src={item.uri}
                    alt="Grid thumbnail"
                    className="w-full h-full object-cover"
                  />
                  {item.mediaType === "VIDEO" && (
                    <div className="absolute bottom-1 right-1 bg-black/60 px-1 py-0.5 rounded text-[9px] text-white">
                      {item.duration || "0:05"}
                    </div>
                  )}
                  
                  {/* Circle check badge in top right */}
                  <div className="absolute top-2 right-2 flex items-center justify-center">
                    <div className={cn(
                      "size-5.5 rounded-full border border-white flex items-center justify-center transition-all",
                      isChecked ? "bg-sky-500 border-sky-500" : "bg-black/25"
                    )}>
                      {isChecked && <Check className="size-3.5 stroke-[3.5] text-white" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Full-page Gallery Browser View Overlay (Image 1) */}
      {showGalleryView && (
        <div className="fixed inset-0 bg-black z-[9990] flex flex-col justify-between select-none animate-slide-up">
          {/* Header */}
          <header className="h-14 flex items-center justify-between px-4 bg-black select-none z-10 shrink-0 border-b border-[#1A1A1A]">
            <div className="flex items-center gap-1.5 cursor-pointer">
              <span className="text-lg font-bold text-white pl-1">Gallery</span>
              <ChevronDown className="size-5 text-white" />
            </div>

            <button 
              onClick={() => setShowGalleryView(false)}
              className="p-2 hover:bg-[#272727] rounded-full transition-colors flex items-center justify-center"
              title="Close"
            >
              <X className="size-6 text-white" />
            </button>
          </header>

          {/* Grid/Browser Content Area */}
          <div className="flex-grow overflow-y-auto flex flex-col bg-black">
            
            {/* Quick Actions Row */}
            {galleryPermission !== "denied" && (
              <div className="grid grid-cols-2 gap-3 px-4 py-4 shrink-0">
                <button 
                  onClick={() => {
                    setShowGalleryView(false);
                    setActiveMode("Short");
                  }}
                  className="bg-[#1A1A1A] hover:bg-[#272727] active:scale-98 rounded-xl flex flex-col items-center justify-center py-4 px-3 gap-2.5 transition-all text-center"
                >
                  <div className="relative">
                    <VideoIcon className="size-6 text-white" />
                    <Sparkles className="size-3.5 text-purple-400 absolute -top-1 -right-1" />
                  </div>
                  <span className="text-sm font-semibold text-white">Create video</span>
                </button>

                <button 
                  onClick={() => toast({ description: "Search feature coming soon!" })}
                  className="bg-[#1A1A1A] hover:bg-[#272727] active:scale-98 rounded-xl flex flex-col items-center justify-center py-4 px-3 gap-2.5 transition-all text-center"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" className="size-6 text-white">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <span className="text-sm font-semibold text-white">Search YouTube</span>
                </button>
              </div>
            )}

            {/* Limited access additional selection trigger */}
            {galleryPermission === "limited" && (
              <div className="px-4 shrink-0">
                <button 
                  onClick={() => {
                    setShowLimitedAccessSelector(true);
                  }}
                  className="w-full bg-[#1A1A1A] hover:bg-[#272727] text-sky-500 font-bold text-xs py-3 rounded-xl border border-dashed border-zinc-800 text-center mb-3 transition-colors"
                >
                  + Manage photo access (Add more photos)
                </button>
              </div>
            )}

            {/* Grid display */}
            {galleryPermission === "denied" ? (
              <div className="flex-grow flex flex-col items-center justify-center px-6 text-center gap-4">
                <div className="size-16 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-500 border border-zinc-800">
                  <VideoOff className="size-8" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="font-bold text-white text-md">Access to Photos Denied</h4>
                  <p className="text-xs text-zinc-400 max-w-xs">
                    Allow access to your device&apos;s photos and videos in order to select and attach media files.
                  </p>
                </div>
                <button
                  onClick={() => setShowPermissionModal(true)}
                  className="bg-white text-black font-bold text-xs px-5 py-2.5 rounded-full hover:bg-zinc-150 transition-colors shadow-lg"
                >
                  Grant Photos Access
                </button>
              </div>
            ) : (
              <div className="flex-grow grid grid-cols-3 gap-0.5 p-0.5 scrollbar-none bg-black">
                {getAccessibleMedia().map((item) => {
                  const isSelected = selectedGalleryIds.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSelectedGalleryIds(prev =>
                          prev.includes(item.id)
                            ? prev.filter(id => id !== item.id)
                            : [...prev, item.id]
                        );
                      }}
                      className="aspect-square relative cursor-pointer select-none bg-zinc-950 overflow-hidden"
                    >
                      <img
                        src={item.uri}
                        alt="Grid thumbnail"
                        className="w-full h-full object-cover"
                      />
                      {item.mediaType === "VIDEO" && (
                        <div className="absolute bottom-1 right-1 bg-black/60 px-1 py-0.5 rounded text-[10px] text-white font-semibold">
                          {item.duration || "0:05"}
                        </div>
                      )}
                      
                      {/* Checkbox badge circle */}
                      <div className="absolute top-2 right-2 flex items-center justify-center">
                        <div className={cn(
                          "size-5.5 rounded-full border border-white flex items-center justify-center transition-all",
                          isSelected ? "bg-white border-white text-black" : "bg-black/25"
                        )}>
                          {isSelected && <Check className="size-3.5 stroke-[3.5]" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom Actions Row */}
          {galleryPermission !== "denied" && (
            <div className="h-18 px-4 flex items-center justify-between border-t border-[#1A1A1A] bg-black shrink-0">
              <button
                onClick={() => toast({ description: "AI editing features coming soon!" })}
                className="bg-[#272727] hover:bg-[#3e3e3e] text-white font-bold text-sm px-5 py-2.5 rounded-full flex items-center gap-1.5 transition-colors"
              >
                <Sparkles className="size-4 text-purple-400" />
                <span>Edit with AI</span>
              </button>

              <button
                onClick={() => {
                  if (selectedGalleryIds.length === 0) {
                    toast({ description: "Please select at least one media item!" });
                    return;
                  }
                  // Transition to step 2: Trimming view
                  const firstId = selectedGalleryIds[0];
                  const asset = galleryAssets.find(m => m.id === firstId) || galleryAssets[0];
                  setSelectedAsset(asset);
                  setShowGalleryView(false);
                  setCreatorStep("trimmer");
                }}
                className="bg-white hover:bg-zinc-150 text-black font-extrabold text-sm px-6 py-2.5 rounded-full flex items-center gap-1 transition-colors"
              >
                <span>Next</span>
                <ArrowRight className="size-4" />
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
