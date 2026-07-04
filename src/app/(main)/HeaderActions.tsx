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
      {/* Premium Gradient Create Post Button */}
      <Link
        href="/create"
        className="flex items-center gap-2 bg-gradient-to-r from-indigo-550 to-purple-650 hover:from-indigo-600 hover:to-purple-700 text-white font-extrabold px-5.5 py-3 rounded-[16px] text-[11px] uppercase tracking-widest hover:scale-[1.02] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 shrink-0 shadow-premium-md"
      >
        <Plus className="size-4 shrink-0" />
        <span>Create</span>
      </Link>

      <div className="flex items-center gap-3">
        {/* Notifications Icon Button */}
        <Link
          href="/notifications"
          className="relative flex items-center justify-center size-11 rounded-[16px] glass-card hover:bg-zinc-100/60 dark:hover:bg-zinc-900/60 hover:-translate-y-0.5 shadow-premium-sm hover:shadow-premium-md text-foreground transition-all shrink-0 cursor-pointer"
        >
          <Bell className="size-5 shrink-0" />
          {!!notificationsData.unreadCount && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-indigo-600 text-[9px] font-black text-white shadow-sm border border-white dark:border-[#08090e]">
              {notificationsData.unreadCount}
            </span>
          )}
        </Link>

        {/* Messages Icon Button */}
        <Link
          href="/messages"
          className="relative flex items-center justify-center size-11 rounded-[16px] glass-card hover:bg-zinc-100/60 dark:hover:bg-zinc-900/60 hover:-translate-y-0.5 shadow-premium-sm hover:shadow-premium-md text-foreground transition-all shrink-0 cursor-pointer"
        >
          <Mail className="size-5 shrink-0" />
          {!!messagesData.unreadCount && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-indigo-600 text-[9px] font-black text-white shadow-sm border border-white dark:border-[#08090e]">
              {messagesData.unreadCount}
            </span>
          )}
        </Link>

        {/* Profile Dropdown Trigger */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 p-1.5 rounded-[16px] glass-card hover:-translate-y-0.5 transition-all shadow-premium-sm hover:shadow-premium-md border border-zinc-200/50 dark:border-zinc-800/40 select-none">
              <div className="relative size-8 shrink-0">
                <UserAvatar
                  avatarUrl={user.avatarUrl}
                  size={32}
                  className="size-8 rounded-full object-cover border border-border/20"
                />
                <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#08090e]" />
              </div>
              <ChevronDown className="size-4 text-muted-foreground/80 shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={8}
            className="w-56 p-1.5 shadow-premium-lg rounded-2xl border border-zinc-200/50 dark:border-zinc-800/80 bg-white/95 dark:bg-[#0c0d14]/95 backdrop-blur-md select-none"
          >
            <DropdownMenuItem asChild>
              <Link href={`/users/${user.username}`} className="flex items-center gap-3 p-3 cursor-pointer rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900">
                <UserIcon className="size-4.5" />
                <span className="text-sm font-medium">My Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-3 p-3 cursor-pointer rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900">
                <SettingsIcon className="size-4.5" />
                <span className="text-sm font-medium">Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                queryClient.clear();
                logout();
              }}
              className="flex items-center gap-3 p-3 text-destructive cursor-pointer rounded-xl hover:bg-destructive/10"
            >
              <LogOut className="size-4.5" />
              <span className="text-sm font-bold">Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
