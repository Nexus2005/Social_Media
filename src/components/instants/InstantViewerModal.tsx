"use client";

import React, { useState, useEffect } from "react";
import { X, Send, Heart, Smile, ThumbsUp, Laugh, Angry, Frown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useChat } from "@/app/(main)/ChatProvider";
import Image from "next/image";

interface Instant {
  id: string;
  mediaUrl: string;
  audience: string;
  createdAt: string;
}

interface InstantViewerModalProps {
  open: boolean;
  onClose: () => void;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  } | null;
  instants: Instant[];
  loggedInUserId: string;
  onViewRegistered?: () => void;
}

export default function InstantViewerModal({
  open,
  onClose,
  user,
  instants,
  loggedInUserId,
  onViewRegistered,
}: InstantViewerModalProps) {
  const chatClient = useChat();
  const { toast } = useToast();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [viewedIds, setViewedIds] = useState<string[]>([]);

  const currentInstant = instants[currentIndex];

  useEffect(() => {
    if (open) {
      setCurrentIndex(0);
      setImageLoaded(false);
    }
  }, [open, instants]);

  if (!open || !user || !currentInstant) return null;

  // Immediate view registration onLoad
  const handleImageLoad = async () => {
    setImageLoaded(true);
    const instantId = currentInstant.id;
    
    // Skip if already view registered in this session
    if (viewedIds.includes(instantId)) return;
    
    try {
      setViewedIds((prev) => [...prev, instantId]);
      
      const res = await fetch(`/api/instants/${instantId}/view`, {
        method: "POST",
      });

      if (!res.ok) throw new Error("Failed to register view");
      
      // Notify parent list to update its states immediately
      if (onViewRegistered) {
        onViewRegistered();
      }
    } catch (err) {
      console.error("View registration error:", err);
    }
  };

  // Send DM Reply via Stream Chat Client with Custom Attachments
  const sendDMMessage = async (text: string, emojiReaction?: string) => {
    if (!chatClient) return;
    setSendingReply(true);

    try {
      // 1. Resolve or create DM channel
      const channel = chatClient.channel("messaging", {
        members: [loggedInUserId, user.id],
      });
      await channel.watch();

      // 2. Build custom context attachment
      const attachment = {
        type: "instant-reply",
        image_url: currentInstant.mediaUrl,
        thumb_url: currentInstant.mediaUrl,
        title: "Reply to Instant Snap",
        text: emojiReaction ? `Reacted ${emojiReaction} to snap` : `Replied to snap`,
        instantId: currentInstant.id,
      };

      // 3. Send message with custom properties
      await channel.sendMessage({
        text: text,
        attachments: [attachment],
        custom: {
          replyToInstantId: currentInstant.id,
          replyToInstantUrl: currentInstant.mediaUrl,
          isInstantInteraction: true,
        },
      });

      toast({
        description: emojiReaction ? "Reaction sent!" : "Reply sent to DM!",
      });

      if (!emojiReaction) {
        setReplyText("");
      }
    } catch (err) {
      console.error("DM send error:", err);
      toast({
        variant: "destructive",
        description: "Failed to deliver message.",
      });
    } finally {
      setSendingReply(false);
    }
  };

  const handleSendTextReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || sendingReply) return;
    sendDMMessage(replyText.trim());
  };

  const handleEmojiReact = (emoji: string) => {
    if (sendingReply) return;
    sendDMMessage(`Reacted ${emoji}`, emoji);
  };

  const handleNext = () => {
    if (currentIndex < instants.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setImageLoaded(false);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 select-none p-4">
      <div className="relative w-full max-w-lg h-full sm:h-[90vh] sm:max-h-[700px] flex flex-col justify-between bg-zinc-950 sm:rounded-3xl border border-zinc-900 overflow-hidden text-white">
        
        {/* Top bar & progress tracks */}
        <div className="absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/80 to-transparent z-10">
          {/* Segmented Progress bar */}
          {instants.length > 1 && (
            <div className="flex gap-1.5 w-full mb-3.5">
              {instants.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`h-[3px] flex-1 rounded-full ${
                    idx === currentIndex
                      ? "bg-white"
                      : idx < currentIndex
                      ? "bg-white/40"
                      : "bg-white/10"
                  }`} 
                />
              ))}
            </div>
          )}

          {/* Sender Header info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative size-10 rounded-full overflow-hidden bg-zinc-900 border border-zinc-800">
                {user.avatarUrl ? (
                  <Image src={user.avatarUrl} alt={user.displayName} fill sizes="40px" className="object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center font-bold text-sm uppercase">
                    {user.username[0]}
                  </span>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold leading-none">{user.displayName}</span>
                <span className="text-[10px] text-zinc-400">
                  {currentInstant.audience === "CLOSE_FRIENDS" ? "Close Friends" : "Friends"} snap
                </span>
              </div>
            </div>
            
            <button 
              onClick={onClose}
              className="p-1.5 rounded-full bg-zinc-900/60 hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Middle viewer photo */}
        <div 
          onClick={handleNext}
          className="flex-1 bg-zinc-950 flex items-center justify-center relative cursor-pointer"
        >
          <img
            src={currentInstant.mediaUrl}
            alt="Instant Snap"
            onLoad={handleImageLoad}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              imageLoaded ? "opacity-100" : "opacity-0"
            }`}
          />
          
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">
              <svg className="size-8 animate-spin text-zinc-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          )}

          {/* Touch navigation guidance */}
          {imageLoaded && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/40 px-3 py-1 rounded-full text-[10px] text-zinc-400 font-medium">
              Tap photo to advance
            </div>
          )}
        </div>

        {/* Bottom Reaction and Reply DM bar */}
        <div className="p-4 bg-gradient-to-t from-black/90 via-black/80 to-transparent flex flex-col gap-3 shrink-0">
          
          {/* Reaction Bar */}
          <div className="flex items-center justify-around py-1 bg-zinc-900/40 rounded-2xl border border-zinc-800/30">
            {[
              { emoji: "❤️", icon: <Heart className="size-4.5 text-red-500 fill-red-500" /> },
              { emoji: "👍", icon: <ThumbsUp className="size-4.5 text-blue-400 fill-blue-400" /> },
              { emoji: "🔥", icon: <Smile className="size-4.5 text-orange-500 fill-orange-500" /> },
              { emoji: "😂", icon: <Laugh className="size-4.5 text-yellow-400 fill-yellow-400" /> },
              { emoji: "😢", icon: <Frown className="size-4.5 text-zinc-400 fill-zinc-400" /> },
            ].map(({ emoji, icon }) => (
              <button
                key={emoji}
                onClick={() => handleEmojiReact(emoji)}
                className="p-2.5 rounded-xl hover:bg-zinc-800/60 active:scale-90 transition-all"
                title={`React ${emoji}`}
              >
                {icon}
              </button>
            ))}
          </div>

          {/* DM reply text input */}
          <form onSubmit={handleSendTextReply} className="flex gap-2">
            <input
              type="text"
              placeholder="Send message..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="flex-1 h-11 bg-zinc-900/90 rounded-xl px-4 border border-zinc-800/80 text-sm focus:outline-none focus:border-zinc-700 text-white placeholder-zinc-500"
              disabled={sendingReply}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!replyText.trim() || sendingReply}
              className="size-11 bg-[#7c3aed] text-white rounded-xl hover:bg-[#6d28d9] shrink-0"
            >
              <Send className="size-4.5" />
            </Button>
          </form>

        </div>

      </div>
    </div>
  );
}
