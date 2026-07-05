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
import { useRouter } from "next/navigation";
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
}

export default function ProfileLayoutClient({
  user,
  loggedInUserId,
}: ProfileLayoutClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [scrollY, setScrollY] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
      ({ followerId }) => followerId === loggedInUserId
    ),
  };

  const { data: followerState } = useFollowerInfo(user.id, followerInfo);

  // Fetch pinned reels
  const { data: pinnedReels = [], isLoading: isLoadingPinned } = useQuery<any[]>({
    queryKey: ["user-pinned-reels", user.id],
    queryFn: () => kyInstance.get(`/api/users/${user.id}/pinned`).json<any[]>(),
  });

  return (
    <div className="w-full relative bg-white dark:bg-instagram-darkBg text-instagram-lightText dark:text-instagram-darkText select-none">
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

            {/* Bio */}
            {user.bio && (
              <p className="text-[14.5px] text-zinc-700 dark:text-zinc-300 whitespace-pre-line break-words leading-relaxed max-w-[650px] text-center md:text-start">
                {user.bio}
              </p>
            )}

            {/* Links / Category / Location */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1.5 text-xs text-zinc-500 font-medium select-none">
              {user.professionalCategory && (
                <span className="text-[11.5px] text-zinc-600 dark:text-zinc-400 font-bold bg-black/5 dark:bg-zinc-900 border border-black/10 dark:border-zinc-800 px-2.5 py-0.5 rounded-full">
                  {user.professionalCategory}
                </span>
              )}
              {user.websiteUrl && (
                <span className="flex items-center gap-1 text-indigo-650 dark:text-indigo-400 font-extrabold">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="size-3.5 shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                  </svg>
                  <a
                    href={user.websiteUrl.startsWith("http") ? user.websiteUrl : `https://${user.websiteUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline text-indigo-600 dark:text-indigo-400"
                  >
                    {user.websiteUrl.replace(/https?:\/\/(www\.)?/, "")}
                  </a>
                </span>
              )}
              {user.location && (
                <span className="flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-3.5 shrink-0">
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
                    className="h-9 px-5 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white text-xs font-bold transition-all flex items-center justify-center border border-black/10 dark:border-white/5 shadow-sm"
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
                    className="h-9 px-5 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white text-xs font-bold transition-all flex items-center justify-center border border-black/10 dark:border-white/5 shadow-sm"
                  >
                    Message
                  </button>
                  <button
                    onClick={() => setShowShareDialog(true)}
                    className="h-9 px-5 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white text-xs font-bold transition-all flex items-center justify-center border border-black/10 dark:border-white/5 shadow-sm"
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
