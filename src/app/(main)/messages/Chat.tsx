"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Channel } from "stream-chat";
import { useChat } from "../ChatProvider";
import ChatSidebar from "./ChatSidebar";
import ChatChannel from "./ChatChannel";
import MediaViewer, { MediaViewerState } from "./MediaViewer";
import ChatProfile from "./ChatProfile";
import { AnimatePresence } from "framer-motion";
import kyInstance from "@/lib/ky";
import { useSession } from "../SessionProvider";

// Custom UI State Context for Telegram Android Parity
interface ChatUIContextType {
  activeChannel: Channel | null;
  setActiveChannel: (channel: Channel | null) => void;
  mobileView: "list" | "chat";
  setMobileView: (view: "list" | "chat") => void;
  
  // Database Preferences (Pins, Archives, Mutes, ConversationSettings)
  pins: string[];
  archives: string[];
  mutes: { channelId: string; expiresAt: string | null }[];
  conversationSettings: { channelId: string; wallpaper: string | null; lastClearedAt: string | null }[];
  togglePreference: (action: "pin" | "unpin" | "archive" | "unarchive" | "mute" | "unmute" | "wallpaper" | "clear_history", channelId: string, extra?: any) => Promise<void>;
  
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
  const [conversationSettings, setConversationSettings] = useState<{ channelId: string; wallpaper: string | null; lastClearedAt: string | null }[]>([]);
  
  // Overlays
  const [mediaViewerState, setMediaViewerState] = useState<MediaViewerState | null>(null);
  const [profileOverlayChannel, setProfileOverlayChannel] = useState<Channel | null>(null);

  // Responsive and Keyboard / Visual Viewport Resizing
  const [isMobile, setIsMobile] = useState(false);
  const [viewportHeight, setViewportHeight] = useState<string>("100%");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const visualViewport = window.visualViewport;
    if (!visualViewport) return;

    const handleResize = () => {
      setViewportHeight(`${visualViewport.height}px`);
      document.documentElement.style.setProperty("--visual-viewport-height", `${visualViewport.height}px`);
    };

    visualViewport.addEventListener("resize", handleResize);
    visualViewport.addEventListener("scroll", handleResize);
    
    handleResize();

    return () => {
      visualViewport.removeEventListener("resize", handleResize);
      visualViewport.removeEventListener("scroll", handleResize);
    };
  }, []);

  // Prevent window scroll offset when chat is active
  useEffect(() => {
    const handleScroll = () => {
      if (document.body.classList.contains("chat-active")) {
        if (window.scrollY !== 0) {
          window.scrollTo(0, 0);
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Load preferences from PostgreSQL
  useEffect(() => {
    if (!chatClient) return;
    
    const fetchPrefs = async () => {
      try {
        const data = await kyInstance.get("/api/messages/preferences").json<any>();
        setPins(data.pins || []);
        setArchives(data.archives || []);
        setMutes(data.mutes || []);
        setConversationSettings(data.settings || []);
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
          await channel.watch();
          
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

  // Manage "chat-active" class on body for mobile styling adjustments (hiding bottom footer)
  useEffect(() => {
    const isChatActive = activeChannel !== null && mobileView === "chat";
    if (isChatActive) {
      document.body.classList.add("chat-active");
    } else {
      document.body.classList.remove("chat-active");
    }
    return () => {
      document.body.classList.remove("chat-active");
    };
  }, [activeChannel, mobileView]);

  // Push history state when profile overlay opens to support smooth back navigation
  useEffect(() => {
    if (profileOverlayChannel) {
      window.history.pushState({ chatProfile: true }, "");
      const handlePopState = () => {
        setProfileOverlayChannel(null);
      };
      window.addEventListener("popstate", handlePopState);
      return () => {
        window.removeEventListener("popstate", handlePopState);
      };
    }
  }, [profileOverlayChannel]);

  // Toggle Preference Helper
  const togglePreference = async (
    action: "pin" | "unpin" | "archive" | "unarchive" | "mute" | "unmute" | "wallpaper" | "clear_history",
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
        setConversationSettings((w) => [...w.filter((item) => item.channelId !== channelId), { channelId, wallpaper: extra?.wallpaper, lastClearedAt: w.find((x) => x.channelId === channelId)?.lastClearedAt || null }]);
      } else if (action === "clear_history") {
        const now = new Date().toISOString();
        setConversationSettings((w) => [...w.filter((item) => item.channelId !== channelId), { channelId, wallpaper: w.find((x) => x.channelId === channelId)?.wallpaper || null, lastClearedAt: now }]);
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
        conversationSettings,
        togglePreference,
        mediaViewerState,
        setMediaViewerState,
        profileOverlayChannel,
        setProfileOverlayChannel,
      }}
    >
      <main
        style={{
          height: isMobile && mobileView === "chat" && activeChannel
            ? viewportHeight
            : isMobile
            ? "calc(100dvh - 56px)"
            : undefined
        }}
        className="chat-main-container relative flex h-[calc(100dvh-56px)] w-full overflow-hidden border-none bg-[#121212] md:h-screen"
      >
        {/* Chat List Sidebar (Split Pane on Desktop, Screen on Mobile) */}
        <div
          className={`h-full w-full border-e md:flex md:w-80 lg:w-96 transition-transform duration-300 ease-[cubic-bezier(0.1,0.76,0.55,0.94)] ${
            mobileView === "chat" ? "translate-x-[-20%] md:translate-x-0" : "translate-x-0"
          }`}
        >
          <ChatSidebar />
        </div>

        {/* Chat Screen (Split Pane on Desktop, Screen on Mobile with horizontal slide-in) */}
        <div
          className={`h-full flex-1 relative overflow-hidden transition-transform duration-300 ease-[cubic-bezier(0.1,0.76,0.55,0.94)] bg-[#121212] shadow-[-10px_0_30px_rgba(0,0,0,0.6)] md:shadow-none absolute inset-0 z-40 md:relative md:inset-auto md:z-0 ${
            mobileView === "chat"
              ? "translate-x-0 pointer-events-auto"
              : "translate-x-full md:translate-x-0 pointer-events-none md:pointer-events-auto"
          } ${activeChannel ? "flex" : "hidden md:flex"}`}
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

          {/* Slide-out Chat Profile Details Overlay (inside chat area) */}
          <AnimatePresence>
            {profileOverlayChannel && (
              <ChatProfile
                channel={profileOverlayChannel}
                onClose={() => setProfileOverlayChannel(null)}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Fullscreen Overlay Media Viewer */}
        {mediaViewerState && (
          <MediaViewer
            state={mediaViewerState}
            onClose={() => setMediaViewerState(null)}
          />
        )}
      </main>
    </ChatUIContext.Provider>
  );
}
