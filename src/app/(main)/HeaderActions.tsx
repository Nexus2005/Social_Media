"use client";

import { useSession } from "./SessionProvider";
import UserAvatar from "@/components/UserAvatar";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import kyInstance from "@/lib/ky";
import { MessageCountInfo, NotificationCountInfo } from "@/lib/types";
import { Bell, Mail, Plus, ChevronDown, User, LogOut } from "lucide-react";
import Link from "next/link";
import { logout } from "@/app/(auth)/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function HeaderActions() {
  const { user } = useSession();
  const queryClient = useQueryClient();

  // Queries for real-time counts
  const { data: notificationsData } = useQuery({
    queryKey: ["unread-notification-count"],
    queryFn: () =>
      kyInstance
        .get("/api/notifications/unread-count")
        .json<NotificationCountInfo>(),
    initialData: { unreadCount: 0 },
    refetchInterval: 60 * 1000,
  });

  const { data: messagesData } = useQuery({
    queryKey: ["unread-messages-count"],
    queryFn: () =>
      kyInstance.get("/api/messages/unread-count").json<MessageCountInfo>(),
    initialData: { unreadCount: 0 },
    refetchInterval: 60 * 1000,
  });

  return (
    <div className="flex items-center gap-3 select-none">
      {/* Create Button (plusButton - OnCloud125252 style) */}
      <Link href="/create" className="plusButton" title="Create Post">
        <Plus className="plusButton-icon size-4" />
        <span className="plusButton-text">Create</span>
      </Link>

      {/* Notifications Button (vinodjangid07 style) */}
      <Link
        href="/notifications"
        className="uiverse-action-btn"
        data-text="Alerts"
        title="Notifications"
      >
        <Bell className="btn-svg text-instagram-lightText dark:text-instagram-darkText" />
        {!!notificationsData?.unreadCount && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[9px] font-bold text-white shadow-sm ring-1 ring-white dark:ring-black">
            {notificationsData.unreadCount}
          </span>
        )}
      </Link>

      {/* Messages Button (vinodjangid07 style) */}
      <Link
        href="/messages"
        className="uiverse-action-btn"
        data-text="Messages"
        title="Messages"
      >
        <Mail className="btn-svg text-instagram-lightText dark:text-instagram-darkText" />
        {!!messagesData?.unreadCount && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[9px] font-bold text-white shadow-sm ring-1 ring-white dark:ring-black">
            {messagesData.unreadCount}
          </span>
        )}
      </Link>

      {/* Profile Card with Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="flex items-center bg-card border border-border/40 hover:bg-accent/50 transition-all cursor-pointer p-1 rounded-full pl-1.5 pr-2.5 gap-1.5 h-11 shadow-sm">
            <UserAvatar avatarUrl={user.avatarUrl} size={28} className="size-7 rounded-full object-cover border border-border/20" />
            <ChevronDown className="size-3.5 text-muted-foreground flex-shrink-0" />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="bottom"
          align="end"
          sideOffset={8}
          className="w-56 p-1.5 shadow-2xl rounded-2xl border border-border/40 bg-card select-none"
        >
          <DropdownMenuItem asChild>
            <Link href={`/users/${user.username}`} className="flex items-center gap-3 p-3 cursor-pointer">
              <User className="size-5" />
              <span>My Profile</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              queryClient.clear();
              logout();
            }}
            className="flex items-center gap-3 p-3 text-destructive cursor-pointer hover:bg-destructive/10"
          >
            <LogOut className="size-5" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
