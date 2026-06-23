"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Channel } from "stream-chat";
import { useChat } from "../ChatProvider";
import ChatSidebar from "./ChatSidebar";
import ChatChannel from "./ChatChannel";
import MediaViewer, { MediaViewerState } from "./MediaViewer";
import ChatProfile from "./ChatProfile";
import kyInstance from "@/lib/ky";
import { useSession } from "../SessionProvider";

// Custom UI State Context for Telegram Android Parity
interface ChatUIContextType {
  activeChannel: Channel | null;
  setActiveChannel: (channel: Channel | null) => void;
  mobileView: "list" | "chat";
  setMobileView: (view: "list" | "chat") => void;
  
  // Database Preferences (Pins, Archives, Mutes, Wallpapers)
  pins: string[];
  archives: string[];
  mutes: { channelId: string; expiresAt: string | null }[];
  wallpapers: { channelId: string; wallpaper: string }[];
  togglePreference: (action: "pin" | "unpin" | "archive" | "unarchive" | "mute" | "unmute" | "wallpaper", channelId: string, extra?: any) => Promise<void>;
  
  // Overlays
  mediaViewerState: MediaViewerState | null;
  setMediaViewerState: (state: MediaViewerState | null) => void;
  profileOverlayChannel: Channel | null;
  setProfileOverlayChannel: (channel: Channel | null) => void;
}

const ChatUIContext = createContext<ChatUIContextType | null>(null);

export function useChatUI() {
  const context = useContext(ChatUIContext);
  if (!context) {
    throw new Error("useChatUI must be used within a ChatUIProvider");
  }
  return context;
}

export default function Chat() {
  const chatClient = useChat();
  const { user: loggedInUser } = useSession();

  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  
  // Preferences State
  const [pins, setPins] = useState<string[]>([]);
  const [archives, setArchives] = useState<string[]>([]);
  const [mutes, setMutes] = useState<{ channelId: string; expiresAt: string | null }[]>([]);
  const [wallpapers, setWallpapers] = useState<{ channelId: string; wallpaper: string }[]>([]);
  
  // Overlays
  const [mediaViewerState, setMediaViewerState] = useState<MediaViewerState | null>(null);
  const [profileOverlayChannel, setProfileOverlayChannel] = useState<Channel | null>(null);

  // Load preferences from PostgreSQL
  useEffect(() => {
    if (!chatClient) return;
    
    const fetchPrefs = async () => {
      try {
        const data = await kyInstance.get("/api/messages/preferences").json<any>();
        setPins(data.pins || []);
        setArchives(data.archives || []);
        setMutes(data.mutes || []);
        setWallpapers(data.settings || []);
      } catch (error) {
        console.error("Failed to fetch chat preferences:", error);
      }
    };
    
    fetchPrefs();
  }, [chatClient]);

  // Handle auto-starting chat with a specific user via query parameter (?userId=...)
  useEffect(() => {
    if (!chatClient || !loggedInUser) return;

    const urlParams = new URLSearchParams(window.location.search);
    const targetUserId = urlParams.get("userId");
    
    if (targetUserId) {
      const initiateChat = async () => {
        try {
          const channel = chatClient.channel("messaging", {
            members: [loggedInUser.id, targetUserId],
          });
          await channel.create();
          
          setActiveChannel(channel);
          setMobileView("chat");
          
          // Clear query parameter from URL without page reload
          const newUrl = window.location.pathname;
          window.history.replaceState({}, "", newUrl);
        } catch (error) {
          console.error("Failed to auto-start chat with user:", error);
        }
      };
      
      initiateChat();
    }
  }, [chatClient, loggedInUser, setActiveChannel]);

  // Toggle Preference Helper
  const togglePreference = async (
    action: "pin" | "unpin" | "archive" | "unarchive" | "mute" | "unmute" | "wallpaper",
    channelId: string,
    extra?: any
  ) => {
    try {
      // Optimistic updates
      if (action === "pin") {
        setPins((p) => [...new Set([...p, channelId])]);
      } else if (action === "unpin") {
        setPins((p) => p.filter((id) => id !== channelId));
      } else if (action === "archive") {
        setArchives((a) => [...new Set([...a, channelId])]);
      } else if (action === "unarchive") {
        setArchives((a) => a.filter((id) => id !== channelId));
      } else if (action === "mute") {
        setMutes((m) => [...m.filter((item) => item.channelId !== channelId), { channelId, expiresAt: extra?.expiresAt || null }]);
      } else if (action === "unmute") {
        setMutes((m) => m.filter((item) => item.channelId !== channelId));
      } else if (action === "wallpaper") {
        setWallpapers((w) => [...w.filter((item) => item.channelId !== channelId), { channelId, wallpaper: extra?.wallpaper }]);
      }

      await kyInstance.post("/api/messages/preferences", {
        json: { action, channelId, expiresAt: extra?.expiresAt, wallpaper: extra?.wallpaper },
      });
    } catch (error) {
      console.error(`Failed to toggle preference ${action}:`, error);
    }
  };

  if (!chatClient) {
    return (
      <div className="flex h-[calc(100vh-80px)] w-full items-center justify-center">
        <Loader2 className="size-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <ChatUIContext.Provider
      value={{
        activeChannel,
        setActiveChannel,
        mobileView,
        setMobileView,
        pins,
        archives,
        mutes,
        wallpapers,
        togglePreference,
        mediaViewerState,
        setMediaViewerState,
        profileOverlayChannel,
        setProfileOverlayChannel,
      }}
    >
      <main className="relative flex h-[calc(100vh-96px)] w-full overflow-hidden rounded-2xl border bg-background shadow-lg md:h-[calc(100vh-120px)]">
        {/* Chat List Sidebar (Split Pane on Desktop, Screen on Mobile) */}
        <div
          className={`h-full w-full border-e md:flex md:w-80 lg:w-96 ${
            mobileView === "list" ? "flex" : "hidden"
          }`}
        >
          <ChatSidebar />
        </div>

        {/* Chat Screen (Split Pane on Desktop, Screen on Mobile) */}
        <div
          className={`h-full flex-1 ${
            mobileView === "chat" ? "flex" : "hidden"
          } md:flex`}
        >
          {activeChannel ? (
            <ChatChannel />
          ) : (
            <div className="hidden h-full flex-1 flex-col items-center justify-center bg-muted/20 md:flex">
              <div className="rounded-full bg-muted p-4 text-muted-foreground">
                Select a chat to start messaging
              </div>
            </div>
          )}
        </div>

        {/* Fullscreen Overlay Media Viewer */}
        {mediaViewerState && (
          <MediaViewer
            state={mediaViewerState}
            onClose={() => setMediaViewerState(null)}
          />
        )}

        {/* Slide-out Chat Profile Details Overlay */}
        {profileOverlayChannel && (
          <ChatProfile
            channel={profileOverlayChannel}
            onClose={() => setProfileOverlayChannel(null)}
          />
        )}
      </main>
    </ChatUIContext.Provider>
  );
}
