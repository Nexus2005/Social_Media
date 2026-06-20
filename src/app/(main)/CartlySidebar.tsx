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
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTheme } from "next-themes";
import PostEditor from "@/components/posts/editor/PostEditor";
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

  const menuItems = [
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
      onClick: () => setIsCreateOpen(true),
      active: false,
    },
    {
      icon: (props: any) => <UserAvatar avatarUrl={user.avatarUrl} size={24} {...props} />,
      label: "Profile",
      href: `/users/${user.username}`,
      active: pathname === `/users/${user.username}`,
    },
  ];

  const isReels = pathname === "/reels";

  return (
    <>
      {/* Sidebar Navigation */}
      <aside className={cn(
        "fixed left-0 top-0 z-20 hidden h-screen flex-col justify-between border-e bg-card px-3 py-6 transition-all duration-300 sm:flex w-[72px]",
        isReels ? "" : "xl:w-[244px]"
      )}>
        <div className="flex flex-col gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 px-2 py-2">
            <img
              src="/cartly-logo.webp"
              alt="Cartly Logo"
              className="size-9 object-contain flex-shrink-0"
            />
            <span className={cn(
              "hidden text-2xl font-black tracking-tight font-sans cartly-gradient-text",
              !isReels && "xl:block"
            )}>
              Cartly
            </span>
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
                      <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs font-bold text-destructive-foreground">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className={cn(
                    "hidden text-[16px]",
                    !isReels && "xl:inline",
                    item.active ? "font-bold" : ""
                  )}>
                    {item.label}
                  </span>
                </div>
              );

              const btnClass = `w-full flex items-center justify-start gap-4 px-3 py-3 rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors ${
                item.active ? "bg-accent/40 text-foreground font-bold" : "text-muted-foreground"
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
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="flex flex-col gap-2">
          {/* More Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center justify-start gap-4 px-3 py-3 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
                <Menu className="size-6 flex-shrink-0" />
                <span className={cn("hidden text-[16px]", !isReels && "xl:inline")}>More</span>
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
        </div>
      </aside>

      {/* Create Post Modal */}
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
