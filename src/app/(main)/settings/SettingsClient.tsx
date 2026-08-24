"use client";

import { useSession } from "../SessionProvider";
import { logout } from "@/app/(auth)/actions";
import { useToast } from "@/components/ui/use-toast";
import UserAvatar from "@/components/UserAvatar";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  User, 
  MessageCircle, 
  Lock, 
  Bell, 
  Database, 
  Camera, 
  ChevronRight, 
  LogOut, 
  HelpCircle,
  Activity,
  Sparkles,
  Check
} from "lucide-react";

interface SettingRowProps {
  icon: React.ReactNode;
  bgClass: string;
  title: string;
  description: string;
  onClick?: () => void;
}

function SettingRow({ icon, bgClass, title, description, onClick }: SettingRowProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between p-4 hover:bg-secondary/40 active:bg-secondary/60 transition-colors select-none text-start border-0"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div className={`flex size-9 shrink-0 items-center justify-center rounded-full text-white ${bgClass}`}>
          {icon}
        </div>
        <div className="flex flex-col justify-center min-w-0">
          <span className="text-[15px] font-bold text-foreground leading-tight">{title}</span>
          <span className="text-xs text-muted-foreground mt-0.5 truncate">{description}</span>
        </div>
      </div>
      <ChevronRight className="size-4 text-muted-foreground shrink-0" />
    </button>
  );
}

export default function SettingsClient() {
  const { user: loggedInUser } = useSession();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const section = searchParams.get("section");

  const handleLogout = async () => {
    try {
      toast({
        description: "Logging out...",
      });
      await logout();
    } catch (e) {
      toast({
        variant: "destructive",
        description: "Failed to logout. Please try again.",
      });
    }
  };

  return (
    <div className="w-full max-w-[600px] mx-auto min-h-screen bg-background text-foreground pb-12">
      {/* Page Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 bg-background/80 backdrop-blur-md border-b border-border select-none">
        <h1 id="settings-heading" className="text-[20px] font-bold tracking-tight">Settings</h1>
        <div className="w-6 h-6" /> {/* Spacer */}
      </header>

      <div className="p-4 space-y-6">
        {/* Header Area */}
        <div className="flex flex-col items-center p-6 bg-card border border-border rounded-2xl shadow-sm">
          <div className="relative size-24 mb-4 select-none">
            <UserAvatar avatarUrl={loggedInUser?.avatarUrl} size={96} className="size-24 rounded-full border border-border" />
            <button 
              onClick={() => toast({ description: "Profile photo upload coming soon!" })}
              className="absolute bottom-0 right-0 p-1.5 rounded-full bg-primary text-white border-2 border-background hover:scale-105 active:scale-95 transition-transform"
              title="Change Profile Photo"
            >
              <Camera className="size-4" />
            </button>
          </div>
          <h2 className="text-xl font-extrabold uppercase tracking-wide text-white">
            {loggedInUser?.displayName || loggedInUser?.username}
          </h2>
          <p className="text-xs text-muted-foreground mt-1 select-all">
            @{loggedInUser?.username} • +1 (555) 019-2834
          </p>
        </div>

        {/* Cartly Pro Premium Plan Details */}
        {section === "premium" && (
          <div className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-transparent border border-amber-500/30 shadow-md select-none animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="absolute top-0 right-0 p-3 opacity-25">
              <Sparkles className="size-16 text-yellow-500 animate-pulse" />
            </div>
            
            <div className="flex items-center gap-2 mb-3">
              <span className="flex items-center justify-center p-1 bg-amber-500/20 text-yellow-500 rounded-lg">
                <Sparkles className="size-5" />
              </span>
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-yellow-500">Cartly Pro Active</h3>
            </div>
            
            <p className="text-sm text-foreground/90 font-semibold leading-relaxed">
              Congratulations! You are currently on the <span className="font-extrabold text-yellow-500">Cartly Pro Plan</span>. Enjoy your premium benefits:
            </p>
            
            <ul className="mt-4 space-y-2.5 text-xs text-muted-foreground font-semibold">
              <li className="flex items-center gap-2">
                <Check className="size-4 text-yellow-500 shrink-0" /> Advanced performance analytics
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-4 text-yellow-500 shrink-0" /> Up to 5x higher reach on stories and feed
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-4 text-yellow-500 shrink-0" /> Dynamic custom theme panel settings
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-4 text-yellow-500 shrink-0" /> Gold verification badge next to your username
              </li>
            </ul>
          </div>
        )}

        {/* Option Groups */}
        <div className="space-y-4">
          <h3 className="text-[11px] uppercase font-bold tracking-wider text-muted-foreground px-1">Settings Categories</h3>
          
          <div className="rounded-2xl bg-card border border-border overflow-hidden divide-y divide-border/60">
            <SettingRow 
              icon={<Activity className="size-5" />}
              bgClass="bg-violet-600"
              title="Your Activity"
              description="Manage your collections, saved media, and replies"
              onClick={() => router.push("/settings/activity")}
            />

            <SettingRow 
              icon={<User className="size-5" />}
              bgClass="bg-blue-500"
              title="Account"
              description="Change phone number, username, or profile bio"
              onClick={() => toast({ description: "Account settings coming soon!" })}
            />

            <SettingRow 
              icon={<MessageCircle className="size-5" />}
              bgClass="bg-emerald-500"
              title="Chat Settings"
              description="Theme wallpaper, text size, stickers, and animations"
              onClick={() => toast({ description: "Chat settings coming soon!" })}
            />

            <SettingRow 
              icon={<Lock className="size-5" />}
              bgClass="bg-slate-500"
              title="Privacy & Security"
              description="Double-factor authentication, active login sessions, blocked users"
              onClick={() => toast({ description: "Privacy settings coming soon!" })}
            />

            <SettingRow 
              icon={<Bell className="size-5" />}
              bgClass="bg-red-500"
              title="Notifications & Sounds"
              description="Message alerts, channel sounds, mute options"
              onClick={() => toast({ description: "Notification settings coming soon!" })}
            />

            <SettingRow 
              icon={<Database className="size-5" />}
              bgClass="bg-amber-500"
              title="Data and Storage"
              description="Network stats, clear local cache, auto-media downloads"
              onClick={() => toast({ description: "Data and storage settings coming soon!" })}
            />
          </div>
        </div>

        {/* Support & Actions */}
        <div className="space-y-4">
          <h3 className="text-[11px] uppercase font-bold tracking-wider text-muted-foreground px-1">Support & Actions</h3>
          
          <div className="rounded-2xl bg-card border border-border overflow-hidden divide-y divide-border/60">
            {/* Help/Support */}
            <SettingRow 
              icon={<HelpCircle className="size-5" />}
              bgClass="bg-indigo-500"
              title="Help & Support"
              description="FAQ, contact support team, report issues"
              onClick={() => toast({ description: "Support desk is coming soon!" })}
            />

            {/* Logout */}
            <SettingRow 
              icon={<LogOut className="size-5" />}
              bgClass="bg-red-600"
              title="Logout"
              description="Sign out of this device"
              onClick={handleLogout}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
