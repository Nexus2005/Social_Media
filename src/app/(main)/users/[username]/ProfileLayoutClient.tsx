"use client";

import { useSession } from "@/app/(main)/SessionProvider";
import FollowButton from "@/components/FollowButton";
import UserAvatar from "@/components/UserAvatar";
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

interface ProfileLayoutClientProps {
  user: UserData;
  loggedInUserId: string;
}

export default function ProfileLayoutClient({
  user,
  loggedInUserId,
}: ProfileLayoutClientProps) {
  const router = useRouter();
  const [scrollY, setScrollY] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

  // Fetch pinned reels
  const { data: pinnedReels = [], isLoading: isLoadingPinned } = useQuery<any[]>({
    queryKey: ["user-pinned-reels", user.id],
    queryFn: () => kyInstance.get(`/api/users/${user.id}/pinned`).json<any[]>(),
  });

  return (
    <div className="w-full relative bg-black text-white select-none">
      {/* Sticky Collapsing Header Bar */}
      <header
        style={{
          backgroundColor: `rgba(0, 0, 0, ${bgOpacity})`,
          backdropFilter: bgOpacity > 0.5 ? "blur(12px)" : "none",
        }}
        className="sticky top-0 z-40 flex h-[56px] w-full items-center justify-between px-4 border-b border-[#1A1A1A] transition-colors duration-150"
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
            <span className="text-[#0095f6] text-[13px] font-bold shrink-0" title="Verified Creator">☑</span>
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

      {/* Profile Header Content (Banner, Avatar, Details, Mutuals, Stats, Actions) */}
      <div className="w-full bg-black flex flex-col">
        {/* 1. Banner */}
        <div className="w-full h-32 sm:h-40 md:h-44 bg-zinc-900 relative overflow-hidden select-none">
          {user.headerBannerUrl ? (
            <img
              src={user.headerBannerUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-zinc-900 to-zinc-950" />
          )}
        </div>

        {/* 2. Avatar with 50% overlap */}
        <div className="px-4 md:px-6 relative -mt-[50px] sm:-mt-[60px] md:-mt-[60px] flex justify-between items-end z-10">
          <div className="shrink-0 rounded-full border-4 border-black bg-black">
            <UserAvatar
              avatarUrl={user.avatarUrl}
              size={120}
              className="w-[96px] h-[96px] sm:w-[120px] sm:h-[120px] rounded-full object-cover border border-zinc-800 bg-zinc-900"
            />
          </div>
        </div>

        {/* 3. Details (Name, username, bio, category, location, website) */}
        <div className="px-4 md:px-6 pt-3 space-y-1.5 select-text">
          <div className="flex items-center gap-1.5">
            <h1 className="text-[20px] font-bold text-white tracking-tight leading-none">
              {user.displayName}
            </h1>
            {user.verified && (
              <span className="text-[#0095f6] text-[15px] font-bold shrink-0" title="Verified Creator">☑</span>
            )}
          </div>
          <p className="text-[14px] text-zinc-400 font-normal">@{user.username}</p>

          {user.professionalCategory && (
            <p className="text-[13px] text-zinc-400 font-medium bg-zinc-900 border border-zinc-800/60 px-2 py-0.5 rounded-full w-fit">
              {user.professionalCategory}
            </p>
          )}

          {user.bio && (
            <p className="text-[15px] text-zinc-200 whitespace-pre-line break-words leading-relaxed pt-1 max-w-[500px]">
              {user.bio}
            </p>
          )}

          {/* Info Items: Location, Website */}
          <div className="flex flex-col gap-1.5 pt-1 text-[13px] text-zinc-400 font-normal select-none">
            {user.location && (
              <span className="flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4 text-zinc-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                </svg>
                <span>{user.location}</span>
              </span>
            )}
            {user.websiteUrl && (
              <span className="flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4 text-zinc-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                </svg>
                <a
                  href={user.websiteUrl.startsWith("http") ? user.websiteUrl : `https://${user.websiteUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-400 hover:underline"
                >
                  {user.websiteUrl.replace(/https?:\/\/(www\.)?/, "")}
                </a>
              </span>
            )}
          </div>
        </div>

        {/* 4. Mutuals (Followed By) */}
        {!isOwner && (
          <div className="px-4 md:px-6 pt-1 select-none">
            <MutualsLink userId={user.id} />
          </div>
        )}

        {/* 5. Stats Row (posts, followers, following) */}
        <div className="px-4 md:px-6 pt-4 select-none">
          <ProfileFollowsInfo
            userId={user.id}
            username={user.username}
            initialFollowerState={followerInfo}
            initialFollowingCount={user._count.following}
            postsCount={user._count.posts}
          />
        </div>

        {/* 6 & 7. Actions & Professional Dashboard */}
        <div className="px-4 md:px-6 pt-4 pb-4 border-b border-[#1A1A1A] space-y-2 select-none">
          {isOwner ? (
            <>
              <ProfileHeaderActions user={user} />
              <Link
                href="/creator"
                className="w-full text-center block h-9 leading-[36px] rounded-[10px] bg-[#262626] hover:bg-zinc-800 text-white text-xs font-semibold transition-colors border-0"
              >
                Professional Dashboard
              </Link>
            </>
          ) : (
            <div className="w-full">
              <FollowButton userId={user.id} initialState={followerInfo} />
            </div>
          )}
        </div>

        {/* 8. Pinned Reels (up to 3) */}
        {pinnedReels.length > 0 && (
          <div className="px-4 md:px-6 py-4 border-b border-[#1A1A1A] space-y-2.5 select-none">
            <div className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-4 text-white">
                <path d="M19.5 21a3 3 0 0 0 3-3v-4.5a3 3 0 0 0-3-3h-1.5V9a3 3 0 0 0-3-3H9a3 3 0 0 0-3 3v1.5H4.5a3 3 0 0 0-3 3V18a3 3 0 0 0 3 3h15ZM6 9a1.5 1.5 0 0 1 1.5-1.5h6A1.5 1.5 0 0 1 15 9v1.5H6V9Zm-3 5.5A1.5 1.5 0 0 1 4.5 13h15a1.5 1.5 0 0 1 1.5 1.5V18a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18v-3.5Z" />
              </svg>
              <h2 className="text-[14px] font-bold text-white tracking-wide uppercase">Pinned Reels</h2>
            </div>
            <div className="grid grid-cols-3 gap-1 w-full">
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
