"use client";

import { useSession } from "@/app/(main)/SessionProvider";
import { useChat } from "@/app/(main)/ChatProvider";
import { Search, X, Loader2, Check } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { PostData } from "@/lib/types";
import { useToast } from "../ui/use-toast";

interface ShareDialogProps {
  post: PostData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ShareDialog({ post, open, onOpenChange }: ShareDialogProps) {
  const { user: loggedInUser } = useSession();
  const chatClient = useChat();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [contactedUsers, setContactedUsers] = useState<any[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [copied, setCopied] = useState(false);

  const [mounted, setMounted] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(typeof window !== "undefined" ? window.innerHeight : 0);
  const [viewportOffsetTop, setViewportOffsetTop] = useState(0);

  const isReel = post.attachments.some((att) => att.mediaType === "VIDEO");
  const postTypeLabel = isReel ? "Reel" : "post";
  const postTypeLabelCapitalized = isReel ? "Reel" : "Post";

  useEffect(() => {
    setMounted(true);
  }, []);

  // Track visual viewport to adjust overlay container top/height on soft keyboard resize
  useEffect(() => {
    if (typeof window === "undefined" || !open) return;

    const handleResize = () => {
      const vv = window.visualViewport;
      if (!vv) return;

      // Force scroll offset back to 0 to prevent browser scroll-shifting
      window.scrollTo(0, 0);

      setViewportHeight(vv.height);
      setViewportOffsetTop(vv.offsetTop || 0);
    };

    const handleWindowScroll = () => {
      if (window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }
    };

    window.addEventListener("scroll", handleWindowScroll, { passive: true });

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleResize);
      window.visualViewport.addEventListener("scroll", handleResize);
      handleResize();
    }

    return () => {
      window.removeEventListener("scroll", handleWindowScroll);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleResize);
        window.visualViewport.removeEventListener("scroll", handleResize);
      }
    };
  }, [open]);

  // Lock body scroll and add class when open
  useEffect(() => {
    if (!open) return;
    const originalBodyOverflow = document.body.style.overflow;
    const originalBodyPosition = document.body.style.position;
    const originalBodyHeight = document.body.style.height;
    const originalBodyWidth = document.body.style.width;

    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalHtmlPosition = document.documentElement.style.position;
    const originalHtmlHeight = document.documentElement.style.height;
    const originalHtmlWidth = document.documentElement.style.width;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.height = "100%";
    document.body.style.width = "100%";
    document.body.classList.add("share-dialog-active");

    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.position = "fixed";
    document.documentElement.style.height = "100%";
    document.documentElement.style.width = "100%";

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.position = originalBodyPosition;
      document.body.style.height = originalBodyHeight;
      document.body.style.width = originalBodyWidth;
      document.body.classList.remove("share-dialog-active");

      document.documentElement.style.overflow = originalHtmlOverflow;
      document.documentElement.style.position = originalHtmlPosition;
      document.documentElement.style.height = originalHtmlHeight;
      document.documentElement.style.width = originalHtmlWidth;
    };
  }, [open]);

  // Fetch active contacts when dialog is open
  useEffect(() => {
    if (!open || !chatClient || !loggedInUser) return;

    const fetchContacts = async () => {
      try {
        setLoadingContacts(true);
        const filter = { members: { $in: [loggedInUser.id] } };
        const list = await chatClient.queryChannels(filter, { last_message_at: -1 }, { limit: 12 });
        
        const users = list.map((c) => {
          const m = Object.values(c.state.members || {});
          return m.find((member) => member.user?.id !== loggedInUser.id)?.user;
        }).filter(Boolean);
        
        setContactedUsers(users);
      } catch (err) {
        console.error("Failed to fetch contacted users:", err);
      } finally {
        setLoadingContacts(false);
      }
    };
    
    fetchContacts();
  }, [open, chatClient, loggedInUser]);

  // Local filter for searched people in the share sheet
  const filteredContacts = useMemo(() => {
    if (!searchQuery) return contactedUsers;
    return contactedUsers.filter((u) => 
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      u.username?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [contactedUsers, searchQuery]);

  // Direct Message share deliverer
  const handleShareToUser = async (user: any) => {
    if (!chatClient || !loggedInUser) return;
    try {
      const channel = chatClient.channel("messaging", {
        members: [loggedInUser.id, user.id],
      });
      await channel.watch();
      
      const postUrl = `${window.location.origin}/posts/${post.id}`;
      await channel.sendMessage({
        text: `Sent a ${postTypeLabel}: ${postUrl}`,
        attachments: [
          {
            type: isReel ? "reel-share" : "post-share",
            postId: post.id,
            mediaUrl: post.attachments[0]?.url || "",
            username: post.user.username,
          }
        ]
      });
      
      toast({
        description: `Shared successfully to @${user.username}`,
      });
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to share post:", err);
      toast({
        variant: "destructive",
        description: "Failed to send message.",
      });
    }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/posts/${post.id}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast({
      description: `${postTypeLabelCapitalized} link copied to clipboard.`,
    });
    setTimeout(() => {
      setCopied(false);
      onOpenChange(false);
    }, 1500);
  };

  const handleAddToStory = async () => {
    try {
      toast({
        description: `${postTypeLabelCapitalized} added to your stories!`,
      });
      onOpenChange(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(`Check out @${post.user.username}'s ${postTypeLabel} on Next Social!`);
    const url = encodeURIComponent(`${window.location.origin}/posts/${post.id}`);
    window.open(`https://api.whatsapp.com/send?text=${text}%20${url}`, "_blank");
  };

  const handleXShare = () => {
    const text = encodeURIComponent(`Check out @${post.user.username}'s ${postTypeLabel} on Next Social!`);
    const url = encodeURIComponent(`${window.location.origin}/posts/${post.id}`);
    window.open(`https://x.com/intent/tweet?text=${text}&url=${url}`, "_blank");
  };

  const handleSharePlatform = (platform: string) => {
    const link = `${window.location.origin}/posts/${post.id}`;
    navigator.clipboard.writeText(link);
    
    const text = `Check out @${post.user.username}'s ${postTypeLabel} on Next Social!`;
    
    let targetUrl = "";
    if (platform === "twitter-x" || platform === "x") {
      targetUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`;
    } else if (platform === "linkedin") {
      targetUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`;
    } else if (platform === "whatsapp") {
      targetUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text + " " + link)}`;
    } else if (platform === "reddit") {
      targetUrl = `https://www.reddit.com/submit?url=${encodeURIComponent(link)}&title=${encodeURIComponent(text)}`;
    } else if (platform === "pinterest") {
      targetUrl = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(link)}&description=${encodeURIComponent(text)}`;
    } else if (platform === "github") {
      targetUrl = "https://github.com/";
    } else if (platform === "youtube") {
      targetUrl = "https://www.youtube.com/";
    } else if (platform === "discord") {
      targetUrl = "https://discord.com/";
    } else if (platform === "instagram") {
      targetUrl = "https://www.instagram.com/";
    } else if (platform === "tiktok") {
      targetUrl = "https://www.tiktok.com/";
    } else if (platform === "slack") {
      targetUrl = "https://slack.com/";
    } else if (platform === "figma") {
      targetUrl = "https://www.figma.com/";
    }

    toast({
      description: `Link copied! Opening ${platform.charAt(0).toUpperCase() + platform.slice(1)}...`,
    });

    if (targetUrl) {
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    }
    
    setTimeout(() => {
      onOpenChange(false);
    }, 800);
  };

  if (!open || !mounted) return null;

  return createPortal(
    <div 
      className="absolute inset-x-0 bg-black/60 flex flex-col justify-end pointer-events-auto shadow-2xl transition-all duration-75 ease-out z-[100]"
      style={{
        top: `${viewportOffsetTop}px`,
        height: `${viewportHeight}px`,
      }}
      onClick={() => onOpenChange(false)}
    >
      {/* Sheet Content Card */}
      <div 
        className="bg-[#121212] border-t border-zinc-800 rounded-t-3xl max-h-[80%] p-4.5 flex flex-col gap-4 animate-slide-up md:max-w-md md:mx-auto md:w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto" />

        {/* Header section */}
        <div className="relative px-5 py-3 border-b border-zinc-900 flex items-center justify-center flex-shrink-0">
          <span className="font-black text-white text-[17px] tracking-wide">Share</span>
          <button 
            onClick={() => onOpenChange(false)}
            className="absolute right-5 text-zinc-400 hover:text-white"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Search Input bar */}
        <div className="px-1 flex-shrink-0">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-550" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#262626] border border-transparent rounded-xl py-2 pl-10 pr-4 text-[14px] text-white placeholder:text-zinc-550 outline-none focus:border-zinc-700 transition-colors"
            />
          </div>
        </div>

        {/* Active Stream Contacts list grid (3-column layout) */}
        <div className="flex-grow overflow-y-auto max-h-[260px] min-h-[180px] scrollbar-none px-1">
          {loadingContacts ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-zinc-550" />
            </div>
          ) : filteredContacts.length > 0 ? (
            <div className="grid grid-cols-3 gap-y-6 gap-x-3 py-2 justify-items-center">
              {filteredContacts.map((contact: any) => {
                const isOnline = contact.online ?? (contact.id.charCodeAt(0) % 2 === 0);
                const firstLetter = (contact.name || contact.displayName || contact.username || "?")[0];

                return (
                  <button
                    key={contact.id}
                    onClick={() => handleShareToUser(contact)}
                    className="flex flex-col items-center text-center gap-1.5 group w-full max-w-[90px] transition-transform active:scale-95 cursor-pointer"
                  >
                    <div className="relative size-12 rounded-full bg-[#2a87d0] border border-zinc-800 shrink-0 shadow-md flex items-center justify-center">
                      {contact.image || contact.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={contact.image || contact.avatarUrl}
                          alt={contact.name || "avatar"}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <span className="font-bold text-[16px] uppercase text-white select-none">
                          {firstLetter}
                        </span>
                      )}
                      
                      {/* Active Online Status indicator green dot */}
                      {isOnline && (
                        <span className="absolute bottom-0 right-0 size-3 bg-green-500 border-2 border-[#121212] rounded-full shadow-sm" />
                      )}
                    </div>
                    
                    <span className="text-[11px] font-medium text-zinc-400 group-hover:text-white truncate w-full px-1">
                      {contact.name || contact.displayName || contact.username}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-xs text-zinc-550">
              No contacts found.
            </div>
          )}
        </div>

        {/* Uiverse Nebulous sharing dock */}
        <style dangerouslySetInnerHTML={{
          __html: `
            .nebulous-wrapper {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 100%;
              padding: 10px 0;
              background: transparent;
            }
            .dock-container {
              position: relative;
              padding: 10px;
              background: rgba(15, 15, 20, 0.4);
              backdrop-filter: blur(24px) saturate(180%);
              border-radius: 24px;
              border: 1px solid rgba(255, 255, 255, 0.08);
              display: flex;
              align-items: center;
              gap: 12px;
              box-shadow: 
                0 20px 50px -10px rgba(0, 0, 0, 0.5),
                inset 0 1px 1px rgba(255, 255, 255, 0.1);
              z-index: 10;
              animation: dockReveal 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
            }
            .dock-container::before {
              content: '';
              position: absolute;
              inset: -20px;
              background: radial-gradient(circle at 50% 50%, rgba(100, 100, 255, 0.15), transparent 70%);
              z-index: -1;
              filter: blur(20px);
              pointer-events: none;
            }
            .dock-item {
              position: relative;
              width: 44px;
              height: 44px;
              cursor: pointer;
              transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
              outline: none;
            }
            .icon-box {
              width: 100%;
              height: 100%;
              clip-path: url(#squircleClip);
              display: flex;
              align-items: center;
              justify-content: center;
              transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
              position: relative;
              overflow: hidden;
            }
            .icon-box::after {
              content: '';
              position: absolute;
              top: 0; left: 0; right: 0;
              height: 50%;
              background: linear-gradient(to bottom, rgba(255,255,255,0.15), transparent);
              pointer-events: none;
            }
            .dock-item:hover {
              transform: scale(1.2) translateY(-12px);
              z-index: 20;
            }
            .dock-item:hover .icon-box {
              box-shadow: 0 15px 30px -5px rgba(0, 0, 0, 0.5);
            }
            .icon-box svg {
              width: 22px;
              height: 22px;
              fill: white;
              filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
              transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            .dock-item:hover svg {
              transform: scale(1.1);
            }
            .tooltip {
              position: absolute;
              top: -45px;
              left: 50%;
              transform: translateX(-50%) translateY(10px);
              background: rgba(0, 0, 0, 0.8);
              color: white;
              padding: 4px 10px;
              border-radius: 8px;
              font-size: 11px;
              font-weight: 600;
              white-space: nowrap;
              opacity: 0;
              pointer-events: none;
              transition: all 0.3s ease;
              border: 1px solid rgba(255, 255, 255, 0.1);
              box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            }
            .dock-item:hover .tooltip {
              opacity: 1;
              transform: translateX(-50%) translateY(0);
            }
            .github { background: linear-gradient(135deg, #2b3137, #111); border: 1px solid rgba(255,255,255,0.1); }
            .linkedin { background: linear-gradient(135deg, #0077b5, #005582); border: 1px solid rgba(0, 119, 181, 0.5); }
            .youtube { background: linear-gradient(135deg, #ff0000, #cc0000); border: 1px solid rgba(255, 0, 0, 0.5); }
            .discord { background: linear-gradient(135deg, #5865f2, #4752c4); border: 1px solid rgba(88, 101, 242, 0.5); }
            .instagram { background: linear-gradient(135deg, #405de6, #5851db, #833ab4, #c13584, #e1306c, #fd1d1d); border: 1px solid rgba(193, 53, 132, 0.5); }
            .twitter-x { background: linear-gradient(135deg, #111, #333); border: 1px solid rgba(255,255,255,0.1); }
            .more-btn { 
              background: rgba(255, 255, 255, 0.05); 
              border: 1px dashed rgba(255, 255, 255, 0.2); 
              color: white;
            }
            .more-menu-trigger {
              position: relative;
            }
            .popover {
              position: absolute;
              bottom: 60px;
              right: 0;
              background: rgba(15, 15, 20, 0.95);
              backdrop-filter: blur(20px);
              border: 1px solid rgba(255, 255, 255, 0.08);
              border-radius: 20px;
              padding: 16px;
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 12px;
              visibility: hidden;
              opacity: 0;
              transform: translateY(20px) scale(0.95);
              transform-origin: bottom right;
              transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
              box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.6);
              z-index: 100;
            }
            .more-menu-trigger:focus-within .popover,
            .more-menu-trigger:hover .popover {
              visibility: visible;
              opacity: 1;
              transform: translateY(0) scale(1);
            }
            .popover-item {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 6px;
              text-decoration: none;
              transition: transform 0.2s ease;
              cursor: pointer;
            }
            .popover-item:hover {
              transform: translateY(-4px);
            }
            .popover-icon {
              width: 36px;
              height: 36px;
              clip-path: url(#squircleClip);
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .popover-icon svg {
              width: 18px;
              height: 18px;
              fill: white;
            }
            .popover-label {
              font-size: 10px;
              color: rgba(255, 255, 255, 0.6);
              font-weight: 500;
            }

            @keyframes dockReveal {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `
        }} />

        <svg width="0" height="0" style={{ position: "absolute" }}>
          <defs>
            <clipPath id="squircleClip" clipPathUnits="objectBoundingBox">
              <path d="M 0,0.5 C 0,0 0,0 0.5,0 S 1,0 1,0.5 1,1 0.5,1 0,1 0,0.5"></path>
            </clipPath>
          </defs>
        </svg>

        <div className="nebulous-wrapper">
          <div className="dock-container">
            {/* Copy Link */}
            <button className="dock-item" onClick={() => handleSharePlatform("copy")}>
              <span className="tooltip">Copy Link</span>
              <div className="icon-box copy-link">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="size-5.5 text-white">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                </svg>
              </div>
            </button>

            {/* LinkedIn */}
            <button className="dock-item" onClick={() => handleSharePlatform("linkedin")}>
              <span className="tooltip">LinkedIn</span>
              <div className="icon-box linkedin">
                <svg viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </div>
            </button>

            {/* Instagram */}
            <button className="dock-item" onClick={() => handleSharePlatform("instagram")}>
              <span className="tooltip">Instagram</span>
              <div className="icon-box instagram">
                <svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </div>
            </button>

            {/* TikTok */}
            <button className="dock-item" onClick={() => handleSharePlatform("tiktok")}>
              <span className="tooltip">TikTok</span>
              <div className="icon-box tiktok">
                <svg viewBox="0 0 24 24"><path d="M12.525.02c1.31-.032 2.612-.019 3.916-.01.12 2.3.824 4.562 2.49 6.273.1.1.2.19.3.28-.01 1.597-.013 3.193-.013 4.79-1.233-.08-2.42-.48-3.414-1.22-.303-.223-.585-.47-.84-.737v7.098c.046 3.256-1.503 6.478-4.606 7.724-3.067 1.258-6.857.545-9.15-1.848C-1.11 19.956-1.1 15.65 1.144 13.062c1.484-1.737 3.743-2.73 6.015-2.735v4.757c-1.306.015-2.61.6-3.393 1.636-1.012 1.34-1.1 3.243-.23 4.674 1.01 1.67 3.232 2.373 5.02 1.65 1.534-.622 2.417-2.222 2.4-3.864V.02z"/></svg>
              </div>
            </button>

            {/* X (Twitter) */}
            <button className="dock-item" onClick={() => handleSharePlatform("twitter-x")}>
              <span className="tooltip">X (Twitter)</span>
              <div className="icon-box twitter-x">
                <svg viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.134l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </div>
            </button>

            {/* More Menu Trigger */}
            <div className="more-menu-trigger">
              <div className="dock-item">
                <span className="tooltip">More Apps</span>
                <div className="icon-box more-btn">
                  <svg viewBox="0 0 24 24"><path d="M6 12c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm6-2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
                </div>
              </div>
              
              {/* Popover Menu */}
              <div className="popover">
                {/* GitHub */}
                <button className="popover-item" onClick={() => handleSharePlatform("github")}>
                  <div className="popover-icon github">
                    <svg viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                  </div>
                  <span className="popover-label">GitHub</span>
                </button>

                {/* YouTube */}
                <button className="popover-item" onClick={() => handleSharePlatform("youtube")}>
                  <div className="popover-icon youtube">
                    <svg viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                  </div>
                  <span className="popover-label">YouTube</span>
                </button>

                {/* Discord */}
                <button className="popover-item" onClick={() => handleSharePlatform("discord")}>
                  <div className="popover-icon discord">
                    <svg viewBox="0 0 24 24"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0189 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1568 2.4189Z"/></svg>
                  </div>
                  <span className="popover-label">Discord</span>
                </button>

                {/* Dribbble */}
                <button className="popover-item" onClick={() => handleSharePlatform("dribbble")}>
                  <div className="popover-icon dribbble">
                    <svg viewBox="0 0 24 24"><path d="M12 24C5.385 24 0 18.615 0 12S5.385 0 12 0s12 5.385 12 12-5.385 12-12 12zm10.12-10.358c-.35-.11-2.634-.812-5.33-.367.425 1.174.83 2.376 1.187 3.587 2.412-1.15 3.843-2.746 4.144-3.22zM16.1 18.51c-.342-1.138-.724-2.274-1.127-3.39-2.38.742-5.01 1.01-7.81.823.132.333.272.66.417.982 1.956 1.55 4.38 2.455 7.02 2.56.596-.32 1.1-.645 1.5-.975zm-11.08-2.3c2.61.166 5.023-.07 7.21-.723-.11-.274-.223-.55-.337-.827C7.625 13.1 4.54 12.637 1.586 13.06c.254 1.196.85 2.27 1.683 3.15zM1.086 10.74c2.812-.39 5.753-.02 8.41 1.258.15-.31.303-.62.463-.923-2.24-1.93-4.524-3.483-6.843-4.636-1.14 1.21-1.857 2.76-2.03 4.3zM8.3 3.96c2.18 1.05 4.33 2.5 6.44 4.33.917-1.42 1.693-2.9 2.316-4.425-1.503-.574-3.154-.895-4.887-.905-1.39 0-2.715.35-3.87.9zm10.457 1.22c-.61 1.41-1.373 2.78-2.25 4.1 2.36.435 4.8 1.48 6.4 2.87.106-.71.163-1.44.163-2.184 0-1.78-.51-3.44-1.4-4.845z"/></svg>
                  </div>
                  <span className="popover-label">Dribbble</span>
                </button>

                {/* Reddit */}
                <button className="popover-item" onClick={() => handleSharePlatform("reddit")}>
                  <div className="popover-icon reddit">
                    <svg viewBox="0 0 24 24"><path d="M24 11.779c0-1.459-1.192-2.645-2.657-2.645-.715 0-1.363.286-1.84.746-2.108-1.522-5.02-2.512-8.244-2.615l1.403-6.592 4.604.98c.032.774.673 1.396 1.46 1.396 1.511 0 2.454-1.44 2.454-2.645 0-1.459-1.192-2.645-2.657-2.645-.818 0-1.554.37-2.051.954l-5.185-1.104c-.172-.037-.344.067-.393.232l-1.638 7.701c-3.236.096-6.17 1.082-8.293 2.612-.478-.446-1.114-.72-1.796-.72-1.465 0-2.657 1.186-2.657 2.645 0 .973.53 1.817 1.314 2.278-.04.22-.061.445-.061.674 0 3.511 4.223 6.368 9.42 6.368s9.42-2.857 9.42-6.368c0-.214-.017-.425-.052-.633.82-.455 1.378-1.314 1.378-2.31zM6.621 13.916c0-.853.695-1.549 1.549-1.549s1.549.696 1.549 1.549-.695 1.549-1.549 1.549-1.549-.696-1.549-1.549zm9.585 4.397c-1.312 1.313-4.498 1.379-5.105 1.379-.606 0-3.792-.066-5.104-1.379-.166-.165-.166-.432 0-.597.166-.166.432-.166.597 0 1.054 1.054 3.738 1.157 4.507 1.157s3.454-.103 4.507-1.157c.165-.166.432-.166.597 0 .166.166.166.431 0 .597zm-.437-2.848c-.854 0-1.549-.696-1.549-1.549s.695-1.549 1.549-1.549c.853 0 1.549.696 1.549 1.549s-.696 1.549-1.549 1.549z"/></svg>
                  </div>
                  <span className="popover-label">Reddit</span>
                </button>

                {/* Pinterest */}
                <button className="popover-item" onClick={() => handleSharePlatform("pinterest")}>
                  <div className="popover-icon pinterest">
                    <svg viewBox="0 0 24 24"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.965 1.406-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.497 3.141 1.122.338 2.303.521 3.527.521 6.615 0 11.987-5.373 11.987-11.987C24.018 5.367 18.646 0 12.017 0z"/></svg>
                  </div>
                  <span className="popover-label">Pinterest</span>
                </button>

                {/* Slack */}
                <button className="popover-item" onClick={() => handleSharePlatform("slack")}>
                  <div className="popover-icon slack">
                    <svg viewBox="0 0 24 24"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52h-2.521zM8.834 6.313a2.527 2.527 0 0 1 2.521 2.521 2.527 2.527 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.958 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.527 2.527 0 0 1-2.52 2.521h-2.522v-2.521zM17.687 8.834a2.527 2.527 0 0 1-2.521 2.521 2.527 2.527 0 0 1-2.521-2.521V2.522A2.527 2.527 0 0 1 15.166 0a2.527 2.527 0 0 1 2.521 2.522v6.312zM15.166 18.958a2.528 2.528 0 0 1 2.521 2.522A2.528 2.528 0 0 1 15.166 24a2.527 2.527 0 0 1-2.52-2.52v-2.522h2.52zM15.166 17.687a2.527 2.527 0 0 1-2.52 2.521 2.527 2.527 0 0 1-2.521-2.521v-6.313a2.527 2.527 0 0 1 2.521-2.521 2.527 2.527 0 0 1 2.521 2.521v6.313z"/></svg>
                  </div>
                  <span className="popover-label">Slack</span>
                </button>

                {/* Figma */}
                <button className="popover-item" onClick={() => handleSharePlatform("figma")}>
                  <div className="popover-icon figma">
                    <svg viewBox="0 0 24 24"><path d="M12 0C8.688 0 6 2.688 6 6v3c0 3.312 2.688 6 6 6s6-2.688 6-6-2.688-6-6-6zm-6 12c-3.312 0-6 2.688-6 6s2.688 6 6 6 6-2.688 6-6-2.688-6-6-6zm12 0c-3.312 0-6 2.688-6 6s2.688 6 6 6 6-2.688 6-6-2.688-6-6-6z"/></svg>
                  </div>
                  <span className="popover-label">Figma</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
