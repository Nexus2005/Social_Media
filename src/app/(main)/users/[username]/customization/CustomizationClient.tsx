"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  updateUserProfileSchema,
  UpdateUserProfileValues,
} from "@/lib/validation";
import { useUpdateProfileMutation } from "../mutations";
import { UserData } from "@/lib/types";
import avatarPlaceholder from "@/assets/avatar-placeholder.png";
import CropImageDialog from "@/components/CropImageDialog";
import SearchField from "@/components/SearchField";
import Resizer from "react-image-file-resizer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useQuery } from "@tanstack/react-query";
import kyInstance from "@/lib/ky";
import { NotificationCountInfo } from "@/lib/types";
import {
  Camera,
  Copy,
  Trash2,
  Plus,
  HelpCircle,
  Bell,
  Video,
  Menu,
  LayoutDashboard,
  PlaySquare,
  BarChart2,
  MessageSquare,
  Subtitles,
  Copyright,
  DollarSign,
  Sliders,
  Music,
  Settings,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Upload,
  Radio,
  SquarePen,
  ListPlus,
  Podcast,
  GraduationCap,
  X,
  Check,
  Image as ImageIcon
} from "lucide-react";

interface CustomSelectProps {
  label?: string;
  value: string;
  options: string[];
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (option: string) => void;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  label,
  value,
  options,
  isOpen,
  onToggle,
  onSelect,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        if (isOpen) onToggle();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onToggle]);

  return (
    <div ref={dropdownRef} className="relative w-full">
      {label && <label className="text-xs text-zinc-400 font-semibold mb-1.5 block">{label}</label>}
      <button
        type="button"
        onClick={onToggle}
        className="w-full h-10 bg-zinc-900 border border-zinc-800 hover:border-[#404040] rounded-xl px-3.5 flex items-center justify-between text-sm text-zinc-200 transition-colors select-none text-left focus:border-white focus:outline-none"
      >
        <span className="truncate pr-2 font-medium">{value}</span>
        <span className="text-[10px] text-zinc-500 shrink-0 transition-transform">▼</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 z-50 bg-[#1e1e1f] border border-zinc-800 rounded-xl shadow-2xl overflow-hidden py-1">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onSelect(opt);
                onToggle();
              }}
              className={`w-full px-3.5 py-2.5 text-left text-sm transition-colors ${
                opt === value 
                  ? "bg-zinc-800 text-white font-semibold" 
                  : "text-zinc-300 hover:bg-zinc-800/60 hover:text-white"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

interface CustomizationClientProps {
  user: UserData;
}

interface CustomLink {
  id: string;
  title: string;
  url: string;
}

export default function CustomizationClient({ user }: CustomizationClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const mutation = useUpdateProfileMutation();

  const { data: notificationsData } = useQuery({
    queryKey: ["unread-notification-count"],
    queryFn: () =>
      kyInstance
        .get("/api/notifications/unread-count")
        .json<NotificationCountInfo>(),
    initialData: { unreadCount: 0 },
    refetchInterval: 5 * 60 * 1000,
  });

  // Sub-tabs: layout, branding, basic-info
  const [activeTab, setActiveTab] = useState<"branding" | "basic-info">("branding");

  // Crop / file states
  const [croppedAvatar, setCroppedAvatar] = useState<Blob | null>(null);
  const [croppedBanner, setCroppedBanner] = useState<Blob | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>(user.avatarUrl || "");
  const [bannerPreview, setBannerPreview] = useState<string>(user.headerBannerUrl || "");

  // Simulated extra fields for YouTube Customization fidelity
  const [watermarkFile, setWatermarkFile] = useState<File | null>(null);
  const [watermarkPreview, setWatermarkPreview] = useState<string>("");
  const [contactEmail, setContactEmail] = useState<string>(user.email || "");
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const [showCreateDropdown, setShowCreateDropdown] = useState(false);
  const [showUploadVideoDialog, setShowUploadVideoDialog] = useState(false);
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [videoDescription, setVideoDescription] = useState("");
  const [isMadeForKids, setIsMadeForKids] = useState<boolean | null>(null);
  const [isAiGenerated, setIsAiGenerated] = useState<boolean | null>(null);
  const [videoStep, setVideoStep] = useState(1);
  const [videoObjectURL, setVideoObjectURL] = useState<string>("");
  const [videoThumbnailFile, setVideoThumbnailFile] = useState<File | null>(null);
  const [videoThumbnailPreview, setVideoThumbnailPreview] = useState<string>("");
  const [playlistsList, setPlaylistsList] = useState<any[]>([]);
  const [selectedPlaylists, setSelectedPlaylists] = useState<string[]>([]);
  const [showPlaylistDropdown, setShowPlaylistDropdown] = useState(false);
  const [showNewPlaylistForm, setShowNewPlaylistForm] = useState(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState("");
  const [newPlaylistVisibility, setNewPlaylistVisibility] = useState("Public");
  const [isAgeRestricted, setIsAgeRestricted] = useState<boolean | null>(null);
  const [isAgeRestrictionExpanded, setIsAgeRestrictionExpanded] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [hoverPillStyle, setHoverPillStyle] = useState<React.CSSProperties>({
    left: 0,
    width: 0,
    opacity: 0,
  });
  const [hasPaidPromotion, setHasPaidPromotion] = useState(false);
  const [allowEmbedding, setAllowEmbedding] = useState(true);
  const [publishToFeed, setPublishToFeed] = useState(true);
  const [showLikesCount, setShowLikesCount] = useState(true);
  const [allowShortsRemixing, setAllowShortsRemixing] = useState<boolean>(true);
  const [allowAutomaticChapters, setAllowAutomaticChapters] = useState(true);
  const [allowAutomaticPlaces, setAllowAutomaticPlaces] = useState(true);
  const [allowAutomaticConcepts, setAllowAutomaticConcepts] = useState(true);

  const [selectedLanguage, setSelectedLanguage] = useState("Select");
  const [activeLanguageDropdown, setActiveLanguageDropdown] = useState(false);

  const [selectedCaption, setSelectedCaption] = useState("None");
  const [activeCaptionDropdown, setActiveCaptionDropdown] = useState(false);

  const [selectedLicense, setSelectedLicense] = useState("Standard Cartly License");
  const [activeLicenseDropdown, setActiveLicenseDropdown] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState("People & Blogs");
  const [activeCategoryDropdown, setActiveCategoryDropdown] = useState(false);

  const [selectedComments, setSelectedComments] = useState("On");
  const [activeCommentsDropdown, setActiveCommentsDropdown] = useState(false);

  const [selectedModeration, setSelectedModeration] = useState("None");
  const [activeModerationDropdown, setActiveModerationDropdown] = useState(false);

  const [selectedWhoCanComment, setSelectedWhoCanComment] = useState("Anyone");
  const [activeWhoCanCommentDropdown, setActiveWhoCanCommentDropdown] = useState(false);

  const [selectedSortBy, setSelectedSortBy] = useState("Top");
  const [activeSortByDropdown, setActiveSortByDropdown] = useState(false);

  // Link Builder
  const [links, setLinks] = useState<CustomLink[]>([
    {
      id: "primary",
      title: "My Website",
      url: user.websiteUrl || "",
    },
  ]);

  useEffect(() => {
    document.body.classList.add("route-customization-active");
    return () => {
      document.body.classList.remove("route-customization-active");
    };
  }, []);

  const form = useForm<UpdateUserProfileValues>({
    resolver: zodResolver(updateUserProfileSchema),
    defaultValues: {
      displayName: user.displayName,
      username: user.username,
      bio: user.bio || "",
      location: user.location || "",
      websiteUrl: user.websiteUrl || "",
      birthDate: user.birthDate ? new Date(user.birthDate).toISOString().split("T")[0] as any : "",
      professionalCategory: user.professionalCategory || "",
    },
  });

  // Track if changes have been made (dirty states)
  const isFormDirty = form.formState.isDirty || croppedAvatar !== null || croppedBanner !== null || contactEmail !== user.email || links[0]?.url !== user.websiteUrl;

  // Refs for input file uploads
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const watermarkInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const laptopRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);

  const [avatarImageToCrop, setAvatarImageToCrop] = useState<File>();
  const [bannerImageToCrop, setBannerImageToCrop] = useState<File>();

  useEffect(() => {
    if (showUploadVideoDialog) {
      const saved = localStorage.getItem("cartly_playlists");
      if (saved) {
        setPlaylistsList(JSON.parse(saved));
      } else {
        const defaultPlaylists = [
          { id: "pl-1", title: "My Favorite Reels", videosCount: 3, visibility: "Public", updatedAt: "today" },
          { id: "pl-2", title: "Vlog Collection", videosCount: 1, visibility: "Private", updatedAt: "yesterday" }
        ];
        localStorage.setItem("cartly_playlists", JSON.stringify(defaultPlaylists));
        setPlaylistsList(defaultPlaylists);
      }
    }
  }, [showUploadVideoDialog]);

  const closeUploadVideoDialog = () => {
    setShowUploadVideoDialog(false);
    setSelectedVideoFile(null);
    if (videoObjectURL) {
      URL.revokeObjectURL(videoObjectURL);
      setVideoObjectURL("");
    }
    if (videoThumbnailPreview) {
      URL.revokeObjectURL(videoThumbnailPreview);
      setVideoThumbnailPreview("");
    }
    setVideoThumbnailFile(null);
    setShowPlaylistDropdown(false);
    setShowNewPlaylistForm(false);
    setNewPlaylistTitle("");
    setNewPlaylistVisibility("Public");
    setSelectedPlaylists([]);
    setIsAgeRestricted(null);
    setIsAgeRestrictionExpanded(false);
    setShowMoreDetails(false);
    setHoverPillStyle({ left: 0, width: 0, opacity: 0 });
    setHasPaidPromotion(false);
    setAllowEmbedding(true);
    setPublishToFeed(true);
    setShowLikesCount(true);
    setAllowShortsRemixing(true);
    setAllowAutomaticChapters(true);
    setAllowAutomaticPlaces(true);
    setAllowAutomaticConcepts(true);
    setSelectedLanguage("Select");
    setActiveLanguageDropdown(false);
    setSelectedCaption("None");
    setActiveCaptionDropdown(false);
    setSelectedLicense("Standard Cartly License");
    setActiveLicenseDropdown(false);
    setSelectedCategory("People & Blogs");
    setActiveCategoryDropdown(false);
    setSelectedComments("On");
    setActiveCommentsDropdown(false);
    setSelectedModeration("None");
    setActiveModerationDropdown(false);
    setSelectedWhoCanComment("Anyone");
    setActiveWhoCanCommentDropdown(false);
    setSelectedSortBy("Top");
    setActiveSortByDropdown(false);
  };

  // Handler for file selection
  const handleAvatarSelect = (file: File | undefined) => {
    if (!file) return;
    Resizer.imageFileResizer(
      file,
      1024,
      1024,
      "WEBP",
      100,
      0,
      (uri) => setAvatarImageToCrop(uri as File),
      "file"
    );
  };

  const handleBannerSelect = (file: File | undefined) => {
    if (!file) return;
    Resizer.imageFileResizer(
      file,
      2048,
      1152,
      "WEBP",
      95,
      0,
      (uri) => setBannerImageToCrop(uri as File),
      "file"
    );
  };

  const handleWatermarkSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setWatermarkFile(file);
      setWatermarkPreview(URL.createObjectURL(file));
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = (rect.width / 2 - (e.clientX - rect.left)) / 10;
    const y = (rect.height / 2 - (e.clientY - rect.top)) / 10;

    if (laptopRef.current) {
      laptopRef.current.style.transform = `translateZ(50px) rotateX(${y}deg) rotateY(${10 + x}deg)`;
    }
    if (mobileRef.current) {
      mobileRef.current.style.transform = `translateZ(120px) rotateX(${y}deg) rotateY(${-10 + x}deg)`;
    }
  };

  const handleMouseLeave = () => {
    if (laptopRef.current) {
      laptopRef.current.style.transform = `translateZ(50px) rotateX(0deg) rotateY(10deg)`;
    }
    if (mobileRef.current) {
      mobileRef.current.style.transform = `translateZ(120px) rotateX(0deg) rotateY(-10deg)`;
    }
  };

  // Channel URL Copy utility
  const channelUrl = typeof window !== "undefined" ? `${window.location.origin}/users/${user.username}` : `/users/${user.username}`;
  const copyChannelUrl = () => {
    navigator.clipboard.writeText(channelUrl);
    toast({
      description: "Channel URL copied to clipboard",
    });
  };

  // Links builder CRUD
  const addLinkRow = () => {
    setLinks([...links, { id: Math.random().toString(), title: "", url: "" }]);
  };

  const removeLinkRow = (id: string) => {
    setLinks(links.filter((l) => l.id !== id));
  };

  const updateLinkRow = (id: string, field: "title" | "url", value: string) => {
    setLinks(
      links.map((l) => (l.id === id ? { ...l, [field]: value } : l))
    );
  };

  // Submission
  const onSubmit = async (values: UpdateUserProfileValues) => {
    // Map the first link to websiteUrl
    const updatedValues = {
      ...values,
      websiteUrl: links[0]?.url || "",
    };

    const newAvatarFile = croppedAvatar
      ? new File([croppedAvatar], `avatar_${user.id}.webp`, {
          type: "image/webp",
        })
      : undefined;

    const newBannerFile = croppedBanner
      ? new File([croppedBanner], `banner_${user.id}.webp`, {
          type: "image/webp",
        })
      : undefined;

    mutation.mutate({
      values: updatedValues,
      avatar: newAvatarFile,
      banner: newBannerFile,
    });
  };

  return (
    <div className="h-screen overflow-hidden bg-[#f9f9f9] dark:bg-[#0f0f0f] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans">
      <style>{`
        body.route-customization-active {
          height: 100vh !important;
          overflow: hidden !important;
        }
        body.route-customization-active .main-content-wrapper {
          padding-left: 0 !important;
          padding-bottom: 0 !important;
          max-width: 100% !important;
          height: 100vh !important;
          overflow: hidden !important;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px !important;
          height: 6px !important;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent !important;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(100, 100, 100, 0.4) !important;
          border-radius: 9999px !important;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(100, 100, 100, 0.6) !important;
        }
        .custom-scrollbar {
          scrollbar-width: thin !important;
          scrollbar-color: rgba(100, 100, 100, 0.4) transparent !important;
        }
        .Btn {
          width: 38px;
          height: 38px;
          border: none;
          border-radius: 50%;
          background-color: transparent;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          position: relative;
          transition-duration: .3s;
        }
        .Btn:hover {
          background: linear-gradient(135deg, #ec4899, #a855f7) !important;
          color: white !important;
          box-shadow: 0 4px 12px rgba(168, 85, 247, 0.25);
        }
        .svgIcon {
          color: rgb(113, 113, 122);
          transition-duration: .3s;
        }
        .dark .svgIcon {
          color: rgb(161, 161, 170);
        }
        .Btn:hover .svgIcon {
          color: rgb(255, 255, 255) !important;
          animation: slide-in-top 0.4s cubic-bezier(0.250, 0.460, 0.450, 0.940) both;
        }
        .tooltip {
          position: absolute;
          top: 48px;
          left: 50%;
          transform: translateX(-50%);
          opacity: 0;
          background-color: rgb(12, 12, 12);
          color: white;
          padding: 5px 10px;
          border-radius: 5px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition-duration: .2s;
          pointer-events: none;
          letter-spacing: 0.5px;
          font-size: 11px;
          white-space: nowrap;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
          z-index: 100;
        }
        .tooltip::before {
          position: absolute;
          content: "";
          width: 8px;
          height: 8px;
          background-color: rgb(12, 12, 12);
          transform: rotate(45deg);
          top: -4px;
          left: 50%;
          transform: translate(-50%) rotate(45deg);
          transition-duration: .3s;
        }
        .Btn:hover .tooltip {
          opacity: 1;
          transition-duration: .3s;
        }
        @keyframes slide-in-top {
          0% {
            transform: translateY(-8px);
            opacity: 0;
          }
          100% {
            transform: translateY(0px);
            opacity: 1;
          }
        }
        .glow-border-card {
          border-radius: 10px;
          transition: all 0.3s;
          padding: 1.5px;
          display: inline-block;
          width: 100%;
          background: #3f3f3f; /* default border outline */
        }
        .glow-border-card:focus-within {
          background: #ffffff !important;
          box-shadow: 0px 0px 15px 2px rgba(255, 255, 255, 0.35);
        }
        .glow-border-inner {
          background-color: #18181b; /* zinc-900 */
          border-radius: 9px;
          transition: all 0.2s;
          width: 100%;
          height: 100%;
        }
        .glow-border-inner:hover {
          transform: scale(0.995);
        }
        
        /* Stepper styles */
        .stepper-container {
          width: 100%;
          max-width: 850px;
          padding: 20px;
          position: relative;
        }
        .stepper-line {
          position: absolute;
          top: 47px;
          left: 60px;
          right: 60px;
          height: 2px;
          background-color: #505050;
          z-index: 1;
        }
        .stepper-line-progress {
          height: 100%;
          background-color: #ffffff;
          transition: width 0.3s ease;
        }
        .steps-wrapper {
          display: flex;
          justify-content: space-between;
          position: relative;
          z-index: 3;
        }
        .step-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          width: 120px;
          padding: 10px 0;
          border-radius: 8px;
        }
        .step-label {
          font-size: 13px;
          font-weight: 500;
          color: #888888;
          margin-bottom: 12px;
          text-align: center;
          transition: color 0.2s ease;
        }
        .step-node {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background-color: #1e1e1f; /* matching modal bg */
          border: 2px solid #505050;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 10px;
          transition: background-color 0.2s, border-color 0.2s, transform 0.1s;
        }
        .step-item.active .step-label {
          color: #ffffff;
        }
        .step-item.active .step-node {
          border: 4px solid #ffffff;
          background-color: #1e1e1f;
        }
        .step-item.completed-hollow .step-node {
          border: 2px solid #ffffff;
          background-color: #ffffff;
        }
        .step-item.completed-check .step-node {
          border: 2px solid #ffffff;
          background-color: #ffffff;
          color: #1e1e1f;
          width: 16px;
          height: 16px;
          font-weight: bold;
        }
        .step-item.disabled .step-node {
          border: 2px solid #505050;
          background-color: #505050;
        }
        .hover-pill {
          position: absolute;
          top: 15px;
          left: 0;
          width: 0;
          height: 70px;
          background-color: rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          z-index: 2;
          pointer-events: none;
          opacity: 0;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .step-item:hover .step-label {
          color: #ffffff;
        }
        .step-item.active:hover .step-node {
          transform: scale(1.15);
        }
        .step-item.completed-hollow:hover .step-node {
          background-color: #ffffff;
          border-color: #ffffff;
          transform: scale(1.1);
        }
      `}</style>
      {/* 1. Header Navigation Bar (YouTube Studio style) */}
      <header className="h-[64px] border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f0f0f] flex items-center justify-between px-6 select-none shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsSidebarMinimized(!isSidebarMinimized)}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors hidden sm:inline-flex"
          >
            <Menu className="size-5 text-zinc-600 dark:text-zinc-400" />
          </button>
          <div className="flex items-center gap-1.5">
            <div className="bg-[#cc0000] text-white p-1.5 rounded-lg flex items-center justify-center font-bold text-xs select-none">
              STUDIO
            </div>
            <span className="font-semibold text-lg tracking-tight">Cartly Studio</span>
          </div>
        </div>

        {/* Center Search */}
        <div className="hidden md:flex max-w-[480px] w-full relative">
          <div className="w-full">
            <SearchField />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="Btn">
            <HelpCircle className="size-5 svgIcon" />
            <span className="tooltip">Help</span>
          </button>

          <Link href="/notifications" className="Btn">
            <Bell className="size-5 svgIcon" />
            {!!notificationsData.unreadCount && (
              <span className="absolute -right-1 -top-1 rounded-full bg-gradient-to-r from-[#ec4899] to-[#a855f7] px-1.5 py-0.5 text-[9px] font-bold tabular-nums text-white border border-black/15 shadow-sm">
                {notificationsData.unreadCount}
              </span>
            )}
            <span className="tooltip">Notifications</span>
          </Link>
          <div className="relative">
            <button 
              onClick={() => setShowCreateDropdown(!showCreateDropdown)}
              className="h-9 px-4 rounded-full bg-zinc-950 text-white hover:bg-zinc-900 text-sm font-semibold flex items-center gap-1.5 transition-colors border border-zinc-800"
            >
              <Video className="size-4 text-white" />
              <span>Create</span>
            </button>
            {showCreateDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowCreateDropdown(false)} />
                <div className="absolute right-0 mt-2 w-[220px] bg-[#212121] border border-zinc-800 rounded-xl overflow-hidden shadow-2xl z-50 py-1 text-left animate-in fade-in slide-in-from-top-2 duration-150">
                  <button
                    onClick={() => {
                      setShowCreateDropdown(false);
                      setShowUploadVideoDialog(true);
                    }}
                    className="flex items-center gap-3.5 px-4 py-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 transition-colors w-full text-left"
                  >
                    <Upload className="size-4.5 text-zinc-400" />
                    <span>Upload videos</span>
                  </button>
                  <Link
                    href="/create?mode=Live"
                    onClick={() => setShowCreateDropdown(false)}
                    className="flex items-center gap-3.5 px-4 py-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 transition-colors w-full"
                  >
                    <Radio className="size-4.5 text-zinc-400" />
                    <span>Go live</span>
                  </Link>
                  <Link
                    href="/create?mode=Post"
                    onClick={() => setShowCreateDropdown(false)}
                    className="flex items-center gap-3.5 px-4 py-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 transition-colors w-full"
                  >
                    <SquarePen className="size-4.5 text-zinc-400" />
                    <span>Create post</span>
                  </Link>
                  <button
                    onClick={() => {
                      setShowCreateDropdown(false);
                      toast({ description: "Playlists feature coming soon!" });
                    }}
                    className="flex items-center gap-3.5 px-4 py-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 transition-colors w-full text-left"
                  >
                    <ListPlus className="size-4.5 text-zinc-400" />
                    <span>New playlist</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateDropdown(false);
                      toast({ description: "Podcasts feature coming soon!" });
                    }}
                    className="flex items-center gap-3.5 px-4 py-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 transition-colors w-full text-left"
                  >
                    <Podcast className="size-4.5 text-zinc-400" />
                    <span>New podcast</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateDropdown(false);
                      toast({ description: "Courses feature coming soon!" });
                    }}
                    className="flex items-center gap-3.5 px-4 py-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 transition-colors w-full text-left"
                  >
                    <GraduationCap className="size-4.5 text-zinc-400" />
                    <span>New course</span>
                  </button>
                </div>
              </>
            )}
          </div>
          <div className="relative size-8 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-800">
            <Image
              src={user.avatarUrl || avatarPlaceholder}
              alt="User menu avatar"
              fill
              sizes="32px"
              className="object-cover"
            />
          </div>
        </div>
      </header>

      {/* Main Content Layout container */}
      <div className="flex-1 flex overflow-hidden">
        {/* 2. Side Panel Left Menu (YouTube Studio Style) */}
        <aside className={`h-full flex flex-col justify-between shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f0f0f] hidden lg:flex select-none py-4 overflow-hidden transition-all duration-300 ${isSidebarMinimized ? "w-[72px]" : "w-[256px]"}`}>
          {/* Creator Profile Summary Widget */}
          {!isSidebarMinimized && (
            <div className="flex flex-col items-center text-center px-4 pb-6 border-b border-zinc-200 dark:border-zinc-800 animate-in fade-in duration-200">
              <div className="relative size-[112px] rounded-full overflow-hidden mb-3 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <Image
                  src={avatarPreview || avatarPlaceholder}
                  alt="Studio avatar preview"
                  fill
                  sizes="112px"
                  className="object-cover"
                />
              </div>
              <h3 className="font-semibold text-sm line-clamp-1">{user.displayName}</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Your channel</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">@{user.username}</p>
            </div>
          )}

          {/* Navigation Links list */}
          <nav className="flex-1 py-4 flex flex-col gap-0.5 overflow-y-auto px-2">
            {[
              { label: "Dashboard", icon: LayoutDashboard },
              { label: "Content", icon: PlaySquare },
              { label: "Analytics", icon: BarChart2 },
              { label: "Comments", icon: MessageSquare },
              { label: "Subtitles", icon: Subtitles },
              { label: "Copyright", icon: Copyright },
              { label: "Earn", icon: DollarSign },
              { label: "Customization", icon: Sliders, active: true },
              { label: "Audio library", icon: Music },
            ].map((item, idx) => (
              <button
                key={idx}
                title={isSidebarMinimized ? item.label : undefined}
                className={`w-full flex items-center rounded-lg text-sm font-medium transition-all relative ${
                  isSidebarMinimized ? "justify-center px-0 py-3" : "gap-4 px-4 py-2.5"
                } ${
                  item.active
                    ? "text-[#cc0000] bg-red-50/50 dark:bg-red-950/20"
                    : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
                }`}
              >
                {item.active && (
                  <span className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#cc0000] rounded-r" />
                )}
                <item.icon className={`size-5 ${item.active ? "text-[#cc0000]" : "text-zinc-500 dark:text-zinc-400"}`} />
                {!isSidebarMinimized && <span>{item.label}</span>}
              </button>
            ))}
          </nav>

          {/* Footer items */}
          <div className={`px-2 pt-2 pb-6 border-t border-zinc-200 dark:border-zinc-800 mb-2 ${isSidebarMinimized ? "flex justify-center animate-in fade-in duration-200" : ""}`}>
            <button 
              title={isSidebarMinimized ? "Settings" : undefined}
              className={`w-full flex items-center rounded-lg text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900 font-medium ${
                isSidebarMinimized ? "justify-center px-0 py-3" : "gap-4 px-4 py-2.5"
              }`}
            >
              <Settings className="size-5 text-zinc-500 dark:text-zinc-400" />
              {!isSidebarMinimized && <span>Settings</span>}
            </button>
          </div>
        </aside>

        {/* 3. Right Content Studio Panels */}
        <main className="flex-1 min-w-0 h-full overflow-hidden bg-white dark:bg-[#1f1f1f] flex flex-col">
          {/* Top Actions Floating Header */}
          <div className="shrink-0 bg-white dark:bg-[#1f1f1f] border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-6 py-4">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Channel customization</h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Customize your channel homepage, branding, and basic information</p>
            </div>
            
            <div className="flex items-center gap-3">
              <Link href={`/users/${user.username}`} target="_blank">
                <Button variant="ghost" className="text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium flex items-center gap-1">
                  <span>View channel</span>
                  <ExternalLink className="size-3" />
                </Button>
              </Link>
              
              <Button
                variant="ghost"
                onClick={() => {
                  form.reset();
                  setCroppedAvatar(null);
                  setCroppedBanner(null);
                  setAvatarPreview(user.avatarUrl || "");
                  setBannerPreview(user.headerBannerUrl || "");
                  setLinks([{ id: "primary", title: "My Website", url: user.websiteUrl || "" }]);
                  router.push(`/users/${user.username}`);
                }}
                className="text-xs border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium"
              >
                Cancel
              </Button>
              
              <Button
                onClick={form.handleSubmit(onSubmit)}
                disabled={!isFormDirty || mutation.isPending}
                className={`text-xs font-semibold px-4 py-2 rounded-full transition-all ${
                  isFormDirty 
                    ? "bg-[#065fd4] hover:bg-[#004bb1] text-white" 
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
                }`}
              >
                {mutation.isPending ? "Publishing..." : "Publish"}
              </Button>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1f1f1f] px-6 flex items-center gap-6">
            <button
              onClick={() => setActiveTab("branding")}
              className={`py-3 text-sm font-semibold tracking-wide border-b-2 transition-all relative ${
                activeTab === "branding"
                  ? "border-[#065fd4] text-[#065fd4]"
                  : "border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              Branding
            </button>
            <button
              onClick={() => setActiveTab("basic-info")}
              className={`py-3 text-sm font-semibold tracking-wide border-b-2 transition-all relative ${
                activeTab === "basic-info"
                  ? "border-[#065fd4] text-[#065fd4]"
                  : "border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              Basic info
            </button>
          </div>

          {/* Core Content Form Container Wrapper (Full-bleed scrollable) */}
          <div className="flex-1 w-full overflow-y-auto custom-scrollbar">
            {/* Inner Content block */}
            <div className="p-6 md:p-8 max-w-4xl w-full space-y-8 pb-20">
            {activeTab === "branding" ? (
              // TAB 1: BRANDING PANEL
              <div className="space-y-10">
                {/* 1. Profile Picture Module */}
                <div className="flex flex-col md:flex-row gap-6 md:gap-8 pb-8 border-b border-zinc-200 dark:border-zinc-800">
                  <div className="w-[120px] h-[120px] relative rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 shrink-0 self-center md:self-start">
                    <Image
                      src={avatarPreview || avatarPlaceholder}
                      alt="Avatar preview"
                      fill
                      sizes="120px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 space-y-3">
                    <h3 className="font-semibold text-sm">Picture</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-lg">
                      Your profile picture will appear where your channel is presented on YouTube, like next to your videos and comments.
                    </p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 leading-relaxed max-w-lg">
                      It’s recommended to use a picture that’s at least 98 x 98 pixels and 4MB or less. Use a PNG or GIF (no animations) file. Make sure your picture follows the YouTube Community Guidelines.
                    </p>
                    
                    <div className="flex items-center gap-3 pt-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleAvatarSelect(e.target.files?.[0])}
                        ref={avatarInputRef}
                        className="sr-only hidden"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => avatarInputRef.current?.click()}
                        className="text-xs text-blue-600 dark:text-blue-400 font-semibold px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                      >
                        Change
                      </Button>
                      {avatarPreview && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setCroppedAvatar(null);
                            setAvatarPreview("");
                          }}
                          className="text-xs text-red-600 dark:text-red-400 font-semibold px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-950/20"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Banner Image Module */}
                <div className="flex flex-col md:flex-row gap-6 md:gap-8 pb-8 border-b border-zinc-200 dark:border-zinc-800">
                  {/* Outer Wrapper Container - Clones YouTube's exact dark box presentation */}
                  <div className="relative w-full md:w-[360px] h-[210px] bg-[#161616] border border-[#2d2d2d] rounded-xl flex items-center justify-center overflow-hidden shrink-0 self-center md:self-start select-none shadow-2xl">
                    {/* TV Framework */}
                    <div className="relative w-[220px] h-[124px] border border-[#5f5f5f] rounded bg-white shadow-lg overflow-hidden">
                      {bannerPreview ? (
                        <div
                          style={{ backgroundImage: `url(${bannerPreview})` }}
                          className="w-full h-full bg-cover bg-center bg-no-repeat"
                        />
                      ) : (
                        <div className="w-full h-full bg-[#2b2b2b]" />
                      )}
                    </div>

                    {/* Laptop Framework */}
                    <div className="absolute bottom-[20px] left-[50px] w-[140px] h-[82px] bg-[#161616] border border-[#7a7a7a] rounded-t shadow-2xl z-10 flex flex-col">
                      <div className="flex-1 bg-zinc-950 relative overflow-hidden flex items-center">
                        {bannerPreview ? (
                          <div
                            style={{ backgroundImage: `url(${bannerPreview})` }}
                            className="w-full h-[18px] bg-cover bg-center bg-no-repeat"
                          />
                        ) : (
                          <div className="w-full h-[18px] bg-[#2b2b2b]" />
                        )}
                      </div>
                      <div className="h-[8px] bg-[#161616] w-full shrink-0 border-t border-zinc-800" />
                    </div>

                    {/* Mobile Phone Framework */}
                    <div className="absolute bottom-[20px] right-[100px] w-[32px] h-[64px] bg-[#161616] border border-[#7a7a7a] rounded shadow-2xl z-20 overflow-hidden flex flex-col justify-start">
                      <div className="w-4 h-[1px] bg-zinc-800 rounded-b mx-auto mb-1 shrink-0" />
                      <div className="w-full h-[10px] relative overflow-hidden shrink-0 flex items-center">
                        {bannerPreview ? (
                          <div
                            style={{ 
                              backgroundImage: `url(${bannerPreview})`,
                              backgroundSize: '300% auto',
                              backgroundPosition: 'center center'
                            }}
                            className="w-full h-full bg-no-repeat"
                          />
                        ) : (
                          <div className="w-full h-full bg-[#2b2b2b]" />
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 space-y-3">
                    <h3 className="font-semibold text-sm">Banner image</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-lg">
                      This image will appear across the top of your channel.
                    </p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 leading-relaxed max-w-lg">
                      For the best results on all devices, use an image that’s at least 2048 x 1152 pixels and 6MB or less.
                    </p>
                    
                    <div className="flex items-center gap-3 pt-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleBannerSelect(e.target.files?.[0])}
                        ref={bannerInputRef}
                        className="sr-only hidden"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => bannerInputRef.current?.click()}
                        className="text-xs text-blue-600 dark:text-blue-400 font-semibold px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                      >
                        Change
                      </Button>
                      {bannerPreview && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setCroppedBanner(null);
                            setBannerPreview("");
                          }}
                          className="text-xs text-red-600 dark:text-red-400 font-semibold px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-950/20"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. Video Watermark Module */}
                <div className="flex flex-col md:flex-row gap-6 md:gap-8 pb-4">
                  <div className="w-[120px] h-[120px] relative rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center shrink-0 self-center md:self-start">
                    {watermarkPreview ? (
                      <img
                        src={watermarkPreview}
                        alt="Watermark preview"
                        className="size-16 object-contain border border-zinc-300"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center p-2">
                        <span className="text-[10px] text-zinc-400">150 x 150 px</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-3">
                    <h3 className="font-semibold text-sm">Video watermark</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-lg">
                      The watermark will appear on your videos in the right-hand corner of the video player.
                    </p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 leading-relaxed max-w-lg">
                      An image that’s 150 x 150 pixels is recommended. Use a PNG, GIF (no animations), BMP, or JPEG file that is 1MB or less.
                    </p>
                    
                    <div className="flex items-center gap-3 pt-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleWatermarkSelect}
                        ref={watermarkInputRef}
                        className="sr-only hidden"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => watermarkInputRef.current?.click()}
                        className="text-xs text-blue-600 dark:text-blue-400 font-semibold px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                      >
                        Change
                      </Button>
                      {watermarkPreview && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setWatermarkFile(null);
                            setWatermarkPreview("");
                          }}
                          className="text-xs text-red-600 dark:text-red-400 font-semibold px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-950/20"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // TAB 2: BASIC INFO PANEL
              <div className="space-y-8">
                {/* 1. Name */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold">Name</label>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Choose a channel name that represents you and your content. Changes made to your name are visible on Cartly.
                  </p>
                  <Input
                    {...form.register("displayName")}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm"
                  />
                  {form.formState.errors.displayName && (
                    <p className="text-xs text-red-500">{form.formState.errors.displayName.message}</p>
                  )}
                </div>

                {/* 2. Handle */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold">Handle</label>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Choose your unique handle by adding letters and numbers. You can change your handle back within 14 days.
                  </p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-medium">@</span>
                    <Input
                      {...form.register("username")}
                      className="w-full pl-8 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm"
                    />
                  </div>
                  {form.formState.errors.username && (
                    <p className="text-xs text-red-500">{form.formState.errors.username.message}</p>
                  )}
                </div>

                {/* 3. Description */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold">Description</label>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Tell viewers about your channel. Your description will appear in the About section of your channel.
                  </p>
                  <Textarea
                    {...form.register("bio")}
                    placeholder="Tell us a little bit about yourself"
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm resize-none min-h-[120px]"
                  />
                </div>

                {/* 4. Channel URL */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold">Channel URL</label>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    This is the standard web address for your channel. It includes your unique channel ID, which is the numbers and letters at the end of the URL.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={channelUrl}
                      readOnly
                      className="flex-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-500"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={copyChannelUrl}
                      className="border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 p-2.5 rounded-lg flex items-center justify-center shrink-0"
                    >
                      <Copy className="size-4" />
                    </Button>
                  </div>
                </div>

                {/* 5. Links Builder */}
                <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <div>
                    <label className="block text-sm font-semibold">Links</label>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                      Add links to sites you want to share with your viewers.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {links.map((link, index) => (
                      <div key={link.id} className="flex gap-3 items-center">
                        <Input
                          placeholder="Link title"
                          value={link.title}
                          onChange={(e) => updateLinkRow(link.id, "title", e.target.value)}
                          className="flex-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm"
                        />
                        <Input
                          placeholder="URL"
                          value={link.url}
                          onChange={(e) => updateLinkRow(link.id, "url", e.target.value)}
                          className="flex-[2] bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm"
                        />
                        {links.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => removeLinkRow(link.id)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 p-2.5 rounded-lg flex items-center justify-center shrink-0"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={addLinkRow}
                    className="text-xs text-blue-600 dark:text-blue-400 font-semibold px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/20 flex items-center gap-1.5"
                  >
                    <Plus className="size-4" />
                    <span>Add link</span>
                  </Button>
                </div>

                {/* 6. Contact Info */}
                <div className="space-y-2 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <label className="block text-sm font-semibold">Contact info</label>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Let people know how to contact you with business inquiries. The email address you enter may appear in the About section of your channel and be visible to viewers.
                  </p>
                  <Input
                    placeholder="Email address"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm"
                  />
                </div>
              </div>
            )}
            </div>
          </div>
        </main>
      </div>

      {/* 4. CropImageDialog modals */}
      {avatarImageToCrop && (
        <CropImageDialog
          src={URL.createObjectURL(avatarImageToCrop)}
          cropAspectRatio={1}
          onCropped={(blob) => {
            setCroppedAvatar(blob);
            if (blob) {
              setAvatarPreview(URL.createObjectURL(blob));
            }
          }}
          onClose={() => {
            setAvatarImageToCrop(undefined);
            if (avatarInputRef.current) {
              avatarInputRef.current.value = "";
            }
          }}
        />
      )}

      {bannerImageToCrop && (
        <CropImageDialog
          src={URL.createObjectURL(bannerImageToCrop)}
          cropAspectRatio={3} // Matches banner aspect ratio
          onCropped={(blob) => {
            setCroppedBanner(blob);
            if (blob) {
              setBannerPreview(URL.createObjectURL(blob));
            }
          }}
          onClose={() => {
            setBannerImageToCrop(undefined);
            if (bannerInputRef.current) {
              bannerInputRef.current.value = "";
            }
          }}
        />
      )}

      {showUploadVideoDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm select-none">
          {/* Backdrop close click */}
          <div className="absolute inset-0" onClick={closeUploadVideoDialog} />
          
          {/* Modal Container */}
          <div className={`relative w-full bg-[#1e1e1f] text-zinc-100 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-zinc-800/80 mx-4 z-50 animate-in fade-in zoom-in-95 duration-200 ${
            selectedVideoFile ? "max-w-6xl h-[760px]" : "max-w-[860px] h-[620px]"
          }`}>
            {selectedVideoFile ? (
              // ----------------------------------------------------
              // VIDEO UPLOAD DETAILS WORKSPACE (Split screen 60/40)
              // ----------------------------------------------------
              <>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold truncate max-w-md" title={videoTitle || selectedVideoFile.name}>
                      {videoTitle || selectedVideoFile.name}
                    </h2>
                    <span className="text-[11px] bg-zinc-800/80 text-zinc-400 border border-zinc-700/50 px-2 py-0.5 rounded font-semibold tracking-wide">
                      Saved as private
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-zinc-200">
                      <MessageSquare className="size-5" />
                    </button>
                    <button 
                      onClick={closeUploadVideoDialog}
                      className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-zinc-200"
                    >
                      <X className="size-5" />
                    </button>
                  </div>
                </div>

                {/* Progress Stepper Tracker */}
                <div className="shrink-0 px-6 py-4 border-b border-zinc-800 bg-[#161617]/50 select-none flex justify-center">
                  <div 
                    className="stepper-container"
                    onMouseLeave={() => setHoverPillStyle((prev) => ({ ...prev, opacity: 0 }))}
                  >
                    {/* Sliding Hover Card */}
                    <div className="hover-pill" style={hoverPillStyle} />

                    {/* Connecting progress timeline */}
                    <div className="stepper-line">
                      <div 
                        className="stepper-line-progress" 
                        style={{ width: `${((videoStep - 1) / 3) * 100}%` }}
                      />
                    </div>

                    {/* Interactive Navigation Steps */}
                    <div className="steps-wrapper">
                      {[
                        { label: "Details", step: 1 },
                        { label: "Video elements", step: 2 },
                        { label: "Initial check", step: 3 },
                        { label: "Visibility", step: 4 },
                      ].map((stepItem) => {
                        const isActive = videoStep === stepItem.step;
                        const isCompleted = videoStep > stepItem.step;
                        
                        let stepStateClass = "disabled";
                        if (isActive) {
                          stepStateClass = "active";
                        } else if (isCompleted) {
                          stepStateClass = stepItem.step === 3 ? "completed-check" : "completed-hollow";
                        }
                        
                        return (
                          <div 
                            key={stepItem.step} 
                            onClick={() => setVideoStep(stepItem.step)}
                            onMouseEnter={(e) => {
                              const stepEl = e.currentTarget;
                              const containerEl = stepEl.closest(".stepper-container");
                              if (stepEl && containerEl) {
                                const stepRect = stepEl.getBoundingClientRect();
                                const containerRect = containerEl.getBoundingClientRect();
                                const relativeLeft = stepRect.left - containerRect.left;
                                setHoverPillStyle({
                                  left: relativeLeft,
                                  width: stepRect.width,
                                  opacity: 1,
                                });
                              }
                            }}
                            className={`step-item ${stepStateClass}`}
                          >
                            <span className="step-label">{stepItem.label}</span>
                            <div className="step-node">
                              {stepStateClass === "completed-check" && "✓"}
                              {stepStateClass === "completed-hollow" && (
                                <div style={{ width: "4px", height: "4px", background: "#0f0f0f", borderRadius: "50%" }}></div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Main Split Screen Area */}
                <div className="flex-1 flex overflow-hidden">
                  {/* LEFT SCROLLABLE DETAILS FORM PANEL (60%) */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    {videoStep === 1 && (
                      <>
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-2xl font-semibold tracking-tight">Details</h3>
                            <button className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-full font-semibold border border-zinc-700">
                              Reuse details
                            </button>
                          </div>
                          
                          {/* Title input with glowing border */}
                          <div className="space-y-1.5 mb-6">
                            <div className="glow-border-card">
                              <div className="glow-border-inner p-3.5 flex flex-col">
                                <span className="text-xs font-semibold text-[#3ea6ff] uppercase tracking-wider">Title (required)</span>
                                <input 
                                  type="text"
                                  value={videoTitle}
                                  onChange={(e) => setVideoTitle(e.target.value.slice(0, 100))}
                                  placeholder="Add a title that describes your video"
                                  className="bg-transparent border-none outline-none text-[15px] text-zinc-100 mt-1 placeholder-zinc-600 w-full"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end text-[10px] text-zinc-500 font-semibold pr-1">
                              {videoTitle.length}/100
                            </div>
                          </div>

                          {/* Description text area with glowing border */}
                          <div className="space-y-1.5">
                            <div className="glow-border-card">
                              <div className="glow-border-inner p-3.5 flex flex-col">
                                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Description</span>
                                <textarea 
                                  value={videoDescription}
                                  onChange={(e) => setVideoDescription(e.target.value)}
                                  placeholder="Tell viewers about your video (type @ to mention a channel)"
                                  rows={4}
                                  className="bg-transparent border-none outline-none text-[15px] text-zinc-100 mt-1 placeholder-zinc-600 w-full resize-none custom-scrollbar"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Thumbnail Section */}
                        <div className="space-y-3 pt-4 border-t border-zinc-850">
                          <div>
                            <h4 className="text-sm font-bold">Thumbnail</h4>
                            <p className="text-xs text-zinc-500 font-medium mt-1">
                              Select or upload a picture that shows what's in your video. A good thumbnail stands out and draws viewers' attention.
                            </p>
                          </div>

                          <input 
                            type="file"
                            accept="image/*"
                            ref={thumbnailInputRef}
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setVideoThumbnailFile(file);
                                if (videoThumbnailPreview) {
                                  URL.revokeObjectURL(videoThumbnailPreview);
                                }
                                setVideoThumbnailPreview(URL.createObjectURL(file));
                              }
                            }}
                          />

                          {videoThumbnailPreview ? (
                            <div className="space-y-2">
                              {/* Display uploaded thumbnail */}
                              <div className="relative w-[240px] aspect-video bg-[#1a1a1a] rounded-xl overflow-hidden border border-zinc-800 group shadow-md">
                                <img 
                                  src={videoThumbnailPreview} 
                                  alt="Uploaded thumbnail" 
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                  <button 
                                    type="button"
                                    onClick={() => thumbnailInputRef.current?.click()}
                                    className="bg-white/95 text-zinc-950 font-bold text-[10px] uppercase tracking-wider px-2.5 py-1.5 rounded-full active:scale-95 transition-transform"
                                  >
                                    Change
                                  </button>
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      if (videoThumbnailPreview) {
                                        URL.revokeObjectURL(videoThumbnailPreview);
                                      }
                                      setVideoThumbnailPreview("");
                                      setVideoThumbnailFile(null);
                                    }}
                                    className="bg-red-600/95 text-white font-bold text-[10px] uppercase tracking-wider px-2.5 py-1.5 rounded-full active:scale-95 transition-transform"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                              {/* Thumbnail file name below */}
                              <p className="text-[11px] text-zinc-400 font-semibold truncate max-w-xs pl-1">
                                {videoThumbnailFile?.name}
                              </p>
                            </div>
                          ) : (
                            /* Dashboard style Upload Thumbnail button */
                            <button
                              type="button"
                              onClick={() => thumbnailInputRef.current?.click()}
                              className="w-[240px] aspect-video bg-[#1f1f21] border-2 border-dashed border-zinc-800 hover:border-zinc-700 rounded-xl flex flex-col items-center justify-center gap-2 text-zinc-400 hover:text-zinc-200 transition-all select-none active:scale-98"
                            >
                              <ImageIcon className="size-6 text-zinc-500" />
                              <span className="text-xs font-bold">Upload thumbnail</span>
                            </button>
                          )}
                        </div>

                        {/* Playlists Section */}
                        <div className="space-y-2 pt-4 border-t border-zinc-850">
                          <h4 className="text-sm font-bold text-zinc-100">Playlists</h4>
                          <p className="text-xs text-zinc-500 font-medium leading-relaxed">
                            Add your video to one or more playlists to organize your content for viewers. <a href="#" className="text-[#3ea6ff] hover:underline font-semibold">Learn more</a>
                          </p>
                          
                          <div className="relative max-w-xs">
                            <button
                              type="button"
                              onClick={() => setShowPlaylistDropdown(!showPlaylistDropdown)}
                              className="w-full h-10 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl px-4 flex items-center justify-between text-sm text-zinc-300 transition-colors select-none"
                            >
                              <span className="truncate pr-2">
                                {selectedPlaylists.length > 0 
                                  ? playlistsList.filter(p => selectedPlaylists.includes(p.id)).map(p => p.title).join(", ") 
                                  : "Select"}
                              </span>
                              <ChevronRight className={`size-4 text-zinc-500 shrink-0 transition-transform ${showPlaylistDropdown ? "rotate-90" : ""}`} />
                            </button>

                            {showPlaylistDropdown && (
                              <div className="absolute top-full left-0 right-0 mt-1.5 z-40 bg-[#1e1e1f] border border-zinc-800 rounded-xl shadow-2xl p-4 flex flex-col gap-3 animate-in fade-in slide-in-from-top-1 duration-150 w-[300px]">
                                {/* Playlists checklist scrollable */}
                                <div className="max-h-[160px] overflow-y-auto space-y-2.5 custom-scrollbar pr-1">
                                  {playlistsList.map((pl) => {
                                    const isChecked = selectedPlaylists.includes(pl.id);
                                    return (
                                      <button 
                                        key={pl.id} 
                                        type="button"
                                        onClick={() => {
                                          if (isChecked) {
                                            setSelectedPlaylists(selectedPlaylists.filter(id => id !== pl.id));
                                          } else {
                                            setSelectedPlaylists([...selectedPlaylists, pl.id]);
                                          }
                                        }}
                                        className="flex items-center gap-3.5 cursor-pointer select-none text-zinc-350 hover:text-white transition-colors text-left w-full group"
                                      >
                                        <span className={`size-5 rounded-[3px] border-2 flex items-center justify-center shrink-0 transition-all ${
                                          isChecked ? "border-white bg-white" : "border-zinc-500 group-hover:border-zinc-350"
                                        }`}>
                                          {isChecked && (
                                            <Check className="size-3.5 text-zinc-950 font-bold" strokeWidth={4} />
                                          )}
                                        </span>
                                        <div className="flex flex-col min-w-0">
                                          <span className="text-xs font-semibold truncate leading-snug">{pl.title}</span>
                                          <span className="text-[10px] text-zinc-500 font-medium">
                                            {pl.videosCount} videos • {pl.visibility}
                                          </span>
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>

                                {/* New Playlist form inside dropdown */}
                                {showNewPlaylistForm ? (
                                  <div className="border-t border-zinc-850 pt-3 space-y-3">
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Title</label>
                                      <input 
                                        type="text"
                                        value={newPlaylistTitle}
                                        onChange={(e) => setNewPlaylistTitle(e.target.value.slice(0, 150))}
                                        placeholder="Enter playlist title"
                                        className="w-full h-8 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 text-xs text-zinc-200 focus:outline-none focus:border-[#3ea6ff]"
                                      />
                                    </div>
                                    
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Visibility</label>
                                      <select 
                                        value={newPlaylistVisibility}
                                        onChange={(e) => setNewPlaylistVisibility(e.target.value)}
                                        className="w-full h-8 bg-zinc-900 border border-zinc-800 rounded-lg px-2 text-xs text-zinc-350 focus:outline-none cursor-pointer"
                                      >
                                        <option>Public</option>
                                        <option>Private</option>
                                      </select>
                                    </div>

                                    <div className="flex items-center justify-end gap-2 pt-1">
                                      <button
                                        type="button"
                                        onClick={() => setShowNewPlaylistForm(false)}
                                        className="px-2.5 py-1 text-[10px] font-bold text-zinc-400 hover:text-white uppercase tracking-wider rounded-md"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        disabled={!newPlaylistTitle.trim()}
                                        onClick={() => {
                                          const newId = `pl-${Date.now()}`;
                                          const newPl = {
                                            id: newId,
                                            title: newPlaylistTitle.trim(),
                                            videosCount: 0,
                                            visibility: newPlaylistVisibility,
                                            updatedAt: "today"
                                          };
                                          const updatedList = [...playlistsList, newPl];
                                          localStorage.setItem("cartly_playlists", JSON.stringify(updatedList));
                                          setPlaylistsList(updatedList);
                                          setSelectedPlaylists([...selectedPlaylists, newId]);
                                          
                                          setNewPlaylistTitle("");
                                          setShowNewPlaylistForm(false);
                                          toast({ description: "Playlist created successfully!" });
                                        }}
                                        className="px-3 py-1 bg-white hover:bg-zinc-100 disabled:bg-zinc-800 disabled:text-zinc-650 text-zinc-950 text-[10px] font-bold uppercase tracking-wider rounded-md transition-colors"
                                      >
                                        Create
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="border-t border-zinc-850 pt-2 flex items-center justify-between">
                                    <button
                                      type="button"
                                      onClick={() => setShowNewPlaylistForm(true)}
                                      className="text-xs font-bold text-zinc-400 hover:text-white flex items-center gap-1 uppercase tracking-wider active:scale-95 transition-transform"
                                    >
                                      <span>New playlist</span>
                                      <span className="text-[10px]">▼</span>
                                    </button>
                                    
                                    <button
                                      type="button"
                                      onClick={() => setShowPlaylistDropdown(false)}
                                      className="bg-zinc-805 hover:bg-zinc-800 text-white text-xs font-bold px-3.5 py-1.5 rounded-full active:scale-95 transition-all"
                                    >
                                      Done
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Audience Section */}
                        <div className="space-y-4 pt-4 border-t border-zinc-850">
                          <div>
                            <h4 className="text-sm font-bold text-zinc-100">Audience</h4>
                            <div className="flex items-center gap-2 mt-1.5 select-none">
                              <span className="text-xs font-semibold text-zinc-200">This video is set to not made for kids</span>
                              <span className="text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700/80 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                                Set by you
                              </span>
                            </div>
                          </div>
                          
                          <p className="text-xs text-zinc-450 leading-relaxed max-w-2xl font-medium">
                            Regardless of your location, you're legally required to comply with the Children's Online Privacy Protection Act (COPPA) and/or other laws. You're required to tell us whether your videos are made for kids. <a href="#" className="text-[#3ea6ff] hover:underline font-bold">What's content made for kids?</a>
                          </p>

                          <div className="bg-[#1a1a1b] border border-zinc-850 rounded-xl p-4 flex items-start gap-3 shadow-inner">
                            <AlertCircle className="size-5 text-zinc-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-zinc-450 leading-relaxed font-semibold">
                              Features like personalized ads and notifications won’t be available on videos made for kids. Videos that are set as made for kids by you are more likely to be recommended alongside other kids’ videos. <a href="#" className="text-[#3ea6ff] hover:underline font-bold">Learn more</a>
                            </p>
                          </div>

                          {/* Custom Radio buttons for Kids */}
                          <div className="space-y-3.5 pl-1 pt-1 select-none">
                            <button 
                              type="button" 
                              onClick={() => setIsMadeForKids(true)}
                              className="flex items-center gap-3.5 group text-zinc-300 hover:text-white transition-colors"
                            >
                              <span className={`size-[22px] rounded-full border-2 flex items-center justify-center transition-all ${
                                isMadeForKids === true ? "border-white" : "border-zinc-500 group-hover:border-zinc-300"
                              }`}>
                                {isMadeForKids === true && (
                                  <span className="size-[10px] rounded-full bg-white" />
                                )}
                              </span>
                              <span className="text-sm font-semibold">Yes, it's made for kids</span>
                            </button>

                            <button 
                              type="button" 
                              onClick={() => setIsMadeForKids(false)}
                              className="flex items-center gap-3.5 group text-zinc-300 hover:text-white transition-colors"
                            >
                              <span className={`size-[22px] rounded-full border-2 flex items-center justify-center transition-all ${
                                isMadeForKids === false ? "border-white" : "border-zinc-500 group-hover:border-zinc-300"
                              }`}>
                                {isMadeForKids === false && (
                                  <span className="size-[10px] rounded-full bg-white" />
                                )}
                              </span>
                              <span className="text-sm font-semibold">No, it's not made for kids</span>
                            </button>
                          </div>

                          {/* Stateful Custom Age Restriction Accordion */}
                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={() => setIsAgeRestrictionExpanded(!isAgeRestrictionExpanded)}
                              className="text-xs font-bold text-zinc-400 hover:text-zinc-200 cursor-pointer flex items-center gap-1.5 select-none"
                            >
                              <ChevronRight className={`size-4 transition-transform ${isAgeRestrictionExpanded ? "rotate-90" : ""}`} />
                              <span>Age restriction (advanced)</span>
                            </button>
                            
                            {isAgeRestrictionExpanded && (
                              <div className="pl-6 pt-4 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                                <h5 className="text-xs font-bold text-zinc-200">Do you want to restrict your video to an adult audience?</h5>
                                <p className="text-xs text-zinc-450 leading-relaxed font-semibold max-w-xl">
                                  Age-restricted videos are not shown in certain areas of Cartly. These videos may have limited or no ads monetization. <a href="#" className="text-[#3ea6ff] hover:underline font-bold">Learn more</a>
                                </p>

                                {/* Custom Radio buttons for Age restrictions */}
                                 <div className="space-y-3.5 select-none">
                                  <button 
                                    type="button" 
                                    onClick={() => setIsAgeRestricted(true)}
                                    className="flex items-center gap-3.5 group text-zinc-300 hover:text-white transition-colors"
                                  >
                                    <span className={`size-[22px] rounded-full border-2 flex items-center justify-center transition-all ${
                                      isAgeRestricted === true ? "border-white" : "border-zinc-500 group-hover:border-zinc-300"
                                    }`}>
                                      {isAgeRestricted === true && (
                                        <span className="size-[10px] rounded-full bg-white" />
                                      )}
                                    </span>
                                    <span className="text-xs font-semibold">Yes, restrict my video to viewers over 18</span>
                                  </button>

                                  <button 
                                    type="button" 
                                    onClick={() => setIsAgeRestricted(false)}
                                    className="flex items-center gap-3.5 group text-zinc-300 hover:text-white transition-colors"
                                  >
                                    <span className={`size-[22px] rounded-full border-2 flex items-center justify-center transition-all ${
                                      isAgeRestricted === false ? "border-white" : "border-zinc-500 group-hover:border-zinc-300"
                                    }`}>
                                      {isAgeRestricted === false && (
                                        <span className="size-[10px] rounded-full bg-white" />
                                      )}
                                    </span>
                                    <span className="text-xs font-semibold">No, don't restrict my video to viewers over 18 only</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Stateful YouTube-styled "Show More / Show Less" pill button toggle */}
                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={() => setShowMoreDetails(!showMoreDetails)}
                              className="h-9 px-5 bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-200 hover:text-white rounded-full font-bold text-xs active:scale-95 transition-all select-none border border-zinc-750 shadow-sm"
                            >
                              {showMoreDetails ? "Show less" : "Show more"}
                            </button>
                          </div>
                        </div>

                        {showMoreDetails && (
                          <div className="space-y-8 pt-4">
                            {/* Paid Promotion Section */}
                            <div className="space-y-3 pt-4 border-t border-zinc-850">
                              <h4 className="text-[15px] font-bold text-zinc-100">Paid promotion</h4>
                              <p className="text-[14px] text-zinc-400 leading-relaxed font-medium">
                                If you accepted anything of value from a third party to make your video, you must let us know. We’ll show viewers a message that tells them your video contains paid promotion.
                              </p>
                              
                              <div className="pt-1.5 select-none">
                                <button
                                  type="button"
                                  onClick={() => setHasPaidPromotion(!hasPaidPromotion)}
                                  className="flex items-start gap-3.5 group text-zinc-300 hover:text-white transition-colors text-left"
                                >
                                  <span className={`size-5 rounded-[3px] border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                                    hasPaidPromotion ? "border-white bg-white" : "border-zinc-500 group-hover:border-zinc-350"
                                  }`}>
                                    {hasPaidPromotion && (
                                      <Check className="size-3.5 text-zinc-950 font-bold" strokeWidth={4} />
                                    )}
                                  </span>
                                  <span className="text-[14px] text-zinc-200 font-semibold leading-relaxed">
                                    My video contains paid promotion like a product placement, sponsorship, or endorsement
                                  </span>
                                </button>
                              </div>

                              <p className="text-[14px] text-zinc-400 leading-relaxed pl-8.5 font-medium">
                                If you were compensated to include a product or service in your video, you’re required to let us know, so we can tell viewers your video has paid promotion. This is turned on automatically if you partner with a brand. <a href="#" className="text-[#3ea6ff] hover:underline font-bold">Learn more</a>
                              </p>
                            </div>

                        {/* AI Use Section */}
                        <div className="space-y-4 pt-4 border-t border-zinc-850">
                          <div>
                            <h4 className="text-[15px] font-bold text-zinc-100">AI use</h4>
                            <p className="text-[14px] text-zinc-300 font-medium mt-1">
                              Was AI used to generate or edit your content in any of the following ways?
                            </p>
                          </div>
                          <ul className="list-disc pl-5 text-[14px] text-zinc-400 space-y-1.5 font-medium">
                            <li>Makes a real person appear to say or do something they didn’t say or do</li>
                            <li>Alters footage of a real event or place</li>
                            <li>Generates a realistic-looking scene that didn’t actually occur</li>
                          </ul>

                          <div className="flex items-center gap-6 pl-1 select-none">
                            <button 
                              type="button" 
                              onClick={() => setIsAiGenerated(true)}
                              className="flex items-center gap-3.5 group text-zinc-300 hover:text-white transition-colors"
                            >
                              <span className={`size-[22px] rounded-full border-2 flex items-center justify-center transition-all ${
                                isAiGenerated === true ? "border-white" : "border-zinc-500 group-hover:border-zinc-300"
                              }`}>
                                {isAiGenerated === true && (
                                  <span className="size-[10px] rounded-full bg-white" />
                                )}
                              </span>
                              <span className="text-[14px] font-semibold">Yes</span>
                            </button>

                            <button 
                              type="button" 
                              onClick={() => setIsAiGenerated(false)}
                              className="flex items-center gap-3.5 group text-zinc-300 hover:text-white transition-colors"
                            >
                              <span className={`size-[22px] rounded-full border-2 flex items-center justify-center transition-all ${
                                isAiGenerated === false ? "border-white" : "border-zinc-500 group-hover:border-zinc-300"
                              }`}>
                                {isAiGenerated === false && (
                                  <span className="size-[10px] rounded-full bg-white" />
                                )}
                              </span>
                              <span className="text-[14px] font-semibold">No</span>
                            </button>
                          </div>

                          <p className="text-[14px] text-zinc-450 leading-relaxed font-medium">
                            To follow Cartly’s policy, you’re required to tell us about your use of AI. This includes realistic sounds or visuals made or edited with AI. <a href="#" className="text-[#3ea6ff] hover:underline font-bold">View examples</a>
                          </p>
                          <p className="text-[14px] text-zinc-450 leading-relaxed font-medium">
                            Selecting “yes” adds a <a href="#" className="text-[#3ea6ff] hover:underline font-bold">disclosure</a> to your content.
                          </p>
                        </div>

                        {/* Collaboration Section */}
                        <div className="space-y-3 pt-4 border-t border-zinc-850">
                          <h4 className="text-[15px] font-bold text-zinc-100">Collaboration</h4>
                          <p className="text-[14px] text-zinc-400 leading-relaxed font-medium">
                            Grow your audience by collaborating with other creators and expand your video’s reach to their audiences. <a href="#" className="text-[#3ea6ff] hover:underline font-bold">Learn more</a>
                          </p>
                          <button type="button" className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-2 rounded-full font-bold text-xs border border-zinc-700 active:scale-95 transition-all">
                            Invite a collaborator
                          </button>
                        </div>

                        {/* Chapters Section */}
                        <div className="space-y-3 pt-4 border-t border-zinc-850">
                          <h4 className="text-[15px] font-bold text-zinc-100">Automatic chapters</h4>
                          <p className="text-[14px] text-zinc-400 leading-relaxed font-medium">
                            Chapters and key moments make your video easier to watch. You can overwrite automatic suggestions by creating your own chapters in the video description. <a href="#" className="text-[#3ea6ff] hover:underline font-bold">Learn more</a>
                          </p>
                          
                          <div className="pt-1 select-none">
                            <button
                              type="button"
                              onClick={() => setAllowAutomaticChapters(!allowAutomaticChapters)}
                              className="flex items-center gap-3.5 group text-zinc-350 hover:text-white transition-colors text-left"
                            >
                              <span className={`size-5 rounded-[3px] border-2 flex items-center justify-center shrink-0 transition-all ${
                                allowAutomaticChapters ? "border-white bg-white" : "border-zinc-500 group-hover:border-zinc-350"
                              }`}>
                                {allowAutomaticChapters && (
                                  <Check className="size-3.5 text-zinc-950 font-bold" strokeWidth={4} />
                                )}
                              </span>
                              <span className="text-[14px] font-semibold text-zinc-200">Allow automatic chapters and key moments</span>
                            </button>
                          </div>
                        </div>

                        {/* Featured Places Section */}
                        <div className="space-y-3 pt-4 border-t border-zinc-850">
                          <h4 className="text-[15px] font-bold text-zinc-100">Featured places</h4>
                          <p className="text-[14px] text-zinc-400 leading-relaxed font-medium">
                            Help viewers explore key places in your video. These are public places like restaurants and shops – we don’t display your current location or other private info. <a href="#" className="text-[#3ea6ff] hover:underline font-bold">Learn more</a>
                          </p>

                          <div className="pt-1 select-none">
                            <button
                              type="button"
                              onClick={() => setAllowAutomaticPlaces(!allowAutomaticPlaces)}
                              className="flex items-center gap-3.5 group text-zinc-350 hover:text-white transition-colors text-left"
                            >
                              <span className={`size-5 rounded-[3px] border-2 flex items-center justify-center shrink-0 transition-all ${
                                allowAutomaticPlaces ? "border-white bg-white" : "border-zinc-500 group-hover:border-zinc-350"
                              }`}>
                                {allowAutomaticPlaces && (
                                  <Check className="size-3.5 text-zinc-950 font-bold" strokeWidth={4} />
                                )}
                              </span>
                              <span className="text-[14px] font-semibold text-zinc-200">Allow automatic places</span>
                            </button>
                          </div>
                        </div>

                        {/* Concepts Section */}
                        <div className="space-y-3 pt-4 border-t border-zinc-850">
                          <div className="flex items-center gap-2">
                            <h4 className="text-[15px] font-bold text-zinc-100">Automatic concepts</h4>
                            <span className="text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider select-none">
                              Experiment
                            </span>
                          </div>
                          <p className="text-[14px] text-zinc-400 leading-relaxed font-medium">
                            Help viewers learn more about unfamiliar terms without leaving the video. Concepts mentioned in your video may automatically appear in the description.
                          </p>

                          <div className="pt-1 select-none">
                            <button
                              type="button"
                              onClick={() => setAllowAutomaticConcepts(!allowAutomaticConcepts)}
                              className="flex items-center gap-3.5 group text-zinc-350 hover:text-white transition-colors text-left"
                            >
                              <span className={`size-5 rounded-[3px] border-2 flex items-center justify-center shrink-0 transition-all ${
                                allowAutomaticConcepts ? "border-white bg-white" : "border-zinc-500 group-hover:border-zinc-350"
                              }`}>
                                {allowAutomaticConcepts && (
                                  <Check className="size-3.5 text-zinc-950 font-bold" strokeWidth={4} />
                                )}
                              </span>
                              <span className="text-[14px] font-semibold text-zinc-200">Allow automatic concepts</span>
                            </button>
                          </div>
                        </div>

                        {/* Tags Section */}
                        <div className="space-y-3 pt-4 border-t border-zinc-855">
                          <h4 className="text-[15px] font-bold text-zinc-100">Tags</h4>
                          <p className="text-[14px] text-zinc-400 leading-relaxed font-medium">
                            Tags can be useful if content in your video is commonly misspelled. Otherwise, tags play a minimal role in helping viewers find your video. <a href="#" className="text-[#3ea6ff] hover:underline font-bold">Learn more</a>
                          </p>
                          <div className="glow-border-card">
                            <div className="glow-border-inner p-3 flex flex-col">
                              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Add tag</span>
                              <input 
                                type="text" 
                                placeholder="Enter a comma after each tag" 
                                className="bg-transparent border-none outline-none text-sm text-zinc-100 mt-1 placeholder-zinc-600 w-full"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end text-[10px] text-zinc-500 font-semibold pr-1">
                            0/500
                          </div>
                        </div>

                        {/* Language/Captions Section */}
                        <div className="space-y-4 pt-4 border-t border-zinc-850">
                          <div>
                            <h4 className="text-[15px] font-bold text-zinc-100">Language and captions certification</h4>
                            <p className="text-[14px] text-zinc-400 font-medium mt-0.5">
                              Select your video's language and, if needed, a caption certification
                            </p>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <CustomSelect
                              label="Video language"
                              value={selectedLanguage}
                              options={["Select", "English", "Spanish"]}
                              isOpen={activeLanguageDropdown}
                              onToggle={() => {
                                setActiveLanguageDropdown(!activeLanguageDropdown);
                                setActiveCaptionDropdown(false);
                              }}
                              onSelect={(opt) => setSelectedLanguage(opt)}
                            />

                            <CustomSelect
                              label="Caption certification"
                              value={selectedCaption}
                              options={["None", "This content has never aired on television in the US"]}
                              isOpen={activeCaptionDropdown}
                              onToggle={() => {
                                setActiveCaptionDropdown(!activeCaptionDropdown);
                                setActiveLanguageDropdown(false);
                              }}
                              onSelect={(opt) => setSelectedCaption(opt)}
                            />
                          </div>
                        </div>

                        {/* Date and Location Section */}
                        <div className="space-y-4 pt-4 border-t border-zinc-850">
                          <div>
                            <h4 className="text-[15px] font-bold text-zinc-100">Recording date and location</h4>
                            <p className="text-[14px] text-zinc-400 font-medium mt-0.5">
                              Add when and where your video was recorded. Viewers can search for videos by location.
                            </p>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-xs text-zinc-400 font-semibold">Recording date</label>
                              <input 
                                type="date"
                                className="w-full h-10 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl px-3.5 text-sm text-zinc-300 focus:outline-none cursor-pointer"
                              />
                            </div>
                            
                            <div className="space-y-1.5">
                              <label className="text-xs text-zinc-400 font-semibold">Video location</label>
                              <input 
                                type="text"
                                placeholder="None"
                                className="w-full h-10 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl px-3.5 text-sm text-zinc-300 focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>

                        {/* License Section */}
                        <div className="space-y-3 pt-4 border-t border-zinc-850">
                          <h4 className="text-[15px] font-bold text-zinc-100">License</h4>
                          <p className="text-[14px] text-zinc-400 font-medium">
                            Learn about <a href="#" className="text-[#3ea6ff] hover:underline font-bold">license types</a>.
                          </p>
                          <div className="max-w-xs">
                            <CustomSelect
                              value={selectedLicense}
                              options={["Standard Cartly License", "Creative Commons - Attribution"]}
                              isOpen={activeLicenseDropdown}
                              onToggle={() => setActiveLicenseDropdown(!activeLicenseDropdown)}
                              onSelect={(opt) => setSelectedLicense(opt)}
                            />
                          </div>
                          
                          <div className="space-y-3 pt-2 select-none">
                            <button
                              type="button"
                              onClick={() => setAllowEmbedding(!allowEmbedding)}
                              className="flex items-center gap-3.5 group text-zinc-350 hover:text-white transition-colors text-left"
                            >
                              <span className={`size-5 rounded-[3px] border-2 flex items-center justify-center shrink-0 transition-all ${
                                allowEmbedding ? "border-white bg-white" : "border-zinc-500 group-hover:border-zinc-350"
                              }`}>
                                {allowEmbedding && (
                                  <Check className="size-3.5 text-zinc-950 font-bold" strokeWidth={4} />
                                )}
                              </span>
                              <span className="text-[14px] font-semibold text-zinc-200">Allow embedding (?)</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setPublishToFeed(!publishToFeed)}
                              className="flex items-start gap-3.5 group text-zinc-350 hover:text-white transition-colors text-left"
                            >
                              <span className={`size-5 rounded-[3px] border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                                publishToFeed ? "border-white bg-white" : "border-zinc-500 group-hover:border-zinc-350"
                              }`}>
                                {publishToFeed && (
                                  <Check className="size-3.5 text-zinc-950 font-bold" strokeWidth={4} />
                                )}
                              </span>
                              <span className="text-[14px] font-semibold text-zinc-200">Publish to subscriptions feed and notify subscribers</span>
                            </button>
                          </div>
                        </div>

                        {/* Shorts Remixing */}
                        <div className="space-y-3 pt-4 border-t border-zinc-850">
                          <h4 className="text-[15px] font-bold text-zinc-100">Shorts remixing</h4>
                          <p className="text-[14px] text-zinc-400 font-medium">
                            Let others create Shorts using content from this video. <a href="#" className="text-[#3ea6ff] hover:underline font-bold">Learn more</a>
                          </p>
                          
                          <div className="space-y-3.5 pt-1 select-none">
                            <button 
                              type="button" 
                              onClick={() => setAllowShortsRemixing(true)}
                              className="flex items-center gap-3.5 group text-zinc-300 hover:text-white transition-colors text-left"
                            >
                              <span className={`size-[22px] rounded-full border-2 flex items-center justify-center transition-all ${
                                allowShortsRemixing === true ? "border-white" : "border-zinc-500 group-hover:border-zinc-300"
                              }`}>
                                {allowShortsRemixing === true && (
                                  <span className="size-[10px] rounded-full bg-white" />
                                )}
                              </span>
                              <span className="text-[14px] font-semibold">Allow video and audio remixing</span>
                            </button>

                            <button 
                              type="button" 
                              onClick={() => setAllowShortsRemixing(false)}
                              className="flex items-center gap-3.5 group text-zinc-300 hover:text-white transition-colors text-left"
                            >
                              <span className={`size-[22px] rounded-full border-2 flex items-center justify-center transition-all ${
                                allowShortsRemixing === false ? "border-white" : "border-zinc-500 group-hover:border-zinc-300"
                              }`}>
                                {allowShortsRemixing === false && (
                                  <span className="size-[10px] rounded-full bg-white" />
                                )}
                              </span>
                              <span className="text-[14px] font-semibold">Allow only audio remixing</span>
                            </button>
                          </div>
                        </div>

                        {/* Category */}
                        <div className="space-y-3 pt-4 border-t border-zinc-850">
                          <h4 className="text-[15px] font-bold text-zinc-100">Category</h4>
                          <p className="text-[14px] text-zinc-400 font-medium">
                            Add your video to a category so viewers can find it more easily
                          </p>
                          <div className="max-w-xs">
                            <CustomSelect
                              value={selectedCategory}
                              options={["People & Blogs", "Gaming", "Music", "Education"]}
                              isOpen={activeCategoryDropdown}
                              onToggle={() => setActiveCategoryDropdown(!activeCategoryDropdown)}
                              onSelect={(opt) => setSelectedCategory(opt)}
                            />
                          </div>
                        </div>

                        {/* Comments and Ratings */}
                        <div className="space-y-4 pt-4 border-t border-zinc-850 pb-6">
                          <div>
                            <h4 className="text-[15px] font-bold text-zinc-100">Comments and ratings</h4>
                            <p className="text-[14px] text-zinc-400 font-medium mt-0.5">
                              Choose if and how you want to show comments
                            </p>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <CustomSelect
                              label="Comments"
                              value={selectedComments}
                              options={["On", "Pause", "Off"]}
                              isOpen={activeCommentsDropdown}
                              onToggle={() => {
                                setActiveCommentsDropdown(!activeCommentsDropdown);
                                setActiveModerationDropdown(false);
                                setActiveWhoCanCommentDropdown(false);
                                setActiveSortByDropdown(false);
                              }}
                              onSelect={(opt) => setSelectedComments(opt)}
                            />

                            <CustomSelect
                              label="Moderation"
                              value={selectedModeration}
                              options={["None", "Basic", "Strict"]}
                              isOpen={activeModerationDropdown}
                              onToggle={() => {
                                setActiveModerationDropdown(!activeModerationDropdown);
                                setActiveCommentsDropdown(false);
                                setActiveWhoCanCommentDropdown(false);
                                setActiveSortByDropdown(false);
                              }}
                              onSelect={(opt) => setSelectedModeration(opt)}
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1.5">
                            <CustomSelect
                              label="Who can comment"
                              value={selectedWhoCanComment}
                              options={["Anyone", "Subscribers only"]}
                              isOpen={activeWhoCanCommentDropdown}
                              onToggle={() => {
                                setActiveWhoCanCommentDropdown(!activeWhoCanCommentDropdown);
                                setActiveCommentsDropdown(false);
                                setActiveModerationDropdown(false);
                                setActiveSortByDropdown(false);
                              }}
                              onSelect={(opt) => setSelectedWhoCanComment(opt)}
                            />

                            <CustomSelect
                              label="Sort by"
                              value={selectedSortBy}
                              options={["Top", "Newest"]}
                              isOpen={activeSortByDropdown}
                              onToggle={() => {
                                setActiveSortByDropdown(!activeSortByDropdown);
                                setActiveCommentsDropdown(false);
                                setActiveModerationDropdown(false);
                                setActiveWhoCanCommentDropdown(false);
                              }}
                              onSelect={(opt) => setSelectedSortBy(opt)}
                            />
                          </div>

                          <div className="pt-2 select-none">
                            <button
                              type="button"
                              onClick={() => setShowLikesCount(!showLikesCount)}
                              className="flex items-center gap-3.5 group text-zinc-350 hover:text-white transition-colors text-left"
                            >
                              <span className={`size-5 rounded-[3px] border-2 flex items-center justify-center shrink-0 transition-all ${
                                showLikesCount ? "border-white bg-white" : "border-zinc-500 group-hover:border-zinc-350"
                              }`}>
                                {showLikesCount && (
                                  <Check className="size-3.5 text-zinc-950 font-bold" strokeWidth={4} />
                                )}
                              </span>
                              <span className="text-[14px] font-semibold text-zinc-200">Show how many viewers like this video</span>
                            </button>
                          </div>

                          </div>
                          </div>
                        )}
                      </>
                    )}
                    
                    {videoStep > 1 && (
                      <div className="h-full flex flex-col items-center justify-center text-center p-8">
                        <div className="size-16 bg-zinc-800/80 rounded-full flex items-center justify-center mb-4 border border-zinc-700">
                          <Sparkles className="size-8 text-[#3ea6ff] animate-pulse" />
                        </div>
                        <h3 className="text-lg font-bold text-zinc-200">Step {videoStep} content loaded</h3>
                        <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                          This section configures properties for step {videoStep} of your video upload.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* RIGHT PREVIEW & LINK PANEL (40%) */}
                  <div className="w-[340px] shrink-0 border-l border-zinc-800 p-6 flex flex-col gap-4 bg-[#161617] overflow-y-auto custom-scrollbar">
                    {/* Glowing Vector Video Card Wrapper */}
                    <div className="glow-border-card">
                      <div className="glow-border-inner overflow-hidden flex flex-col bg-[#1a1a1a] border border-zinc-800">
                        {/* Video player box */}
                        <div className="relative aspect-video bg-[#0f0f0f] w-full flex items-center justify-center overflow-hidden border-b border-zinc-850">
                          <video 
                            src={videoObjectURL || ""} 
                            controls 
                            className="w-full h-full object-contain"
                          />
                        </div>
                        
                        {/* Video details card body */}
                        <div className="p-4 space-y-3.5">
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Video link</span>
                            <div className="flex items-center justify-between bg-zinc-950 px-3 py-2.5 rounded-lg border border-zinc-800 gap-2">
                              <a 
                                href={`https://cartly.com/video/short_preview`} 
                                target="_blank"
                                className="text-xs text-[#3ea6ff] hover:underline truncate select-text"
                              >
                                https://cartly.com/video/short_preview
                              </a>
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText("https://cartly.com/video/short_preview");
                                  toast({ description: "Video link copied to clipboard!" });
                                }}
                                className="text-zinc-500 hover:text-zinc-300 transition-colors shrink-0 p-1 rounded hover:bg-zinc-800"
                                title="Copy link"
                              >
                                <Copy className="size-3.5" />
                              </button>
                            </div>
                          </div>
                          
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Filename</span>
                            <p className="text-xs text-zinc-300 font-semibold truncate" title={selectedVideoFile.name}>
                              {selectedVideoFile.name}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="shrink-0 px-6 py-4 border-t border-zinc-800 bg-[#161617] flex items-center justify-between">
                  <div className="flex items-center gap-3.5 text-zinc-400 font-semibold text-xs select-none">
                    <span className="text-zinc-400">↑</span>
                    <span className="border border-zinc-700 px-1 rounded text-[9px] font-bold">SD</span>
                    <span>Checks complete. No issues found.</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {videoStep > 1 && (
                      <Button 
                        variant="ghost" 
                        onClick={() => setVideoStep(videoStep - 1)}
                        className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold px-4 py-2 rounded-full active:scale-95"
                      >
                        Back
                      </Button>
                    )}
                    
                    <Button 
                      onClick={() => {
                        if (videoStep < 4) {
                          setVideoStep(videoStep + 1);
                        } else {
                          toast({ description: "Video published successfully!" });
                          closeUploadVideoDialog();
                        }
                      }}
                      className="text-xs bg-white hover:bg-zinc-100 text-zinc-950 font-bold px-5 py-2 rounded-full active:scale-95"
                    >
                      {videoStep === 4 ? "Publish" : "Next"}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              // ----------------------------------------------------
              // DRAG AND DROP / SELECT FILE WINDOW
              // ----------------------------------------------------
              <>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-700/50">
                  <h2 className="text-xl font-bold tracking-tight">Upload videos</h2>
                  <div className="flex items-center gap-3">
                    <button className="p-2 hover:bg-zinc-700/50 rounded-full transition-colors text-zinc-400 hover:text-zinc-200">
                      <MessageSquare className="size-5" />
                    </button>
                    <button 
                      onClick={closeUploadVideoDialog}
                      className="p-2 hover:bg-zinc-700/50 rounded-full transition-colors text-zinc-400 hover:text-zinc-200"
                    >
                      <X className="size-5" />
                    </button>
                  </div>
                </div>
                
                {/* Body */}
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  {/* Circular upload symbol */}
                  <div className="size-[136px] bg-[#1f1f1f] rounded-full flex items-center justify-center mb-6 border border-zinc-700/30">
                    <Upload className="size-14 text-zinc-400" />
                  </div>
                  
                  <p className="text-[15px] font-medium text-zinc-300 mb-6">
                    Drag and drop video files to upload
                  </p>
                  
                  <button 
                    onClick={() => videoInputRef.current?.click()}
                    className="bg-white hover:bg-zinc-100 text-zinc-950 px-6 py-2.5 rounded-full font-bold text-sm transition-all shadow-md active:scale-95"
                  >
                    Select files
                  </button>
                  
                  <input 
                    type="file" 
                    accept="video/*" 
                    ref={videoInputRef}
                    className="hidden" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setSelectedVideoFile(file);
                        setVideoTitle(file.name.replace(/\.[^/.]+$/, ""));
                        setVideoDescription("");
                        setVideoStep(1);
                        const objectUrl = URL.createObjectURL(file);
                        setVideoObjectURL(objectUrl);
                      }
                    }}
                  />
                </div>
                
                {/* Footer */}
                <div className="px-8 pb-8 pt-4 text-center">
                  <p className="text-xs text-zinc-500 leading-relaxed max-w-xl mx-auto">
                    By submitting your videos to Cartly, you acknowledge that you agree to Cartly's{" "}
                    <a href="#" className="text-[#3ea6ff] hover:underline">Terms of Service</a> and{" "}
                    <a href="#" className="text-[#3ea6ff] hover:underline">Community Guidelines</a>.
                  </p>
                  <p className="text-xs text-zinc-500 leading-relaxed max-w-xl mx-auto mt-2">
                    Please be sure not to violate others' copyright or privacy rights.{" "}
                    <a href="#" className="text-[#3ea6ff] hover:underline">Learn more</a>
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
