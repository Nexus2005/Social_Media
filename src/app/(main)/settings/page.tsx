import { Metadata } from "next";
import Link from "next/link";
import {
  Bookmark,
  Bell,
  Lock,
  Palette,
  ChevronRight,
  Shield,
  UserCheck,
  HelpCircle,
  Laptop
} from "lucide-react";
import SettingsClient from "./SettingsClient";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your Cartly account settings, appearance preferences, privacy, and notifications.",
};

export default function SettingsPage() {
  return (
    <div className="w-full max-w-[600px] mx-auto min-h-screen bg-background text-foreground pb-12">
      {/* Page Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 bg-background/80 backdrop-blur-md border-b border-border select-none">
        <h1 id="settings-heading" className="text-[20px] font-bold tracking-tight">Settings</h1>
        <div className="w-6 h-6" /> {/* Spacer */}
      </header>

      <div className="p-4 space-y-6">
        {/* Meta-style Accounts Center Card */}
        <div className="p-4 rounded-2xl bg-card border border-border space-y-3 shadow-sm select-none">
          <div className="flex items-center gap-2">
            <span className="text-[12px] uppercase font-bold tracking-wider text-muted-foreground">Meta</span>
            <span className="text-[12px] font-semibold text-primary">Accounts Center</span>
          </div>
          <p className="text-[13px] text-muted-foreground leading-snug">
            Manage your connected experiences and account settings across Cartly.
          </p>
          <div className="space-y-2.5 pt-1.5">
            <div className="flex items-center gap-2.5 text-[14px] text-muted-foreground">
              <Shield className="size-4 shrink-0 text-zinc-500" />
              <span>Password and security</span>
            </div>
            <div className="flex items-center gap-2.5 text-[14px] text-muted-foreground">
              <UserCheck className="size-4 shrink-0 text-zinc-500" />
              <span>Personal details</span>
            </div>
          </div>
          <button 
            id="btn-accounts-center"
            className="w-full mt-2 py-2 text-center rounded-[8px] bg-secondary hover:bg-muted text-white text-[13px] font-semibold transition-colors border border-border/10"
          >
            See more in Accounts Center
          </button>
        </div>

        {/* Settings Groups */}
        <section className="space-y-4">
          <h2 className="text-[12px] uppercase font-bold tracking-wider text-muted-foreground px-1">How you use Cartly</h2>
          
          <div className="rounded-2xl bg-card border border-border overflow-hidden divide-y divide-border">
            {/* Saved Items */}
            <Link 
              id="link-saved-settings"
              href="/bookmarks"
              className="flex items-center justify-between p-4 hover:bg-secondary/40 transition-colors select-none group"
            >
              <div className="flex items-center gap-3">
                <Bookmark className="size-5 text-foreground group-hover:scale-105 transition-transform" strokeWidth={2} />
                <span className="text-[15px] font-medium">Saved</span>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>

            {/* Notifications */}
            <div 
              id="item-notifications-settings"
              className="flex items-center justify-between p-4 hover:bg-secondary/40 transition-colors select-none group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Bell className="size-5 text-foreground group-hover:scale-105 transition-transform" strokeWidth={2} />
                <span className="text-[15px] font-medium">Notifications</span>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-[12px] uppercase font-bold tracking-wider text-muted-foreground px-1">Who can see your content</h2>
          
          <div className="rounded-2xl bg-card border border-border overflow-hidden divide-y divide-border">
            {/* Account Privacy */}
            <div 
              id="item-privacy-settings"
              className="flex items-center justify-between p-4 hover:bg-secondary/40 transition-colors select-none group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Lock className="size-5 text-foreground group-hover:scale-105 transition-transform" strokeWidth={2} />
                <span className="text-[15px] font-medium">Account privacy</span>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-[12px] uppercase font-bold tracking-wider text-muted-foreground px-1">App preferences</h2>
          
          <div className="rounded-2xl bg-card border border-border overflow-hidden divide-y divide-border">
            {/* Appearance settings */}
            <Link 
              id="link-appearance-settings"
              href="/settings/appearance"
              className="flex items-center justify-between p-4 hover:bg-secondary/40 transition-colors select-none group"
            >
              <div className="flex items-center gap-3">
                <Palette className="size-5 text-foreground group-hover:scale-105 transition-transform" strokeWidth={2} />
                <span className="text-[15px] font-medium">Appearance</span>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          </div>
        </section>

        {/* Client-side Actions (Logout) */}
        <SettingsClient />
      </div>
    </div>
  );
}
