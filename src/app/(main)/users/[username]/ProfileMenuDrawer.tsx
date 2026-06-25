"use client";

import { useQueryClient } from "@tanstack/react-query";
import { logout } from "@/app/(auth)/actions";
import { useToast } from "@/components/ui/use-toast";
import {
  Settings,
  Activity,
  Bookmark,
  Archive,
  BarChart3,
  LogOut,
  Share2,
  Copy,
  Info,
  Flag,
  Slash,
} from "lucide-react";
import Link from "next/link";
import StandardDrawer from "@/components/ui/StandardDrawer";

interface ProfileMenuDrawerProps {
  open: boolean;
  onClose: () => void;
  isOwner: boolean;
  username: string;
}

export default function ProfileMenuDrawer({
  open,
  onClose,
  isOwner,
  username,
}: ProfileMenuDrawerProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleLogout = () => {
    queryClient.clear();
    logout();
  };

  const handleCopyLink = () => {
    const profileUrl = `${window.location.origin}/users/${username}`;
    navigator.clipboard.writeText(profileUrl);
    toast({
      description: "Profile link copied to clipboard",
    });
    onClose();
  };

  const handleShare = () => {
    const profileUrl = `${window.location.origin}/users/${username}`;
    if (navigator.share) {
      navigator.share({
        title: `${username}'s Profile`,
        url: profileUrl,
      }).catch(console.error);
    } else {
      handleCopyLink();
    }
  };

  // Menu items for own profile
  const ownMenuItems = [
    {
      icon: Settings,
      label: "Settings",
      href: "/settings",
    },
    {
      icon: Activity,
      label: "Your Activity",
      href: "/settings/activity",
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
    {
      icon: BarChart3,
      label: "Professional Dashboard",
      href: "/creator",
    },
  ];

  // Menu items for other user's profile
  const otherMenuItems = [
    {
      icon: Share2,
      label: "Share this profile",
      onClick: handleShare,
    },
    {
      icon: Copy,
      label: "Copy profile URL",
      onClick: handleCopyLink,
    },
    {
      icon: Info,
      label: "About this account",
      onClick: () => {
        toast({ description: "This is a verified Cartly creator account." });
        onClose();
      },
    },
    {
      icon: Flag,
      label: "Report",
      onClick: () => {
        toast({ description: "Thank you for reporting. We will review this account." });
        onClose();
      },
      danger: true,
    },
    {
      icon: Slash,
      label: "Block",
      onClick: () => {
        toast({ description: "Account blocked successfully." });
        onClose();
      },
      danger: true,
    },
  ];

  return (
    <StandardDrawer open={open} onClose={onClose} title={isOwner ? "Options" : username}>
      <div className="flex flex-col py-2 bg-[#121212]">
        {isOwner ? (
          <>
            {ownMenuItems.map((item, idx) => {
              const Icon = item.icon;
              return (
                <Link
                  key={idx}
                  href={item.href}
                  onClick={onClose}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-zinc-800/40 text-white font-medium text-[16px] transition-colors"
                >
                  <Icon className="size-6 text-zinc-400" strokeWidth={1.75} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <button
              onClick={handleLogout}
              className="flex items-center gap-4 px-6 py-4 hover:bg-red-500/5 text-red-500 font-semibold text-[16px] transition-colors text-left w-full border-t border-[#262626] mt-2"
            >
              <LogOut className="size-6 text-red-500" strokeWidth={1.75} />
              <span>Log out</span>
            </button>
          </>
        ) : (
          otherMenuItems.map((item, idx) => {
            const Icon = item.icon;
            if (item.onClick) {
              return (
                <button
                  key={idx}
                  onClick={item.onClick}
                  className={`flex items-center gap-4 px-6 py-4 hover:bg-zinc-800/40 font-medium text-[16px] transition-colors text-left w-full ${
                    item.danger ? "text-red-500 hover:bg-red-500/5" : "text-white"
                  }`}
                >
                  <Icon className={`size-6 ${item.danger ? "text-red-500" : "text-zinc-400"}`} strokeWidth={1.75} />
                  <span>{item.label}</span>
                </button>
              );
            }
            return null;
          })
        )}
      </div>
    </StandardDrawer>
  );
}
