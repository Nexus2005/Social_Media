"use client";

import React, { useState, useEffect } from "react";
import StoriesCarousel from "@/components/StoriesCarousel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FollowingFeed from "./FollowingFeed";
import ForYouFeed from "./ForYouFeed";
import LatestFeed from "./LatestFeed";
import SuggestedSidebar from "./SuggestedSidebar";
import { Search, Plus, Bell, Mail, ChevronDown, LogOut, User as UserIcon, Settings as SettingsIcon } from "lucide-react";
import { useSession } from "./SessionProvider";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import kyInstance from "@/lib/ky";
import { MessageCountInfo, NotificationCountInfo } from "@/lib/types";
import UserAvatar from "@/components/UserAvatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { logout } from "@/app/(auth)/actions";
import Link from "next/link";

export default function Home() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch real-time counts for header badges
  const { data: notificationsData } = useQuery({
    queryKey: ["unread-notification-count"],
    queryFn: () =>
      kyInstance
        .get("/api/notifications/unread-count")
        .json<NotificationCountInfo>(),
    initialData: { unreadCount: 0 },
    refetchInterval: 60 * 1000,
    enabled: !!user,
  });

  const { data: messagesData } = useQuery({
    queryKey: ["unread-messages-count"],
    queryFn: () =>
      kyInstance.get("/api/messages/unread-count").json<MessageCountInfo>(),
    initialData: { unreadCount: 0 },
    refetchInterval: 60 * 1000,
    enabled: !!user,
  });

  if (!mounted || !user) return null;

  return (
    <div className="mx-auto flex flex-col w-full max-w-[1100px] gap-6 px-4 md:px-6 py-6 justify-center bg-instagram-lightBg dark:bg-instagram-darkBg min-h-screen text-foreground transition-colors duration-200">
      
      {/* 1. Upper Header Row - Desktop Only */}
      <div className="hidden xl:flex justify-between items-center gap-8 w-full shrink-0 select-none pb-2">
        {/* Left aligned Search Bar (same width as feed column) */}
        <div className="w-full max-w-[640px]">
          <form action="/search" method="GET" className="w-full">
            <div className="relative flex items-center h-12 w-full bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl px-4 gap-2.5 shadow-sm transition-all focus-within:border-indigo-500/50">
              <Search className="size-5 text-muted-foreground shrink-0" />
              <input
                name="q"
                type="text"
                placeholder="Search for products, brands, styles or creators..."
                className="flex-grow bg-transparent text-[14.5px] text-foreground placeholder:text-muted-foreground/60 outline-none h-full"
              />
              <div className="flex items-center justify-center px-1.5 py-0.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 text-[11px] text-muted-foreground/80 font-bold font-mono">
                ⌘ K
              </div>
            </div>
          </form>
        </div>

        {/* Right aligned actions bar (matches right sidebar width) */}
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
      </div>

      {/* 2. Main Two-Column Layout */}
      <div className="flex gap-8 w-full justify-center items-start">
        
        {/* Center Feed Column */}
        <div className="w-full max-w-[640px] space-y-4">
          
          {/* Mobile Search Bar - Mobile View Only */}
          <div className="sticky top-14 z-20 bg-instagram-lightBg dark:bg-instagram-darkBg py-1.5 px-4 sm:py-2.5 sm:px-0 xl:hidden">
            <form action="/search" method="GET" className="w-full">
              <div className="relative flex items-center h-11 w-full bg-zinc-100 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 gap-2">
                <Search className="size-5 text-muted-foreground shrink-0" />
                <input
                  name="q"
                  type="text"
                  placeholder="Search"
                  className="flex-grow bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground/60 outline-none h-full"
                />
              </div>
            </form>
          </div>

          {/* Stories block wrapped in a premium card */}
          <div className="p-4 rounded-3xl border border-zinc-200/50 dark:border-zinc-805/85 bg-[#ffffff]/60 dark:bg-[#0c0d14]/40 backdrop-blur-md shadow-sm">
            <StoriesCarousel />
          </div>

          {/* Feeds Tabs */}
          <Tabs defaultValue="for-you" className="w-full">
            <TabsList className="w-full justify-start border-b border-zinc-200 dark:border-zinc-800 bg-transparent p-0 h-11 rounded-none gap-6 mb-3">
              <TabsTrigger
                value="for-you"
                className="bg-transparent relative rounded-none px-1 py-2.5 h-full text-[15px] font-extrabold text-muted-foreground/80 data-[state=active]:text-foreground transition-all after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2.5px] after:bg-indigo-500 after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform after:duration-200 data-[state=active]:bg-transparent"
              >
                For you
              </TabsTrigger>
              <TabsTrigger
                value="following"
                className="bg-transparent relative rounded-none px-1 py-2.5 h-full text-[15px] font-extrabold text-muted-foreground/80 data-[state=active]:text-foreground transition-all after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2.5px] after:bg-indigo-500 after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform after:duration-200 data-[state=active]:bg-transparent"
              >
                Following
              </TabsTrigger>
              <TabsTrigger
                value="latest"
                className="bg-transparent relative rounded-none px-1 py-2.5 h-full text-[15px] font-extrabold text-muted-foreground/80 data-[state=active]:text-foreground transition-all after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2.5px] after:bg-indigo-500 after:scale-x-0 data-[state=active]:after:scale-x-100 after:transition-transform after:duration-200 data-[state=active]:bg-transparent"
              >
                Latest
              </TabsTrigger>
            </TabsList>

            <TabsContent value="for-you" className="mt-0 outline-none">
              <ForYouFeed />
            </TabsContent>
            <TabsContent value="following" className="mt-0 outline-none">
              <FollowingFeed />
            </TabsContent>
            <TabsContent value="latest" className="mt-0 outline-none">
              <LatestFeed />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Sidebar Column */}
        <div className="w-[360px] hidden xl:block flex-shrink-0">
          <SuggestedSidebar />
        </div>

      </div>
    </div>
  );
}
