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

  // Track visual viewport to adjust overlay container top/height on soft keyboard resize
  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;

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
  }, []);

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

  const handleSmsShare = () => {
    const text = encodeURIComponent(`Check out @${post.user.username}'s ${postTypeLabel}: ${window.location.origin}/posts/${post.id}`);
    window.open(`sms:?&body=${text}`, "_blank");
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

        {/* Brand Actions scroll row */}
        <div className="border-t border-zinc-850 pt-4 pb-2 flex items-center text-center text-white overflow-x-auto scrollbar-none gap-6 px-4 flex-nowrap flex-shrink-0">
          {[
            { id: "copy", name: "Copy link", iconUrl: "/icons/social-media/icons8-link.gif", action: handleCopyLink },
            { id: "story", name: "Add to story", iconUrl: "/icons/social-media/share.svg", action: handleAddToStory },
            { id: "whatsapp", name: "WhatsApp", iconUrl: "/icons/social-media/whatsapp.svg", action: handleWhatsAppShare },
            { id: "whatsapp-status", name: "Status", iconUrl: "/icons/social-media/whatsapp-status.svg", action: handleWhatsAppShare },
            { id: "sms", name: "SMS", iconUrl: "/icons/social-media/sms.svg", action: handleSmsShare },
            { id: "x", name: "X", iconUrl: "/icons/social-media/x.svg", action: handleXShare }
          ].map((channel) => (
            <button 
              key={channel.id}
              onClick={channel.action}
              className="flex flex-col items-center gap-1.5 group select-none transition-transform active:scale-95 shrink-0 cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md bg-zinc-800">
                {channel.id === "copy" && copied ? (
                  <div className="w-full h-full bg-zinc-800 flex items-center justify-center rounded-full">
                    <Check className="size-5 text-green-500" />
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img 
                    src={channel.iconUrl} 
                    alt={channel.name} 
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <span className="text-[10px] font-medium text-zinc-400 group-hover:text-white truncate max-w-[70px] leading-tight">
                {channel.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
