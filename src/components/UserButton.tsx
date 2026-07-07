"use client";

import { logout } from "@/app/(auth)/actions";
import { useSession } from "@/app/(main)/SessionProvider";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { Check, LogOutIcon, Monitor, Moon, Sun, UserIcon } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import UserAvatar from "./UserAvatar";

interface UserButtonProps {
  className?: string;
}

export default function UserButton({ className }: UserButtonProps) {
  const { user } = useSession();

  const { theme, setTheme } = useTheme();

  const queryClient = useQueryClient();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={cn("flex-none rounded-full", className)}>
          <UserAvatar avatarUrl={user.avatarUrl} size={40} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Logged in as @{user.username}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <Link href={`/users/${user.username}`}>
          <DropdownMenuItem>
            <UserIcon className="mr-2 size-4" />
            Profile
          </DropdownMenuItem>
        </Link>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Monitor className="mr-2 size-4" />
            Theme
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => setTheme("system")}>
                <Monitor className="mr-2 size-4" strokeWidth={2} />
                System Default
                {theme === "system" && <Check className="ms-2 size-4 text-primary" strokeWidth={3} />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("light")}>
                <Sun className="mr-2 size-4 text-amber-500" strokeWidth={2} />
                Classic Light
                {theme === "light" && <Check className="ms-2 size-4 text-primary" strokeWidth={3} />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("rose-cloud")}>
                <Sun className="mr-2 size-4 text-pink-400" strokeWidth={2} />
                Rose Cloud
                {theme === "rose-cloud" && <Check className="ms-2 size-4 text-primary" strokeWidth={3} />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("morning-mist")}>
                <Sun className="mr-2 size-4 text-sky-400" strokeWidth={2} />
                Morning Mist
                {theme === "morning-mist" && <Check className="ms-2 size-4 text-primary" strokeWidth={3} />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("twilight-haze")}>
                <Sun className="mr-2 size-4 text-indigo-400" strokeWidth={2} />
                Twilight Haze
                {theme === "twilight-haze" && <Check className="ms-2 size-4 text-primary" strokeWidth={3} />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("sage-dew")}>
                <Sun className="mr-2 size-4 text-emerald-400" strokeWidth={2} />
                Sage Dew
                {theme === "sage-dew" && <Check className="ms-2 size-4 text-primary" strokeWidth={3} />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("peach-whisper")}>
                <Sun className="mr-2 size-4 text-orange-400" strokeWidth={2} />
                Peach Whisper
                {theme === "peach-whisper" && <Check className="ms-2 size-4 text-primary" strokeWidth={3} />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                <Moon className="mr-2 size-4 text-indigo-500" strokeWidth={2} />
                Dark Mode
                {theme === "dark" && <Check className="ms-2 size-4 text-primary" strokeWidth={3} />}
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            queryClient.clear();
            logout();
          }}
        >
          <LogOutIcon className="mr-2 size-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
