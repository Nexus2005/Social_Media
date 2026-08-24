"use client";

import { useSession } from "@/app/(main)/SessionProvider";
import FollowButton from "@/components/FollowButton";
import UserAvatar from "@/components/UserAvatar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { FollowerInfo, UserData } from "@/lib/types";
import { formatNumber } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import kyInstance from "@/lib/ky";
import { ArrowLeft, Bell, Menu, Heart, MessageSquare, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, memo } from "react";
import ProfileHeaderActions from "./ProfileHeaderActions";
import ProfileFollowsInfo from "./ProfileFollowsInfo";
import MutualsLink from "./MutualsLink";
import ProfileMenuDrawer from "./ProfileMenuDrawer";
import ShareProfileDialog from "@/components/posts/ShareProfileDialog";
import useFollowerInfo from "@/hooks/useFollowerInfo";
import { useToast } from "@/components/ui/use-toast";

interface ProfileLayoutClientProps {
  user: UserData;
  loggedInUserId: string;
  totalViews?: number;
}

export default function ProfileLayoutClient({
  user,
  loggedInUserId,
  totalViews = 0,
}: ProfileLayoutClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [scrollY, setScrollY] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const forceUnlockScroll = () => {
      document.body.style.removeProperty("overflow");
      document.body.style.removeProperty("pointer-events");
      if (document.documentElement) {
        document.documentElement.style.removeProperty("overflow");
      }
    };

    forceUnlockScroll();
    
    // Also perform delayed execution to ensure rendering lifecycle triggers are captured
    const t1 = setTimeout(forceUnlockScroll, 100);
    const t2 = setTimeout(forceUnlockScroll, 400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [pathname, searchParams]);

  // State Machine calculations
  // 0-120px = EXPANDED
  // 120-220px = COLLAPSING
  // 220px+ = COLLAPSED
  let headerState: "EXPANDED" | "COLLAPSING" | "COLLAPSED" = "EXPANDED";
  let opacity = 0; // for the collapsed header elements
  let bgOpacity = 0; // for header background

  if (scrollY > 220) {
    headerState = "COLLAPSED";
    opacity = 1;
    bgOpacity = 1;
  } else if (scrollY > 120) {
    headerState = "COLLAPSING";
    opacity = (scrollY - 120) / 100;
    bgOpacity = (scrollY - 120) / 100;
  }

  const isOwner = user.id === loggedInUserId;

  const followerInfo: FollowerInfo = {
    followers: user._count.followers,
    isFollowedByUser: user.followers.some(
      (f: any) => f.followerId === loggedInUserId
    ),
  };

  const { data: followerState } = useFollowerInfo(user.id, followerInfo);

  // Fetch pinned reels
  const { data: pinnedReels = [], isLoading: isLoadingPinned } = useQuery<any[]>({
    queryKey: ["user-pinned-reels", user.id],
    queryFn: () => kyInstance.get(`/api/users/${user.id}/pinned`).json<any[]>(),
  });

  const channelUrl = typeof window !== "undefined"
    ? `${window.location.origin}/users/${user.username}`
    : `/users/${user.username}`;

  const formattedJoinDate = new Date(user.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="w-full relative bg-white dark:bg-instagram-darkBg text-instagram-lightText dark:text-instagram-darkText">
      {/* Sticky Collapsing Header Bar */}
      <header
        style={{
          backgroundColor: `rgba(18, 18, 18, ${bgOpacity})`,
          backdropFilter: bgOpacity > 0.5 ? "blur(12px)" : "none",
        }}
        className="sticky top-0 z-40 flex h-[56px] w-full items-center justify-between px-4 border-b border-instagram-lightBorder dark:border-instagram-darkBorder transition-colors duration-150"
      >
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-zinc-900 rounded-full text-[#E4E4E7] transition-colors"
          title="Back"
        >
          <ArrowLeft className="size-6" strokeWidth={2} />
        </button>

        <div
          style={{ opacity }}
          className="flex items-center gap-1.5 transition-opacity duration-150 select-none"
        >
          <span className="text-[17px] font-bold text-white max-w-[180px] truncate">
            {user.username}
          </span>
          {user.verified && (
            <VerifiedBadge size={14} className="shrink-0" />
          )}
        </div>

        <div className="flex items-center gap-1">
          {!isOwner && (
            <button
              className="p-2 hover:bg-zinc-900 rounded-full text-[#E4E4E7] transition-colors"
              title="Notifications"
            >
              <Bell className="size-5.5" strokeWidth={2} />
            </button>
          )}
          <button
            onClick={() => setIsMenuOpen(true)}
            className="p-2 hover:bg-zinc-900 rounded-full text-[#E4E4E7] transition-colors"
            title="Options"
          >
            <Menu className="size-5.5" strokeWidth={2} />
          </button>
        </div>
      </header>

      {/* Profile Header Content (Banner, Avatar, Details, Actions) */}
      <div className="w-full bg-white dark:bg-instagram-darkBg flex flex-col pt-3 gap-6">
        
        {/* 1. Wide Banner with rounded-2xl */}
        <div className="w-full aspect-[4/1] md:aspect-[6.2/1] bg-zinc-900 relative overflow-hidden select-none rounded-[20px] md:rounded-[24px] border border-black/10 dark:border-white/5 shrink-0">
          {user.headerBannerUrl ? (
            <img
              src={user.headerBannerUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-zinc-800 to-zinc-950" />
          )}
        </div>

        {/* 2. Info Grid: Avatar on Left, Channel Info & Actions on Right */}
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start select-text w-full px-4 md:px-0 pb-6 border-b border-instagram-lightBorder dark:border-instagram-darkBorder">
          
          {/* Avatar */}
          <div className="shrink-0 mx-auto md:mx-0">
            <UserAvatar
              avatarUrl={user.avatarUrl}
              size={160}
              className="w-[120px] h-[120px] md:w-[160px] md:h-[160px] rounded-full object-cover border border-black/10 dark:border-zinc-850 bg-zinc-900 shadow-md"
            />
          </div>

          {/* Texts & Actions stacked vertically on right */}
          <div className="flex-grow flex flex-col text-center md:text-start items-center md:items-start space-y-3.5 w-full min-w-0">
            
            {/* Title / Name */}
            <div className="flex items-center gap-1.5 flex-wrap justify-center md:justify-start">
              <h1 className="text-2xl md:text-[36px] font-black text-instagram-lightText dark:text-instagram-darkText tracking-tight leading-none">
                {user.displayName}
              </h1>
              {user.verified && (
                <VerifiedBadge size={22} className="shrink-0" />
              )}
            </div>

            {/* Handle & Stats (Followers count, post count) */}
            <div className="flex items-center justify-center md:justify-start select-none">
              <ProfileFollowsInfo
                userId={user.id}
                username={user.username}
                initialFollowerState={followerInfo}
                initialFollowingCount={user._count.following}
                postsCount={user._count.posts}
              />
            </div>

            {/* Bio in YouTube format (first line truncated, click to show dialog) */}
            <div className="text-[14px] text-zinc-700 dark:text-zinc-300 leading-relaxed max-w-[650px] text-center md:text-start flex flex-wrap items-center justify-center md:justify-start gap-x-1">
              <span className="line-clamp-1 text-zinc-750 dark:text-zinc-300">
                {user.bio ? user.bio.split("\n")[0] : "No description available."}
              </span>
              <button
                onClick={() => setShowInfoModal(true)}
                className="font-bold text-zinc-900 dark:text-zinc-100 hover:underline inline-block focus:outline-none"
              >
                ...more
              </button>
            </div>

            {/* Links / Category in YouTube style summary format */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1.5 text-[14px] text-zinc-500 font-medium select-none">
              {user.professionalCategory && (
                <span className="text-[12px] text-zinc-600 dark:text-zinc-400 font-bold bg-black/5 dark:bg-zinc-900 border border-black/10 dark:border-zinc-800 px-2.5 py-0.5 rounded-full">
                  {user.professionalCategory}
                </span>
              )}
              {user.websiteUrl && (
                <button
                  onClick={() => setShowInfoModal(true)}
                  className="flex items-center gap-1.5 text-[#065fd4] dark:text-blue-400 font-bold hover:underline bg-transparent border-none p-0 cursor-pointer text-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-4 shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                  </svg>
                  <span>{user.websiteUrl.replace(/https?:\/\/(www\.)?/, "")}</span>
                  <span className="text-zinc-500 dark:text-zinc-400 font-medium">and more links</span>
                </button>
              )}
              {user.location && (
                <span className="flex items-center gap-1 text-zinc-500">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4 shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                  </svg>
                  <span>{user.location}</span>
                </span>
              )}
            </div>

            {/* Actions (Edit / Share / Professional Dashboard) */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 pt-1.5 select-none w-full md:w-auto">
              {isOwner ? (
                <>
                  <ProfileHeaderActions user={user} />
                  <Link
                    href="/creator"
                    className="h-9 px-5 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white text-sm font-medium transition-all flex items-center justify-center border border-black/10 dark:border-white/5 shadow-sm"
                  >
                    Professional Dashboard
                  </Link>
                </>
              ) : (
                <div className="flex gap-2.5 items-center w-full justify-center md:justify-start">
                  <div className="w-auto">
                    <FollowButton userId={user.id} initialState={followerInfo} />
                  </div>
                  <button
                    onClick={() => router.push(`/messages?userId=${user.id}`)}
                    className="h-9 px-5 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white text-sm font-medium transition-all flex items-center justify-center border border-black/10 dark:border-white/5 shadow-sm"
                  >
                    Message
                  </button>
                  <button
                    onClick={() => setShowShareDialog(true)}
                    className="h-9 px-5 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white text-sm font-medium transition-all flex items-center justify-center border border-black/10 dark:border-white/5 shadow-sm"
                  >
                    Share Profile
                  </button>
                </div>
              )}
            </div>

            {/* Mutuals (Followed By) */}
            {!isOwner && (
              <div className="pt-1.5 select-none text-xs text-zinc-400">
                <MutualsLink userId={user.id} />
              </div>
            )}

          </div>

        </div>

        {/* Pinned Reels (up to 3) */}
        {pinnedReels.length > 0 && (
          <div className="py-4 border-b border-instagram-lightBorder dark:border-instagram-darkBorder space-y-2.5 select-none">
            <div className="flex items-center gap-1.5 px-4 md:px-0">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-4 text-white">
                <path d="M19.5 21a3 3 0 0 0 3-3v-4.5a3 3 0 0 0-3-3h-1.5V9a3 3 0 0 0-3-3H9a3 3 0 0 0-3 3v1.5H4.5a3 3 0 0 0-3 3V18a3 3 0 0 0 3 3h15ZM6 9a1.5 1.5 0 0 1 1.5-1.5h6A1.5 1.5 0 0 1 15 9v1.5H6V9Zm-3 5.5A1.5 1.5 0 0 1 4.5 13h15a1.5 1.5 0 0 1 1.5 1.5V18a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18v-3.5Z" />
              </svg>
              <h2 className="text-[14px] font-bold text-white tracking-wide uppercase">Pinned Reels</h2>
            </div>
            <div className="grid grid-cols-3 gap-1 w-full px-4 md:px-0">
              {pinnedReels.map((post) => (
                <PinnedReelCard key={post.id} post={post} />
              ))}
            </div>
          </div>
        )}
      </div>

      <ProfileMenuDrawer
        open={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        isOwner={isOwner}
        username={user.username}
      />

      <ShareProfileDialog
        profile={{
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        }}
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
      />

      {/* YouTube Style Description & Information dialog modal */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-[560px] max-h-[85vh] bg-zinc-900 dark:bg-[#1a1a1a] text-zinc-100 dark:text-white rounded-2xl p-6 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 select-none">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <h2 className="text-xl font-bold line-clamp-1">{user.displayName}</h2>
              <button
                onClick={() => setShowInfoModal(false)}
                className="p-1.5 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content Area (Scrollable) */}
            <div className="flex-1 overflow-y-auto py-4 space-y-6 scrollbar-thin select-text">
              {/* Description */}
              <div className="space-y-2">
                <h3 className="text-base font-bold text-zinc-200">Description</h3>
                <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line break-words">
                  {user.bio || "No description provided."}
                </p>
              </div>

              {/* Links */}
              <div className="space-y-3">
                <h3 className="text-base font-bold text-zinc-200">Links</h3>
                <div className="space-y-3">
                  {user.websiteUrl ? (
                    <a
                      href={user.websiteUrl.startsWith("http") ? user.websiteUrl : `https://${user.websiteUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-zinc-950/60 hover:bg-zinc-950 rounded-xl transition-all border border-zinc-850 group"
                    >
                      <div className="bg-[#cc0000] text-white size-7 rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0">
                        W
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-zinc-400">My Website</p>
                        <p className="text-sm font-bold text-blue-400 truncate flex items-center gap-1 group-hover:underline">
                          <span>{user.websiteUrl.replace(/https?:\/\/(www\.)?/, "")}</span>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="size-3 text-green-500 fill-green-500 shrink-0">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                        </p>
                      </div>
                    </a>
                  ) : (
                    <p className="text-sm text-zinc-450 italic">No links added</p>
                  )}
                </div>
              </div>

              {/* More info */}
              <div className="space-y-3">
                <h3 className="text-base font-bold text-zinc-200">More info</h3>
                <div className="space-y-3.5 text-sm text-zinc-350">
                  {/* Channel Link */}
                  <div className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5 text-zinc-400 shrink-0">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-.778.099-1.533.284-2.253m0 0A17.919 17.919 0 0 0 12 10.5a17.97 17.97 0 0 0 8.716-2.247" />
                    </svg>
                    <a href={channelUrl} target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-400 font-medium break-all">
                      {channelUrl.replace(/https?:\/\/(www\.)?/, "")}
                    </a>
                  </div>

                  {/* Location */}
                  {user.location && (
                    <div className="flex items-center gap-3">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5 text-zinc-400 shrink-0">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                      </svg>
                      <span>{user.location}</span>
                    </div>
                  )}

                  {/* Joined Date */}
                  <div className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5 text-zinc-400 shrink-0">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                    </svg>
                    <span>Joined {formattedJoinDate}</span>
                  </div>

                  {/* Stats: followers, posts, views */}
                  <div className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5 text-zinc-400 shrink-0">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A2.25 2.25 0 0 1 12.75 21.5h-1.5a2.25 2.25 0 0 1-2.25-2.263v-.111c0-1.113.285-2.16.786-3.07M15 19.128v.11c0 .484-.2.94-.556 1.27l-1.22 1.107a1.5 1.5 0 0 1-2.008 0l-1.22-1.107A1.75 1.75 0 0 1 9.5 19.238v-.11m6.187-6.228A4.125 4.125 0 0 0 15 8.25a4.125 4.125 0 0 0-7.533 2.493M18.75 12c0 .98-.24 1.9-.664 2.712M5.25 12c0-.98.24-1.9.664-2.712M5.25 12a8.978 8.978 0 0 1 2.25-6.074M18.75 12a8.978 8.978 0 0 0-2.25-6.074M8.161 9.043A4.12 4.12 0 0 0 7.5 10.75a4.125 4.125 0 0 0 7.533 2.493M15 10.75a4.12 4.12 0 0 0-.661-1.707" />
                    </svg>
                    <span>{formatNumber(user._count.followers)} followers</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5 text-zinc-400 shrink-0">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                    </svg>
                    <span>{formatNumber(user._count.posts)} posts</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5 text-zinc-400 shrink-0">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                    <span>{formatNumber(totalViews)} views</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer action buttons */}
            <div className="p-4 border-t border-zinc-800 flex gap-3">
              <button
                onClick={() => {
                  setShowShareDialog(true);
                  setShowInfoModal(false);
                }}
                className="flex-1 h-10 rounded-full bg-zinc-850 hover:bg-zinc-800 font-semibold text-sm flex items-center justify-center gap-2 transition-colors text-white border border-zinc-700/30"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                </svg>
                <span>Share channel</span>
              </button>
              <button
                onClick={() => {
                  toast({ description: "Report submitted." });
                  setShowInfoModal(false);
                }}
                className="flex-1 h-10 rounded-full bg-zinc-850 hover:bg-zinc-800 font-semibold text-sm flex items-center justify-center gap-2 transition-colors text-zinc-300 border border-zinc-700/30"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a4.873 4.873 0 0 0 3.58-4.582V5.73a2 2 0 0 0-2.5-1.921l-3.113.731a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" />
                </svg>
                <span>Report user</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-component for Pinned Reels
const PinnedReelCard = memo(({ post }: { post: any }) => {
  const router = useRouter();
  const attachment = post.attachments?.[0];
  const viewCount = post._count?.views || 0;

  const formatViews = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  return (
    <div
      onClick={() => router.push(`/reels/${post.id}`)}
      className="relative aspect-[9/16] bg-zinc-900 rounded-[8px] overflow-hidden cursor-pointer hover:opacity-90 transition-all select-none border border-zinc-800"
    >
      {attachment?.url ? (
        <video
          src={attachment.url}
          className="w-full h-full object-cover"
          muted
          playsInline
        />
      ) : (
        <div className="p-2 w-full h-full flex items-center justify-center text-[10px] text-zinc-500 overflow-hidden line-clamp-3">
          {post.content}
        </div>
      )}
      <div className="absolute bottom-2 left-2 flex items-center gap-0.5 text-white text-[11px] font-semibold drop-shadow-md">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-3 fill-white">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
        </svg>
        <span>{formatViews(viewCount)}</span>
      </div>
    </div>
  );
});

PinnedReelCard.displayName = "PinnedReelCard";
