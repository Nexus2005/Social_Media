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
        "fixed left-4 top-4 z-20 hidden h-[calc(100vh-32px)] flex-col justify-between glass-panel px-3.5 py-6.5 rounded-[28px] transition-all duration-300 sm:flex shadow-premium-lg border-zinc-200/30 dark:border-zinc-800/40 select-none",
        isMinimized ? "w-[76px] minimized-sidebar" : "w-[76px] xl:w-[256px]"
      )}>
        <div className="flex flex-col gap-6">
          {/* Logo */}
          <Link href="/" className="logo-btn flex items-center gap-2 px-2.5 py-2.5 select-none">
            <img
              src="/android-chrome-192x192-Photoroom.png"
              alt="Cartly Logo"
              className="size-9.5 object-contain flex-shrink-0"
            />
            {!isMinimized && (
              <>
                <span 
                  className="hidden text-2xl font-black tracking-tight xl:block text-foreground bg-gradient-to-r from-foreground via-foreground to-muted-foreground/80 bg-clip-text"
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
              className="flex items-center justify-center h-8 w-8 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-muted-foreground transition-all cursor-pointer rounded-full bg-indigo-500/5 border border-indigo-500/10 shadow-premium-sm hover:scale-105 active:scale-95"
              title={isMinimized ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isMinimized ? (
                <ChevronRight className="size-4 text-indigo-500 animate-pulse" />
              ) : (
                <ChevronLeft className="size-4 text-indigo-500" />
              )}
            </button>
          </div>
  
          {/* Navigation Items */}
          <nav className="flex flex-col gap-1 max-h-[48vh] overflow-y-auto scrollbar-none pr-0.5">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              const content = (
                <div className={cn("flex items-center w-full", isMinimized ? "justify-center" : "gap-3.5")}>
                  <div className="relative flex items-center justify-center">
                    <Icon className={cn("size-[21px] flex-shrink-0 transition-transform group-hover:scale-105", item.active ? "text-indigo-600 dark:text-indigo-400" : "text-muted-foreground/90")} />
                    {!!item.badge && (
                      <span className="absolute -right-2 -top-2 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-black text-white shadow-sm border border-white dark:border-[#08090e]">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  {!isMinimized && (
                    <span className={cn(
                      "hidden text-[14.5px] xl:inline tracking-wide font-medium transition-colors",
                      item.active ? "text-indigo-600 dark:text-indigo-400 font-extrabold" : "text-muted-foreground group-hover:text-foreground"
                    )}>
                      {item.label}
                    </span>
                  )}
                </div>
              );
  
              const btnClass = cn(
                "flex items-center rounded-[14px] transition-all duration-200 group relative",
                isMinimized ? "w-11 h-11 justify-center p-0 mx-auto" : "w-full justify-start gap-3.5 px-3 py-2.5",
                item.active 
                  ? "bg-indigo-650/10 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-extrabold border border-indigo-500/20 shadow-premium-sm" 
                  : "text-muted-foreground hover:bg-zinc-100/60 dark:hover:bg-zinc-900/50 hover:text-foreground hover:scale-[1.01]"
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
                "hidden xl:flex items-center justify-center bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-extrabold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md shadow-indigo-550/15 mt-4.5 rounded-[15px]",
                isMinimized
                  ? "size-11 rounded-full p-0 mx-auto"
                  : "w-full py-3 text-xs uppercase tracking-wider gap-2"
              )}
            >
              <PlusSquare className="size-4.5 flex-shrink-0" />
              {!isMinimized && <span>Create Post</span>}
            </Link>
          </nav>
        </div>
 
        {/* Bottom Actions */}
        <div className="flex flex-col gap-2.5">
          {/* Redesigned Premium Cartly Pro Card */}
          {!isMinimized && (
            <div className="mx-1 mb-3 p-4 rounded-[20px] bg-gradient-to-tr from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/15 dark:border-indigo-500/10 shadow-premium-sm relative overflow-hidden group/pro select-none animate-in fade-in slide-in-from-bottom-3 duration-300">
              <div className="absolute -right-6 -top-6 size-16 bg-indigo-500/15 rounded-full blur-xl group-hover/pro:bg-indigo-500/25 transition-all duration-500" />
              
              <div className="flex items-center gap-1.5 mb-1 z-10 relative">
                <span className="text-xs font-black tracking-wider uppercase bg-gradient-to-r from-indigo-500 to-purple-650 bg-clip-text text-transparent dark:from-indigo-400 dark:to-purple-400">
                  👑 Cartly Pro
                </span>
                <span className="px-1.5 py-0.5 rounded-full text-[8px] font-black bg-indigo-500 text-white uppercase shrink-0">
                  New
                </span>
              </div>
              <p className="text-[10.5px] text-muted-foreground leading-snug mb-3 z-10 relative">
                Unlock advanced analytics, higher reach & commerce insights.
              </p>
              <Link
                href="/settings?tab=premium"
                className="w-full text-center py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[11px] font-black hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md shadow-indigo-550/10 block z-10 relative"
              >
                Upgrade Now
              </Link>
            </div>
          )}

          {/* More Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={cn(
                "flex items-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-zinc-100/60 dark:hover:bg-zinc-900/50 transition-colors border border-transparent hover:border-zinc-200/20",
                isMinimized ? "w-11 h-11 justify-center p-0 mx-auto" : "w-full justify-start gap-3.5 px-3.5 py-2.5"
              )}>
                <Menu className="size-5 flex-shrink-0" />
                {!isMinimized && <span className="hidden xl:inline text-[14.5px] font-medium tracking-wide">More</span>}
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              side="top"
              align="start"
              sideOffset={10}
              className="w-64 p-1.5 shadow-premium-lg rounded-2xl border border-zinc-200/50 dark:border-zinc-800/80 bg-white/95 dark:bg-[#0c0d14]/95 backdrop-blur-md select-none"
            >
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center gap-3 p-3 cursor-pointer rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900">
                  <Settings className="size-4.5" />
                  <span className="text-sm font-medium">Settings</span>
                </Link>
              </DropdownMenuItem>
              {(user.role === "ADMIN" || user.username === "Omkar2005") && (
                <DropdownMenuItem asChild>
                  <Link href="/admin" className="flex items-center gap-3 p-3 cursor-pointer rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900">
                    <Activity className="size-4.5" />
                    <span className="text-sm font-medium">AI Dashboard</span>
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="flex items-center gap-3 p-3 cursor-pointer rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900">
                <Activity className="size-4.5" />
                <span className="text-sm font-medium">Your Activity</span>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/bookmarks" className="flex items-center gap-3 p-3 cursor-pointer rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900">
                  <Bookmark className="size-4.5" />
                  <span className="text-sm font-medium">Saved</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="flex items-center gap-3 p-3 cursor-pointer rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                {theme === "dark" ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
                <span className="text-sm font-medium">Switch appearance</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-center gap-3 p-3 cursor-pointer rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900">
                <AlertCircle className="size-4.5" />
                <span className="text-sm font-medium">Report a problem</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex items-center gap-3 p-3 cursor-pointer rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900">
                <span className="text-sm font-medium">Switch accounts</span>
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

          {/* User Profile Card */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className={cn(
                "flex items-center bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/40 hover:bg-zinc-100 dark:hover:bg-zinc-900/60 hover:scale-[1.01] transition-all cursor-pointer select-none shadow-premium-sm",
                isMinimized ? "p-1.5 justify-center rounded-full mx-auto w-11 h-11" : "p-2.5 justify-between rounded-2xl w-full"
              )}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <UserAvatar avatarUrl={user.avatarUrl} size={36} className="size-9 rounded-full object-cover border border-zinc-200/20 dark:border-zinc-800/20 shrink-0" />
                  {!isMinimized && (
                    <div className="hidden xl:flex flex-col text-left min-w-0">
                      <span className="text-[12.5px] font-bold text-foreground truncate leading-tight">{user.displayName}</span>
                      <span className="text-[10px] text-muted-foreground/80 truncate">@{user.username}</span>
                    </div>
                  )}
                </div>
                {!isMinimized && <ChevronDown className="hidden xl:block size-4 text-muted-foreground/80 flex-shrink-0" />}
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              align="start"
              sideOffset={10}
              className="w-64 p-1.5 shadow-premium-lg rounded-2xl border border-zinc-200/50 dark:border-zinc-800/80 bg-white/95 dark:bg-[#0c0d14]/95 backdrop-blur-md select-none"
            >
              <DropdownMenuItem asChild>
                <Link href={`/users/${user.username}`} className="flex items-center gap-3 p-3 cursor-pointer rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900">
                  <User className="size-4.5" />
                  <span className="text-sm font-medium">My Profile</span>
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
      </aside>

      <style dangerouslySetInnerHTML={{
        __html: `
          @media (min-width: 640px) {
            .main-content-wrapper {
              padding-left: 112px !important;
            }
          }
          @media (min-width: 1280px) {
            .main-content-wrapper {
              padding-left: 296px !important;
            }
            aside.minimized-sidebar ~ .main-content-wrapper {
              padding-left: 112px !important;
            }
          }
        `
      }} />
    </>
  );
}
