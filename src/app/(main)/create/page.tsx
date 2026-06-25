"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/app/(main)/SessionProvider";
import UserAvatar from "@/components/UserAvatar";
import { useSubmitPostMutation } from "@/components/posts/editor/mutations";
import useMediaUpload from "@/components/posts/editor/useMediaUpload";
import { useToast } from "@/components/ui/use-toast";
import PostEditor from "@/components/posts/editor/PostEditor";
import { 
  X, Globe, ChevronDown, MoreHorizontal, Image as ImageIcon, 
  CheckSquare, Camera, RotateCw, Mic, MicOff, Video as VideoIcon, 
  VideoOff, Smartphone, Calendar, Share2, Sparkles, Music, 
  Play, Pause, Plus, Loader2, Pencil, Trash2, Check, ArrowRight, Clock, AlignLeft,
  ArrowLeft, Edit3, Smile, FileText, CheckCircle2, Lock, AlertTriangle, Volume2,
  Users, MapPin, ListPlus, MessageSquare, Download, ChevronUp, Info, ArrowUp
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MediaAsset {
  id: string;
  uri: string;
  mediaType: "IMAGE" | "VIDEO";
  duration?: string;
  bucketDisplayName?: string;
  dateAdded?: number;
}

interface TextOverlay {
  id: string;
  text: string;
  color: string;
  fontFamily: string;
  fontSize: number;
  x: number;
  y: number;
}

interface StickerOverlay {
  id: string;
  type: "image" | "qa" | "addyours" | "poll" | "quiz";
  title?: string;
  options?: string[];
  x: number;
  y: number;
}

interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  duration: string;
  uri: string;
}

interface VoiceoverSegment {
  id: string;
  blobUrl: string;
  startTime: number;
  duration: number;
}

const FONT_STYLES = [
  { name: "YouTube Sans", className: "font-youtube-sans" },
  { name: "Serif Classic", className: "font-classic-serif" },
  { name: "Tech Mono", className: "font-monospace-tech" },
  { name: "Handwriting", className: "font-handwriting" }
];

const MOCK_TRACKS: MusicTrack[] = [
  { id: "track-1", title: "akhya Mai Aakh Ghali Jo", artist: "Instrumental", duration: "0:30", uri: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  { id: "track-2", title: "Chill Vibes", artist: "Lofi Study", duration: "0:45", uri: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
  { id: "track-3", title: "Retro Sunrise", artist: "Synthwave", duration: "0:35", uri: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
  { id: "track-4", title: "Summer Breeze", artist: "Acoustic", duration: "0:40", uri: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" }
];

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
  "Comment your skin & hair concerns below 💕💕...",
];

export default function CreatePage() {
  const router = useRouter();
  const { user } = useSession();
  const { toast } = useToast();
  const submitMutation = useSubmitPostMutation();

  // Wizard state machine
  const [creatorStep, setCreatorStep] = useState<"composer" | "trimmer" | "shortEditor" | "timelineEditor" | "addDetails">("composer");
  
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

  // Sidebar expand state
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  // Add details page states
  const [captionText, setCaptionText] = useState("");
  const [showAllDetails, setShowAllDetails] = useState(false);
  const [visibility, setVisibility] = useState<"Public" | "Private" | "Unlisted">("Public");
  const [audienceSelection, setAudienceSelection] = useState("No, it's not made for kids");
  const [trendingHashtags, setTrendingHashtags] = useState<string[]>(["#cricket", "#final", "#ipl", "#LearnMore"]);
  const [filteredHashtags, setFilteredHashtags] = useState<string[]>([]);
  const [showHashtagSuggestions, setShowHashtagSuggestions] = useState(false);

  // Other detail selections (Image 2 expanded options)
  const [descriptionText, setDescriptionText] = useState("");
  const [locationText, setLocationText] = useState("");
  const [relatedVideoText, setRelatedVideoText] = useState("");
  const [playlistsText, setPlaylistsText] = useState("");
  const [paidPromotion, setPaidPromotion] = useState(false);
  const [collaborationsText, setCollaborationsText] = useState("");
  const [aiUseLabel, setAiUseLabel] = useState(false);
  const [pendingPublishType, setPendingPublishType] = useState<"post" | "short" | null>(null);
  const [expectedTotalAttachments, setExpectedTotalAttachments] = useState(0);

  // Advanced editor tracking states
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [stickerOverlays, setStickerOverlays] = useState<StickerOverlay[]>([]);
  const [activeMusicTrack, setActiveMusicTrack] = useState<MusicTrack | null>(null);
  const [voiceoverAudios, setVoiceoverAudios] = useState<VoiceoverSegment[]>([]);
  const [activeEditorOverlay, setActiveEditorOverlay] = useState<"none" | "text" | "music" | "stickers" | "voiceover">("none");

  // Temporary sub-tool states
  const [tempText, setTempText] = useState("");
  const [tempColor, setTempColor] = useState("#ffffff");
  const [tempFontFamily, setTempFontFamily] = useState("YouTube Sans");
  const [tempFontSize, setTempFontSize] = useState(28);
  const [editingTextOverlayId, setEditingTextOverlayId] = useState<string | null>(null);

  // Playback timeline simulation states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Voiceover Recording states
  const [voiceoverRecordDuration, setVoiceoverRecordDuration] = useState(0);
  const [voiceoverRecordingState, setVoiceoverRecordingState] = useState<"idle" | "recording" | "completed">("idle");
  const [recordedVoiceoverUrl, setRecordedVoiceoverUrl] = useState<string | null>(null);

  // Sticker custom selections
  const [isSelectingStickerImage, setIsSelectingStickerImage] = useState(false);

  // Drag states
  const [draggingOverlayId, setDraggingOverlayId] = useState<string | null>(null);
  const [draggingType, setDraggingType] = useState<"text" | "sticker" | null>(null);

  // Audio refs
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceoverRecordingStartTimeRef = useRef<number>(0);
  const voiceoverChunksRef = useRef<Blob[]>([]);

  // Bottom selector modes
  const modes = ["Post", "Short", "Video", "Live"] as const;
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
  const [activeAlbum, setActiveAlbum] = useState<string>("Recent");
  const [isGalleryDropdownOpen, setIsGalleryDropdownOpen] = useState(false);

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
  const [videoDropdownSelection, setVideoDropdownSelection] = useState("All Videos");

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

  // Helper to filter media according to permissions, folders, and tabs
  const getAccessibleMedia = (onlyVideos: boolean = false) => {
    let assets = galleryPermission === "all"
      ? galleryAssets
      : galleryPermission === "limited"
      ? galleryAssets.filter(item => limitedAccessibleIds.includes(item.id))
      : [];

    if (onlyVideos) {
      assets = assets.filter(item => item.mediaType === "VIDEO");
    }

    const currentAlbum = onlyVideos 
      ? (videoDropdownSelection === "All Videos" ? "Recent" : videoDropdownSelection) 
      : activeAlbum;

    if (currentAlbum !== "Recent") {
      assets = assets.filter(item => item.bucketDisplayName === currentAlbum);
    }

    return [...assets].sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
  };

  // Handle files selected via the native-looking permissions file input triggers
  const handlePermissionFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newAssets: MediaAsset[] = files
      .filter((file) => file.type.startsWith("image/") || file.type.startsWith("video/"))
      .map((file, idx) => {
        // Categorize file into bucket folders dynamically
        let bucket = "Camera";
        const name = file.name.toLowerCase();
        if (name.includes("wa") || name.includes("whatsapp")) bucket = "WhatsApp";
        else if (name.includes("screenshot")) bucket = "Screenshots";
        else if (name.includes("dl") || name.includes("download")) bucket = "Downloads";
        else if (idx % 3 === 1) bucket = "Downloads";
        else if (idx % 3 === 2) bucket = "Screenshots";

        return {
          id: `local-${Date.now()}-${Math.random()}`,
          uri: URL.createObjectURL(file),
          mediaType: file.type.startsWith("video/") ? ("VIDEO" as const) : ("IMAGE" as const),
          duration: file.type.startsWith("video/") ? "0:05" : undefined,
          bucketDisplayName: bucket,
          dateAdded: Date.now() - idx * 1000,
        };
      });

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

  // Publish Post Handler (Strictly defers gallery item uploads to publish action)
  const handlePublish = async () => {
    if (!postText.trim() && selectedGalleryIds.length === 0 && attachments.length === 0) return;

    setIsSubmitting(true);
    try {
      if (selectedGalleryIds.length > 0) {
        setPendingPublishType("post");
        setExpectedTotalAttachments(attachments.length + selectedGalleryIds.length);

        const filesToUpload: File[] = [];
        for (const id of selectedGalleryIds) {
          const asset = galleryAssets.find(m => m.id === id);
          if (asset) {
            const file = await getFileFromBlobUri(asset.uri, asset.mediaType === "VIDEO" ? `gallery_${id}.mp4` : `gallery_${id}.jpg`);
            filesToUpload.push(file);
          }
        }
        await startUpload(filesToUpload);
      } else {
        const finalMediaIds = attachments.map(a => a.mediaId).filter(Boolean) as string[];
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
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error(err);
      setPendingPublishType(null);
      setIsSubmitting(false);
      toast({
        variant: "destructive",
        description: "Failed to publish post. Please try again.",
      });
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

  // Playback timer loop for the Advanced Timeline Editor
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + 0.05;
          if (next >= trimmedDuration) {
            if (musicAudioRef.current) {
              musicAudioRef.current.currentTime = 0;
            }
            return 0;
          }
          return next;
        });
      }, 50);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isPlaying, trimmedDuration]);

  // Sync background music play/pause
  useEffect(() => {
    if (activeMusicTrack) {
      if (!musicAudioRef.current) {
        musicAudioRef.current = new Audio(activeMusicTrack.uri);
        musicAudioRef.current.loop = true;
      } else {
        musicAudioRef.current.src = activeMusicTrack.uri;
      }
      
      if (isPlaying) {
        musicAudioRef.current.play().catch((e) => console.log("Audio playback blocked by autoplay rules"));
      } else {
        musicAudioRef.current.pause();
      }
    } else {
      if (musicAudioRef.current) {
        musicAudioRef.current.pause();
        musicAudioRef.current = null;
      }
    }

    return () => {
      if (musicAudioRef.current) {
        musicAudioRef.current.pause();
      }
    };
  }, [activeMusicTrack, isPlaying]);

  // Sync music track seek when currentTime shifts manually
  useEffect(() => {
    if (musicAudioRef.current) {
      musicAudioRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  // Smooth pointer-based drag updates clamped to container size
  const handlePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    id: string,
    type: "text" | "sticker"
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget;
    const parent = target.parentElement;
    if (!parent) return;

    setDraggingOverlayId(id);
    setDraggingType(type);

    const onPointerMove = (moveEvent: PointerEvent) => {
      const rect = parent.getBoundingClientRect();
      const x = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      const y = ((moveEvent.clientY - rect.top) / rect.height) * 100;
      const clampedX = Math.max(0, Math.min(100, x));
      const clampedY = Math.max(0, Math.min(100, y));

      if (type === "text") {
        setTextOverlays((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, x: clampedX, y: clampedY } : item
          )
        );
      } else {
        setStickerOverlays((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, x: clampedX, y: clampedY } : item
          )
        );
      }
    };

    const onPointerUp = () => {
      setDraggingOverlayId(null);
      setDraggingType(null);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  // Text overlay saving & edits
  const handleSaveText = () => {
    if (!tempText.trim()) {
      if (editingTextOverlayId) {
        setTextOverlays(prev => prev.filter(t => t.id !== editingTextOverlayId));
      }
    } else {
      if (editingTextOverlayId) {
        setTextOverlays(prev =>
          prev.map(t =>
            t.id === editingTextOverlayId
              ? { ...t, text: tempText, color: tempColor, fontFamily: tempFontFamily, fontSize: tempFontSize }
              : t
          )
        );
      } else {
        const newText: TextOverlay = {
          id: `text-${Date.now()}`,
          text: tempText,
          color: tempColor,
          fontFamily: tempFontFamily,
          fontSize: tempFontSize,
          x: 50,
          y: 40,
        };
        setTextOverlays(prev => [...prev, newText]);
      }
    }
    setTempText("");
    setEditingTextOverlayId(null);
    setActiveEditorOverlay("none");
  };

  const handleEditText = (item: TextOverlay) => {
    setEditingTextOverlayId(item.id);
    setTempText(item.text);
    setTempColor(item.color);
    setTempFontFamily(item.fontFamily);
    setTempFontSize(item.fontSize);
    setActiveEditorOverlay("text");
  };

  // Stickers management
  const handleAddSticker = (type: "image" | "qa" | "addyours" | "poll" | "quiz", imageUri?: string) => {
    let title = "";
    let options: string[] = [];

    if (type === "qa") {
      title = "Ask me a question";
    } else if (type === "addyours") {
      title = "Add yours";
    } else if (type === "poll") {
      title = "Are you hyped?";
      options = ["Yes", "No"];
    } else if (type === "quiz") {
      title = "Quiz Question";
      options = ["Option A", "Option B"];
    } else if (type === "image" && imageUri) {
      title = imageUri;
    }

    const newSticker: StickerOverlay = {
      id: `sticker-${Date.now()}`,
      type,
      title,
      options,
      x: 50,
      y: 50,
    };

    setStickerOverlays(prev => [...prev, newSticker]);
    setActiveEditorOverlay("none");
    setIsSelectingStickerImage(false);
  };

  // Voiceover audio capture controller
  const startVoiceoverRecording = async () => {
    try {
      setRecordedVoiceoverUrl(null);
      setVoiceoverRecordDuration(0);
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      voiceoverChunksRef.current = [];
      voiceoverRecordingStartTimeRef.current = currentTime;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          voiceoverChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(voiceoverChunksRef.current, { type: "audio/webm" });
        const blobUrl = URL.createObjectURL(blob);
        setRecordedVoiceoverUrl(blobUrl);
        setVoiceoverRecordingState("completed");
      };

      mediaRecorder.start();
      setVoiceoverRecordingState("recording");

      let recStart = Date.now();
      const interval = setInterval(() => {
        setVoiceoverRecordDuration((Date.now() - recStart) / 1000);
      }, 100);
      (mediaRecorder as any).tickInterval = interval;
    } catch (e) {
      console.log("Fallback simulator enabled for audio recording.");
      setVoiceoverRecordingState("recording");
      voiceoverRecordingStartTimeRef.current = currentTime;
      
      let recStart = Date.now();
      const interval = setInterval(() => {
        setVoiceoverRecordDuration((Date.now() - recStart) / 1000);
      }, 100);
      (window as any).simulatedRecInterval = interval;
    }
  };

  const stopVoiceoverRecording = () => {
    if (mediaRecorderRef.current && voiceoverRecordingState === "recording") {
      clearInterval((mediaRecorderRef.current as any).tickInterval);
      mediaRecorderRef.current.stop();
    } else if (voiceoverRecordingState === "recording") {
      clearInterval((window as any).simulatedRecInterval);
      const synthBlob = new Blob([new Uint8Array(1000)], { type: "audio/wav" });
      const synthUrl = URL.createObjectURL(synthBlob);
      setRecordedVoiceoverUrl(synthUrl);
      setVoiceoverRecordingState("completed");
    }
  };

  const handleSaveVoiceover = () => {
    if (recordedVoiceoverUrl) {
      const newVoiceover: VoiceoverSegment = {
        id: `voiceover-${Date.now()}`,
        blobUrl: recordedVoiceoverUrl,
        startTime: voiceoverRecordingStartTimeRef.current,
        duration: voiceoverRecordDuration || 3.0,
      };
      setVoiceoverAudios(prev => [...prev, newVoiceover]);
    }
    setRecordedVoiceoverUrl(null);
    setVoiceoverRecordingState("idle");
    setVoiceoverRecordDuration(0);
    setActiveEditorOverlay("none");
  };

  // Swipe up gesture recognizer
  const touchStartYRef = useRef<number>(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diffY = touchStartYRef.current - e.changedTouches[0].clientY;
    if (diffY > 80) {
      setCreatorStep("timelineEditor");
      toast({ description: "Opening advanced timeline editor..." });
    }
  };

  // Load live trending hashtags dynamically from the server
  useEffect(() => {
    const fetchTrends = async () => {
      try {
        const res = await fetch("/api/trending");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const liveTags = data.map((item: any) => item.hashtag);
            const cleanTags = Array.from(new Set(liveTags.filter((tag: string) => tag && tag.startsWith("#")))) as string[];
            if (cleanTags.length > 0) {
              setTrendingHashtags(cleanTags);
            }
          }
        }
      } catch (e) {
        console.error("Error loading live hashtags:", e);
      }
    };
    fetchTrends();
  }, []);

  const handleCaptionChange = (val: string) => {
    setCaptionText(val);
    const words = val.split(/\s+/);
    const lastWord = words[words.length - 1] || "";
    if (lastWord.startsWith("#")) {
      setShowHashtagSuggestions(true);
      const query = lastWord.toLowerCase();
      setFilteredHashtags(
        trendingHashtags.filter(tag => tag.toLowerCase().includes(query))
      );
    } else {
      setShowHashtagSuggestions(false);
    }
  };

  const handleSelectHashtag = (tag: string) => {
    const words = captionText.split(/\s+/);
    const lastWord = words[words.length - 1] || "";
    if (lastWord.startsWith("#")) {
      words[words.length - 1] = tag;
      setCaptionText(words.join(" ") + " ");
    } else {
      setCaptionText(prev => prev.trim() + " " + tag + " ");
    }
    setShowHashtagSuggestions(false);
  };

  const getFileFromBlobUri = async (uri: string, filename: string): Promise<File> => {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new File([blob], filename, { type: blob.type });
  };

  // Monitor uploadthing attachments for the Short/Post upload completion
  useEffect(() => {
    if (pendingPublishType && !isUploading) {
      const allDone = attachments.every(a => !a.isUploading);
      if (allDone) {
        const uploadedMediaIds = attachments.map(a => a.mediaId).filter(Boolean) as string[];
        
        if (attachments.length === expectedTotalAttachments && attachments.every(a => !a.isUploading && a.mediaId)) {
          const publishContent = async () => {
            try {
              if (pendingPublishType === "short") {
                await submitMutation.mutateAsync({
                  content: captionText,
                  mediaIds: [uploadedMediaIds[0]],
                  contentFormat: selectedAsset?.mediaType === "VIDEO" ? "SPOT" : "FEED",
                  location: locationText || null,
                  audience: visibility.toLowerCase(),
                });
                setCaptionText("");
              } else {
                await submitMutation.mutateAsync({
                  content: postText,
                  mediaIds: uploadedMediaIds,
                  audience: "public",
                });
                setPostText("");
                setSelectedGalleryIds([]);
              }
              
              resetUploads();
              setPendingPublishType(null);
              setCreatorStep("composer");
              router.push("/");
            } catch (err) {
              console.error(err);
              resetUploads();
              setPendingPublishType(null);
              setIsSubmitting(false);
              toast({
                variant: "destructive",
                description: "Failed to publish post. Please try again.",
              });
            }
          };
          publishContent();
        } else {
          // UPLOAD FAILURE WATCHPOINT: If some uploads failed/mismatched, clean up and unlock UI
          resetUploads();
          setPendingPublishType(null);
          setIsSubmitting(false);
          toast({
            variant: "destructive",
            description: "Failed to upload media files. Please try again.",
          });
        }
      }
    }
  }, [pendingPublishType, isUploading, attachments, expectedTotalAttachments]);

  const handleUploadShortClick = async () => {
    if (!selectedAsset) return;
    setPendingPublishType("short");
    setExpectedTotalAttachments(1);
    try {
      const file = await getFileFromBlobUri(selectedAsset.uri, selectedAsset.mediaType === "VIDEO" ? `video_${Date.now()}.mp4` : `image_${Date.now()}.jpg`);
      await startUpload([file]);
    } catch (e) {
      console.error("Upload error:", e);
      setPendingPublishType(null);
      toast({
        variant: "destructive",
        description: "Failed to upload media. Please try again.",
      });
    }
  };

  return (
    <div className="min-h-screen w-full bg-black flex flex-col justify-between select-none relative">
      {/* Inject styling overrides to remove layout sidebars/padding constraints */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@700&family=Cinzel:wght@700&family=Fira+Code:wght@700&family=Outfit:wght@800&display=swap');
        
        .font-youtube-sans {
          font-family: 'Outfit', 'Inter', sans-serif;
          font-weight: 800;
          letter-spacing: -0.03em;
        }
        .font-classic-serif {
          font-family: 'Cinzel', serif;
          font-weight: 700;
        }
        .font-monospace-tech {
          font-family: 'Fira Code', monospace;
          font-weight: 700;
        }
        .font-handwriting {
          font-family: 'Caveat', cursive;
          font-weight: 700;
        }
        .vertical-slider {
          -webkit-appearance: slider-vertical;
          width: 8px;
          height: 150px;
          background: #272727;
          outline: none;
          border-radius: 4px;
        }
        @keyframes sound-wave-pulse {
          0%, 100% { height: 8px; }
          50% { height: 36px; }
        }
        .animate-sound-wave {
          animation: sound-wave-pulse 0.9s ease-in-out infinite;
          height: 12px;
          width: 6px;
        }
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
                <PostEditor onClose={handleClose} className="relative inset-auto z-0 h-full min-h-0 max-h-none sm:max-h-none rounded-none border-none" />
              </div>
            )}
            {/* 1.2 VIDEO MODE */}
            {activeMode === "Video" && (
              <div className="flex flex-col flex-grow w-full h-full relative">
                {/* Header */}
                <header className="h-14 flex items-center justify-between px-4 bg-black select-none z-30 shrink-0 border-b border-[#1A1A1A]">
                  <div className="relative">
                    <button 
                      onClick={() => setShowVideosDropdown(!showVideosDropdown)}
                      className="flex items-center gap-1.5 text-lg font-bold text-white pl-1"
                    >
                      <span>{videoDropdownSelection}</span>
                      <ChevronDown className="size-5 text-white" />
                    </button>

                    {showVideosDropdown && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowVideosDropdown(false)} />
                        <div className="absolute left-0 mt-2 bg-[#212121] border border-zinc-800 rounded-xl overflow-hidden shadow-2xl z-50 w-48 text-left py-1">
                          <button
                            onClick={() => {
                              setVideoDropdownSelection("All Videos");
                              setShowVideosDropdown(false);
                            }}
                            className={cn(
                              "w-full text-left px-4 py-3 text-sm font-semibold hover:bg-zinc-800 transition-colors",
                              videoDropdownSelection === "All Videos" ? "text-sky-500 bg-zinc-800/40" : "text-zinc-300"
                            )}
                          >
                            All Videos
                          </button>
                          {Array.from(new Set(
                            (galleryPermission === "limited"
                              ? galleryAssets.filter(item => limitedAccessibleIds.includes(item.id))
                              : galleryAssets
                            )
                            .filter(a => a.mediaType === "VIDEO")
                            .map(a => a.bucketDisplayName)
                            .filter(Boolean)
                          )).map((album) => (
                            <button
                              key={album}
                              onClick={() => {
                                setVideoDropdownSelection(album!);
                                setShowVideosDropdown(false);
                              }}
                              className={cn(
                                "w-full text-left px-4 py-3 text-sm font-semibold hover:bg-zinc-800 transition-colors",
                                videoDropdownSelection === album ? "text-sky-500 bg-zinc-800/40" : "text-zinc-300"
                              )}
                            >
                              {album}
                            </button>
                          ))}
                        </div>
                      </>
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

                {/* Limited Access Warning Banner */}
                {galleryPermission === "limited" && (
                  <div className="bg-zinc-900 border-b border-zinc-800 p-3 flex items-center justify-between text-xs text-zinc-300 z-20 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                      <p className="text-left leading-tight">Next Social only has access to selected items. Folders may be incomplete.</p>
                    </div>
                    <button 
                      onClick={() => {
                        setGalleryPermission("all");
                        setTimeout(() => {
                          permissionInputRef.current?.click();
                        }, 100);
                      }}
                      className="bg-white text-black px-3 py-1.5 rounded-full font-medium hover:bg-zinc-200 transition shrink-0 text-[10px]"
                    >
                      Allow All
                    </button>
                  </div>
                )}

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
                  ) : getAccessibleMedia(true).length === 0 ? (
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
                      {getAccessibleMedia(true).map((vid) => (
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
            
            {/* Main Preview with Swipe-up gestures */}
            <div 
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              className="absolute inset-0 z-0 overflow-hidden"
            >
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
              {/* Dynamic Interactive Text Overlays */}
              {textOverlays.map((item) => (
                <div
                  key={item.id}
                  style={{
                    left: `${item.x}%`,
                    top: `${item.y}%`,
                    color: item.color,
                    fontSize: `${item.fontSize}px`,
                    transform: "translate(-50%, -50%)",
                  }}
                  className={cn(
                    "absolute cursor-move p-2.5 font-bold pointer-events-auto select-none rounded bg-black/35 backdrop-blur-[1px] shadow-lg border border-white/5 z-20",
                    item.fontFamily === "YouTube Sans" && "font-youtube-sans",
                    item.fontFamily === "Serif Classic" && "font-classic-serif",
                    item.fontFamily === "Tech Mono" && "font-monospace-tech",
                    item.fontFamily === "Handwriting" && "font-handwriting"
                  )}
                  onPointerDown={(e) => handlePointerDown(e, item.id, "text")}
                  onDoubleClick={() => handleEditText(item)}
                >
                  {item.text}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setTextOverlays(prev => prev.filter(t => t.id !== item.id));
                    }}
                    className="absolute -top-1.5 -right-1.5 bg-black border border-white/15 hover:bg-red-950 hover:border-red-500 text-white rounded-full p-1 transition-all"
                  >
                    <X className="size-2.5" />
                  </button>
                </div>
              ))}

              {/* Dynamic Interactive Sticker Overlays */}
              {stickerOverlays.map((item) => (
                <div
                  key={item.id}
                  style={{
                    left: `${item.x}%`,
                    top: `${item.y}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                  className="absolute cursor-move pointer-events-auto select-none p-4 rounded-2xl shadow-2xl border border-white/10 bg-black/85 backdrop-blur-md text-white min-w-[140px] text-center z-20"
                  onPointerDown={(e) => handlePointerDown(e, item.id, "sticker")}
                >
                  {item.type === "qa" && (
                    <div className="flex flex-col gap-1.5 items-center">
                      <span className="text-[9px] text-purple-400 font-extrabold uppercase tracking-widest">Q&A</span>
                      <p className="text-xs font-bold text-zinc-100">{item.title}</p>
                      <div className="w-full h-7 bg-white/10 rounded-lg text-[10px] text-zinc-400 font-semibold flex items-center justify-center mt-1 border border-white/5">
                        Ask something...
                      </div>
                    </div>
                  )}
                  {item.type === "addyours" && (
                    <div className="flex items-center gap-1.5 justify-center py-1">
                      <span className="text-md">📷</span>
                      <span className="text-xs font-black tracking-wide text-rose-500 uppercase">{item.title}</span>
                    </div>
                  )}
                  {item.type === "poll" && (
                    <div className="flex flex-col gap-1.5 items-center">
                      <span className="text-[9px] text-blue-400 font-black tracking-wider uppercase">POLL</span>
                      <p className="text-xs font-bold">{item.title}</p>
                      <div className="flex gap-2 w-full mt-1.5">
                        {item.options?.map((opt) => (
                          <button key={opt} className="flex-1 py-1 bg-white/15 hover:bg-white/25 rounded-lg text-[11px] font-bold text-white transition-colors border border-white/5">
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {item.type === "quiz" && (
                    <div className="flex flex-col gap-1.5 items-center">
                      <span className="text-[9px] text-yellow-500 font-black tracking-wider uppercase">QUIZ</span>
                      <p className="text-xs font-bold">{item.title}</p>
                      <div className="flex flex-col gap-1 w-full mt-1.5">
                        {item.options?.map((opt) => (
                          <button key={opt} className="w-full py-1 bg-white/10 hover:bg-white/20 rounded-lg text-[11px] font-bold text-left px-2.5 text-zinc-200 border border-white/5">
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {item.type === "image" && (
                    <div className="relative size-16 rounded-lg overflow-hidden border border-white/20">
                      <img src={item.title} className="w-full h-full object-cover" alt="Custom Sticker" />
                    </div>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setStickerOverlays(prev => prev.filter(s => s.id !== item.id));
                    }}
                    className="absolute -top-1.5 -right-1.5 bg-black border border-white/15 hover:bg-red-950 hover:border-red-500 text-white rounded-full p-1 transition-all"
                  >
                    <X className="size-2.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Header overlay */}
            <div className="absolute inset-x-0 top-0 z-20 p-4 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent">
              <button
                onClick={() => setCreatorStep("trimmer")}
                className="p-2 bg-black/40 hover:bg-black/60 rounded-full transition-colors flex items-center justify-center border border-white/5"
                title="Back to Trimmer"
              >
                <ArrowLeft className="size-6 text-white" />
              </button>
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
                onClick={() => {
                  setCreatorStep("timelineEditor");
                  setActiveEditorOverlay("text");
                }}
                className="flex flex-col items-center gap-1 text-center group cursor-pointer"
              >
                <div className="size-10 bg-black/45 border border-white/5 rounded-full flex items-center justify-center shadow-lg hover:bg-[#272727] text-white">
                  <span className="font-extrabold text-[15px] select-none">Aa</span>
                </div>
                <span className="text-[10px] font-bold text-white drop-shadow">Text</span>
              </button>

              {/* Effects */}
              <button 
                onClick={() => toast({ description: "Effects applied (powered by openshot compositing pipeline)!" })}
                className="flex flex-col items-center gap-1 text-center group cursor-pointer"
              >
                <div className="size-10 bg-black/45 border border-white/5 rounded-full flex items-center justify-center shadow-lg hover:bg-[#272727]">
                  <Sparkles className="size-5 text-white" />
                </div>
                <span className="text-[10px] font-bold text-white drop-shadow">Effects</span>
              </button>

              {/* Stickers */}
              <button 
                onClick={() => {
                  setCreatorStep("timelineEditor");
                  setActiveEditorOverlay("stickers");
                }}
                className="flex flex-col items-center gap-1 text-center group cursor-pointer"
              >
                <div className="size-10 bg-black/45 border border-white/5 rounded-full flex items-center justify-center shadow-lg hover:bg-[#272727] text-white">
                  <Smile className="size-5" />
                </div>
                <span className="text-[10px] font-bold text-white drop-shadow">Stickers</span>
              </button>

              {isSidebarExpanded ? (
                <>
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
                      activeFilter !== "none" ? "bg-purple-600 text-white" : "bg-black/45 text-white hover:bg-[#272727]"
                    )}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" className="size-5 text-white">
                        <circle cx="12" cy="9" r="6" />
                        <circle cx="9" cy="15" r="6" />
                        <circle cx="15" cy="15" r="6" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-bold text-white drop-shadow">Filters</span>
                  </button>

                  {/* Captions */}
                  <button 
                    onClick={() => {
                      const newCap: TextOverlay = {
                        id: `caption-auto`,
                        text: "Testing auto-captions...",
                        color: "#ffff00",
                        fontFamily: "YouTube Sans",
                        fontSize: 24,
                        x: 50,
                        y: 85,
                      };
                      setTextOverlays((prev) => [...prev.filter(t => t.id !== "caption-auto"), newCap]);
                      toast({ description: "Auto-captions generated!" });
                    }}
                    className="flex flex-col items-center gap-1 text-center group cursor-pointer"
                  >
                    <div className="size-10 bg-black/45 border border-white/5 rounded-full flex items-center justify-center shadow-lg hover:bg-[#272727]">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" className="size-5 text-white">
                        <rect x="3" y="5" width="18" height="14" rx="2" />
                        <line x1="7" y1="10" x2="17" y2="10" strokeWidth="2.5" />
                        <line x1="7" y1="14" x2="13" y2="14" strokeWidth="2.5" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-bold text-white drop-shadow">Captions</span>
                  </button>

                  {/* Voiceover */}
                  <button 
                    onClick={() => {
                      setCreatorStep("timelineEditor");
                      setActiveEditorOverlay("voiceover");
                    }}
                    className="flex flex-col items-center gap-1 text-center group cursor-pointer"
                  >
                    <div className="size-10 bg-black/45 border border-white/5 rounded-full flex items-center justify-center shadow-lg hover:bg-[#272727] text-white">
                      <Mic className="size-5" />
                    </div>
                    <span className="text-[10px] font-bold text-white drop-shadow">Voiceover</span>
                  </button>

                  {/* Save to Device */}
                  <button 
                    onClick={() => {
                      toast({ description: "Video rendering compiled. Saved to device gallery!" });
                    }}
                    className="flex flex-col items-center gap-1 text-center group cursor-pointer"
                  >
                    <div className="size-10 bg-black/45 border border-white/5 rounded-full flex items-center justify-center shadow-lg hover:bg-[#272727] text-white">
                      <Download className="size-5" />
                    </div>
                    <span className="text-[10px] font-bold text-white drop-shadow">Save to device</span>
                  </button>

                  {/* Close ChevronUp */}
                  <button 
                    onClick={() => setIsSidebarExpanded(false)}
                    className="flex flex-col items-center gap-1 text-center group cursor-pointer"
                  >
                    <div className="size-10 bg-black/45 border border-white/5 rounded-full flex items-center justify-center shadow-lg hover:bg-[#272727] text-white">
                      <ChevronUp className="size-5" />
                    </div>
                    <span className="text-[10px] font-bold text-white drop-shadow">Close</span>
                  </button>
                </>
              ) : (
                /* More ChevronDown */
                <button 
                  onClick={() => setIsSidebarExpanded(true)}
                  className="flex flex-col items-center gap-1 text-center group cursor-pointer"
                >
                  <div className="size-10 bg-black/45 border border-white/5 rounded-full flex items-center justify-center shadow-lg hover:bg-[#272727] text-white">
                    <ChevronDown className="size-5" />
                  </div>
                  <span className="text-[10px] font-bold text-white drop-shadow">More</span>
                </button>
              )}
            </div>

            {/* Swipe up indicator (Image 1 style matching) */}
            <div className="absolute inset-x-0 bottom-24 z-10 flex flex-col items-center justify-center gap-1.5 text-center pointer-events-none">
              <ArrowUp className="size-4 text-white animate-bounce" />
              <span className="text-[11.5px] text-zinc-300 font-bold tracking-wide select-none animate-pulse">
                Swipe up to edit
              </span>
            </div>

            {/* Bottom Action buttons (YouTube Short style matching) */}
            <div className="absolute inset-x-0 bottom-0 z-20 h-20 px-6 flex items-center justify-between border-t border-zinc-900/60 bg-black/90 backdrop-blur-md shrink-0">
              <button
                onClick={() => setCreatorStep("timelineEditor")}
                className="bg-white/10 hover:bg-white/20 text-white font-extrabold text-sm px-5 py-2.5 rounded-full flex items-center gap-2 transition-all border border-white/5 shadow-md active:scale-95 select-none"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="size-4.5 text-white">
                  <rect x="3" y="6" width="18" height="12" rx="1.5" />
                  <line x1="8" y1="6" x2="8" y2="18" />
                  <line x1="16" y1="6" x2="16" y2="18" />
                  <circle cx="12" cy="12" r="1.5" />
                </svg>
                <span>Timeline</span>
              </button>

              <button
                onClick={() => {
                  setCreatorStep("addDetails");
                }}
                className="bg-white hover:bg-zinc-150 text-black font-extrabold text-sm px-7 py-2.5 rounded-full transition-all shadow-lg active:scale-95 select-none"
              >
                <span>Next</span>
              </button>
            </div>

          </div>
        )}

        {/* ==================== WIZARD STEP 4: ADVANCED TIMELINE EDITOR (Image 2) ==================== */}
        {creatorStep === "timelineEditor" && selectedAsset && (
          <div className="flex flex-col flex-grow w-full h-full bg-[#121212] relative select-none">
            
            {/* Header */}
            <header className="h-14 flex items-center justify-between px-4 bg-[#121212] select-none shrink-0 z-20 border-b border-zinc-800/50">
              <button
                onClick={() => {
                  setIsPlaying(false);
                  setCreatorStep("shortEditor");
                }}
                className="p-2 hover:bg-zinc-800 rounded-full flex items-center justify-center transition-colors"
                title="Back"
              >
                <ArrowLeft className="size-6 text-white" />
              </button>

              <span className="text-lg font-bold text-white tracking-wide">Edit</span>

              <button
                onClick={() => {
                  setIsPlaying(false);
                  setCreatorStep("shortEditor");
                }}
                className="text-white font-bold text-sm bg-zinc-800 hover:bg-zinc-700 px-4 py-1.5 rounded-full transition-all"
              >
                Done
              </button>
            </header>

            {/* Asset Preview Container */}
            <div className="flex-1 flex items-center justify-center bg-[#0e0e0e] px-4 py-3 relative overflow-hidden">
              <div className="w-full max-w-[280px] aspect-[9/16] rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800/80 relative shadow-2xl">
                {selectedAsset.mediaType === "VIDEO" ? (
                  <video
                    src={selectedAsset.uri}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
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
                    className="w-full h-full object-cover"
                    style={{
                      filter: activeFilter === "none" ? "none" : 
                              activeFilter === "grayscale" ? "grayscale(100%)" : 
                              activeFilter === "sepia" ? "sepia(100%)" : 
                              activeFilter === "hue-rotate" ? "hue-rotate(90deg)" : "invert(100%)" 
                    }}
                  />
                )}

                {/* Dynamic Drag-and-Drop Overlays */}
                {textOverlays.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      left: `${item.x}%`,
                      top: `${item.y}%`,
                      color: item.color,
                      fontSize: `${item.fontSize}px`,
                      transform: "translate(-50%, -50%)",
                    }}
                    className={cn(
                      "absolute cursor-move p-2 font-bold pointer-events-auto select-none rounded bg-black/45 border border-white/5 shadow-2xl z-20",
                      item.fontFamily === "YouTube Sans" && "font-youtube-sans",
                      item.fontFamily === "Serif Classic" && "font-classic-serif",
                      item.fontFamily === "Tech Mono" && "font-monospace-tech",
                      item.fontFamily === "Handwriting" && "font-handwriting"
                    )}
                    onPointerDown={(e) => handlePointerDown(e, item.id, "text")}
                    onDoubleClick={() => handleEditText(item)}
                  >
                    {item.text}
                    {/* Delete overlay handler button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTextOverlays(prev => prev.filter(t => t.id !== item.id));
                      }}
                      className="absolute -top-1.5 -right-1.5 bg-black border border-white/15 hover:bg-red-950 hover:border-red-500 text-white rounded-full p-1 transition-all"
                    >
                      <X className="size-2.5" />
                    </button>
                  </div>
                ))}

                {stickerOverlays.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      left: `${item.x}%`,
                      top: `${item.y}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                    className="absolute cursor-move pointer-events-auto select-none p-3.5 rounded-2xl shadow-2xl border border-white/15 bg-black/85 backdrop-blur-md text-white min-w-[130px] text-center z-20"
                    onPointerDown={(e) => handlePointerDown(e, item.id, "sticker")}
                  >
                    {item.type === "qa" && (
                      <div className="flex flex-col gap-1 items-center">
                        <span className="text-[9px] text-purple-400 font-extrabold uppercase tracking-widest">Q&A</span>
                        <p className="text-xs font-bold text-zinc-100">{item.title}</p>
                        <div className="w-full h-7 bg-white/10 rounded-lg text-[10px] text-zinc-400 font-semibold flex items-center justify-center mt-1 border border-white/5">
                          Ask something...
                        </div>
                      </div>
                    )}
                    {item.type === "addyours" && (
                      <div className="flex items-center gap-1.5 justify-center py-1">
                        <span className="text-md">📷</span>
                        <span className="text-xs font-black tracking-wide text-rose-500 uppercase">{item.title}</span>
                      </div>
                    )}
                    {item.type === "poll" && (
                      <div className="flex flex-col gap-1.5 items-center">
                        <span className="text-[9px] text-blue-400 font-black tracking-wider uppercase">POLL</span>
                        <p className="text-xs font-bold">{item.title}</p>
                        <div className="flex gap-2 w-full mt-1">
                          {item.options?.map((opt) => (
                            <button key={opt} className="flex-1 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-[11px] font-bold text-white transition-colors border border-white/5">
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {item.type === "quiz" && (
                      <div className="flex flex-col gap-1.5 items-center">
                        <span className="text-[9px] text-yellow-500 font-black tracking-wider uppercase">QUIZ</span>
                        <p className="text-xs font-bold">{item.title}</p>
                        <div className="flex flex-col gap-1 w-full mt-1">
                          {item.options?.map((opt) => (
                            <button key={opt} className="w-full py-1 bg-white/10 hover:bg-white/20 rounded-lg text-[11px] font-bold text-left px-2.5 text-zinc-250 border border-white/5">
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {item.type === "image" && (
                      <div className="relative size-14 rounded-lg overflow-hidden border border-white/20">
                        <img src={item.title} className="w-full h-full object-cover" alt="Custom Sticker" />
                      </div>
                    )}
                    {/* Delete overlay handler button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setStickerOverlays(prev => prev.filter(s => s.id !== item.id));
                      }}
                      className="absolute -top-1.5 -right-1.5 bg-black border border-white/15 hover:bg-red-950 hover:border-red-500 text-white rounded-full p-1 transition-all"
                    >
                      <X className="size-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Playback & Timer Display */}
            <div className="flex items-center justify-between px-6 py-2.5 shrink-0 bg-[#121212] z-10">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="size-11 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:bg-zinc-150 transition-colors"
              >
                {isPlaying ? <Pause className="size-5 fill-black text-black" /> : <Play className="size-5 fill-black text-black pl-0.5" />}
              </button>
              
              <div className="text-[13px] font-mono font-bold tracking-wider text-zinc-350">
                <span className="text-white">{currentTime.toFixed(2)}s</span>
                <span className="text-zinc-600 mx-1.5">/</span>
                <span>{trimmedDuration.toFixed(2)}s</span>
              </div>
            </div>

            {/* Timeline Filmstrip & Ruler Scrubber (Image 2) */}
            <div className="h-44 bg-[#18181c] border-t border-zinc-800/80 px-4 py-3 flex flex-col justify-between select-none relative shrink-0 z-10">
              
              {/* Timeline Ruler Ticks */}
              <div className="relative w-full h-5 text-[10px] font-mono text-zinc-500 font-bold select-none border-b border-zinc-800/40">
                {Array.from({ length: 7 }).map((_, index) => {
                  const tickVal = (index * (trimmedDuration / 6)).toFixed(1);
                  const leftPos = (index * 16.66);
                  return (
                    <span 
                      key={index} 
                      className="absolute transform -translate-x-1/2"
                      style={{ left: `${leftPos}%` }}
                    >
                      {tickVal}
                    </span>
                  );
                })}
              </div>

              {/* Scrubber Container */}
              <div 
                className="relative w-full h-24 bg-zinc-950/40 rounded-xl border border-zinc-900/60 overflow-hidden flex flex-col justify-center cursor-pointer select-none"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const pct = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
                  setCurrentTime((pct / 100) * trimmedDuration);
                }}
              >
                {/* Horizontal Filmstrip layer preview */}
                <div className="absolute inset-x-0 h-10 flex gap-0.5 opacity-30 pointer-events-none">
                  {Array.from({ length: 8 }).map((_, idx) => (
                    <div key={idx} className="flex-1 h-full overflow-hidden bg-zinc-950">
                      <img 
                        src={selectedAsset.uri} 
                        className="w-full h-full object-cover" 
                        alt="filmstrip thumbnail" 
                      />
                    </div>
                  ))}
                </div>

                {/* Overlaid markers of other segments */}
                {textOverlays.length > 0 && (
                  <div className="absolute top-1 left-2 bg-blue-600/70 border border-blue-500 text-white font-bold text-[9px] px-2 py-0.5 rounded shadow-sm flex items-center gap-1 select-none pointer-events-none">
                    <FileText className="size-2.5 text-white" />
                    <span>{textOverlays.length} Text</span>
                  </div>
                )}
                
                {stickerOverlays.length > 0 && (
                  <div className="absolute top-1 right-2 bg-purple-600/70 border border-purple-500 text-white font-bold text-[9px] px-2 py-0.5 rounded shadow-sm flex items-center gap-1 select-none pointer-events-none">
                    <Smile className="size-2.5 text-white" />
                    <span>{stickerOverlays.length} Stickers</span>
                  </div>
                )}

                {activeMusicTrack && (
                  <div className="absolute bottom-1.5 left-2 bg-rose-600/70 border border-rose-500 text-white font-bold text-[9px] px-2 py-0.5 rounded shadow-sm flex items-center gap-1 select-none pointer-events-none">
                    <Music className="size-2.5 text-white" />
                    <span>Music Active</span>
                  </div>
                )}

                {voiceoverAudios.length > 0 && (
                  <div className="absolute bottom-1.5 right-2 bg-emerald-600/70 border border-emerald-500 text-white font-bold text-[9px] px-2 py-0.5 rounded shadow-sm flex items-center gap-1 select-none pointer-events-none">
                    <Mic className="size-2.5 text-white" />
                    <span>Voiceover Active</span>
                  </div>
                )}

                {/* Red Moving Scrubber Line */}
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 shadow-lg pointer-events-none transition-all duration-75 flex items-center justify-center"
                  style={{ left: `${(currentTime / trimmedDuration) * 100}%` }}
                >
                  <div className="size-2.5 rounded-full bg-red-500 -mt-1.5" />
                </div>
              </div>

              <div className="text-[11px] text-zinc-550 font-semibold text-center">
                Tap anywhere on scrubber to seek
              </div>
            </div>

            {/* Bottom Actions Row (Image 2) */}
            <div className="h-16 flex items-center justify-around border-t border-zinc-800 bg-[#121212] pb-safe shrink-0 z-20">
              <button
                onClick={() => {
                  setTempText("");
                  setEditingTextOverlayId(null);
                  setActiveEditorOverlay("text");
                }}
                className="flex flex-col items-center justify-center gap-1 text-zinc-400 hover:text-white"
              >
                <FileText className="size-5" />
                <span className="text-[10px] font-bold">Text</span>
              </button>

              <button
                onClick={() => setActiveEditorOverlay("music")}
                className="flex flex-col items-center justify-center gap-1 text-zinc-400 hover:text-white"
              >
                <Music className="size-5" />
                <span className="text-[10px] font-bold">Music</span>
              </button>

              <button
                onClick={() => setActiveEditorOverlay("stickers")}
                className="flex flex-col items-center justify-center gap-1 text-zinc-400 hover:text-white"
              >
                <Smile className="size-5" />
                <span className="text-[10px] font-bold">Stickers</span>
              </button>

              <button
                onClick={() => {
                  setVoiceoverRecordingState("idle");
                  setActiveEditorOverlay("voiceover");
                }}
                className="flex flex-col items-center justify-center gap-1 text-zinc-400 hover:text-white"
              >
                <Mic className="size-5" />
                <span className="text-[10px] font-bold">Voiceover</span>
              </button>
            </div>

            {/* ==================== SUB-TOOL OVERLAYS & BOTTOM SHEETS ==================== */}

            {/* A. TEXT OVERLAY EDITOR SHEET (Image 3) */}
            {activeEditorOverlay === "text" && (
              <div className="absolute inset-0 bg-black/90 flex flex-col justify-between z-50 p-4 font-sans select-none animate-fade-in pointer-events-auto">
                {/* Header controls */}
                <div className="flex items-center justify-between w-full h-14 z-10 select-none">
                  {/* Font Selector Cycler Pill */}
                  <button
                    onClick={() => {
                      const curIndex = FONT_STYLES.findIndex(f => f.name === tempFontFamily);
                      const nextIndex = (curIndex + 1) % FONT_STYLES.length;
                      setTempFontFamily(FONT_STYLES[nextIndex].name);
                      toast({ description: `Switched font to: ${FONT_STYLES[nextIndex].name}` });
                    }}
                    className="h-9 px-4.5 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white font-extrabold text-[13px] rounded-full border border-zinc-700 shadow-md flex items-center gap-1.5 transition-all select-none"
                  >
                    <span>{tempFontFamily}</span>
                    <ChevronDown className="size-3.5" />
                  </button>

                  <button
                    onClick={handleSaveText}
                    className="h-9 px-5 bg-white text-black hover:bg-zinc-150 font-black text-sm rounded-full transition-all select-none shadow-md"
                  >
                    Done
                  </button>
                </div>

                {/* Main input wrapper */}
                <div className="flex-1 flex items-center justify-center relative w-full px-12 select-none">
                  {/* Left-side vertical text-size slider */}
                  <div className="absolute left-2 top-1/2 transform -translate-y-1/2 flex flex-col items-center gap-2 select-none">
                    <span className="text-[10px] text-zinc-550 font-bold select-none uppercase">Size</span>
                    <input
                      type="range"
                      min="16"
                      max="72"
                      value={tempFontSize}
                      onChange={(e) => setTempFontSize(Number(e.target.value))}
                      className="h-36 w-1 hover:opacity-100 transition-opacity outline-none appearance-none bg-zinc-800 rounded-lg cursor-pointer select-none vertical-slider"
                      style={{ writingMode: "bt-lr", WebkitAppearance: "slider-vertical" } as any}
                    />
                  </div>

                  <textarea
                    autoFocus
                    value={tempText}
                    onChange={(e) => setTempText(e.target.value)}
                    style={{
                      color: tempColor,
                      fontSize: `${tempFontSize}px`,
                    }}
                    className={cn(
                      "w-full bg-transparent border-0 text-center font-bold focus:outline-none resize-none min-h-[140px] select-text placeholder-zinc-700 py-4.5 rounded-xl border border-dashed border-zinc-800/10 focus:border-zinc-800/40",
                      tempFontFamily === "YouTube Sans" && "font-youtube-sans",
                      tempFontFamily === "Serif Classic" && "font-classic-serif",
                      tempFontFamily === "Tech Mono" && "font-monospace-tech",
                      tempFontFamily === "Handwriting" && "font-handwriting"
                    )}
                    placeholder="Enter text..."
                    rows={3}
                  />
                </div>

                {/* Footer color selector list */}
                <div className="flex flex-col gap-4 select-none shrink-0 z-15">
                  <div className="flex items-center gap-3 overflow-x-auto py-2 px-2.5 scrollbar-none justify-center">
                    {["#ffffff", "#000000", "#ff0000", "#ff7f00", "#ffff00", "#00ff00", "#0000ff", "#4b0082", "#8b00ff", "#ff007f"].map((col) => {
                      const isSelected = tempColor === col;
                      return (
                        <button
                          key={col}
                          onClick={() => setTempColor(col)}
                          style={{ backgroundColor: col }}
                          className={cn(
                            "size-7.5 rounded-full border flex items-center justify-center transition-all scale-100 hover:scale-105 active:scale-95 shadow-lg",
                            col === "#ffffff" ? "border-zinc-400" : "border-zinc-900/60",
                            isSelected ? "ring-2 ring-white scale-110" : ""
                          )}
                        >
                          {isSelected && (
                            <div className={cn("size-2 rounded-full", col === "#ffffff" ? "bg-black" : "bg-white")} />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Standard Android/iOS style emulated keyboard block */}
                  <div className="w-full bg-[#1c1c1e] text-zinc-400 p-2.5 rounded-t-2xl border-t border-zinc-800/50 flex flex-col gap-1 items-center select-none opacity-85">
                    <div className="w-12 h-1 bg-zinc-800 rounded-full mb-1.5" />
                    <span className="text-[10.5px] font-bold tracking-wide text-zinc-550 uppercase select-none">Tap done to save overlay</span>
                  </div>
                </div>
              </div>
            )}

            {/* B. SOUND/MUSIC SELECTOR BOTTOM SHEET */}
            {activeEditorOverlay === "music" && (
              <div className="absolute inset-x-0 bottom-0 bg-[#1c1c1e] text-white rounded-t-[20px] max-h-[75vh] flex flex-col justify-between z-50 p-4 font-sans select-none border-t border-zinc-850 shadow-2xl animate-slide-up pointer-events-auto">
                <header className="h-12 flex items-center justify-between shrink-0 border-b border-zinc-800 pb-2">
                  <div className="flex items-center gap-1">
                    <Music className="size-4.5 text-zinc-400" />
                    <h3 className="font-extrabold text-[16px] text-white pl-0.5">Add sound</h3>
                  </div>
                  <button
                    onClick={() => setActiveEditorOverlay("none")}
                    className="p-1 hover:bg-zinc-850 rounded-full"
                  >
                    <X className="size-5.5 text-zinc-400" />
                  </button>
                </header>

                {/* Tracks list */}
                <div className="flex-grow overflow-y-auto py-2.5 space-y-2">
                  {MOCK_TRACKS.map((track) => {
                    const isSelected = activeMusicTrack?.id === track.id;
                    return (
                      <div
                        key={track.id}
                        onClick={() => {
                          if (isSelected) {
                            setActiveMusicTrack(null);
                          } else {
                            setActiveMusicTrack(track);
                            toast({ description: `Sound synced: ${track.title}` });
                          }
                        }}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer",
                          isSelected ? "bg-zinc-850 border-rose-500/50 shadow-md" : "bg-zinc-900/40 border-zinc-850 hover:bg-zinc-900/80"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-lg bg-zinc-800 flex items-center justify-center text-rose-500 border border-zinc-850">
                            {isSelected ? <Play className="size-4.5 fill-rose-500 text-rose-500 animate-pulse" /> : <Music className="size-4.5 text-zinc-400" />}
                          </div>
                          <div className="flex flex-col text-left">
                            <span className="text-sm font-bold text-white">{track.title}</span>
                            <span className="text-xs text-zinc-450 mt-0.5">{track.artist}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zinc-500 font-semibold">{track.duration}</span>
                          {isSelected && <Check className="size-4.5 text-rose-500 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Sound control footer */}
                <div className="pt-3 border-t border-zinc-800/85 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2 text-zinc-400 text-xs">
                    <Volume2 className="size-4 text-zinc-400" />
                    <span>Syncs with video play</span>
                  </div>
                  <button
                    onClick={() => setActiveEditorOverlay("none")}
                    className="bg-white text-black font-black text-xs px-6 py-2.5 rounded-full shadow-md hover:bg-zinc-150 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}

            {/* C. STICKERS SELECTOR BOTTOM SHEET (Image 4) */}
            {activeEditorOverlay === "stickers" && (
              <div className="absolute inset-x-0 bottom-0 bg-[#1c1c1e] text-white rounded-t-[20px] max-h-[70vh] flex flex-col justify-between z-50 p-4 font-sans select-none border-t border-zinc-850 shadow-2xl animate-slide-up pointer-events-auto">
                <header className="h-12 flex items-center justify-between shrink-0 border-b border-zinc-800 pb-2">
                  <h3 className="font-extrabold text-[16px] text-white">Choose Sticker</h3>
                  <button
                    onClick={() => {
                      setActiveEditorOverlay("none");
                      setIsSelectingStickerImage(false);
                    }}
                    className="p-1 hover:bg-zinc-850 rounded-full"
                  >
                    <X className="size-5.5 text-zinc-400" />
                  </button>
                </header>

                {/* Sticker categories grid (Image 4) */}
                {!isSelectingStickerImage ? (
                  <div className="grid grid-cols-2 gap-3.5 py-4 overflow-y-auto">
                    <button
                      onClick={() => setIsSelectingStickerImage(true)}
                      className="bg-zinc-900 border border-zinc-850 hover:bg-zinc-850 rounded-2xl p-4 flex flex-col items-center justify-center gap-2.5 shadow-md transition-all active:scale-95 text-center"
                    >
                      <span className="text-xl">🖼️</span>
                      <span className="text-xs font-bold text-white uppercase tracking-wider">Image Sticker</span>
                    </button>

                    <button
                      onClick={() => handleAddSticker("qa")}
                      className="bg-zinc-900 border border-zinc-850 hover:bg-zinc-850 rounded-2xl p-4 flex flex-col items-center justify-center gap-2.5 shadow-md transition-all active:scale-95 text-center"
                    >
                      <span className="text-xl">💬</span>
                      <span className="text-xs font-bold text-white uppercase tracking-wider">Q&A Widget</span>
                    </button>

                    <button
                      onClick={() => handleAddSticker("addyours")}
                      className="bg-zinc-900 border border-zinc-850 hover:bg-zinc-850 rounded-2xl p-4 flex flex-col items-center justify-center gap-2.5 shadow-md transition-all active:scale-95 text-center"
                    >
                      <span className="text-xl">📸</span>
                      <span className="text-xs font-bold text-white uppercase tracking-wider">Add yours</span>
                    </button>

                    <button
                      onClick={() => handleAddSticker("poll")}
                      className="bg-zinc-900 border border-zinc-850 hover:bg-zinc-850 rounded-2xl p-4 flex flex-col items-center justify-center gap-2.5 shadow-md transition-all active:scale-95 text-center"
                    >
                      <span className="text-xl">📊</span>
                      <span className="text-xs font-bold text-white uppercase tracking-wider">Poll Sticker</span>
                    </button>

                    <button
                      onClick={() => handleAddSticker("quiz")}
                      className="bg-zinc-900 border border-zinc-850 hover:bg-zinc-850 rounded-2xl p-4 flex-col items-center justify-center gap-2.5 shadow-md transition-all active:scale-95 text-center col-span-2 flex"
                    >
                      <span className="text-xl">❓</span>
                      <span className="text-xs font-bold text-white uppercase tracking-wider">Interactive Quiz</span>
                    </button>
                  </div>
                ) : (
                  // Custom photo selector strip inside stickers
                  <div className="flex flex-col gap-3 py-3 overflow-y-auto">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-bold text-zinc-400">Tap a photo to add as sticker:</span>
                      <button onClick={() => setIsSelectingStickerImage(false)} className="text-xs text-sky-500 font-bold hover:underline">
                        Back to options
                      </button>
                    </div>
                    {getAccessibleMedia().length === 0 ? (
                      <div className="py-6 text-center text-xs text-zinc-550">
                        No photos imported. Select photos in composer gallery strip first.
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-1 px-0.5">
                        {getAccessibleMedia().map((media) => (
                          <div
                            key={media.id}
                            onClick={() => handleAddSticker("image", media.uri)}
                            className="aspect-square relative cursor-pointer rounded-lg overflow-hidden bg-zinc-950 hover:opacity-90 transition-opacity"
                          >
                            <img src={media.uri} className="w-full h-full object-cover" alt="Gallery preview" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-2 shrink-0 text-center select-none text-[10.5px] text-zinc-500 font-semibold tracking-wide uppercase">
                  Widgets are fully draggable
                </div>
              </div>
            )}

            {/* D. VOICEOVER RECORDING BOTTOM SHEET (Image 5) */}
            {activeEditorOverlay === "voiceover" && (
              <div className="absolute inset-x-0 bottom-0 bg-[#1c1c1e] text-white rounded-t-[20px] max-h-[65vh] flex flex-col justify-between z-50 p-4 font-sans select-none border-t border-zinc-850 shadow-2xl animate-slide-up pointer-events-auto">
                <header className="h-12 flex items-center justify-between shrink-0 border-b border-zinc-800 pb-2">
                  <div className="flex items-center gap-1.5">
                    <Mic className="size-4.5 text-zinc-400" />
                    <h3 className="font-extrabold text-[16px] text-white">Voiceover</h3>
                  </div>
                  <button
                    onClick={() => {
                      stopVoiceoverRecording();
                      setActiveEditorOverlay("none");
                    }}
                    className="p-1 hover:bg-zinc-850 rounded-full"
                  >
                    <X className="size-5.5 text-zinc-400" />
                  </button>
                </header>

                {/* Recorder body */}
                <div className="flex-1 flex flex-col items-center justify-center py-6 gap-5 select-none">
                  {voiceoverRecordingState === "idle" && (
                    <div className="text-center space-y-1.5 animate-fade-in">
                      <p className="text-sm font-bold text-zinc-350">Tap red button to record audio</p>
                      <p className="text-xs text-zinc-550 leading-relaxed max-w-xs">
                        This overlays your recorded microphone track concurrently during media preview playback.
                      </p>
                    </div>
                  )}

                  {voiceoverRecordingState === "recording" && (
                    <div className="text-center space-y-4 w-full px-4.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="size-2 bg-red-600 rounded-full animate-ping" />
                        <span className="font-mono text-xl font-bold tracking-wider text-white">
                          {voiceoverRecordDuration.toFixed(1)}s
                        </span>
                      </div>
                      
                      {/* Pulse Waveform simulator visualizer */}
                      <div className="w-full flex items-end justify-center gap-1.5 h-12 py-1 select-none pointer-events-none">
                        {Array.from({ length: 14 }).map((_, index) => {
                          const delay = (index * 0.1).toFixed(1);
                          return (
                            <div
                              key={index}
                              style={{ animationDelay: `${delay}s` }}
                              className="w-1.5 bg-red-500 rounded-full animate-sound-wave"
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {voiceoverRecordingState === "completed" && (
                    <div className="text-center space-y-1.5 animate-fade-in">
                      <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-semibold text-xs">
                        <Check className="size-4.5 stroke-[3]" />
                        <span>Recording captured!</span>
                      </div>
                      <p className="text-xs text-zinc-400 font-semibold tracking-wide">
                        Duration: {(voiceoverRecordDuration || 3.0).toFixed(1)}s starting at {voiceoverRecordingStartTimeRef.current.toFixed(1)}s
                      </p>
                    </div>
                  )}

                  {/* Dynamic Big Red Record trigger button */}
                  <div className="flex items-center justify-center mt-2.5">
                    {voiceoverRecordingState !== "completed" ? (
                      <button
                        onClick={() => {
                          if (voiceoverRecordingState === "recording") {
                            stopVoiceoverRecording();
                          } else {
                            startVoiceoverRecording();
                          }
                        }}
                        className={cn(
                          "size-20 rounded-full border-4 border-white flex items-center justify-center transition-all select-none shadow-xl active:scale-95",
                          voiceoverRecordingState === "recording" ? "bg-zinc-800 scale-105 border-red-500 animate-pulse" : "bg-red-600"
                        )}
                      >
                        {voiceoverRecordingState === "recording" ? (
                          <div className="size-7 bg-red-500 rounded-md" />
                        ) : (
                          <div className="size-12 rounded-full bg-red-600 border border-black/10" />
                        )}
                      </button>
                    ) : (
                      // Undo/redo controls if recording exists
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => {
                            setRecordedVoiceoverUrl(null);
                            setVoiceoverRecordingState("idle");
                            setVoiceoverRecordDuration(0);
                          }}
                          className="bg-[#272727] hover:bg-[#3e3e3e] text-white font-bold text-xs px-5 py-2.5 rounded-full transition-colors shadow-md"
                        >
                          Retake
                        </button>
                        
                        <button
                          onClick={handleSaveVoiceover}
                          className="bg-white text-black font-black text-xs px-6 py-2.5 rounded-full transition-all shadow-md hover:bg-zinc-150 active:scale-95"
                        >
                          Save Snippet
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 shrink-0 text-center select-none text-[10.5px] text-zinc-500 font-semibold tracking-wide uppercase">
                  Mic permission is required
                </div>
              </div>
            )}

          </div>
        )}

        {/* ==================== WIZARD STEP 5: ADD DETAILS SCREEN (Image 2 & 3) ==================== */}
        {creatorStep === "addDetails" && selectedAsset && (
          <div className="flex flex-col flex-grow w-full h-full bg-[#0F0F0F] text-white relative select-none overflow-y-auto">
            {/* Header */}
            <header className="h-14 flex items-center justify-between px-4 bg-[#0F0F0F] select-none shrink-0 sticky top-0 z-30 border-b border-zinc-800/80">
              <button
                onClick={() => setCreatorStep("shortEditor")}
                className="p-2 hover:bg-zinc-800 rounded-full flex items-center justify-center transition-colors"
                title="Back"
              >
                <ArrowLeft className="size-6 text-white" />
              </button>
              <h2 className="text-[17px] font-bold text-white tracking-wide">Add details</h2>
              <div className="w-10" /> {/* Spacer */}
            </header>

            <div className="flex-grow p-4 space-y-6 pb-24">
              
              {/* Media Preview & Caption Box */}
              <div className="flex gap-4 items-start bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800/50 backdrop-blur-sm">
                {/* Scaled Thumbnail Preview */}
                <div 
                  onClick={() => setCreatorStep("shortEditor")}
                  className="relative w-24 aspect-[9/16] rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800/80 group cursor-pointer shadow-lg shrink-0 flex-none"
                >
                  {selectedAsset.mediaType === "VIDEO" ? (
                    <video
                      src={selectedAsset.uri}
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={selectedAsset.uri}
                      alt="Short Preview"
                      className="w-full h-full object-cover"
                    />
                  )}
                  {/* Pencil Edit Icon in center */}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-black/60 p-2 rounded-full border border-white/20">
                      <Pencil className="size-4 text-white" />
                    </div>
                  </div>
                  {/* Duration Badge */}
                  <div className="absolute bottom-1.5 right-1.5 bg-black/70 px-1 py-0.5 rounded text-[9px] text-white font-mono font-bold">
                    {selectedAsset.duration || "0:02"}
                  </div>
                </div>

                {/* Caption Text Area */}
                <div className="flex-grow relative flex flex-col gap-2 min-w-0">
                  <div className="text-xs text-zinc-550 font-bold uppercase tracking-wider">Caption your Short</div>
                  <textarea
                    value={captionText}
                    onChange={(e) => handleCaptionChange(e.target.value)}
                    placeholder="Caption your Short, add #hashtags or @mentions..."
                    maxLength={100}
                    className="w-full bg-transparent text-white placeholder-zinc-500 text-[14px] leading-relaxed resize-none focus:outline-none h-20"
                  />
                  <div className="text-right text-[10px] text-zinc-500 font-bold">
                    {captionText.length}/100
                  </div>

                  {/* Hashtag Suggestions Dropdown */}
                  {showHashtagSuggestions && filteredHashtags.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-2 bg-[#212121] border border-zinc-800 rounded-xl overflow-hidden shadow-2xl z-50 max-h-40 overflow-y-auto">
                      {filteredHashtags.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => handleSelectHashtag(tag)}
                          className="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-zinc-800 transition-colors text-zinc-200 flex items-center gap-2 border-b border-zinc-900/50"
                        >
                          <span className="text-sky-500 font-black">#</span>
                          <span>{tag.replace("#", "")}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Horizontal List of Quick Hashtag Pills */}
              <div className="space-y-2">
                <div className="text-xs text-zinc-550 font-bold uppercase tracking-wider pl-1">Trending Tags</div>
                <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
                  {trendingHashtags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => {
                        // Append hashtag to caption if not already present, or toggle it
                        if (!captionText.includes(tag)) {
                          setCaptionText(prev => prev.trim() + " " + tag + " ");
                        }
                      }}
                      className="shrink-0 px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-300 rounded-full transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* User details row */}
              <div className="flex items-center gap-3 px-1 py-1">
                <UserAvatar 
                  avatarUrl={user?.avatarUrl} 
                  size={42} 
                  className="size-11 shrink-0 border border-zinc-800 rounded-full" 
                />
                <div className="flex flex-col text-left">
                  <span className="text-white text-[15px] font-bold tracking-tight">
                    {user?.displayName || user?.username || "AIM News"}
                  </span>
                  <span className="text-zinc-500 text-xs font-semibold">
                    @{user?.username || "aimnews"}
                  </span>
                </div>
              </div>

              {/* Basic Options Block */}
              <div className="bg-zinc-900/30 rounded-2xl border border-zinc-800/40 divide-y divide-zinc-800/40">
                {/* Visibility Row */}
                <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-zinc-800/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="size-9 bg-[#1A1A1A] rounded-full flex items-center justify-center text-zinc-300">
                      {visibility === "Public" ? <Globe className="size-4.5" /> : <Lock className="size-4.5" />}
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-bold text-white">Visibility</span>
                      <span className="text-[11px] text-zinc-550 font-semibold">Who can see this Short</span>
                    </div>
                  </div>
                  <div className="relative">
                    <select
                      value={visibility}
                      onChange={(e) => setVisibility(e.target.value as any)}
                      className="bg-transparent text-sm font-bold text-sky-400 focus:outline-none cursor-pointer pr-4 appearance-none"
                    >
                      <option value="Public" className="bg-[#1c1c1e] text-white">Public</option>
                      <option value="Unlisted" className="bg-[#1c1c1e] text-white">Unlisted</option>
                      <option value="Private" className="bg-[#1c1c1e] text-white">Private</option>
                    </select>
                    <ChevronDown className="size-3 text-sky-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Audience Selection Row */}
                <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-zinc-800/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="size-9 bg-[#1A1A1A] rounded-full flex items-center justify-center text-zinc-300">
                      <Users className="size-4.5" />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-bold text-white">Select audience</span>
                      <span className="text-[11px] text-zinc-550 font-semibold">Is this video made for kids?</span>
                    </div>
                  </div>
                  <div className="relative">
                    <select
                      value={audienceSelection}
                      onChange={(e) => setAudienceSelection(e.target.value)}
                      className="bg-transparent text-sm font-bold text-sky-400 focus:outline-none cursor-pointer pr-4 appearance-none"
                    >
                      <option value="No, it's not made for kids" className="bg-[#1c1c1e] text-white">No, it&apos;s not made for kids</option>
                      <option value="Yes, it's made for kids" className="bg-[#1c1c1e] text-white">Yes, it&apos;s made for kids</option>
                    </select>
                    <ChevronDown className="size-3 text-sky-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Show more toggle button */}
              <button
                onClick={() => setShowAllDetails(prev => !prev)}
                className="w-full py-3 bg-zinc-900/40 hover:bg-zinc-900/60 rounded-xl border border-zinc-800/45 text-xs font-bold text-zinc-400 flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>{showAllDetails ? "Show less" : "Show more"}</span>
                <ChevronDown className={cn("size-4 transition-transform duration-200", showAllDetails && "rotate-180")} />
              </button>

              {/* Expanded details container */}
              {showAllDetails && (
                <div className="space-y-4 animate-fade-in animate-duration-200">
                  
                  {/* Description input */}
                  <div className="flex flex-col gap-1.5 bg-zinc-900/30 p-4 rounded-2xl border border-zinc-800/40">
                    <div className="flex items-center gap-2">
                      <AlignLeft className="size-4 text-zinc-400" />
                      <label className="text-xs font-bold text-zinc-450 uppercase tracking-wider">Add description</label>
                    </div>
                    <textarea
                      value={descriptionText}
                      onChange={(e) => setDescriptionText(e.target.value)}
                      placeholder="Write a description for your Short..."
                      className="w-full bg-transparent text-white placeholder-zinc-600 text-sm leading-relaxed resize-none focus:outline-none h-16 mt-1.5"
                    />
                  </div>

                  {/* Location input */}
                  <div className="flex flex-col gap-1.5 bg-zinc-900/30 p-4 rounded-2xl border border-zinc-800/40">
                    <div className="flex items-center gap-2">
                      <MapPin className="size-4 text-zinc-400" />
                      <label className="text-xs font-bold text-zinc-450 uppercase tracking-wider">Location</label>
                    </div>
                    <input
                      type="text"
                      value={locationText}
                      onChange={(e) => setLocationText(e.target.value)}
                      placeholder="Search or add a location..."
                      className="w-full bg-transparent text-white placeholder-zinc-600 text-sm focus:outline-none mt-1.5"
                    />
                  </div>

                  {/* Related video */}
                  <div className="flex flex-col gap-1.5 bg-zinc-900/30 p-4 rounded-2xl border border-zinc-800/40">
                    <div className="flex items-center gap-2">
                      <VideoIcon className="size-4 text-zinc-400" />
                      <label className="text-xs font-bold text-zinc-450 uppercase tracking-wider">Related video</label>
                    </div>
                    <input
                      type="text"
                      value={relatedVideoText}
                      onChange={(e) => setRelatedVideoText(e.target.value)}
                      placeholder="Link to another of your videos..."
                      className="w-full bg-transparent text-white placeholder-zinc-600 text-sm focus:outline-none mt-1.5"
                    />
                  </div>

                  {/* Playlists */}
                  <div className="flex flex-col gap-1.5 bg-zinc-900/30 p-4 rounded-2xl border border-zinc-800/40">
                    <div className="flex items-center gap-2">
                      <ListPlus className="size-4 text-zinc-400" />
                      <label className="text-xs font-bold text-zinc-450 uppercase tracking-wider">Add to playlists</label>
                    </div>
                    <input
                      type="text"
                      value={playlistsText}
                      onChange={(e) => setPlaylistsText(e.target.value)}
                      placeholder="Search or select playlists..."
                      className="w-full bg-transparent text-white placeholder-zinc-600 text-sm focus:outline-none mt-1.5"
                    />
                  </div>

                  {/* Paid promotion toggle */}
                  <div className="flex items-center justify-between bg-zinc-900/30 p-4 rounded-2xl border border-zinc-800/40">
                    <div className="flex items-center gap-3">
                      <div className="size-9 bg-[#1A1A1A] rounded-full flex items-center justify-center text-zinc-300">
                        <Info className="size-4.5" />
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-sm font-bold text-white">Paid promotion</span>
                        <span className="text-[11px] text-zinc-500 font-semibold">Includes paid sponsorship label</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={paidPromotion}
                      onChange={(e) => setPaidPromotion(e.target.checked)}
                      className="size-5 rounded bg-zinc-800 accent-sky-500 border-zinc-700 cursor-pointer"
                    />
                  </div>

                  {/* Collaborations */}
                  <div className="flex flex-col gap-1.5 bg-zinc-900/30 p-4 rounded-2xl border border-zinc-800/40">
                    <div className="flex items-center gap-2">
                      <Users className="size-4 text-zinc-400" />
                      <label className="text-xs font-bold text-zinc-450 uppercase tracking-wider">Collaborations</label>
                    </div>
                    <input
                      type="text"
                      value={collaborationsText}
                      onChange={(e) => setCollaborationsText(e.target.value)}
                      placeholder="Search users to invite as co-authors..."
                      className="w-full bg-transparent text-white placeholder-zinc-650 text-sm focus:outline-none mt-1.5"
                    />
                  </div>

                  {/* AI Use label */}
                  <div className="flex items-center justify-between bg-zinc-900/30 p-4 rounded-2xl border border-zinc-800/40">
                    <div className="flex items-center gap-3">
                      <div className="size-9 bg-[#1A1A1A] rounded-full flex items-center justify-center text-zinc-300">
                        <Sparkles className="size-4.5 text-purple-400" />
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-sm font-bold text-white">AI use label</span>
                        <span className="text-[11px] text-zinc-550 font-semibold">Disclose AI generated or altered content</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={aiUseLabel}
                      onChange={(e) => setAiUseLabel(e.target.checked)}
                      className="size-5 rounded bg-zinc-800 accent-sky-500 border-zinc-700 cursor-pointer"
                    />
                  </div>

                </div>
              )}
            </div>

            {/* Footer fixed action buttons */}
            <div className="absolute inset-x-0 bottom-0 z-30 bg-[#0F0F0F] border-t border-zinc-800/80 px-4 py-3 pb-safe flex items-center gap-3 justify-between shrink-0">
              <button
                onClick={() => {
                  toast({
                    description: "Short post saved to local drafts successfully!",
                  });
                  setCreatorStep("composer");
                }}
                disabled={pendingPublishType !== null || isSubmitting}
                className="flex-1 py-3.5 bg-zinc-900 hover:bg-zinc-800 active:scale-98 rounded-full text-sm font-bold text-white text-center transition-all border border-zinc-800/60 shadow-md"
              >
                Save draft
              </button>

              <button
                onClick={handleUploadShortClick}
                disabled={pendingPublishType !== null || isSubmitting}
                className="flex-1 py-3.5 bg-white hover:bg-zinc-150 active:scale-98 rounded-full text-sm font-black text-black text-center transition-all shadow-lg flex items-center justify-center gap-1.5"
              >
                {pendingPublishType !== null || isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin text-black" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <span>Upload Short</span>
                )}
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
          <header className="h-14 flex items-center justify-between px-4 bg-black select-none z-35 shrink-0 border-b border-[#1A1A1A] relative">
            <div 
              onClick={() => setIsGalleryDropdownOpen(!isGalleryDropdownOpen)}
              className="flex items-center gap-1.5 cursor-pointer hover:bg-zinc-900 px-3 py-1.5 rounded-full active:scale-95 transition-all select-none"
            >
              <span className="text-lg font-bold text-white pl-1">{activeAlbum}</span>
              <ChevronDown className={cn("size-5 text-white transition-transform duration-200", isGalleryDropdownOpen && "rotate-180")} />
            </div>

            {isGalleryDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setIsGalleryDropdownOpen(false)} />
                <div className="absolute top-12 left-4 w-52 bg-[#1c1c1e] border border-zinc-800 rounded-2xl shadow-2xl py-2 z-50 animate-slide-up text-left">
                  <button
                    onClick={() => {
                      setActiveAlbum("Recent");
                      setIsGalleryDropdownOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-4.5 py-2.5 text-sm font-semibold transition-colors hover:bg-white/[0.03] flex items-center justify-between",
                      activeAlbum === "Recent" ? "text-sky-500" : "text-white"
                    )}
                  >
                    <span>Recent</span>
                    <span className="text-xs text-zinc-500 font-bold bg-zinc-800 px-2 py-0.5 rounded-md">
                      {(galleryPermission === "limited" ? galleryAssets.filter(item => limitedAccessibleIds.includes(item.id)).length : galleryAssets.length)}
                    </span>
                  </button>
                  {Array.from(new Set(
                    (galleryPermission === "limited" 
                      ? galleryAssets.filter(item => limitedAccessibleIds.includes(item.id)) 
                      : galleryAssets
                    ).map(a => a.bucketDisplayName).filter(Boolean)
                  )).map((album) => {
                    const count = (galleryPermission === "limited"
                      ? galleryAssets.filter(item => limitedAccessibleIds.includes(item.id))
                      : galleryAssets
                    ).filter(a => a.bucketDisplayName === album).length;
                    return (
                      <button
                        key={album}
                        onClick={() => {
                          setActiveAlbum(album!);
                          setIsGalleryDropdownOpen(false);
                        }}
                        className={cn(
                          "w-full text-left px-4.5 py-2.5 text-sm font-semibold transition-colors hover:bg-white/[0.03] flex items-center justify-between",
                          activeAlbum === album ? "text-sky-500" : "text-white"
                        )}
                      >
                        <span>{album}</span>
                        <span className="text-xs text-zinc-500 font-bold bg-zinc-800 px-2 py-0.5 rounded-md">({count})</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            <button 
              onClick={() => setShowGalleryView(false)}
              className="p-2 hover:bg-[#272727] rounded-full transition-colors flex items-center justify-center"
              title="Close"
            >
              <X className="size-6 text-white" />
            </button>
          </header>

          {/* Limited access additional selection warning banner */}
          {galleryPermission === "limited" && (
            <div className="bg-zinc-900 border-b border-zinc-800 p-3 flex items-center justify-between text-xs text-zinc-300 z-20 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                <p className="text-left leading-tight">Next Social only has access to selected items. Folders may be incomplete.</p>
              </div>
              <button 
                onClick={() => {
                  setGalleryPermission("all");
                  setTimeout(() => {
                    permissionInputRef.current?.click();
                  }, 100);
                }}
                className="bg-white text-black px-3 py-1.5 rounded-full font-medium hover:bg-zinc-200 transition shrink-0 text-[10px]"
              >
                Allow All
              </button>
            </div>
          )}

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
