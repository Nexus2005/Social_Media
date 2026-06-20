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
  ImageIcon,
  Loader2,
  X,
  Sparkles,
  Smile,
  Plus,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  MapPin,
  Users,
  Eye,
  MessageSquare,
  Globe,
  Lock,
  Heart,
  ChevronDown,
  Info
} from "lucide-react";
import Image from "next/image";
import { ClipboardEvent, useRef, useState, useEffect } from "react";
import { useSubmitPostMutation } from "./mutations";
import "./styles.css";
import useMediaUpload, { Attachment } from "./useMediaUpload";
import VideoPlayer from "@/components/VideoPlayer";
import Cropper from "react-easy-crop";
import EmojiPickerPanel from "@/components/stories/EmojiPickerPanel";
import GifPicker from "@/components/stories/GifPicker";
import { getFilterString, getProcessedImg } from "./imageProcessing";

// Common hashtags for autocomplete suggestions
const commonHashtags = [
  "startup", "travel", "technology", "photography", "food", 
  "fashion", "gaming", "nature", "fitness", "AI", "vibes", 
  "productivity", "design", "coding", "business", "marketing"
];

// Presets info for Aden, Clarendon, Crema, Gingham, Juno, Lark, Ludwig, Moon, Slumber
const filterPresets = [
  { name: "Normal", filter: "none" },
  { name: "Clarendon", filter: "contrast(1.2) saturate(1.35)" },
  { name: "Aden", filter: "sepia(0.2) saturate(1.4) contrast(0.9) hue-rotate(-20deg)" },
  { name: "Crema", filter: "sepia(0.5) contrast(1.1) saturate(0.9) brightness(1.1)" },
  { name: "Gingham", filter: "brightness(1.05) contrast(0.9) saturate(0.9) hue-rotate(-10deg)" },
  { name: "Juno", filter: "saturate(1.2) contrast(1.1) sepia(0.2) hue-rotate(-15deg)" },
  { name: "Lark", filter: "brightness(1.08) contrast(0.95) saturate(1.15)" },
  { name: "Ludwig", filter: "brightness(1.05) saturate(1.1) contrast(0.95)" },
  { name: "Moon", filter: "grayscale(1) contrast(1.1) brightness(1.1)" },
  { name: "Slumber", filter: "sepia(0.35) contrast(1.1) saturate(0.7) brightness(1.05)" }
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
  fade: number;
  saturation: number;
  temperature: number;
  vignette: number;
}

const defaultAdjustmentState = (): ImageAdjustmentState => ({
  crop: { x: 0, y: 0 },
  zoom: 1,
  rotation: 0,
  aspect: 1, // 1:1 default square
  croppedAreaPixels: null,
  filter: "Normal",
  brightness: 1,
  contrast: 1,
  fade: 0,
  saturation: 1,
  temperature: 0,
  vignette: 0,
});

export default function PostEditor() {
  const { user } = useSession();
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

  // Poll state
  const [hasPoll, setHasPoll] = useState(false);
  const [pollChoices, setPollChoices] = useState<string[]>(["", ""]);
  const [pollDays, setPollDays] = useState(1);
  const [pollHours, setPollHours] = useState(0);
  const [pollMinutes, setPollMinutes] = useState(0);

  // GIF Picker overlay
  const [showGifPicker, setShowGifPicker] = useState(false);

  // Emoji Picker popover
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Image Edit States mapped by filename
  const [mediaAdjustments, setMediaAdjustments] = useState<Record<string, ImageAdjustmentState>>({});
  const [editTab, setEditTab] = useState<"filters" | "adjustments">("filters");

  // Metadata/Share parameters
  const [location, setLocation] = useState("");
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
  const [showAiCaptionPanel, setShowAiCaptionPanel] = useState(false);

  // Autocomplete suggestions popup
  const [autocomplete, setAutocomplete] = useState<{
    trigger: "@" | "#";
    query: string;
    users: any[];
    tags: string[];
    index: number;
  } | null>(null);

  // Submit Processing State
  const [isProcessingAndSubmitting, setIsProcessingAndSubmitting] = useState(false);

  // Draft banner state
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
      // Check for autocomplete triggers
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
          // Hashtag local matches
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

  // 1. DRAFTS LOGIC: Auto-save, restore, and clear
  useEffect(() => {
    // Check if draft exists on mount
    const draft = localStorage.getItem("cartly_composer_draft");
    if (draft) {
      setShowDraftBanner(true);
    }
  }, []);

  // Auto-save draft on data edits
  useEffect(() => {
    if (input.trim() || hasPoll || attachments.length > 0 || location || disableComments || hideLikes) {
      const draftObj = {
        input,
        hasPoll,
        pollChoices,
        pollDays,
        pollHours,
        pollMinutes,
        location,
        altText,
        audience,
        disableComments,
        hideLikes,
        collaborators,
      };
      localStorage.setItem("cartly_composer_draft", JSON.stringify(draftObj));
    }
  }, [input, hasPoll, pollChoices, pollDays, pollHours, pollMinutes, location, altText, audience, disableComments, hideLikes, collaborators, attachments]);

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
        setLocation(draft.location || "");
        setAltText(draft.altText || "");
        setAudience(draft.audience || "PUBLIC");
        setDisableComments(draft.disableComments || false);
        setHideLikes(draft.hideLikes || false);
        setCollaborators(draft.collaborators || []);
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

  // Autocomplete insert handler
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

  // Giphy download & upload helper
  const addGiphyAttachment = async (giphyUrl: string) => {
    try {
      setShowGifPicker(false);
      const res = await fetch(giphyUrl);
      const blob = await res.blob();
      const file = new File([blob], `giphy_${Date.now()}.gif`, { type: "image/gif" });
      startUpload([file]);
    } catch (e) {
      console.error("Giphy attach failed", e);
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

  // Get adjustments state for target attachment
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

  // Search user profiles for tagging
  useEffect(() => {
    if (!tagQuery.trim()) {
      setTagSearchUsers([]);
      return;
    }
    const delay = setTimeout(() => {
      fetch(`/api/search/autocomplete?q=${tagQuery}`)
        .then((res) => res.json())
        .then((data) => setTagSearchUsers(data.users || []))
        .catch(console.error);
    }, 300);
    return () => clearTimeout(delay);
  }, [tagQuery]);

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

  // Main Submit handler (applies crops/filters client-side & uploads)
  const handlePublish = async () => {
    try {
      setIsProcessingAndSubmitting(true);
      const finalMediaIds: string[] = [];

      // Process and upload images with adjustments in parallel
      const uploadPromises = attachments.map(async (a) => {
        const fileAdj = mediaAdjustments[a.file.name];
        
        // If it's an image and has adjustments (or custom crop/filter applied)
        if (a.file.type.startsWith("image") && fileAdj && fileAdj.croppedAreaPixels) {
          const originalSrc = URL.createObjectURL(a.file);
          const processedBlob = await getProcessedImg(
            originalSrc,
            fileAdj.croppedAreaPixels,
            fileAdj.rotation,
            fileAdj.filter,
            {
              brightness: fileAdj.brightness,
              contrast: fileAdj.contrast,
              fade: fileAdj.fade,
              saturation: fileAdj.saturation,
              temperature: fileAdj.temperature,
              vignette: fileAdj.vignette,
            }
          );
          URL.revokeObjectURL(originalSrc);

          const finalFile = new File([processedBlob], a.file.name, { type: "image/jpeg" });
          
          // Direct POST to /api/upload
          const formData = new FormData();
          formData.append("endpoint", "attachment");
          formData.append("files", finalFile);
          
          const meta = [{ name: finalFile.name, width: fileAdj.croppedAreaPixels.width, height: fileAdj.croppedAreaPixels.height }];
          formData.append("metadata", JSON.stringify(meta));

          const res = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) {
            throw new Error(`Failed to upload edited media ${finalFile.name}`);
          }

          const uploadResult = await res.json();
          return uploadResult[0]?.serverData?.mediaId as string;
        }

        // Return the existing media ID of the raw file
        return a.mediaId || "";
      });

      const processedMediaIds = await Promise.all(uploadPromises);
      processedMediaIds.forEach((id) => {
        if (id) finalMediaIds.push(id);
      });

      // Map tags into list grouped by attachment index
      const tagPayload: any[] = [];
      attachments.forEach((a, idx) => {
        const fileTags = mediaTags[a.file.name] || [];
        fileTags.forEach((t) => {
          tagPayload.push({
            mediaIndex: idx,
            username: t.username,
            x: t.x,
            y: t.y,
          });
        });
      });

      // Submit Mutation
      mutation.mutate(
        {
          content: input,
          mediaIds: finalMediaIds,
          location: location || null,
          disableComments,
          hideLikes,
          altText: altText || null,
          audience,
          tags: tagPayload.length > 0 ? tagPayload : null,
          collaborators: collaborators.length > 0 ? collaborators : null,
          poll: hasPoll
            ? {
                options: pollChoices.filter((c) => c.trim() !== ""),
                duration: {
                  days: pollDays,
                  hours: pollHours,
                  minutes: pollMinutes,
                },
              }
            : null,
        },
        {
          onSuccess: () => {
            // Reset and Discard Draft
            editor?.commands.clearContent();
            resetMediaUploads();
            discardDraft();
            setHasPoll(false);
            setPollChoices(["", ""]);
            setStage(1);
          },
        }
      );
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessingAndSubmitting(false);
    }
  };

  const charCount = input.length;
  const characterLimit = 5000;
  const percentage = Math.min((charCount / characterLimit) * 100, 100);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // active adjustment values
  const activeFile = attachments[activeMediaIndex]?.file.name;
  const activeAdj = activeFile ? getAdjustment(activeFile) : defaultAdjustmentState();
  const activeTags = activeFile ? mediaTags[activeFile] || [] : [];
  const activeSrc = activeFile ? URL.createObjectURL(attachments[activeMediaIndex].file) : "";

  useEffect(() => {
    return () => {
      if (activeSrc) URL.revokeObjectURL(activeSrc);
    };
  }, [activeSrc]);

  return (
    <div {...rootProps} className="relative flex flex-col bg-card rounded-2xl w-full overflow-hidden text-card-foreground select-none">
      <input {...getInputProps()} />

      {/* DRAFT NOTIFICATION BANNER */}
      {showDraftBanner && (
        <div className="flex items-center justify-between bg-primary/10 border-b border-primary/20 px-6 py-2.5 text-sm">
          <div className="flex items-center gap-2 text-primary font-medium">
            <Info className="size-4" />
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

      {/* LOADING OVERLAY */}
      {(isProcessingAndSubmitting || mutation.isPending) && (
        <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4 text-white">
          <Loader2 className="size-12 animate-spin text-primary" />
          <span className="text-lg font-bold tracking-wide">Processing and uploading media assets...</span>
        </div>
      )}

      {/* STAGE 1: COMPOSE VIEW */}
      {stage === 1 && (
        <div className="flex flex-col p-5 gap-5 min-h-[450px]">
          {/* User Row + Textarea */}
          <div className="flex gap-4 items-start flex-grow">
            <UserAvatar avatarUrl={user.avatarUrl} className="hidden sm:inline-block size-10" />
            <div className="flex-grow relative">
              <EditorContent
                editor={editor}
                className="w-full min-h-[140px] max-h-[250px] overflow-y-auto outline-none border-0 text-lg bg-transparent border-transparent focus:ring-0 focus:border-transparent placeholder:text-muted-foreground"
              />

              {/* AUTOCOMPLETE FLOATING OVERLAY */}
              {autocomplete && (autocomplete.users.length > 0 || autocomplete.tags.length > 0) && (
                <div className="absolute left-0 top-full mt-2 w-64 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl z-40 max-h-48 overflow-y-auto">
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
                          <span className="text-xs text-neutral-400">{u.displayName}</span>
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
          </div>

          {/* DOCK CAROUSEL PREVIEW ROW */}
          {attachments.length > 0 && (
            <div className="flex gap-3 overflow-x-auto py-2 border-t border-border/20">
              {attachments.map((att, idx) => {
                const src = URL.createObjectURL(att.file);
                const isVideo = att.file.type.startsWith("video");
                const adj = getAdjustment(att.file.name);
                const filterStr = getFilterString(adj.filter, adj);

                return (
                  <div key={idx} className="relative size-20 rounded-xl overflow-hidden flex-shrink-0 group bg-neutral-950 border border-neutral-800">
                    {isVideo ? (
                      <video src={src} className="w-full h-full object-cover" muted />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={src}
                        alt="attachment"
                        style={{ filter: filterStr }}
                        className="w-full h-full object-cover"
                      />
                    )}

                    {/* Left/Right Reordering Controls */}
                    <div className="absolute inset-x-0 bottom-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-between p-0.5 transition-opacity">
                      <button
                        onClick={() => moveAttachment(idx, "left")}
                        disabled={idx === 0}
                        className="disabled:opacity-30 text-white"
                      >
                        <ArrowLeft className="size-4" />
                      </button>
                      <button
                        onClick={() => {
                          setActiveMediaIndex(idx);
                          setStage(2);
                        }}
                        className="text-white text-[10px] font-bold px-1 hover:text-primary transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => moveAttachment(idx, "right")}
                        disabled={idx === attachments.length - 1}
                        className="disabled:opacity-30 text-white"
                      >
                        <ArrowRight className="size-4" />
                      </button>
                    </div>

                    {/* Delete item */}
                    <button
                      onClick={() => removeAttachment(att.file.name)}
                      className="absolute right-1 top-1 bg-black/80 hover:bg-black text-white rounded-full p-0.5"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* POLL BUILDER MATRIX */}
          {hasPoll && (
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 flex flex-col gap-3 relative">
              <button onClick={() => setHasPoll(false)} className="absolute right-3 top-3 text-neutral-500 hover:text-white">
                <X className="size-4" />
              </button>
              <span className="text-xs font-bold text-neutral-400 tracking-wide uppercase">Poll Builder</span>
              
              <div className="flex flex-col gap-2">
                {pollChoices.map((choice, index) => (
                  <div key={index} className="relative flex items-center">
                    <input
                      type="text"
                      placeholder={`Choice ${index + 1}`}
                      maxLength={25}
                      value={choice}
                      onChange={(e) => {
                        const newChoices = [...pollChoices];
                        newChoices[index] = e.target.value;
                        setPollChoices(newChoices);
                      }}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl py-2 px-3 pr-16 text-sm text-white focus:outline-none placeholder:text-neutral-600"
                    />
                    <span className="absolute right-3 text-xs text-neutral-500">
                      {choice.length}/25
                    </span>
                  </div>
                ))}

                {pollChoices.length < 4 && (
                  <button
                    onClick={() => setPollChoices([...pollChoices, ""])}
                    className="flex items-center gap-2 text-xs font-bold text-primary self-start hover:underline mt-1"
                  >
                    <Plus className="size-3.5" />
                    Add Option
                  </button>
                )}
              </div>

              {/* Poll Duration Dropdowns */}
              <div className="border-t border-neutral-800 pt-3 mt-1 flex flex-col gap-2">
                <span className="text-xs text-neutral-500 font-semibold">Poll Length</span>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-neutral-600 uppercase font-bold">Days</label>
                    <select
                      value={pollDays}
                      onChange={(e) => setPollDays(parseInt(e.target.value))}
                      className="bg-neutral-900 border border-neutral-800 rounded-lg p-1.5 text-xs text-white"
                    >
                      {Array.from({ length: 8 }, (_, i) => (
                        <option key={i} value={i}>{i} d</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-neutral-600 uppercase font-bold">Hours</label>
                    <select
                      value={pollHours}
                      onChange={(e) => setPollHours(parseInt(e.target.value))}
                      className="bg-neutral-900 border border-neutral-800 rounded-lg p-1.5 text-xs text-white"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>{i} h</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-neutral-600 uppercase font-bold">Minutes</label>
                    <select
                      value={pollMinutes}
                      onChange={(e) => setPollMinutes(parseInt(e.target.value))}
                      className="bg-neutral-900 border border-neutral-800 rounded-lg p-1.5 text-xs text-white"
                    >
                      {Array.from({ length: 60 }, (_, i) => (
                        <option key={i} value={i}>{i} m</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AI CAPTION FLOATING PREVIEWS */}
          {showAiCaptionPanel && (
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wide">AI Caption Assistant</span>
                <button onClick={() => setShowAiCaptionPanel(false)} className="text-neutral-500 hover:text-white">
                  <X className="size-4" />
                </button>
              </div>

              {/* Tone Buttons */}
              <div className="flex flex-wrap gap-2">
                {["Professional", "Funny", "Viral", "Startup", "Travel"].map((tone) => (
                  <button
                    key={tone}
                    onClick={() => generateAICaptions(tone)}
                    className="px-3 py-1 bg-neutral-900 border border-neutral-800 rounded-full text-xs hover:border-primary transition-colors text-white"
                  >
                    ✨ {tone}
                  </button>
                ))}
              </div>

              {aiLoading && (
                <div className="flex items-center gap-2 text-xs text-neutral-500 mt-2">
                  <Loader2 className="size-3.5 animate-spin" />
                  Generating creative copies...
                </div>
              )}

              {aiCaptions.length > 0 && (
                <div className="flex flex-col gap-2 mt-2">
                  {aiCaptions.map((caption, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        editor?.commands.setContent(caption);
                        setShowAiCaptionPanel(false);
                      }}
                      className="p-3 bg-neutral-900/60 border border-neutral-850 hover:border-primary hover:bg-neutral-900 rounded-xl text-xs text-neutral-200 cursor-pointer transition-all"
                    >
                      {caption}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* DOCK BAR CONTROLS */}
          <div className="flex justify-between items-center border-t border-border/20 pt-4 mt-auto">
            <div className="flex items-center gap-3">
              {/* Add Media */}
              <Button
                variant="ghost"
                size="icon"
                className="text-primary hover:text-primary hover:bg-accent"
                disabled={isUploading || attachments.length >= 10}
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon size={20} />
              </Button>
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

              {/* GIF Search trigger */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-primary hover:text-primary hover:bg-accent"
                  onClick={() => setShowGifPicker(!showGifPicker)}
                >
                  <span className="text-[10px] font-bold border-2 border-primary rounded-md px-0.5 leading-none">GIF</span>
                </Button>
                {showGifPicker && (
                  <div className="absolute bottom-full left-0 mb-2 w-80 z-50">
                    <GifPicker onSelect={addGiphyAttachment} onClose={() => setShowGifPicker(false)} />
                  </div>
                )}
              </div>

              {/* Poll trigger */}
              <Button
                variant="ghost"
                size="icon"
                className="text-primary hover:text-primary hover:bg-accent"
                onClick={() => setHasPoll(!hasPoll)}
              >
                <span className="text-xs font-bold leading-none">📊</span>
              </Button>

              {/* AI Assistant trigger */}
              <Button
                variant="ghost"
                size="icon"
                className="text-primary hover:text-primary hover:bg-accent"
                onClick={() => setShowAiCaptionPanel(!showAiCaptionPanel)}
              >
                <Sparkles size={18} />
              </Button>

              {/* Emoji Picker trigger */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-primary hover:text-primary hover:bg-accent"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                >
                  <Smile size={20} />
                </Button>
                {showEmojiPicker && (
                  <div className="absolute bottom-full left-0 mb-2 z-50">
                    <EmojiPickerPanel
                      onEmojiSelect={(emoji) => {
                        editor?.commands.insertContent(emoji);
                        setShowEmojiPicker(false);
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* character count SVGs & navigation */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {charCount > characterLimit - 200 && (
                  <span className={cn("text-xs font-semibold", charCount > characterLimit ? "text-destructive" : "text-neutral-500")}>
                    {characterLimit - charCount}
                  </span>
                )}
                {/* SVG Character Ring */}
                <svg className="size-6 transform -rotate-90">
                  <circle cx="12" cy="12" r="8" className="stroke-neutral-800 fill-none" strokeWidth="1.5" />
                  <circle
                    cx="12"
                    cy="12"
                    r="8"
                    className={cn(
                      "fill-none transition-all duration-300",
                      charCount > characterLimit ? "stroke-destructive" : charCount > characterLimit - 200 ? "stroke-yellow-500" : "stroke-primary"
                    )}
                    strokeWidth="1.5"
                    strokeDasharray={2 * Math.PI * 8}
                    strokeDashoffset={2 * Math.PI * 8 * (1 - percentage / 100)}
                  />
                </svg>
              </div>

              {/* NEXT / SHARE NAVIGATION */}
              {attachments.length > 0 ? (
                <Button
                  onClick={() => {
                    setActiveMediaIndex(0);
                    setStage(2);
                  }}
                  disabled={isUploading}
                  className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 py-2"
                >
                  Next
                </Button>
              ) : (
                <LoadingButton
                  onClick={handlePublish}
                  loading={mutation.isPending}
                  disabled={!input.trim() || isUploading}
                  className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 py-2"
                >
                  Post
                </LoadingButton>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STAGE 2: FILTER & ADJUSTMENTS EDITOR VIEW */}
      {stage === 2 && (
        <div className="flex flex-col md:flex-row h-[550px] w-full bg-black">
          {/* LEFT IMAGE / CROP CONTAINER */}
          <div className="flex-1 relative h-[300px] md:h-full bg-neutral-950 flex items-center justify-center overflow-hidden border-b md:border-b-0 md:border-r border-neutral-900">
            {/* EASY-CROP ELEMENT */}
            {activeFile && !attachments[activeMediaIndex].file.type.startsWith("video") ? (
              <div className="absolute inset-0">
                <Cropper
                  image={activeSrc}
                  crop={activeAdj.crop}
                  zoom={activeAdj.zoom}
                  rotation={activeAdj.rotation}
                  aspect={activeAdj.aspect}
                  onCropChange={(crop) => updateAdjustment(activeFile, { crop })}
                  onZoomChange={(zoom) => updateAdjustment(activeFile, { zoom })}
                  onCropComplete={(_, croppedAreaPixels) => updateAdjustment(activeFile, { croppedAreaPixels })}
                  // Overlay styles
                  style={{
                    containerStyle: { background: "#000" },
                    mediaStyle: { filter: getFilterString(activeAdj.filter, activeAdj) }
                  }}
                />

                {/* VIGNETTE OVERLAY PREVIEW */}
                {activeAdj.vignette > 0 && (
                  <div
                    style={{
                      background: `radial-gradient(circle, transparent 45%, rgba(0,0,0,${activeAdj.vignette * 0.95}) 100%)`,
                    }}
                    className="absolute inset-0 pointer-events-none z-10"
                  />
                )}
              </div>
            ) : (
              <VideoPlayer src={activeSrc} />
            )}

            {/* ASPECT RATIO PANELS QUICK BUTTON */}
            {activeFile && !attachments[activeMediaIndex].file.type.startsWith("video") && (
              <div className="absolute bottom-3 left-3 bg-neutral-900/90 text-white rounded-lg p-1.5 z-20 flex gap-2 border border-neutral-850">
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
                      "px-2 py-0.5 text-[10px] font-bold rounded hover:bg-neutral-800 transition-colors",
                      activeAdj.aspect === item.ratio ? "bg-primary text-primary-foreground" : "text-neutral-300"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}

            {/* ROTATION BUTTON */}
            {activeFile && !attachments[activeMediaIndex].file.type.startsWith("video") && (
              <button
                onClick={() => updateAdjustment(activeFile, { rotation: (activeAdj.rotation + 90) % 360 })}
                className="absolute bottom-3 right-3 bg-neutral-900/90 hover:bg-neutral-800 text-white p-2 rounded-lg z-20 border border-neutral-850 transition-colors"
              >
                <RotateCw className="size-4" />
              </button>
            )}

            {/* Back arrow */}
            <button onClick={() => setStage(1)} className="absolute top-4 left-4 bg-black/60 hover:bg-black/90 text-white p-2 rounded-full z-20 transition-all">
              <ArrowLeft className="size-5" />
            </button>
          </div>

          {/* RIGHT EDIT TAB CONTROLS PANEL */}
          <div className="w-full md:w-[350px] h-[250px] md:h-full bg-neutral-950 flex flex-col text-white">
            {/* EDITING COMPONENT TABS SELECTOR */}
            <div className="flex border-b border-neutral-900 bg-neutral-950 p-2 gap-2">
              <button
                onClick={() => setEditTab("filters")}
                className={cn(
                  "flex-1 py-2 text-sm font-semibold rounded-lg transition-all",
                  editTab === "filters" ? "bg-neutral-900 text-white font-bold" : "text-neutral-400 hover:text-white"
                )}
              >
                Filters
              </button>
              <button
                onClick={() => setEditTab("adjustments")}
                className={cn(
                  "flex-1 py-2 text-sm font-semibold rounded-lg transition-all",
                  editTab === "adjustments" ? "bg-neutral-900 text-white font-bold" : "text-neutral-400 hover:text-white"
                )}
              >
                Adjustments
              </button>
            </div>

            {/* TAB CONTENT */}
            <div className="flex-grow overflow-y-auto p-4 scrollbar-none">
              {editTab === "filters" && activeFile && (
                <div className="grid grid-cols-3 gap-3">
                  {filterPresets.map((preset) => {
                    const presetFilter = preset.filter;
                    return (
                      <div
                        key={preset.name}
                        onClick={() => updateAdjustment(activeFile, { filter: preset.name })}
                        className={cn(
                          "flex flex-col gap-1 items-center cursor-pointer rounded-xl overflow-hidden p-1.5 border border-transparent hover:bg-neutral-900 transition-all",
                          activeAdj.filter === preset.name ? "border-primary bg-neutral-900" : ""
                        )}
                      >
                        <div className="w-full aspect-square rounded-lg overflow-hidden relative bg-neutral-900">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={activeSrc}
                            alt={preset.name}
                            style={{ filter: presetFilter }}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="text-[10px] font-bold text-neutral-300">{preset.name}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {editTab === "adjustments" && activeFile && (
                <div className="flex flex-col gap-4">
                  {/* Brightness */}
                  <div className="flex flex-col gap-1.5">
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
                  <div className="flex flex-col gap-1.5">
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
                  <div className="flex flex-col gap-1.5">
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

                  {/* Temperature */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs font-semibold text-neutral-400">
                      <span>Temperature</span>
                      <span>{activeAdj.temperature > 0 ? `+${activeAdj.temperature}` : activeAdj.temperature}</span>
                    </div>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      step="1"
                      value={activeAdj.temperature}
                      onChange={(e) => updateAdjustment(activeFile, { temperature: parseInt(e.target.value) })}
                      className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>

                  {/* Fade */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs font-semibold text-neutral-400">
                      <span>Fade</span>
                      <span>{activeAdj.fade}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={activeAdj.fade}
                      onChange={(e) => updateAdjustment(activeFile, { fade: parseInt(e.target.value) })}
                      className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>

                  {/* Vignette */}
                  <div className="flex flex-col gap-1.5">
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
                </div>
              )}
            </div>

            {/* Stage 2 Footer: active Carousel selections and Next button */}
            <div className="border-t border-neutral-900 p-4 bg-neutral-950 flex items-center justify-between">
              {/* Carousel strip */}
              <div className="flex gap-1.5 overflow-x-auto max-w-[150px]">
                {attachments.map((a, idx) => (
                  <div
                    key={idx}
                    onClick={() => setActiveMediaIndex(idx)}
                    className={cn(
                      "size-8 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer border-2 bg-neutral-950",
                      activeMediaIndex === idx ? "border-primary" : "border-transparent"
                    )}
                  >
                    <Image
                      src={URL.createObjectURL(a.file)}
                      alt="attachment preview"
                      width={32}
                      height={32}
                      className="object-cover h-full w-full"
                    />
                  </div>
                ))}
              </div>

              <Button
                onClick={() => setStage(3)}
                className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold px-5 py-2 rounded-lg"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* STAGE 3: TAGGING, METADATA & CONFIGURATION VIEW */}
      {stage === 3 && (
        <div className="flex flex-col md:flex-row h-[550px] w-full bg-neutral-950 text-white">
          {/* LEFT BLOCK: PREVIEW & INTERACTIVE TAGGING */}
          <div className="flex-1 relative h-[300px] md:h-full bg-neutral-950 flex items-center justify-center overflow-hidden border-b md:border-b-0 md:border-r border-neutral-900">
            {activeFile && (
              <div onClick={handleTagClick} className="relative max-h-full max-w-full aspect-square md:aspect-auto h-full w-full flex items-center justify-center cursor-crosshair">
                {!attachments[activeMediaIndex].file.type.startsWith("video") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activeSrc}
                    alt="final preview"
                    style={{ filter: getFilterString(activeAdj.filter, activeAdj) }}
                    className="max-h-full max-w-full object-contain pointer-events-none"
                  />
                ) : (
                  <video src={activeSrc} className="max-h-full max-w-full object-contain pointer-events-none" muted />
                )}

                {/* Vignette Preview overlay */}
                {activeAdj.vignette > 0 && (
                  <div
                    style={{
                      background: `radial-gradient(circle, transparent 45%, rgba(0,0,0,${activeAdj.vignette * 0.95}) 100%)`,
                    }}
                    className="absolute inset-0 pointer-events-none z-10"
                  />
                )}

                {/* Tag markers rendering */}
                {activeTags.map((tag, idx) => (
                  <div
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTag(activeFile, idx);
                    }}
                    style={{ left: `${tag.x}%`, top: `${tag.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 bg-black/85 hover:bg-destructive hover:scale-102 border border-neutral-700 text-white px-2 py-0.5 rounded-full text-[10px] font-bold z-30 transition-all flex items-center gap-1.5 cursor-pointer shadow-lg"
                  >
                    <span>@{tag.username}</span>
                    <X className="size-3 flex-shrink-0 opacity-60" />
                  </div>
                ))}

                {/* Tag Search Popover Form */}
                {activeTagCoord && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{ left: `${activeTagCoord.x}%`, top: `${activeTagCoord.y}%` }}
                    className="absolute -translate-x-1/2 mt-3 bg-neutral-900 border border-neutral-850 p-2.5 rounded-xl shadow-2xl z-40 w-48 flex flex-col gap-1.5"
                  >
                    <input
                      type="text"
                      placeholder="Search username..."
                      value={tagQuery}
                      onChange={(e) => setTagQuery(e.target.value)}
                      className="bg-neutral-950 border border-neutral-850 rounded-lg p-1.5 text-xs text-white focus:outline-none placeholder:text-neutral-600 w-full"
                    />
                    <div className="max-h-24 overflow-y-auto flex flex-col gap-1">
                      {tagSearchUsers.map((u) => (
                        <div
                          key={u.id}
                          onClick={() => addTag(u.username)}
                          className="flex items-center gap-2 p-1.5 hover:bg-neutral-800 rounded-lg cursor-pointer text-xs"
                        >
                          <UserAvatar avatarUrl={u.avatarUrl} size={18} />
                          <span className="font-bold truncate">{u.username}</span>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => setActiveTagCoord(null)}
                      className="text-[10px] text-neutral-500 hover:text-white font-bold self-end mt-1"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Back Arrow */}
            <button onClick={() => setStage(2)} className="absolute top-4 left-4 bg-black/60 hover:bg-black/90 text-white p-2 rounded-full z-25 transition-all">
              <ArrowLeft className="size-5" />
            </button>
          </div>

          {/* RIGHT BLOCK: METADATA & CONFIGURATIONS SHARING FORM */}
          <div className="w-full md:w-[350px] h-[250px] md:h-full bg-neutral-950 flex flex-col border-t md:border-t-0 border-neutral-900 text-white">
            <div className="flex-grow overflow-y-auto p-4 scrollbar-none flex flex-col gap-4">
              {/* Location Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-neutral-400 flex items-center gap-1.5">
                  <MapPin className="size-4 text-primary" />
                  <span>Location</span>
                </label>
                <input
                  type="text"
                  placeholder="Add location (e.g. San Francisco, CA)"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="bg-neutral-900 border border-neutral-850 rounded-xl p-2.5 text-xs text-white focus:outline-none placeholder:text-neutral-600 focus:border-neutral-700"
                />
              </div>

              {/* Collaborators Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-neutral-400 flex items-center gap-1.5">
                  <Users className="size-4 text-primary" />
                  <span>Collaborators</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search users to collaborate..."
                    value={collabQuery}
                    onChange={(e) => setCollabQuery(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-850 rounded-xl p-2.5 text-xs text-white focus:outline-none placeholder:text-neutral-600 focus:border-neutral-700"
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
                {/* List of collaborators */}
                {collaborators.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {collaborators.map((name) => (
                      <span
                        key={name}
                        onClick={() => setCollaborators(collaborators.filter((c) => c !== name))}
                        className="bg-neutral-800 hover:bg-destructive text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1.5 cursor-pointer"
                      >
                        @{name}
                        <X className="size-3" />
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Audience Selection */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-neutral-400 flex items-center gap-1.5">
                  <Globe className="size-4 text-primary" />
                  <span>Audience</span>
                </label>
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  className="bg-neutral-900 border border-neutral-850 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                >
                  <option value="PUBLIC">🌎 Public (Anyone)</option>
                  <option value="FOLLOWERS">👥 Followers only</option>
                  <option value="CLOSE_FRIENDS">⭐ Close Friends</option>
                  <option value="PRIVATE">🔒 Private (Only Me)</option>
                </select>
              </div>

              {/* Alt Text / Accessibility Accordion */}
              <div className="border-t border-neutral-900 pt-3 flex flex-col gap-2">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wide">Accessibility</span>
                <textarea
                  placeholder="Write image alt text / accessibility description..."
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  className="bg-neutral-900 border border-neutral-850 rounded-xl p-2.5 text-xs text-white focus:outline-none placeholder:text-neutral-600 h-16 resize-none focus:border-neutral-700"
                />
              </div>

              {/* Advanced Settings Toggles */}
              <div className="border-t border-neutral-900 pt-3 flex flex-col gap-3">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wide">Advanced Settings</span>
                
                {/* Comments Toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-300 font-semibold flex items-center gap-2">
                    <MessageSquare className="size-3.5 text-neutral-450" />
                    Turn off commenting
                  </span>
                  <input
                    type="checkbox"
                    checked={disableComments}
                    onChange={(e) => setDisableComments(e.target.checked)}
                    className="accent-primary rounded size-4 bg-neutral-900 border-neutral-850"
                  />
                </div>

                {/* Likes Toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-300 font-semibold flex items-center gap-2">
                    <Heart className="size-3.5 text-neutral-450" />
                    Hide like and view counts
                  </span>
                  <input
                    type="checkbox"
                    checked={hideLikes}
                    onChange={(e) => setHideLikes(e.target.checked)}
                    className="accent-primary rounded size-4 bg-neutral-900 border-neutral-850"
                  />
                </div>
              </div>
            </div>

            {/* Stage 3 Footer: active Carousel preview and SHARE button */}
            <div className="border-t border-neutral-900 p-4 bg-neutral-950 flex items-center justify-between">
              {/* Carousel strip */}
              <div className="flex gap-1.5 overflow-x-auto max-w-[150px]">
                {attachments.map((a, idx) => (
                  <div
                    key={idx}
                    onClick={() => setActiveMediaIndex(idx)}
                    className={cn(
                      "size-8 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer border-2 bg-neutral-950",
                      activeMediaIndex === idx ? "border-primary" : "border-transparent"
                    )}
                  >
                    <Image
                      src={URL.createObjectURL(a.file)}
                      alt="attachment preview"
                      width={32}
                      height={32}
                      className="object-cover h-full w-full"
                    />
                  </div>
                ))}
              </div>

              <LoadingButton
                onClick={handlePublish}
                loading={mutation.isPending}
                disabled={isUploading}
                className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold px-6 py-2 rounded-lg"
              >
                Share
              </LoadingButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
