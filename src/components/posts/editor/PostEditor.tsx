"use client";

import { useSession } from "@/app/(main)/SessionProvider";
import LoadingButton from "@/components/LoadingButton";
import { Button } from "@/components/ui/button";
import UserAvatar from "@/components/UserAvatar";
import { cn } from "@/lib/utils";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useDropzone } from "react-dropzone";
import {
  Image as LucideImage,
  FileText as LucideGif,
  BarChart3 as LucidePoll,
  MapPin as LucideLocation,
  Flag as LucideFlag,
  Loader2,
  X,
  Sparkles,
  Smile,
  Plus,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Users,
  Globe,
  Heart,
  MessageSquare,
  Undo2,
  Image as ImageIcon,
  Sliders,
  Sparkle
} from "lucide-react";
import Image from "next/image";
import { useRef, useState, useEffect } from "react";
import { useSubmitPostMutation } from "./mutations";
import "./styles.css";
import useMediaUpload, { Attachment } from "./useMediaUpload";
import VideoPlayer from "@/components/VideoPlayer";
import Cropper from "react-easy-crop";
import EmojiPickerPanel from "@/components/stories/EmojiPickerPanel";
import GifPicker from "@/components/stories/GifPicker";
import LocationPickerSheet from "@/components/ui/LocationPickerSheet";
import { getFilterString, getProcessedImg } from "./imageProcessing";
import { submitPost } from "./actions";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { UploadService } from "@/lib/services/uploadService";
import { LocationData } from "@/lib/providers/locationProvider";

// 15 Supported Filters matching standard and creative styles
const filterPresets = [
  { name: "Normal" },
  { name: "Clarendon" },
  { name: "Juno" },
  { name: "Lark" },
  { name: "Ludwig" },
  { name: "Valencia" },
  { name: "Gingham" },
  { name: "Rise" },
  { name: "Aden" },
  { name: "Hudson" },
  { name: "Warm" },
  { name: "Cool" },
  { name: "Vintage" },
  { name: "Bright" },
  { name: "Cinematic" }
];

// System Backgrounds gradients definitions
const systemBackgrounds = [
  { id: "sunset", label: "Sunset", style: "linear-gradient(135deg, #f97316 0%, #ec4899 50%, #8b5cf6 100%)", text: "#ffffff" },
  { id: "emerald", label: "Emerald", style: "linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)", text: "#ffffff" },
  { id: "ocean", label: "Ocean", style: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #1d4ed8 100%)", text: "#ffffff" },
  { id: "peach", label: "Peach", style: "linear-gradient(135deg, #ffedd5 0%, #fdba74 50%, #f97316 100%)", text: "#7c2d12" },
  { id: "darkknight", label: "Dark Knight", style: "linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #020617 100%)", text: "#ffffff" },
  { id: "candy", label: "Candy", style: "linear-gradient(135deg, #f472b6 0%, #db2777 50%, #9d174d 100%)", text: "#ffffff" }
];

const commonHashtags = [
  "nextjs",
  "react",
  "javascript",
  "webdev",
  "programming",
  "tech",
  "coding",
  "design",
  "nature",
  "travel",
  "photography",
  "art",
  "music",
  "fitness",
  "food"
];

const adjustments = {
  exposure: "Exposure",
  brightness: "Brightness",
  contrast: "Contrast",
  saturation: "Saturation",
  warmth: "Warmth",
  vignette: "Vignette",
  sharpen: "Sharpen",
  fade: "Fade",
  highlights: "Highlights",
  shadows: "Shadows",
  structure: "Structure"
};

interface ImageAdjustmentState {
  crop: { x: number; y: number };
  zoom: number;
  rotation: number;
  aspect: number;
  croppedAreaPixels: any;
  filter: string;
  brightness: number;
  contrast: number;
  fade: number;
  saturation: number;
  warmth: number;
  exposure: number;
  vignette: number;
  sharpen: number;
  structure: number;
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
  fade: 0,
  saturation: 1,
  warmth: 0,
  exposure: 0,
  vignette: 0,
  sharpen: 0,
  structure: 0,
  highlights: 0,
  shadows: 0,
});

interface ThreadNode {
  id: string;
  text: string;
  assets: Attachment[];
  poll: {
    options: string[];
    duration: {
      days: number;
      hours: number;
      minutes: number;
    };
  } | null;
}

interface PostEditorProps {
  onClose?: () => void;
}

// Sub-component to generate real filter thumbnail previews
interface FilterThumbnailProps {
  imageSrc: string;
  filterName: string;
  isActive: boolean;
  onClick: () => void;
}

export function FilterThumbnail({ imageSrc, filterName, isActive, onClick }: FilterThumbnailProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    const generateThumbnail = async () => {
      try {
        const img = new window.Image();
        if (!imageSrc.startsWith("blob:") && !imageSrc.startsWith("data:")) {
          img.crossOrigin = "anonymous";
        }
        img.src = imageSrc;

        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });

        if (!active) return;

        const canvas = document.createElement("canvas");
        canvas.width = 80;
        canvas.height = 80;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("No 2d context");

        // Center crop image
        const size = Math.min(img.width, img.height);
        const x = (img.width - size) / 2;
        const y = (img.height - size) / 2;

        ctx.filter = getFilterString(filterName, {});
        ctx.drawImage(img, x, y, size, size, 0, 0, 80, 80);

        if (!active) return;
        setThumbnailUrl(canvas.toDataURL("image/jpeg", 0.8));
        setLoading(false);
      } catch (e) {
        console.error("Thumbnail error:", e);
        if (active) setLoading(false);
      }
    };

    generateThumbnail();
    return () => {
      active = false;
    };
  }, [imageSrc, filterName]);

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex flex-col gap-1 items-center cursor-pointer rounded-xl p-1 shrink-0 border border-transparent hover:bg-neutral-900 transition-all select-none",
        isActive ? "border-primary bg-neutral-900" : ""
      )}
    >
      <div className="size-16 rounded-lg overflow-hidden relative bg-neutral-900 flex items-center justify-center border border-neutral-800">
        {loading ? (
          <div className="w-full h-full animate-pulse bg-neutral-800" />
        ) : thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbnailUrl} alt={filterName} className="w-full h-full object-cover pointer-events-none" />
        ) : (
          <span className="text-[9px] text-neutral-500">Error</span>
        )}
      </div>
      <span className="text-[9px] font-bold text-neutral-400 truncate w-14 text-center">{filterName}</span>
    </div>
  );
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

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: startUpload,
    noClick: true,
  });

  const { onClick: triggerDropzoneClick, ...rootProps } = getRootProps();

  // Wizard state: 1 = Compose, 2 = Adjustments/Edit, 3 = Metadata/Audience
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const [activeMediaIndex, setActiveMediaIndex] = useState<number>(0);

  // Active Tool state panel selection (strictly mutual exclusive)
  type activeToolPanel = "gif" | "emoji" | "poll" | "location" | "background" | "ai" | null;
  const [activePanel, setActivePanel] = useState<activeToolPanel>(null);

  // Poll state (Desktop)
  const [hasPoll, setHasPoll] = useState(false);
  const [pollChoices, setPollChoices] = useState<string[]>(["", ""]);
  const [pollDays, setPollDays] = useState(1);
  const [pollHours, setPollHours] = useState(0);
  const [pollMinutes, setPollMinutes] = useState(0);

  // Desktop side panel resizable width
  const [sidebarWidth, setSidebarWidth] = useState(340);

  // Mobile slider adjustments bottom drawer visible
  const [mobileAdjustPanelOpen, setMobileAdjustPanelOpen] = useState(false);

  // System Background Selection
  const [selectedBackgroundId, setSelectedBackgroundId] = useState<string | null>(null);

  // Thread State (Mobile)
  const [threads, setThreads] = useState<ThreadNode[]>([
    { id: "1", text: "", assets: [], poll: null }
  ]);
  const [activeThreadIndex, setActiveThreadIndex] = useState(0);

  // Image Edit States mapped by filename
  const [mediaAdjustments, setMediaAdjustments] = useState<Record<string, ImageAdjustmentState>>({});
  const [editTab, setEditTab] = useState<"filters" | "adjustments">("filters");

  // Metadata/Share parameters
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [collaborators, setCollaborators] = useState<string[]>([]);
  const [collabQuery, setCollabQuery] = useState("");
  const [collabUsers, setCollabUsers] = useState<any[]>([]);
  const [altText, setAltText] = useState("");
  const [audience, setAudience] = useState("PUBLIC");
  const [disableComments, setDisableComments] = useState(false);
  const [hideLikes, setHideLikes] = useState(false);

  // Tagging State: map of filename to coordinate-based username tags
  const [mediaTags, setMediaTags] = useState<Record<string, { username: string; x: number; y: number }[]>>({});
  const [activeTagCoord, setActiveTagCoord] = useState<{ x: number; y: number } | null>(null);
  const [tagQuery, setTagQuery] = useState("");
  const [tagSearchUsers, setTagSearchUsers] = useState<any[]>([]);

  // AI Caption state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiCaptions, setAiCaptions] = useState<string[]>([]);

  // Autocomplete suggestions popup
  const [autocomplete, setAutocomplete] = useState<{
    trigger: "@" | "#";
    query: string;
    users: any[];
    tags: string[];
    index: number;
  } | null>(null);

  const [isProcessingAndSubmitting, setIsProcessingAndSubmitting] = useState(false);
  const [showDraftBanner, setShowDraftBanner] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        bold: false,
        italic: false,
      }),
      Placeholder.configure({
        placeholder: "What's happening?",
      }),
    ],
    onUpdate: ({ editor }) => {
      const textBeforeCursor = editor.state.doc.textBetween(
        Math.max(0, editor.state.selection.from - 25),
        editor.state.selection.from
      ) || "";
      const match = textBeforeCursor.match(/([@#])([a-zA-Z0-9_-]*)$/);
      if (match) {
        const trigger = match[1] as "@" | "#";
        const query = match[2];
        if (trigger === "@") {
          fetch(`/api/search/autocomplete?q=${query}`)
            .then((res) => res.json())
            .then((data) => {
              setAutocomplete({
                trigger,
                query,
                users: data.users || [],
                tags: [],
                index: 0,
              });
            })
            .catch(console.error);
        } else {
          const matchedTags = commonHashtags.filter((t) =>
            t.toLowerCase().startsWith(query.toLowerCase())
          );
          setAutocomplete({
            trigger,
            query,
            users: [],
            tags: matchedTags.slice(0, 5),
            index: 0,
          });
        }
      } else {
        setAutocomplete(null);
      }
    },
  });

  const input = editor?.getText({ blockSeparator: "\n" }) || "";

  // DRAFTS LOGIC
  useEffect(() => {
    const draft = localStorage.getItem("cartly_composer_draft");
    if (draft) {
      setShowDraftBanner(true);
    }
  }, []);

  // Auto-save draft on data edits
  useEffect(() => {
    if (input.trim() || hasPoll || attachments.length > 0 || selectedLocation || disableComments || hideLikes) {
      const draftObj = {
        input,
        hasPoll,
        pollChoices,
        pollDays,
        pollHours,
        pollMinutes,
        locationName: selectedLocation?.name || "",
        locationDesc: selectedLocation?.description || "",
        altText,
        audience,
        disableComments,
        hideLikes,
        collaborators,
        selectedBackgroundId,
      };
      localStorage.setItem("cartly_composer_draft", JSON.stringify(draftObj));
    }
  }, [input, hasPoll, pollChoices, pollDays, pollHours, pollMinutes, selectedLocation, altText, audience, disableComments, hideLikes, collaborators, attachments, selectedBackgroundId]);

  const resumeDraft = () => {
    try {
      const draftStr = localStorage.getItem("cartly_composer_draft");
      if (draftStr) {
        const draft = JSON.parse(draftStr);
        if (draft.input && editor) {
          editor.commands.setContent(draft.input);
        }
        setHasPoll(draft.hasPoll || false);
        setPollChoices(draft.pollChoices || ["", ""]);
        setPollDays(draft.pollDays || 1);
        setPollHours(draft.pollHours || 0);
        setPollMinutes(draft.pollMinutes || 0);
        if (draft.locationName) {
          setSelectedLocation({ name: draft.locationName, description: draft.locationDesc || "" });
        }
        setAltText(draft.altText || "");
        setAudience(draft.audience || "PUBLIC");
        setDisableComments(draft.disableComments || false);
        setHideLikes(draft.hideLikes || false);
        setCollaborators(draft.collaborators || []);
        setSelectedBackgroundId(draft.selectedBackgroundId || null);
      }
    } catch (e) {
      console.error("Failed to parse draft", e);
    }
    setShowDraftBanner(false);
  };

  const discardDraft = () => {
    localStorage.removeItem("cartly_composer_draft");
    setShowDraftBanner(false);
  };

  // Bi-directional media upload sync for Mobile thread nodes
  useEffect(() => {
    const activeNode = threads[activeThreadIndex];
    if (activeNode) {
      setAttachments(activeNode.assets);
    }
  }, [activeThreadIndex]);

  useEffect(() => {
    const updated = [...threads];
    if (updated[activeThreadIndex]) {
      updated[activeThreadIndex].assets = attachments;
      setThreads(updated);
    }
  }, [attachments]);

  const selectAutocomplete = (value: string) => {
    if (!editor || !autocomplete) return;
    const textBeforeCursor = editor.state.doc.textBetween(
      Math.max(0, editor.state.selection.from - 25),
      editor.state.selection.from
    ) || "";
    const match = textBeforeCursor.match(/([@#])([a-zA-Z0-9_-]*)$/);
    if (match) {
      const from = editor.state.selection.from - match[0].length;
      const to = editor.state.selection.from;
      editor
        .chain()
        .focus()
        .insertContentAt({ from, to }, `${autocomplete.trigger}${value} `)
        .run();
    }
    setAutocomplete(null);
  };

  // Giphy download & upload helper using UploadService
  const addGiphyAttachment = async (giphyUrl: string) => {
    try {
      setActivePanel(null);
      const res = await fetch(giphyUrl);
      const blob = await res.blob();
      const file = new File([blob], `giphy_${Date.now()}.gif`, { type: "image/gif" });

      const tempId = `temp_${Date.now()}`;
      const newAtt: Attachment = {
        file,
        mediaId: undefined,
        isUploading: true,
        previewUrl: giphyUrl,
      };

      setAttachments((prev) => [...prev, newAtt]);

      const uploaded = await UploadService.uploadPostAttachment(file);
      setAttachments((prev) =>
        prev.map((a) => (a.previewUrl === giphyUrl ? { ...a, mediaId: uploaded.mediaId, isUploading: false } : a))
      );
    } catch (e) {
      console.error("Giphy attach failed", e);
      toast({ variant: "destructive", description: "Failed to upload GIF." });
    }
  };

  // Reorder attachments
  const moveAttachment = (index: number, direction: "left" | "right") => {
    const newIdx = direction === "left" ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= attachments.length) return;
    const reordered = [...attachments];
    const temp = reordered[index];
    reordered[index] = reordered[newIdx];
    reordered[newIdx] = temp;
    setAttachments(reordered);
  };

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

  // Thread Nodes controllers
  const addNewThreadNode = () => {
    const newNode: ThreadNode = {
      id: Math.random().toString(),
      text: "",
      assets: [],
      poll: null,
    };
    setThreads([...threads, newNode]);
    setActiveThreadIndex(threads.length);
  };

  const removeThreadNode = (idx: number) => {
    if (threads.length <= 1) return;
    const updated = threads.filter((_, i) => i !== idx);
    setThreads(updated);
    setActiveThreadIndex(Math.max(0, idx - 1));
  };

  const updateThreadText = (idx: number, text: string) => {
    const updated = [...threads];
    updated[idx].text = text;
    setThreads(updated);
  };

  const togglePollForNode = (idx: number) => {
    const updated = [...threads];
    if (updated[idx].poll) {
      updated[idx].poll = null;
    } else {
      updated[idx].poll = {
        options: ["", ""],
        duration: { days: 1, hours: 0, minutes: 0 },
      };
    }
    setThreads(updated);
  };

  const removePollFromNode = (idx: number) => {
    const updated = [...threads];
    updated[idx].poll = null;
    setThreads(updated);
  };

  // Interactive tag coordinates selector
  const handleTagClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (stage !== 3) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setActiveTagCoord({ x, y });
    setTagQuery("");
    setTagSearchUsers([]);
  };

  const addTag = (username: string) => {
    if (!activeTagCoord) return;
    const activeFile = attachments[activeMediaIndex]?.file.name;
    if (!activeFile) return;

    const newTag = { username, x: activeTagCoord.x, y: activeTagCoord.y };
    setMediaTags((prev) => ({
      ...prev,
      [activeFile]: [...(prev[activeFile] || []), newTag],
    }));
    setActiveTagCoord(null);
  };

  const removeTag = (fileName: string, tagIdx: number) => {
    setMediaTags((prev) => ({
      ...prev,
      [fileName]: (prev[fileName] || []).filter((_, idx) => idx !== tagIdx),
    }));
  };

  // AI Caption Generator
  const generateAICaptions = async (style: string) => {
    setAiLoading(true);
    setAiCaptions([]);
    try {
      const response = await fetch("/api/ai/caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: input, style }),
      });
      const data = await response.json();
      if (data.captions) {
        setAiCaptions(data.captions);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoading(false);
    }
  };

  // Drag resizing sidepanel handler
  const handleSidebarResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const onMove = (event: MouseEvent) => {
      const newWidth = window.innerWidth - event.clientX;
      setSidebarWidth(Math.max(280, Math.min(500, newWidth)));
    };
    const onEnd = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onEnd);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);
  };

  // Collaborators autocomplete query
  useEffect(() => {
    if (!collabQuery.trim()) {
      setCollabUsers([]);
      return;
    }
    const delay = setTimeout(() => {
      fetch(`/api/search/autocomplete?q=${collabQuery}`)
        .then((res) => res.json())
        .then((data) => setCollabUsers(data.users || []))
        .catch(console.error);
    }, 300);
    return () => clearTimeout(delay);
  }, [collabQuery]);

  // Main Publish controller (supports single post on Desktop & sequential threads on Mobile)
  const handlePublish = async () => {
    try {
      setIsProcessingAndSubmitting(true);

      let backgroundMediaId: string | null = null;
      if (selectedBackgroundId) {
        const bg = systemBackgrounds.find((b) => b.id === selectedBackgroundId);
        if (bg) {
          const registered = await UploadService.uploadSystemBackground(bg.style);
          backgroundMediaId = registered.mediaId;
        }
      }

      let previousPostId: string | null = null;

      for (let i = 0; i < threads.length; i++) {
        const node = threads[i];
        const nodeMediaIds: string[] = [];

        if (i === 0 && backgroundMediaId) {
          nodeMediaIds.push(backgroundMediaId);
        }

        // Process and upload edited image buffers
        const uploadPromises = node.assets.map(async (a) => {
          const fileAdj = mediaAdjustments[a.file.name];
          const hasFilterOrAdj = fileAdj && (
            fileAdj.filter !== "Normal" ||
            fileAdj.brightness !== 1 ||
            fileAdj.contrast !== 1 ||
            fileAdj.saturation !== 1 ||
            fileAdj.warmth !== 0 ||
            fileAdj.exposure !== 0 ||
            fileAdj.vignette !== 0 ||
            fileAdj.sharpen !== 0 ||
            fileAdj.fade !== 0 ||
            fileAdj.structure !== 0 ||
            fileAdj.highlights !== 0 ||
            fileAdj.shadows !== 0 ||
            fileAdj.rotation !== 0 ||
            fileAdj.croppedAreaPixels !== null
          );

          if (a.file.type.startsWith("image") && hasFilterOrAdj) {
            const processedBlob = await getProcessedImg(
              a.previewUrl!,
              fileAdj.croppedAreaPixels || null,
              fileAdj.rotation,
              fileAdj.filter,
              {
                brightness: fileAdj.brightness,
                contrast: fileAdj.contrast,
                fade: fileAdj.fade,
                saturation: fileAdj.saturation,
                temperature: fileAdj.warmth,
                vignette: fileAdj.vignette,
                exposure: fileAdj.exposure,
                sharpen: fileAdj.sharpen,
                structure: fileAdj.structure,
                highlights: fileAdj.highlights,
                shadows: fileAdj.shadows,
              }
            );

            const finalFile = new File([processedBlob], a.file.name, { type: "image/jpeg" });
            const uploaded = await UploadService.uploadPostAttachment(finalFile);
            return uploaded.mediaId;
          }
          return a.mediaId || "";
        });

        const processedMediaIds = await Promise.all(uploadPromises);
        processedMediaIds.forEach((id) => {
          if (id) nodeMediaIds.push(id);
        });

        const tagPayload: any[] = [];
        node.assets.forEach((a, aIdx) => {
          const fileTags = mediaTags[a.file.name] || [];
          fileTags.forEach((t) => {
            tagPayload.push({
              mediaIndex: aIdx,
              username: t.username,
              x: t.x,
              y: t.y,
            });
          });
        });

        const result = await submitPost({
          content: node.text,
          mediaIds: nodeMediaIds,
          location: selectedLocation?.name || null,
          disableComments,
          hideLikes,
          altText: altText || null,
          audience,
          quotedPostId: previousPostId,
          tags: tagPayload.length > 0 ? tagPayload : null,
          collaborators: collaborators.length > 0 ? collaborators : null,
          poll: node.poll
            ? {
                options: node.poll.options.filter((c) => c.trim() !== ""),
                duration: {
                  days: node.poll.duration.days,
                  hours: node.poll.duration.hours,
                  minutes: node.poll.duration.minutes,
                },
              }
            : null,
        });

        previousPostId = result.id;
      }

      queryClient.invalidateQueries({ queryKey: ["post-feed"] });
      toast({ description: threads.length > 1 ? "Thread published successfully!" : "Post published successfully!" });

      setThreads([{ id: "1", text: "", assets: [], poll: null }]);
      setActiveThreadIndex(0);
      resetMediaUploads();
      discardDraft();
      if (onClose) onClose();

    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", description: "Failed to publish post." });
    } finally {
      setIsProcessingAndSubmitting(false);
    }
  };

  const charCount = threads[0]?.text.length || 0;
  const characterLimit = selectedBackgroundId ? 280 : 5000;
  const percentage = Math.min((charCount / characterLimit) * 100, 100);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeFile = attachments[activeMediaIndex]?.file.name;
  const activeAdj = activeFile ? getAdjustment(activeFile) : defaultAdjustmentState();
  const activeTags = activeFile ? mediaTags[activeFile] || [] : [];
  const activeSrc = attachments[activeMediaIndex]?.previewUrl || "";
  const isVideo = attachments[activeMediaIndex]?.file?.type?.startsWith("video") || false;

  const activeNodeText = threads[activeThreadIndex]?.text || "";
  const activeNodeCharCount = activeNodeText.length;
  const activeNodePercentage = Math.min((activeNodeCharCount / characterLimit) * 100, 100);

  const handleTextareaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  const handleTextareaChange = (idx: number, text: string) => {
    updateThreadText(idx, text);

    const match = text.match(/([@#])([a-zA-Z0-9_-]*)$/);
    if (match) {
      const trigger = match[1] as "@" | "#";
      const query = match[2];
      if (trigger === "@") {
        fetch(`/api/search/autocomplete?q=${query}`)
          .then((res) => res.json())
          .then((data) => {
            setAutocomplete({
              trigger,
              query,
              users: data.users || [],
              tags: [],
              index: 0,
            });
          })
          .catch(console.error);
      } else {
        const matchedTags = commonHashtags.filter((t) =>
          t.toLowerCase().startsWith(query.toLowerCase())
        );
        setAutocomplete({
          trigger,
          query,
          users: [],
          tags: matchedTags.slice(0, 5),
          index: 0,
        });
      }
    } else {
      setAutocomplete(null);
    }
  };

  return (
    <>
      {/* MOBILE COMPOSER VIEW */}
      <div className="flex md:hidden fixed inset-0 bg-black z-50 flex-col justify-between h-screen h-[100dvh] w-screen overflow-hidden text-white select-none">
        {/* Stage 1: Mobile compose */}
        {stage === 1 && (
          <>
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-900 bg-black flex-shrink-0">
              <button type="button" onClick={onClose} className="text-white hover:opacity-80 p-2">
                <X className="size-6" />
              </button>
              <LoadingButton
                onClick={handlePublish}
                loading={mutation.isPending || isProcessingAndSubmitting}
                disabled={!threads[0].text.trim() || isUploading}
                className="rounded-full bg-primary hover:bg-primary/95 text-primary-foreground font-bold px-5 py-1.5 text-xs"
              >
                {threads.length > 1 ? "Post all" : "Post"}
              </LoadingButton>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-4 bg-black">
              {threads.map((node, idx) => {
                const isActive = activeThreadIndex === idx;
                const bgGrad = selectedBackgroundId && idx === 0 ? systemBackgrounds.find((b) => b.id === selectedBackgroundId) : null;

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
                              removeThreadNode(idx);
                            }}
                            className="text-zinc-500 hover:text-white p-1"
                          >
                            <X className="size-4" />
                          </button>
                        )}
                      </div>

                      <div
                        style={{ background: bgGrad?.style || "transparent", color: bgGrad?.text || "#ffffff" }}
                        className={cn(
                          "w-full rounded-2xl transition-all",
                          bgGrad ? "p-6 text-center flex items-center justify-center min-h-[140px]" : "p-0"
                        )}
                      >
                        <textarea
                          value={node.text}
                          onChange={(e) => updateThreadText(idx, e.target.value)}
                          onInput={handleTextareaInput}
                          placeholder={idx === 0 ? "What's happening?" : "Add another post..."}
                          className={cn(
                            "w-full bg-transparent border-none outline-none resize-none text-white focus:ring-0 focus-visible:ring-0 p-0 font-medium",
                            bgGrad ? "text-xl text-center font-bold placeholder:text-white/60" : "text-sm placeholder-zinc-650 min-h-[60px]"
                          )}
                          rows={2}
                        />
                      </div>

                      {node.poll && (
                        <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-3 flex flex-col gap-2 relative max-w-sm">
                          <button onClick={(e) => { e.stopPropagation(); removePollFromNode(idx); }} className="absolute right-2 top-2 text-zinc-500 hover:text-white p-1">
                            <X className="size-3.5" />
                          </button>
                          <div className="flex flex-col gap-1.5 mt-2">
                            {node.poll.options.map((option, oIdx) => (
                              <input
                                key={oIdx}
                                type="text"
                                placeholder={`Choice ${oIdx + 1}`}
                                maxLength={25}
                                value={option}
                                onChange={(e) => {
                                  const updated = [...threads];
                                  if (updated[idx].poll) {
                                    updated[idx].poll.options[oIdx] = e.target.value;
                                    setThreads(updated);
                                  }
                                }}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-1.5 px-3 pr-12 text-xs text-white focus:outline-none placeholder:text-zinc-650"
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {node.assets.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto py-1">
                          {node.assets.map((asset, aIdx) => (
                            <div key={aIdx} className="relative size-20 rounded-xl overflow-hidden shrink-0 border border-zinc-800 bg-neutral-900">
                              {asset.file.type.startsWith("video") ? (
                                <video src={asset.previewUrl} className="w-full h-full object-cover" muted />
                              ) : (
                                <img src={asset.previewUrl} className="w-full h-full object-cover" alt="preview" />
                              )}
                              <div className="absolute inset-x-0 bottom-0 bg-black/60 flex items-center justify-center gap-1.5 py-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveThreadIndex(idx);
                                    setActiveMediaIndex(aIdx);
                                    setStage(2);
                                  }}
                                  className="text-[9px] font-bold text-white bg-sky-500 px-2 py-0.5 rounded"
                                >
                                  Edit
                                </button>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const updated = [...threads];
                                  updated[idx].assets = updated[idx].assets.filter((_, attIdx) => attIdx !== aIdx);
                                  setThreads(updated);
                                  if (isActive) {
                                    setAttachments(updated[idx].assets);
                                  }
                                }}
                                className="absolute right-1 top-1 bg-black/80 text-white rounded-full p-0.5"
                              >
                                <X className="size-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {activeThreadIndex === threads.length - 1 && (
                <div onClick={addNewThreadNode} className="flex items-center gap-4 pl-12 py-1 text-purple-400 hover:text-purple-300 text-xs font-semibold cursor-pointer select-none">
                  <span>Add another post</span>
                </div>
              )}
            </div>

            {activePanel === "gif" && (
              <div className="p-2 border-t border-zinc-900 bg-black flex-shrink-0 animate-slide-up">
                <GifPicker onSelect={addGiphyAttachment} onClose={() => setActivePanel(null)} />
              </div>
            )}

            {activePanel === "emoji" && (
              <div className="p-2 border-t border-zinc-900 bg-black flex flex-col items-center flex-shrink-0 animate-slide-up">
                <EmojiPickerPanel
                  onEmojiSelect={(emoji) => {
                    const text = threads[activeThreadIndex].text;
                    updateThreadText(activeThreadIndex, text + emoji);
                    setActivePanel(null);
                  }}
                />
              </div>
            )}

            {activePanel === "location" && (
              <LocationPickerSheet
                onClose={() => setActivePanel(null)}
                onSelectLocation={(loc) => setSelectedLocation(loc)}
                selectedLocationName={selectedLocation?.name}
                onClearLocation={() => setSelectedLocation(null)}
              />
            )}

            {activePanel === "background" && (
              <div className="p-4 border-t border-zinc-900 bg-black flex-shrink-0 flex flex-col gap-2 animate-slide-up">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Choose Background</span>
                <div className="flex gap-3 overflow-x-auto py-1 scrollbar-none">
                  <button
                    onClick={() => setSelectedBackgroundId(null)}
                    className={cn(
                      "size-8 rounded-full border-2 bg-neutral-900 flex-shrink-0",
                      !selectedBackgroundId ? "border-sky-500" : "border-transparent"
                    )}
                  />
                  {systemBackgrounds.map((bg) => (
                    <button
                      key={bg.id}
                      onClick={() => setSelectedBackgroundId(bg.id)}
                      style={{ background: bg.style }}
                      className={cn(
                        "size-8 rounded-full border-2 flex-shrink-0",
                        selectedBackgroundId === bg.id ? "border-sky-500" : "border-transparent"
                      )}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="sticky bottom-0 bg-black border-t border-zinc-900 px-4 py-2 flex justify-between items-center flex-shrink-0 z-30">
              <div className="flex gap-3 items-center">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 text-purple-500 hover:text-purple-400 hover:bg-neutral-900 rounded-full transition-colors flex items-center justify-center"
                  style={{ minWidth: "48px", minHeight: "48px" }}
                >
                  <LucideImage size={26} />
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
                  onClick={() => setActivePanel(activePanel === "gif" ? null : "gif")}
                  className={cn(
                    "p-3 rounded-full flex items-center justify-center transition-colors",
                    activePanel === "gif" ? "text-sky-400 bg-neutral-900" : "text-purple-500 hover:text-purple-400"
                  )}
                  style={{ minWidth: "48px", minHeight: "48px" }}
                >
                  <LucideGif size={26} />
                </button>
                <button
                  onClick={() => togglePollForNode(activeThreadIndex)}
                  className="p-3 text-purple-500 hover:text-purple-400 hover:bg-neutral-900 rounded-full transition-colors flex items-center justify-center"
                  style={{ minWidth: "48px", minHeight: "48px" }}
                >
                  <LucidePoll size={26} />
                </button>
                <button
                  onClick={() => setActivePanel(activePanel === "location" ? null : "location")}
                  className={cn(
                    "p-3 rounded-full flex items-center justify-center transition-colors",
                    activePanel === "location" ? "text-sky-400 bg-neutral-900" : "text-purple-500 hover:text-purple-400"
                  )}
                  style={{ minWidth: "48px", minHeight: "48px" }}
                >
                  <LucideLocation size={26} />
                </button>
                <button
                  onClick={() => setActivePanel(activePanel === "background" ? null : "background")}
                  className={cn(
                    "p-3 rounded-full flex items-center justify-center transition-colors",
                    activePanel === "background" ? "text-sky-400 bg-neutral-900" : "text-purple-500 hover:text-purple-400"
                  )}
                  style={{ minWidth: "48px", minHeight: "48px" }}
                >
                  <ImageIcon size={26} />
                </button>
              </div>

              <div className="flex items-center gap-3">
                {activeNodeCharCount > 0 && (
                  <div className="flex items-center gap-1.5">
                    <svg className="size-5 transform -rotate-90">
                      <circle cx="10" cy="10" r="7" className="stroke-zinc-800 fill-none" strokeWidth="1.5" />
                      <circle
                        cx="10"
                        cy="10"
                        r="7"
                        className={cn(
                          "fill-none transition-all duration-300",
                          activeNodeCharCount > characterLimit ? "stroke-destructive" : "stroke-purple-500"
                        )}
                        strokeWidth="1.5"
                        strokeDasharray={2 * Math.PI * 7}
                        strokeDashoffset={2 * Math.PI * 7 * (1 - activeNodePercentage / 100)}
                      />
                    </svg>
                  </div>
                )}
                <button onClick={addNewThreadNode} className="p-1 rounded-full border border-purple-500 text-purple-500 hover:bg-purple-550/10 transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}

        {/* Stage 2: Mobile edit/filters fullscreen with swipeable strip & bottom adjustments */}
        {stage === 2 && (
          <div className="fixed inset-0 bg-black flex flex-col justify-between z-50">
            {/* Header */}
            <div className="flex justify-between items-center px-4 py-3 border-b border-zinc-900 bg-black">
              <button onClick={() => setStage(1)} className="p-2 hover:bg-neutral-900 rounded-full">
                <ArrowLeft className="size-6 text-white" />
              </button>
              <span className="font-bold text-sm">Filter & Adjust</span>
              <button onClick={() => setStage(3)} className="bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-full px-4 py-1 text-xs">
                Next
              </button>
            </div>

            {/* Media preview stage */}
            <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
              {activeFile && !attachments[activeMediaIndex].file.type.startsWith("video") ? (
                <div className="absolute inset-0">
                  <Cropper
                    image={activeSrc}
                    crop={activeAdj.crop}
                    zoom={activeAdj.zoom}
                    rotation={activeAdj.rotation}
                    aspect={activeAdj.aspect}
                    onCropChange={(c) => updateAdjustment(activeFile, { crop: c })}
                    onZoomChange={(z) => updateAdjustment(activeFile, { zoom: z })}
                    onCropComplete={(_, px) => updateAdjustment(activeFile, { croppedAreaPixels: px })}
                    style={{
                      containerStyle: { background: "#000" },
                      mediaStyle: { filter: getFilterString(activeAdj.filter, activeAdj) }
                    }}
                  />
                  {activeAdj.vignette > 0 && (
                    <div
                      style={{
                        background: `radial-gradient(circle, transparent 40%, rgba(0,0,0,${activeAdj.vignette * 0.95}) 100%)`,
                      }}
                      className="absolute inset-0 pointer-events-none z-10"
                    />
                  )}
                </div>
              ) : (
                <VideoPlayer src={activeSrc} />
              )}
            </div>

            {/* Adjustments bottom panel drawer on mobile */}
            {mobileAdjustPanelOpen && (
              <div className="bg-neutral-950 border-t border-neutral-900 p-4 space-y-4 max-h-[350px] overflow-y-auto z-45 animate-slide-up">
                <div className="flex justify-between items-center border-b border-neutral-800 pb-2 mb-2">
                  <span className="text-xs font-bold text-neutral-400 tracking-wider">ADJUSTMENTS</span>
                  <button onClick={() => setMobileAdjustPanelOpen(false)} className="text-xs text-sky-500 font-bold">
                    Done
                  </button>
                </div>
                {/* Sliders list */}
                {Object.keys(adjustments).map((key) => {
                  const val = (activeAdj as any)[key] ?? 0;
                  const isMultiplier = key === "brightness" || key === "contrast" || key === "saturation";
                  const minVal = isMultiplier ? 0.5 : key === "warmth" || key === "highlights" || key === "shadows" ? -50 : key === "exposure" ? -1 : 0;
                  const maxVal = isMultiplier ? 1.5 : key === "warmth" || key === "highlights" || key === "shadows" ? 50 : 1;
                  const stepVal = isMultiplier || key === "exposure" ? 0.05 : 1;

                  return (
                    <div key={key} className="flex flex-col gap-1">
                      <div className="flex justify-between text-xs text-neutral-400 font-bold capitalize">
                        <span>{key}</span>
                        <span>{isMultiplier ? `${Math.round(val * 100)}%` : val}</span>
                      </div>
                      <input
                        type="range"
                        min={minVal}
                        max={maxVal}
                        step={stepVal}
                        value={val}
                        onChange={(e) => updateAdjustment(activeFile, { [key]: parseFloat(e.target.value) })}
                        className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bottom Swipeable Filters Strip & Adjust controls trigger */}
            <div className="bg-neutral-950 border-t border-zinc-900 p-3 flex flex-col gap-3 flex-shrink-0 z-30">
              <div className="flex gap-2 items-center overflow-x-auto py-1 scrollbar-none">
                {filterPresets.map((preset) => (
                  <FilterThumbnail
                    key={preset.name}
                    imageSrc={isVideo ? "/cartly-logo.webp" : activeSrc}
                    filterName={preset.name}
                    isActive={activeAdj.filter === preset.name}
                    onClick={() => updateAdjustment(activeFile, { filter: preset.name })}
                  />
                ))}
              </div>

              <div className="flex justify-between items-center border-t border-neutral-900 pt-2 px-1">
                <span className="text-xs font-bold text-neutral-400">Filters</span>
                <button
                  onClick={() => setMobileAdjustPanelOpen(true)}
                  className="flex items-center gap-1 bg-neutral-900 text-white rounded-full px-3 py-1 text-xs font-bold border border-neutral-800"
                >
                  <Sliders className="size-3.5" /> Adjust
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stage 3: Mobile metadata share */}
        {stage === 3 && (
          <div className="fixed inset-0 bg-neutral-950 flex flex-col justify-between z-50">
            {/* Header */}
            <div className="flex justify-between items-center px-4 py-3 border-b border-zinc-900 bg-neutral-950">
              <button onClick={() => setStage(2)} className="p-2 hover:bg-neutral-900 rounded-full">
                <ArrowLeft className="size-6 text-white" />
              </button>
              <span className="font-bold text-sm">Share parameters</span>
              <LoadingButton
                onClick={handlePublish}
                loading={mutation.isPending || isProcessingAndSubmitting}
                className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold rounded-full px-5 py-1 text-xs"
              >
                Share
              </LoadingButton>
            </div>

            {/* Parameters list scroll */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-none text-white">
              {/* Location Picker trigger */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-neutral-450 uppercase flex items-center gap-1.5">
                  <LucideLocation className="size-4 text-sky-500" /> Location
                </label>
                <button
                  onClick={() => setActivePanel("location")}
                  className="w-full bg-neutral-900 border border-neutral-850 hover:border-neutral-700 text-left rounded-xl p-3 text-xs text-white truncate"
                >
                  {selectedLocation ? selectedLocation.name : "Add location..."}
                </button>
              </div>

              {/* Collaborators selection */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-neutral-450 uppercase flex items-center gap-1.5">
                  <Users className="size-4 text-sky-500" /> Collaborators
                </label>
                <input
                  type="text"
                  placeholder="Search username to collaborate..."
                  value={collabQuery}
                  onChange={(e) => setCollabQuery(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-850 rounded-xl p-3 text-xs text-white focus:outline-none placeholder:text-neutral-600 focus:border-neutral-700"
                />
                {collabUsers.length > 0 && (
                  <div className="bg-neutral-900 border border-neutral-850 rounded-xl shadow-2xl z-40 max-h-32 overflow-y-auto">
                    {collabUsers
                      .filter((u) => !collaborators.includes(u.username))
                      .map((u) => (
                        <div
                          key={u.id}
                          onClick={() => {
                            setCollaborators([...collaborators, u.username]);
                            setCollabQuery("");
                            setCollabUsers([]);
                          }}
                          className="flex items-center gap-2.5 p-2 hover:bg-neutral-850 cursor-pointer text-xs"
                        >
                          <UserAvatar avatarUrl={u.avatarUrl} size={18} />
                          <span className="font-bold">{u.username}</span>
                        </div>
                      ))}
                  </div>
                )}
                {collaborators.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {collaborators.map((name) => (
                      <span
                        key={name}
                        onClick={() => setCollaborators(collaborators.filter((c) => c !== name))}
                        className="bg-neutral-800 hover:bg-destructive text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5 cursor-pointer animate-fade-in"
                      >
                        @{name}
                        <X className="size-3" />
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Tagging section */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-neutral-450 uppercase flex items-center gap-1.5">
                  👤 Tag People
                </span>
                <span className="text-[10px] text-neutral-500 px-1 leading-relaxed">
                  Click on the image stage on the left to add username tag points.
                </span>
              </div>

              {/* Alt Text */}
              <div className="border-t border-neutral-900 pt-3 flex flex-col gap-2">
                <span className="text-xs font-bold text-neutral-450 uppercase">Accessibility alt text</span>
                <textarea
                  placeholder="Write description description for accessibility..."
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-xs text-white focus:outline-none placeholder:text-neutral-600 h-16 resize-none"
                />
              </div>

              {/* Comments & Likes settings */}
              <div className="border-t border-neutral-900 pt-3 flex flex-col gap-3">
                <span className="text-xs font-bold text-neutral-450 uppercase">Advanced Configuration</span>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-300 font-semibold flex items-center gap-2">
                    <MessageSquare className="size-3.5" /> Comments
                  </span>
                  <input
                    type="checkbox"
                    checked={disableComments}
                    onChange={(e) => setDisableComments(e.target.checked)}
                    className="accent-primary rounded size-4 bg-neutral-900 border-neutral-800"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-300 font-semibold flex items-center gap-2">
                    <Heart className="size-3.5" /> Hide Likes
                  </span>
                  <input
                    type="checkbox"
                    checked={hideLikes}
                    onChange={(e) => setHideLikes(e.target.checked)}
                    className="accent-primary rounded size-4 bg-neutral-900 border-neutral-800"
                  />
                </div>
              </div>
            </div>

            {activePanel === "location" && (
              <LocationPickerSheet
                onClose={() => setActivePanel(null)}
                onSelectLocation={(loc) => setSelectedLocation(loc)}
                selectedLocationName={selectedLocation?.name}
                onClearLocation={() => setSelectedLocation(null)}
              />
            )}
          </div>
        )}
      </div>

      {/* DESKTOP COMPOSER VIEW */}
      <div {...rootProps} className="hidden md:flex flex-col bg-card rounded-3xl w-full max-w-[720px] mx-auto overflow-hidden text-card-foreground shadow-2xl border border-border/40 select-none">
        <input {...getInputProps()} />

        {showDraftBanner && (
          <div className="flex items-center justify-between bg-primary/10 border-b border-primary/20 px-6 py-2.5 text-sm">
            <div className="flex items-center gap-2 text-primary font-medium">
              <Sparkles className="size-4" />
              <span>You have an unsaved draft. Resume working on it?</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" className="h-8 text-xs font-semibold" onClick={discardDraft}>
                Discard
              </Button>
              <Button size="sm" className="h-8 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/95" onClick={resumeDraft}>
                Resume Draft
              </Button>
            </div>
          </div>
        )}

        {(isProcessingAndSubmitting || mutation.isPending) && (
          <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4 text-white">
            <Loader2 className="size-12 animate-spin text-primary" />
            <span className="text-lg font-bold tracking-wide">Processing and uploading media assets...</span>
          </div>
        )}
        {/* STAGE 1: COMPOSE VIEW (Dynamic Height Layout) */}
        {stage === 1 && (
          <div className="flex flex-col w-full">
            <div className="flex justify-between items-center px-6 py-4 border-b border-border/40 bg-card">
              <h3 className="font-bold text-lg">Create Post</h3>
              {onClose && (
                <button onClick={onClose} className="p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground">
                  <X className="size-5" />
                </button>
              )}
            </div>

            <div className="p-6 flex flex-col gap-4 max-h-[380px] overflow-y-auto min-h-[140px] bg-card">
              {threads.map((node, idx) => {
                const isActive = activeThreadIndex === idx;
                const bgGrad = selectedBackgroundId && idx === 0 ? systemBackgrounds.find((b) => b.id === selectedBackgroundId) : null;
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
                              removeThreadNode(idx);
                            }}
                            className="text-muted-foreground hover:text-foreground p-1 transition-colors"
                          >
                            <X className="size-4" />
                          </button>
                        )}
                      </div>

                      <div
                        style={{ background: bgGrad?.style || "transparent", color: bgGrad?.text || "inherit" }}
                        className={cn(
                          "w-full rounded-2xl transition-all relative",
                          bgGrad ? "p-6 text-center flex items-center justify-center min-h-[140px]" : "p-0"
                        )}
                      >
                        <textarea
                          value={node.text}
                          onChange={(e) => handleTextareaChange(idx, e.target.value)}
                          onInput={handleTextareaInput}
                          placeholder={idx === 0 ? "What's happening?" : "Add another post..."}
                          className={cn(
                            "w-full bg-transparent border-none outline-none resize-none text-foreground focus:ring-0 focus-visible:ring-0 p-0 font-medium placeholder:text-muted-foreground",
                            bgGrad ? "text-xl text-center font-bold placeholder:text-white/60 text-white" : "text-base min-h-[60px]"
                          )}
                          rows={2}
                        />

                        {isActive && autocomplete && (autocomplete.users.length > 0 || autocomplete.tags.length > 0) && (
                          <div className="absolute left-0 top-full mt-2 w-64 bg-neutral-900 border border-neutral-850 rounded-xl shadow-2xl z-40 max-h-48 overflow-y-auto">
                            {autocomplete.trigger === "@" &&
                              autocomplete.users.map((u) => (
                                <button
                                  key={u.id}
                                  onClick={() => selectAutocomplete(u.username)}
                                  className="flex items-center gap-3 w-full px-4 py-2 hover:bg-neutral-800 text-left text-sm text-white"
                                >
                                  <UserAvatar avatarUrl={u.avatarUrl} size={24} />
                                  <div className="flex flex-col">
                                    <span className="font-bold">{u.username}</span>
                                    <span className="text-xs text-neutral-450">{u.displayName}</span>
                                  </div>
                                </button>
                              ))}
                            {autocomplete.trigger === "#" &&
                              autocomplete.tags.map((tag) => (
                                <button
                                  key={tag}
                                  onClick={() => selectAutocomplete(tag)}
                                  className="w-full px-4 py-2 hover:bg-neutral-800 text-left text-sm text-white font-semibold"
                                >
                                  #{tag}
                                </button>
                              ))}
                          </div>
                        )}
                      </div>

                      {node.poll && (
                        <div className="bg-muted/30 border border-border/40 rounded-xl p-3 flex flex-col gap-2 relative max-w-sm">
                          <button
                            onClick={(e) => { e.stopPropagation(); removePollFromNode(idx); }}
                            className="absolute right-2 top-2 text-muted-foreground hover:text-foreground p-1"
                          >
                            <X className="size-3.5" />
                          </button>
                          <div className="flex flex-col gap-1.5 mt-2">
                            {node.poll.options.map((option, oIdx) => (
                              <input
                                key={oIdx}
                                type="text"
                                placeholder={`Choice ${oIdx + 1}`}
                                maxLength={25}
                                value={option}
                                onChange={(e) => {
                                  const updated = [...threads];
                                  if (updated[idx].poll) {
                                    updated[idx].poll.options[oIdx] = e.target.value;
                                    setThreads(updated);
                                  }
                                }}
                                className="w-full bg-background border border-border rounded-lg py-1.5 px-3 pr-12 text-xs text-foreground focus:outline-none placeholder:text-muted-foreground/60"
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {node.assets.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto py-1">
                          {node.assets.map((asset, aIdx) => (
                            <div key={aIdx} className="relative size-20 rounded-xl overflow-hidden shrink-0 border border-border bg-muted group">
                              {asset.file.type.startsWith("video") ? (
                                <video src={asset.previewUrl} className="w-full h-full object-cover" muted />
                              ) : (
                                <img src={asset.previewUrl} className="w-full h-full object-cover" alt="preview" />
                              )}
                              <div className="absolute inset-x-0 bottom-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center p-1 transition-opacity z-10">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveThreadIndex(idx);
                                    setActiveMediaIndex(aIdx);
                                    setStage(2);
                                  }}
                                  className="text-[9px] font-bold text-white bg-sky-500 px-2 py-0.5 rounded mx-auto"
                                >
                                  Edit
                                </button>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const updated = [...threads];
                                  updated[idx].assets = updated[idx].assets.filter((_, attIdx) => attIdx !== aIdx);
                                  setThreads(updated);
                                  if (isActive) {
                                    setAttachments(updated[idx].assets);
                                  }
                                }}
                                className="absolute right-1 top-1 bg-black/80 text-white rounded-full p-0.5 z-20"
                              >
                                <X className="size-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {activeThreadIndex === threads.length - 1 && (
                <div
                  onClick={addNewThreadNode}
                  className="flex items-center gap-4 pl-14 py-1 text-primary hover:text-primary/80 text-sm font-semibold cursor-pointer select-none transition-colors"
                >
                  <span>Add another post</span>
                </div>
              )}
            </div>

            {activePanel === "gif" && (
              <div className="px-6 pb-4">
                <GifPicker onSelect={addGiphyAttachment} onClose={() => setActivePanel(null)} />
              </div>
            )}

            {activePanel === "emoji" && (
              <div className="px-6 pb-4 flex justify-start">
                <EmojiPickerPanel
                  onEmojiSelect={(em) => {
                    const text = threads[activeThreadIndex]?.text || "";
                    updateThreadText(activeThreadIndex, text + em);
                    setActivePanel(null);
                  }}
                />
              </div>
            )}

            {activePanel === "location" && (
              <LocationPickerSheet
                onClose={() => setActivePanel(null)}
                onSelectLocation={(loc) => setSelectedLocation(loc)}
                selectedLocationName={selectedLocation?.name}
                onClearLocation={() => setSelectedLocation(null)}
              />
            )}

            {activePanel === "background" && (
              <div className="px-6 pb-4 flex flex-col gap-2">
                <span className="text-[10px] font-bold text-neutral-455 uppercase tracking-widest">Post Background</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedBackgroundId(null)}
                    className={cn("size-7 rounded-full border-2 bg-neutral-900", !selectedBackgroundId ? "border-sky-500" : "border-transparent")}
                  />
                  {systemBackgrounds.map((bg) => (
                    <button
                      key={bg.id}
                      onClick={() => setSelectedBackgroundId(bg.id)}
                      style={{ background: bg.style }}
                      className={cn("size-7 rounded-full border-2", selectedBackgroundId === bg.id ? "border-sky-500" : "border-transparent")}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-border/40 p-4 bg-card flex justify-between items-center">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 text-primary hover:bg-accent rounded-full transition-colors flex items-center justify-center"
                  style={{ minWidth: "48px", minHeight: "48px" }}
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
                  onClick={() => setActivePanel(activePanel === "gif" ? null : "gif")}
                  className={cn(
                    "p-3 rounded-full flex items-center justify-center transition-colors",
                    activePanel === "gif" ? "text-sky-400 bg-accent" : "text-primary hover:bg-accent"
                  )}
                  style={{ minWidth: "48px", minHeight: "48px" }}
                >
                  <LucideGif size={24} />
                </button>
                <button
                  onClick={() => togglePollForNode(activeThreadIndex)}
                  className={cn(
                    "p-3 rounded-full flex items-center justify-center transition-colors",
                    threads[activeThreadIndex]?.poll ? "text-sky-400 bg-accent" : "text-primary hover:bg-accent"
                  )}
                  style={{ minWidth: "48px", minHeight: "48px" }}
                >
                  <LucidePoll size={24} />
                </button>
                <button
                  onClick={() => setActivePanel(activePanel === "location" ? null : "location")}
                  className={cn(
                    "p-3 rounded-full flex items-center justify-center transition-colors",
                    activePanel === "location" ? "text-sky-400 bg-accent" : "text-primary hover:bg-accent"
                  )}
                  style={{ minWidth: "48px", minHeight: "48px" }}
                >
                  <LucideLocation size={24} />
                </button>
                <button
                  onClick={() => setActivePanel(activePanel === "background" ? null : "background")}
                  className={cn(
                    "p-3 rounded-full flex items-center justify-center transition-colors",
                    activePanel === "background" ? "text-sky-400 bg-accent" : "text-primary hover:bg-accent"
                  )}
                  style={{ minWidth: "48px", minHeight: "48px" }}
                >
                  <ImageIcon size={24} />
                </button>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <svg className="size-6 transform -rotate-90">
                    <circle cx="12" cy="12" r="8" className="stroke-zinc-800 fill-none" strokeWidth="1.5" />
                    <circle
                      cx="12"
                      cy="12"
                      r="8"
                      className={cn(
                        "fill-none transition-all duration-300",
                        charCount > characterLimit ? "stroke-destructive" : "stroke-primary"
                      )}
                      strokeWidth="1.5"
                      strokeDasharray={2 * Math.PI * 8}
                      strokeDashoffset={2 * Math.PI * 8 * (1 - percentage / 100)}
                    />
                  </svg>
                </div>
                <LoadingButton
                  onClick={handlePublish}
                  loading={mutation.isPending || isProcessingAndSubmitting}
                  disabled={!threads[0]?.text.trim() || isUploading}
                  className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 py-2"
                >
                  {threads.length > 1 ? "Post all" : "Post"}
                </LoadingButton>
              </div>
            </div>
          </div>
        )}

        {/* STAGE 2: FILTER & ADJUSTMENTS EDITOR VIEW (Instagram split-layout resizable web design) */}
        {stage === 2 && (
          <div className="flex flex-col w-full h-[600px] bg-black">
            <div className="flex justify-between items-center px-6 py-4 border-b border-neutral-900 bg-neutral-950 flex-shrink-0 text-white">
              <div className="flex items-center gap-2">
                <button onClick={() => setStage(1)} className="p-1 rounded-full hover:bg-neutral-900">
                  <ArrowLeft className="size-5" />
                </button>
                <h3 className="font-bold text-base">Edit Media</h3>
              </div>
              <Button onClick={() => setStage(3)} className="bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-full px-5 py-1 text-xs">
                Next
              </Button>
            </div>

            <div className="flex flex-1 min-h-0 relative">
              <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
                {activeFile && !attachments[activeMediaIndex].file.type.startsWith("video") ? (
                  <div className="absolute inset-0">
                    <Cropper
                      image={activeSrc}
                      crop={activeAdj.crop}
                      zoom={activeAdj.zoom}
                      rotation={activeAdj.rotation}
                      aspect={activeAdj.aspect}
                      onCropChange={(c) => updateAdjustment(activeFile, { crop: c })}
                      onZoomChange={(z) => updateAdjustment(activeFile, { zoom: z })}
                      onCropComplete={(_, px) => updateAdjustment(activeFile, { croppedAreaPixels: px })}
                      style={{
                        containerStyle: { background: "#000" },
                        mediaStyle: { filter: getFilterString(activeAdj.filter, activeAdj) }
                      }}
                    />
                    {activeAdj.vignette > 0 && (
                      <div
                        style={{
                          background: `radial-gradient(circle, transparent 40%, rgba(0,0,0,${activeAdj.vignette * 0.95}) 100%)`,
                        }}
                        className="absolute inset-0 pointer-events-none z-10"
                      />
                    )}
                  </div>
                ) : (
                  <VideoPlayer src={activeSrc} />
                )}

                {activeFile && !attachments[activeMediaIndex].file.type.startsWith("video") && (
                  <div className="absolute bottom-4 left-4 bg-neutral-900/90 rounded-xl p-1.5 z-20 flex gap-1 border border-neutral-800">
                    {[
                      { label: "1:1", ratio: 1 },
                      { label: "4:5", ratio: 4 / 5 },
                      { label: "16:9", ratio: 16 / 9 },
                      { label: "9:16", ratio: 9 / 16 }
                    ].map((item) => (
                      <button
                        key={item.label}
                        onClick={() => updateAdjustment(activeFile, { aspect: item.ratio })}
                        className={cn(
                          "px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors",
                          activeAdj.aspect === item.ratio ? "bg-primary text-primary-foreground" : "text-neutral-300 hover:bg-neutral-800"
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Drag Resizer Line Handle */}
              <div
                onMouseDown={handleSidebarResize}
                className="w-1.5 hover:w-2 active:w-2 cursor-col-resize bg-neutral-900 hover:bg-sky-500 active:bg-sky-500 transition-all self-stretch z-30 flex-shrink-0"
              />

              {/* Dynamic sidebar width adjustment */}
              <div
                style={{ width: `${sidebarWidth}px` }}
                className="border-l border-neutral-900 bg-neutral-950 flex flex-col text-white flex-shrink-0"
              >
                <div className="flex border-b border-neutral-900 p-2 gap-2">
                  <button
                    onClick={() => setEditTab("filters")}
                    className={cn(
                      "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all",
                      editTab === "filters" ? "bg-neutral-900 text-white shadow" : "text-neutral-450 hover:text-white"
                    )}
                  >
                    Filters
                  </button>
                  <button
                    onClick={() => setEditTab("adjustments")}
                    className={cn(
                      "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all",
                      editTab === "adjustments" ? "bg-neutral-900 text-white shadow" : "text-neutral-450 hover:text-white"
                    )}
                  >
                    Adjustments
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-none">
                  {editTab === "filters" && activeFile && (
                    <div className="grid grid-cols-2 gap-2">
                      {filterPresets.map((preset) => (
                        <FilterThumbnail
                          key={preset.name}
                          imageSrc={isVideo ? "/cartly-logo.webp" : activeSrc}
                          filterName={preset.name}
                          isActive={activeAdj.filter === preset.name}
                          onClick={() => updateAdjustment(activeFile, { filter: preset.name })}
                        />
                      ))}
                    </div>
                  )}

                  {editTab === "adjustments" && activeFile && (
                    <div className="space-y-4">
                      {/* Exposure */}
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between text-xs font-semibold text-neutral-400">
                          <span>Exposure</span>
                          <span>{activeAdj.exposure > 0 ? `+${activeAdj.exposure}` : activeAdj.exposure}</span>
                        </div>
                        <input
                          type="range"
                          min="-1"
                          max="1"
                          step="0.05"
                          value={activeAdj.exposure}
                          onChange={(e) => updateAdjustment(activeFile, { exposure: parseFloat(e.target.value) })}
                          className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                      </div>

                      {/* Brightness */}
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between text-xs font-semibold text-neutral-400">
                          <span>Brightness</span>
                          <span>{Math.round(activeAdj.brightness * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="1.5"
                          step="0.05"
                          value={activeAdj.brightness}
                          onChange={(e) => updateAdjustment(activeFile, { brightness: parseFloat(e.target.value) })}
                          className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                      </div>

                      {/* Contrast */}
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between text-xs font-semibold text-neutral-400">
                          <span>Contrast</span>
                          <span>{Math.round(activeAdj.contrast * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="1.5"
                          step="0.05"
                          value={activeAdj.contrast}
                          onChange={(e) => updateAdjustment(activeFile, { contrast: parseFloat(e.target.value) })}
                          className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                      </div>

                      {/* Saturation */}
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between text-xs font-semibold text-neutral-400">
                          <span>Saturation</span>
                          <span>{Math.round(activeAdj.saturation * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="2"
                          step="0.05"
                          value={activeAdj.saturation}
                          onChange={(e) => updateAdjustment(activeFile, { saturation: parseFloat(e.target.value) })}
                          className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                      </div>

                      {/* Warmth */}
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between text-xs font-semibold text-neutral-400">
                          <span>Warmth</span>
                          <span>{activeAdj.warmth > 0 ? `+${activeAdj.warmth}` : activeAdj.warmth}</span>
                        </div>
                        <input
                          type="range"
                          min="-50"
                          max="50"
                          step="1"
                          value={activeAdj.warmth}
                          onChange={(e) => updateAdjustment(activeFile, { warmth: parseInt(e.target.value) })}
                          className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                      </div>

                      {/* Vignette */}
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between text-xs font-semibold text-neutral-400">
                          <span>Vignette</span>
                          <span>{Math.round(activeAdj.vignette * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={activeAdj.vignette}
                          onChange={(e) => updateAdjustment(activeFile, { vignette: parseFloat(e.target.value) })}
                          className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                      </div>

                      {/* Sharpen */}
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between text-xs font-semibold text-neutral-400">
                          <span>Sharpen</span>
                          <span>{Math.round(activeAdj.sharpen * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={activeAdj.sharpen}
                          onChange={(e) => updateAdjustment(activeFile, { sharpen: parseFloat(e.target.value) })}
                          className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-neutral-900 p-3 bg-neutral-950 flex items-center gap-2 overflow-x-auto scrollbar-none flex-shrink-0">
                  {attachments.map((a, idx) => (
                    <div
                      key={idx}
                      onClick={() => setActiveMediaIndex(idx)}
                      className={cn(
                        "size-10 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer border-2 bg-neutral-900",
                        activeMediaIndex === idx ? "border-sky-500" : "border-transparent"
                      )}
                    >
                      <Image src={a.previewUrl!} alt="mini-preview" width={40} height={40} className="object-cover h-full w-full" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STAGE 3: TAGGING, METADATA & CONFIGURATION VIEW */}
        {stage === 3 && (
          <div className="flex flex-col md:flex-row h-[550px] w-full bg-neutral-950 text-white">
            <div className="flex-1 relative h-[300px] md:h-full bg-neutral-950 flex items-center justify-center overflow-hidden border-b md:border-b-0 md:border-r border-neutral-900">
              {activeFile && (
                <div onClick={handleTagClick} className="relative max-h-full max-w-full aspect-square md:aspect-auto h-full w-full flex items-center justify-center cursor-crosshair">
                  {!attachments[activeMediaIndex].file.type.startsWith("video") ? (
                    <img
                      src={activeSrc}
                      alt="final preview"
                      style={{ filter: getFilterString(activeAdj.filter, activeAdj) }}
                      className="max-h-full max-w-full object-contain pointer-events-none"
                    />
                  ) : (
                    <video src={activeSrc} className="max-h-full max-w-full object-contain pointer-events-none" muted />
                  )}

                  {activeAdj.vignette > 0 && (
                    <div
                      style={{
                        background: `radial-gradient(circle, transparent 40%, rgba(0,0,0,${activeAdj.vignette * 0.95}) 100%)`,
                      }}
                      className="absolute inset-0 pointer-events-none z-10"
                    />
                  )}

                  {activeTags.map((tag, idx) => (
                    <div
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeTag(activeFile, idx);
                      }}
                      style={{ left: `${tag.x}%`, top: `${tag.y}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 bg-black/85 border border-neutral-800 text-white px-2 py-0.5 rounded-full text-[10px] font-bold z-30 flex items-center gap-1.5 cursor-pointer shadow-lg"
                    >
                      <span>@{tag.username}</span>
                      <X className="size-3" />
                    </div>
                  ))}

                  {activeTagCoord && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{ left: `${activeTagCoord.x}%`, top: `${activeTagCoord.y}%` }}
                      className="absolute -translate-x-1/2 mt-3 bg-neutral-900 border border-neutral-850 p-2 rounded-xl shadow-2xl z-40 w-44 flex flex-col gap-1.5"
                    >
                      <input
                        type="text"
                        placeholder="Tag username..."
                        value={tagQuery}
                        onChange={(e) => setTagQuery(e.target.value)}
                        className="bg-neutral-950 border border-neutral-800 rounded-lg p-1.5 text-xs text-white focus:outline-none placeholder:text-neutral-600 w-full"
                      />
                      <div className="max-h-24 overflow-y-auto flex flex-col gap-1">
                        {tagSearchUsers.map((u) => (
                          <div
                            key={u.id}
                            onClick={() => addTag(u.username)}
                            className="flex items-center gap-2 p-1.5 hover:bg-neutral-850 rounded-lg cursor-pointer text-xs"
                          >
                            <UserAvatar avatarUrl={u.avatarUrl} size={18} />
                            <span className="font-bold truncate">{u.username}</span>
                          </div>
                        ))}
                      </div>
                      <button onClick={() => setActiveTagCoord(null)} className="text-[9px] text-neutral-500 hover:text-white font-bold self-end">
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}
              <button onClick={() => setStage(2)} className="absolute top-4 left-4 bg-black/60 hover:bg-black/90 text-white p-2 rounded-full z-25 transition-all">
                <ArrowLeft className="size-5" />
              </button>
            </div>

            <div className="w-full md:w-[320px] h-[250px] md:h-full bg-neutral-950 flex flex-col border-t md:border-t-0 border-neutral-900 text-white flex-shrink-0">
              <div className="flex-grow overflow-y-auto p-4 space-y-4 scrollbar-none">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-neutral-400 flex items-center gap-1.5">
                    <LucideLocation className="size-4 text-sky-500" />
                    <span>Location</span>
                  </label>
                  <button
                    onClick={() => setActivePanel("location")}
                    className="w-full bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-left rounded-xl p-2.5 text-xs text-white truncate"
                  >
                    {selectedLocation ? selectedLocation.name : "Add location..."}
                  </button>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-neutral-400 flex items-center gap-1.5">
                    <Users className="size-4 text-sky-500" />
                    <span>Collaborators</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search users to collaborate..."
                      value={collabQuery}
                      onChange={(e) => setCollabQuery(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-xs text-white focus:outline-none placeholder:text-neutral-600 focus:border-neutral-700"
                    />
                    {collabUsers.length > 0 && (
                      <div className="absolute left-0 top-full mt-1.5 w-full bg-neutral-900 border border-neutral-850 rounded-xl shadow-2xl z-40 max-h-32 overflow-y-auto">
                        {collabUsers
                          .filter((u) => !collaborators.includes(u.username))
                          .map((u) => (
                            <div
                              key={u.id}
                              onClick={() => {
                                setCollaborators([...collaborators, u.username]);
                                setCollabQuery("");
                                setCollabUsers([]);
                              }}
                              className="flex items-center gap-2.5 p-2 hover:bg-neutral-850 cursor-pointer text-xs"
                            >
                              <UserAvatar avatarUrl={u.avatarUrl} size={18} />
                              <span className="font-bold">{u.username}</span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                  {collaborators.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {collaborators.map((name) => (
                        <span
                          key={name}
                          onClick={() => setCollaborators(collaborators.filter((c) => c !== name))}
                          className="bg-neutral-800 hover:bg-destructive text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5 cursor-pointer animate-fade-in"
                        >
                          @{name}
                          <X className="size-3" />
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-neutral-400 flex items-center gap-1.5">
                    <Globe className="size-4 text-sky-500" />
                    <span>Audience</span>
                  </label>
                  <select
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    className="bg-neutral-900 border border-neutral-800 rounded-xl p-2 text-xs text-white focus:outline-none"
                  >
                    <option value="PUBLIC">🌎 Public (Anyone)</option>
                    <option value="FOLLOWERS">👥 Followers only</option>
                    <option value="CLOSE_FRIENDS">⭐ Close Friends</option>
                    <option value="PRIVATE">🔒 Private</option>
                  </select>
                </div>

                <div className="border-t border-neutral-900 pt-3 flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-neutral-455 uppercase tracking-widest">Accessibility alt text</span>
                  <textarea
                    placeholder="Write alt text..."
                    value={altText}
                    onChange={(e) => setAltText(e.target.value)}
                    className="bg-neutral-900 border border-neutral-800 rounded-xl p-2 text-xs text-white focus:outline-none placeholder:text-neutral-600 h-14 resize-none"
                  />
                </div>

                <div className="border-t border-neutral-900 pt-3 flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-neutral-455 uppercase tracking-widest">Advanced Settings</span>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-300 font-semibold flex items-center gap-2">
                      <MessageSquare className="size-3.5" /> Comments
                    </span>
                    <input
                      type="checkbox"
                      checked={disableComments}
                      onChange={(e) => setDisableComments(e.target.checked)}
                      className="accent-primary rounded size-4 bg-neutral-900 border-neutral-800"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-300 font-semibold flex items-center gap-2">
                      <Heart className="size-3.5" /> Hide Likes
                    </span>
                    <input
                      type="checkbox"
                      checked={hideLikes}
                      onChange={(e) => setHideLikes(e.target.checked)}
                      className="accent-primary rounded size-4 bg-neutral-900 border-neutral-800"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-neutral-900 p-4 bg-neutral-950 flex items-center justify-between flex-shrink-0">
                <div className="flex gap-1.5 overflow-x-auto max-w-[120px] scrollbar-none">
                  {attachments.map((a, idx) => (
                    <div
                      key={idx}
                      onClick={() => setActiveMediaIndex(idx)}
                      className={cn(
                        "size-8 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer border-2 bg-neutral-900",
                        activeMediaIndex === idx ? "border-sky-500" : "border-transparent"
                      )}
                    >
                      <Image src={a.previewUrl!} alt="mini-preview" width={32} height={32} className="object-cover h-full w-full" />
                    </div>
                  ))}
                </div>

                <LoadingButton
                  onClick={handlePublish}
                  loading={mutation.isPending || isProcessingAndSubmitting}
                  disabled={isUploading}
                  className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold px-6 py-2 rounded-full"
                >
                  Share
                </LoadingButton>
              </div>
            </div>
          </div>
        )}
      </div>

      {activePanel === "location" && (
        <LocationPickerSheet
          onClose={() => setActivePanel(null)}
          onSelectLocation={(loc) => setSelectedLocation(loc)}
          selectedLocationName={selectedLocation?.name}
          onClearLocation={() => setSelectedLocation(null)}
        />
      )}
    </>
  );
}
