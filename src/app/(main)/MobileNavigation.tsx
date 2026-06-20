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
        <header className="sticky top-0 z-30 flex h-11 w-full items-center justify-between border-b border-border/60 bg-background px-4 sm:hidden">
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

          <div className="flex items-center gap-5">
            {/* Notifications */}
            <Link href="/notifications" className="relative flex items-center justify-center text-foreground">
              <Heart className="size-[22px]" />
              {!!notificationsData.unreadCount && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                  {notificationsData.unreadCount}
                </span>
              )}
            </Link>

            {/* Messages */}
            <Link href="/messages" className="relative flex items-center justify-center text-foreground">
              <Mail className="size-[22px]" />
              {!!messagesData.unreadCount && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                  {messagesData.unreadCount}
                </span>
              )}
            </Link>
          </div>
        </header>
      )}

      {/* Mobile Bottom Navigation Bar — 5 tabs: Home, Search, Create, Spots, Profile */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-14 w-full items-center justify-around border-t border-border/60 bg-background sm:hidden">
        <Link
          href="/"
          className={`flex items-center justify-center p-2 transition-colors ${
            pathname === "/" ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          <Home className="size-[26px]" strokeWidth={pathname === "/" ? 2.5 : 1.8} />
        </Link>
        <Link
          href="/search"
          className={`flex items-center justify-center p-2 transition-colors ${
            pathname.startsWith("/search") ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          <Search className="size-[26px]" strokeWidth={pathname.startsWith("/search") ? 2.5 : 1.8} />
        </Link>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center justify-center p-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <PlusSquare className="size-[26px]" strokeWidth={1.8} />
        </button>
        <Link
          href="/reels"
          className={`flex items-center justify-center p-2 transition-colors ${
            pathname === "/reels" ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          <SpotsIcon className="size-[26px]" strokeWidth={pathname === "/reels" ? 2.5 : 1.8} />
        </Link>
        <Link
          href={`/users/${user.username}`}
          className={`flex items-center justify-center p-2 transition-colors ${
            pathname === `/users/${user.username}` ? "ring-2 ring-foreground rounded-full" : ""
          }`}
        >
          <UserAvatar avatarUrl={user.avatarUrl} size={26} />
        </Link>
      </nav>

      {/* Create Post Dialog (Mobile) */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-none w-full h-full md:h-auto md:w-[85vw] md:max-w-4xl p-0 overflow-hidden bg-card rounded-none md:rounded-2xl border-none md:border left-0 top-0 translate-x-0 translate-y-0 md:left-[50%] md:top-[50%] md:translate-x-[-50%] md:translate-y-[-50%] [&>button]:hidden md:[&>button]:inline-flex">
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
