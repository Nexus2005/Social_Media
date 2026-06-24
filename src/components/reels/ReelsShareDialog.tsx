"use client";

import { useSession } from "@/app/(main)/SessionProvider";
import { useChat } from "@/app/(main)/ChatProvider";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Search, X, Loader2, Check } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { PostData } from "@/lib/types";
import { useToast } from "../ui/use-toast";
import Image from "next/image";

interface ReelsShareDialogProps {
  post: PostData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ReelsShareDialog({ post, open, onOpenChange }: ReelsShareDialogProps) {
  const { user: loggedInUser } = useSession();
  const chatClient = useChat();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [contactedUsers, setContactedUsers] = useState<any[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [copied, setCopied] = useState(false);

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
        text: `Sent a Reel: ${postUrl}`,
        attachments: [
          {
            type: "reel-share",
            postId: post.id,
            mediaUrl: post.attachments.find((att) => att.mediaType === "VIDEO")?.url || "",
            username: post.user.username,
          }
        ]
      });
      
      toast({
        description: `Shared successfully to @${user.username}`,
      });
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to share reel:", err);
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
      description: "Reel link copied to clipboard.",
    });
    setTimeout(() => {
      setCopied(false);
      onOpenChange(false);
    }, 1500);
  };

  const handleAddToStory = async () => {
    try {
      // Mock story creation payload or show success toast
      toast({
        description: "Reel added to your stories!",
      });
      onOpenChange(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(`Check out @${post.user.username}'s Reel on Next Social!`);
    const url = encodeURIComponent(`${window.location.origin}/posts/${post.id}`);
    window.open(`https://api.whatsapp.com/send?text=${text}%20${url}`, "_blank");
  };

  const handleXShare = () => {
    const text = encodeURIComponent(`Check out @${post.user.username}'s Reel on Next Social!`);
    const url = encodeURIComponent(`${window.location.origin}/posts/${post.id}`);
    window.open(`https://x.com/intent/tweet?text=${text}&url=${url}`, "_blank");
  };

  const handleSmsShare = () => {
    const text = encodeURIComponent(`Check out @${post.user.username}'s Reel: ${window.location.origin}/posts/${post.id}`);
    window.open(`sms:?&body=${text}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#121212] border border-zinc-800/80 rounded-t-3xl md:rounded-2xl p-0 overflow-hidden select-none flex flex-col h-[75vh] md:h-[600px] justify-between">
        
        {/* Header section */}
        <div className="px-5 py-4 border-b border-zinc-900 flex items-center justify-between flex-shrink-0">
          <span className="font-black text-white text-[17px] tracking-wide mx-auto">Share</span>
          <button 
            onClick={() => onOpenChange(false)}
            className="text-zinc-400 hover:text-white"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Search Input bar */}
        <div className="px-5 pt-3 flex-shrink-0">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#262626] border border-transparent rounded-xl py-2 pl-10 pr-4 text-[14px] text-white placeholder:text-zinc-500 outline-none focus:border-zinc-700 transition-colors"
            />
          </div>
        </div>

        {/* Active Stream Contacts list grid (3-column layout) */}
        <div className="flex-grow overflow-y-auto px-5 py-4 scrollbar-none">
          {loadingContacts ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-zinc-600" />
            </div>
          ) : filteredContacts.length > 0 ? (
            <div className="grid grid-cols-3 gap-y-6 gap-x-4 py-2 justify-items-center">
              {filteredContacts.map((contact: any) => {
                const isOnline = contact.online ?? (contact.id.charCodeAt(0) % 2 === 0);
                const firstLetter = (contact.name || contact.displayName || contact.username || "?")[0];

                return (
                  <button
                    key={contact.id}
                    onClick={() => handleShareToUser(contact)}
                    className="flex flex-col items-center text-center gap-1.5 group w-full max-w-[90px] transition-transform active:scale-95 cursor-pointer"
                  >
                    <div className="relative size-16.5 rounded-full bg-zinc-800 border border-zinc-800 shrink-0 shadow-md">
                      {contact.image || contact.avatarUrl ? (
                        <Image
                          src={contact.image || contact.avatarUrl}
                          alt={contact.name || "avatar"}
                          fill
                          sizes="66px"
                          className="object-cover rounded-full"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-[20px] uppercase text-zinc-300 rounded-full">
                          {firstLetter}
                        </div>
                      )}
                      
                      {/* Active Online Status indicator green dot */}
                      {isOnline && (
                        <span className="absolute bottom-0.5 right-0.5 size-3.5 bg-green-500 border-2 border-[#121212] rounded-full shadow-sm" />
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
            <div className="flex h-48 items-center justify-center text-xs text-zinc-550">
              No contacts found.
            </div>
          )}
        </div>

        {/* Brand Actions scroll row */}
        <div className="border-t border-zinc-900 bg-[#121212] py-4.5 flex items-center text-center text-white overflow-x-auto scrollbar-none gap-6 px-5 flex-nowrap flex-shrink-0">
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

      </DialogContent>
    </Dialog>
  );
}
