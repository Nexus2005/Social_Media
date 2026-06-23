"use client";

import { useQueryClient } from "@tanstack/react-query";
import { logout } from "@/app/(auth)/actions";
import {
  Settings,
  Activity,
  Bookmark,
  Archive,
  BarChart3,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import StandardDrawer from "@/components/ui/StandardDrawer";

interface ProfileMenuDrawerProps {
  open: boolean;
  onClose: () => void;
  isAdminOrOwner: boolean;
}

export default function ProfileMenuDrawer({
  open,
  onClose,
  isAdminOrOwner,
}: ProfileMenuDrawerProps) {
  const queryClient = useQueryClient();

  const handleLogout = () => {
    queryClient.clear();
    logout();
  };

  const menuItems = [
    {
      icon: Settings,
      label: "Settings",
      href: "/settings",
    },
    {
      icon: Activity,
      label: "Your Activity",
      href: "#",
    },
    {
      icon: Bookmark,
      label: "Saved",
      href: "/bookmarks",
    },
    {
      icon: Archive,
      label: "Archive",
      href: "#",
    },
    ...(isAdminOrOwner
      ? [
          {
            icon: BarChart3,
            label: "Professional Dashboard",
            href: "/creator",
          },
        ]
      : []),
  ];

  return (
    <StandardDrawer open={open} onClose={onClose} title="Options">
      <div className="flex flex-col py-2">
        {menuItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <Link
              key={idx}
              href={item.href}
              onClick={onClose}
              className="flex items-center gap-4 px-6 py-4 hover:bg-zinc-900/40 text-white font-medium text-[16px] transition-colors"
            >
              <Icon className="size-6 text-zinc-400" strokeWidth={1.75} />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={handleLogout}
          className="flex items-center gap-4 px-6 py-4 hover:bg-red-500/5 text-red-500 font-semibold text-[16px] transition-colors text-left w-full"
        >
          <LogOut className="size-6 text-red-500" strokeWidth={1.75} />
          <span>Log out</span>
        </button>
      </div>
    </StandardDrawer>
  );
}
