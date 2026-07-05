"use client";

import { useState, useRef } from "react";
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
import Resizer from "react-image-file-resizer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
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
  Sparkles
} from "lucide-react";

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

  // Link Builder
  const [links, setLinks] = useState<CustomLink[]>([
    {
      id: "primary",
      title: "My Website",
      url: user.websiteUrl || "",
    },
  ]);

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

  const [avatarImageToCrop, setAvatarImageToCrop] = useState<File>();
  const [bannerImageToCrop, setBannerImageToCrop] = useState<File>();

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
    <div className="min-h-screen bg-[#f9f9f9] dark:bg-[#0f0f0f] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans">
      {/* 1. Header Navigation Bar (YouTube Studio style) */}
      <header className="sticky top-0 z-50 h-[64px] border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f0f0f] flex items-center justify-between px-6 select-none">
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors hidden sm:inline-flex">
            <Menu className="size-5 text-zinc-600 dark:text-zinc-400" />
          </button>
          <div className="flex items-center gap-1.5">
            <div className="bg-[#cc0000] text-white p-1.5 rounded-lg flex items-center justify-center font-bold text-xs select-none">
              STUDIO
            </div>
            <span className="font-semibold text-lg tracking-tight">Cartly Studio</span>
          </div>
        </div>

        {/* Center Mock Search */}
        <div className="hidden md:flex max-w-[480px] w-full relative">
          <input
            type="text"
            placeholder="Search across your channel"
            className="w-full h-9 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 text-sm focus:outline-none focus:border-blue-500 transition-colors"
            readOnly
          />
        </div>

        <div className="flex items-center gap-3">
          <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
            <HelpCircle className="size-5 text-zinc-600 dark:text-zinc-400" />
          </button>
          <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors relative">
            <Bell className="size-5 text-zinc-600 dark:text-zinc-400" />
            <span className="absolute top-1.5 right-1.5 bg-[#cc0000] size-2 rounded-full"></span>
          </button>
          <button className="h-9 px-4 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-sm font-medium flex items-center gap-1.5 transition-colors border border-black/5 dark:border-white/5">
            <Video className="size-4 text-[#cc0000]" />
            <span>CREATE</span>
          </button>
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
      <div className="flex-1 flex">
        {/* 2. Side Panel Left Menu (YouTube Studio Style) */}
        <aside className="w-[256px] flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0f0f0f] hidden lg:flex flex-col select-none py-4">
          {/* Creator Profile Summary Widget */}
          <div className="flex flex-col items-center text-center px-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
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
                className={`w-full flex items-center gap-4 px-4 py-2.5 rounded-lg text-sm font-medium transition-all relative ${
                  item.active
                    ? "text-[#cc0000] bg-red-50/50 dark:bg-red-950/20"
                    : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
                }`}
              >
                {item.active && (
                  <span className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#cc0000] rounded-r" />
                )}
                <item.icon className={`size-5 ${item.active ? "text-[#cc0000]" : "text-zinc-500 dark:text-zinc-400"}`} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Footer items */}
          <div className="px-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <button className="w-full flex items-center gap-4 px-4 py-2.5 rounded-lg text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900 font-medium">
              <Settings className="size-5 text-zinc-500 dark:text-zinc-400" />
              <span>Settings</span>
            </button>
          </div>
        </aside>

        {/* 3. Right Content Studio Panels */}
        <main className="flex-1 min-w-0 bg-white dark:bg-[#1f1f1f] flex flex-col">
          {/* Top Actions Floating Header */}
          <div className="sticky top-[64px] z-40 bg-white dark:bg-[#1f1f1f] border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-6 py-4">
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
          <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#1f1f1f] px-6 flex items-center gap-6">
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

          {/* Core Content Form Container */}
          <div className="flex-1 p-6 md:p-8 max-w-4xl w-full mx-auto overflow-y-auto space-y-8 pb-20">
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
                  <div className="w-full md:w-[240px] aspect-[16/9] relative rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center shrink-0 self-center md:self-start">
                    {bannerPreview ? (
                      <img
                        src={bannerPreview}
                        alt="Banner preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-4 text-center">
                        <AlertCircle className="size-6 text-zinc-300 mb-1" />
                        <span className="text-[10px] text-zinc-400">No banner uploaded</span>
                      </div>
                    )}
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
    </div>
  );
}
