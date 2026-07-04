"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Plus, Bell, Mail, ChevronDown, LogOut, User as UserIcon, Settings as SettingsIcon } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import kyInstance from "@/lib/ky";
import { MessageCountInfo, NotificationCountInfo } from "@/lib/types";
import UserAvatar from "@/components/UserAvatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { logout } from "@/app/(auth)/actions";

interface HeaderActionsProps {
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

export default function HeaderActions({ user }: HeaderActionsProps) {
  const queryClient = useQueryClient();

  // Fetch real-time counts for header badges
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
    <div className="w-[360px] flex items-center justify-between pl-4 gap-4">
      {/* Create Post Button */}
      <Link
        href="/create"
        className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-extrabold px-5 py-2.5 rounded-2xl text-xs uppercase tracking-wider active:scale-[0.97] transition-all shadow-md shadow-indigo-550/15"
      >
        <Plus className="size-4 shrink-0" />
        <span>Create</span>
      </Link>

      <div className="flex items-center gap-3">
        {/* Notifications Icon Button */}
        <Link
          href="/notifications"
          className="relative flex items-center justify-center size-10 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/40 text-foreground transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <Bell className="size-5 shrink-0" />
          {!!notificationsData.unreadCount && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white shadow-sm border-2 border-white dark:border-[#0c0d14]">
              {notificationsData.unreadCount}
            </span>
          )}
        </Link>

        {/* Messages Icon Button */}
        <Link
          href="/messages"
          className="relative flex items-center justify-center size-10 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/40 text-foreground transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <Mail className="size-5 shrink-0" />
          {!!messagesData.unreadCount && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white shadow-sm border-2 border-white dark:border-[#0c0d14]">
              {messagesData.unreadCount}
            </span>
          )}
        </Link>

        {/* Profile Dropdown Trigger */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-transparent dark:hover:border-zinc-800 transition-colors">
              <div className="relative size-8 shrink-0">
                <UserAvatar
                  avatarUrl={user.avatarUrl}
                  size={32}
                  className="size-8 rounded-full object-cover border border-border/20"
                />
                <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#0c0d14]" />
              </div>
              <ChevronDown className="size-4 text-muted-foreground shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={8}
            className="w-56 p-1.5 shadow-2xl rounded-2xl border border-border/40 bg-card select-none"
          >
            <DropdownMenuItem asChild>
              <Link href={`/users/${user.username}`} className="flex items-center gap-3 p-3 cursor-pointer">
                <UserIcon className="size-5" />
                <span>My Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-3 p-3 cursor-pointer">
                <SettingsIcon className="size-5" />
                <span>Settings</span>
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
    </div>
  );
}
