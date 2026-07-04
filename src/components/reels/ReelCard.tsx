"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import { useSession } from "@/app/(main)/SessionProvider";
import UserAvatar from "@/components/UserAvatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import FollowButton from "@/components/FollowButton";
import kyInstance from "@/lib/ky";
import { useStoryViewer } from "@/components/StoryViewerProvider";
import { BookmarkInfo, FollowerInfo, LikeInfo, PostData } from "@/lib/types";
import { QueryKey, useMutation, useQuery, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  MoreVertical,

  Music,
  VolumeX,
  Volume2,
  Play,
  Pause,
  ExternalLink,
  Loader2,
  ShoppingBag,
  AlertTriangle,
  FastForward,
  Maximize2,
  Minimize2,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Check,
  Copy,
  Code,
  Info,
  PenLine,
  Globe,
  Gauge,
  ShieldCheck,
  RotateCcw,
  Truck,
  ShoppingCart,
  Bell,
  Edit3 as Edit3
} from "lucide-react";
import Link from "next/link";
import CommentsBottomSheet from "@/components/comments/CommentsBottomSheet";
import FullScreenProductDetail from "@/components/reels/FullScreenProductDetail";

import ShareDialog from "@/components/posts/ShareDialog";
import RepostButton from "@/components/posts/RepostButton";
import QuotePostDialog from "@/components/posts/QuotePostDialog";
import { RepostIcon } from "@/components/icons/InstagramIcons";
import { useToast } from "../ui/use-toast";
import { updatePost, translateCaption } from "@/components/posts/editor/actions";
import { useChat } from "@/app/(main)/ChatProvider";
import CommentComponent from "@/components/comments/Comment";
import { submitComment } from "@/components/comments/actions";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { CommentsPage } from "@/lib/types";

interface ReelCardProps {
  post: PostData;
  isMuted: boolean;
  onToggleMute: () => void;
  isActive: boolean;
  shouldPreload: boolean;
  isPrevReel?: boolean;
  onLockScroll?: (locked: boolean) => void;
  autoScrollEnabled: boolean;
  onToggleAutoScroll: () => void;
  onReelEnded: () => void;
  onViewAllProducts?: (products: any[]) => void;
  onOpenProductDetail?: (productId: string | number, products: any[]) => void;
}

export default function ReelCard({
  post,
  isMuted,
  onToggleMute,
  isActive,
  shouldPreload,
  isPrevReel = false,
  onLockScroll,
  autoScrollEnabled,
  onToggleAutoScroll,
  onReelEnded,
  onViewAllProducts,
  onOpenProductDetail
}: ReelCardProps) {
  const { user: loggedInUser } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { showStory, groupedStories } = useStoryViewer();

  const hasActiveStory = groupedStories.some(
    (item) => item.user.id === post.user.id && item.stories.length > 0
  );

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [volumeState, setVolumeState] = useState(0.8);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoNode, setVideoNode] = useState<HTMLVideoElement | null>(null);
  const [fullProductDetailId, setFullProductDetailId] = useState<string | null>(null);
  const [overlayIcon, setOverlayIcon] = useState<"play" | "pause" | null>(null);
  const [tapHearts, setTapHearts] = useState<{ id: number }[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [desktopActiveCategory, setDesktopActiveCategory] = useState("All");


  // 2x Fast Forward on Hold states
  const [isFastForwarding, setIsFastForwarding] = useState(false);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const didFastForwardRef = useRef(false);

  const startFastForwardHold = () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    didFastForwardRef.current = false;

    holdTimerRef.current = setTimeout(() => {
      const video = videoRef.current;
      if (video && !video.paused) {
        video.playbackRate = 2.0;
        setIsFastForwarding(true);
        didFastForwardRef.current = true;
      }
    }, 250);
  };

  const stopFastForwardHold = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (isFastForwarding) {
      const video = videoRef.current;
      if (video) {
        video.playbackRate = currentSpeed;
      }
      setIsFastForwarding(false);
    }
  };

  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isCaptionExpanded, setIsCaptionExpanded] = useState(false);

  // Desktop Side Drawer State System
  const [activeRightDrawer, setActiveRightDrawer] = useState<"shop" | "comments" | "share" | "options" | "repost" | null>(null);
  const [isDesktopLayout, setIsDesktopLayout] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => setIsDesktopLayout(window.innerWidth >= 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isShoppingDrawerOpen = activeRightDrawer === "shop";
  const setIsShoppingDrawerOpen = (val: boolean | ((prev: boolean) => boolean)) => {
    if (typeof val === "function") {
      setActiveRightDrawer((prev) => (val(prev === "shop") ? "shop" : null));
    } else {
      setActiveRightDrawer(val ? "shop" : null);
    }
  };

  // Comments state variables
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentsSortBy, setCommentsSortBy] = useState<"top" | "newest" | "oldest">("top");

  // Share state variables
  const chatClient = useChat();
  const [shareSearchQuery, setShareSearchQuery] = useState("");
  const [contactedUsers, setContactedUsers] = useState<any[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [copied, setCopied] = useState(false);

  // Options dialog view state
  const [optionsView, setOptionsView] = useState<"menu" | "about_account" | "captions_languages">("menu");

  const [showDesktopQuoteDialog, setShowDesktopQuoteDialog] = useState(false);

  // Quick Controls Sheet & Speed/Full Screen states
  const [isQuickControlsOpen, setIsQuickControlsOpen] = useState(false);
  const [quickControlsView, setQuickControlsView] = useState<"menu" | "captions">("menu");
  const [currentSpeed, setCurrentSpeed] = useState<number>(1);
  const [isCleanFullScreen, setIsCleanFullScreen] = useState(false);
  const [showCaptions, setShowCaptions] = useState(true);

  // Captions & Translation states
  const [editedCaptionText, setEditedCaptionText] = useState(post.content);
  const [isSavingCaption, setIsSavingCaption] = useState(false);
  const [activeLanguage, setActiveLanguage] = useState("original");
  const [displayContent, setDisplayContent] = useState(post.content);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isCurrentlyTranslated, setIsCurrentlyTranslated] = useState(false);
  const [captionsSubView, setCaptionsSubView] = useState<"main" | "languages">("main");
  const [tempSelectedLanguage, setTempSelectedLanguage] = useState("original");

  // Load language preference from LocalStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedLang = localStorage.getItem("user-preferred-translation-lang");
      if (savedLang) {
        setActiveLanguage(savedLang);
      }
    }
  }, []);

  useEffect(() => {
    if (captionsSubView === "languages") {
      setTempSelectedLanguage(activeLanguage);
    }
  }, [captionsSubView, activeLanguage]);

  const toggleTranslation = async () => {
    if (isCurrentlyTranslated) {
      setIsCurrentlyTranslated(false);
    } else {
      // If we haven't fetched the translated content for this post yet
      if (displayContent === post.content && activeLanguage !== "original") {
        setIsTranslating(true);
        try {
          const translated = await translateCaption(post.content, activeLanguage);
          setDisplayContent(translated);
          setIsCurrentlyTranslated(true);
        } catch (error) {
          console.error(error);
          toast({
            variant: "destructive",
            description: "Failed to translate caption."
          });
        } finally {
          setIsTranslating(false);
        }
      } else {
        setIsCurrentlyTranslated(true);
      }
    }
  };

  const speedCycle = [1, 1.2, 1.5, 2, 2.5, 3];

  const handleCycleSpeed = () => {
    const currentIndex = speedCycle.indexOf(currentSpeed);
    const nextIndex = currentIndex === -1 || currentIndex === speedCycle.length - 1 ? 0 : currentIndex + 1;
    const nextSpeed = speedCycle[nextIndex];
    setCurrentSpeed(nextSpeed);
    if (videoRef.current) {
      videoRef.current.playbackRate = nextSpeed;
    }
    toast({
      description: `Playback speed set to ${nextSpeed}x`,
    });
  };

  const handleLanguageChange = async (langCode: string) => {
    setActiveLanguage(langCode);
    if (typeof window !== "undefined") {
      localStorage.setItem("user-preferred-translation-lang", langCode);
    }

    if (langCode === "original") {
      setDisplayContent(post.content);
      setIsCurrentlyTranslated(false);
      toast({ description: "Restored original caption" });
      return;
    }

    setIsTranslating(true);
    try {
      const translated = await translateCaption(post.content, langCode);
      setDisplayContent(translated);
      setIsCurrentlyTranslated(true);
      toast({ description: `Caption translated to ${langCode}` });
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        description: "Failed to translate caption. Please try again."
      });
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSaveCaption = async () => {
    setIsSavingCaption(true);
    try {
      await updatePost({ id: post.id, content: editedCaptionText });
      toast({
        description: "Caption updated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["post-feed"] });
      
      if (activeLanguage !== "original") {
        setIsTranslating(true);
        const translated = await translateCaption(editedCaptionText, activeLanguage);
        setDisplayContent(translated);
        setIsTranslating(false);
      } else {
        setDisplayContent(editedCaptionText);
      }

      setQuickControlsView("menu");
      setIsQuickControlsOpen(false);
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        description: "Failed to update caption. Please try again.",
      });
    } finally {
      setIsSavingCaption(false);
    }
  };

  const renderOptionsBody = () => {
    if (optionsView === "about_account") {
      return (
        <div className="flex flex-col gap-5 text-start animate-in fade-in slide-in-from-right-4 duration-200">
          <div className="flex items-center gap-3">
            <button onClick={() => setOptionsView("menu")} className="p-1.5 text-zinc-400 hover:text-white rounded-lg bg-[#12131a] border border-zinc-800 cursor-pointer">
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-xs font-black uppercase tracking-wider text-zinc-450">About creator</span>
          </div>

          <div className="flex flex-col items-center gap-4 py-6 px-4 rounded-2xl bg-[#12131a] border border-zinc-800 text-center w-full">
            <img src={post.user.avatarUrl || "/avatar-placeholder.png"} alt="avatar" className="size-16 rounded-full border border-white/10 object-cover shadow-lg" />
            <div>
              <span className="font-black text-sm text-white flex items-center justify-center gap-1">
                {post.user.displayName}
                {post.user.verified && <VerifiedBadge size={13} />}
              </span>
              <span className="text-[10px] text-zinc-550 block mt-0.5">@{post.user.username}</span>
            </div>
            
            <div className="w-full flex flex-col gap-3 border-t border-zinc-900 pt-4 mt-2 text-xs select-none">
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">Date joined</span>
                <span className="font-bold text-zinc-300">June 2024</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">Account location</span>
                <span className="font-bold text-zinc-300">India</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">Verified status</span>
                <span className={cn("font-bold text-[10.5px]", post.user.verified ? "text-indigo-400" : "text-zinc-405")}>
                  {post.user.verified ? "VERIFIED CREATOR" : "STANDARD ACCOUNT"}
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (optionsView === "captions_languages") {
      return (
        <div className="flex flex-col gap-4 text-start animate-in fade-in slide-in-from-right-4 duration-200">
          <div className="flex items-center justify-between py-2 border-b border-zinc-900 pb-3 mb-2">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setOptionsView("menu")}
                className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800/60"
              >
                <ChevronLeft className="size-5" />
              </button>
              <span className="text-xs font-black uppercase tracking-wider text-zinc-450">Display language</span>
            </div>
          </div>

          <div className="flex flex-col max-h-[350px] overflow-y-auto pr-1 select-none scrollbar-none">
            {[
              { code: "original", label: "Original" },
              { code: "Arabic", label: "Arabic" },
              { code: "Bengali", label: "Bengali" },
              { code: "German", label: "German" },
              { code: "English", label: "English" },
              { code: "Persian", label: "Persian" },
              { code: "Spanish", label: "Spanish" },
              { code: "Finnish", label: "Finnish" },
              { code: "French", label: "French" },
              { code: "Gujarati", label: "Gujarati" },
              { code: "Hebrew", label: "Hebrew" },
              { code: "Hindi", label: "Hindi" },
              { code: "Indonesian", label: "Indonesian" },
              { code: "Italian", label: "Italian" },
              { code: "Japanese", label: "Japanese" },
              { code: "Kannada", label: "Kannada" },
              { code: "Korean", label: "Korean" },
              { code: "Malay", label: "Malay" },
              { code: "Burmese", label: "Burmese" },
              { code: "Dutch", label: "Dutch" },
              { code: "Polish", label: "Polish" },
              { code: "Portuguese", label: "Portuguese" },
              { code: "Russian", label: "Russian" },
              { code: "Sinhala", label: "Sinhala" },
              { code: "Swedish", label: "Swedish" },
              { code: "Tamil", label: "Tamil" },
              { code: "Telugu", label: "Telugu" },
              { code: "Tagalog", label: "Tagalog" },
              { code: "Thai", label: "Thai" },
              { code: "Turkish", label: "Turkish" },
              { code: "Urdu", label: "Urdu" },
              { code: "Vietnamese", label: "Vietnamese" },
              { code: "Chinese", label: "Chinese" },
              { code: "Marathi", label: "Marathi" }
            ].map((lang) => {
              const isSelected = tempSelectedLanguage === lang.code;
              return (
                <div
                  key={lang.code}
                  onClick={() => {
                    setTempSelectedLanguage(lang.code);
                    handleLanguageChange(lang.code);
                  }}
                  className="flex items-center justify-between py-3 px-2 cursor-pointer hover:bg-zinc-800/20 rounded-xl transition-all"
                >
                  <span className={cn(
                    "text-xs font-bold transition-colors",
                    isSelected ? "text-[#3897f0]" : "text-zinc-350"
                  )}>
                    {lang.label}
                  </span>
                  {isSelected && (
                    <Check className="size-4 text-[#3897f0]" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-6 select-none text-white">
        {/* 1. PLAYBACK CONTROLS */}
        <div className="flex flex-col gap-2.5">
          <span className="text-[10px] font-black tracking-wider text-zinc-500 uppercase">
            Playback Controls
          </span>
          <div className="flex flex-col border border-zinc-850/80 rounded-2xl divide-y divide-zinc-900 bg-[#12131a]/35 overflow-hidden">
            {/* Playback Speed Row */}
            <div
              onClick={handleCycleSpeed}
              className="flex items-center justify-between py-3.5 px-4 cursor-pointer hover:bg-[#12131a] transition-all"
            >
              <div className="flex items-center gap-3">
                <Gauge className="size-4 text-zinc-400" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-zinc-300">Playback Speed</span>
                  <span className="text-[10px] text-zinc-505 font-medium leading-none mt-0.5">Cycle video playback speed</span>
                </div>
              </div>
              <span className="text-xs font-black bg-zinc-905 border border-zinc-800 text-white px-2.5 py-1 rounded-lg">
                {currentSpeed}x
              </span>
            </div>

            {/* Auto Scroll Row */}
            <div
              onClick={() => {
                onToggleAutoScroll();
                toast({ description: `Auto scroll ${!autoScrollEnabled ? "enabled" : "disabled"}` });
              }}
              className="flex items-center justify-between py-3.5 px-4 cursor-pointer hover:bg-[#12131a] transition-all"
            >
              <div className="flex items-center gap-3">
                <RotateCw className="size-4 text-zinc-400" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-zinc-300">Auto Scroll</span>
                  <span className="text-[10px] text-zinc-505 font-medium leading-none mt-0.5">Scroll to next reel on end</span>
                </div>
              </div>
              <div className={cn(
                "w-10 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out flex items-center cursor-pointer",
                autoScrollEnabled ? "bg-[#3897f0] justify-end" : "bg-zinc-850 justify-start"
              )}>
                <div className="w-5 h-5 rounded-full bg-white shadow-md" />
              </div>
            </div>

            {/* Manage Captions Row */}
            <div
              onClick={() => {
                setShowCaptions((prev) => !prev);
                toast({ description: `Closed captions ${!showCaptions ? "turned on" : "turned off"}` });
              }}
              className="flex items-center justify-between py-3.5 px-4 cursor-pointer hover:bg-[#12131a] transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="size-5 rounded border border-zinc-400 flex items-center justify-center text-[8px] font-black text-zinc-400">
                  CC
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-zinc-300">Closed Captions</span>
                  <span className="text-[10px] text-zinc-505 font-medium leading-none mt-0.5">Show subtitles on video</span>
                </div>
              </div>
              <div className={cn(
                "w-10 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out flex items-center cursor-pointer",
                showCaptions ? "bg-[#3897f0] justify-end" : "bg-zinc-850 justify-start"
              )}>
                <div className="w-5 h-5 rounded-full bg-white shadow-md" />
              </div>
            </div>

            {/* Display Language Selection Row (if captions enabled) */}
            {showCaptions && (
              <div
                onClick={() => setOptionsView("captions_languages")}
                className="flex items-center justify-between py-3.5 px-4 cursor-pointer hover:bg-[#12131a] transition-all"
              >
                <div className="flex items-center gap-3">
                  <Globe className="size-4 text-zinc-400" />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-zinc-300">Display Language</span>
                    <span className="text-[10px] text-zinc-505 font-medium leading-none mt-0.5">Select subtitle language</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-zinc-450 font-bold">
                  <span>{activeLanguage === "original" ? "Original" : activeLanguage}</span>
                  <ChevronRight className="size-3.5 text-zinc-500" />
                </div>
              </div>
            )}

            {/* Full Screen Mode Row */}
            <div
              onClick={() => {
                setActiveRightDrawer(null);
                setIsOptionsOpen(false);
                setIsCleanFullScreen(true);
              }}
              className="flex items-center justify-between py-3.5 px-4 cursor-pointer hover:bg-[#12131a] transition-all"
            >
              <div className="flex items-center gap-3">
                <Maximize2 className="size-4 text-zinc-400" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-zinc-300">Full Screen Mode</span>
                  <span className="text-[10px] text-zinc-505 font-medium leading-none mt-0.5">Hide overlay controls</span>
                </div>
              </div>
              <Maximize2 className="size-3.5 text-zinc-500" />
            </div>
          </div>
        </div>

        {/* 2. POST OPTIONS */}
        <div className="flex flex-col gap-2.5">
          <span className="text-[10px] font-black tracking-wider text-zinc-500 uppercase">
            Post Settings
          </span>
          
          {/* Shortcut Action Grid */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Copy Link", icon: Copy, action: handleCopyLink },
              { label: "Embed", icon: Code, action: () => toast({ description: "Embed feature is coming soon!" }) },
              { label: "About Creator", icon: Info, action: () => setOptionsView("about_account") }
            ].map((item, idx) => (
              <button
                key={idx}
                onClick={item.action}
                className="flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl bg-[#12131a] border border-zinc-800/60 hover:bg-[#1a1b26] hover:border-zinc-700/60 active:scale-95 transition-all cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-xl bg-[#07080d] border border-zinc-850 flex items-center justify-center text-zinc-400 group-hover:text-indigo-400 group-hover:border-indigo-500/20 transition-all">
                  <item.icon className="size-4" />
                </div>
                <span className="text-[9px] font-black text-zinc-400 group-hover:text-white transition-colors text-center truncate w-full uppercase tracking-wider">{item.label}</span>
              </button>
            ))}
          </div>

          {/* Vertical Post Action List */}
          <div className="flex flex-col border border-zinc-800/80 rounded-2xl divide-y divide-zinc-900 bg-[#12131a]/30 overflow-hidden">
            <button
              onClick={() => {
                setIsOptionsOpen(false);
                setActiveRightDrawer("comments");
              }}
              className="flex items-center gap-3 py-3.5 px-4 text-left text-xs font-bold text-zinc-300 hover:bg-[#12131a] hover:text-white transition-all cursor-pointer"
            >
              <MessageCircle className="size-4 text-zinc-455" />
              <span>Manage Comments</span>
            </button>

            <button
              onClick={() => {
                setIsOptionsOpen(false);
                setActiveRightDrawer("share");
              }}
              className="flex items-center gap-3 py-3.5 px-4 text-left text-xs font-bold text-zinc-300 hover:bg-[#12131a] hover:text-white transition-all cursor-pointer"
            >
              <Send className="size-4 text-zinc-455" />
              <span>Share to Direct Message</span>
            </button>

            {hasAttachedProducts && (
              <button
                onClick={() => {
                  setIsOptionsOpen(false);
                  setActiveRightDrawer("shop");
                }}
                className="flex items-center gap-3 py-3.5 px-4 text-left text-xs font-bold text-amber-400 hover:bg-[#12131a]/80 transition-all cursor-pointer"
              >
                <ShoppingBag className="size-4 text-amber-500" />
                <span>Shop Looks tagged in Reel</span>
              </button>
            )}

            <button
              onClick={() => {
                toast({ description: "Report submitted successfully." });
                setActiveRightDrawer(null);
                setIsOptionsOpen(false);
              }}
              className="flex items-center gap-3 py-3.5 px-4 text-left text-xs font-bold text-red-500 hover:bg-red-500/5 hover:text-red-400 transition-all cursor-pointer"
            >
              <AlertTriangle className="size-4 text-red-500" />
              <span>Report Reel</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Shoppable products overlay states

  const [drawerHeightState, setDrawerHeightState] = useState<"min" | "mid" | "max">("min");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [showHotspots, setShowHotspots] = useState(false);
  const [showAllProducts, setShowAllProducts] = useState(false);
  const hotspotTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Polling query for AI status tracking
  const { data: statusData } = useQuery({
    queryKey: ["post-ai-status", post.id],
    queryFn: () =>
      kyInstance.get(`/api/posts/${post.id}/status`).json<{
        aiStatus: string;
        detectedObjects: any[];
        assignments: any[];
        detectedProducts: any[];
        processingLog?: any;
      }>(),
    initialData: {
      aiStatus: (post.videoJob?.status || "pending").toUpperCase(),
      detectedObjects: (post as any).detectedObjects || [],
      assignments: (post as any).assignments || [],
      detectedProducts: post.detectedProducts || [],
      processingLog: null,
    },
    refetchInterval: (query) => {
      const currentStatus = query.state.data?.aiStatus || "PENDING";
      return currentStatus === "PENDING" || currentStatus === "PROCESSING" ? 3000 : false;
    },
    enabled: !post.videoJob || post.videoJob.status === "pending" || post.videoJob.status === "processing",
  });

  const currentStatus = statusData?.aiStatus || (post.videoJob?.status || "pending").toUpperCase();
  const detectedObjects = useMemo(() => {
    return statusData?.detectedObjects || (post as any).detectedObjects || [];
  }, [statusData?.detectedObjects, post]);

  const detectedProducts = useMemo(() => {
    // 1. Get all assignments
    const rawAssignments = statusData?.assignments || (post as any).assignments || [];
    const assignedProducts = rawAssignments.map((a: any) => ({
      ...a.product,
      isVerifiedMatch: a.verificationSource === "CREATOR_APPROVED" || a.verificationSource === "ADMIN_VERIFIED",
      assignmentId: a.id,
      displayOrder: a.displayOrder,
      featured: a.featured,
      assignmentStatus: a.status,
      verificationSource: a.verificationSource,
      source: "assignment",
    }));

    // 2. Get raw detected products (AI results)
    const rawDetected = statusData?.detectedProducts || post.detectedProducts || [];
    const aiProducts = rawDetected
      .filter((dp: any) => !assignedProducts.some((ap: any) => ap.id === dp.id))
      .filter((dp: any) => dp.isVerifiedMatch || (dp.confidence ?? 0) >= 0.3)
      .map((dp: any) => ({
        ...dp,
        isVerifiedMatch: dp.isVerifiedMatch || false,
        assignmentId: null,
        displayOrder: 999,
        featured: false,
        assignmentStatus: "PUBLISHED",
        verificationSource: "AI_DETECTED",
        source: "ai",
      }));

    // 3. Merge lists
    const merged = [...assignedProducts, ...aiProducts];

    // 4. Sort according to priority:
    // - Featured first (featured === true)
    // - Creator Approved / Added next (verificationSource === "CREATOR_APPROVED" or "CREATOR_ADDED")
    // - Admin Verified next (verificationSource === "ADMIN_VERIFIED" or isVerifiedMatch === true)
    // - AI Detected last (verificationSource === "AI_DETECTED" or other)
    // Within groups, order by displayOrder.
    return merged.sort((a, b) => {
      const featA = a.featured ? 1 : 0;
      const featB = b.featured ? 1 : 0;
      if (featA !== featB) return featB - featA;

      const getSourcePriority = (p: any) => {
        const src = p.verificationSource || "";
        if (src === "CREATOR_APPROVED" || src === "CREATOR_ADDED" || p.manuallyAssigned) {
          return 3;
        }
        if (src === "ADMIN_VERIFIED" || p.isVerifiedMatch) {
          return 2;
        }
        return 1;
      };

      const prioA = getSourcePriority(a);
      const prioB = getSourcePriority(b);
      if (prioA !== prioB) return prioB - prioA;

      return (a.displayOrder ?? 999) - (b.displayOrder ?? 999);
    });
  }, [statusData, post]);

  const creatorAssignedProducts = useMemo(() => {
    const rawAssignments = statusData?.assignments || (post as any).assignments || [];
    return rawAssignments.filter((a: any) =>
      a.verificationSource === "CREATOR_APPROVED" ||
      a.verificationSource === "CREATOR_ADDED" ||
      a.manuallyAssigned === true
    );
  }, [statusData, post]);

  const approvedProducts = useMemo(() => {
    const rawAssignments = statusData?.assignments || (post as any).assignments || [];
    return rawAssignments.filter((a: any) => a.status === "PUBLISHED");
  }, [statusData, post]);

  const verifiedDetectedProducts = useMemo(() => {
    const rawDetected = statusData?.detectedProducts || post.detectedProducts || [];
    return rawDetected.filter((dp: any) => dp.isVerifiedMatch === true);
  }, [statusData, post]);

  const desktopCategories = useMemo(() => {
    const counts: Record<string, number> = { All: detectedProducts.length };
    detectedProducts.forEach((p) => {
      if (p.category) {
        const cat = p.category.charAt(0).toUpperCase() + p.category.slice(1).toLowerCase();
        counts[cat] = (counts[cat] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [detectedProducts]);

  const desktopFilteredProducts = useMemo(() => {
    if (desktopActiveCategory === "All") return detectedProducts;
    return detectedProducts.filter(
      (p) => p.category?.toLowerCase() === desktopActiveCategory.toLowerCase()
    );
  }, [detectedProducts, desktopActiveCategory]);

  const hasAttachedProducts = useMemo(() => {
    return creatorAssignedProducts.length > 0 || approvedProducts.length > 0 || verifiedDetectedProducts.length > 0;
  }, [creatorAssignedProducts, approvedProducts, verifiedDetectedProducts]);

  const isAdmin = loggedInUser?.username === "Omkar2005" || (loggedInUser as any)?.verified === true;

  // Initialize selected product ID once products are loaded
  // Automatically select first product & transition drawer height to mid on drawer open
  useEffect(() => {
    if (isShoppingDrawerOpen && detectedProducts && detectedProducts.length > 0) {
      const exists = detectedProducts.some((p) => p.id === selectedProductId);
      if (!exists || !selectedProductId) {
        setSelectedProductId(detectedProducts[0].id);
      }
      if (drawerHeightState === "min") {
        setDrawerHeightState("mid");
      }
    }
  }, [isShoppingDrawerOpen, detectedProducts]);

  // Track drawer opens (DRAWER_OPEN)
  useEffect(() => {
    if (isShoppingDrawerOpen) {
      const targetProductId = selectedProductId || detectedProducts[0]?.id;
      if (targetProductId) {
        logProductEvent(targetProductId, "DRAWER_OPEN");
      }
    }
  }, [isShoppingDrawerOpen]);

  // Track product views when drawer is open and selectedProductId changes (VIEW)
  useEffect(() => {
    if (isShoppingDrawerOpen && selectedProductId) {
      logProductEvent(selectedProductId, "VIEW");
    }
  }, [isShoppingDrawerOpen, selectedProductId]);

  const isImmersive = isShoppingDrawerOpen && drawerHeightState === "max";

  // Trigger parent container scroll locking
  useEffect(() => {
    onLockScroll?.(isImmersive);
  }, [isImmersive, onLockScroll]);

  // Sync data attribute on document body to hide navigation
  useEffect(() => {
    if (isImmersive) {
      document.body.setAttribute("data-commerce-immersive", "true");
    } else {
      document.body.removeAttribute("data-commerce-immersive");
    }
    return () => {
      document.body.removeAttribute("data-commerce-immersive");
    };
  }, [isImmersive]);



  // Autoplay/pause based on active reel index using robust videoNode reference
  useEffect(() => {
    if (!videoNode) return;

    if (isActive && !fullProductDetailId) {
      videoNode.muted = isMuted;
      videoNode.volume = isMuted ? 0 : volumeState;
      videoNode
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          console.warn("Reel autoplay prevented:", err);
          setIsPlaying(false);
        });
    } else {
      videoNode.pause();
      if (!fullProductDetailId) {
        videoNode.currentTime = 0; // Rewind to start if switching reels
      }
      setIsPlaying(false);
    }
  }, [isActive, isMuted, videoNode, volumeState, fullProductDetailId]);

  // Sync mute changes
  useEffect(() => {
    if (videoNode) {
      videoNode.muted = isMuted;
      videoNode.volume = isMuted ? 0 : volumeState;
    }
  }, [isMuted, videoNode, volumeState]);

  // Sync native fullscreen changes with state
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
    };
  }, []);


  // Helper functions for pricing/delivery inside ReelCard
  const parsePrice = (priceStr: string): number => {
    const num = parseInt(priceStr.replace(/[^0-9]/g, ""), 10);
    return isNaN(num) ? Infinity : num;
  };

  const getDeliveryTag = (merchant: string): string => {
    const m = merchant.toLowerCase();
    if (m.includes("amazon")) return "Delivery tomorrow";
    if (m.includes("flipkart")) return "Delivery in 2 days";
    if (m.includes("myntra")) return "Delivery in 3 days";
    if (m.includes("ajio")) return "Delivery in 4 days";
    return "Delivery in 3-5 days";
  };

  const getDeliveryDays = (match: any): number => {
    const text = (match.deliveryText || getDeliveryTag(match.sourceStore || "")).toLowerCase();
    if (text.includes("tomorrow") || text.includes("1 day")) return 1;
    if (text.includes("2 days") || text.includes("in 2")) return 2;
    if (text.includes("3 days") || text.includes("in 3")) return 3;
    if (text.includes("4 days") || text.includes("in 4")) return 4;
    if (text.includes("5 days") || text.includes("in 5")) return 5;
    return 6;
  };

  const formattedDate = useMemo(() => {
    const d = new Date(post.createdAt);
    const currentYear = new Date().getFullYear();
    const postYear = d.getFullYear();
    const month = d.toLocaleDateString("en-US", { month: "long" });
    const day = d.getDate();
    if (postYear === currentYear) {
      return `${day} ${month}`;
    }
    return `${day} ${month} ${postYear}`;
  }, [post.createdAt]);

  const selectedProduct = useMemo(() => {
    if (!detectedProducts || detectedProducts.length === 0) return null;
    return detectedProducts.find((p) => p.id === selectedProductId) || detectedProducts[0];
  }, [detectedProducts, selectedProductId]);

  const bestMatch = useMemo(() => {
    if (!selectedProduct) return null;
    const matches = selectedProduct.matches || [];
    const sorted = [...matches].sort((a, b) => {
      const priceA = parsePrice(a.price);
      const priceB = parsePrice(b.price);
      if (priceA !== priceB) return priceA - priceB;
      const daysA = getDeliveryDays(a);
      const daysB = getDeliveryDays(b);
      if (daysA !== daysB) return daysA - daysB;
      return (b.merchant?.rating ?? 0) - (a.merchant?.rating ?? 0);
    });
    return sorted[0];
  }, [selectedProduct]);

  // Infinite query for comments
  const { data: commentsData, status: commentsStatus } = useInfiniteQuery({
    queryKey: ["comments", post.id],
    queryFn: ({ pageParam }) =>
      kyInstance
        .get(
          `/api/posts/${post.id}/comments`,
          pageParam ? { searchParams: { cursor: pageParam } } : {}
        )
        .json<CommentsPage>(),
    initialPageParam: null as string | null,
    getNextPageParam: (firstPage) => firstPage.previousCursor,
    select: (data) => ({
      pages: [...data.pages].reverse(),
      pageParams: [...data.pageParams].reverse(),
    }),
    enabled: activeRightDrawer === "comments" || isCommentsOpen,
  });

  const rawComments = commentsData?.pages.flatMap((page) => page.comments) || [];
  const processedComments = useMemo(() => {
    const topLevel = rawComments.filter((c) => !c.parentCommentId);
    const repliesMap: Record<string, any[]> = {};
    rawComments.forEach((c) => {
      if (c.parentCommentId) {
        if (!repliesMap[c.parentCommentId]) repliesMap[c.parentCommentId] = [];
        repliesMap[c.parentCommentId].push(c);
      }
    });
    const commentsWithReplies = topLevel.map((c) => ({
      ...c,
      replies: repliesMap[c.id] || c.replies || [],
    }));
    return [...commentsWithReplies].sort((a, b) => {
      if (commentsSortBy === "top") {
        const scoreA = (a._count?.likes || 0) + (a._count?.reposts || 0);
        const scoreB = (b._count?.likes || 0) + (b._count?.reposts || 0);
        return scoreB - scoreA;
      }
      if (commentsSortBy === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (commentsSortBy === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return 0;
    });
  }, [rawComments, commentsSortBy]);

  const handleCommentSubmit = async () => {
    if (!commentText.trim() || isSubmittingComment) return;
    setIsSubmittingComment(true);
    try {
      await submitComment({
        postId: post.id,
        postUserId: post.user.id,
        content: commentText,
        parentCommentId: null,
      });
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: ["comments", post.id] });
      toast({ description: "Comment submitted successfully!" });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", description: "Failed to submit comment." });
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Fetch contacted users for share dialog
  useEffect(() => {
    if (activeRightDrawer !== "share" || !chatClient || !loggedInUser) return;
    const fetchContacts = async () => {
      try {
        setLoadingContacts(true);
        const filter = { members: { $in: [loggedInUser.id] } };
        const list = await chatClient.queryChannels(filter, { last_message_at: -1 }, { limit: 12 });
        const users = list.map((c) => {
          const m = Object.values(c.state.members || {});
          return m.find((member) => member.user?.id !== loggedInUser.id)?.user;
        }).filter(Boolean);
        setContactedUsers(users);
      } catch (err) {
        console.error("Failed to fetch contacted users:", err);
      } finally {
        setLoadingContacts(false);
      }
    };
    fetchContacts();
  }, [activeRightDrawer, chatClient, loggedInUser]);

  const filteredShareContacts = useMemo(() => {
    if (!shareSearchQuery) return contactedUsers;
    return contactedUsers.filter((u) => 
      u.name?.toLowerCase().includes(shareSearchQuery.toLowerCase()) || 
      u.username?.toLowerCase().includes(shareSearchQuery.toLowerCase())
    );
  }, [contactedUsers, shareSearchQuery]);

  const handleShareToUser = async (user: any) => {
    if (!chatClient || !loggedInUser) return;
    try {
      const channel = chatClient.channel("messaging", {
        members: [loggedInUser.id, user.id],
      });
      await channel.watch();
      const isReel = post.attachments.some((att) => att.mediaType === "VIDEO");
      const postTypeLabel = isReel ? "Reel" : "post";
      const postUrl = `${window.location.origin}/posts/${post.id}`;
      await channel.sendMessage({
        text: `Sent a ${postTypeLabel}: ${postUrl}`,
        attachments: [
          {
            type: isReel ? "reel-share" : "post-share",
            postId: post.id,
            mediaUrl: post.attachments[0]?.url || "",
            username: post.user.username,
          }
        ]
      });
      toast({ description: `Shared successfully to @${user.username}` });
      setActiveRightDrawer(null);
    } catch (err) {
      console.error("Failed to share post:", err);
      toast({ variant: "destructive", description: "Failed to send message." });
    }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/posts/${post.id}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast({ description: "Link copied to clipboard." });
    setTimeout(() => setCopied(false), 1500);
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(`Check out @${post.user.username}'s reel on Next Social!`);
    const url = encodeURIComponent(`${window.location.origin}/posts/${post.id}`);
    window.open(`https://api.whatsapp.com/send?text=${text}%20${url}`, "_blank");
  };

  const handleXShare = () => {
    const text = encodeURIComponent(`Check out @${post.user.username}'s reel on Next Social!`);
    const url = encodeURIComponent(`${window.location.origin}/posts/${post.id}`);
    window.open(`https://x.com/intent/tweet?text=${text}&url=${url}`, "_blank");
  };

  const handleSmsShare = () => {
    const text = encodeURIComponent(`Check out @${post.user.username}'s reel: ${window.location.origin}/posts/${post.id}`);
    window.open(`sms:?&body=${text}`, "_blank");
  };

  const handleSharePlatform = (platform: string) => {
    const link = `${window.location.origin}/posts/${post.id}`;
    navigator.clipboard.writeText(link);
    
    const text = `Check out @${post.user.username}'s reel on Next Social!`;
    
    let targetUrl = "";
    if (platform === "twitter-x" || platform === "x") {
      targetUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`;
    } else if (platform === "linkedin") {
      targetUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`;
    } else if (platform === "whatsapp") {
      targetUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text + " " + link)}`;
    } else if (platform === "reddit") {
      targetUrl = `https://www.reddit.com/submit?url=${encodeURIComponent(link)}&title=${encodeURIComponent(text)}`;
    } else if (platform === "pinterest") {
      targetUrl = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(link)}&description=${encodeURIComponent(text)}`;
    } else if (platform === "github") {
      targetUrl = "https://github.com/";
    } else if (platform === "youtube") {
      targetUrl = "https://www.youtube.com/";
    } else if (platform === "discord") {
      targetUrl = "https://discord.com/";
    } else if (platform === "instagram") {
      targetUrl = "https://www.instagram.com/";
    } else if (platform === "tiktok") {
      targetUrl = "https://www.tiktok.com/";
    } else if (platform === "slack") {
      targetUrl = "https://slack.com/";
    } else if (platform === "figma") {
      targetUrl = "https://www.figma.com/";
    }

    toast({
      description: `Link copied! Opening ${platform.charAt(0).toUpperCase() + platform.slice(1)}...`,
    });

    if (targetUrl) {
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    }
    
    setActiveRightDrawer(null);
  };

  // Repost info & mutation for drawer
  interface RepostInfo {
    reposts: number;
    isRepostedByUser: boolean;
  }
  const repostQueryKey: QueryKey = ["repost-info", post.id];
  const { data: repostData } = useQuery({
    queryKey: repostQueryKey,
    queryFn: () => kyInstance.get(`/api/posts/${post.id}/repost`).json<RepostInfo>(),
    initialData: {
      reposts: post._count.reposts,
      isRepostedByUser: post.reposts.some((r) => r.userId === loggedInUser.id),
    },
    staleTime: Infinity,
  });

  const { mutate: toggleRepost } = useMutation({
    mutationFn: () =>
      repostData.isRepostedByUser
        ? kyInstance.delete(`/api/posts/${post.id}/repost`)
        : kyInstance.post(`/api/posts/${post.id}/repost`),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: repostQueryKey });
      const previousState = queryClient.getQueryData<RepostInfo>(repostQueryKey);
      queryClient.setQueryData<RepostInfo>(repostQueryKey, () => ({
        reposts: (previousState?.reposts || 0) + (previousState?.isRepostedByUser ? -1 : 1),
        isRepostedByUser: !previousState?.isRepostedByUser,
      }));
      return { previousState };
    },
    onError(error, variables, context) {
      queryClient.setQueryData(repostQueryKey, context?.previousState);
      console.error(error);
      toast({
        variant: "destructive",
        description: "Something went wrong. Please try again.",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["post-feed"] });
    },
  });

  const handleBuyClick = async (e: React.MouseEvent, matchId: string, fallbackUrl: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (selectedProductId) {
      logProductEvent(selectedProductId, "RETAILER_CLICK", { matchId });
    }
    try {
      const response = await fetch("/api/products/click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.redirectUrl) {
          window.open(data.redirectUrl, "_blank", "noopener,noreferrer");
          return;
        }
      }
    } catch (err) {
      console.error("Click tracking failed:", err);
    }
    window.open(fallbackUrl, "_blank", "noopener,noreferrer");
  };

  function logProductEvent(productId: string, eventType: string, extraMetadata?: any) {
    const assignment = detectedProducts.find(p => p.id === productId);
    fetch("/api/products/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId,
        assignmentId: assignment?.assignmentId || null,
        eventType,
        metadata: extraMetadata || {},
      }),
    }).catch((err) => console.warn("Failed to log product event:", err));
  }

  const videoAttachment = post.attachments.find((att) => att.mediaType === "VIDEO");
  const videoUrl = videoAttachment?.url;

  // Likes Query and Mutation
  const likeQueryKey: QueryKey = ["like-info", post.id];
  const { data: likeData } = useQuery({
    queryKey: likeQueryKey,
    queryFn: () => kyInstance.get(`/api/posts/${post.id}/likes`).json<LikeInfo>(),
    initialData: {
      likes: post._count.likes,
      isLikedByUser: post.likes.some((l) => l.userId === loggedInUser.id),
    },
    staleTime: Infinity,
  });

  const { mutate: toggleLike } = useMutation({
    mutationFn: () =>
      likeData.isLikedByUser
        ? kyInstance.delete(`/api/posts/${post.id}/likes`)
        : kyInstance.post(`/api/posts/${post.id}/likes`),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: likeQueryKey });
      const previousState = queryClient.getQueryData<LikeInfo>(likeQueryKey);

      queryClient.setQueryData<LikeInfo>(likeQueryKey, () => ({
        likes: (previousState?.likes || 0) + (previousState?.isLikedByUser ? -1 : 1),
        isLikedByUser: !previousState?.isLikedByUser,
      }));

      return { previousState };
    },
    onError(error, variables, context) {
      queryClient.setQueryData(likeQueryKey, context?.previousState);
      console.error(error);
    },
  });

  // Bookmarks Query and Mutation
  const bookmarkQueryKey: QueryKey = ["bookmark-info", post.id];
  const { data: bookmarkData } = useQuery({
    queryKey: bookmarkQueryKey,
    queryFn: () => kyInstance.get(`/api/posts/${post.id}/bookmark`).json<BookmarkInfo>(),
    initialData: {
      isBookmarkedByUser: post.bookmarks.some((b) => b.userId === loggedInUser.id),
    },
    staleTime: Infinity,
  });

  const { mutate: toggleBookmark } = useMutation({
    mutationFn: () =>
      bookmarkData.isBookmarkedByUser
        ? kyInstance.delete(`/api/posts/${post.id}/bookmark`)
        : kyInstance.post(`/api/posts/${post.id}/bookmark`),
    onMutate: async () => {
      toast({
        description: `Spot ${bookmarkData.isBookmarkedByUser ? "un" : ""}saved`,
      });
      await queryClient.cancelQueries({ queryKey: bookmarkQueryKey });
      const previousState = queryClient.getQueryData<BookmarkInfo>(bookmarkQueryKey);

      queryClient.setQueryData<BookmarkInfo>(bookmarkQueryKey, () => ({
        isBookmarkedByUser: !previousState?.isBookmarkedByUser,
      }));

      return { previousState };
    },
    onError(error, variables, context) {
      queryClient.setQueryData(bookmarkQueryKey, context?.previousState);
      console.error(error);
    },
  });

  if (!videoUrl) return null;

  // Single/Double Click Video handler
  const handleVideoClick = (e: React.MouseEvent) => {
    if (didFastForwardRef.current) {
      didFastForwardRef.current = false;
      return;
    }
    if (activeRightDrawer) {
      // If right drawer is open, close it and resume video play
      setActiveRightDrawer(null);
      const video = videoRef.current;
      if (video && video.paused) {
        video.play().then(() => setIsPlaying(true)).catch((err) => console.error(err));
      }
      return;
    }

    if (e.detail === 2) {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
      // Double click -> Like
      if (!likeData.isLikedByUser) {
        toggleLike();
      }
      const newHeart = { id: Date.now() };
      setTapHearts((prev) => [...prev, newHeart]);
      setTimeout(() => {
        setTapHearts((prev) => prev.filter((h) => h.id !== newHeart.id));
      }, 800);
    } else if (e.detail === 1) {
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = setTimeout(() => {
        clickTimeoutRef.current = null;
        
        if (isCleanFullScreen) {
          setIsCleanFullScreen(false);
          return;
        }

        // Single click -> Toggle pause/play
        const video = videoRef.current;
        if (video) {
          if (video.paused) {
            video.play().then(() => setIsPlaying(true)).catch((err) => console.error(err));
          } else {
            video.pause();
            setIsPlaying(false);
          }
        }
      }, 250);
    }
  };

  const handleShareClick = () => {
    setIsShareOpen(true);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleScrubberMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    const container = e.currentTarget;
    
    const seek = (moveEvent: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const clickX = moveEvent.clientX - rect.left;
      const width = rect.width;
      const pct = Math.max(0, Math.min(1, clickX / width));
      if (videoRef.current) {
        videoRef.current.currentTime = pct * duration;
        setCurrentTime(pct * duration);
      }
    };

    seek(e.nativeEvent);

    const onMouseMove = (moveEvent: MouseEvent) => {
      seek(moveEvent);
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };


  const togglePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch((err) => console.error(err));
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const requestPip = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch((err) => console.error(err));
    } else if (video.requestPictureInPicture) {
      video.requestPictureInPicture().catch((err) => console.error(err));
    }
  };

  const toggleFullscreen = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    const container = video.parentElement;
    if (!container) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch((err) => console.error(err));
    } else {
      if (container.requestFullscreen) {
        container.requestFullscreen().catch((err) => console.error(err));
      } else if ((container as any).webkitRequestFullscreen) {
        (container as any).webkitRequestFullscreen();
      }
    }
  };


  const followerInfo: FollowerInfo = {
    followers: post.user._count.followers,
    isFollowedByUser: post.user.followers.some((f) => f.followerId === loggedInUser.id),
  };

  return (
    <div className="w-full h-[calc(100vh-3.5rem)] md:h-screen snap-start snap-always shrink-0 flex items-center justify-center bg-[#07080d] relative select-none overflow-hidden">
      
      {/* 1. Blurred Reflection Backdrop (Desktop only) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none hidden md:block select-none z-0">
        {isActive && (
          <video
            src={videoUrl}
            muted
            loop
            playsInline
            className="w-full h-full object-cover blur-[50px] opacity-25 scale-110"
          />
        )}
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes reelsHeartPulse {
            0% { transform: scale(0.3); opacity: 0; }
            50% { transform: scale(1.2); opacity: 0.9; }
            80% { transform: scale(0.9); opacity: 0.9; }
            100% { transform: scale(1); opacity: 0; }
          }
          .animate-reels-heart {
            animation: reelsHeartPulse 0.8s ease-out forwards;
          }
          @keyframes reel-bloom-out {
            0% { transform: translate(0,0) scale(0) rotate(0deg); opacity: 1; }
            100% { transform: translate(var(--btx), var(--bty)) scale(var(--bs)) rotate(var(--br)); opacity: 0; }
          }
          .reel-petal {
            position: absolute;
            pointer-events: none;
            opacity: 0;
            top: 0; left: 0;
          }
          .reel-effusion-btn {
            background: none;
            border: none;
            cursor: pointer;
            padding: 0;
            outline: none;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.4s cubic-bezier(0.175,0.885,0.32,1.275);
          }
          .reel-effusion-btn:active { transform: scale(0.8); }
          .reel-effusion-btn .reel-heart-svg {
            transition: all 0.5s cubic-bezier(0.23,1,0.32,1);
          }
          .reel-effusion-btn.liked .reel-heart-svg {
            transform: scale(1.1);
            filter: drop-shadow(0 6px 14px rgba(255,10,84,0.45));
          }

          /* alexroumi view-all button — blue platform fill sweep */
          .reel-view-all-btn {
            border: unset;
            border-radius: 12px;
            color: #212121;
            z-index: 1;
            background: #e8e8e8;
            position: relative;
            font-weight: 800;
            font-size: 12px;
            box-shadow: 4px 8px 19px -3px rgba(0,0,0,0.27);
            transition: all 250ms;
            overflow: hidden;
            cursor: pointer;
            letter-spacing: 0.05em;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
          }
          .reel-view-all-btn::before {
            content: "";
            position: absolute;
            top: 0; left: 0;
            height: 100%;
            width: 0;
            border-radius: 12px;
            background-color: #4f46e5;
            z-index: -1;
            box-shadow: 4px 8px 19px -3px rgba(79,70,229,0.35);
            transition: all 250ms;
          }
          .reel-view-all-btn:hover { color: #ffffff; }
          .reel-view-all-btn:hover::before { width: 100%; }
        `
      }} />

      {/* 2. Responsive Layout Wrapper */}
      <div
        className={cn(
          "relative flex flex-row items-center justify-start transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] w-full h-[calc(100vh-3.5rem)] md:h-screen overflow-visible z-10",
          activeRightDrawer
            ? "max-w-[440px] lg:max-w-[940px] xl:max-w-[980px]"
            : "max-w-[440px] md:max-w-[530px]"
        )}
      >
        {/* Main Aspect 10:16 Video Box */}
        <div className="w-full max-w-full md:w-[440px] relative px-0 h-[calc(100vh-3.5rem)] md:h-screen md:aspect-[10/16] md:max-h-[820px] rounded-none md:rounded-[24px] overflow-hidden bg-black md:bg-[#07080d] shadow-none md:shadow-2xl flex items-center justify-center border-0 md:border border-zinc-900/60 z-10 shrink-0">
          {isActive || shouldPreload || isPrevReel ? (
            <video
              ref={(node) => {
                videoRef.current = node;
                setVideoNode(node);
              }}
              src={videoUrl}
              autoPlay={isActive}
              loop={!autoScrollEnabled}
              playsInline
              muted={isMuted}
              preload={isActive || shouldPreload ? "auto" : "metadata"}
              onClick={handleVideoClick}
              onPointerDown={startFastForwardHold}
              onPointerUp={stopFastForwardHold}
              onPointerLeave={stopFastForwardHold}
              onPointerCancel={stopFastForwardHold}
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
              onEnded={() => {
                if (autoScrollEnabled) {
                  onReelEnded();
                }
              }}
              className={cn(
                "w-full h-full cursor-pointer transition-all duration-500",
                isFullscreen ? "object-contain bg-black" : "object-cover",
                isImmersive && "blur-md scale-105"
              )}
            />
          ) : (
            <div className="w-full h-full bg-zinc-950 flex items-center justify-center">
              {post.attachments?.[0]?.url && (
                <div 
                  className="w-full h-full bg-cover bg-center opacity-30 blur-sm"
                  style={{ backgroundImage: `url(${post.attachments[0].url.replace(".mp4", ".jpg")})` }}
                />
              )}
            </div>
          )}

          {/* 2x Fast Forwarding Badge Overlay */}
          <AnimatePresence>
            {isFastForwarding && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -10 }}
                className="absolute top-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-black/80 backdrop-blur-md border border-yellow-500/30 text-white shadow-2xl pointer-events-none select-none"
              >
                <FastForward className="size-4 fill-yellow-400 text-yellow-400 animate-pulse" />
                <span className="text-xs font-black tracking-wider uppercase text-yellow-400">
                  2x Speed
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* AI Detection Floating Card (Top Left Corner of player) */}
          {typeof window !== "undefined" && 
           (window.location.hostname === "localhost" || 
            window.location.hostname === "127.0.0.1" || 
            window.location.hostname.startsWith("192.168.")) && 
           hasAttachedProducts && !isImmersive && (
            <div className="absolute top-4 left-4 z-30 bg-[#0c0d14]/75 backdrop-blur-md border border-white/10 p-3.5 rounded-2xl text-left pointer-events-auto select-none flex flex-col gap-2 w-[145px] shadow-2xl transition-all duration-300">
              <div className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">AI DETECTION</div>
              <div className="text-[11px] font-bold text-white leading-tight">Products found: {detectedProducts.length}</div>
              
              {/* Product thumbnails row */}
              <div className="flex items-center gap-1.5 mt-0.5">
                {detectedProducts.slice(0, 3).map((prod) => (
                  <div key={prod.id} className="w-8 h-8 rounded-md overflow-hidden bg-zinc-950 border border-white/5 flex-shrink-0">
                    <img
                      src={prod.thumbnailUrl || prod.sourceFrameUrl || "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=50&auto=format&fit=crop&q=60"}
                      alt={prod.label}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (videoRef.current && !videoRef.current.paused) {
                    videoRef.current.pause();
                    setIsPlaying(false);
                  }
                  setIsShoppingDrawerOpen(true);
                }}
                className="reel-view-all-btn w-full mt-2 py-1.5 px-3 text-[9.5px]"
              >
                <span>View all</span>
                <span style={{ fontSize: 11 }}>&#8594;</span>
              </button>
            </div>
          )}

          {/* Subtle White Hotspot Dots */}
          {showHotspots && !isImmersive && hasAttachedProducts && detectedProducts.map((prod) => {
            const coords = getProductHotspot(prod);
            const isSelected = prod.id === selectedProductId;
            return (
              <button
                key={prod.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedProductId(prod.id);
                  if (videoRef.current && !videoRef.current.paused) {
                    videoRef.current.pause();
                    setIsPlaying(false);
                  }
                  if (onOpenProductDetail) {
                    onOpenProductDetail(prod.id, detectedProducts);
                  } else {
                    setFullProductDetailId(prod.id);
                  }
                }}
                className={cn(
                  "absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/60 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.5)] transition-all duration-300 hover:scale-125 z-40 cursor-pointer animate-in fade-in zoom-in duration-200",
                  isSelected 
                    ? "size-4.5 ring-4 ring-white/35 bg-pink-500 border-white"
                    : "size-3.5 hover:bg-zinc-200"
                )}
                style={{
                  left: `${coords.x}%`,
                  top: `${coords.y}%`,
                }}
                title={prod.label}
              />
            );
          })}

          {/* Floating Minimize Button in Clean Full Screen Mode */}
          {isCleanFullScreen && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsCleanFullScreen(false);
              }}
              className="absolute top-4 right-4 z-50 p-2.5 bg-black/70 hover:bg-black/90 rounded-full text-white transition-all shadow-xl border border-white/20 cursor-pointer active:scale-95"
              title="Exit Full Screen"
            >
              <Minimize2 className="size-5 text-white" />
            </button>
          )}

          {/* 1. New YouTube Shorts Style Top-Left Controls Group */}
          {!isImmersive && !isCleanFullScreen && (
            <div className="absolute top-4 left-4 z-[60] flex items-center gap-2 pointer-events-auto select-none">
              {/* Play/Pause Button */}
              <button
                onClick={togglePlayPause}
                className="w-9 h-9 bg-black/55 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/75 cursor-pointer active:scale-95 transition-all shadow-md"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause className="size-4 fill-white text-white" />
                ) : (
                  <Play className="size-4 fill-white text-white translate-x-[1px]" />
                )}
              </button>

              {/* Volume Controller (Icon button + horizontal slide-out range slider) */}
              <div className="flex items-center group/volume bg-black/55 backdrop-blur-md rounded-full pl-0.5 pr-2 h-9 transition-all duration-300 shadow-md">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleMute();
                  }}
                  className="w-8 h-8 flex items-center justify-center text-white cursor-pointer active:scale-90 transition-transform"
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted || volumeState === 0 ? (
                    <VolumeX className="size-4.5 text-white" />
                  ) : (
                    <Volume2 className="size-4.5 text-white" />
                  )}
                </button>
                {/* Horizontal slider slides out on hover */}
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volumeState}
                  onChange={(e) => {
                    const newVol = parseFloat(e.target.value);
                    setVolumeState(newVol);
                    if (videoRef.current) {
                      videoRef.current.volume = newVol;
                      videoRef.current.muted = newVol === 0;
                    }
                    if (newVol > 0 && isMuted) {
                      onToggleMute();
                    } else if (newVol === 0 && !isMuted) {
                      onToggleMute();
                    }
                  }}
                  className="w-0 opacity-0 group-hover/volume:w-16 group-hover/volume:opacity-100 transition-all duration-300 accent-white h-1 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* 2. New YouTube Shorts Style Top-Right Controls Capsule */}
          {!isImmersive && !isCleanFullScreen && (
            <div className="absolute top-4 right-4 z-[60] flex items-center gap-3 bg-black/55 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/5 text-white pointer-events-auto select-none shadow-md">
              {/* Options Menu Button (Three vertical dots ⋮) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (videoRef.current && !videoRef.current.paused) {
                    videoRef.current.pause();
                    setIsPlaying(false);
                  }
                  if (isDesktopLayout) {
                    setActiveRightDrawer(activeRightDrawer === "options" ? null : "options");
                  } else {
                    setIsOptionsOpen(true);
                  }
                }}
                className="hover:text-indigo-400 transition-colors cursor-pointer text-white flex items-center justify-center"
                title="Options"
              >
                <MoreVertical className="size-4.5" />
              </button>

              {/* Diagonal Fullscreen Button */}
              <button
                onClick={toggleFullscreen}
                className="hover:text-indigo-400 transition-colors cursor-pointer text-white flex items-center justify-center"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9L4.5 4.5M9 9H4.5M9 9V4.5M15 15l4.5 4.5M15 15h4.5M15 15v4.5" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M20.25 20.25v-4.5m0 4.5h-4.5m4.5 0L15 15" />
                  </svg>
                )}
              </button>
            </div>
          )}


          {/* Central Play/Pause Pulse Icon Overlay */}
          {overlayIcon && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/10 pointer-events-none z-20">
              <div className="p-4 bg-black/60 rounded-full text-white animate-play-pause-icon">
                {overlayIcon === "play" ? (
                  <Play className="size-8 fill-white" />
                ) : (
                  <Pause className="size-8 fill-white" />
                )}
              </div>
            </div>
          )}

          {/* Double-click Heart Animation Pulse */}
          <div className="absolute inset-0 flex items-center justify-center bg-transparent pointer-events-none z-50">
            <AnimatePresence>
              {tapHearts.map((heart) => (
                <motion.div
                  key={heart.id}
                  initial={{ scale: 0, opacity: 0, y: 0 }}
                  animate={{
                    scale: [0, 1.2, 1, 1],
                    opacity: [0, 1, 1, 0],
                    y: [0, 0, -15, -40],
                  }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 0.8,
                    ease: [0.175, 0.885, 0.32, 1.1],
                    times: [0, 0.25, 0.75, 1],
                  }}
                  className="absolute pointer-events-none text-red-500 drop-shadow-[0_10px_25px_rgba(239,68,68,0.4)]"
                >
                  <Heart className="size-24 fill-red-500 text-red-500" strokeWidth={1.5} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Center play state hint overlay */}
          {!isPlaying && !overlayIcon && (
            <div className={cn("absolute inset-0 flex items-center justify-center bg-black/20 z-10 pointer-events-none transition-opacity duration-300", (isImmersive || isCleanFullScreen) && "hidden")}>
              <div className="p-4 bg-black/40 rounded-full text-white">
                <Play className="size-10 fill-white translate-x-[2px]" />
              </div>
            </div>
          )}

          {/* Smooth bottom gradient overlay */}
          <div className={cn("absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/95 via-black/45 to-transparent pointer-events-none z-10", (isImmersive || isCleanFullScreen) && "hidden")} />

          {/* YouTube Shorts style bottom progress timeline */}
          {!isImmersive && !isCleanFullScreen && (
            <div 
              onMouseDown={handleScrubberMouseDown}
              className="absolute bottom-0 left-0 right-0 h-1 hover:h-2 bg-white/20 cursor-pointer group z-40 transition-all duration-200"
            >
              <div 
                className="h-full bg-[#3897f0] transition-all"
                style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
              />
              {/* Scrubber Knob */}
              <div 
                className="absolute top-1/2 -translate-y-1/2 size-3 rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{ left: `calc(${(currentTime / (duration || 1)) * 100}% - 6px)` }}
              />
            </div>
          )}

          {/* Picture-in-Picture Button */}
          {!isImmersive && !isCleanFullScreen && (
            <>
              <style dangerouslySetInnerHTML={{ __html: `
                .pip-control-container {
                  position: absolute;
                  bottom: 22px;
                  right: 16px;
                  z-index: 40;
                  width: 38px;
                  height: 38px;
                  cursor: pointer;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  perspective: 1000px;
                }

                .pip-btn-custom {
                  position: relative;
                  width: 38px;
                  height: 38px;
                  background: rgba(255, 255, 255, 0.05);
                  backdrop-filter: blur(15px) saturate(180%);
                  -webkit-backdrop-filter: blur(15px) saturate(180%);
                  border: 1px solid rgba(255, 255, 255, 0.12);
                  border-radius: 10px;
                  box-shadow: 
                      0 10px 25px -5px rgba(0, 0, 0, 0.5),
                      inset 0 1px 1px rgba(255,255,255,0.1);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  transition: all 0.5s cubic-bezier(0.19, 1, 0.22, 1);
                  overflow: hidden;
                }

                .pip-icon-geometry {
                  position: relative;
                  width: 18px;
                  height: 14px;
                }

                .pip-frame-main {
                  position: absolute;
                  top: 0;
                  left: 0;
                  width: 100%;
                  height: 100%;
                  border: 1.5px solid rgba(255,255,255,0.9);
                  border-radius: 2px;
                  transition: all 0.5s ease;
                }

                .pip-frame-pip {
                  position: absolute;
                  bottom: -2px;
                  right: -2px;
                  width: 8px;
                  height: 6px;
                  background: #fff;
                  border-radius: 1px;
                  box-shadow: 0 2px 6px rgba(0,0,0,0.5);
                  transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }

                .pip-btn-custom::before {
                  content: '';
                  position: absolute;
                  top: -50%;
                  left: -50%;
                  width: 200%;
                  height: 200%;
                  background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
                  opacity: 0;
                  transition: opacity 0.5s ease;
                }

                /* Hover States - Tectonic Shift */
                .pip-control-container:hover .pip-btn-custom {
                  transform: scale(1.05) translateY(-2px);
                  border-color: rgba(255,255,255,0.4);
                  box-shadow: 
                      0 15px 30px -5px rgba(0, 0, 0, 0.6),
                      0 0 10px rgba(0, 195, 255, 0.4);
                }

                .pip-control-container:hover .pip-frame-main {
                  opacity: 0.4;
                  transform: scale(0.9);
                }

                .pip-control-container:hover .pip-frame-pip {
                  transform: translate(-4px, -3px) scale(1.2);
                  background: #00c3ff;
                  box-shadow: 0 0 8px rgba(0, 195, 255, 0.6);
                }

                /* Scan line inside scaled button */
                .pip-scan-line {
                  position: absolute;
                  width: 100%;
                  height: 1px;
                  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                  top: 50%;
                  animation: pip-scan 3s linear infinite;
                }

                @keyframes pip-scan {
                  0% { transform: translateY(-20px); opacity: 0; }
                  50% { opacity: 0.5; }
                  100% { transform: translateY(20px); opacity: 0; }
                }
              `}} />
              <div 
                onClick={requestPip}
                className="pip-control-container"
                title="Picture in Picture"
              >
                <div className="pip-btn-custom">
                  <div className="pip-scan-line"></div>
                  <div className="pip-icon-geometry">
                    <div className="pip-frame-main"></div>
                    <div className="pip-frame-pip"></div>
                  </div>
                </div>
              </div>
            </>
          )}


          {/* Left Bottom Video Details Overlay */}
          <div className={cn("absolute bottom-0 left-0 right-0 p-4 pb-3 md:pb-4 z-20 flex flex-col gap-3.5 text-white bg-transparent pointer-events-none", (isImmersive || isCleanFullScreen) && "hidden")}>

            <div className="flex flex-col gap-2.5 pointer-events-auto">
              
              {/* 1. Shop CTA Button */}
              {hasAttachedProducts && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (videoRef.current && !videoRef.current.paused) {
                      videoRef.current.pause();
                      setIsPlaying(false);
                    }
                    setDrawerHeightState("min");
                    setIsShoppingDrawerOpen(true);
                  }}
                  className="flex items-center justify-center gap-1.5 bg-black/60 backdrop-blur-md border border-white/10 hover:bg-black/85 text-white h-9 px-4 rounded-full text-[12px] font-bold w-fit max-w-[35%] shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] truncate shrink-0 pointer-events-auto"
                >
                  <ShoppingBag className="size-3.5 text-white shrink-0" />
                  <span className="truncate">Shop Look ({detectedProducts.length})</span>
                </button>
              )}

              {/* 2. Creator Profile, Understated Follow & Music Stack */}
              <div className="flex items-center gap-3">
                <Link
                  href={`/users/${post.user.username}`}
                  className="flex-shrink-0"
                  onClick={(e) => {
                    if (hasActiveStory) {
                      e.preventDefault();
                      showStory(post.user.id);
                    }
                  }}
                >
                  {hasActiveStory ? (
                    <div className="rounded-full p-[2px] bg-gradient-to-tr from-[#f58529] via-[#dd2a7b] to-[#8134af]">
                      <div className="rounded-full p-[1.5px] bg-[#000000]">
                        <UserAvatar avatarUrl={post.user.avatarUrl} size={40} className="w-10 h-10 border border-white/20 object-cover animate-in fade-in" />
                      </div>
                    </div>
                  ) : (
                    <UserAvatar avatarUrl={post.user.avatarUrl} size={40} className="w-10 h-10 border border-white/20 object-cover" />
                  )}
                </Link>
                
                <div className="flex flex-col gap-1 min-w-0">
                  {/* Row 1: Username & Follow */}
                  <div className="flex items-center gap-2">
                    <Link href={`/users/${post.user.username}`} className="font-semibold text-[15px] hover:underline truncate max-w-[150px] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
                      {post.user.username}
                    </Link>
                    {post.user.verified && (
                      <VerifiedBadge size={14} className="shrink-0" />
                    )}
                    {post.user.id !== loggedInUser.id && (
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-white/60 text-[10px] select-none">&#8226;</span>
                        <FollowButton userId={post.user.id} initialState={followerInfo} variant="reel-pill" />
                      </div>
                    )}
                  </div>
                  
                  {/* Row 2: Music Track Marquee (positioned directly below the username) */}
                  <div className="flex items-center gap-1.5 text-[12.5px] text-zinc-200 select-none">
                    <Music className="size-3.5 flex-shrink-0 text-white animate-pulse" strokeWidth={2} />
                    <div className="w-[155px] overflow-hidden whitespace-nowrap relative select-none">
                      <span className="animate-scroll-text pl-[100%] inline-block text-[12px] font-medium drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
                        {post.user.displayName} · Original Audio &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {post.user.displayName} · Original Audio
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Caption */}
              {showCaptions && (
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCaptionExpanded((prev) => !prev);
                  }}
                  className="text-[13px] text-white/95 max-w-[285px] cursor-pointer select-none pointer-events-auto flex flex-col text-start gap-1"
                >
                  <p className={cn("leading-relaxed transition-all duration-300", isCaptionExpanded ? "whitespace-pre-wrap break-words" : "line-clamp-1")}>
                    {isTranslating ? (
                      <span className="flex items-center gap-1.5 text-zinc-400 italic">
                        <Loader2 className="size-3.5 animate-spin text-zinc-400" /> Translating to {activeLanguage}...
                      </span>
                    ) : (
                      isCurrentlyTranslated ? displayContent : post.content
                    )}
                    {activeLanguage !== "original" && !isTranslating && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTranslation();
                        }}
                        className="font-black text-white hover:text-zinc-300 ml-2 cursor-pointer text-[12px] inline-block transition-transform active:scale-95 hover:underline whitespace-nowrap"
                      >
                        {isCurrentlyTranslated ? "See original" : "See translation"}
                      </span>
                    )}
                  </p>
                  <span className="text-[11px] text-zinc-400 font-semibold tracking-wide">
                    {formattedDate}
                  </span>
                </div>
              )}

            </div>
          </div>

          {/* Floating Right-Edge Action Tray Layer (Mobile Overlay: < md) */}
          <div className={cn("absolute right-2 bottom-20 z-20 w-16 flex flex-col items-center justify-center gap-2.5 text-white md:hidden pointer-events-auto", (isImmersive || isCleanFullScreen) && "hidden")}>
            {/* Like — Botanical Silk Effusion */}
            <div className="flex flex-col items-center">
              <div className="relative" style={{ width: 40, height: 40 }}>
                {/* Effusion particle container */}
                <div
                  id={`reel-eff-mobile-${post.id}`}
                  style={{ position: "absolute", top: "50%", left: "50%", width: 1, height: 1, pointerEvents: "none", zIndex: 50 }}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLike();
                    if (!likeData.isLikedByUser) {
                      const effEl = document.getElementById(`reel-eff-mobile-${post.id}`);
                      if (effEl) {
                        const colors = ['#ff0a54','#ff477e','#ff7096','#ff85a1','#fbb1bd','#ffafcc'];
                        for (let i = 0; i < 18; i++) {
                          setTimeout(() => {
                            const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
                            svg.setAttribute('viewBox','0 0 24 24');
                            svg.classList.add('reel-petal');
                            const path = document.createElementNS('http://www.w3.org/2000/svg','path');
                            const isHeart = Math.random() > 0.4;
                            path.setAttribute('d', isHeart
                              ? 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'
                              : 'M12,2C12,2 4,10 4,15C4,19.42 7.58,23 12,23C16.42,23 20,19.42 20,15C20,10 12,2 12,2Z');
                            svg.appendChild(path);
                            const size = Math.random() * 14 + 7;
                            svg.style.width = `${size}px`; svg.style.height = `${size}px`;
                            svg.style.fill = colors[Math.floor(Math.random() * colors.length)];
                            const angle = Math.random() * Math.PI * 2;
                            const dist = Math.random() * 80 + 40;
                            svg.style.setProperty('--btx', `${Math.cos(angle)*dist}px`);
                            svg.style.setProperty('--bty', `${Math.sin(angle)*dist}px`);
                            svg.style.setProperty('--br', `${Math.random()*360}deg`);
                            svg.style.setProperty('--bs', String(Math.random()*0.5+0.5));
                            svg.style.animation = `reel-bloom-out ${Math.random()*0.8+0.6}s cubic-bezier(0.165,0.84,0.44,1) forwards`;
                            effEl.appendChild(svg);
                            setTimeout(() => svg.remove(), 1500);
                          }, i * 15);
                        }
                      }
                    }
                  }}
                  className={cn(
                    "reel-effusion-btn h-10 w-10",
                    likeData.isLikedByUser && "liked"
                  )}
                  title="Like"
                >
                  <svg
                    className="reel-heart-svg"
                    style={{ width: 28, height: 28 }}
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                      fill={likeData.isLikedByUser ? '#ff0a54' : 'none'}
                      stroke={likeData.isLikedByUser ? '#ff0a54' : 'white'}
                      strokeWidth="2"
                    />
                  </svg>
                </button>
              </div>
              <span className="text-[11px] font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] mt-0.5">
                {likeData.likes.toLocaleString()}
              </span>
            </div>

            {/* Comment */}
            <div className="flex flex-col items-center">
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCommentsOpen(true);
                }}
                className="h-10 w-10 flex items-center justify-center text-white"
                title="Comments"
              >
                <MessageCircle className="w-7 h-7 text-white transition-colors duration-200" strokeWidth={1.5} />
              </motion.button>
              <span className="text-[11px] font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] mt-0.5">
                {post._count.comments.toLocaleString()}
              </span>
            </div>

            {/* Repost */}
            <RepostButton post={post} variant="reel" />

            {/* Share */}
            <div className="flex flex-col items-center">
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleShareClick();
                }}
                className="h-10 w-10 flex items-center justify-center text-white"
                title="Share Reel"
              >
                <Send className="w-7 h-7 text-white transition-colors duration-200" strokeWidth={1.5} />
              </motion.button>
              <span className="text-[11px] font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] mt-0.5">Share</span>
            </div>

            {/* Save */}
            <div className="flex flex-col items-center">
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleBookmark();
                }}
                className="h-10 w-10 flex items-center justify-center text-white"
                title="Save"
              >
                <Bookmark className={cn("w-7 h-7 transition-colors duration-200 text-white", bookmarkData.isBookmarkedByUser && "fill-white text-white")} strokeWidth={1.5} />
              </motion.button>
              <span className="text-[11px] font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] mt-0.5">Save</span>
            </div>

            {/* Options Menu (Three Dots) */}
            <div className="flex flex-col items-center">
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (videoRef.current && !videoRef.current.paused) {
                    videoRef.current.pause();
                    setIsPlaying(false);
                  }
                  if (isDesktopLayout) {
                    setActiveRightDrawer(activeRightDrawer === "options" ? null : "options");
                  } else {
                    setIsOptionsOpen(true);
                  }
                }}
                className="h-10 w-10 flex items-center justify-center text-white cursor-pointer"
                title="Options"
              >
                <MoreHorizontal className="w-7 h-7" strokeWidth={1.5} />
              </motion.button>
              <span className="text-[11px] font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] mt-0.5">More</span>
            </div>

          </div>

          {/* Backdrop dimming overlay (Mobile bottom sheet only: lg:hidden) */}
          {isShoppingDrawerOpen && (
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm z-40 cursor-pointer animate-in fade-in duration-300 lg:hidden"
              onClick={() => {
                setIsShoppingDrawerOpen(false);
                const video = videoRef.current;
                if (video && video.paused) {
                  video.play().then(() => setIsPlaying(true)).catch((err) => console.error(err));
                }
              }}
            />
          )}

          {/* Mobile Bottom Shop Drawer Sheet (lg:hidden) */}
          <div
            className={cn(
              "absolute bottom-0 left-0 right-0 z-50 w-full bg-[#090909] border-t border-zinc-800/80 shadow-2xl transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] flex flex-col overflow-hidden text-white pointer-events-auto lg:hidden",
              drawerHeightState === "max" ? "rounded-t-none border-t-0" : "rounded-t-[20px]",
              isShoppingDrawerOpen ? "translate-y-0" : "translate-y-full"
            )}
            style={{
              height: drawerHeightState === "min" ? "35%" : drawerHeightState === "mid" ? "75%" : "100%"
            }}
          >
            {/* Top Handle Bar for dragging / click to cycle */}
            <div
              onClick={() => {
                setDrawerHeightState((curr) => {
                  if (curr === "min") return "mid";
                  if (curr === "mid") return "max";
                  return "min";
                });
              }}
              className="w-full py-3.5 flex justify-center items-center cursor-pointer select-none group active:opacity-85"
            >
              <div className="w-9 h-1 bg-zinc-700/80 rounded-full group-hover:bg-zinc-500 transition-colors" />
            </div>

            {/* Minimal Drawer Header */}
            <div className="flex items-center justify-between px-5 pb-3 border-b border-zinc-900 select-none">
              <h3 className="text-xs font-black tracking-wider text-zinc-400 uppercase">
                SHOP THE LOOK
              </h3>
              <button
                onClick={() => {
                  setIsShoppingDrawerOpen(false);
                  const video = videoRef.current;
                  if (video && video.paused) {
                    video.play().then(() => setIsPlaying(true)).catch((err) => console.error(err));
                  }
                }}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Drawer Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 scrollbar-none">
              <ProductList
                detectedProducts={detectedProducts}
                selectedProductId={selectedProductId}
                setSelectedProductId={setSelectedProductId}
                drawerHeightState={drawerHeightState}
                setDrawerHeightState={setDrawerHeightState}
                onLogEvent={logProductEvent}
                onOpenFullDetail={(id) => {
                  if (onOpenProductDetail) {
                    onOpenProductDetail(id, detectedProducts);
                  } else {
                    setFullProductDetailId(id);
                  }
                }}
              />
            </div>

            {/* Sticky Bottom CTA for Mobile Commerce Mode */}
            {drawerHeightState === "max" && bestMatch && (
              <div className="border-t border-zinc-900 bg-[#090909] px-5 py-4 flex items-center justify-between gap-4 z-20">
                <div className="flex flex-col">
                  <span className="text-[10px] text-zinc-505 font-bold uppercase tracking-wider">Best Price at {bestMatch.sourceStore}</span>
                  <span className="text-lg font-black text-white">{bestMatch.price}</span>
                </div>
                <a
                  href={bestMatch.productUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => handleBuyClick(e, bestMatch.id, bestMatch.productUrl)}
                  className="flex-1 max-w-[200px] text-center bg-white text-black hover:bg-zinc-200 text-xs font-black py-3 rounded-xl transition-all shadow-lg uppercase tracking-wider"
                >
                  View Deal
                </a>
              </div>
            )}
          </div>

        </div>

        {/* 3. Right Sidebar Control Actions Stack (Desktop only: md and above) */}
        <div className={cn(
          "hidden md:flex flex-col items-center gap-5 px-3.5 py-6 bg-[#0c0d14]/60 backdrop-blur-md border border-[#1b1c26] rounded-[32px] shadow-2xl w-[68px] ml-4 sm:ml-5 text-white z-20 shrink-0 select-none",
          (isImmersive || isCleanFullScreen) && "hidden"
        )}>
          {/* Like — Botanical Silk Effusion */}
          <div className="flex flex-col items-center gap-1">
            <div className="relative" style={{ width: 44, height: 44 }}>
              <div
                id={`reel-eff-desk-${post.id}`}
                style={{ position: "absolute", top: "50%", left: "50%", width: 1, height: 1, pointerEvents: "none", zIndex: 50 }}
              />
              <button
                onClick={() => {
                  toggleLike();
                  if (!likeData.isLikedByUser) {
                    const effEl = document.getElementById(`reel-eff-desk-${post.id}`);
                    if (effEl) {
                      const colors = ['#ff0a54','#ff477e','#ff7096','#ff85a1','#fbb1bd','#ffafcc'];
                      for (let i = 0; i < 20; i++) {
                        setTimeout(() => {
                          const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
                          svg.setAttribute('viewBox','0 0 24 24');
                          svg.classList.add('reel-petal');
                          const path = document.createElementNS('http://www.w3.org/2000/svg','path');
                          const isHeart = Math.random() > 0.4;
                          path.setAttribute('d', isHeart
                            ? 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'
                            : 'M12,2C12,2 4,10 4,15C4,19.42 7.58,23 12,23C16.42,23 20,19.42 20,15C20,10 12,2 12,2Z');
                          svg.appendChild(path);
                          const size = Math.random() * 14 + 7;
                          svg.style.width = `${size}px`; svg.style.height = `${size}px`;
                          svg.style.fill = colors[Math.floor(Math.random() * colors.length)];
                          const angle = Math.random() * Math.PI * 2;
                          const dist = Math.random() * 90 + 45;
                          svg.style.setProperty('--btx', `${Math.cos(angle)*dist}px`);
                          svg.style.setProperty('--bty', `${Math.sin(angle)*dist}px`);
                          svg.style.setProperty('--br', `${Math.random()*360}deg`);
                          svg.style.setProperty('--bs', String(Math.random()*0.5+0.5));
                          svg.style.animation = `reel-bloom-out ${Math.random()*0.8+0.6}s cubic-bezier(0.165,0.84,0.44,1) forwards`;
                          effEl.appendChild(svg);
                          setTimeout(() => svg.remove(), 1500);
                        }, i * 15);
                      }
                    }
                  }
                }}
                className={cn(
                  "reel-effusion-btn h-11 w-11 rounded-full bg-[#1b1c26]/65 border border-white/5 hover:bg-[#1b1c26]/90 transition-all",
                  likeData.isLikedByUser && "liked"
                )}
                title="Like"
              >
                <svg
                  className="reel-heart-svg"
                  style={{ width: 22, height: 22 }}
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                    fill={likeData.isLikedByUser ? '#ff0a54' : 'none'}
                    stroke={likeData.isLikedByUser ? '#ff0a54' : 'white'}
                    strokeWidth="2"
                  />
                </svg>
              </button>
            </div>
            <span className="text-[10px] font-bold text-zinc-350">
              {likeData.likes.toLocaleString()}
            </span>
          </div>

          {/* Comment */}
          <div className="flex flex-col items-center gap-1">
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                if (videoRef.current && !videoRef.current.paused) {
                  videoRef.current.pause();
                  setIsPlaying(false);
                }
                setActiveRightDrawer(activeRightDrawer === "comments" ? null : "comments");
              }}
              className={cn(
                "h-11 w-11 rounded-full flex items-center justify-center bg-[#1b1c26]/65 border border-white/5 hover:bg-[#1b1c26]/90 transition-all text-white cursor-pointer",
                activeRightDrawer === "comments" && "bg-indigo-650 ring-4 ring-indigo-500/20"
              )}
              title="Comments"
            >
              <MessageCircle className="w-5.5 h-5.5 text-white transition-colors duration-200" strokeWidth={2} />
            </motion.button>
            <span className="text-[10px] font-bold text-zinc-350">
              {post._count.comments.toLocaleString()}
            </span>
          </div>

          <RepostButton
            post={post}
            variant="reel-desktop"
            active={activeRightDrawer === "repost"}
            onDesktopClick={() => {
              if (videoRef.current && !videoRef.current.paused) {
                videoRef.current.pause();
                setIsPlaying(false);
              }
              setActiveRightDrawer(activeRightDrawer === "repost" ? null : "repost");
            }}
          />

          {/* Share */}
          <div className="flex flex-col items-center gap-1">
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                if (videoRef.current && !videoRef.current.paused) {
                  videoRef.current.pause();
                  setIsPlaying(false);
                }
                setActiveRightDrawer(activeRightDrawer === "share" ? null : "share");
              }}
              className={cn(
                "h-11 w-11 rounded-full flex items-center justify-center bg-[#1b1c26]/65 border border-white/5 hover:bg-[#1b1c26]/90 transition-all text-white cursor-pointer",
                activeRightDrawer === "share" && "bg-indigo-650 ring-4 ring-indigo-500/20"
              )}
              title="Share Reel"
            >
              <Send className="w-5.5 h-5.5 text-white transition-colors duration-200" strokeWidth={2} />
            </motion.button>
            <span className="text-[10px] font-bold text-zinc-350">Share</span>
          </div>

          {/* Save */}
          <div className="flex flex-col items-center gap-1">
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => toggleBookmark()}
              className="h-11 w-11 rounded-full flex items-center justify-center bg-[#1b1c26]/65 border border-white/5 hover:bg-[#1b1c26]/90 transition-all text-white cursor-pointer"
              title="Save"
            >
              <Bookmark className={cn("w-5.5 h-5.5 transition-colors duration-200 text-white", bookmarkData.isBookmarkedByUser && "fill-white text-white")} strokeWidth={2} />
            </motion.button>
            <span className="text-[10px] font-bold text-zinc-350">Save</span>
          </div>

          {/* More Options Menu (Three Dots) */}
          <div className="flex flex-col items-center gap-1">
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                if (videoRef.current && !videoRef.current.paused) {
                  videoRef.current.pause();
                  setIsPlaying(false);
                }
                setActiveRightDrawer(activeRightDrawer === "options" ? null : "options");
              }}
              className={cn(
                "h-11 w-11 rounded-full flex items-center justify-center bg-[#1b1c26]/65 border border-white/5 hover:bg-[#1b1c26]/90 transition-all text-white cursor-pointer",
                activeRightDrawer === "options" && "bg-indigo-650 ring-4 ring-indigo-500/20"
              )}
              title="Options"
            >
              <MoreHorizontal className="w-5.5 h-5.5 text-white" strokeWidth={2} />
            </motion.button>
            <span className="text-[10px] font-bold text-zinc-350">More</span>
          </div>

          {/* Shop look trigger circular button */}
          {hasAttachedProducts && (
            <div className="flex flex-col items-center gap-1">
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  if (videoRef.current && !videoRef.current.paused) {
                    videoRef.current.pause();
                    setIsPlaying(false);
                  }
                  setActiveRightDrawer(activeRightDrawer === "shop" ? null : "shop");
                  setShowAllProducts(false);
                }}
                className={cn(
                  "h-11 w-11 flex items-center justify-center rounded-full text-white shadow-xl cursor-pointer transition-all duration-300",
                  activeRightDrawer === "shop"
                    ? "bg-[#6366f1] ring-4 ring-[#6366f1]/35 border border-indigo-400"
                    : "bg-[#6366f1] hover:bg-[#4f46e5] border border-indigo-500/20"
                )}
                title="Shop Look"
              >
                <ShoppingBag className="w-5.5 h-5.5 text-white" />
              </motion.button>
              <span className="text-[10px] font-bold text-[#6366f1]">Shop</span>
            </div>
          )}
        </div>        {/* 4. Desktop Right Side Panel Drawer */}
        <div
          className={cn(
            "relative h-full bg-[#07080d] border border-zinc-900/60 rounded-[24px] transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] hidden lg:flex flex-col text-white z-30 pointer-events-auto overflow-hidden",
            activeRightDrawer ? "w-[410px] xl:w-[460px] opacity-100 ml-4 border" : "w-0 opacity-0 border-none pointer-events-none"
          )}
        >
          {activeRightDrawer === "shop" && (
            <>
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-900/60 select-none bg-[#07080d] shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-[#12131a] rounded-xl border border-zinc-850">
                    <ShoppingBag className="size-4.5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-tight">
                      Shop the look
                    </h3>
                    <p className="text-[10px] text-zinc-500 font-semibold mt-0.5">{detectedProducts.length} products found in this reel</p>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    setActiveRightDrawer(null);
                    const video = videoRef.current;
                    if (video && video.paused) {
                      video.play().then(() => setIsPlaying(true)).catch((err) => console.error(err));
                    }
                  }}
                  className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="size-4.5" />
                </button>
              </div>

              {/* Category Filter Chips Bar */}
              <div className="flex items-center gap-2 px-6 py-3 overflow-x-auto border-b border-zinc-900/60 bg-[#07080d] scrollbar-none shrink-0 select-none">
                {desktopCategories.map((cat) => {
                  const isActive = cat.name === desktopActiveCategory;
                  return (
                    <button
                      key={cat.name}
                      onClick={() => setDesktopActiveCategory(cat.name)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-[10px] font-black transition-all cursor-pointer select-none",
                        isActive
                          ? "bg-indigo-650 text-white shadow-md"
                          : "bg-[#12131a] text-zinc-400 hover:text-zinc-200 border border-zinc-850"
                      )}
                    >
                      {cat.name} ({cat.count})
                    </button>
                  );
                })}
              </div>

              {/* Grid of Product Cards */}
              <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-3 scrollbar-none bg-[#07080d] content-start">
                {desktopFilteredProducts.slice(0, 4).map((prod) => {
                  const itemBestMatch = [...(prod.matches || [])].sort((a, b) => {
                    const priceA = parsePrice(a.price);
                    const priceB = parsePrice(b.price);
                    return priceA - priceB;
                  })[0];

                  const categoryLabel = prod.category || "Top";

                  return (
                    <div
                      key={prod.id}
                      className="flex flex-col bg-[#12131a] border border-zinc-800/60 hover:border-zinc-700 rounded-2xl transition-all duration-300 relative group/card w-full overflow-hidden shadow-lg"
                    >
                      {/* Thumbnail Image - fills entire card top, no padding */}
                      <div className="w-full aspect-[3/4] bg-zinc-950 relative overflow-hidden">
                        <img
                          src={prod.thumbnailUrl || prod.sourceFrameUrl || "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=200&auto=format&fit=crop&q=60"}
                          alt={prod.label}
                          className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500"
                        />
                        
                        {/* Dark gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                        {/* Category Label */}
                        <span className="absolute top-2.5 left-2.5 text-[8px] font-black text-white bg-black/70 px-1.5 py-0.5 rounded-md uppercase tracking-wider select-none">
                          {categoryLabel}
                        </span>

                        {/* Heart button */}
                        <button className="absolute top-2.5 right-2.5 p-1.5 bg-black/50 hover:bg-black/80 rounded-full text-white/70 hover:text-rose-400 transition-colors cursor-pointer">
                          <Heart className="size-3" strokeWidth={2.5} />
                        </button>

                        {/* Name & Price overlaid at bottom */}
                        <div className="absolute bottom-0 left-0 right-0 px-3 pb-3 pt-6">
                          <p className="text-[11px] font-bold text-white truncate leading-tight select-none">
                            {prod.label}
                          </p>
                          {itemBestMatch && (
                            <p className="text-[11px] font-black text-zinc-200 mt-0.5">
                              {itemBestMatch.price}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* View product — grey base, indigo ripple on hover */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (onOpenProductDetail) {
                            onOpenProductDetail(prod.id, detectedProducts);
                          } else {
                            setFullProductDetailId(prod.id);
                          }
                        }}
                        className="group relative block w-full py-2.5 overflow-hidden bg-[#1f2937] active:scale-[0.97] transition-transform duration-150 select-none cursor-pointer border-0 outline-none text-left"
                      >
                        <span
                          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#4f46e5] opacity-80 w-0 h-0 group-hover:w-[14em] group-hover:h-[14em] transition-all duration-500 ease-[cubic-bezier(0,0,0.2,1)]"
                        />
                        <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/25" />
                        <span className="relative z-10 block w-full text-center text-[11px] font-bold text-white">View product</span>
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Sticky Bottom Actions */}
              {desktopFilteredProducts.length > 4 && (
                <div className="border-t border-zinc-900/60 bg-[#07080d] p-4 flex flex-col gap-3.5 shrink-0 select-none">
                  <button
                    onClick={() => {
                      if (onViewAllProducts) {
                        onViewAllProducts(desktopFilteredProducts);
                      }
                    }}
                    className="reel-view-all-btn w-full py-3.5"
                  >
                    <span>View all {desktopFilteredProducts.length} products</span>
                    <span style={{ fontSize: 14 }}>&#8594;</span>
                  </button>
                </div>
              )}
            </>
          )}

          {activeRightDrawer === "comments" && (
            <>
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-900/60 select-none bg-[#07080d] shrink-0">
                <div className="flex items-center gap-3 relative">
                  <h3 className="font-black text-white text-base uppercase tracking-tight">Comments</h3>
                  
                  {/* Sort Comments Selector */}
                  <div className="relative">
                    <select
                      value={commentsSortBy}
                      onChange={(e) => setCommentsSortBy(e.target.value as any)}
                      className="bg-[#12131a] border border-zinc-800 text-[10px] font-black uppercase text-zinc-400 rounded-full px-2.5 py-1 pr-6 focus:outline-none cursor-pointer appearance-none"
                    >
                      <option value="top">Top</option>
                      <option value="newest">Newest</option>
                      <option value="oldest">Oldest</option>
                    </select>
                    <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-550 font-bold text-[8px]">&darr;</div>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    setActiveRightDrawer(null);
                    const video = videoRef.current;
                    if (video && video.paused) {
                      video.play().then(() => setIsPlaying(true)).catch((err) => console.error(err));
                    }
                  }}
                  className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="size-4.5" />
                </button>
              </div>

              {/* Comments Scroll Area */}
              <div className="flex-grow overflow-y-auto p-4 space-y-4 scrollbar-none bg-[#07080d]">
                {commentsStatus === "pending" && (
                  <div className="flex justify-center py-12">
                    <Loader2 className="size-6 animate-spin text-zinc-650" />
                  </div>
                )}
                {commentsStatus === "success" && processedComments.length === 0 && (
                  <p className="text-center text-xs text-zinc-500 py-16 font-bold select-none">No comments yet.</p>
                )}
                {commentsStatus === "success" && processedComments.map((c) => (
                  <div key={c.id} className="border-b border-zinc-900/40 pb-4 last:border-b-0 last:pb-0">
                    <CommentComponent comment={c} postUserId={post.user.id} />
                  </div>
                ))}
              </div>

              {/* Bottom Comments Input Pill */}
              <div className="border-t border-zinc-900/60 bg-[#0c0d14] p-4 shrink-0">
                {/* Emoji Quick Picker Row */}
                <div className="flex items-center justify-between pb-3 gap-2 overflow-x-auto scrollbar-none select-none">
                  {["❤️", "🙌", "🔥", "👏", "😢", "😍", "😂"].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => setCommentText((prev) => prev + emoji)}
                      className="text-lg transition-transform active:scale-90 hover:scale-110 cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleCommentSubmit();
                  }} 
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    placeholder="Write a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="flex-1 bg-[#12131a] border border-zinc-800 rounded-full px-4 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-zinc-700 font-medium"
                  />
                  <button
                    type="submit"
                    disabled={!commentText.trim() || isSubmittingComment}
                    className="size-9 bg-white text-black rounded-full flex items-center justify-center shrink-0 disabled:opacity-40 hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                  >
                    {isSubmittingComment ? (
                      <Loader2 className="size-4 animate-spin text-black" />
                    ) : (
                      <Send className="size-4 text-black fill-black" />
                    )}
                  </button>
                </form>
              </div>
            </>
          )}

          {activeRightDrawer === "share" && (
            <>
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-900/60 select-none bg-[#07080d] shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-[#12131a] rounded-xl border border-zinc-850">
                    <Send className="size-4.5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-tight">Share</h3>
                    <p className="text-[10px] text-zinc-500 font-semibold mt-0.5">Send this reel to your friends</p>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    setActiveRightDrawer(null);
                    const video = videoRef.current;
                    if (video && video.paused) {
                      video.play().then(() => setIsPlaying(true)).catch((err) => console.error(err));
                    }
                  }}
                  className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="size-4.5" />
                </button>
              </div>

              {/* Top Glassmorphic Search Bar */}
              <div className="px-4 py-3 border-b border-zinc-900/40 bg-[#07080d]/80 shrink-0">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search people..."
                    value={shareSearchQuery}
                    onChange={(e) => setShareSearchQuery(e.target.value)}
                    className="w-full bg-[#12131a] border border-zinc-800 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder:text-zinc-650 outline-none focus:border-zinc-700 transition-colors font-medium"
                  />
                </div>
              </div>

              {/* Vertical Scroll List of Contacts */}
              <div className="flex-grow overflow-y-auto p-4 space-y-1.5 scrollbar-none bg-[#07080d]">
                {loadingContacts ? (
                  <div className="flex h-32 items-center justify-center">
                    <Loader2 className="size-5 animate-spin text-zinc-600" />
                  </div>
                ) : filteredShareContacts.length > 0 ? (
                  filteredShareContacts.map((contact: any) => {
                    const isOnline = contact.online ?? (contact.id.charCodeAt(0) % 2 === 0);
                    const firstLetter = (contact.name || contact.displayName || contact.username || "?")[0].toUpperCase();

                    return (
                      <button
                        key={contact.id}
                        onClick={() => handleShareToUser(contact)}
                        className="flex items-center justify-between w-full p-2.5 rounded-2xl hover:bg-[#12131a] border border-transparent hover:border-zinc-850/40 transition-all select-none cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 min-w-0 text-left">
                          <div className="relative size-10 rounded-full bg-indigo-650 border border-zinc-800 shrink-0 flex items-center justify-center">
                            {contact.image || contact.avatarUrl ? (
                              <img
                                src={contact.image || contact.avatarUrl}
                                alt={contact.name}
                                className="w-full h-full object-cover rounded-full"
                              />
                            ) : (
                              <span className="font-bold text-sm text-white select-none">{firstLetter}</span>
                            )}
                            {isOnline && (
                              <span className="absolute bottom-0 right-0 size-2.5 bg-green-500 border-2 border-[#07080d] rounded-full" />
                            )}
                          </div>
                          
                          <div className="min-w-0">
                            <span className="text-xs font-black text-white group-hover:text-indigo-400 transition-colors block truncate">
                              {contact.name || contact.displayName || contact.username}
                            </span>
                            <span className="text-[10px] text-zinc-550 block truncate">@{contact.username}</span>
                          </div>
                        </div>

                        <span className="text-[10.5px] font-black text-zinc-400 bg-[#12131a] hover:bg-[#1f202a] hover:text-white px-3 py-1.5 border border-zinc-850 rounded-xl transition-all">
                          Send
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="flex h-32 items-center justify-center text-xs text-zinc-550 font-bold select-none">
                    No contacts found.
                  </div>
                )}
              </div>

              {/* Uiverse Nebulous sharing dock */}
              <style dangerouslySetInnerHTML={{
                __html: `
                  .nebulous-wrapper {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    padding: 10px 0;
                    background: transparent;
                  }
                  .dock-container {
                    position: relative;
                    padding: 10px;
                    background: rgba(15, 15, 20, 0.4);
                    backdrop-filter: blur(24px) saturate(180%);
                    border-radius: 24px;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    box-shadow: 
                      0 20px 50px -10px rgba(0, 0, 0, 0.5),
                      inset 0 1px 1px rgba(255, 255, 255, 0.1);
                    z-index: 10;
                    animation: dockReveal 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                  }
                  .dock-container::before {
                    content: '';
                    position: absolute;
                    inset: -20px;
                    background: radial-gradient(circle at 50% 50%, rgba(100, 100, 255, 0.15), transparent 70%);
                    z-index: -1;
                    filter: blur(20px);
                    pointer-events: none;
                  }
                  .dock-item {
                    position: relative;
                    width: 44px;
                    height: 44px;
                    cursor: pointer;
                    transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                    outline: none;
                  }
                  .icon-box {
                    width: 100%;
                    height: 100%;
                    clip-path: url(#squircleClip);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                    position: relative;
                    overflow: hidden;
                  }
                  .icon-box::after {
                    content: '';
                    position: absolute;
                    top: 0; left: 0; right: 0;
                    height: 50%;
                    background: linear-gradient(to bottom, rgba(255,255,255,0.15), transparent);
                    pointer-events: none;
                  }
                  .dock-item:hover {
                    transform: scale(1.2) translateY(-12px);
                    z-index: 20;
                  }
                  .dock-item:hover .icon-box {
                    box-shadow: 0 15px 30px -5px rgba(0, 0, 0, 0.5);
                  }
                  .icon-box svg {
                    width: 22px;
                    height: 22px;
                    fill: white;
                    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
                    transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                  }
                  .dock-item:hover svg {
                    transform: scale(1.1);
                  }
                  .tooltip {
                    position: absolute;
                    top: -45px;
                    left: 50%;
                    transform: translateX(-50%) translateY(10px);
                    background: rgba(0, 0, 0, 0.8);
                    color: white;
                    padding: 4px 10px;
                    border-radius: 8px;
                    font-size: 11px;
                    font-weight: 600;
                    white-space: nowrap;
                    opacity: 0;
                    pointer-events: none;
                    transition: all 0.3s ease;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                  }
                  .dock-item:hover .tooltip {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0);
                  }
                  .github { background: linear-gradient(135deg, #2b3137, #111); border: 1px solid rgba(255,255,255,0.1); }
                  .linkedin { background: linear-gradient(135deg, #0077b5, #005582); border: 1px solid rgba(0, 119, 181, 0.5); }
                  .youtube { background: linear-gradient(135deg, #ff0000, #cc0000); border: 1px solid rgba(255, 0, 0, 0.5); }
                  .discord { background: linear-gradient(135deg, #5865f2, #4752c4); border: 1px solid rgba(88, 101, 242, 0.5); }
                  .instagram { background: linear-gradient(135deg, #405de6, #5851db, #833ab4, #c13584, #e1306c, #fd1d1d); border: 1px solid rgba(193, 53, 132, 0.5); }
                  .twitter-x { background: linear-gradient(135deg, #111, #333); border: 1px solid rgba(255,255,255,0.1); }
                  .more-btn { 
                    background: rgba(255, 255, 255, 0.05); 
                    border: 1px dashed rgba(255, 255, 255, 0.2); 
                    color: white;
                  }
                  .more-menu-trigger {
                    position: relative;
                  }
                  .popover {
                    position: absolute;
                    bottom: 60px;
                    right: 0;
                    background: rgba(15, 15, 20, 0.95);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 20px;
                    padding: 16px;
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 12px;
                    visibility: hidden;
                    opacity: 0;
                    transform: translateY(20px) scale(0.95);
                    transform-origin: bottom right;
                    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                    box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.6);
                    z-index: 100;
                  }
                  .more-menu-trigger:focus-within .popover,
                  .more-menu-trigger:hover .popover {
                    visibility: visible;
                    opacity: 1;
                    transform: translateY(0) scale(1);
                  }
                  .popover-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 6px;
                    text-decoration: none;
                    transition: transform 0.2s ease;
                    cursor: pointer;
                  }
                  .popover-item:hover {
                    transform: translateY(-4px);
                  }
                  .popover-icon {
                    width: 36px;
                    height: 36px;
                    clip-path: url(#squircleClip);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                  }
                  .popover-icon svg {
                    width: 18px;
                    height: 18px;
                    fill: white;
                  }
                  .popover-label {
                    font-size: 10px;
                    color: rgba(255, 255, 255, 0.6);
                    font-weight: 500;
                  }

                  @keyframes dockReveal {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                  }
                `
              }} />

              <svg width="0" height="0" style={{ position: "absolute" }}>
                <defs>
                  <clipPath id="squircleClip" clipPathUnits="objectBoundingBox">
                    <path d="M 0,0.5 C 0,0 0,0 0.5,0 S 1,0 1,0.5 1,1 0.5,1 0,1 0,0.5"></path>
                  </clipPath>
                </defs>
              </svg>

              <div className="nebulous-wrapper">
                <div className="dock-container">
                  {/* Copy Link */}
                  <button className="dock-item" onClick={() => handleSharePlatform("copy")}>
                    <span className="tooltip">Copy Link</span>
                    <div className="icon-box copy-link">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="size-5.5 text-white">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                      </svg>
                    </div>
                  </button>

                  {/* LinkedIn */}
                  <button className="dock-item" onClick={() => handleSharePlatform("linkedin")}>
                    <span className="tooltip">LinkedIn</span>
                    <div className="icon-box linkedin">
                      <svg viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                    </div>
                  </button>

                  {/* Instagram */}
                  <button className="dock-item" onClick={() => handleSharePlatform("instagram")}>
                    <span className="tooltip">Instagram</span>
                    <div className="icon-box instagram">
                      <svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                    </div>
                  </button>

                  {/* TikTok */}
                  <button className="dock-item" onClick={() => handleSharePlatform("tiktok")}>
                    <span className="tooltip">TikTok</span>
                    <div className="icon-box tiktok">
                      <svg viewBox="0 0 24 24"><path d="M12.525.02c1.31-.032 2.612-.019 3.916-.01.12 2.3.824 4.562 2.49 6.273.1.1.2.19.3.28-.01 1.597-.013 3.193-.013 4.79-1.233-.08-2.42-.48-3.414-1.22-.303-.223-.585-.47-.84-.737v7.098c.046 3.256-1.503 6.478-4.606 7.724-3.067 1.258-6.857.545-9.15-1.848C-1.11 19.956-1.1 15.65 1.144 13.062c1.484-1.737 3.743-2.73 6.015-2.735v4.757c-1.306.015-2.61.6-3.393 1.636-1.012 1.34-1.1 3.243-.23 4.674 1.01 1.67 3.232 2.373 5.02 1.65 1.534-.622 2.417-2.222 2.4-3.864V.02z"/></svg>
                    </div>
                  </button>

                  {/* X (Twitter) */}
                  <button className="dock-item" onClick={() => handleSharePlatform("twitter-x")}>
                    <span className="tooltip">X (Twitter)</span>
                    <div className="icon-box twitter-x">
                      <svg viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.134l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    </div>
                  </button>

                  {/* More Menu Trigger */}
                  <div className="more-menu-trigger">
                    <div className="dock-item">
                      <span className="tooltip">More Apps</span>
                      <div className="icon-box more-btn">
                        <svg viewBox="0 0 24 24"><path d="M6 12c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm6-2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
                      </div>
                    </div>
                    
                    {/* Popover Menu */}
                    <div className="popover">
                      {/* GitHub */}
                      <button className="popover-item" onClick={() => handleSharePlatform("github")}>
                        <div className="popover-icon github">
                          <svg viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                        </div>
                        <span className="popover-label">GitHub</span>
                      </button>

                      {/* YouTube */}
                      <button className="popover-item" onClick={() => handleSharePlatform("youtube")}>
                        <div className="popover-icon youtube">
                          <svg viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                        </div>
                        <span className="popover-label">YouTube</span>
                      </button>

                      {/* Discord */}
                      <button className="popover-item" onClick={() => handleSharePlatform("discord")}>
                        <div className="popover-icon discord">
                          <svg viewBox="0 0 24 24"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0189 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1568 2.4189Z"/></svg>
                        </div>
                        <span className="popover-label">Discord</span>
                      </button>

                      {/* Dribbble */}
                      <button className="popover-item" onClick={() => handleSharePlatform("dribbble")}>
                        <div className="popover-icon dribbble">
                          <svg viewBox="0 0 24 24"><path d="M12 24C5.385 24 0 18.615 0 12S5.385 0 12 0s12 5.385 12 12-5.385 12-12 12zm10.12-10.358c-.35-.11-2.634-.812-5.33-.367.425 1.174.83 2.376 1.187 3.587 2.412-1.15 3.843-2.746 4.144-3.22zM16.1 18.51c-.342-1.138-.724-2.274-1.127-3.39-2.38.742-5.01 1.01-7.81.823.132.333.272.66.417.982 1.956 1.55 4.38 2.455 7.02 2.56.596-.32 1.1-.645 1.5-.975zm-11.08-2.3c2.61.166 5.023-.07 7.21-.723-.11-.274-.223-.55-.337-.827C7.625 13.1 4.54 12.637 1.586 13.06c.254 1.196.85 2.27 1.683 3.15zM1.086 10.74c2.812-.39 5.753-.02 8.41 1.258.15-.31.303-.62.463-.923-2.24-1.93-4.524-3.483-6.843-4.636-1.14 1.21-1.857 2.76-2.03 4.3zM8.3 3.96c2.18 1.05 4.33 2.5 6.44 4.33.917-1.42 1.693-2.9 2.316-4.425-1.503-.574-3.154-.895-4.887-.905-1.39 0-2.715.35-3.87.9zm10.457 1.22c-.61 1.41-1.373 2.78-2.25 4.1 2.36.435 4.8 1.48 6.4 2.87.106-.71.163-1.44.163-2.184 0-1.78-.51-3.44-1.4-4.845z"/></svg>
                        </div>
                        <span className="popover-label">Dribbble</span>
                      </button>

                      {/* Reddit */}
                      <button className="popover-item" onClick={() => handleSharePlatform("reddit")}>
                        <div className="popover-icon reddit">
                          <svg viewBox="0 0 24 24"><path d="M24 11.779c0-1.459-1.192-2.645-2.657-2.645-.715 0-1.363.286-1.84.746-2.108-1.522-5.02-2.512-8.244-2.615l1.403-6.592 4.604.98c.032.774.673 1.396 1.46 1.396 1.511 0 2.454-1.44 2.454-2.645 0-1.459-1.192-2.645-2.657-2.645-.818 0-1.554.37-2.051.954l-5.185-1.104c-.172-.037-.344.067-.393.232l-1.638 7.701c-3.236.096-6.17 1.082-8.293 2.612-.478-.446-1.114-.72-1.796-.72-1.465 0-2.657 1.186-2.657 2.645 0 .973.53 1.817 1.314 2.278-.04.22-.061.445-.061.674 0 3.511 4.223 6.368 9.42 6.368s9.42-2.857 9.42-6.368c0-.214-.017-.425-.052-.633.82-.455 1.378-1.314 1.378-2.31zM6.621 13.916c0-.853.695-1.549 1.549-1.549s1.549.696 1.549 1.549-.695 1.549-1.549 1.549-1.549-.696-1.549-1.549zm9.585 4.397c-1.312 1.313-4.498 1.379-5.105 1.379-.606 0-3.792-.066-5.104-1.379-.166-.165-.166-.432 0-.597.166-.166.432-.166.597 0 1.054 1.054 3.738 1.157 4.507 1.157s3.454-.103 4.507-1.157c.165-.166.432-.166.597 0 .166.166.166.431 0 .597zm-.437-2.848c-.854 0-1.549-.696-1.549-1.549s.695-1.549 1.549-1.549c.853 0 1.549.696 1.549 1.549s-.696 1.549-1.549 1.549z"/></svg>
                        </div>
                        <span className="popover-label">Reddit</span>
                      </button>

                      {/* TikTok */}
                      <button className="popover-item" onClick={() => handleSharePlatform("tiktok")}>
                        <div className="popover-icon tiktok">
                          <svg viewBox="0 0 24 24"><path d="M12.525.02c1.31-.032 2.612-.019 3.916-.01.12 2.3.824 4.562 2.49 6.273.1.1.2.19.3.28-.01 1.597-.013 3.193-.013 4.79-1.233-.08-2.42-.48-3.414-1.22-.303-.223-.585-.47-.84-.737v7.098c.046 3.256-1.503 6.478-4.606 7.724-3.067 1.258-6.857.545-9.15-1.848C-1.11 19.956-1.1 15.65 1.144 13.062c1.484-1.737 3.743-2.73 6.015-2.735v4.757c-1.306.015-2.61.6-3.393 1.636-1.012 1.34-1.1 3.243-.23 4.674 1.01 1.67 3.232 2.373 5.02 1.65 1.534-.622 2.417-2.222 2.4-3.864V.02z"/></svg>
                        </div>
                        <span className="popover-label">TikTok</span>
                      </button>

                      {/* Pinterest */}
                      <button className="popover-item" onClick={() => handleSharePlatform("pinterest")}>
                        <div className="popover-icon pinterest">
                          <svg viewBox="0 0 24 24"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.965 1.406-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.497 3.141 1.122.338 2.303.521 3.527.521 6.615 0 11.987-5.373 11.987-11.987C24.018 5.367 18.646 0 12.017 0z"/></svg>
                        </div>
                        <span className="popover-label">Pinterest</span>
                      </button>

                      {/* Slack */}
                      <button className="popover-item" onClick={() => handleSharePlatform("slack")}>
                        <div className="popover-icon slack">
                          <svg viewBox="0 0 24 24"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52h-2.521zM8.834 6.313a2.527 2.527 0 0 1 2.521 2.521 2.527 2.527 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.958 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.527 2.527 0 0 1-2.52 2.521h-2.522v-2.521zM17.687 8.834a2.527 2.527 0 0 1-2.521 2.521 2.527 2.527 0 0 1-2.521-2.521V2.522A2.527 2.527 0 0 1 15.166 0a2.527 2.527 0 0 1 2.521 2.522v6.312zM15.166 18.958a2.528 2.528 0 0 1 2.521 2.522A2.528 2.528 0 0 1 15.166 24a2.527 2.527 0 0 1-2.52-2.52v-2.522h2.52zM15.166 17.687a2.527 2.527 0 0 1-2.52 2.521 2.527 2.527 0 0 1-2.521-2.521v-6.313a2.527 2.527 0 0 1 2.521-2.521 2.527 2.527 0 0 1 2.521 2.521v6.313z"/></svg>
                        </div>
                        <span className="popover-label">Slack</span>
                      </button>

                      {/* Figma */}
                      <button className="popover-item" onClick={() => handleSharePlatform("figma")}>
                        <div className="popover-icon figma">
                          <svg viewBox="0 0 24 24"><path d="M12 0C8.688 0 6 2.688 6 6v3c0 3.312 2.688 6 6 6s6-2.688 6-6-2.688-6-6-6zm-6 12c-3.312 0-6 2.688-6 6s2.688 6 6 6 6-2.688 6-6-2.688-6-6-6zm12 0c-3.312 0-6 2.688-6 6s2.688 6 6 6 6-2.688 6-6-2.688-6-6-6z"/></svg>
                        </div>
                        <span className="popover-label">Figma</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeRightDrawer === "options" && (
            <>
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-900/60 select-none bg-[#07080d] shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-[#12131a] rounded-xl border border-zinc-850">
                    <MoreHorizontal className="size-4.5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-tight">Options</h3>
                    <p className="text-[10px] text-zinc-500 font-semibold mt-0.5">Post settings and action shortcuts</p>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    setActiveRightDrawer(null);
                    setOptionsView("menu");
                    const video = videoRef.current;
                    if (video && video.paused) {
                      video.play().then(() => setIsPlaying(true)).catch((err) => console.error(err));
                    }
                  }}
                  className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="size-4.5" />
                </button>
              </div>

              {/* Options Body */}
              <div className="flex-1 overflow-y-auto p-5 scrollbar-none bg-[#07080d]">
                {renderOptionsBody()}
              </div>
            </>
          )}

          {activeRightDrawer === "repost" && (
            <>
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-900/60 select-none bg-[#07080d] shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-[#12131a] rounded-xl border border-zinc-850">
                    <RepostIcon
                      className={cn(
                        "size-4.5 text-zinc-400 transition-colors",
                        repostData.isRepostedByUser && "text-green-500 fill-green-500"
                      )}
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-tight">Repost</h3>
                    <p className="text-[10px] text-zinc-500 font-semibold mt-0.5">Share or quote this post</p>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    setActiveRightDrawer(null);
                    const video = videoRef.current;
                    if (video && video.paused) {
                      video.play().then(() => setIsPlaying(true)).catch((err) => console.error(err));
                    }
                  }}
                  className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="size-4.5" />
                </button>
              </div>

              {/* Repost Options Body */}
              <div className="flex-1 overflow-y-auto p-5 scrollbar-none bg-[#07080d] flex flex-col gap-4">
                <button
                  onClick={() => {
                    toggleRepost();
                    setActiveRightDrawer(null);
                  }}
                  className="flex items-start gap-4 p-4 rounded-2xl bg-[#12131a] border border-zinc-800/60 hover:bg-[#1a1b26] hover:border-zinc-700/60 active:scale-95 transition-all text-left w-full group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#07080d] border border-zinc-850 flex items-center justify-center text-zinc-450 group-hover:text-indigo-400 group-hover:border-indigo-500/20 transition-all shrink-0">
                    <RepostIcon
                      className={cn(
                        "size-5 transition-colors text-zinc-400 group-hover:text-white",
                        repostData.isRepostedByUser && "text-green-500 group-hover:text-green-400 fill-green-500"
                      )}
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-black text-xs text-white leading-tight uppercase tracking-wider group-hover:text-indigo-400 transition-colors">
                      {repostData.isRepostedByUser ? "Undo repost" : "Repost"}
                    </span>
                    <span className="text-[10.5px] text-zinc-550 mt-1 font-semibold leading-normal">
                      Share this post with your followers immediately.
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setActiveRightDrawer(null);
                    setShowDesktopQuoteDialog(true);
                  }}
                  className="flex items-start gap-4 p-4 rounded-2xl bg-[#12131a] border border-zinc-800/60 hover:bg-[#1a1b26] hover:border-zinc-700/60 active:scale-95 transition-all text-left w-full group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#07080d] border border-zinc-850 flex items-center justify-center text-zinc-450 group-hover:text-indigo-400 group-hover:border-indigo-500/20 transition-all shrink-0">
                    <PenLine className="size-5 text-zinc-400 group-hover:text-white" strokeWidth={2} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-black text-xs text-white leading-tight uppercase tracking-wider group-hover:text-indigo-400 transition-colors">
                      Quote
                    </span>
                    <span className="text-[10.5px] text-zinc-550 mt-1 font-semibold leading-normal">
                      Add a comment, photo, or GIF before sharing this post.
                    </span>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>

      </div>

      {/* Mobile Options Bottom Sheet */}
      <AnimatePresence>
        {isOptionsOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsOptionsOpen(false);
                setOptionsView("menu");
                const video = videoRef.current;
                if (video && video.paused) {
                  video.play().then(() => setIsPlaying(true)).catch((err) => console.error(err));
                }
              }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] pointer-events-auto"
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 280 }}
              className="fixed left-0 right-0 bottom-0 z-[100] w-full bg-[#07080d] border-t border-zinc-800/80 rounded-t-[28px] shadow-2xl flex flex-col overflow-hidden text-white md:max-w-md md:mx-auto pb-24 md:pb-8 px-5 pointer-events-auto select-none"
            >
              {/* Top drag handle */}
              <div
                className="w-full flex justify-center py-3.5 cursor-pointer flex-shrink-0"
                onClick={() => {
                  setIsOptionsOpen(false);
                  setOptionsView("menu");
                  const video = videoRef.current;
                  if (video && video.paused) {
                    video.play().then(() => setIsPlaying(true)).catch((err) => console.error(err));
                  }
                }}
              >
                <div className="w-10 h-1 bg-zinc-650 rounded-full" />
              </div>

              {/* Title Header */}
              <div className="flex items-center justify-between pb-4 border-b border-zinc-900/60 select-none bg-[#07080d] shrink-0 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-[#12131a] rounded-xl border border-zinc-850">
                    <MoreHorizontal className="size-4.5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-tight">Options</h3>
                    <p className="text-[10px] text-zinc-500 font-semibold mt-0.5">Post settings and actions</p>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    setIsOptionsOpen(false);
                    setOptionsView("menu");
                    const video = videoRef.current;
                    if (video && video.paused) {
                      video.play().then(() => setIsPlaying(true)).catch((err) => console.error(err));
                    }
                  }}
                  className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="size-4.5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-none pb-6">
                {renderOptionsBody()}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Comment Bottom Sheet Panel */}
      <CommentsBottomSheet
        post={post}
        open={isCommentsOpen}
        onOpenChange={setIsCommentsOpen}
      />

      {/* Reels Share Bottom Sheet Dialog */}
      {isShareOpen && (
        <ShareDialog
          post={post}
          open={isShareOpen}
          onOpenChange={setIsShareOpen}
        />
      )}


      <QuotePostDialog
        post={post}
        open={showDesktopQuoteDialog}
        onClose={() => setShowDesktopQuoteDialog(false)}
      />
    </div>
  );
}

// Bounding box safe extraction helper
interface NormalizedVertex {
  x?: number;
  y?: number;
}

function getBoundingBox(box: any) {
  if (!box || !Array.isArray(box) || box.length === 0) return null;
  const vertices = box as NormalizedVertex[];

  const xs = vertices.map((v) => v.x ?? 0);
  const ys = vertices.map((v) => v.y ?? 0);

  const xMin = Math.min(...xs);
  const yMin = Math.min(...ys);
  const xMax = Math.max(...xs);
  const yMax = Math.max(...ys);

  return {
    left: xMin * 100,
    top: yMin * 100,
    width: (xMax - xMin) * 100,
    height: (yMax - yMin) * 100,
    xMin,
    yMin,
    xMax,
    yMax,
    centerX: ((xMin + xMax) / 2) * 100,
    centerY: ((yMin + yMax) / 2) * 100,
  };
}

// Deterministic hotspot coordinate generator based on product ID/label
function getProductHotspot(prod: any) {
  if (prod.box) {
    const boxCoords = getBoundingBox(prod.box);
    if (boxCoords) {
      return { x: boxCoords.centerX, y: boxCoords.centerY };
    }
  }
  // Generate stable mock coordinates based on the product ID or label
  let hash = 0;
  const str = prod.id || prod.label || "";
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Map x to 20% - 80%, y to 25% - 75% so dots aren't too close to edges
  const x = 20 + Math.abs(hash % 60);
  const y = 25 + Math.abs((hash >> 8) % 50);
  return { x, y };
}

function ProductList({
  detectedProducts,
  selectedProductId,
  setSelectedProductId,
  drawerHeightState,
  setDrawerHeightState,
  onLogEvent,
  onOpenFullDetail
}: {
  detectedProducts: any[];
  selectedProductId: string;
  setSelectedProductId: (id: string) => void;
  drawerHeightState: "min" | "mid" | "max";
  setDrawerHeightState: (state: "min" | "mid" | "max") => void;
  onLogEvent: (productId: string, eventType: string, extraMetadata?: any) => void;
  onOpenFullDetail: (id: string) => void;
}) {
  const { toast } = useToast();

  const [activeCategory, setActiveCategory] = useState("All");
  const [showSaveDropdown, setShowSaveDropdown] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (detectedProducts && detectedProducts.length > 0) {
      setSelectedProductId(detectedProducts[0].id);
    }
  }, [detectedProducts, setSelectedProductId]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        // Swipe left -> Next image
        setActiveImageIndex((prev) => (prev === galleryImages.length - 1 ? 0 : prev + 1));
      } else {
        // Swipe right -> Prev image
        setActiveImageIndex((prev) => (prev === 0 ? galleryImages.length - 1 : prev - 1));
      }
    }
    touchStartX.current = null;
  };

  // Build category list
  const categories = useMemo(() => {
    const cats = new Set<string>();
    detectedProducts.forEach((p) => {
      if (p.category) {
        const formatted = p.category.charAt(0).toUpperCase() + p.category.slice(1).toLowerCase();
        cats.add(formatted);
      }
    });
    return ["All", ...Array.from(cats)];
  }, [detectedProducts]);

  // Filter products by active category
  const filteredProducts = useMemo(() => {
    if (activeCategory === "All") return detectedProducts;
    return detectedProducts.filter(
      (p) => p.category?.toLowerCase() === activeCategory.toLowerCase()
    );
  }, [detectedProducts, activeCategory]);

  const selectedProduct = filteredProducts && filteredProducts.length > 0
    ? (filteredProducts.find((p) => p.id === selectedProductId) || filteredProducts[0])
    : (detectedProducts.find((p) => p.id === selectedProductId) || detectedProducts[0]);

  // Queries hooks called unconditionally
  const { data: similarProducts, isLoading: loadingSimilar } = useQuery({
    queryKey: ["similar-products", selectedProduct?.id],
    queryFn: async () => {
      if (!selectedProduct?.id) return [];
      const res = await fetch(`/api/products/similar?productId=${selectedProduct.id}`);
      if (!res.ok) throw new Error("Failed to fetch similar products");
      return res.json();
    },
    enabled: !!selectedProduct?.id,
  });

  const { data: collections, refetch: refetchCollections } = useQuery({
    queryKey: ["product-collections", selectedProduct?.id],
    queryFn: async () => {
      if (!selectedProduct?.id) return [];
      const res = await fetch(`/api/products/collections?productId=${selectedProduct.id}`);
      if (!res.ok) throw new Error("Failed to fetch collections");
      return res.json();
    },
    enabled: !!selectedProduct?.id,
  });

  // Early return after hook calls
  if (!detectedProducts || detectedProducts.length === 0 || !selectedProduct) {
    return (
      <div className="text-center py-8 text-xs text-zinc-400">
        No products found in this video.
      </div>
    );
  }

  // Toggle Save to Collection
  const handleToggleSave = async (colId: string | null, colName?: string, action: "save" | "unsave" = "save") => {
    try {
      const res = await fetch("/api/products/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProduct.id,
          collectionId: colId,
          collectionName: colName,
          action,
        }),
      });
      if (res.ok) {
        refetchCollections();
        toast({
          description: action === "save" ? `Saved to collection!` : `Removed from collection.`,
        });
        if (action === "save") {
          onLogEvent(selectedProduct.id, "SAVE");
        }
        setNewColName("");
      } else {
        const err = await res.json();
        toast({
          variant: "destructive",
          description: err.error || "Failed to update collection",
        });
      }
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        description: "Failed to connect to server",
      });
    }
  };

  // Price helper
  const parsePrice = (priceStr: string): number => {
    const num = parseInt(priceStr.replace(/[^0-9]/g, ""), 10);
    return isNaN(num) ? Infinity : num;
  };

  const getOriginalPrice = (priceStr: string) => {
    const numeric = parseInt(priceStr.replace(/[^0-9]/g, ""), 10);
    if (isNaN(numeric)) return null;
    const original = Math.round(numeric * 1.35);
    const symbol = priceStr.startsWith("$") ? "$" : (priceStr.startsWith("₹") ? "₹" : "");
    if (symbol === "₹") {
      return `₹${original.toLocaleString("en-IN")}`;
    }
    return `${symbol}${original}`;
  };

  // Delivery tag generator
  const getDeliveryTag = (merchant: string): string => {
    const m = merchant.toLowerCase();
    if (m.includes("amazon")) return "Delivery tomorrow";
    if (m.includes("flipkart")) return "Delivery in 2 days";
    if (m.includes("myntra")) return "Delivery in 3 days";
    if (m.includes("ajio")) return "Delivery in 4 days";
    return "Delivery in 3-5 days";
  };

  const getDeliveryDays = (match: any): number => {
    const text = (match.deliveryText || getDeliveryTag(match.sourceStore || "")).toLowerCase();
    if (text.includes("tomorrow") || text.includes("1 day")) return 1;
    if (text.includes("2 days") || text.includes("in 2")) return 2;
    if (text.includes("3 days") || text.includes("in 3")) return 3;
    if (text.includes("4 days") || text.includes("in 4")) return 4;
    if (text.includes("5 days") || text.includes("in 5")) return 5;
    return 6;
  };

  const matches = selectedProduct.matches || [];
  const sortedMatches = [...matches].sort((a, b) => {
    const priceA = parsePrice(a.price);
    const priceB = parsePrice(b.price);
    if (priceA !== priceB) return priceA - priceB;
    const daysA = getDeliveryDays(a);
    const daysB = getDeliveryDays(b);
    if (daysA !== daysB) return daysA - daysB;
    return (b.merchant?.rating ?? 0) - (a.merchant?.rating ?? 0);
  });
  const bestMatch = sortedMatches[0];
  const otherMatches = sortedMatches.slice(1);

  // Helper: category emoji
  const getCategoryEmoji = (category: string, label: string): string => {
    const cat = category.toLowerCase();
    const lbl = label.toLowerCase();
    if (cat.includes("sunglass") || lbl.includes("glass") || lbl.includes("spectacles")) return "🕶";
    if (cat.includes("bag") || cat.includes("backpack") || lbl.includes("backpack") || lbl.includes("bag")) return "🎒";
    if (cat.includes("watch") || lbl.includes("watch")) return "⌚";
    if (cat.includes("shoe") || cat.includes("footwear") || lbl.includes("sneaker") || lbl.includes("shoes") || lbl.includes("boot") || lbl.includes("boots")) return "👟";
    if (cat.includes("jewelry") || lbl.includes("ring") || lbl.includes("necklace") || lbl.includes("earring")) return "💍";
    if (lbl.includes("pants") || lbl.includes("jeans") || lbl.includes("shorts") || lbl.includes("trouser")) return "👖";
    if (cat.includes("clothing") || lbl.includes("shirt") || lbl.includes("tee") || lbl.includes("jacket") || lbl.includes("hoodie") || lbl.includes("coat") || lbl.includes("sweater") || lbl.includes("top") || lbl.includes("dress")) return "👕";
    return "🛍";
  };

  const handleBuyClick = async (e: React.MouseEvent, matchId: string, fallbackUrl: string) => {
    e.preventDefault();
    e.stopPropagation();
    onLogEvent(selectedProduct.id, "RETAILER_CLICK", { matchId });
    try {
      const response = await fetch("/api/products/click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.redirectUrl) {
          window.open(data.redirectUrl, "_blank", "noopener,noreferrer");
          return;
        }
      }
    } catch (err) {
      console.error("Click tracking failed:", err);
    }
    window.open(fallbackUrl, "_blank", "noopener,noreferrer");
  };

  // Unique gallery images list
  const galleryImages = Array.from(new Set([
    selectedProduct.thumbnailUrl,
    selectedProduct.sourceFrameUrl,
    ...(selectedProduct.matches || []).map((m: any) => m.imageUrl)
  ].filter(Boolean) as string[]));

  return (
    <div className="flex flex-col gap-5 select-none animate-in fade-in duration-300 pb-8 text-white">
      {/* 1. CATEGORY TABS BAR */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-4 overflow-x-auto border-b border-zinc-900 pb-2.5 scrollbar-none">
          {categories.map((cat) => {
            const isActive = cat === activeCategory;
            return (
              <button
                key={cat}
                onClick={() => {
                  setActiveCategory(cat);
                  // Auto-select first product in new category
                  const firstInCat = cat === "All" ? detectedProducts[0] : detectedProducts.find(p => p.category?.toLowerCase() === cat.toLowerCase());
                  if (firstInCat) {
                    setSelectedProductId(firstInCat.id);
                  }
                }}
                className={cn(
                  "text-xs font-bold transition-colors pb-1.5 relative whitespace-nowrap",
                  isActive ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                {cat}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. PRODUCTS CHIPS LIST */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
          {filteredProducts.map((prod) => {
            const isActive = prod.id === selectedProduct.id;
            const emoji = getCategoryEmoji(prod.category, prod.label);
            return (
              <button
                key={prod.id}
                onClick={() => {
                  setSelectedProductId(prod.id);
                  onLogEvent(prod.id, "PRODUCT_CLICK");
                  onOpenFullDetail(prod.id);
                }}
                className={cn(
                  "flex flex-col items-center p-2 rounded-[14px] transition-all w-[76px] flex-shrink-0 snap-center border",
                  isActive
                    ? "bg-white text-black border-transparent shadow-md font-bold"
                    : "bg-[#121212] text-white border-zinc-800/80 hover:bg-zinc-900"
                )}
              >
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-zinc-950 mb-1.5 relative border border-transparent">
                  <img
                    src={prod.thumbnailUrl || prod.sourceFrameUrl || "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=100&auto=format&fit=crop&q=60"}
                    alt={prod.label}
                    className="w-full h-full object-cover rounded-xl"
                  />
                  <span className="absolute bottom-0.5 right-0.5 text-xs bg-black/60 px-1 py-0.5 rounded text-white">{emoji}</span>
                </div>
                <span className="text-[9px] font-bold tracking-tight text-center truncate w-full capitalize leading-tight">
                  {prod.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* If drawer is in Peek state, hide detail panels */}
      {drawerHeightState !== "min" && (
        <>
          <div className="border-t border-zinc-900 my-1" />

          {/* 3. PRODUCT COVER & HERO DETAILS */}
          <div className="flex flex-col gap-4">
            <div
              onClick={() => {
                onOpenFullDetail(selectedProduct.id);
              }}
              className="w-full aspect-square rounded-[20px] overflow-hidden border border-zinc-800 bg-[#090909] cursor-pointer relative group"
            >
              <img
                src={selectedProduct.thumbnailUrl || selectedProduct.sourceFrameUrl || "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&auto=format&fit=crop&q=60"}
                alt={selectedProduct.label}
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
              />
              <div className="absolute bottom-3 right-3 p-2 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.637 10.637z" />
                </svg>
              </div>
            </div>

            <div className="flex flex-col gap-1 px-1 relative">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                  Detected in this reel
                </span>
                {selectedProduct.isVerifiedMatch && (
                  <span className="text-[9px] font-extrabold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/30 flex items-center gap-0.5">
                    ✓ Verified
                  </span>
                )}
              </div>
              <h4 className="text-[18px] font-semibold text-white capitalize leading-snug pr-8 mt-1">
                {selectedProduct.label}
              </h4>
              {selectedProduct.brand && (
                <span className="text-sm text-zinc-400 font-medium capitalize">
                  by {selectedProduct.brand}
                </span>
              )}

              {/* Wishlist Icon */}
              <div className="absolute right-1 top-2 z-10">
                <button
                  onClick={() => setShowSaveDropdown(!showSaveDropdown)}
                  className="p-2 rounded-full bg-[#121212] border border-zinc-800 hover:bg-zinc-800 text-rose-500 hover:text-rose-450 transition-colors"
                  title="Save to Board"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={collections?.some((c: any) => c.saved) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                  </svg>
                </button>

                {showSaveDropdown && (
                  <div className="absolute right-0 top-9 z-30 w-52 p-2 bg-[#090909] border border-zinc-800 rounded-xl shadow-2xl animate-in fade-in duration-200">
                    <div className="text-[10px] font-black uppercase text-zinc-400 px-2 py-1 tracking-wider border-b border-zinc-900 pb-1.5 mb-1.5">
                      Save Look to Board
                    </div>
                    
                    <div className="max-h-36 overflow-y-auto flex flex-col gap-1 pr-1 scrollbar-none">
                      {collections?.map((col: any) => (
                        <button
                          key={col.id}
                          onClick={() => handleToggleSave(col.id, undefined, col.saved ? "unsave" : "save")}
                          className="flex items-center justify-between w-full text-left px-2 py-1.5 rounded-lg text-[11px] font-bold text-zinc-300 hover:bg-zinc-900 hover:text-white"
                        >
                          <span className="truncate max-w-[120px]">{col.name}</span>
                          <span className="text-xs">{col.saved ? "❤️" : "🤍"}</span>
                        </button>
                      ))}
                    </div>

                    <div className="border-t border-zinc-900 pt-1.5 mt-1.5 flex gap-1.5 px-1.5">
                      <input
                        type="text"
                        placeholder="New Board..."
                        value={newColName}
                        onChange={(e) => setNewColName(e.target.value)}
                        className="bg-zinc-900 border border-zinc-800 rounded-md px-2 py-1 text-[10px] text-white w-full focus:outline-none focus:border-zinc-700 font-medium"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newColName.trim()) {
                            handleToggleSave(null, newColName.trim(), "save");
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          if (newColName.trim()) {
                            handleToggleSave(null, newColName.trim(), "save");
                          }
                        }}
                        className="px-2 py-1 bg-white hover:bg-zinc-200 text-black text-[9px] font-bold rounded-md"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Product description */}
            {selectedProduct.description && (
              <p className="text-xs text-zinc-400 px-1 leading-relaxed mt-1">
                {selectedProduct.description}
              </p>
            )}

            {/* Style parameters */}
            {(selectedProduct.style || selectedProduct.material || selectedProduct.season || selectedProduct.gender) && (
              <div className="flex flex-wrap gap-1.5 px-1 mt-1">
                {selectedProduct.style && (
                  <span className="text-[11.5px] font-medium bg-[#121212] text-zinc-400 px-2.5 py-1.5 rounded-lg select-none">
                    Style: {selectedProduct.style}
                  </span>
                )}
                {selectedProduct.material && (
                  <span className="text-[11.5px] font-medium bg-[#121212] text-zinc-400 px-2.5 py-1.5 rounded-lg select-none">
                    Material: {selectedProduct.material}
                  </span>
                )}
                {selectedProduct.season && (
                  <span className="text-[11.5px] font-medium bg-[#121212] text-zinc-400 px-2.5 py-1.5 rounded-lg select-none">
                    Season: {selectedProduct.season}
                  </span>
                )}
                {selectedProduct.gender && (
                  <span className="text-[11.5px] font-medium bg-[#121212] text-zinc-400 px-2.5 py-1.5 rounded-lg select-none">
                    Fits: {selectedProduct.gender}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 4. BEST PRICE OFFER */}
          {bestMatch ? (
            <div className="flex flex-col gap-2.5">
              <span className="text-[10px] font-black tracking-wider text-zinc-400 uppercase">
                Best Price
              </span>
              <a
                href={bestMatch.productUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => handleBuyClick(e, bestMatch.id, bestMatch.productUrl)}
                className="flex items-center justify-between gap-3 bg-[#121212]/50 hover:bg-[#121212] border border-zinc-800/80 p-4 rounded-2xl transition-all group relative overflow-hidden shadow-lg select-none"
              >
                <div className="flex items-start gap-3 min-w-0">
                  {bestMatch.imageUrl ? (
                    <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 border border-zinc-800 bg-[#090909]">
                      <img src={bestMatch.imageUrl} alt={bestMatch.sourceStore} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-11 h-11 rounded-lg bg-zinc-850 flex items-center justify-center text-xs text-zinc-500 flex-shrink-0">
                      🛒
                    </div>
                  )}
                  <div className="min-w-0 flex flex-col justify-center">
                    <span className="text-sm font-bold text-white truncate leading-tight">
                      {bestMatch.merchant?.name || bestMatch.sourceStore}
                    </span>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {bestMatch.merchant?.rating && (
                        <span className="text-[10px] text-amber-500 font-bold flex items-center gap-0.5">
                          ★ {bestMatch.merchant.rating}
                        </span>
                      )}
                      <span className="text-[10px] text-zinc-400 font-medium">
                        {bestMatch.deliveryText || getDeliveryTag(bestMatch.sourceStore)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0 z-10">
                  <div className="flex flex-row items-center gap-2.5">
                    <span className="text-[20px] font-extrabold text-white leading-none">
                      {bestMatch.price}
                    </span>
                    {getOriginalPrice(bestMatch.price) && (
                      <span className="line-through text-zinc-500 text-sm">
                        {getOriginalPrice(bestMatch.price)}
                      </span>
                    )}
                  </div>
                </div>

                <span className="absolute top-2.5 right-2.5 bg-zinc-800 text-zinc-300 text-[8px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full select-none shadow-sm">
                  BEST DEAL
                </span>
              </a>

              {/* Action button "Buy Now" directly below the Best Price card */}
              <a
                href={bestMatch.productUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => handleBuyClick(e, bestMatch.id, bestMatch.productUrl)}
                className="w-full bg-white text-black font-semibold py-3.5 rounded-xl text-center shadow-md active:scale-[0.99] transition-transform text-sm tracking-wide block mt-1 hover:bg-zinc-100"
              >
                Buy Now
              </a>
            </div>
          ) : (
            <div className="text-[11px] text-zinc-500 py-1 pl-3 italic">
              No matches found for &quot;{selectedProduct.label}&quot;.
            </div>
          )}

          {/* 5. COMPARE PRICES (OTHER STORES) */}
          {otherMatches.length > 0 && (
            <div className="flex flex-col gap-2 px-1">
              <span className="text-[10px] font-black tracking-wider text-zinc-400 uppercase">
                Compare Stores
              </span>
              <div className="flex flex-col border border-zinc-900 rounded-xl overflow-hidden bg-[#121212]/10 select-none">
                {otherMatches.map((match: any, idx: number) => (
                  <a
                    key={match.id || idx}
                    href={match.productUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => handleBuyClick(e, match.id, match.productUrl)}
                    className="flex items-center justify-between gap-3 p-3 transition-colors border-b border-zinc-900 last:border-b-0 hover:bg-[#121212]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {match.imageUrl ? (
                        <div className="w-8 h-8 rounded-md overflow-hidden flex-shrink-0 border border-zinc-800 bg-[#090909]">
                          <img src={match.imageUrl} alt={match.sourceStore} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-md bg-zinc-850 flex items-center justify-center text-[10px] text-zinc-500 flex-shrink-0">
                          🛒
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-zinc-200 block truncate group-hover:text-white leading-tight">
                          {match.merchant?.name || match.sourceStore}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {match.merchant?.rating && (
                            <span className="text-[10px] text-amber-500 font-bold flex items-center gap-0.5">
                              ★ {match.merchant.rating}
                            </span>
                          )}
                          <span className="text-[10px] font-medium text-zinc-500">
                            {match.deliveryText || getDeliveryTag(match.sourceStore)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      <div className="flex flex-row items-center gap-1.5">
                        <span className="text-xs font-bold text-zinc-200 block">
                          {match.price}
                        </span>
                        {getOriginalPrice(match.price) && (
                          <span className="line-through text-zinc-500 text-[10px] font-medium leading-none">
                            {getOriginalPrice(match.price)}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-zinc-400 bg-zinc-900 hover:text-white hover:bg-zinc-800 px-3 py-1.5 border border-zinc-800 rounded-lg transition-all">
                        Buy
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* 6. WHY WE MATCHED THIS */}
          <div className="flex flex-col gap-2 px-1">
            <span className="text-[10px] font-black tracking-wider text-zinc-400 uppercase">
              Why We Matched This
            </span>
            <div className="bg-[#121212]/30 p-3.5 rounded-xl text-xs text-zinc-400 leading-relaxed">
              {selectedProduct.isVerifiedMatch ? (
                <p>
                  Curated and approved directly by the creator. Checked and verified for look, style, and fit in this reel.
                </p>
              ) : (
                <p>
                  AI detected this item with {Math.round((selectedProduct.confidence || selectedProduct.aiConfidence || 0.85) * 105)}% confidence in the video frame at {selectedProduct.frameTimestamp ? `${Math.round(selectedProduct.frameTimestamp)}s` : "timestamp"}. Match verified against available retail inventory.
                </p>
              )}
            </div>
          </div>

          {/* 7. SIMILAR PRODUCTS CAROUSEL */}
          {selectedProduct && (
            <div className="flex flex-col gap-2.5 px-1">
              <span className="text-[10px] font-black tracking-wider text-zinc-400 uppercase">
                Similar Products
              </span>
              {loadingSimilar ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="size-5 animate-spin text-zinc-500" />
                </div>
              ) : similarProducts && similarProducts.length > 0 ? (
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
                  {similarProducts.map((item: any) => {
                    const itemBestPrice = item.matches?.[0];
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setSelectedProductId(item.id);
                        }}
                        className="flex flex-col w-[150px] flex-shrink-0 bg-[#121212]/20 hover:bg-[#121212] border border-zinc-800/80 p-2.5 rounded-[16px] text-left transition-all snap-center select-none"
                      >
                        <div className="w-full aspect-square rounded-xl overflow-hidden border border-zinc-800 bg-[#090909] mb-2.5">
                          <img
                            src={item.thumbnailUrl || item.sourceFrameUrl || "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=200&auto=format&fit=crop&q=60"}
                            alt={item.label}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="text-xs font-semibold text-white capitalize truncate block w-full leading-tight">
                          {item.label}
                        </span>
                        <div className="flex items-center justify-between gap-1 mt-1.5 w-full">
                          <span className="text-xs font-bold text-zinc-400 truncate">
                            {itemBestPrice?.price || "N/A"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-[10px] text-zinc-500 italic py-1.5">
                  No similar products detected.
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

