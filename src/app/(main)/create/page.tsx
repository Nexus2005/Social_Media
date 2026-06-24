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
  Play, Loader2, Pencil, Trash2, Check, ArrowRight, Clock, AlignLeft
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MediaAsset {
  id: string;
  uri: string;
  mediaType: "IMAGE" | "VIDEO";
  duration?: string;
}

const INITIAL_MOCK_MEDIA: MediaAsset[] = [
  { id: "mock-1", uri: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=300&auto=format&fit=crop&q=60", mediaType: "IMAGE" },
  { id: "mock-2", uri: "https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=300&auto=format&fit=crop&q=60", mediaType: "IMAGE" },
  { id: "mock-3", uri: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=300&auto=format&fit=crop&q=60", mediaType: "IMAGE" },
  { id: "mock-4", uri: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=300&auto=format&fit=crop&q=60", mediaType: "IMAGE" },
  { id: "mock-5", uri: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=300&auto=format&fit=crop&q=60", mediaType: "IMAGE" },
];

const MOCK_VIDEOS: MediaAsset[] = [
  { id: "v-1", uri: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=60", mediaType: "VIDEO", duration: "0:14" },
  { id: "v-2", uri: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&auto=format&fit=crop&q=60", mediaType: "VIDEO", duration: "0:08" },
  { id: "v-3", uri: "https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=400&auto=format&fit=crop&q=60", mediaType: "VIDEO", duration: "0:10" },
  { id: "v-4", uri: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&auto=format&fit=crop&q=60", mediaType: "VIDEO", duration: "0:09" },
  { id: "v-5", uri: "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400&auto=format&fit=crop&q=60", mediaType: "VIDEO", duration: "0:03" },
  { id: "v-6", uri: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&auto=format&fit=crop&q=60", mediaType: "VIDEO", duration: "0:05" },
  { id: "v-7", uri: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&auto=format&fit=crop&q=60", mediaType: "VIDEO", duration: "0:07" },
  { id: "v-8", uri: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&auto=format&fit=crop&q=60", mediaType: "VIDEO", duration: "0:13" },
  { id: "v-9", uri: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&auto=format&fit=crop&q=60", mediaType: "VIDEO", duration: "0:11" },
  { id: "v-10", uri: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&auto=format&fit=crop&q=60", mediaType: "VIDEO", duration: "0:27" },
  { id: "v-11", uri: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&auto=format&fit=crop&q=60", mediaType: "VIDEO", duration: "0:07" },
  { id: "v-12", uri: "https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=400&auto=format&fit=crop&q=60", mediaType: "VIDEO", duration: "0:16" },
];

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

  // Bottom selector modes
  const modes = ["Video", "Short", "Live", "Post"] as const;
  type CreatorMode = typeof modes[number];
  const [activeMode, setActiveMode] = useState<CreatorMode>("Post");

  // Post mode states
  const [postText, setPostText] = useState("");
  const [mediaList, setMediaList] = useState<MediaAsset[]>(INITIAL_MOCK_MEDIA);
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Media upload hook from project setup
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
    if (activeMode === "Short" || activeMode === "Live") {
      startCamera();
    } else {
      stopCamera();
    }
  }, [activeMode, facingMode]);

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
      const next = !prev;
      if (streamRef.current) {
        streamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = !next;
        });
      }
      return next;
    });
  };

  const toggleHideVideo = () => {
    setIsVideoHidden((prev) => {
      const next = !prev;
      if (streamRef.current) {
        streamRef.current.getVideoTracks().forEach((track) => {
          track.enabled = !next;
        });
      }
      return next;
    });
  };

  const handleClose = () => {
    router.back();
  };

  // Handle files chosen from system dialog
  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    startUpload(files);
    e.target.value = "";
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Convert external image URL to File so it can be uploaded to backend
  const uploadMockImage = async (url: string, filename: string): Promise<string> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const file = new File([blob], filename, { type: blob.type || "image/jpeg" });
      
      // Upload using custom Form Data /api/upload
      const formData = new FormData();
      formData.append("endpoint", "attachment");
      formData.append("files", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      return data[0]?.serverData?.mediaId || "";
    } catch (e) {
      console.error("Error converting/uploading mock image:", e);
      throw e;
    }
  };

  // Publish Post Handler
  const handlePublish = async () => {
    if (!postText.trim() && !selectedMediaId && attachments.length === 0) return;

    setIsSubmitting(true);
    try {
      let finalMediaIds: string[] = [];

      // 1. Check if user selected their own uploaded attachments
      if (attachments.length > 0) {
        finalMediaIds = attachments.map(a => a.mediaId).filter(Boolean) as string[];
      } 
      // 2. Check if user selected one of the mock recent media assets
      else if (selectedMediaId) {
        const mockItem = mediaList.find(m => m.id === selectedMediaId);
        if (mockItem) {
          if (mockItem.id.startsWith("mock-") || mockItem.id.startsWith("v-")) {
            // Convert to real backend uploaded file so it persists in the feed database
            toast({
              description: "Processing selected attachment...",
            });
            const mediaId = await uploadMockImage(mockItem.uri, `media_${mockItem.id}.jpg`);
            if (mediaId) finalMediaIds.push(mediaId);
          } else {
            // Already uploaded
            finalMediaIds.push(mockItem.id);
          }
        }
      }

      await submitMutation.mutateAsync({
        content: postText,
        mediaIds: finalMediaIds,
        audience: "public",
      });

      // Clear states and redirect
      setPostText("");
      setSelectedMediaId(null);
      resetUploads();
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
      // Fallback: Attach a nice placeholder mock asset
      const newMockId = `short-${Date.now()}`;
      const newMock: MediaAsset = {
        id: newMockId,
        uri: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=60",
        mediaType: "VIDEO",
      };
      setMediaList(prev => [newMock, ...prev]);
      setSelectedMediaId(newMockId);
      setActiveMode("Post");
      toast({
        description: "Recorded video successfully attached!",
      });
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
            const file = new File([blob], `short_capture_${Date.now()}.jpg`, { type: "image/jpeg" });
            startUpload([file]);
            setActiveMode("Post");
            toast({
              description: "Recorded video snap uploaded!",
            });
          }
        }, "image/jpeg", 0.95);
      }
    } catch (e) {
      console.error(e);
      // Fallback
      setActiveMode("Post");
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

  // Video Mode: select video and attach to post
  const handleSelectVideoFromGrid = (video: MediaAsset) => {
    // Attach video directly and switch to Post mode
    const newAssetId = `video-${Date.now()}`;
    const newAsset: MediaAsset = {
      id: newAssetId,
      uri: video.uri,
      mediaType: "VIDEO",
      duration: video.duration,
    };
    setMediaList(prev => [newAsset, ...prev]);
    setSelectedMediaId(newAssetId);
    setActiveMode("Post");
    toast({
      description: `Attached video (${video.duration}) to post`,
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

      {/* Hidden file input for file uploading */}
      <input
        type="file"
        multiple
        accept="image/*,video/*"
        ref={fileInputRef}
        onChange={handleFilesSelected}
        className="hidden"
      />

      {/* Main Composer Area */}
      <div className="flex flex-col flex-grow w-full max-w-[600px] mx-auto bg-black text-white relative">
        
        {/* ==================== 1. POST MODE ==================== */}
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
                disabled={isSubmitting || isUploading || (!postText.trim() && !selectedMediaId && attachments.length === 0)}
                className={cn(
                  "px-[18px] py-1.5 rounded-full font-bold text-sm transition-all select-none",
                  (!postText.trim() && !selectedMediaId && attachments.length === 0) || isSubmitting || isUploading
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

            {/* Attachments preview container if uploading user's own media */}
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

            {/* Gallery Strip Container - sits attached to the bottom switcher with large negative space above */}
            <div className="w-full flex flex-col bg-black shrink-0 border-t border-[#1A1A1A]">
              
              {/* Gallery Media Strip */}
              <div className="h-[96px] py-1 bg-black flex items-center gap-2 overflow-x-auto scrollbar-none px-4 select-none">
                
                {/* System camera/import item inside the strip */}
                <button 
                  onClick={triggerFileSelect}
                  className="w-20 h-20 shrink-0 bg-[#1A1A1A] hover:bg-[#2A2A2A] rounded-[8px] flex flex-col items-center justify-center transition-colors border border-dashed border-zinc-800"
                  title="Camera/Import"
                >
                  <Camera className="size-5 text-white/80" />
                </button>

                {mediaList.map((asset) => {
                  const isSelected = selectedMediaId === asset.id;
                  return (
                    <div
                      key={asset.id}
                      onClick={() => setSelectedMediaId(isSelected ? null : asset.id)}
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
                })}
              </div>

              {/* Bottom actions row */}
              <div className="h-14 flex items-center justify-start gap-4 px-4 bg-black border-t border-[#1A1A1A] pb-safe shrink-0">
                {/* Active Caption Contest Item */}
                <button 
                  className="bg-[#272727] p-2 rounded-full text-white flex items-center justify-center transition-all select-none"
                  title="Caption Contest"
                >
                  {/* Poll Icon */}
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

                {/* Inactive Image Item */}
                <button 
                  className="p-2 text-zinc-400 opacity-60 hover:opacity-85 flex items-center justify-center transition-all select-none cursor-pointer"
                  onClick={triggerFileSelect}
                  title="Image"
                >
                  <ImageIcon className="size-[22px]" />
                </button>

                {/* Inactive Quiz Item */}
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

        {/* ==================== 2. VIDEO MODE ==================== */}
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

                {/* Custom dropdown */}
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

            {/* Video Grid */}
            <div className="flex-grow overflow-y-auto grid grid-cols-3 gap-0.5 p-0.5 scrollbar-none">
              {MOCK_VIDEOS.map((vid) => (
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
                    {vid.duration}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================== 3. SHORT MODE ==================== */}
        {activeMode === "Short" && (
          <div className="flex flex-col flex-grow w-full h-full relative overflow-hidden bg-black">
            {/* Live camera feed container */}
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
              {/* Progress Bar (Visible while recording) */}
              {isRecording && (
                <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden mb-2">
                  <div 
                    className="bg-red-600 h-full rounded-full transition-all duration-75"
                    style={{ width: `${recordingProgress}%` }}
                  />
                </div>
              )}

              {/* Header inside overlay */}
              <div className="flex items-center justify-between w-full">
                <button 
                  onClick={handleClose}
                  className="p-2 bg-black/40 hover:bg-black/60 rounded-full transition-colors flex items-center justify-center border border-white/5"
                >
                  <X className="size-6 text-white" />
                </button>

                {/* Add sound pill */}
                <div className="flex items-center gap-1.5 px-4 py-2 bg-black/40 border border-white/5 backdrop-blur-md rounded-full text-white text-xs font-bold cursor-pointer hover:bg-black/60 select-none">
                  <Music className="size-3.5" />
                  <span>Add sound</span>
                </div>

                <div className="flex items-center gap-3">
                  <button className="p-2 bg-black/40 hover:bg-black/60 rounded-full transition-colors flex items-center justify-center border border-white/5">
                    <Sparkles className="size-5 text-white" />
                  </button>

                  {/* Green indicator badge */}
                  <div className="flex items-center gap-1 px-3 py-1 bg-green-500/90 border border-green-400 rounded-full shadow-lg">
                    <VideoIcon className="size-3.5 text-white" />
                    <Mic className="size-3.5 text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Right side controls panel */}
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
              
              {/* Gallery preview icon */}
              <button 
                onClick={triggerFileSelect}
                className="flex flex-col items-center gap-1"
              >
                <div className="size-12 rounded-lg overflow-hidden border-2 border-white/80 bg-zinc-900 shadow-md">
                  <img 
                    src={mediaList[0]?.uri || "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=100"} 
                    className="w-full h-full object-cover" 
                    alt="Gallery first item"
                  />
                </div>
                <span className="text-[11px] font-bold text-white tracking-wide">Add</span>
              </button>

              {/* Shutter / Record button */}
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

              {/* Dummy spacing for balance */}
              <div className="size-12" />
            </div>
          </div>
        )}

        {/* ==================== 4. LIVE MODE ==================== */}
        {activeMode === "Live" && (
          <div className="flex flex-col flex-grow w-full h-full relative overflow-hidden bg-black">
            {/* Live camera stream */}
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

            {/* Header overlay */}
            <div className="absolute inset-x-0 top-0 z-10 p-4 flex items-center justify-between">
              <button 
                onClick={liveStarted ? handleEndLive : handleClose}
                className="p-2 bg-black/40 hover:bg-black/60 rounded-full transition-colors border border-white/5"
              >
                <X className="size-6 text-white" />
              </button>

              {/* LIVE Stream overlay if active */}
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

            {/* Right side controls panel with text labels next to them */}
            <div className="absolute right-4 top-20 z-10 flex flex-col gap-4 items-end">
              
              {/* Flip */}
              <button onClick={toggleFlip} className="flex items-center gap-2 group">
                <span className="text-[13px] font-bold text-white drop-shadow bg-black/30 px-2 py-0.5 rounded border border-white/5 opacity-85 group-hover:opacity-100 transition-opacity">Flip</span>
                <div className="size-10 bg-black/45 border border-white/5 rounded-full flex items-center justify-center shadow-lg">
                  <RotateCw className="size-5 text-white" />
                </div>
              </button>

              {/* Mute */}
              <button onClick={toggleMute} className="flex items-center gap-2 group">
                <span className="text-[13px] font-bold text-white drop-shadow bg-black/30 px-2 py-0.5 rounded border border-white/5 opacity-85 group-hover:opacity-100 transition-opacity">
                  {isMuted ? "Unmute" : "Mute"}
                </span>
                <div className="size-10 bg-black/45 border border-white/5 rounded-full flex items-center justify-center shadow-lg">
                  {isMuted ? <MicOff className="size-5 text-white" /> : <Mic className="size-5 text-white" />}
                </div>
              </button>

              {/* Hide Live Video */}
              <button onClick={toggleHideVideo} className="flex items-center gap-2 group">
                <span className="text-[13px] font-bold text-white drop-shadow bg-black/30 px-2 py-0.5 rounded border border-white/5 opacity-85 group-hover:opacity-100 transition-opacity">
                  {isVideoHidden ? "Show video" : "Hide live video"}
                </span>
                <div className="size-10 bg-black/45 border border-white/5 rounded-full flex items-center justify-center shadow-lg">
                  {isVideoHidden ? <VideoOff className="size-5 text-white" /> : <VideoIcon className="size-5 text-white" />}
                </div>
              </button>

              {/* Orientation */}
              <button className="flex items-center gap-2 group">
                <span className="text-[13px] font-bold text-white drop-shadow bg-black/30 px-2 py-0.5 rounded border border-white/5 opacity-85 group-hover:opacity-100 transition-opacity">Orientation</span>
                <div className="size-10 bg-black/45 border border-white/5 rounded-full flex items-center justify-center shadow-lg">
                  <Smartphone className="size-5 text-white" />
                </div>
              </button>

              {/* More */}
              <button className="flex items-center gap-2 group">
                <span className="text-[13px] font-bold text-white drop-shadow bg-black/30 px-2 py-0.5 rounded border border-white/5 opacity-85 group-hover:opacity-100 transition-opacity">More</span>
                <div className="size-10 bg-black/45 border border-white/5 rounded-full flex items-center justify-center shadow-lg">
                  <ChevronDown className="size-5 text-white" />
                </div>
              </button>
            </div>

            {/* Bottom Overlay & Next button */}
            {!liveStarted ? (
              <div className="absolute inset-x-0 bottom-4 z-10 px-4 flex flex-col gap-4 pb-4.5 bg-gradient-to-t from-black/60 to-transparent">
                
                {/* User live identity panel */}
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

                {/* Big white Next button */}
                <button
                  onClick={handleLiveNext}
                  className="w-full bg-white text-black font-bold text-[16px] py-3.5 rounded-full shadow-lg hover:bg-zinc-150 transition-all select-none text-center block"
                >
                  Next
                </button>
              </div>
            ) : (
              // Live broadcast simulated chat stream overlay
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

                {/* End Live button */}
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

        {/* Bottom Selector Navigation Switcher Bar */}
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
    </div>
  );
}
