"use client";

import { useSession } from "@/app/(main)/SessionProvider";
import LoadingButton from "@/components/LoadingButton";
import { Button } from "@/components/ui/button";
import UserAvatar from "@/components/UserAvatar";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { UploadService } from "@/lib/services/uploadService";
import { LocationData } from "@/lib/providers/locationProvider";
import { useSubmitPostMutation } from "./mutations";
import useMediaUpload, { Attachment } from "./useMediaUpload";
import { getFilterString, getProcessedImg } from "./imageProcessing";
import { submitPost } from "./actions";
import VideoPlayer from "@/components/VideoPlayer";
import GifPicker from "@/components/stories/GifPicker";

import {
  Image as LucideImage,
  FileText as LucideGif,
  BarChart3 as LucidePoll,
  MapPin as LucideLocation,
  Loader2,
  X,
  Sparkles,
  Users,
  Globe,
  Heart,
  MessageSquare,
  Sliders,
  MoreHorizontal,
  Plus,
  ArrowLeft,
  Calendar,
  Lock,
  Trash2,
  Check,
  Video,
  Mic,
  Camera,
  RotateCw,
  Clock,
  Settings,
  HelpCircle,
  Play,
  Pause,
  AlertTriangle,
  Smile,
  Accessibility
} from "lucide-react";
import { useRef, useState, useEffect } from "react";
import Image from "next/image";
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
  const desktopFileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<any>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Unified State Panel Route
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
    | "draft-recovery";

  const [activePanel, setActivePanel] = useState<PanelType>("none");
  const [postType, setPostType] = useState<"normal" | "thread" | "poll" | "article">("normal");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [isExpanded, setIsExpanded] = useState(false);

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
  const [cameraMode, setCameraMode] = useState<"Photo" | "Video" | "Story" | "Reel">("Photo");
  const [isCameraRecording, setIsCameraRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Translation dropdown Coming Soon languages
  const [videoTranslateTarget, setVideoTranslateTarget] = useState("English");

  const [isProcessingAndSubmitting, setIsProcessingAndSubmitting] = useState(false);

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
        audio: cameraMode !== "Photo"
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", description: "Could not open camera. Please grant camera permissions." });
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
    if (!cameraStream) return;

    if (cameraMode === "Photo") {
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
  const charLimit = postType === "article" ? 100000 : 280;
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
    setIsExpanded(true);
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

  // Simulated location results
  const dummyLocations = [
    { name: "Mumbai, Maharashtra", description: "City in India" },
    { name: "Bandra West, Mumbai", description: "Neighborhood in Mumbai" },
    { name: "Nariman Point, Mumbai", description: "Business district in Mumbai" },
    { name: "Gateway of India", description: "Historic Monument, Mumbai" },
    { name: "Juhu Beach, Mumbai", description: "Scenic beachfront in Mumbai" },
  ];
  const filteredLocations = dummyLocations.filter(loc =>
    loc.name.toLowerCase().includes(locationSearch.toLowerCase())
  );

  // Unified Rendering of Sub-Panel content (shared by mobile overlay & desktop side column)
  const renderPanelContent = (isMobileView: boolean) => {
    switch (activePanel) {
      case "gif":
        return (
          <div className="flex flex-col h-full bg-neutral-950 text-white select-none">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-900 bg-black flex-shrink-0">
              <button 
                onClick={() => setActivePanel("none")} 
                className="p-2 hover:bg-zinc-900 rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <ArrowLeft className="size-5 text-white" />
              </button>
              <span className="font-bold text-sm">Select GIF</span>
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
          <div className="flex flex-col h-full bg-neutral-950 text-white select-none">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-900 bg-neutral-950 flex-shrink-0">
              <button 
                onClick={() => setActivePanel("none")} 
                className="p-2 hover:bg-zinc-900 rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <ArrowLeft className="size-5 text-white" />
              </button>
              <span className="font-bold text-sm">Select Location</span>
            </div>
            <div className="p-4 space-y-4 flex-1 flex flex-col">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search locations..."
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-sm text-white focus:outline-none placeholder:text-zinc-650 min-h-[44px]"
                />
              </div>
              <div className="space-y-1 flex-1 overflow-y-auto scrollbar-none">
                {filteredLocations.map((loc) => (
                  <button
                    key={loc.name}
                    onClick={() => {
                      setSelectedLocation(loc);
                      setActivePanel("none");
                    }}
                    className="w-full text-left p-3 hover:bg-zinc-900 rounded-xl flex flex-col gap-0.5 border-b border-zinc-900/60 min-h-[44px]"
                  >
                    <span className="text-sm font-semibold text-white">{loc.name}</span>
                    <span className="text-[11px] text-zinc-500">{loc.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      case "audience":
        return (
          <div className="flex flex-col h-full bg-[#121212] text-white p-4 space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
              <h4 className="font-bold text-sm">Who can see this?</h4>
              <button onClick={() => setActivePanel("none")} className="text-xs font-bold text-[#ff6bcb]">Done</button>
            </div>
            <div className="space-y-2 flex-grow overflow-y-auto scrollbar-none">
              {[
                { id: "PUBLIC", title: "Everyone", desc: "Anyone on or off Cartly can view", icon: Globe },
                { id: "FOLLOWERS", title: "Followers", desc: "Only followers can see this", icon: Users },
                { id: "CLOSE_FRIENDS", title: "Close Friends", desc: "Share only with VIP list", icon: Heart },
                { id: "PRIVATE", title: "Only Me", desc: "Private post viewable only by you", icon: Lock }
              ].map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => setAudience(opt.id)}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all",
                    audience === opt.id ? "bg-zinc-900 border-[#ff6bcb]" : "bg-zinc-950 border-zinc-900 hover:border-zinc-800"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <opt.icon className="size-4.5 text-sky-400 shrink-0" />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold">{opt.title}</span>
                      <span className="text-[10px] text-zinc-500">{opt.desc}</span>
                    </div>
                  </div>
                  <div className={cn(
                    "size-3.5 rounded-full border flex items-center justify-center",
                    audience === opt.id ? "border-[#ff6bcb] bg-[#ff6bcb]" : "border-zinc-700"
                  )}>
                    {audience === opt.id && <Check className="size-2 text-white" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case "ai":
        return (
          <div className="flex flex-col h-full bg-[#121212] text-white p-4 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
              <div className="flex items-center gap-1.5">
                <Sparkles className="size-4 text-[#ff6bcb]" />
                <span className="font-bold text-sm">AI Assist Actions</span>
              </div>
              <button onClick={() => setActivePanel("none")} className="text-xs text-[#ff6bcb] font-bold">Close</button>
            </div>
            <div className="space-y-4 flex-grow overflow-y-auto scrollbar-none">
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block px-1">Quick Actions</span>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { label: "Improve Writing", key: "Improve" },
                    { label: "Fix Grammar", key: "Grammar" },
                    { label: "Make Shorter", key: "Shorter" },
                    { label: "Make Professional", key: "Professional" }
                  ].map((act) => (
                    <button
                      key={act.key}
                      onClick={() => handleAIImprove(act.key)}
                      className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-left font-semibold text-zinc-200 hover:border-zinc-750 transition-all min-h-[44px]"
                    >
                      {act.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="border-t border-zinc-900 pt-3 space-y-2">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block px-1">Advanced Writing Tools</span>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleAIImprove("Caption")}
                    className="w-full bg-zinc-950 border border-zinc-900 rounded-xl p-3 text-xs text-left font-semibold text-zinc-300 hover:border-zinc-800 transition-all flex items-center justify-between min-h-[44px]"
                  >
                    <span>Generate Caption</span>
                  </button>
                  <button
                    onClick={() => handleAIImprove("CTA")}
                    className="w-full bg-zinc-950 border border-zinc-900 rounded-xl p-3 text-xs text-left font-semibold text-zinc-300 hover:border-zinc-800 transition-all flex items-center justify-between min-h-[44px]"
                  >
                    <span>Add Call To Action</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      case "schedule":
        return (
          <div className="flex flex-col h-full bg-[#121212] text-white p-4 space-y-4 select-none">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
              <h4 className="font-bold text-sm">Schedule Post</h4>
              <button onClick={() => setActivePanel("none")} className="text-xs font-bold text-[#ff6bcb]">Done</button>
            </div>
            <div className="space-y-4 flex-grow overflow-y-auto scrollbar-none">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Date</label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 text-white p-2.5 rounded-xl text-sm focus:outline-none min-h-[44px] w-full"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Time</label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 text-white p-2.5 rounded-xl text-sm focus:outline-none min-h-[44px] w-full"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Timezone</label>
                <select
                  value={scheduleTimezone}
                  onChange={(e) => setScheduleTimezone(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 text-white p-2.5 rounded-xl text-xs focus:outline-none w-full"
                >
                  <option value="UTC">UTC / Greenwich</option>
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                </select>
              </div>
              {scheduleDate && scheduleTime && (
                <div className="bg-zinc-950 p-2.5 rounded-xl text-xs text-zinc-400 border border-zinc-900">
                  Scheduled for: <span className="text-white font-bold">{scheduleDate} at {scheduleTime} ({scheduleTimezone})</span>
                </div>
              )}
            </div>
          </div>
        );
      case "collab":
        return (
          <div className="flex flex-col h-full bg-neutral-950 text-white p-4 space-y-4 select-none">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
              <h4 className="font-bold text-sm">Collaborators</h4>
              <button onClick={() => setActivePanel("none")} className="text-xs font-bold text-[#ff6bcb]">Done</button>
            </div>
            <div className="space-y-4 flex-grow overflow-y-auto scrollbar-none">
              <input
                type="text"
                placeholder="Search guest creators..."
                value={collaboratorSearch}
                onChange={(e) => setCollaboratorSearch(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none min-h-[44px]"
              />
              {collaboratorSearch.trim() && (
                <div className="bg-zinc-900 rounded-xl p-2 border border-zinc-800 space-y-1">
                  {["jane_dev", "alex_influencer", "mark_marketing"].filter(u => u.includes(collaboratorSearch.toLowerCase())).map(u => (
                    <button
                      key={u}
                      onClick={() => {
                        setInvitedCollaborators([...invitedCollaborators, { username: u, status: "pending" }]);
                        setCollaboratorSearch("");
                      }}
                      className="w-full text-left p-2 hover:bg-zinc-800 text-xs font-bold text-white rounded-lg min-h-[44px]"
                    >
                      Invite @{u}
                    </button>
                  ))}
                </div>
              )}
              <div className="space-y-2">
                {invitedCollaborators.map((c, index) => (
                  <div key={c.username} className="bg-zinc-900 border border-zinc-850 p-2.5 rounded-xl flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-white">@{c.username}</span>
                      <span className="text-[10px] text-zinc-500 capitalize">{c.status}</span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          const list = [...invitedCollaborators];
                          list[index].status = "accepted";
                          setInvitedCollaborators(list);
                        }}
                        className="bg-emerald-600 text-white font-bold text-[8px] px-1.5 py-0.5 rounded"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => setInvitedCollaborators(invitedCollaborators.filter(item => item.username !== c.username))}
                        className="text-zinc-500 hover:text-white p-0.5"
                      >
                        <X className="size-3.5" />
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
          <div className="flex flex-col h-full bg-neutral-950 text-white p-4 space-y-4 select-none">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
              <h4 className="font-bold text-sm">Post Settings</h4>
              <button onClick={() => setActivePanel("none")} className="text-xs font-bold text-[#ff6bcb]">Done</button>
            </div>
            <div className="space-y-4 flex-grow overflow-y-auto scrollbar-none text-xs">
              <div className="space-y-3">
                {[
                  { label: "Allow Comments", val: allowComments, set: setAllowComments },
                  { label: "Allow Reposts", val: allowReposts, set: setAllowReposts },
                  { label: "Allow Remixes", val: allowRemixes, set: setAllowRemixes },
                  { label: "Allow Product Detection", val: allowProductDetection, set: setAllowProductDetection },
                  { label: "Allow AI Translation", val: allowAITranslation, set: setAllowAITranslation },
                  { label: "Hide Likes", val: hideLikeCount, set: setHideLikeCount },
                  { label: "Sensitive Warning", val: sensitiveWarning, set: setSensitiveWarning }
                ].map((s) => (
                  <div key={s.label} className="flex justify-between items-center">
                    <span className="text-zinc-300 font-semibold">{s.label}</span>
                    <input
                      type="checkbox"
                      checked={s.val}
                      onChange={(e) => s.set(e.target.checked)}
                      className="accent-[#ff6bcb] rounded size-4 bg-zinc-900 border-zinc-800"
                    />
                  </div>
                ))}
              </div>

              {allowAITranslation && (
                <div className="border-t border-zinc-900 pt-3 space-y-2">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Video Translation</span>
                  <div className="flex flex-col gap-1">
                    <select
                      value={videoTranslateTarget}
                      onChange={(e) => setVideoTranslateTarget(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 text-white p-2 rounded-xl text-[11px] focus:outline-none w-full"
                    >
                      {["English", "Hindi", "Spanish", "French", "German", "Japanese"].map(lang => (
                        <option key={lang} value={lang}>{lang}</option>
                      ))}
                    </select>
                    <span className="text-[9px] text-sky-400 font-bold block">Status: Coming Soon</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      case "alt-text":
        return (
          <div className="flex flex-col h-full bg-neutral-950 text-white p-4 space-y-4 select-none">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
              <h4 className="font-bold text-sm">Write Alt Text</h4>
              <button onClick={() => setActivePanel("none")} className="text-xs font-bold text-[#ff6bcb]">Close</button>
            </div>
            <div className="space-y-4 flex-grow overflow-y-auto scrollbar-none">
              <textarea
                placeholder="Describe this image for users with visual impairments..."
                value={currentAltInput}
                onChange={(e) => setCurrentAltInput(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white focus:outline-none min-h-[80px] resize-none"
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
                className="w-full bg-[#ff6bcb] hover:opacity-90 text-white font-bold py-2.5 rounded-full text-xs min-h-[44px]"
              >
                Save
              </button>
            </div>
          </div>
        );
      case "media-edit":
        if (!activeFile) return null;
        return (
          <div className="flex flex-col h-full bg-[#000] text-white select-none">
            <div className="flex justify-between items-center px-4 py-3 border-b border-zinc-900 bg-neutral-950 flex-shrink-0">
              <button onClick={() => setActivePanel("none")} className="p-2 hover:bg-zinc-900 rounded-full">
                <ArrowLeft className="size-5 text-white" />
              </button>
              <span className="font-bold text-xs">Media Editor</span>
              <button onClick={() => setActivePanel("none")} className="bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-full px-3 py-1 text-xs">Done</button>
            </div>

            {/* Adjustments control tabs */}
            <div className="bg-neutral-950 p-3 space-y-3 flex-1 flex flex-col justify-between">
              <div className="flex bg-zinc-900 p-1 rounded-xl text-[10px] font-semibold gap-1 flex-shrink-0">
                {(["filters", "adjustments", "cover"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveEditSubTab(tab)}
                    className={cn(
                      "flex-1 py-1.5 rounded-lg capitalize transition-all",
                      activeEditSubTab === tab ? "bg-zinc-800 text-white" : "text-zinc-400"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pt-2">
                {activeEditSubTab === "filters" && (
                  <div className="grid grid-cols-2 gap-2">
                    {filterPresets.map((preset) => (
                      <div
                        key={preset.name}
                        onClick={() => updateAdjustment(activeFile, { filter: preset.name })}
                        className={cn(
                          "flex flex-col gap-1 items-center cursor-pointer rounded-xl p-1 border border-transparent hover:bg-neutral-900 transition-all select-none",
                          activeAdj.filter === preset.name ? "border-primary bg-neutral-900" : ""
                        )}
                      >
                        <span className="text-[9px] font-bold text-neutral-450 truncate w-14 text-center">{preset.name}</span>
                      </div>
                    ))}
                  </div>
                )}

                {activeEditSubTab === "adjustments" && (
                  <div className="space-y-3">
                    {[
                      { label: "Brightness", key: "brightness", min: 0.5, max: 1.5, step: 0.05 },
                      { label: "Contrast", key: "contrast", min: 0.5, max: 1.5, step: 0.05 },
                      { label: "Saturation", key: "saturation", min: 0.5, max: 1.5, step: 0.05 },
                      { label: "Vignette", key: "vignette", min: 0, max: 1, step: 0.05 }
                    ].map((adjItem) => {
                      const val = (activeAdj as any)[adjItem.key] ?? 0;
                      return (
                        <div key={adjItem.key} className="flex flex-col gap-1">
                          <div className="flex justify-between text-[11px] font-semibold text-neutral-400">
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
                            className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

                {activeEditSubTab === "cover" && (
                  <div className="p-3 bg-zinc-900 rounded-xl space-y-2">
                    <span className="text-[10px] text-zinc-400 block font-semibold">Select video cover frame duration</span>
                    <input
                      type="range"
                      min="0"
                      max="15"
                      step="1"
                      value={selectedVideoCoverTime}
                      onChange={(e) => setSelectedVideoCoverTime(parseInt(e.target.value))}
                      className="w-full"
                    />
                    <span className="text-[11px] font-bold text-white text-center block">Time: {selectedVideoCoverTime}s</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case "more":
        return (
          <div className="flex flex-col h-full bg-[#121212] text-white p-4 space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-900">
              <h4 className="font-bold text-sm">More Options</h4>
              <button onClick={() => setActivePanel("none")} className="text-xs text-[#ff6bcb] font-bold">Done</button>
            </div>
            <div className="space-y-2 flex-grow overflow-y-auto scrollbar-none">
              <button
                onClick={() => { setPostType("thread"); setActivePanel("none"); }}
                className="w-full text-left p-3 bg-zinc-900/60 rounded-xl hover:bg-zinc-900 flex items-center gap-2 border border-zinc-900 min-h-[44px]"
              >
                <Plus className="size-4 text-[#ff6bcb]" />
                <span className="text-xs font-semibold">Create Thread</span>
              </button>

              <button
                onClick={() => { setActivePanel("camera"); }}
                className="w-full text-left p-3 bg-zinc-900/60 rounded-xl hover:bg-zinc-900 flex items-center gap-2 border border-zinc-900 min-h-[44px]"
              >
                <Camera className="size-4 text-[#ff6bcb]" />
                <span className="text-xs font-semibold">Open Camera</span>
              </button>

              <button
                onClick={() => setActivePanel("schedule")}
                className="w-full text-left p-3 bg-zinc-900/60 rounded-xl hover:bg-zinc-900 flex items-center gap-2 border border-zinc-900 min-h-[44px]"
              >
                <Calendar className="size-4 text-[#ff6bcb]" />
                <span className="text-xs font-semibold">Schedule Post</span>
              </button>

              <button
                onClick={() => setActivePanel("collab")}
                className="w-full text-left p-3 bg-zinc-900/60 rounded-xl hover:bg-zinc-900 flex items-center gap-2 border border-zinc-900 min-h-[44px]"
              >
                <Users className="size-4 text-[#ff6bcb]" />
                <span className="text-xs font-semibold">Collaborators</span>
              </button>

              <button
                onClick={() => setActivePanel("settings")}
                className="w-full text-left p-3 bg-zinc-900/60 rounded-xl hover:bg-zinc-900 flex items-center gap-2 border border-zinc-900 min-h-[44px]"
              >
                <Settings className="size-4 text-[#ff6bcb]" />
                <span className="text-xs font-semibold">Configuration Settings</span>
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      {/* MOBILE COMPOSER SHEET CONTAINER */}
      <div className="flex md:hidden fixed inset-0 z-50 flex-col justify-end text-white select-none pointer-events-none font-sans">
        {/* Upper transparent spacer backdrop */}
        <div 
          onClick={handleCloseAttempt}
          className={cn(
            "w-full bg-black/60 transition-opacity duration-300 pointer-events-auto",
            isExpanded ? "h-0 opacity-0 pointer-events-none" : "h-[25dvh] opacity-100"
          )}
        />

        {/* 75% -> 100% sliding viewport container */}
        <div
          className={cn(
            "w-full bg-[#000000] flex flex-col overflow-hidden transition-all duration-200 ease-out border-t border-zinc-900 pointer-events-auto relative",
            isExpanded ? "h-[100dvh] rounded-none" : "h-[75dvh] rounded-t-3xl"
          )}
        >
          {/* Subtle drag/expand handle */}
          {!isExpanded && (
            <div 
              onClick={() => setIsExpanded(true)}
              className="w-full flex items-center justify-center py-2 cursor-pointer flex-shrink-0"
            >
              <div className="w-10 h-1 bg-zinc-800 rounded-full" />
            </div>
          )}

          {/* Header Row */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-900 bg-black flex-shrink-0">
            <button 
              type="button" 
              onClick={handleCloseAttempt} 
              className="text-white hover:opacity-80 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <X className="size-6" />
            </button>

            {/* Post tab indicator selector */}
            <div className="flex bg-zinc-900/80 p-1 rounded-full text-xs font-semibold gap-1">
              {(["normal", "thread", "poll", "article"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setPostType(type);
                    if (type === "thread" || type === "poll") {
                      setIsExpanded(true);
                    }
                  }}
                  className={cn(
                    "px-3 py-1 rounded-full capitalize transition-all",
                    postType === type ? "bg-white text-black font-bold" : "text-zinc-400"
                  )}
                >
                  {type}
                </button>
              ))}
            </div>

            <LoadingButton
              onClick={handlePublish}
              loading={mutation.isPending || isProcessingAndSubmitting}
              disabled={(!threads[0].text.trim() && attachments.length === 0) || isUploading || isOverLimit}
              className="rounded-full bg-gradient-to-r from-[#ff6bcb] to-[#9f5cff] hover:opacity-95 text-white font-bold px-6 py-2.5 text-xs tracking-wider min-h-[44px] disabled:opacity-40 disabled:pointer-events-none"
            >
              {postType === "thread" ? "Post all" : "Post"}
            </LoadingButton>
          </div>

          {/* Draft recovery notice if stored */}
          {showDraftBanner && (
            <div className="flex items-center justify-between bg-zinc-900 px-4 py-2 border-b border-zinc-800 flex-shrink-0 animate-fade-in">
              <span className="text-xs text-zinc-300 font-medium">Unsaved draft available</span>
              <div className="flex gap-2">
                <button onClick={handleDiscardDraft} className="text-xs text-zinc-500 hover:text-white px-2 py-1 font-bold">Discard</button>
                <button onClick={handleResumeDraft} className="text-xs text-[#ff6bcb] hover:opacity-80 px-3 py-1 bg-zinc-800 rounded-full font-bold">Resume</button>
              </div>
            </div>
          )}

          {/* Scrolling post content area */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4 bg-black">
            {postType === "thread" ? (
              <div className="space-y-4">
                {threads.map((node, idx) => {
                  const isActive = activeThreadIndex === idx;
                  return (
                    <div
                      key={node.id}
                      onClick={() => setActiveThreadIndex(idx)}
                      className={cn(
                        "relative flex gap-3 items-start z-10 transition-opacity",
                        !isActive && "opacity-50"
                      )}
                    >
                      <div className="flex flex-col items-center flex-shrink-0 relative self-stretch">
                        <UserAvatar avatarUrl={user.avatarUrl} size={36} className="size-9 rounded-full z-10 bg-black" />
                        {idx < threads.length - 1 && (
                          <div className="w-0.5 bg-zinc-800 absolute top-9 bottom-[-16px] left-1/2 -translate-x-1/2 z-0" />
                        )}
                      </div>

                      <div className="flex-grow min-w-0 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-zinc-400">@{user.username}</span>
                          {threads.length > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveThreadNode(idx);
                              }}
                              className="text-zinc-500 hover:text-white p-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
                            >
                              <X className="size-4" />
                            </button>
                          )}
                        </div>

                        <textarea
                          value={node.text}
                          onChange={(e) => {
                            const updated = [...threads];
                            updated[idx].text = e.target.value;
                            setThreads(updated);
                          }}
                          onInput={handleTextareaInput}
                          placeholder="Add another post..."
                          className="w-full bg-transparent border-none outline-none resize-none text-white text-lg placeholder-zinc-600 focus:ring-0 p-0 font-light min-h-[60px]"
                          rows={2}
                        />
                      </div>
                    </div>
                  );
                })}

                <div 
                  onClick={handleAddThreadNode} 
                  className="flex items-center gap-4 pl-12 py-1.5 text-[#ff6bcb] hover:opacity-85 text-xs font-semibold cursor-pointer select-none"
                >
                  <Plus className="size-4" />
                  <span>Add another post</span>
                </div>
              </div>
            ) : (
              <div className="flex gap-3 items-start relative z-10">
                <div className="flex flex-col items-center flex-shrink-0">
                  <UserAvatar avatarUrl={user.avatarUrl} size={36} className="size-9 rounded-full z-10 bg-black" />
                  <div className="mt-2 text-center flex flex-col items-center">
                    {saveStatus === "saving" && <span className="text-[10px] text-zinc-500 animate-pulse font-medium">Saving...</span>}
                    {saveStatus === "saved" && <span className="text-[10px] text-[#ff6bcb] font-bold">Saved</span>}
                  </div>
                </div>

                <div className="flex-grow min-w-0 space-y-3">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-sm text-white">{user.displayName}</span>
                      <span className="text-xs text-zinc-400">@{user.username}</span>
                    </div>
                  </div>

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
                      "w-full bg-transparent border-none outline-none resize-none text-white focus:ring-0 p-0 font-light min-h-[80px]",
                      postType === "article" ? "text-base placeholder-zinc-700 font-serif leading-relaxed" : "text-xl placeholder-zinc-650"
                    )}
                    rows={3}
                  />

                  {postType !== "article" && charCount > 0 && (
                    <div className="flex justify-end items-center gap-1.5 text-xs text-zinc-500 font-mono">
                      <span>{charCount}/{charLimit}</span>
                      <svg className="size-5 transform -rotate-90">
                        <circle cx="10" cy="10" r="7" className="stroke-zinc-800 fill-none" strokeWidth="1.5" />
                        <circle
                          cx="10"
                          cy="10"
                          r="7"
                          className={cn(
                            "fill-none transition-all duration-200",
                            isOverLimit ? "stroke-red-500" : "stroke-zinc-400"
                          )}
                          strokeWidth="1.5"
                          strokeDasharray={2 * Math.PI * 7}
                          strokeDashoffset={2 * Math.PI * 7 * (1 - percentage / 100)}
                        />
                      </svg>
                    </div>
                  )}

                  {charCount >= 15 && activePanel === "none" && (
                    <div className="flex justify-start">
                      <button
                        onClick={() => setActivePanel("ai")}
                        className="flex items-center gap-1 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full text-xs text-zinc-300 font-medium hover:border-zinc-700 transition-all cursor-pointer min-h-[44px]"
                      >
                        <Sparkles className="size-3 text-[#ff6bcb]" />
                        <span>✨ Improve Writing</span>
                      </button>
                    </div>
                  )}

                  {selectedLocation && (
                    <div className="flex justify-start">
                      <span className="flex items-center gap-1.5 text-xs bg-zinc-900 border border-zinc-800 text-white rounded-full py-1 px-3">
                        <span>📍 {selectedLocation.name}</span>
                        <button 
                          onClick={() => setSelectedLocation(null)}
                          className="text-zinc-500 hover:text-white p-0.5"
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    </div>
                  )}

                  {/* Horizontal Instagram Media Tray */}
                  {attachments.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block px-1">Selected Media</span>
                      <div className="flex gap-2.5 overflow-x-auto py-1 scrollbar-none items-center">
                        {attachments.map((item, idx) => {
                          const isVideoFile = item.file.type.startsWith("video");
                          const hasAltText = !!mediaAltTexts[item.file.name];
                          
                          return (
                            <div 
                              key={idx} 
                              className="relative size-24 rounded-2xl overflow-hidden shrink-0 border border-zinc-850 bg-zinc-950 flex items-center justify-center group"
                            >
                              {isVideoFile ? (
                                <video src={item.previewUrl} className="w-full h-full object-cover" muted />
                              ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={item.previewUrl || ""} className="w-full h-full object-cover" alt="preview" />
                              )}

                              {isVideoFile && (
                                <span className="absolute bottom-1 right-1.5 bg-black/70 text-[9px] text-white px-1 py-0.5 rounded font-mono flex items-center gap-0.5">
                                  <Video className="size-2" /> 0:15
                                </span>
                              )}

                              {hasAltText && (
                                <span className="absolute bottom-1 left-1.5 bg-sky-500 text-[8px] text-white px-1 py-0.5 rounded-full font-bold">
                                  ALT
                                </span>
                              )}

                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 py-1 transition-opacity">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMediaIndex(idx);
                                    setActivePanel("media-edit");
                                  }}
                                  className="text-[9px] font-bold text-white bg-sky-500 px-2 py-1 rounded hover:bg-sky-600"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMediaIndex(idx);
                                    setCurrentAltInput(mediaAltTexts[item.file.name] || "");
                                    setActivePanel("alt-text");
                                  }}
                                  className="text-[9px] font-bold text-white bg-zinc-800 p-1 rounded hover:bg-zinc-700"
                                >
                                  <Accessibility className="size-3" />
                                </button>
                              </div>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeAttachment(item.file.name);
                                }}
                                className="absolute right-1 top-1 bg-black/70 text-white rounded-full p-1 min-w-[30px] min-h-[30px] flex items-center justify-center hover:bg-black"
                              >
                                <X className="size-3" />
                              </button>

                              {attachments.length > 1 && (
                                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex bg-black/85 rounded-full border border-zinc-800 p-0.5 gap-1.5">
                                  {idx > 0 && (
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); shiftMedia(idx, "left"); }}
                                      className="text-white hover:text-sky-400 text-[8px] font-bold px-0.5"
                                    >
                                      ←
                                    </button>
                                  )}
                                  {idx < attachments.length - 1 && (
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); shiftMedia(idx, "right"); }}
                                      className="text-white hover:text-sky-400 text-[8px] font-bold px-0.5"
                                    >
                                      →
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="size-24 rounded-2xl border border-dashed border-zinc-800 bg-zinc-950 flex flex-col items-center justify-center text-zinc-500 hover:text-white hover:border-zinc-600 transition-all shrink-0 cursor-pointer min-h-[44px]"
                        >
                          <Plus className="size-5 mb-1" />
                          <span className="text-[10px] font-bold">Add</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Poll Creator Section */}
                  {postType === "poll" && (
                    <div className="bg-zinc-950 border border-zinc-850 rounded-2xl p-4 space-y-3 relative max-w-md animate-slide-up">
                      <div className="flex justify-between items-center pb-1">
                        <span className="text-xs font-bold text-zinc-400 tracking-wider">POLL CHOICES</span>
                        <button
                          onClick={() => {
                            if (pollOptions.length < 4) {
                              setPollOptions([...pollOptions, ""]);
                            }
                          }}
                          disabled={pollOptions.length >= 4}
                          className="text-xs text-[#ff6bcb] hover:opacity-80 font-bold disabled:opacity-40"
                        >
                          + Add Option
                        </button>
                      </div>
                      <div className="flex flex-col gap-2">
                        {pollOptions.map((option, oIdx) => (
                          <div key={oIdx} className="relative flex items-center">
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
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-3 pr-12 text-sm text-white focus:outline-none placeholder:text-zinc-650 min-h-[44px]"
                            />
                            {pollOptions.length > 2 && (
                              <button
                                onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== oIdx))}
                                className="absolute right-2 text-zinc-500 hover:text-white p-1"
                              >
                                <X className="size-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="border-t border-zinc-900 pt-3 space-y-2">
                        <span className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase">Poll Duration</span>
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { label: "1 Day", d: 1 },
                            { label: "3 Days", d: 3 },
                            { label: "7 Days", d: 7 },
                            { label: "Custom", d: 0 }
                          ].map((item) => (
                            <button
                              key={item.label}
                              type="button"
                              onClick={() => {
                                if (item.d > 0) {
                                  setPollDays(item.d);
                                  setPollHours(0);
                                  setPollMinutes(0);
                                } else {
                                  setActivePanel("schedule");
                                }
                              }}
                              className={cn(
                                "py-2 text-[10px] font-bold rounded-lg border text-center transition-all min-h-[44px] flex items-center justify-center",
                                pollDays === item.d ? "bg-white border-white text-black" : "bg-zinc-900 border-zinc-800 text-zinc-400"
                              )}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Audience Selector pill directly below textarea */}
                  <div className="flex justify-start">
                    <button
                      onClick={() => setActivePanel("audience")}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-full text-xs text-zinc-300 font-semibold hover:border-zinc-700 min-h-[44px]"
                    >
                      <Globe className="size-3 text-sky-400" />
                      <span className="capitalize">{audience.toLowerCase().replace("_", " ")}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* BOTTOM FOOTER TOOLBAR: exactly 5 icons */}
          <div className="sticky bottom-0 bg-black border-t border-zinc-900 px-4 py-2.5 flex justify-between items-center flex-shrink-0 z-30 pointer-events-auto">
            <div className="flex gap-4 items-center w-full justify-between">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-3 text-white opacity-70 hover:opacity-100 transition-opacity flex items-center justify-center min-w-[44px] min-h-[44px]"
              >
                <LucideImage size={24} />
              </button>
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

              <button
                onClick={() => setActivePanel("gif")}
                className="p-3 text-white opacity-70 hover:opacity-100 transition-opacity flex items-center justify-center min-w-[44px] min-h-[44px]"
              >
                <LucideGif size={24} />
              </button>

              <button
                onClick={() => {
                  setPostType("poll");
                  setIsExpanded(true);
                }}
                className={cn(
                  "p-3 transition-opacity flex items-center justify-center min-w-[44px] min-h-[44px]",
                  postType === "poll" ? "text-[#ff6bcb] opacity-100" : "text-white opacity-70 hover:opacity-100"
                )}
              >
                <LucidePoll size={24} />
              </button>

              <button
                onClick={() => setActivePanel("location")}
                className="p-3 text-white opacity-70 hover:opacity-100 transition-opacity flex items-center justify-center min-w-[44px] min-h-[44px]"
              >
                <LucideLocation size={24} />
              </button>

              <button
                onClick={() => setActivePanel("more")}
                className="p-3 text-white opacity-70 hover:opacity-100 transition-opacity flex items-center justify-center min-w-[44px] min-h-[44px]"
              >
                <MoreHorizontal size={24} />
              </button>
            </div>
          </div>

          {/* Render Mobile Panels as Overlays */}
          {activePanel !== "none" && activePanel !== "draft-recovery" && (
            <div className="absolute inset-0 bg-[#000] z-50 flex flex-col text-white animate-slide-up pointer-events-auto">
              {renderPanelContent(true)}
            </div>
          )}

          {/* Draft Recovery close confirmation sheet */}
          {activePanel === "draft-recovery" && (
            <div className="absolute inset-0 bg-black/85 z-[100] flex flex-col justify-end pointer-events-auto">
              <div className="bg-[#121212] rounded-t-3xl p-6 space-y-4 text-center border-t border-zinc-800 animate-slide-up">
                <h4 className="font-bold text-lg text-white">Save draft?</h4>
                <p className="text-sm text-zinc-400">You can save this post as a draft and finish it later, or discard it now.</p>
                <div className="flex flex-col gap-2 pt-2">
                  <button
                    onClick={handleSaveDraftAndClose}
                    className="w-full bg-gradient-to-r from-[#ff6bcb] to-[#9f5cff] hover:opacity-90 text-white font-bold py-3.5 rounded-full text-sm min-h-[44px]"
                  >
                    Save Draft
                  </button>
                  <button
                    onClick={handleDiscardAndClose}
                    className="w-full bg-zinc-900 hover:bg-zinc-850 text-red-500 font-bold py-3.5 rounded-full text-sm min-h-[44px]"
                  >
                    Discard Draft
                  </button>
                  <button
                    onClick={() => setActivePanel("none")}
                    className="w-full bg-transparent hover:bg-zinc-900/40 text-white font-semibold py-3.5 rounded-full text-sm min-h-[44px]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* DESKTOP COMPOSER VIEW */}
      <div className="hidden md:flex bg-card rounded-3xl w-full max-w-[850px] mx-auto overflow-hidden text-card-foreground shadow-2xl border border-border/40 select-none relative transition-all duration-300">
        <input 
          type="file"
          accept="image/*, video/*"
          multiple
          ref={desktopFileInputRef}
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
          <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4 text-white">
            <Loader2 className="size-12 animate-spin text-primary" />
            <span className="text-lg font-bold tracking-wide">Processing and uploading media assets...</span>
          </div>
        )}

        <div className="flex w-full">
          {/* Main Compose Card Column */}
          <div className="flex-1 flex flex-col min-w-0 bg-card">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-border/40 bg-card">
              <h3 className="font-bold text-lg">Create Post</h3>

              {/* Post type selector tabs */}
              <div className="flex bg-[#121212] p-1 rounded-full text-xs font-semibold gap-1">
                {(["normal", "thread", "poll", "article"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setPostType(type)}
                    className={cn(
                      "px-3 py-1 rounded-full capitalize text-white transition-all",
                      postType === type ? "bg-white text-black font-bold" : "text-zinc-400"
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {onClose && (
                <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground">
                  <X className="size-5" />
                </button>
              )}
            </div>

            {/* Compose Text Box Area */}
            <div className="p-6 flex flex-col gap-4 max-h-[380px] overflow-y-auto min-h-[160px] bg-card">
              {postType === "thread" ? (
                // Threads Node List
                <div className="space-y-4">
                  {threads.map((node, idx) => {
                    const isActive = activeThreadIndex === idx;
                    return (
                      <div
                        key={node.id}
                        onClick={() => setActiveThreadIndex(idx)}
                        className={cn(
                          "relative flex gap-4 items-start transition-opacity",
                          !isActive && "opacity-60"
                        )}
                      >
                        <div className="flex flex-col items-center flex-shrink-0 relative self-stretch">
                          <UserAvatar avatarUrl={user.avatarUrl} className="size-10 z-10 bg-card border border-border/40" />
                          {idx < threads.length - 1 && (
                            <div className="w-0.5 bg-border absolute top-10 bottom-[-16px] left-1/2 -translate-x-1/2 z-0" />
                          )}
                        </div>

                        <div className="flex-grow min-w-0 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-sm text-foreground">{user.displayName}</span>
                              <span className="text-xs text-muted-foreground">@{user.username}</span>
                            </div>
                            {threads.length > 1 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveThreadNode(idx);
                                }}
                                className="text-muted-foreground hover:text-foreground p-1 transition-colors"
                              >
                                <X className="size-4" />
                              </button>
                            )}
                          </div>

                          <textarea
                            value={node.text}
                            onChange={(e) => {
                              const updated = [...threads];
                              updated[idx].text = e.target.value;
                              setThreads(updated);
                            }}
                            onInput={handleTextareaInput}
                            placeholder="Add another post..."
                            className="w-full bg-transparent border-none outline-none resize-none text-foreground focus:ring-0 p-0 font-medium text-base min-h-[60px]"
                            rows={2}
                          />
                        </div>
                      </div>
                    );
                  })}
                  <div 
                    onClick={handleAddThreadNode} 
                    className="flex items-center gap-2 pl-14 text-[#ff6bcb] hover:opacity-80 text-sm font-semibold cursor-pointer select-none"
                  >
                    <Plus className="size-4" />
                    <span>Add another post</span>
                  </div>
                </div>
              ) : (
                // Normal / Poll / Article compose
                <div className="relative flex gap-4 items-start">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <UserAvatar avatarUrl={user.avatarUrl} className="size-10 z-10 bg-card border border-border/40" />
                    <div className="mt-2 text-center">
                      {saveStatus === "saving" && <span className="text-[10px] text-zinc-500 animate-pulse font-medium">Saving...</span>}
                      {saveStatus === "saved" && <span className="text-[10px] text-[#ff6bcb] font-bold">Saved</span>}
                    </div>
                  </div>

                  <div className="flex-grow min-w-0 space-y-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-foreground">{user.displayName}</span>
                      <span className="text-xs text-muted-foreground">@{user.username}</span>
                    </div>

                    <textarea
                      value={threads[0].text}
                      onChange={(e) => {
                        const list = [...threads];
                        list[0].text = e.target.value;
                        setThreads(list);
                      }}
                      onInput={handleTextareaInput}
                      placeholder={
                        postType === "article"
                          ? "Title of your article...\n\nStart writing here..."
                          : "What's happening?"
                      }
                      className={cn(
                        "w-full bg-transparent border-none outline-none resize-none text-foreground focus:ring-0 p-0 font-medium placeholder:text-muted-foreground min-h-[60px]",
                        postType === "article" ? "text-lg font-serif" : "text-base"
                      )}
                      rows={2}
                    />

                    {postType !== "article" && charCount > 0 && (
                      <div className="flex justify-end items-center gap-1.5 text-xs text-muted-foreground font-mono">
                        <span>{charCount}/{charLimit}</span>
                        <svg className="size-5 transform -rotate-90">
                          <circle cx="10" cy="10" r="7" className="stroke-zinc-800 fill-none" strokeWidth="1.5" />
                          <circle
                            cx="10"
                            cy="10"
                            r="7"
                            className={cn(
                              "fill-none transition-all duration-200",
                              isOverLimit ? "stroke-red-500" : "stroke-primary"
                            )}
                            strokeWidth="1.5"
                            strokeDasharray={2 * Math.PI * 7}
                            strokeDashoffset={2 * Math.PI * 7 * (1 - percentage / 100)}
                          />
                        </svg>
                      </div>
                    )}

                    {/* Notion AI assist inline chip */}
                    {charCount >= 15 && activePanel === "none" && (
                      <div className="flex justify-start">
                        <button
                          onClick={() => setActivePanel("ai")}
                          className="flex items-center gap-1 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full text-xs text-zinc-300 font-medium hover:border-zinc-700 transition-all cursor-pointer min-h-[44px]"
                        >
                          <Sparkles className="size-3 text-[#ff6bcb]" />
                          <span>✨ Improve Writing</span>
                        </button>
                      </div>
                    )}

                    {selectedLocation && (
                      <div className="flex justify-start">
                        <span className="flex items-center gap-1.5 text-xs bg-zinc-900 border border-zinc-800 text-white rounded-full py-1 px-3">
                          <span>📍 {selectedLocation.name}</span>
                          <button 
                            onClick={() => setSelectedLocation(null)}
                            className="text-zinc-500 hover:text-white p-0.5"
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      </div>
                    )}

                    {/* Horizontal Media Tray on Desktop */}
                    {attachments.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block px-1">Selected Media</span>
                        <div className="flex gap-2.5 overflow-x-auto py-1 scrollbar-none items-center">
                          {attachments.map((item, idx) => {
                            const isVideoFile = item.file.type.startsWith("video");
                            const hasAltText = !!mediaAltTexts[item.file.name];
                            
                            return (
                              <div 
                                key={idx} 
                                className="relative size-20 rounded-2xl overflow-hidden shrink-0 border border-zinc-800 bg-neutral-900 flex items-center justify-center group"
                              >
                                {isVideoFile ? (
                                  <video src={item.previewUrl} className="w-full h-full object-cover" muted />
                                ) : (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={item.previewUrl || ""} className="w-full h-full object-cover" alt="preview" />
                                )}

                                {isVideoFile && (
                                  <span className="absolute bottom-1 right-1 bg-black/70 text-[9px] text-white px-1 py-0.5 rounded font-mono">
                                    0:15
                                  </span>
                                )}

                                {hasAltText && (
                                  <span className="absolute bottom-1 left-1 bg-sky-500 text-[8px] text-white px-1 py-0.5 rounded-full font-bold">
                                    ALT
                                  </span>
                                )}

                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 py-1 transition-opacity">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveMediaIndex(idx);
                                      setActivePanel("media-edit");
                                    }}
                                    className="text-[9px] font-bold text-white bg-sky-500 px-1.5 py-0.5 rounded hover:bg-sky-600"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveMediaIndex(idx);
                                      setCurrentAltInput(mediaAltTexts[item.file.name] || "");
                                      setActivePanel("alt-text");
                                    }}
                                    className="text-[9px] font-bold text-white bg-zinc-800 p-0.5 rounded hover:bg-zinc-700"
                                  >
                                    <Accessibility className="size-3" />
                                  </button>
                                </div>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeAttachment(item.file.name);
                                  }}
                                  className="absolute right-1 top-1 bg-black/70 text-white rounded-full p-0.5 hover:bg-black"
                                >
                                  <X className="size-3" />
                                </button>
                              </div>
                            );
                          })}

                          <button
                            onClick={() => desktopFileInputRef.current?.click()}
                            className="size-20 rounded-2xl border border-dashed border-zinc-800 bg-zinc-950 flex flex-col items-center justify-center text-zinc-500 hover:text-white hover:border-zinc-600 transition-all shrink-0 cursor-pointer"
                          >
                            <Plus className="size-4 mb-0.5" />
                            <span className="text-[9px] font-bold">Add</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Poll Creator Section */}
                    {postType === "poll" && (
                      <div className="bg-zinc-950 border border-zinc-850 rounded-2xl p-4 space-y-3 relative max-w-sm">
                        <div className="flex justify-between items-center pb-1">
                          <span className="text-xs font-bold text-zinc-400">POLL OPTIONS</span>
                          <button
                            onClick={() => {
                              if (pollOptions.length < 4) {
                                setPollOptions([...pollOptions, ""]);
                              }
                            }}
                            disabled={pollOptions.length >= 4}
                            className="text-xs text-[#ff6bcb] hover:opacity-85 disabled:opacity-40"
                          >
                            + Add Option
                          </button>
                        </div>
                        <div className="flex flex-col gap-2">
                          {pollOptions.map((option, oIdx) => (
                            <div key={oIdx} className="relative flex items-center">
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
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 pr-10 text-xs text-white focus:outline-none placeholder:text-zinc-600"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Audience selector pill */}
                    <div className="flex justify-start">
                      <button
                        onClick={() => setActivePanel("audience")}
                        className="flex items-center gap-1 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-full text-xs text-zinc-300 font-semibold hover:border-zinc-700"
                      >
                        <Globe className="size-3.5 text-sky-400" />
                        <span className="capitalize">{audience.toLowerCase().replace("_", " ")}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Desktop toolbar & Publish */}
            <div className="border-t border-border/40 p-4 bg-card flex justify-between items-center">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => desktopFileInputRef.current?.click()}
                  className="p-3 text-primary hover:bg-accent rounded-full transition-colors flex items-center justify-center min-w-[48px] min-h-[48px]"
                >
                  <LucideImage size={24} />
                </button>
                <button
                  onClick={() => setActivePanel(activePanel === "gif" ? "none" : "gif")}
                  className={cn(
                    "p-3 rounded-full flex items-center justify-center transition-colors min-w-[48px] min-h-[48px]",
                    activePanel === "gif" ? "text-sky-400 bg-accent" : "text-primary hover:bg-accent"
                  )}
                >
                  <LucideGif size={24} />
                </button>
                <button
                  onClick={() => setPostType("poll")}
                  className={cn(
                    "p-3 rounded-full flex items-center justify-center transition-colors min-w-[48px] min-h-[48px]",
                    postType === "poll" ? "text-sky-400 bg-accent" : "text-primary hover:bg-accent"
                  )}
                >
                  <LucidePoll size={24} />
                </button>
                <button
                  onClick={() => setActivePanel(activePanel === "location" ? "none" : "location")}
                  className={cn(
                    "p-3 rounded-full flex items-center justify-center transition-colors min-w-[48px] min-h-[48px]",
                    activePanel === "location" ? "text-sky-400 bg-accent" : "text-primary hover:bg-accent"
                  )}
                >
                  <LucideLocation size={24} />
                </button>
                <button
                  onClick={() => setActivePanel(activePanel === "more" ? "none" : "more")}
                  className={cn(
                    "p-3 rounded-full flex items-center justify-center transition-colors min-w-[48px] min-h-[48px]",
                    activePanel === "more" ? "text-sky-400 bg-accent" : "text-primary hover:bg-accent"
                  )}
                >
                  <MoreHorizontal size={24} />
                </button>
              </div>

              <div className="flex items-center gap-4">
                <LoadingButton
                  onClick={handlePublish}
                  loading={mutation.isPending || isProcessingAndSubmitting}
                  disabled={(!threads[0]?.text.trim() && attachments.length === 0) || isUploading || isOverLimit}
                  className="rounded-full bg-gradient-to-r from-[#ff6bcb] to-[#9f5cff] hover:opacity-95 text-white font-bold px-6 py-2.5 text-xs min-h-[44px]"
                >
                  Post
                </LoadingButton>
              </div>
            </div>
          </div>

          {/* Integrated Side panel drawer on Desktop */}
          {activePanel !== "none" && activePanel !== "draft-recovery" && (
            <div className="w-[340px] border-l border-zinc-850 bg-black flex flex-col h-auto animate-fade-in relative z-20">
              {renderPanelContent(false)}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
