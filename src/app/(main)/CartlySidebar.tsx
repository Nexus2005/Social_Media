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
  ChevronLeft,
  ChevronRight,
  List,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
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

  const isMessagesPage = pathname.startsWith("/messages");
  const [isMinimized, setIsMinimized] = useState(isMessagesPage);

  useEffect(() => {
    setIsMinimized(pathname.startsWith("/messages"));
  }, [pathname]);

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
      icon: (props: any) => <Compass {...props} />,
      label: "Explore",
      href: "/explore",
      active: pathname === "/explore",
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
      icon: (props: any) => <Bell {...props} />,
      label: "Notifications",
      href: "/notifications",
      active: pathname.startsWith("/notifications"),
      badge: notificationsData.unreadCount,
    },
    {
      icon: (props: any) => <Bookmark {...props} />,
      label: "Bookmarks",
      href: "/bookmarks",
      active: pathname === "/bookmarks",
    },
    {
      icon: (props: any) => <List {...props} />,
      label: "Lists",
      href: "/lists",
      active: pathname === "/lists",
    },
    {
      icon: (props: any) => <User {...props} />,
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
        "fixed left-3 top-3 z-20 hidden h-[calc(100vh-24px)] flex-col justify-between border bg-[#ffffff]/90 dark:bg-[#0c0d14]/90 backdrop-blur-md px-3 py-6 rounded-[24px] transition-all duration-300 sm:flex shadow-xl border-zinc-200/50 dark:border-zinc-800/80",
        isMinimized ? "w-[72px] minimized-sidebar" : "w-[72px] xl:w-[244px]"
      )}>
        <div className="flex flex-col gap-6">
          {/* Logo */}
          <Link href="/" className="logo-btn flex items-center gap-2 px-2 py-2 select-none">
            <img
              src="/android-chrome-192x192-Photoroom.png"
              alt="Cartly Logo"
              className="size-9 object-contain flex-shrink-0"
            />
            {!isMinimized && (
              <>
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
              </>
            )}
          </Link>
 
          {/* Toggle Minimize/Maximize Arrow Button just below Logo */}
          <div className="px-2">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="flex items-center justify-center h-8 w-8 hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-all cursor-pointer rounded-full bg-indigo-600/10 border border-indigo-500/20 shadow-sm hover:scale-105 active:scale-95"
              title={isMinimized ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isMinimized ? (
                <ChevronRight className="size-4.5 text-indigo-400 animate-pulse" />
              ) : (
                <ChevronLeft className="size-4.5 text-indigo-400" />
              )}
            </button>
          </div>
  
          {/* Navigation Items */}
          <nav className="flex flex-col gap-1.5 max-h-[50vh] overflow-y-auto scrollbar-none pr-0.5">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              const content = (
                <div className={cn("flex items-center w-full", isMinimized ? "justify-center" : "gap-4")}>
                  <div className="relative flex items-center justify-center">
                    <Icon className="size-6 flex-shrink-0" />
                    {!!item.badge && (
                      <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shadow-sm">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  {!isMinimized && (
                    <span className={cn(
                      "hidden text-[16px] xl:inline",
                      item.active ? "font-bold" : ""
                    )}>
                      {item.label}
                    </span>
                  )}
                </div>
              );
  
              const btnClass = cn(
                "flex items-center rounded-lg hover:bg-accent hover:text-accent-foreground transition-all duration-200",
                isMinimized ? "w-11 h-11 justify-center p-0 mx-auto" : "w-full justify-start gap-4 px-3 py-3",
                item.active ? "bg-indigo-600/15 text-indigo-400 font-bold" : "text-muted-foreground"
              );
  
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
 
            {/* Redesigned solid gradient Create Post button */}
            <Link
              href="/create"
              className={cn(
                "hidden xl:flex items-center justify-center bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-extrabold active:scale-[0.97] transition-all shadow-md shadow-indigo-550/10 mt-3",
                isMinimized
                  ? "size-11 rounded-full p-0 mx-auto"
                  : "w-full py-3.5 rounded-xl gap-2 text-sm"
              )}
            >
              <PlusSquare className="size-5 flex-shrink-0" />
              {!isMinimized && <span>Create Post</span>}
            </Link>
          </nav>
        </div>
 
        {/* Bottom Actions */}
        <div className="flex flex-col gap-2">
          {/* Upgrade to Cartly Pro widget */}
          {!isMinimized && (
            <div className="mx-1 mb-2 p-4 rounded-2xl border border-zinc-200/50 dark:border-zinc-805/80 bg-zinc-50/50 dark:bg-zinc-950/40 backdrop-blur-sm flex flex-col gap-2.5 select-none animate-in fade-in slide-in-from-bottom-3 duration-300">
              <span className="text-[13px] font-extrabold text-foreground flex items-center gap-1.5">
                👑 Upgrade to Cartly Pro
              </span>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Unlock advanced analytics, higher reach & more.
              </p>
              <Link
                href="/settings?tab=premium"
                className="w-full text-center py-2.5 rounded-xl border border-indigo-500/35 hover:border-indigo-500/60 dark:border-zinc-800 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900/60 text-xs font-bold text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition-all duration-200 block"
              >
                Upgrade Now
              </Link>
            </div>
          )}
          {/* More Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={cn(
                "flex items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
                isMinimized ? "w-11 h-11 justify-center p-0 mx-auto" : "w-full justify-start gap-4 px-3 py-3"
              )}>
                <Menu className="size-6 flex-shrink-0" />
                {!isMinimized && <span className="hidden xl:inline">More</span>}
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
              <div className={cn(
                "flex items-center bg-card border border-border hover:bg-accent transition-colors cursor-pointer select-none",
                isMinimized ? "p-1.5 justify-center rounded-full mx-auto w-11 h-11" : "p-2.5 justify-between rounded-xl w-full"
              )}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <UserAvatar avatarUrl={user.avatarUrl} size={36} className="size-9 rounded-full object-cover border border-border/20" />
                  {!isMinimized && (
                    <div className="hidden xl:flex flex-col text-left min-w-0">
                      <span className="text-xs font-semibold text-foreground truncate">{user.displayName}</span>
                      <span className="text-[10px] text-muted-foreground truncate">@{user.username}</span>
                    </div>
                  )}
                </div>
                {!isMinimized && <ChevronDown className="hidden xl:block size-4 text-muted-foreground flex-shrink-0" />}
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

      <style dangerouslySetInnerHTML={{
        __html: `
          @media (min-width: 640px) {
            .main-content-wrapper {
              padding-left: 96px !important;
            }
          }
          @media (min-width: 1280px) {
            .main-content-wrapper {
              padding-left: 268px !important;
            }
            aside.minimized-sidebar ~ .main-content-wrapper {
              padding-left: 96px !important;
            }
          }
        `
      }} />
    </>
  );
}
