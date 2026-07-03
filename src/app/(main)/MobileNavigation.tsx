"use client";

import { useSession } from "@/app/(main)/SessionProvider";
import UserAvatar from "@/components/UserAvatar";
import { useQuery } from "@tanstack/react-query";
import kyInstance from "@/lib/ky";
import { MessageCountInfo, NotificationCountInfo } from "@/lib/types";
import {
  Heart,
  Mail,
  ChevronDown,
  Menu,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import ProfileMenuDrawer from "./users/[username]/ProfileMenuDrawer";
import { HomeIcon, SearchIcon, CreateIcon, ReelsIcon } from "@/components/icons/InstagramIcons";

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

  // Dynamic theme-color meta tag manager
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const updateThemeColor = () => {
      const isDark = document.documentElement.classList.contains("dark");
      const themeColor = isDark ? "#121212" : "#ffffff";
      
      let meta = document.querySelector('meta[name="theme-color"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'theme-color');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', themeColor);
    };

    updateThemeColor();

    const observer = new MutationObserver(updateThemeColor);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

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
  const showHeader = isHome;

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
        <header className="sticky top-0 z-30 flex min-h-[56px] h-auto pt-[env(safe-area-inset-top)] pb-1.5 w-full items-center justify-between border-b border-instagram-lightBorder dark:border-instagram-darkBorder bg-instagram-lightBg dark:bg-instagram-darkBg px-4 sm:hidden">
          {isHome ? (
            <>
              {/* Home Feed Header */}
              <Link href="/" className="flex items-center gap-1.5 h-11 px-1">
                <img
                  src="/cartly-logo.webp"
                  alt="Cartly Logo"
                  className="size-7 object-contain"
                />
                <span className="text-xl font-extrabold tracking-tight font-sans text-instagram-lightText dark:text-instagram-darkText">
                  Cartly
                </span>
              </Link>

              <div className="flex items-center gap-1">

              {/* Notifications */}
                <Link
                  href="/notifications"
                  className="relative flex h-11 w-11 items-center justify-center text-instagram-lightText dark:text-instagram-darkText"
                  title="Notifications"
                >
                  <Heart className="size-6 text-current" strokeWidth={1.75} />
                  {!!notificationsData.unreadCount && (
                    <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white border border-black shadow-sm">
                      {notificationsData.unreadCount}
                    </span>
                  )}
                </Link>

                {/* Messages */}
                <Link
                  href="/messages"
                  className="relative flex h-11 w-11 items-center justify-center text-instagram-lightText dark:text-instagram-darkText"
                  title="Messages"
                >
                  <Mail className="size-6 text-current" strokeWidth={1.75} />
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
                <span className="text-[18px] font-bold text-instagram-lightText dark:text-instagram-darkText max-w-[180px] truncate">
                  {profileUsername}
                </span>
                <ChevronDown className="size-4 text-zinc-400" />
              </div>

              <div className="flex items-center gap-1">
                {/* Create/Add */}
                <Link
                  href="/create"
                  className="flex h-11 w-11 items-center justify-center text-instagram-lightText dark:text-instagram-darkText"
                  title="Create Post"
                >
                  <CreateIcon className="size-6" />
                </Link>

                {/* Notifications */}
                <Link
                  href="/notifications"
                  className="relative flex h-11 w-11 items-center justify-center text-instagram-lightText dark:text-instagram-darkText"
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
                  className="flex h-11 w-11 items-center justify-center text-instagram-lightText dark:text-instagram-darkText"
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
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex flex-col justify-end border-t border-instagram-lightBorder dark:border-instagram-darkBorder bg-instagram-lightBg/85 dark:bg-instagram-darkBg/85 backdrop-blur-md sm:hidden pb-[env(safe-area-inset-bottom)]">
        <div className="flex h-[56px] w-full items-center justify-around">
          <Link
            href="/"
            className="flex h-11 w-11 items-center justify-center transition-colors text-instagram-lightText dark:text-instagram-darkText"
          >
            <HomeIcon
              isActive={pathname === "/"}
            />
          </Link>
          <Link
            href="/search"
            className="flex h-11 w-11 items-center justify-center transition-colors text-instagram-lightText dark:text-instagram-darkText"
          >
            <SearchIcon
              className={pathname.startsWith("/search") ? "text-instagram-lightText dark:text-instagram-darkText" : "text-zinc-500"}
            />
          </Link>
          <Link
            href="/create"
            className="flex h-11 w-11 items-center justify-center transition-colors text-instagram-lightText dark:text-instagram-darkText"
          >
            <CreateIcon
              className={pathname === "/create" ? "text-instagram-lightText dark:text-instagram-darkText" : "text-zinc-500"}
            />
          </Link>
          <Link
            href="/reels"
            className="flex h-11 w-11 items-center justify-center transition-colors text-instagram-lightText dark:text-instagram-darkText"
          >
            <ReelsIcon
              isActive={pathname === "/reels"}
              className={pathname === "/reels" ? "text-instagram-lightText dark:text-instagram-darkText" : "text-zinc-500"}
            />
          </Link>
          <Link
            href={`/users/${user.username}`}
            className="flex h-11 w-11 items-center justify-center transition-colors"
          >
            <div
              className={`rounded-full transition-all duration-200 ${
                pathname === `/users/${user.username}`
                  ? "ring-2 ring-instagram-lightText dark:ring-instagram-darkText p-[1px]"
                  : "ring-0 p-0"
              }`}
            >
              <UserAvatar avatarUrl={user.avatarUrl} size={24} className="size-6" />
            </div>
          </Link>
        </div>
      </nav>

      {/* Settings Options drawer */}
      <ProfileMenuDrawer
        open={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        isOwner={user.username === profileUsername}
        username={profileUsername || user.username}
      />
    </>
  );
}
