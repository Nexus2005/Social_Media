"use client";

import { useSession } from "@/app/(main)/SessionProvider";
import UserAvatar from "@/components/UserAvatar";
import { useQuery } from "@tanstack/react-query";
import kyInstance from "@/lib/ky";
import { MessageCountInfo, NotificationCountInfo } from "@/lib/types";
import {
  Heart,
  Home,
  Mail,
  PlusSquare,
  Search,
  ChevronDown,
  Menu,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SpotsIcon } from "./CartlySidebar";
import ProfileMenuDrawer from "./users/[username]/ProfileMenuDrawer";

interface MobileNavigationProps {
  initialNotificationsCount: number;
  initialMessagesCount: number;
}

export default function MobileNavigation({
  initialNotificationsCount,
  initialMessagesCount,
}: MobileNavigationProps) {
  const { user } = useSession();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Queries for real-time counts
  const { data: notificationsData } = useQuery({
    queryKey: ["unread-notification-count"],
    queryFn: () =>
      kyInstance
        .get("/api/notifications/unread-count")
        .json<NotificationCountInfo>(),
    initialData: { unreadCount: initialNotificationsCount },
    refetchInterval: 60 * 1000,
  });

  const { data: messagesData } = useQuery({
    queryKey: ["unread-messages-count"],
    queryFn: () =>
      kyInstance.get("/api/messages/unread-count").json<MessageCountInfo>(),
    initialData: { unreadCount: initialMessagesCount },
    refetchInterval: 60 * 1000,
  });

  if (pathname === "/create") return null;

  const isHome = pathname === "/";
  const isProfile = pathname.startsWith("/users/") && !pathname.includes("/followers") && !pathname.includes("/following");
  const showHeader = isHome || isProfile;

  let profileUsername = "";
  if (isProfile) {
    const parts = pathname.split("/");
    profileUsername = parts[2] || "";
  }

  const isAdminOrOwner = user.role === "ADMIN" || user.username === "Omkar2005" || user.username === profileUsername;

  return (
    <>
      {/* Mobile Top Header */}
      {showHeader && (
        <header className="sticky top-0 z-30 flex h-[56px] w-full items-center justify-between border-b border-[#1A1A1A] bg-black px-4 sm:hidden">
          {isHome ? (
            <>
              {/* Home Feed Header */}
              <Link href="/" className="flex items-center gap-1.5 h-11 px-1">
                <img
                  src="/cartly-logo.webp"
                  alt="Cartly Logo"
                  className="size-7 object-contain"
                />
                <span className="text-xl font-extrabold tracking-tight font-sans text-white">
                  Cartly
                </span>
              </Link>

              <div className="flex items-center gap-1">
                {/* Notifications */}
                <Link
                  href="/notifications"
                  className="relative flex h-11 w-11 items-center justify-center text-[#E4E4E7]"
                  title="Notifications"
                >
                  <Heart className="size-6 text-[#E4E4E7]" strokeWidth={1.75} />
                  {!!notificationsData.unreadCount && (
                    <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white border border-black shadow-sm">
                      {notificationsData.unreadCount}
                    </span>
                  )}
                </Link>

                {/* Messages */}
                <Link
                  href="/messages"
                  className="relative flex h-11 w-11 items-center justify-center text-[#E4E4E7]"
                  title="Messages"
                >
                  <Mail className="size-6 text-[#E4E4E7]" strokeWidth={1.75} />
                  {!!messagesData.unreadCount && (
                    <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white border border-black shadow-sm">
                      {messagesData.unreadCount}
                    </span>
                  )}
                </Link>
              </div>
            </>
          ) : (
            <>
              {/* Instagram-style profile header */}
              <div className="flex items-center gap-1 h-11 px-1">
                <span className="text-[18px] font-bold text-white max-w-[180px] truncate">
                  {profileUsername}
                </span>
                <ChevronDown className="size-4 text-zinc-400" />
              </div>

              <div className="flex items-center gap-1">
                {/* Create/Add */}
                <Link
                  href="/create"
                  className="flex h-11 w-11 items-center justify-center text-[#E4E4E7]"
                  title="Create Post"
                >
                  <PlusSquare className="size-6" strokeWidth={1.75} />
                </Link>

                {/* Notifications */}
                <Link
                  href="/notifications"
                  className="relative flex h-11 w-11 items-center justify-center text-[#E4E4E7]"
                  title="Notifications"
                >
                  <Heart className="size-6" strokeWidth={1.75} />
                  {!!notificationsData.unreadCount && (
                    <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white border border-black shadow-sm">
                      {notificationsData.unreadCount}
                    </span>
                  )}
                </Link>

                {/* Menu/Hamburger */}
                <button
                  onClick={() => setIsMenuOpen(true)}
                  className="flex h-11 w-11 items-center justify-center text-[#E4E4E7]"
                  title="Menu"
                >
                  <Menu className="size-6" strokeWidth={1.75} />
                </button>
              </div>
            </>
          )}
        </header>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-[56px] w-full items-center justify-around border-t border-[#1A1A1A] bg-black/85 backdrop-blur-md sm:hidden">
        <Link
          href="/"
          className="flex h-11 w-11 items-center justify-center transition-colors"
        >
          <Home
            className={pathname === "/" ? "size-[26px]" : "size-6"}
            stroke={pathname === "/" ? "white" : "#71717A"}
            strokeWidth={pathname === "/" ? 2.25 : 1.75}
          />
        </Link>
        <Link
          href="/search"
          className="flex h-11 w-11 items-center justify-center transition-colors"
        >
          <Search
            className={pathname.startsWith("/search") ? "size-[26px]" : "size-6"}
            stroke={pathname.startsWith("/search") ? "white" : "#71717A"}
            strokeWidth={pathname.startsWith("/search") ? 2.25 : 1.75}
          />
        </Link>
        <Link
          href="/create"
          className="flex h-11 w-11 items-center justify-center transition-colors"
        >
          <PlusSquare
            className={pathname === "/create" ? "size-[26px]" : "size-6"}
            stroke={pathname === "/create" ? "white" : "#71717A"}
            strokeWidth={pathname === "/create" ? 2.25 : 1.75}
          />
        </Link>
        <Link
          href="/reels"
          className="flex h-11 w-11 items-center justify-center transition-colors"
        >
          <SpotsIcon
            className={pathname === "/reels" ? "size-[26px]" : "size-6"}
            stroke={pathname === "/reels" ? "white" : "#71717A"}
            strokeWidth={pathname === "/reels" ? 2.25 : 1.75}
          />
        </Link>
        <Link
          href={`/users/${user.username}`}
          className="flex h-11 w-11 items-center justify-center transition-colors"
        >
          <div
            className={`rounded-full transition-all duration-200 ${
              pathname === `/users/${user.username}`
                ? "ring-2 ring-white p-[1px]"
                : "ring-0 p-0"
            }`}
          >
            <UserAvatar avatarUrl={user.avatarUrl} size={24} className="size-6" />
          </div>
        </Link>
      </nav>

      {/* Settings Options drawer */}
      <ProfileMenuDrawer
        open={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        isAdminOrOwner={isAdminOrOwner}
      />
    </>
  );
}
