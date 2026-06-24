"use client";

import { useSession } from "@/app/(main)/SessionProvider";
import LoadingButton from "@/components/LoadingButton";
import UserAvatar from "@/components/UserAvatar";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { UploadService } from "@/lib/services/uploadService";
import { LocationData, GooglePlacesLocationProvider } from "@/lib/providers/locationProvider";
import { useSubmitPostMutation } from "./mutations";
import useMediaUpload, { Attachment } from "./useMediaUpload";
import { getFilterString, getProcessedImg } from "./imageProcessing";
import { submitPost } from "./actions";
import VideoPlayer from "@/components/VideoPlayer";
import GifPicker from "@/components/stories/GifPicker";
import {
  IconGallery,
  IconCamera,
  IconGif,
  IconPoll,
  IconLocation,
  IconProduct,
  IconMore,
  IconClose,
  IconBack,
  IconEveryone,
  IconCollaborators,
  IconSchedule,
  IconSettings,
  IosSwitch,
} from "./ComposerIcons";

import {
  Loader2,
  Sparkles,
  Users,
  Globe,
  Heart,
  Calendar,
  Lock,
  Check,
  Video,
  Camera,
  Settings,
  HelpCircle,
  Accessibility,
  ArrowLeft,
  Trash2,
  X,
  Image as ImageIcon,
  MessageSquare,
  RefreshCw,
  Zap,
  ZapOff,
  HeartOff,
} from "lucide-react";
import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import GalleryPicker from "./GalleryPicker";
import "./styles.css";

const filterPresets = [
  { name: "Normal" },
  { name: "Warm" },
  { name: "Cool" },
  { name: "Vivid" },
  { name: "Mono" },
  { name: "Film" },
  { name: "Travel" },
  { name: "Portrait" },
  { name: "Food" },
  { name: "Fashion" }
];

interface ImageAdjustmentState {
  crop: { x: number; y: number };
  zoom: number;
  rotation: number;
  aspect: number;
  croppedAreaPixels: any;
  filter: string;
  brightness: number;
  contrast: number;
  saturation: number;
  vignette: number;
  temperature: number;
  sharpness: number;
  highlights: number;
  shadows: number;
}

const defaultAdjustmentState = (): ImageAdjustmentState => ({
  crop: { x: 0, y: 0 },
  zoom: 1,
  rotation: 0,
  aspect: 1,
  croppedAreaPixels: null,
  filter: "Normal",
  brightness: 1,
  contrast: 1,
  saturation: 1,
  vignette: 0,
  temperature: 0,
  sharpness: 0,
  highlights: 0,
  shadows: 0,
});

interface ThreadNode {
  id: string;
  text: string;
}

interface PostEditorProps {
  onClose?: () => void;
}

type PanelType = 
  | "none" 
  | "gif" 
  | "location" 
  | "audience" 
  | "schedule" 
  | "camera" 
  | "ai" 
  | "poll" 
  | "more" 
  | "media-edit" 
  | "collab" 
  | "settings" 
  | "alt-text"
  | "draft-recovery"
  | "gallery";

export default function PostEditor({ onClose }: PostEditorProps) {
  const { user } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const mutation = useSubmitPostMutation();

  const {
    startUpload,
    attachments,
    setAttachments,
    isUploading,
    uploadProgress,
    removeAttachment,
    reset: resetMediaUploads,
  } = useMediaUpload();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<any>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);

  const containerRef = (node: HTMLDivElement | null) => {
    setContainerEl(node);
  };

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport || !containerEl) return;

    const handleResize = () => {
      const visualViewport = window.visualViewport;
      if (!visualViewport || !containerEl) return;

      if (window.innerWidth < 640) {
        containerEl.style.height = `${visualViewport.height}px`;
        containerEl.style.maxHeight = `${visualViewport.height}px`;
        containerEl.style.minHeight = `${visualViewport.height}px`;
      } else {
        containerEl.style.height = "";
        containerEl.style.maxHeight = "";
        containerEl.style.minHeight = "";
      }
    };

    const visualViewport = window.visualViewport;
    visualViewport.addEventListener("resize", handleResize);
    handleResize();

    return () => {
      visualViewport.removeEventListener("resize", handleResize);
    };
  }, [containerEl]);

  // Lock document scroll on mobile to prevent layout shifting on input focus
  useEffect(() => {
    if (typeof window === "undefined" || window.innerWidth >= 640) return;

    const originalBodyOverflow = document.body.style.overflow;
    const originalBodyPosition = document.body.style.position;
    const originalBodyWidth = document.body.style.width;
    const originalBodyHeight = document.body.style.height;

    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalHtmlPosition = document.documentElement.style.position;
    const originalHtmlWidth = document.documentElement.style.width;
    const originalHtmlHeight = document.documentElement.style.height;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    document.body.style.height = "100%";

    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.position = "fixed";
    document.documentElement.style.width = "100%";
    document.documentElement.style.height = "100%";

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.position = originalBodyPosition;
      document.body.style.width = originalBodyWidth;
      document.body.style.height = originalBodyHeight;

      document.documentElement.style.overflow = originalHtmlOverflow;
      document.documentElement.style.position = originalHtmlPosition;
      document.documentElement.style.width = originalHtmlWidth;
      document.documentElement.style.height = originalHtmlHeight;
    };
  }, []);

  // Unified State Panel Route
  const [activePanel, setActivePanel] = useState<PanelType>("none");
  const [postType, setPostType] = useState<"normal" | "thread" | "poll" | "article">("normal");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  // Draft recovery states
  const [showDraftBanner, setShowDraftBanner] = useState(false);

  // Editor Nodes & Active indices
  const [threads, setThreads] = useState<ThreadNode[]>([
    { id: "1", text: "" }
  ]);
  const [activeThreadIndex, setActiveThreadIndex] = useState(0);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);

  // Poll state parameters
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [pollDays, setPollDays] = useState(1);
  const [pollHours, setPollHours] = useState(0);
  const [pollMinutes, setPollMinutes] = useState(0);

  // Location Selector
  const [locationSearch, setLocationSearch] = useState("");
  const [locationResults, setLocationResults] = useState<LocationData[]>([]);
  const [searchingLocations, setSearchingLocations] = useState(false);
  const [locating, setLocating] = useState(false);
  const [recentLocations, setRecentLocations] = useState<LocationData[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);

  // Media Tweaks
  const [mediaAdjustments, setMediaAdjustments] = useState<Record<string, ImageAdjustmentState>>({});
  const [activeEditSubTab, setActiveEditSubTab] = useState<"filters" | "adjustments" | "cover">("filters");
  const [selectedVideoCoverTime, setSelectedVideoCoverTime] = useState(0);
  const [mediaAltTexts, setMediaAltTexts] = useState<Record<string, string>>({});
  const [currentAltInput, setCurrentAltInput] = useState("");

  // Collaborators
  const [collaboratorSearch, setCollaboratorSearch] = useState("");
  const [invitedCollaborators, setInvitedCollaborators] = useState<{ username: string; status: "pending" | "accepted" | "declined" }[]>([]);

  // Scheduling Parameters (Native pickers helper)
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduleTimezone, setScheduleTimezone] = useState("UTC");

  // Post Configuration Settings
  const [audience, setAudience] = useState("PUBLIC");
  const [allowComments, setAllowComments] = useState(true);
  const [allowReposts, setAllowReposts] = useState(true);
  const [allowRemixes, setAllowRemixes] = useState(true);
  const [allowProductDetection, setAllowProductDetection] = useState(true);
  const [allowAITranslation, setAllowAITranslation] = useState(true);
  const [hideLikeCount, setHideLikeCount] = useState(false);
  const [sensitiveWarning, setSensitiveWarning] = useState(false);

  // Camera settings
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraFacingMode, setCameraFacingMode] = useState<"user" | "environment">("user");
  const [cameraMode, setCameraMode] = useState<"VIDEO" | "CAPTURE" | "LIVE">("CAPTURE");
  const [isCameraRecording, setIsCameraRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [cameraRepliesRestriction, setCameraRepliesRestriction] = useState<"Everyone" | "Verified accounts" | "Accounts I follow" | "My subscribers" | "No one">("Everyone");
  const [cameraLikesEnabled, setCameraLikesEnabled] = useState(true);
  const [cameraFlashEnabled, setCameraFlashEnabled] = useState(false);
  const [cameraDropdownOpen, setCameraDropdownOpen] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);

  // Translation dropdown Coming Soon languages
  const [videoTranslateTarget, setVideoTranslateTarget] = useState("English");

  const [isProcessingAndSubmitting, setIsProcessingAndSubmitting] = useState(false);

  const getAudienceLabel = () => {
    if (audience === "FOLLOWERS") return "People you follow can reply";
    if (audience === "MENTIONED_ONLY") return "Only people you mention can reply";
    return "Everyone can reply";
  };

  // Auto-Save mechanism (debounced threads text & metadata changes)
  useEffect(() => {
    const hasContent = threads.some(t => t.text.trim().length > 0) || attachments.length > 0;
    if (!hasContent) {
      setSaveStatus("idle");
      return;
    }

    setSaveStatus("saving");
    const delay = setTimeout(() => {
      const draftObj = {
        threads,
        postType,
        audience,
        selectedLocation,
        pollOptions,
        pollDays,
        pollHours,
        pollMinutes,
        scheduleDate,
        scheduleTime,
        scheduleTimezone,
        allowComments,
        allowReposts,
        allowRemixes,
        allowProductDetection,
        allowAITranslation,
        hideLikeCount,
        sensitiveWarning,
      };
      localStorage.setItem("cartly_composer_draft", JSON.stringify(draftObj));
      setSaveStatus("saved");
    }, 1000);

    return () => clearTimeout(delay);
  }, [
    threads,
    attachments,
    postType,
    audience,
    selectedLocation,
    pollOptions,
    pollDays,
    pollHours,
    pollMinutes,
    scheduleDate,
    scheduleTime,
    scheduleTimezone,
    allowComments,
    allowReposts,
    allowRemixes,
    allowProductDetection,
    allowAITranslation,
    hideLikeCount,
    sensitiveWarning
  ]);

  // Load drafts on mount
  useEffect(() => {
    const stored = localStorage.getItem("cartly_composer_draft");
    if (stored) {
      setShowDraftBanner(true);
    }
  }, []);

  // Location list loader
  useEffect(() => {
    if (activePanel === "location") {
      const provider = new GooglePlacesLocationProvider();
      provider.getRecentLocations().then(setRecentLocations).catch(console.error);
    }
  }, [activePanel]);

  // Location search autocomplete
  useEffect(() => {
    if (!locationSearch.trim() || locationSearch.trim().length < 2) {
      setLocationResults([]);
      return;
    }

    setSearchingLocations(true);
    const delay = setTimeout(async () => {
      try {
        const provider = new GooglePlacesLocationProvider();
        const matches = await provider.searchLocations(locationSearch);
        setLocationResults(matches);
      } catch (err) {
        console.error(err);
      } finally {
        setSearchingLocations(false);
      }
    }, 300);

    return () => clearTimeout(delay);
  }, [locationSearch]);

  const handleResumeDraft = () => {
    try {
      const stored = localStorage.getItem("cartly_composer_draft");
      if (stored) {
        const draft = JSON.parse(stored);
        if (draft.threads) setThreads(draft.threads);
        if (draft.postType) setPostType(draft.postType);
        if (draft.audience) setAudience(draft.audience);
        if (draft.selectedLocation) setSelectedLocation(draft.selectedLocation);
        if (draft.pollOptions) setPollOptions(draft.pollOptions);
        if (draft.pollDays) setPollDays(draft.pollDays);
        if (draft.pollHours) setPollHours(draft.pollHours);
        if (draft.pollMinutes) setPollMinutes(draft.pollMinutes);
        if (draft.scheduleDate) setScheduleDate(draft.scheduleDate);
        if (draft.scheduleTime) setScheduleTime(draft.scheduleTime);
        if (draft.scheduleTimezone) setScheduleTimezone(draft.scheduleTimezone);
        if (draft.allowComments !== undefined) setAllowComments(draft.allowComments);
        if (draft.allowReposts !== undefined) setAllowReposts(draft.allowReposts);
        if (draft.allowRemixes !== undefined) setAllowRemixes(draft.allowRemixes);
        if (draft.allowProductDetection !== undefined) setAllowProductDetection(draft.allowProductDetection);
        if (draft.allowAITranslation !== undefined) setAllowAITranslation(draft.allowAITranslation);
        if (draft.hideLikeCount !== undefined) setHideLikeCount(draft.hideLikeCount);
        if (draft.sensitiveWarning !== undefined) setSensitiveWarning(draft.sensitiveWarning);
      }
    } catch (e) {
      console.error("Failed to restore draft", e);
    }
    setShowDraftBanner(false);
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem("cartly_composer_draft");
    setShowDraftBanner(false);
  };

  const handleCloseAttempt = () => {
    const hasEdits = threads.some(t => t.text.trim().length > 0) || attachments.length > 0;
    if (hasEdits) {
      setActivePanel("draft-recovery");
    } else {
      if (onClose) onClose();
    }
  };

  const handleSaveDraftAndClose = () => {
    setActivePanel("none");
    toast({ description: "Draft saved successfully." });
    if (onClose) onClose();
  };

  const handleDiscardAndClose = () => {
    localStorage.removeItem("cartly_composer_draft");
    setThreads([{ id: "1", text: "" }]);
    resetMediaUploads();
    setActivePanel("none");
    if (onClose) onClose();
  };

  // Adjustments hooks
  const getAdjustment = (fileName: string): ImageAdjustmentState => {
    return mediaAdjustments[fileName] || defaultAdjustmentState();
  };

  const updateAdjustment = (fileName: string, updates: Partial<ImageAdjustmentState>) => {
    setMediaAdjustments((prev) => ({
      ...prev,
      [fileName]: {
        ...(prev[fileName] || defaultAdjustmentState()),
        ...updates,
      },
    }));
  };

  // WebRTC Live Camera captures
  useEffect(() => {
    let interval: any;
    if (isCameraRecording) {
      interval = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isCameraRecording]);

  const startCamera = async () => {
    try {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: cameraFacingMode, width: 720, height: 1280 },
        audio: cameraMode !== "CAPTURE"
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (e) {
      console.error(e);
      // Suppress error message if simply in desktop browser testing fallback
    }
  };

  useEffect(() => {
    if (activePanel === "camera") {
      startCamera();
    } else {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
        setCameraStream(null);
      }
    }
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [activePanel, cameraFacingMode, cameraMode]);

  const handleCapture = async () => {
    if (cameraMode === "CAPTURE") {
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 150);
    }

    if (!cameraStream) {
      // Mock capture fallback when no physical camera is active
      if (cameraMode === "CAPTURE") {
        try {
          const res = await fetch("https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&auto=format&fit=crop&q=80");
          const blob = await res.blob();
          const file = new File([blob], `mock_camera_${Date.now()}.jpg`, { type: "image/jpeg" });
          const previewUrl = URL.createObjectURL(blob);
          const newAtt: Attachment = { file, previewUrl, isUploading: true };
          setAttachments((prev) => [...prev, newAtt]);
          setActivePanel("none");

          const uploaded = await UploadService.uploadPostAttachment(file);
          setAttachments((prev) =>
            prev.map((a) => (a.previewUrl === previewUrl ? { ...a, mediaId: uploaded.mediaId, isUploading: false } : a))
          );
        } catch (e) {
          console.error(e);
        }
      } else if (cameraMode === "VIDEO") {
        toast({ description: "Mock video capture added to preview." });
        setActivePanel("none");
      } else if (cameraMode === "LIVE") {
        toast({ description: "Mock live stream ended." });
        setActivePanel("none");
      }
      return;
    }

    if (cameraMode === "CAPTURE") {
      if (videoRef.current) {
        const canvas = document.createElement("canvas");
        canvas.width = videoRef.current.videoWidth || 720;
        canvas.height = videoRef.current.videoHeight || 1280;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(async (blob) => {
            if (blob) {
              const file = new File([blob], `camera_snap_${Date.now()}.jpg`, { type: "image/jpeg" });
              const previewUrl = URL.createObjectURL(file);
              const newAtt: Attachment = { file, previewUrl, isUploading: true };
              
              setAttachments((prev) => [...prev, newAtt]);
              setActivePanel("none");
              
              try {
                const uploaded = await UploadService.uploadPostAttachment(file);
                setAttachments((prev) =>
                  prev.map((a) => (a.previewUrl === previewUrl ? { ...a, mediaId: uploaded.mediaId, isUploading: false } : a))
                );
              } catch (e) {
                console.error(e);
                toast({ variant: "destructive", description: "Failed to upload snapshot." });
              }
            }
          }, "image/jpeg", 0.95);
        }
      }
    } else {
      // Video capturing via MediaRecorder
      if (isCameraRecording) {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
        setIsCameraRecording(false);
      } else {
        recordedChunksRef.current = [];
        const options = { mimeType: "video/webm;codecs=vp9" };
        let recorder;
        try {
          recorder = new MediaRecorder(cameraStream, options);
        } catch (e) {
          recorder = new MediaRecorder(cameraStream);
        }
        mediaRecorderRef.current = recorder;
        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };
        recorder.onstop = async () => {
          const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
          const file = new File([blob], `camera_rec_${Date.now()}.webm`, { type: "video/webm" });
          const previewUrl = URL.createObjectURL(blob);
          const newAtt: Attachment = { file, previewUrl, isUploading: true };
          
          setAttachments((prev) => [...prev, newAtt]);
          setActivePanel("none");

          try {
            const uploaded = await UploadService.uploadPostAttachment(file);
            setAttachments((prev) =>
              prev.map((a) => (a.previewUrl === previewUrl ? { ...a, mediaId: uploaded.mediaId, isUploading: false } : a))
            );
          } catch (e) {
            console.error(e);
            toast({ variant: "destructive", description: "Failed to upload video recording." });
          }
        };
        recorder.start();
        setIsCameraRecording(true);
      }
    }
  };

  const triggerDemoCapture = async () => {
    setActivePanel("none");
    const res = await fetch("https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&auto=format&fit=crop&q=80");
    const blob = await res.blob();
    const file = new File([blob], `demo_fashion_${Date.now()}.jpg`, { type: "image/jpeg" });
    const previewUrl = URL.createObjectURL(blob);
    const newAtt: Attachment = { file, previewUrl, isUploading: true };
    setAttachments((prev) => [...prev, newAtt]);

    try {
      const uploaded = await UploadService.uploadPostAttachment(file);
      setAttachments((prev) =>
        prev.map((a) => (a.previewUrl === previewUrl ? { ...a, mediaId: uploaded.mediaId, isUploading: false } : a))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleGetCurrentLocation = async () => {
    setLocating(true);
    try {
      const provider = new GooglePlacesLocationProvider();
      const loc = await provider.getCurrentLocation();
      setSelectedLocation(loc);
      await provider.saveRecentLocation(loc);
      setActivePanel("none");
      toast({ description: `Location added: ${loc.locationDisplay || loc.name}` });
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        description: "Failed to access geolocation. Please check browser permissions.",
      });
    } finally {
      setLocating(false);
    }
  };

  const shiftMedia = (index: number, dir: "left" | "right") => {
    const nextIdx = dir === "left" ? index - 1 : index + 1;
    if (nextIdx < 0 || nextIdx >= attachments.length) return;
    const items = [...attachments];
    const temp = items[index];
    items[index] = items[nextIdx];
    items[nextIdx] = temp;
    setAttachments(items);
  };

  const handlePublish = async () => {
    try {
      setIsProcessingAndSubmitting(true);
      let previousPostId: string | null = null;

      // Handle individual node submits for threads, or single submit for normal/poll
      const nodesToPublish = postType === "thread" ? threads : [threads[0]];

      for (let i = 0; i < nodesToPublish.length; i++) {
        const node = nodesToPublish[i];
        const nodeMediaIds: string[] = [];

        // Upload/Process edited attachments for this specific node
        if (i === 0) {
          const processedPromises = attachments.map(async (a) => {
            const fileAdj = mediaAdjustments[a.file.name];
            const hasEdit = fileAdj && (
              fileAdj.filter !== "Normal" ||
              fileAdj.brightness !== 1 ||
              fileAdj.contrast !== 1 ||
              fileAdj.saturation !== 1 ||
              fileAdj.vignette > 0 ||
              fileAdj.temperature !== 0 ||
              fileAdj.sharpness !== 0
            );

            if (a.file.type.startsWith("image") && hasEdit) {
              const processedBlob = await getProcessedImg(
                a.previewUrl!,
                null,
                fileAdj.rotation,
                fileAdj.filter,
                {
                  brightness: fileAdj.brightness,
                  contrast: fileAdj.contrast,
                  saturation: fileAdj.saturation,
                  temperature: fileAdj.temperature,
                  vignette: fileAdj.vignette,
                  exposure: 0,
                  fade: 0,
                  sharpen: fileAdj.sharpness,
                  structure: 0,
                  highlights: fileAdj.highlights,
                  shadows: fileAdj.shadows
                }
              );
              const finalFile = new File([processedBlob], a.file.name, { type: "image/jpeg" });
              const uploaded = await UploadService.uploadPostAttachment(finalFile);
              return uploaded.mediaId;
            }
            return a.mediaId || "";
          });

          const ids = await Promise.all(processedPromises);
          ids.forEach((id) => {
            if (id) nodeMediaIds.push(id);
          });
        }

        const result = await submitPost({
          content: node.text,
          mediaIds: nodeMediaIds,
          location: selectedLocation?.name || null,
          locationName: selectedLocation?.name || null,
          locationCity: selectedLocation?.city || null,
          locationState: selectedLocation?.state || null,
          locationCountry: selectedLocation?.country || null,
          locationDisplay: selectedLocation?.locationDisplay || null,
          latitude: selectedLocation?.lat || null,
          longitude: selectedLocation?.lng || null,
          disableComments: !allowComments,
          hideLikes: hideLikeCount,
          altText: attachments.length > 0 ? mediaAltTexts[attachments[0].file.name] || null : null,
          audience,
          quotedPostId: previousPostId,
          tags: null,
          collaborators: invitedCollaborators.length > 0 ? invitedCollaborators.map(c => c.username) : null,
          poll: postType === "poll" && i === 0
            ? {
                options: pollOptions.filter(o => o.trim() !== ""),
                duration: { days: pollDays, hours: pollHours, minutes: pollMinutes }
              }
            : null
        });

        previousPostId = result.id;
      }

      queryClient.invalidateQueries({ queryKey: ["post-feed"] });
      toast({ description: postType === "thread" ? "Thread published successfully!" : "Post published successfully!" });

      setThreads([{ id: "1", text: "" }]);
      resetMediaUploads();
      localStorage.removeItem("cartly_composer_draft");
      if (onClose) onClose();
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", description: "Failed to publish post." });
    } finally {
      setIsProcessingAndSubmitting(false);
    }
  };

  // Text utilities & counters
  const charLimit = postType === "article" ? 100005 : 280;
  const activeNodeText = threads[activeThreadIndex]?.text || "";
  const charCount = activeNodeText.length;
  const isOverLimit = charCount > charLimit;
  const percentage = Math.min((charCount / charLimit) * 100, 100);

  const handleTextareaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  const handleAddThreadNode = () => {
    if (threads.length >= 25) return;
    const id = Math.random().toString();
    setThreads([...threads, { id, text: "" }]);
    setActiveThreadIndex(threads.length);
  };

  const handleRemoveThreadNode = (idx: number) => {
    if (threads.length <= 1) return;
    const list = threads.filter((_, i) => i !== idx);
    setThreads(list);
    setActiveThreadIndex(Math.max(0, idx - 1));
  };

  // Giphy download upload
  const addGiphyAttachment = async (giphyUrl: string) => {
    try {
      setActivePanel("none");
      const res = await fetch(giphyUrl);
      const blob = await res.blob();
      const file = new File([blob], `giphy_${Date.now()}.gif`, { type: "image/gif" });

      const previewUrl = giphyUrl;
      const newAtt: Attachment = { file, previewUrl, isUploading: true };
      setAttachments((prev) => [...prev, newAtt]);

      const uploaded = await UploadService.uploadPostAttachment(file);
      setAttachments((prev) =>
        prev.map((a) => (a.previewUrl === giphyUrl ? { ...a, mediaId: uploaded.mediaId, isUploading: false } : a))
      );
    } catch (e) {
      console.error("Giphy attach error", e);
      toast({ variant: "destructive", description: "Failed to attach GIF." });
    }
  };

  // AI assistant handlers
  const handleAIImprove = (style: string) => {
    setSaveStatus("saving");
    const activeText = threads[activeThreadIndex]?.text || "";
    let responseText = activeText;
    if (style === "Improve") {
      responseText = `✨ Refined: ${activeText} — designed for maximum impact.`;
    } else if (style === "Grammar") {
      responseText = `${activeText.replace(/\b(i)\b/g, "I").replace(/\b(wanna)\b/g, "want to")}`;
    } else if (style === "Shorter") {
      responseText = activeText.length > 30 ? activeText.slice(0, activeText.length / 2) + "..." : activeText;
    } else if (style === "Professional") {
      responseText = `💼 Professional Draft: ${activeText}`;
    } else if (style === "Friendly") {
      responseText = `👋 Hey guys! ${activeText} 😊`;
    } else if (style === "CTA") {
      responseText = `${activeText} Click the link in bio to learn more! 🚀`;
    } else if (style === "Caption") {
      responseText = `📝 Inspiring Caption: "${activeText}" #inspiration`;
    }

    const updated = [...threads];
    updated[activeThreadIndex].text = responseText;
    setThreads(updated);
    setSaveStatus("saved");
    setActivePanel("none");
  };

  const activeFile = attachments[activeMediaIndex]?.file?.name;
  const activeAdj = activeFile ? getAdjustment(activeFile) : defaultAdjustmentState();

  // Sub-Panel content renders in-place pushing previous view
  const renderPanelContent = () => {
    switch (activePanel) {
      case "gif":
        return (
          <div className="flex flex-col h-full bg-black text-white">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[#27272A] bg-black flex-shrink-0">
              <button 
                onClick={() => setActivePanel("none")} 
                className="p-2 hover:bg-[#121212] rounded-full min-w-[40px] min-h-[40px] flex items-center justify-center"
              >
                <IconBack />
              </button>
              <span className="font-bold text-[18px]">Select GIF</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <GifPicker 
                onSelect={(url) => {
                  addGiphyAttachment(url);
                  setActivePanel("none");
                }} 
                onClose={() => setActivePanel("none")} 
              />
            </div>
          </div>
        );
      case "location":
        return (
          <div className="flex flex-col h-full bg-black text-white">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#27272A] bg-black flex-shrink-0">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setActivePanel("none")} 
                  className="p-2 hover:bg-[#121212] rounded-full min-w-[40px] min-h-[40px] flex items-center justify-center"
                >
                  <IconBack />
                </button>
                <span className="font-bold text-[18px]">Add Location</span>
              </div>
              {selectedLocation && (
                <button 
                  onClick={() => { setSelectedLocation(null); setActivePanel("none"); }} 
                  className="text-[14px] text-red-500 font-semibold hover:opacity-80"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="p-4 space-y-4 flex-1 flex flex-col min-h-0">
              <div className="relative flex items-center border-b border-[#27272A]">
                <input
                  type="text"
                  placeholder="Search for a city or place..."
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                  className="w-full bg-transparent border-none outline-none py-2.5 text-[16px] text-white placeholder-zinc-650 focus:ring-0"
                />
                {locationSearch && (
                  <button onClick={() => setLocationSearch("")} className="text-[#A1A1AA] p-1">
                    <IconClose size={16} />
                  </button>
                )}
              </div>

              <button
                onClick={handleGetCurrentLocation}
                disabled={locating}
                className="flex items-center justify-center gap-2 py-3 bg-[#121212] hover:bg-[#1c1c1e] text-white rounded-xl text-[15px] font-semibold transition-colors disabled:opacity-50 min-h-[44px]"
              >
                {locating ? (
                  <Loader2 className="size-4 animate-spin text-white" />
                ) : (
                  <IconLocation size={20} />
                )}
                <span>Use Current Location</span>
              </button>

              <div className="flex-1 overflow-y-auto space-y-1 scrollbar-none">
                {searchingLocations ? (
                  <div className="flex items-center justify-center py-8 text-[#A1A1AA]">
                    <Loader2 className="size-5 animate-spin mr-2" />
                    <span className="text-[14px]">Searching places...</span>
                  </div>
                ) : locationSearch.trim() !== "" ? (
                  locationResults.length === 0 ? (
                    <div className="text-center py-8 text-[14px] text-[#A1A1AA]">No places found</div>
                  ) : (
                    locationResults.map((loc, idx) => (
                      <button
                        key={idx}
                        onClick={async () => {
                          setSelectedLocation(loc);
                          const provider = new GooglePlacesLocationProvider();
                          await provider.saveRecentLocation(loc);
                          setActivePanel("none");
                        }}
                        className="w-full text-left p-3 hover:bg-[#121212] rounded-xl flex flex-col gap-0.5 border-b border-[#27272A]/40 transition-colors"
                      >
                        <span className="text-[15px] font-bold text-white">{loc.name}</span>
                        {loc.description && (
                          <span className="text-[13px] text-[#A1A1AA] truncate">{loc.description}</span>
                        )}
                      </button>
                    ))
                  )
                ) : (
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-[#A1A1AA] uppercase tracking-wider block px-1 py-1">Recent Searches</span>
                    {recentLocations.length === 0 ? (
                      <div className="py-4 px-1 text-xs text-zinc-650 italic">Searched locations appear here.</div>
                    ) : (
                      recentLocations.map((loc, idx) => (
                        <button
                          key={idx}
                          onClick={async () => {
                            setSelectedLocation(loc);
                            const provider = new GooglePlacesLocationProvider();
                            await provider.saveRecentLocation(loc);
                            setActivePanel("none");
                          }}
                          className="w-full text-left p-3 hover:bg-[#121212] rounded-xl flex items-center gap-3 border-b border-[#27272A]/40 transition-colors"
                        >
                          <IconLocation size={16} className="text-[#A1A1AA]" />
                          <span className="text-[15px] font-semibold text-white">{loc.name}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case "audience":
        return (
          <div className="flex flex-col h-full bg-black text-white p-4 space-y-4">
            <div className="flex justify-between items-center border-b border-[#27272A] pb-3">
              <div className="flex items-center gap-3">
                <button onClick={() => setActivePanel("none")} className="p-2 hover:bg-[#121212] rounded-full">
                  <IconBack />
                </button>
                <h4 className="font-bold text-[18px]">Who can see this?</h4>
              </div>
              <button onClick={() => setActivePanel("none")} className="text-[15px] font-bold text-white hover:opacity-80">Done</button>
            </div>
            <div className="space-y-3 flex-grow overflow-y-auto scrollbar-none">
              {[
                { id: "PUBLIC", title: "Everyone", desc: "Anyone on or off Cartly can view", icon: IconEveryone },
                { id: "FOLLOWERS", title: "Followers", desc: "Only followers can see this", icon: Users },
                { id: "CLOSE_FRIENDS", title: "Close Friends", desc: "Share only with VIP list", icon: Heart },
                { id: "PRIVATE", title: "Only Me", desc: "Private post viewable only by you", icon: Lock }
              ].map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => setAudience(opt.id)}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all",
                    audience === opt.id ? "bg-[#121212] border-white" : "bg-black border-[#27272A] hover:border-zinc-800"
                  )}
                >
                  <div className="flex items-center gap-3.5">
                    <opt.icon className="size-5 text-[#A1A1AA] shrink-0" />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[15px] font-bold text-white">{opt.title}</span>
                      <span className="text-[13px] text-[#A1A1AA]">{opt.desc}</span>
                    </div>
                  </div>
                  <div className={cn(
                    "size-5 rounded-full border-2 flex items-center justify-center",
                    audience === opt.id ? "border-white bg-white" : "border-[#27272A]"
                  )}>
                    {audience === opt.id && <Check className="size-3 text-black stroke-[3px]" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case "schedule":
        return (
          <div className="flex flex-col h-full bg-black text-white p-4 space-y-4">
            <div className="flex items-center gap-3 border-b border-[#27272A] pb-3">
              <button onClick={() => setActivePanel("none")} className="p-2 hover:bg-[#121212] rounded-full">
                <IconBack />
              </button>
              <h4 className="font-bold text-[18px]">Schedule Post</h4>
            </div>
            <div className="space-y-4 flex-grow overflow-y-auto scrollbar-none">
              <div className="flex flex-col gap-2">
                <label className="text-[13px] text-[#A1A1AA] font-bold uppercase tracking-wider">Date</label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="bg-[#121212] border border-[#27272A] text-white p-3 rounded-xl text-[15px] focus:outline-none min-h-[44px] w-full"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[13px] text-[#A1A1AA] font-bold uppercase tracking-wider">Time</label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="bg-[#121212] border border-[#27272A] text-white p-3 rounded-xl text-[15px] focus:outline-none min-h-[44px] w-full"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[13px] text-[#A1A1AA] font-bold uppercase tracking-wider">Timezone</label>
                <select
                  value={scheduleTimezone}
                  onChange={(e) => setScheduleTimezone(e.target.value)}
                  className="bg-[#121212] border border-[#27272A] text-white p-3 rounded-xl text-[14px] focus:outline-none w-full"
                >
                  <option value="UTC">UTC / Greenwich</option>
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                </select>
              </div>
              {scheduleDate && scheduleTime && (
                <div className="bg-[#121212] p-3 rounded-xl text-[13px] text-[#A1A1AA] border border-[#27272A]">
                  Post will go live automatically on: <span className="text-white font-bold">{scheduleDate} at {scheduleTime} ({scheduleTimezone})</span>
                </div>
              )}
              <button
                onClick={() => setActivePanel("none")}
                className="w-full mt-4 bg-white text-black font-bold py-3.5 rounded-full text-[15px] transition-colors hover:bg-neutral-200 min-h-[44px]"
              >
                Confirm Schedule
              </button>
            </div>
          </div>
        );
      case "collab":
        return (
          <div className="flex flex-col h-full bg-black text-white p-4 space-y-4">
            <div className="flex items-center gap-3 border-b border-[#27272A] pb-3">
              <button onClick={() => setActivePanel("none")} className="p-2 hover:bg-[#121212] rounded-full">
                <IconBack />
              </button>
              <h4 className="font-bold text-[18px]">Collaborators</h4>
            </div>
            <div className="space-y-4 flex-grow overflow-y-auto scrollbar-none">
              <div className="relative flex items-center border-b border-[#27272A]">
                <input
                  type="text"
                  placeholder="Search creators..."
                  value={collaboratorSearch}
                  onChange={(e) => setCollaboratorSearch(e.target.value)}
                  className="w-full bg-transparent border-none outline-none py-2 px-1 text-[16px] text-white placeholder-zinc-650 focus:ring-0"
                />
              </div>
              {collaboratorSearch.trim() && (
                <div className="bg-[#121212] rounded-xl p-2 border border-[#27272A] space-y-1">
                  {["jane_dev", "alex_influencer", "mark_marketing"].filter(u => u.includes(collaboratorSearch.toLowerCase())).map(u => (
                    <button
                      key={u}
                      onClick={() => {
                        setInvitedCollaborators([...invitedCollaborators, { username: u, status: "pending" }]);
                        setCollaboratorSearch("");
                      }}
                      className="w-full text-left p-3 hover:bg-[#1c1c1e] text-[14px] font-bold text-white rounded-lg min-h-[44px]"
                    >
                      Invite @{u}
                    </button>
                  ))}
                </div>
              )}
              <div className="space-y-2">
                {invitedCollaborators.map((c, index) => (
                  <div key={c.username} className="bg-[#121212] border border-[#27272A] p-3 rounded-2xl flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[14px] font-bold text-white">@{c.username}</span>
                      <span className="text-[12px] text-[#A1A1AA] capitalize">{c.status}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const list = [...invitedCollaborators];
                          list[index].status = "accepted";
                          setInvitedCollaborators(list);
                        }}
                        className="bg-emerald-600 text-white font-bold text-[10px] px-2.5 py-1 rounded-full"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => setInvitedCollaborators(invitedCollaborators.filter(item => item.username !== c.username))}
                        className="text-[#A1A1AA] hover:text-white p-1"
                      >
                        <IconClose size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case "settings":
        return (
          <div className="flex flex-col h-full bg-black text-white p-4 space-y-4">
            <div className="flex items-center gap-3 border-b border-[#27272A] pb-3">
              <button onClick={() => setActivePanel("none")} className="p-2 hover:bg-[#121212] rounded-full">
                <IconBack />
              </button>
              <h4 className="font-bold text-[18px]">Post Settings</h4>
            </div>
            <div className="space-y-4 flex-grow overflow-y-auto scrollbar-none text-[16px]">
              <div className="space-y-4">
                {[
                  { label: "Allow Comments", val: allowComments, set: setAllowComments },
                  { label: "Allow Reposts", val: allowReposts, set: setAllowReposts },
                  { label: "Allow Remixes", val: allowRemixes, set: setAllowRemixes },
                  { label: "Allow Product Detection", val: allowProductDetection, set: setAllowProductDetection },
                  { label: "Allow AI Translation", val: allowAITranslation, set: setAllowAITranslation },
                  { label: "Hide Likes", val: hideLikeCount, set: setHideLikeCount },
                  { label: "Sensitive Warning", val: sensitiveWarning, set: setSensitiveWarning }
                ].map((s) => (
                  <div key={s.label} className="flex justify-between items-center py-1">
                    <span className="text-white font-medium">{s.label}</span>
                    <IosSwitch checked={s.val} onChange={s.set} />
                  </div>
                ))}
              </div>

              {allowAITranslation && (
                <div className="border-t border-[#27272A] pt-4 space-y-3">
                  <span className="text-[12px] font-bold text-[#A1A1AA] uppercase tracking-wider block">Video Translation Target</span>
                  <div className="flex flex-col gap-1.5">
                    <select
                      value={videoTranslateTarget}
                      onChange={(e) => setVideoTranslateTarget(e.target.value)}
                      className="bg-[#121212] border border-[#27272A] text-white p-3 rounded-xl text-[14px] focus:outline-none w-full"
                    >
                      {["English", "Hindi", "Spanish", "French", "German", "Japanese"].map(lang => (
                        <option key={lang} value={lang}>{lang}</option>
                      ))}
                    </select>
                    <span className="text-[11px] text-sky-400 font-bold block pl-1">Status: Coming Soon</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      case "alt-text":
        return (
          <div className="flex flex-col h-full bg-black text-white p-4 space-y-4">
            <div className="flex items-center gap-3 border-b border-[#27272A] pb-3">
              <button onClick={() => setActivePanel("none")} className="p-2 hover:bg-[#121212] rounded-full">
                <IconBack />
              </button>
              <h4 className="font-bold text-[18px]">Image Alt Text</h4>
            </div>
            <div className="space-y-4 flex-grow overflow-y-auto scrollbar-none">
              <textarea
                placeholder="Describe this image for users with visual impairments..."
                value={currentAltInput}
                onChange={(e) => setCurrentAltInput(e.target.value)}
                className="w-full bg-[#121212] border border-[#27272A] rounded-2xl p-4 text-[15px] text-white focus:outline-none min-h-[120px] resize-none"
              />
              <button
                onClick={() => {
                  if (activeFile) {
                    setMediaAltTexts({
                      ...mediaAltTexts,
                      [activeFile]: currentAltInput
                    });
                  }
                  setActivePanel("none");
                  toast({ description: "Alt text saved." });
                }}
                className="w-full bg-white text-black font-bold py-3.5 rounded-full text-[15px] transition-colors hover:bg-neutral-200 min-h-[44px]"
              >
                Save Alt Text
              </button>
            </div>
          </div>
        );
      case "media-edit":
        if (!activeFile) return null;
        return (
          <div className="flex flex-col h-full bg-black text-white">
            <div className="flex justify-between items-center px-4 py-3 border-b border-[#27272A] bg-black flex-shrink-0">
              <button onClick={() => setActivePanel("none")} className="p-2 hover:bg-[#121212] rounded-full">
                <IconBack />
              </button>
              <span className="font-bold text-[16px]">Edit Media</span>
              <button onClick={() => setActivePanel("none")} className="bg-white text-black font-bold rounded-full px-4 py-1 text-xs">Done</button>
            </div>

            <div className="bg-black p-4 space-y-4 flex-1 flex flex-col justify-between overflow-y-auto">
              <div className="flex bg-[#121212] p-1 rounded-xl text-xs font-semibold gap-1 flex-shrink-0">
                {(["filters", "adjustments", "cover"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveEditSubTab(tab)}
                    className={cn(
                      "flex-1 py-2 rounded-lg capitalize transition-all",
                      activeEditSubTab === tab ? "bg-[#27272A] text-white" : "text-[#A1A1AA]"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="flex-1 space-y-4 pt-2">
                {activeEditSubTab === "filters" && (
                  <div className="grid grid-cols-2 gap-2">
                    {filterPresets.map((preset) => (
                      <div
                        key={preset.name}
                        onClick={() => updateAdjustment(activeFile, { filter: preset.name })}
                        className={cn(
                          "flex flex-col gap-1 items-center cursor-pointer rounded-xl p-3 border hover:bg-[#121212] transition-all select-none",
                          activeAdj.filter === preset.name ? "border-white bg-[#121212]" : "border-transparent"
                        )}
                      >
                        <span className="text-[13px] font-bold text-white">{preset.name}</span>
                      </div>
                    ))}
                  </div>
                )}

                {activeEditSubTab === "adjustments" && (
                  <div className="space-y-4">
                    {[
                      { label: "Brightness", key: "brightness", min: 0.5, max: 1.5, step: 0.05 },
                      { label: "Contrast", key: "contrast", min: 0.5, max: 1.5, step: 0.05 },
                      { label: "Saturation", key: "saturation", min: 0.5, max: 1.5, step: 0.05 },
                      { label: "Vignette", key: "vignette", min: 0, max: 1, step: 0.05 }
                    ].map((adjItem) => {
                      const val = (activeAdj as any)[adjItem.key] ?? 0;
                      return (
                        <div key={adjItem.key} className="flex flex-col gap-2">
                          <div className="flex justify-between text-[13px] font-semibold text-[#A1A1AA]">
                            <span>{adjItem.label}</span>
                            <span>{Math.round(val * 100)}%</span>
                          </div>
                          <input
                            type="range"
                            min={adjItem.min}
                            max={adjItem.max}
                            step={adjItem.step}
                            value={val}
                            onChange={(e) => updateAdjustment(activeFile, { [adjItem.key]: parseFloat(e.target.value) })}
                            className="w-full h-1 bg-[#27272A] rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

                {activeEditSubTab === "cover" && (
                  <div className="p-4 bg-[#121212] border border-[#27272A] rounded-2xl space-y-3">
                    <span className="text-[13px] text-[#A1A1AA] block font-semibold">Select Cover Frame (Video Only)</span>
                    <input
                      type="range"
                      min="0"
                      max="15"
                      step="1"
                      value={selectedVideoCoverTime}
                      onChange={(e) => setSelectedVideoCoverTime(parseInt(e.target.value))}
                      className="w-full"
                    />
                    <span className="text-[14px] font-bold text-white text-center block">Time: {selectedVideoCoverTime}s</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case "more":
        return (
          <div className="flex flex-col h-full bg-black text-white p-4 space-y-4">
            <div className="flex items-center gap-3 border-b border-[#27272A] pb-3">
              <button onClick={() => setActivePanel("none")} className="p-2 hover:bg-[#121212] rounded-full">
                <IconBack />
              </button>
              <h4 className="font-bold text-[18px]">Post Options</h4>
            </div>
            <div className="space-y-3 flex-grow overflow-y-auto scrollbar-none">
              <button
                onClick={() => { setPostType("thread"); setActivePanel("none"); }}
                className="w-full text-left p-4 bg-[#121212] border border-[#27272A] rounded-2xl hover:bg-[#1c1c1e] flex items-center gap-3 transition-colors min-h-[44px]"
              >
                <IconCollaborators className="text-[#A1A1AA] size-5" />
                <span className="text-[15px] font-semibold text-white">Create Thread</span>
              </button>

              <button
                onClick={() => setActivePanel("schedule")}
                className="w-full text-left p-4 bg-[#121212] border border-[#27272A] rounded-2xl hover:bg-[#1c1c1e] flex items-center gap-3 transition-colors min-h-[44px]"
              >
                <IconSchedule className="text-[#A1A1AA] size-5" />
                <span className="text-[15px] font-semibold text-white">Schedule Post</span>
              </button>

              <button
                onClick={() => setActivePanel("collab")}
                className="w-full text-left p-4 bg-[#121212] border border-[#27272A] rounded-2xl hover:bg-[#1c1c1e] flex items-center gap-3 transition-colors min-h-[44px]"
              >
                <Users className="text-[#A1A1AA] size-5" />
                <span className="text-[15px] font-semibold text-white">Collaborators</span>
              </button>

              <button
                onClick={() => setActivePanel("audience")}
                className="w-full text-left p-4 bg-[#121212] border border-[#27272A] rounded-2xl hover:bg-[#1c1c1e] flex items-center gap-3 transition-colors min-h-[44px]"
              >
                <Globe className="text-[#A1A1AA] size-5" />
                <span className="text-[15px] font-semibold text-white">Audience Settings</span>
              </button>

              <button
                onClick={() => setActivePanel("settings")}
                className="w-full text-left p-4 bg-[#121212] border border-[#27272A] rounded-2xl hover:bg-[#1c1c1e] flex items-center gap-3 transition-colors min-h-[44px]"
              >
                <IconSettings className="text-[#A1A1AA] size-5" />
                <span className="text-[15px] font-semibold text-white">Advanced Configuration</span>
              </button>
            </div>
          </div>
        );
      case "camera":
        return (
          <div className="flex flex-col h-full bg-black text-white relative overflow-hidden select-none">
            {/* Shutter White Flash Animation Overlay */}
            {isFlashing && (
              <div className="absolute inset-0 bg-white z-[100] animate-fade-out pointer-events-none" />
            )}

            {/* Full-Screen Video Backdrop */}
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="absolute inset-0 w-full h-full object-cover z-0 bg-neutral-950"
            />

            {/* Hardware inactive visual indicator fallback */}
            {!cameraStream && (
              <div className="absolute inset-0 bg-zinc-950 flex flex-col items-center justify-center text-zinc-650 z-0 p-4 text-center">
                <Camera className="size-12 text-zinc-800 animate-pulse mb-3" />
                <span className="text-xs text-zinc-500 uppercase tracking-widest font-extrabold text-white">Camera Hardware Inactive</span>
                <span className="text-[11px] text-zinc-650 mt-1.5 max-w-[280px]">
                  Webcam is offline or permission is blocked. Shutter will capture Unsplash mock photography.
                </span>
              </div>
            )}

            {/* Live Streaming Mock Dashboard Overlay */}
            {cameraMode === "LIVE" && (
              <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-end p-4">
                {/* Top Badge */}
                <div className="absolute top-20 left-4 flex items-center gap-2">
                  <span className="bg-red-650 text-white font-black text-[10px] tracking-widest px-2.5 py-0.5 rounded uppercase animate-pulse">
                    LIVE
                  </span>
                  <span className="bg-black/50 text-[11px] text-white px-2 py-0.5 rounded backdrop-blur-sm">
                    👁 1.2K
                  </span>
                </div>

                {/* Mock Comments Scroll View */}
                <div className="w-full max-w-[280px] space-y-2 mb-28">
                  {[
                    { user: "alex_influencer", text: "Wow this live capture UI looks insane! 🔥" },
                    { user: "dev_dude", text: "Is this simulated? Extremely professional!" },
                    { user: "cartly_fan", text: "Next level design right here 🚀" }
                  ].map((chat, cIdx) => (
                    <div key={cIdx} className="bg-black/45 backdrop-blur-sm rounded-xl px-3 py-1.5 text-xs text-white border border-zinc-900/30">
                      <span className="font-extrabold text-sky-400">@{chat.user}</span>
                      <span className="ml-1.5 text-zinc-200">{chat.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Interaction Controls Overlay (Top Header & Bottom Bar) */}
            <div className="absolute inset-0 flex flex-col justify-between p-4 z-20 bg-gradient-to-b from-black/50 via-transparent to-black/70 pointer-events-none">
              
              {/* 1. Header controls (ArrowLeft, Comments, Likes, Flash, Rotate) */}
              <div className="flex justify-between items-center w-full pt-2 flex-shrink-0 pointer-events-auto relative">
                {/* Back Button */}
                <button
                  type="button"
                  onClick={() => setActivePanel("none")}
                  className="size-10 rounded-full bg-black/40 hover:bg-black/60 border border-zinc-800/30 backdrop-blur-sm flex items-center justify-center text-white active:scale-95 transition-all cursor-pointer"
                  title="Close Camera"
                >
                  <ArrowLeft className="size-5" strokeWidth={2.25} />
                </button>

                {/* Top Right Controls Grid */}
                <div className="flex items-center gap-2">
                  {/* Comments Restriction Settings */}
                  <button
                    type="button"
                    onClick={() => setCameraDropdownOpen(!cameraDropdownOpen)}
                    className={cn(
                      "size-10 rounded-full border border-zinc-800/30 backdrop-blur-sm flex items-center justify-center text-white active:scale-95 transition-all cursor-pointer",
                      cameraRepliesRestriction !== "Everyone" ? "bg-sky-500/80 border-sky-500" : "bg-black/40 hover:bg-black/60"
                    )}
                    title="Who can comment"
                  >
                    <MessageSquare className="size-4.5" strokeWidth={2} />
                  </button>

                  {/* Likes Toggle Settings */}
                  <button
                    type="button"
                    onClick={() => setCameraLikesEnabled(!cameraLikesEnabled)}
                    className={cn(
                      "size-10 rounded-full border border-zinc-800/30 backdrop-blur-sm flex items-center justify-center text-white active:scale-95 transition-all cursor-pointer",
                      cameraLikesEnabled ? "bg-black/40 hover:bg-black/60" : "bg-red-950/60 border-red-900 text-red-400"
                    )}
                    title={cameraLikesEnabled ? "Likes Visible" : "Likes Hidden"}
                  >
                    {cameraLikesEnabled ? (
                      <Heart className="size-4.5" strokeWidth={2} />
                    ) : (
                      <HeartOff className="size-4.5" strokeWidth={2} />
                    )}
                  </button>

                  {/* Flash Toggle Settings */}
                  <button
                    type="button"
                    onClick={() => setCameraFlashEnabled(!cameraFlashEnabled)}
                    className={cn(
                      "size-10 rounded-full border border-zinc-800/30 backdrop-blur-sm flex items-center justify-center text-white active:scale-95 transition-all cursor-pointer",
                      cameraFlashEnabled ? "bg-amber-500/80 border-amber-500 text-amber-950" : "bg-black/40 hover:bg-black/60"
                    )}
                    title={cameraFlashEnabled ? "Flash Enabled" : "Flash Disabled"}
                  >
                    {cameraFlashEnabled ? (
                      <Zap className="size-4.5" strokeWidth={2} />
                    ) : (
                      <ZapOff className="size-4.5" strokeWidth={2} />
                    )}
                  </button>

                  {/* Flip Camera Facing Mode */}
                  <button
                    type="button"
                    onClick={() => setCameraFacingMode(cameraFacingMode === "user" ? "environment" : "user")}
                    className="size-10 rounded-full bg-black/40 hover:bg-black/60 border border-zinc-800/30 backdrop-blur-sm flex items-center justify-center text-white active:scale-95 transition-all cursor-pointer"
                    title="Flip Camera"
                  >
                    <RefreshCw className="size-4.5" strokeWidth={2} />
                  </button>
                </div>

                {/* Dropdown comments restriction options */}
                {cameraDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-30 pointer-events-auto" onClick={() => setCameraDropdownOpen(false)} />
                    <div className="absolute top-14 right-0 bg-zinc-950 border border-zinc-850 rounded-2xl p-1.5 w-52 shadow-2xl z-40 animate-fade-in flex flex-col pointer-events-auto">
                      <span className="text-[11px] font-bold text-[#A1A1AA] uppercase tracking-wider px-3.5 py-2">Who can comment</span>
                      {(["Everyone", "Verified accounts", "Accounts I follow", "My subscribers", "No one"] as const).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            setCameraRepliesRestriction(opt);
                            setCameraDropdownOpen(false);
                            toast({ description: `Comments set to: ${opt}` });
                          }}
                          className={cn(
                            "w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-zinc-900/60 flex items-center justify-between",
                            cameraRepliesRestriction === opt ? "text-white bg-zinc-900" : "text-zinc-400 hover:text-white"
                          )}
                        >
                          <span>{opt}</span>
                          {cameraRepliesRestriction === opt && <Check className="size-4 text-sky-400 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* 2. Bottom Capturing controls (Shutter button & Mode slider) */}
              <div className="w-full flex flex-col items-center space-y-4 pb-2 flex-shrink-0 pointer-events-auto">
                
                {/* Recording banner if active */}
                {isCameraRecording && (
                  <div className="bg-red-650 text-white font-bold text-xs px-3.5 py-1.5 rounded-full flex items-center gap-2 shadow-lg animate-pulse mb-1">
                    <span className="size-2 bg-white rounded-full animate-ping" />
                    <span>Recording: {recordingSeconds}s</span>
                  </div>
                )}

                {/* Large Shutter Button */}
                <div className="flex items-center justify-center">
                  <button
                    type="button"
                    onClick={handleCapture}
                    className="size-20 rounded-full border-4 border-white flex items-center justify-center p-1 bg-transparent active:scale-95 transition-all shadow-xl cursor-pointer"
                  >
                    <div
                      className={cn(
                        "size-14 rounded-full transition-all duration-300",
                        cameraMode === "VIDEO"
                          ? (isCameraRecording ? "bg-red-600 animate-pulse scale-90 rounded-md" : "bg-red-600")
                          : cameraMode === "LIVE"
                          ? "bg-red-600 animate-pulse border-2 border-white"
                          : "bg-white"
                      )}
                    />
                  </button>
                </div>

                {/* Bottom Mode Picker Bar (Pill selector active mode) */}
                <div className="flex items-center gap-1.5 bg-black/35 backdrop-blur-sm border border-zinc-900/40 rounded-full p-1 max-w-xs mx-auto shadow-md">
                  {(["VIDEO", "CAPTURE", "LIVE"] as const).map((mode) => {
                    const isSel = cameraMode === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setCameraMode(mode)}
                        className={cn(
                          "px-4 py-1.5 rounded-full text-xs font-black tracking-widest transition-all select-none uppercase",
                          isSel
                            ? "border border-white bg-black/60 text-white shadow-sm scale-105"
                            : "text-zinc-500 hover:text-zinc-300 bg-transparent"
                        )}
                      >
                        {mode}
                      </button>
                    );
                  })}
                </div>

              </div>

            </div>
          </div>
        );
      case "ai":
        return (
          <div className="flex flex-col h-full bg-black text-white p-4 space-y-4">
            <div className="flex items-center gap-3 border-b border-[#1A1A1A] pb-3">
              <button onClick={() => setActivePanel("none")} className="p-2 hover:bg-[#111111] rounded-full">
                <ArrowLeft className="size-5" strokeWidth={1.75} />
              </button>
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-white" />
                <span className="font-bold text-[18px]">AI Assist Actions</span>
              </div>
            </div>
            <div className="space-y-4 flex-grow overflow-y-auto scrollbar-none text-[15px]">
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-[#A1A1AA] uppercase tracking-wider block px-1">Quick Actions</span>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { label: "Improve Writing", key: "Improve" },
                    { label: "Fix Grammar", key: "Grammar" },
                    { label: "Make Shorter", key: "Shorter" },
                    { label: "Make Professional", key: "Professional" },
                    { label: "Friendly Vibe", key: "Friendly" },
                    { label: "Add Call To Action", key: "CTA" },
                    { label: "Generate Caption", key: "Caption" }
                  ].map((act) => (
                    <button
                      key={act.key}
                      onClick={() => handleAIImprove(act.key)}
                      className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl p-3.5 text-left font-semibold text-white hover:bg-[#111111] transition-colors min-h-[44px]"
                    >
                      {act.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      case "audience":
        return (
          <div className="flex flex-col h-full bg-black text-white">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1A1A1A] bg-black flex-shrink-0">
              <button 
                onClick={() => setActivePanel("none")} 
                className="p-2 hover:bg-[#111111] rounded-full min-w-[40px] min-h-[40px] flex items-center justify-center text-[#A1A1AA] hover:text-white"
              >
                <ArrowLeft className="size-5" strokeWidth={1.75} />
              </button>
              <span className="font-semibold text-base">Who can reply</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {(["PUBLIC", "FOLLOWERS", "MENTIONED_ONLY"] as const).map((aud) => {
                const isSel = audience === aud;
                return (
                  <button
                    key={aud}
                    onClick={() => {
                      setAudience(aud);
                      setActivePanel("none");
                      toast({ description: `Audience updated to ${aud.toLowerCase()}` });
                    }}
                    className={cn(
                      "w-full flex items-center justify-between p-4 rounded-xl border transition-colors",
                      isSel ? "bg-[#0A0A0A] border-white text-white" : "bg-[#0A0A0A] border-[#1A1A1A] text-[#A1A1AA] hover:border-[#71717A]"
                    )}
                  >
                    <span className="text-sm font-semibold capitalize">{aud.toLowerCase().replace("_", " ")}</span>
                    {isSel && <Check className="size-5 text-white" strokeWidth={1.75} />}
                  </button>
                );
              })}
            </div>
          </div>
        );
      case "schedule":
        return (
          <div className="flex flex-col h-full bg-black text-white">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1A1A1A] bg-black flex-shrink-0">
              <button 
                onClick={() => setActivePanel("none")} 
                className="p-2 hover:bg-[#111111] rounded-full min-w-[40px] min-h-[40px] flex items-center justify-center text-[#A1A1AA] hover:text-white"
              >
                <ArrowLeft className="size-5" strokeWidth={1.75} />
              </button>
              <span className="font-semibold text-base">Schedule Post</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-[#A1A1AA] uppercase tracking-wider block">Date</label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="bg-black border border-[#1A1A1A] text-white rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-[#71717A]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-[#A1A1AA] uppercase tracking-wider block">Time</label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="bg-black border border-[#1A1A1A] text-white rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-[#71717A]"
                />
              </div>
              <button
                onClick={() => {
                  setActivePanel("none");
                  toast({ description: scheduleDate ? `Scheduled for ${scheduleDate} ${scheduleTime}` : "Schedule cleared" });
                }}
                className="w-full h-10 rounded-lg bg-white hover:bg-zinc-200 text-black font-semibold text-xs uppercase tracking-wider transition-colors mt-4"
              >
                Confirm Schedule
              </button>
            </div>
          </div>
        );
      case "settings":
        return (
          <div className="flex flex-col h-full bg-black text-white">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1A1A1A] bg-black flex-shrink-0">
              <button 
                onClick={() => setActivePanel("none")} 
                className="p-2 hover:bg-[#111111] rounded-full min-w-[40px] min-h-[40px] flex items-center justify-center text-[#A1A1AA] hover:text-white"
              >
                <ArrowLeft className="size-5" strokeWidth={1.75} />
              </button>
              <span className="font-semibold text-base">Post Settings</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1 divide-y divide-[#1A1A1A]">
              <div className="flex justify-between items-center py-4">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-white">Allow Comments</span>
                  <span className="text-xs text-[#A1A1AA]">Others can comment on your post</span>
                </div>
                <IosSwitch checked={allowComments} onChange={setAllowComments} />
              </div>

              <div className="flex justify-between items-center py-4">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-white">Allow Remixes</span>
                  <span className="text-xs text-[#A1A1AA]">Others can remix/stitch media assets</span>
                </div>
                <IosSwitch checked={allowRemixes} onChange={setAllowRemixes} />
              </div>

              <div className="flex justify-between items-center py-4">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-white">Allow Product Detection</span>
                  <span className="text-xs text-[#A1A1AA]">AI tagging matches to commerce shops</span>
                </div>
                <IosSwitch checked={allowProductDetection} onChange={setAllowProductDetection} />
              </div>

              <div className="flex justify-between items-center py-4">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-white">Hide Likes</span>
                  <span className="text-xs text-[#A1A1AA]">Likes counts hidden from feed view</span>
                </div>
                <IosSwitch checked={hideLikeCount} onChange={setHideLikeCount} />
              </div>
            </div>
          </div>
        );
      case "gallery":
        return (
          <GalleryPicker
            onClose={() => setActivePanel("none")}
            onSelectImages={(files) => {
              startUpload(files);
            }}
            onOpenCamera={() => setActivePanel("camera")}
          />
        );
      default:
        return null;
    }
  };

  // If sub-view is active, render it directly full screen
  if (activePanel !== "none" && activePanel !== "draft-recovery") {
    return (
      <div 
        ref={containerRef}
        className="fixed inset-0 z-40 sm:relative sm:inset-auto sm:z-0 w-full h-[100dvh] max-h-[100dvh] min-h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:min-h-0 flex flex-col bg-black text-white border-none sm:border border-[#1A1A1A] sm:rounded-3xl overflow-hidden select-none font-sans"
      >
        {(isProcessingAndSubmitting || mutation.isPending) && (
          <div className="absolute inset-0 bg-[#000000]/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4 text-white">
            <Loader2 className="size-5 animate-spin text-white" strokeWidth={1.75} />
            <span className="text-[16px] font-semibold tracking-wide">Processing and uploading media assets...</span>
          </div>
        )}
        {renderPanelContent()}
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-40 sm:relative sm:inset-auto sm:z-0 w-full h-[100dvh] max-h-[100dvh] min-h-[100dvh] sm:h-auto sm:max-h-[92vh] sm:min-h-0 flex flex-col bg-black text-white border-none sm:border border-[#1A1A1A] sm:rounded-3xl overflow-hidden select-none font-sans"
    >
      <input 
        type="file"
        accept="image/*, video/*"
        multiple
        ref={fileInputRef}
        className="sr-only hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length) {
            startUpload(files);
            e.target.value = "";
          }
        }}
      />

      {(isProcessingAndSubmitting || mutation.isPending) && (
        <div className="absolute inset-0 bg-[#000000]/85 backdrop-blur-sm z-[100] flex flex-col items-center justify-center gap-4 text-white">
          <Loader2 className="size-5 animate-spin text-white" strokeWidth={1.75} />
          <span className="text-[16px] font-semibold tracking-wide">Processing and uploading media assets...</span>
        </div>
      )}

      {/* Main Composer View */}
      {/* Header Row */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1A1A1A] bg-black flex-shrink-0 select-none">
        <button 
          type="button" 
          onClick={handleCloseAttempt} 
          className="text-zinc-400 hover:text-white p-1 rounded-full hover:bg-zinc-900 transition-colors"
          title="Cancel"
        >
          <X className="size-6" />
        </button>

        <LoadingButton
          onClick={handlePublish}
          loading={mutation.isPending || isProcessingAndSubmitting}
          disabled={(!threads[0].text.trim() && attachments.length === 0) || isUploading || isOverLimit}
          className="rounded-full bg-white hover:bg-zinc-200 text-black font-black px-6 py-1.5 text-[14px] disabled:opacity-50 disabled:pointer-events-none transition-all"
        >
          {postType === "thread" ? "Post Thread" : "Post"}
        </LoadingButton>
      </div>

      {/* Draft recovery banner if stored */}
      {showDraftBanner && (
        <div className="flex items-center justify-between bg-[#0A0A0A] px-4 py-2 border-b border-[#1A1A1A] flex-shrink-0 animate-fade-in">
          <span className="text-[13px] text-[#A1A1AA] font-semibold">Unsaved draft available</span>
          <div className="flex gap-2">
            <button onClick={handleDiscardDraft} className="text-xs text-zinc-500 hover:text-white px-2 py-1 font-bold">Discard</button>
            <button onClick={handleResumeDraft} className="text-xs text-white hover:opacity-85 px-3 py-1 bg-[#111111] border border-[#1A1A1A] rounded-full font-bold">Resume</button>
          </div>
        </div>
      )}

      {/* Scrolling Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4 bg-black scrollbar-none select-text">
        {/* Side-by-Side Avatar + Textarea Layout */}
        <div className="flex gap-3 items-start w-full">
          <UserAvatar avatarUrl={user.avatarUrl} size={40} className="size-10 rounded-full bg-black border border-[#1A1A1A] shrink-0 mt-1 select-none" />
          <div className="flex-grow flex flex-col min-w-0">
            <textarea
              value={threads[0].text}
              onChange={(e) => {
                const updated = [...threads];
                updated[0].text = e.target.value;
                setThreads(updated);
              }}
              onInput={handleTextareaInput}
              placeholder={
                postType === "article" 
                  ? "Title of your article...\n\nStart writing here..." 
                  : "What's happening?"
              }
              className={cn(
                "w-full bg-transparent border-none outline-none resize-none text-white focus:ring-0 p-0 font-normal leading-relaxed min-h-[120px] text-[18px] placeholder-zinc-500"
              )}
              rows={4}
            />
          </div>
        </div>

        {/* Selected Location Indicator */}
        {selectedLocation && (
          <div className="pl-[52px] flex justify-start select-none">
            <span className="flex items-center gap-2 text-xs bg-[#0A0A0A] border border-[#1A1A1A] text-white rounded-full py-1.5 px-3">
              <span>📍 {selectedLocation.name}</span>
              <button 
                onClick={() => setSelectedLocation(null)}
                className="text-[#A1A1AA] hover:text-white p-0.5"
              >
                <X className="size-3" strokeWidth={1.75} />
              </button>
            </span>
          </div>
        )}

        {/* Poll Inputs */}
        {postType === "poll" && (
          <div className="ml-[52px] space-y-4 pt-2 max-w-[460px] animate-slide-up select-none bg-[#0A0A0A] border border-[#1A1A1A] p-4 rounded-xl">
            <div className="flex flex-col gap-3">
              {pollOptions.map((option, oIdx) => (
                <div key={oIdx} className="relative flex items-center border-b border-[#1A1A1A] py-1">
                  <input
                    type="text"
                    placeholder={`Choice ${oIdx + 1}`}
                    maxLength={25}
                    value={option}
                    onChange={(e) => {
                      const list = [...pollOptions];
                      list[oIdx] = e.target.value;
                      setPollOptions(list);
                    }}
                    className="w-full bg-transparent border-none outline-none py-2 text-sm text-white placeholder-[#71717A] focus:ring-0"
                  />
                  {pollOptions.length > 2 && (
                    <button
                      onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== oIdx))}
                      className="absolute right-1 text-[#A1A1AA] hover:text-white p-1"
                    >
                      <X className="size-4" strokeWidth={1.75} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              {pollOptions.length < 4 ? (
                <button
                  onClick={() => setPollOptions([...pollOptions, ""])}
                  className="text-white font-semibold hover:opacity-85"
                >
                  + Add Choice
                </button>
              ) : (
                <div />
              )}
              
              <div className="flex items-center gap-1.5 text-[#A1A1AA]">
                <span>Duration:</span>
                <select
                  value={`${pollDays}d`}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "1d") { setPollDays(1); setPollHours(0); }
                    else if (val === "3d") { setPollDays(3); setPollHours(0); }
                    else if (val === "7d") { setPollDays(7); setPollHours(0); }
                  }}
                  className="bg-transparent border-none text-white text-xs font-bold focus:ring-0 outline-none cursor-pointer"
                >
                  <option value="1d" className="bg-black">1 Day</option>
                  <option value="3d" className="bg-black">3 Days</option>
                  <option value="7d" className="bg-black">7 Days</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pinned Bottom Area (stays above bottom toolbar, outside the scrollable view) */}
      <div className="flex flex-col bg-black border-t border-zinc-900 pb-3 pt-2 gap-3 flex-shrink-0 select-none">
        {/* Media Preview Row (Horizontal scroll) */}
        <div className="pl-4 sm:pl-[52px] w-full">
          <div className="flex gap-3 overflow-x-auto py-1 scrollbar-none items-center">
            {/* 1. Camera Button */}
            <button
              type="button"
              onClick={() => setActivePanel("camera")}
              className="size-20 rounded-2xl border border-zinc-800 bg-[#0A0A0A] hover:bg-zinc-900 transition-colors flex items-center justify-center text-white shrink-0 cursor-pointer"
              title="Open Camera"
            >
              <Camera className="size-6 text-zinc-300" strokeWidth={2} />
            </button>

            {/* 2. Attachments Previews */}
            {attachments.map((item, idx) => {
              const isVideoFile = item.file.type.startsWith("video");
              const hasAltText = !!mediaAltTexts[item.file.name];
              
              return (
                <div 
                  key={idx} 
                  className="relative size-20 rounded-2xl overflow-hidden shrink-0 border border-zinc-800 bg-[#0A0A0A] flex items-center justify-center group"
                >
                  {isVideoFile ? (
                    <video src={item.previewUrl} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={item.previewUrl || ""} className="w-full h-full object-cover" alt="preview" />
                  )}

                  {isVideoFile && (
                    <span className="absolute bottom-1.5 right-2 bg-black/70 text-[10px] text-white px-1.5 py-0.5 rounded font-semibold flex items-center gap-0.5">
                      <Video className="size-3" />
                    </span>
                  )}

                  {hasAltText && (
                    <span className="absolute bottom-1.5 left-2 bg-white text-[8px] text-black px-1.5 py-0.5 rounded-full font-bold">
                      ALT
                    </span>
                  )}

                  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMediaIndex(idx);
                        setActivePanel("media-edit");
                      }}
                      className="text-[10px] font-semibold text-black bg-white px-2 py-0.5 rounded-full hover:bg-neutral-200"
                    >
                      Edit
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeAttachment(item.file.name);
                    }}
                    className="absolute right-1.5 top-1.5 bg-black/80 text-white rounded-full p-1 min-w-[20px] min-h-[20px] flex items-center justify-center hover:bg-black"
                  >
                    <X className="size-2.5" strokeWidth={2} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Audience / Who Can Reply Selector */}
        <div className="pl-4 sm:pl-[52px] select-none">
          <button
            type="button"
            onClick={() => setActivePanel("audience")}
            className="flex items-center gap-2 text-[14px] font-bold text-zinc-300 hover:text-white transition-colors"
          >
            <Globe className="size-4.5 text-zinc-300" strokeWidth={2} />
            <span>{getAudienceLabel()}</span>
          </button>
        </div>
      </div>

      {/* Sticky Action Toolbar */}
      <div className="sticky bottom-0 bg-black border-t border-zinc-900 px-4 py-2 flex justify-between items-center flex-shrink-0 z-30 pointer-events-auto select-none">
        <div className="flex items-center justify-between w-full">
          {/* Left Side Toolbar Icons */}
          <div className="flex items-center gap-1">
            {/* Gallery Button */}
            <button
              type="button"
              onClick={() => setActivePanel("gallery")}
              className="p-2.5 text-zinc-400 hover:text-white hover:bg-zinc-900/60 rounded-full transition-colors flex items-center justify-center cursor-pointer group"
              title="Gallery"
            >
              <ImageIcon className="size-[22px] transition-colors" strokeWidth={2} />
            </button>

            {/* GIF Button */}
            <button
              type="button"
              onClick={() => setActivePanel("gif")}
              className="p-2.5 text-zinc-400 hover:text-white hover:bg-zinc-900/60 rounded-full transition-colors flex items-center justify-center cursor-pointer group"
              title="GIF"
            >
              <IconGif className="size-[22px] transition-colors" />
            </button>

            {/* Poll Button */}
            <button
              type="button"
              onClick={() => {
                const nextType = postType === "poll" ? "normal" : "poll";
                setPostType(nextType);
                if (nextType === "poll" && pollOptions.length === 0) {
                  setPollOptions(["", ""]);
                }
              }}
              className={cn(
                "p-2.5 rounded-full transition-colors flex items-center justify-center cursor-pointer group",
                postType === "poll" ? "bg-zinc-900 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-900/60"
              )}
              title="Poll"
            >
              <IconPoll className="size-[22px] transition-colors" />
            </button>

            {/* Location Button */}
            <button
              type="button"
              onClick={() => setActivePanel("location")}
              className="p-2.5 text-zinc-400 hover:text-white hover:bg-zinc-900/60 rounded-full transition-colors flex items-center justify-center cursor-pointer group"
              title="Location"
            >
              <IconLocation className="size-[22px] transition-colors" />
            </button>

            {/* Schedule/Calendar Button */}
            <button
              type="button"
              onClick={() => setActivePanel("schedule")}
              className="p-2.5 text-zinc-400 hover:text-white hover:bg-zinc-900/60 rounded-full transition-colors flex items-center justify-center cursor-pointer group"
              title="Schedule"
            >
              <Calendar className="size-[22px] transition-colors" strokeWidth={2} />
            </button>

            {/* Advanced Settings Button */}
            <button
              type="button"
              onClick={() => setActivePanel("settings")}
              className="p-2.5 text-zinc-400 hover:text-white hover:bg-zinc-900/60 rounded-full transition-colors flex items-center justify-center cursor-pointer group"
              title="Advanced Settings"
            >
              <Settings className="size-[22px] transition-colors" strokeWidth={2} />
            </button>
          </div>

          {/* Right Side Actions (Character limit circular progress & Thread Plus Button) */}
          <div className="flex items-center gap-3">
            {charCount > 0 && (
              <div className="relative size-6 flex items-center justify-center">
                <svg className="size-5 transform -rotate-90">
                  <circle
                    cx="10"
                    cy="10"
                    r="8"
                    className="stroke-zinc-800"
                    strokeWidth="2"
                    fill="transparent"
                  />
                  <circle
                    cx="10"
                    cy="10"
                    r="8"
                    className={cn(
                      "stroke-zinc-300 transition-all duration-200",
                      percentage >= 100 ? "stroke-red-500" : percentage >= 90 ? "stroke-amber-500" : "stroke-white"
                    )}
                    strokeWidth="2"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 8}
                    strokeDashoffset={2 * Math.PI * 8 * (1 - percentage / 100)}
                  />
                </svg>
              </div>
            )}

            {/* Separator line between circle and plus if character count exists */}
            {charCount > 0 && <div className="h-5 w-[1px] bg-zinc-800" />}

            {/* Plus Button for adding threads */}
            <button
              type="button"
              onClick={handleAddThreadNode}
              className="p-1 text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700 rounded-full transition-all flex items-center justify-center cursor-pointer hover:bg-zinc-900/60"
              title="Add thread post"
            >
              <span className="text-lg font-bold px-1.5 leading-none">+</span>
            </button>
          </div>
        </div>
      </div>

      {/* Draft Recovery close confirmation sheet */}
      {activePanel === "draft-recovery" && (
        <div className="absolute inset-0 bg-black/85 z-[120] flex flex-col justify-end pointer-events-auto select-none">
          <div className="bg-[#0A0A0A] rounded-t-3xl p-6 space-y-4 text-center border-t border-[#1A1A1A] animate-slide-up w-full max-w-[680px] mx-auto">
            <h4 className="font-bold text-lg text-white">Save draft?</h4>
            <p className="text-sm text-[#A1A1AA]">You can save this post as a draft and finish it later, or discard it now.</p>
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={handleSaveDraftAndClose}
                className="w-full bg-white hover:bg-zinc-200 text-black font-semibold py-3 rounded-xl text-sm min-h-[44px]"
              >
                Save Draft
              </button>
              <button
                onClick={handleDiscardAndClose}
                className="w-full bg-[#0A0A0A] border border-[#1A1A1A] hover:bg-red-950/20 text-[#EF4444] font-semibold py-3 rounded-xl text-sm min-h-[44px]"
              >
                Discard Draft
              </button>
              <button
                onClick={() => setActivePanel("none")}
                className="w-full bg-transparent hover:bg-[#111111] text-white font-semibold py-3 rounded-xl text-sm min-h-[44px]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
