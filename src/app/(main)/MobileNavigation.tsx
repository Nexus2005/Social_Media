"use client";

import { useSession } from "@/app/(main)/SessionProvider";
import UserAvatar from "@/components/UserAvatar";
import { useQuery } from "@tanstack/react-query";
import kyInstance from "@/lib/ky";
import { MessageCountInfo, NotificationCountInfo } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Heart,
  Home,
  Mail,
  PlusSquare,
  Search,
  ShoppingBag,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import PostEditor from "@/components/posts/editor/PostEditor";
import { SpotsIcon } from "./CartlySidebar";

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
  const [isCreateOpen, setIsCreateOpen] = useState(false);

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

  return (
    <>
      {/* Mobile Top Header — Instagram style: Logo left, Heart + Mail right */}
      {!pathname.startsWith("/reels") && (
        <header className="sticky top-0 z-30 flex h-[56px] w-full items-center justify-between border-b border-[#1c1c1c] bg-black px-4 sm:hidden">
          <Link href="/" className="flex items-center gap-1.5">
            <img
              src="/cartly-logo.webp"
              alt="Cartly Logo"
              className="size-7 object-contain"
            />
            <span className="text-xl font-extrabold tracking-tight font-sans cartly-gradient-text">
              Cartly
            </span>
          </Link>

          <div className="flex items-center gap-2">
            {/* Shop Hub */}
            <Link
              href="/shop"
              className="p-2 relative flex items-center justify-center text-white hover:opacity-80 transition-opacity"
              title="Shop Hub"
            >
              <ShoppingBag className="size-6" strokeWidth={1.8} />
            </Link>

            {/* Notifications */}
            <Link
              href="/notifications"
              className="p-2 relative flex items-center justify-center text-white hover:opacity-80 transition-opacity"
              title="Notifications"
            >
              <Heart className="size-6" strokeWidth={1.8} />
              {!!notificationsData.unreadCount && (
                <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-r from-[#ff6bcb] to-[#9f5cff] text-[9px] font-bold text-white border border-black shadow-sm">
                  {notificationsData.unreadCount}
                </span>
              )}
            </Link>

            {/* Messages */}
            <Link
              href="/messages"
              className="p-2 relative flex items-center justify-center text-white hover:opacity-80 transition-opacity"
              title="Messages"
            >
              <Mail className="size-6" strokeWidth={1.8} />
              {!!messagesData.unreadCount && (
                <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-r from-[#ff6bcb] to-[#9f5cff] text-[9px] font-bold text-white border border-black shadow-sm">
                  {messagesData.unreadCount}
                </span>
              )}
            </Link>
          </div>
        </header>
      )}

      {/* Mobile Bottom Navigation Bar — 5 tabs: Home, Search, Create, Spots, Profile */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-14 w-full items-center justify-around border-t border-[#1c1c1c] bg-black sm:hidden">
        <Link
          href="/"
          className="flex items-center justify-center p-2 transition-colors"
        >
          <Home
            className="size-6"
            stroke={pathname === "/" ? "url(#brand-gradient)" : "white"}
            opacity={pathname === "/" ? 1 : 0.85}
            strokeWidth={pathname === "/" ? 2.5 : 1.8}
          />
        </Link>
        <Link
          href="/search"
          className="flex items-center justify-center p-2 transition-colors"
        >
          <Search
            className="size-6"
            stroke={pathname.startsWith("/search") ? "url(#brand-gradient)" : "white"}
            opacity={pathname.startsWith("/search") ? 1 : 0.85}
            strokeWidth={pathname.startsWith("/search") ? 2.5 : 1.8}
          />
        </Link>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center justify-center p-2 transition-colors"
        >
          <PlusSquare
            className="size-6"
            stroke={isCreateOpen ? "url(#brand-gradient)" : "white"}
            opacity={isCreateOpen ? 1 : 0.85}
            strokeWidth={isCreateOpen ? 2.5 : 1.8}
          />
        </button>
        <Link
          href="/reels"
          className="flex items-center justify-center p-2 transition-colors"
        >
          <SpotsIcon
            className="size-6"
            stroke={pathname === "/reels" ? "url(#brand-gradient)" : "white"}
            opacity={pathname === "/reels" ? 1 : 0.85}
            strokeWidth={pathname === "/reels" ? 2.5 : 1.8}
          />
        </Link>
        <Link
          href={`/users/${user.username}`}
          className="flex items-center justify-center p-2 transition-colors"
        >
          <div
            className={`rounded-full transition-all duration-200 ${
              pathname === `/users/${user.username}`
                ? "p-[2px] bg-gradient-to-tr from-[#ff6bcb] to-[#9f5cff]"
                : "p-[2px] bg-transparent"
            }`}
          >
            <div className="rounded-full p-[1.5px] bg-black">
              <UserAvatar avatarUrl={user.avatarUrl} size={24} className="size-6" />
            </div>
          </div>
        </Link>
      </nav>

      {/* SVG Gradient Definition for Bottom Navigation Icons */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="brand-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff6bcb" />
            <stop offset="100%" stopColor="#9f5cff" />
          </linearGradient>
        </defs>
      </svg>

      {/* Create Post Dialog (Mobile) */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-none w-full h-full md:h-auto md:w-[85vw] md:max-w-4xl p-0 overflow-hidden bg-transparent md:bg-card rounded-none md:rounded-2xl border-none md:border left-0 top-0 translate-x-0 translate-y-0 md:left-[50%] md:top-[50%] md:translate-x-[-50%] md:translate-y-[-50%] [&>button]:hidden md:[&>button]:inline-flex">
          <DialogHeader className="hidden md:flex px-6 py-4 border-b">
            <DialogTitle className="text-center font-bold text-lg">Create new post</DialogTitle>
          </DialogHeader>
          <div className="p-0 md:p-6 h-full md:h-auto">
            <PostEditor onClose={() => setIsCreateOpen(false)} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
