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
  Bell,
  Heart,
  Home,
  Mail,
  PlusSquare,
  Search,
  User
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import PostEditor from "@/components/posts/editor/PostEditor";

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
      {/* Mobile Top Header */}
      <header className="sticky top-0 z-10 flex h-14 w-full items-center justify-between border-b bg-card px-4 sm:hidden">
        <Link href="/" className="flex items-center gap-2">
          <img
            src="/cartly-logo.webp"
            alt="Cartly Logo"
            className="size-7 object-contain"
          />
          <span className="text-xl font-extrabold tracking-tight font-sans cartly-gradient-text">
            Cartly
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {/* Notifications */}
          <Link href="/notifications" className="relative flex items-center justify-center text-muted-foreground hover:text-foreground">
            <Heart className="size-6" />
            {!!notificationsData.unreadCount && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {notificationsData.unreadCount}
              </span>
            )}
          </Link>

          {/* Messages */}
          <Link href="/messages" className="relative flex items-center justify-center text-muted-foreground hover:text-foreground">
            <Mail className="size-6" />
            {!!messagesData.unreadCount && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {messagesData.unreadCount}
              </span>
            )}
          </Link>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-10 flex h-12 w-full items-center justify-around border-t bg-card pb-safe sm:hidden">
        <Link
          href="/"
          className={`flex items-center justify-center p-2 rounded-lg transition-colors ${
            pathname === "/" ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          <Home className="size-6" />
        </Link>
        <Link
          href="/search"
          className={`flex items-center justify-center p-2 rounded-lg transition-colors ${
            pathname.startsWith("/search") ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          <Search className="size-6" />
        </Link>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center justify-center p-2 rounded-lg text-muted-foreground transition-colors hover:text-foreground"
        >
          <PlusSquare className="size-6" />
        </button>
        <Link
          href="/messages"
          className={`flex items-center justify-center p-2 rounded-lg transition-colors ${
            pathname.startsWith("/messages") ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          <Mail className="size-6" />
        </Link>
        <Link
          href={`/users/${user.username}`}
          className={`flex items-center justify-center p-2 rounded-lg transition-colors ${
            pathname === `/users/${user.username}` ? "ring-2 ring-foreground" : ""
          }`}
        >
          <UserAvatar avatarUrl={user.avatarUrl} size={24} />
        </Link>
      </nav>

      {/* Create Post Dialog (Mobile) */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden bg-card rounded-2xl">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="text-center font-bold text-lg">Create new post</DialogTitle>
          </DialogHeader>
          <div className="p-6">
            <PostEditor />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
