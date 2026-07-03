"use client";

import { useSession } from "@/app/(main)/SessionProvider";
import { Button } from "@/components/ui/button";
import UserAvatar from "@/components/UserAvatar";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import kyInstance from "@/lib/ky";
import { MessageCountInfo, NotificationCountInfo } from "@/lib/types";
import { logout } from "@/app/(auth)/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Bell,
  Bookmark,
  Compass,
  Heart,
  Home,
  LogOut,
  Mail,
  Menu,
  Moon,
  PlusSquare,
  Search,
  Settings,
  Sun,
  User,
  Activity,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

// Custom fast-loading SpotsIcon SVG component matching the user's logo design
export function SpotsIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Brackets around the corners */}
      <path d="M3 8V3h5" />
      <path d="M3 16v5h5" />
      <path d="M16 21h5v-5" />

      {/* Center Play Button: triangle */}
      <polygon points="8 7 16 12 8 17 8 7" fill="currentColor" />

      {/* Sparkle/Star in the top-right corner */}
      <path d="M18 1v8M14 5h8M15.2 2.2l5.6 5.6M15.2 7.8l5.6-5.6" strokeWidth="1.2" />

      {/* Sparkle little accent dots */}
      <circle cx="14.5" cy="4.5" r="0.4" fill="currentColor" stroke="none" />
      <circle cx="21.5" cy="5.5" r="0.4" fill="currentColor" stroke="none" />
      <circle cx="20.5" cy="8" r="0.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

interface CartlySidebarProps {
  initialNotificationsCount: number;
  initialMessagesCount: number;
}

export default function CartlySidebar({
  initialNotificationsCount,
  initialMessagesCount,
}: CartlySidebarProps) {
  const { user } = useSession();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();

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

  interface SidebarItem {
    icon: (props: any) => React.ReactNode;
    label: string;
    href: string;
    onClick?: () => void;
    active: boolean;
    badge?: number;
  }

  const menuItems: SidebarItem[] = [
    {
      icon: (props: any) => <Home {...props} />,
      label: "Home",
      href: "/",
      active: pathname === "/",
    },
    {
      icon: (props: any) => <Search {...props} />,
      label: "Search",
      href: "/search",
      active: pathname.startsWith("/search"),
    },
    {
      icon: (props: any) => <SpotsIcon {...props} />,
      label: "Spots",
      href: "/reels",
      active: pathname === "/reels",
    },

    {
      icon: (props: any) => <Mail {...props} />,
      label: "Messages",
      href: "/messages",
      active: pathname.startsWith("/messages"),
      badge: messagesData.unreadCount,
    },
    {
      icon: (props: any) => <Heart {...props} />,
      label: "Notifications",
      href: "/notifications",
      active: pathname.startsWith("/notifications"),
      badge: notificationsData.unreadCount,
    },
    {
      icon: (props: any) => <PlusSquare {...props} />,
      label: "Create",
      href: "/create",
      active: pathname === "/create",
    },
    {
      icon: (props: any) => <UserAvatar avatarUrl={user.avatarUrl} size={24} {...props} />,
      label: "Profile",
      href: `/users/${user.username}`,
      active: pathname === `/users/${user.username}`,
    },
  ];

  if (pathname === "/create") return null;

  const isReels = false; // Always expanded on desktop

  return (
    <>
      {/* Sidebar Navigation */}
      <aside className={cn(
        "fixed left-0 top-0 z-20 hidden h-screen flex-col justify-between border-e bg-card px-3 py-6 transition-all duration-300 sm:flex w-[72px] xl:w-[244px]"
      )}>
        <div className="flex flex-col gap-6">
          {/* Logo */}
          <Link href="/" className="logo-btn flex items-center gap-2 px-2 py-2 select-none">
            <img
              src="/android-chrome-192x192-Photoroom.png"
              alt="Cartly Logo"
              className="size-9 object-contain flex-shrink-0"
            />
            <span 
              className="hidden text-2xl font-black tracking-tight xl:block text-foreground"
              style={{ fontFamily: "'Nunito', sans-serif" }}
            >
              Cartly
            </span>
            
            {/* Animated stars */}
            <svg className="star-1" viewBox="0 0 783.08 783.08" xmlns="http://www.w3.org/2000/svg">
              <path className="fil0" d="M391.54 0l113.39 278.14L783.08 391.54 504.93 504.93 391.54 783.08 278.14 504.93 0 391.54 278.14 113.39z"/>
            </svg>
            <svg className="star-2" viewBox="0 0 783.08 783.08" xmlns="http://www.w3.org/2000/svg">
              <path className="fil0" d="M391.54 0l113.39 278.14L783.08 391.54 504.93 504.93 391.54 783.08 278.14 504.93 0 391.54 278.14 113.39z"/>
            </svg>
            <svg className="star-3" viewBox="0 0 783.08 783.08" xmlns="http://www.w3.org/2000/svg">
              <path className="fil0" d="M391.54 0l113.39 278.14L783.08 391.54 504.93 504.93 391.54 783.08 278.14 504.93 0 391.54 278.14 113.39z"/>
            </svg>
            <svg className="star-4" viewBox="0 0 783.08 783.08" xmlns="http://www.w3.org/2000/svg">
              <path className="fil0" d="M391.54 0l113.39 278.14L783.08 391.54 504.93 504.93 391.54 783.08 278.14 504.93 0 391.54 278.14 113.39z"/>
            </svg>
            <svg className="star-5" viewBox="0 0 783.08 783.08" xmlns="http://www.w3.org/2000/svg">
              <path className="fil0" d="M391.54 0l113.39 278.14L783.08 391.54 504.93 504.93 391.54 783.08 278.14 504.93 0 391.54 278.14 113.39z"/>
            </svg>
            <svg className="star-6" viewBox="0 0 783.08 783.08" xmlns="http://www.w3.org/2000/svg">
              <path className="fil0" d="M391.54 0l113.39 278.14L783.08 391.54 504.93 504.93 391.54 783.08 278.14 504.93 0 391.54 278.14 113.39z"/>
            </svg>
          </Link>
 
          {/* Navigation Items */}
          <nav className="flex flex-col gap-2">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              const content = (
                <div className="flex items-center gap-4">
                  <div className="relative flex items-center justify-center">
                    <Icon className="size-6 flex-shrink-0" />
                    {!!item.badge && (
                      <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shadow-sm">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className={cn(
                    "hidden text-[16px] xl:inline",
                    item.active ? "font-bold" : ""
                  )}>
                    {item.label}
                  </span>
                </div>
              );
 
              const btnClass = `w-full flex items-center justify-start gap-4 px-3 py-3 rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors ${
                item.active ? "bg-indigo-600/15 text-indigo-400 font-bold" : "text-muted-foreground"
              }`;
 
              if (item.onClick) {
                return (
                  <button key={index} onClick={item.onClick} className={btnClass}>
                    {content}
                  </button>
                );
              }
 
              return (
                <Link key={index} href={item.href || "#"} className={btnClass}>
                  {content}
                </Link>
              );
            })}

            {/* Create purple solid button */}
            <Link href="/create" className="hidden xl:flex w-full items-center justify-center gap-2 py-3.5 rounded-xl bg-[#4f46e5] text-white font-bold hover:bg-[#4338ca] active:scale-[0.98] transition-all shadow-lg mt-4 text-sm">
              <PlusSquare className="size-5" />
              <span>Create</span>
            </Link>
          </nav>
        </div>
 
        {/* Bottom Actions */}
        <div className="flex flex-col gap-2">
          {/* More Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center justify-start gap-4 px-3 py-3 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
                <Menu className="size-6 flex-shrink-0" />
                <span className="hidden xl:inline">More</span>
              </button>
            </DropdownMenuTrigger>


            <DropdownMenuContent
              side="top"
              align="start"
              sideOffset={10}
              className="w-64 p-1.5 shadow-2xl rounded-2xl border border-border/40 bg-card select-none"
            >
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center gap-3 p-3 cursor-pointer">
                  <Settings className="size-5" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              {(user.role === "ADMIN" || user.username === "Omkar2005") && (
                <DropdownMenuItem asChild>
                  <Link href="/admin" className="flex items-center gap-3 p-3 cursor-pointer">
                    <Activity className="size-5" />
                    <span>AI Dashboard</span>
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="flex items-center gap-3 p-3 cursor-pointer">
                <Activity className="size-5" />
                <span>Your Activity</span>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/bookmarks" className="flex items-center gap-3 p-3 cursor-pointer">
                  <Bookmark className="size-5" />
                  <span>Saved</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="flex items-center gap-3 p-3 cursor-pointer"
              >
                {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
                <span>Switch appearance</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-center gap-3 p-3 cursor-pointer">
                <AlertCircle className="size-5" />
                <span>Report a problem</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex items-center gap-3 p-3 cursor-pointer">
                <span>Switch accounts</span>
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

          {/* User Profile Card */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border hover:bg-accent transition-colors cursor-pointer select-none">
                <div className="flex items-center gap-2.5 min-w-0">
                  <UserAvatar avatarUrl={user.avatarUrl} size={36} className="size-9 rounded-full object-cover border border-border/20" />
                  <div className="hidden xl:flex flex-col text-left min-w-0">
                    <span className="text-xs font-semibold text-foreground truncate">{user.displayName}</span>
                    <span className="text-[10px] text-muted-foreground truncate">@{user.username}</span>
                  </div>
                </div>
                <ChevronDown className="hidden xl:block size-4 text-muted-foreground flex-shrink-0" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              align="start"
              sideOffset={10}
              className="w-64 p-1.5 shadow-2xl rounded-2xl border border-border/40 bg-card select-none"
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
      </aside>


    </>
  );
}
