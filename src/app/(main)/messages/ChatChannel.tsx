"use client";

import Script from "next/script";

import { createPortal } from "react-dom";
import React, { useRef, useState, useEffect, useMemo } from "react";
import { ArrowLeft, MoreVertical, MoreHorizontal, Paperclip, Smile, Mic, MicOff, VideoOff, PhoneOff, Send, X, Pin, MessageSquare, Volume2, VolumeX, AlertCircle, Loader2, ShoppingBag, Copy, Edit2, Share2, Trash2, Film, BookOpen, Layers, User, Image as ImageIcon, FileText, Check, CornerUpLeft, Star, Phone, Plus, Video, Play, CheckCheck, Globe, Bell, BellOff, UserPlus, LogOut, Search, Users, List, Heart, Key, Link, Shield, Lock } from "lucide-react";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { motion, AnimatePresence } from "framer-motion";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Channel, MessageResponse } from "stream-chat";
import { useChatUI } from "./Chat";
import { useSession } from "../SessionProvider";
import UserAvatar from "@/components/UserAvatar";
import { outgoingMessageQueue, QueueMessage } from "@/lib/message-queue";
import { draftStorage } from "@/lib/draft-storage";
import { useQueryClient } from "@tanstack/react-query";
import AttachmentPicker from "./AttachmentPicker";
import StickerPicker from "./StickerPicker";
import { useChat } from "../ChatProvider";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

// Helper to calculate message bubble corner rounding rules
const getBubbleCorners = (isOutgoing: boolean, pos: "single" | "first" | "middle" | "last") => {
  if (isOutgoing) {
    switch (pos) {
      case "single":
      case "last":
        return "rounded-[18px] rounded-br-[4px]";
      case "first":
      case "middle":
        return "rounded-[18px]";
    }
  } else {
    switch (pos) {
      case "single":
      case "last":
        return "rounded-[18px] rounded-bl-[4px]";
      case "first":
      case "middle":
        return "rounded-[18px]";
    }
  }
};

const renderQuotedAttachmentPreview = (msg: any) => {
  if (!msg.attachments || msg.attachments.length === 0) return null;
  const firstAttachment = msg.attachments[0];
  const type = firstAttachment.type;
  if (type === "image") {
    return (
      <span className="flex items-center gap-1 text-[11px] text-primary italic">
        <ImageIcon className="size-3 shrink-0" />
        <span>Photo</span>
      </span>
    );
  }
  if (type === "video") {
    return (
      <span className="flex items-center gap-1 text-[11px] text-primary italic">
        <Film className="size-3 shrink-0" />
        <span>Video</span>
      </span>
    );
  }
  if (type === "sticker" || type === "giphy") {
    return (
      <span className="flex items-center gap-1 text-[11px] text-primary italic">
        <Smile className="size-3 shrink-0" />
        <span>{type === "giphy" ? "GIF" : "Sticker"}</span>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[11px] text-primary italic">
      <FileText className="size-3 shrink-0" />
      <span>File</span>
    </span>
  );
};

const reactionMap: Record<string, string> = {
  "👍": "like",
  "❤️": "love",
  "😂": "haha",
  "😮": "wow",
  "😢": "sad",
  "🙏": "pray"
};

const reactionEmojiMap: Record<string, string> = {
  "like": "👍",
  "love": "❤️",
  "haha": "😂",
  "wow": "😮",
  "sad": "😢",
  "pray": "🙏"
};

interface MessageBubbleContainerProps {
  message: MessageResponse;
  virtualRow: any;
  rowVirtualizer: any;
  loggedInUser: any;
  channel: Channel;
  selectedMessage: MessageResponse | null;
  setSelectedMessage: (msg: MessageResponse | null) => void;
  replyMessage: MessageResponse | null;
  setReplyMessage: (msg: MessageResponse | null) => void;
  highlightedMessageId: string | null;
  scrollToMessage: (id: string) => void;
  setMediaViewerState: (state: any) => void;
  handleToggleReaction: (msgId: string, emoji: string) => void;
  isSelectionMode: boolean;
  selectedMessageIds: string[];
  toggleMessageSelection: (id: string) => void;
  handlePinMessage: (msg: any) => void;
  handleDeleteMessage: (id: string) => void;
  setEditingMessage: (msg: any) => void;
  setInputText: (txt: string) => void;
  textareaRef: any;
  setShowStickerPicker: (val: boolean) => void;
  position: "single" | "first" | "middle" | "last";
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  otherMember: any;
  setForwardingMessage: (msg: MessageResponse | null) => void;
  fetchForwardChannels: () => void;
  setShowForwardDialog: (val: boolean) => void;
  setMoreOptionsMessage: (msg: MessageResponse | null) => void;
  setToastMessage: (msg: string | null) => void;
}

const MessageBubbleContainer = React.memo(({
  message,
  virtualRow,
  rowVirtualizer,
  loggedInUser,
  channel,
  selectedMessage,
  setSelectedMessage,
  replyMessage,
  setReplyMessage,
  highlightedMessageId,
  scrollToMessage,
  setMediaViewerState,
  handleToggleReaction,
  isSelectionMode,
  selectedMessageIds,
  toggleMessageSelection,
  handlePinMessage,
  handleDeleteMessage,
  setEditingMessage,
  setInputText,
  textareaRef,
  setShowStickerPicker,
  position,
  isFirstInGroup,
  isLastInGroup,
  otherMember,
  setForwardingMessage,
  fetchForwardChannels,
  setShowForwardDialog,
  setMoreOptionsMessage,
  setToastMessage,
}: MessageBubbleContainerProps) => {
  const isOutgoing = message.user?.id === loggedInUser.id || (message as any).senderId === loggedInUser.id;
  const isQueue = "status" in message;
  const isSelected = selectedMessage?.id === message.id;
  const isSelectedMulti = selectedMessageIds.includes(message.id);
  const isStoryReply = message.attachments?.some((a: any) => a.type === "story-reply");
  const isProductShare = message.attachments?.some((a: any) => a.type === "share-card" && a.shareType === "PRODUCT");

  const [gridMediaViewerPhotos, setGridMediaViewerPhotos] = useState<string[] | null>(null);

  useEffect(() => {
    if (gridMediaViewerPhotos) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [gridMediaViewerPhotos]);

  const imageAttachments = useMemo(() => {
    return message.attachments?.filter((a: any) => a.type === "image") || [];
  }, [message.attachments]);

  const hasMultipleImages = imageAttachments.length > 1;

  const isImageOrVideo = message.attachments?.some(
    (a: any) => ["image", "video", "sticker", "giphy"].includes(a.type || "")
  );

  const isAttachmentOnly = isImageOrVideo && !message.text;

  const [dragX, setDragX] = useState(0);
  const longPressTimeout = useRef<NodeJS.Timeout | null>(null);

  const startLongPress = () => {
    longPressTimeout.current = setTimeout(() => {
      setSelectedMessage(message);
      if (navigator.vibrate) {
        navigator.vibrate(15);
      }
    }, 500);
  };

  const cancelLongPress = () => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }
  };

  return (
    <div
      data-index={virtualRow.index}
      ref={rowVirtualizer.measureElement}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        transform: `translateY(${virtualRow.start}px)`,
      }}
      className={`py-0.5 flex ${isOutgoing ? "justify-end" : "justify-start"} items-end gap-2 transition-all duration-200 ${
        isSelectionMode ? "bg-primary/5 px-2 rounded-xl" : ""
      } ${isSelected ? "z-30 relative" : "z-0"}`}
    >
      {/* Swipe-to-Reply Arrow Indicator (WhatsApp style) */}
      {!isSelectionMode && !selectedMessage && (
        <div 
          className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center pl-4 pointer-events-none transition-opacity duration-150"
          style={{ opacity: dragX > 10 ? 1 : 0 }}
        >
          <motion.div 
            style={{ 
              x: dragX > 60 ? 60 : dragX,
              rotate: dragX * 2,
              scale: Math.min(dragX / 50, 1.2) 
            }}
            className={`p-2 rounded-full transition-colors duration-200 ${
              dragX > 60 ? 'bg-[#00a884] text-white' : 'bg-muted text-muted-foreground'
            }`}
          >
            <CornerUpLeft className="size-4" />
          </motion.div>
        </div>
      )}

      {isSelectionMode && (
        <div className="flex items-center justify-center pr-1 shrink-0 h-8 self-center">
          <input 
            type="checkbox"
            checked={isSelectedMulti}
            onChange={() => toggleMessageSelection(message.id)}
            className="size-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
          />
        </div>
      )}

      {!isOutgoing && channel.data?.isGroup === true && (
        <div className="flex shrink-0 w-8 items-end justify-center mb-1">
          {isLastInGroup ? (
            <UserAvatar 
              avatarUrl={message.user?.image as string | undefined} 
              size={32} 
              className="size-8 border rounded-full shrink-0" 
            />
          ) : (
            <div className="size-8 w-8 shrink-0" />
          )}
        </div>
      )}

      {/* For outgoing message: render circular paper-plane forward button before message bubble */}
      {isOutgoing && isAttachmentOnly && (
        <div className="flex items-center gap-1.5 self-center mr-1.5 shrink-0">
          {/* Three Dots Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedMessage(selectedMessage?.id === message.id ? null : message);
            }}
            className="size-9 rounded-full bg-[#1c1c1e] hover:bg-zinc-800/80 flex items-center justify-center text-zinc-300 active:scale-95 transition-all shrink-0 shadow border border-zinc-800/40"
            title="Options"
          >
            <MoreHorizontal className="size-4.5" />
          </button>

          {/* Reply Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setReplyMessage(message);
            }}
            className="size-9 rounded-full bg-[#1c1c1e] hover:bg-zinc-800/80 flex items-center justify-center text-zinc-300 active:scale-95 transition-all shrink-0 shadow border border-zinc-800/40"
            title="Reply"
          >
            <CornerUpLeft className="size-4" />
          </button>

          {/* Smiley Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedMessage(selectedMessage?.id === message.id ? null : message);
            }}
            className="size-9 rounded-full bg-[#1c1c1e] hover:bg-zinc-800/80 flex items-center justify-center text-zinc-300 active:scale-95 transition-all shrink-0 shadow border border-zinc-800/40"
            title="React"
          >
            <Smile className="size-4" />
          </button>

          {/* Forward Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setForwardingMessage(message);
              fetchForwardChannels();
              setShowForwardDialog(true);
            }}
            className="size-9 rounded-full bg-[#1c1c1e] hover:bg-zinc-800/80 flex items-center justify-center text-zinc-300 active:scale-95 transition-all shrink-0 shadow border border-zinc-800/40"
            title="Forward"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4 -rotate-45 translate-x-0.5">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      )}

      <motion.div
        onClick={(e) => {
          if (isSelectionMode) {
            e.preventDefault();
            e.stopPropagation();
            toggleMessageSelection(message.id);
          } else if (selectedMessage) {
            e.preventDefault();
            e.stopPropagation();
            setSelectedMessage(null);
          } else {
            setSelectedMessage(message);
          }
        }}
        onPointerDown={isSelectionMode || selectedMessage ? undefined : startLongPress}
        onPointerUp={cancelLongPress}
        onPointerLeave={cancelLongPress}
        drag={isSelectionMode || selectedMessage ? false : "x"}
        dragConstraints={{ left: 0, right: 120 }}
        dragElastic={0.4}
        dragSnapToOrigin
        onDrag={(event, info) => {
          setDragX(info.offset.x);
        }}
        onDragEnd={(event, info) => {
          setDragX(0);
          if (info.offset.x > 60) {
            setReplyMessage(message);
            if (navigator.vibrate) {
              navigator.vibrate(10);
            }
          }
        }}
        className={cn(
          "relative max-w-[75%] cursor-pointer select-none transition-all duration-300",
          isProductShare || isAttachmentOnly
            ? "p-0 rounded-[18px] overflow-hidden bg-transparent border-none shadow-none"
            : cn(
                "px-3.5 py-2 text-[15px] leading-[20px] shadow-sm",
                isOutgoing
                  ? isStoryReply
                    ? "bg-gradient-to-tr from-pink-500/95 to-purple-600/95 text-white"
                    : "bg-[#2a87d0] text-white"
                  : isStoryReply
                  ? "bg-zinc-900/60 dark:bg-zinc-950/65 border border-zinc-800/50 text-white"
                  : "bg-[#1c1c1e] border border-transparent text-zinc-100",
                message.id === highlightedMessageId ? "ring-2 ring-zinc-500/30" : "",
                isSelected ? "ring-2 ring-zinc-500/20" : "",
                getBubbleCorners(isOutgoing, position)
              ),
          isFirstInGroup ? "mt-3" : "mt-0.5",
          message.id === highlightedMessageId || isSelected ? "scale-[1.03]" : "",
          message.latest_reactions && message.latest_reactions.length > 0 ? "mb-2 pb-3.5" : ""
        )}
      >
        {/* Sender Name if Group chat */}
        {!isOutgoing && isFirstInGroup && channel.data?.isGroup === true && (
          <span className="text-[10px] font-bold text-primary block mb-0.5">
            {message.user?.name}
          </span>
        )}

        {/* Quoted message reply preview */}
        {message.quoted_message && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              scrollToMessage(message.quoted_message!.id);
            }}
            className="border-s-2 border-primary bg-zinc-100/50 dark:bg-zinc-800/50 px-2 py-1 rounded text-xs mb-1.5 cursor-pointer flex flex-col text-start select-none"
          >
            <span className="font-bold text-primary text-[11px] truncate">
              {message.quoted_message.user?.name || "Reply"}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5 max-w-full truncate">
              {renderQuotedAttachmentPreview(message.quoted_message)}
              {message.quoted_message.text && (
                <span className="text-muted-foreground text-[11px] truncate">
                  {message.quoted_message.text}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Share Card Payload Rendering */}
        {message.attachments?.some((a: any) => a.type === "share-card") ? (
          <ShareCardAttachment
            attachment={message.attachments.find((a: any) => a.type === "share-card")}
            message={message}
            isOutgoing={isOutgoing}
            isQueue={isQueue}
            otherMember={otherMember}
            channel={channel}
          />
        ) : null}

        {/* Story Reply Rendering */}
        {message.attachments?.some((a: any) => a.type === "story-reply") ? (
          <StoryReplyAttachment
            attachment={message.attachments.find((a: any) => a.type === "story-reply")}
          />
        ) : null}

        {/* Sticker Rendering */}
        {message.attachments?.some((a: any) => a.type === "sticker") ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={message.attachments.find((a: any) => a.type === "sticker")?.image_url}
            alt="Sticker"
            className="size-20 object-contain my-1 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setGridMediaViewerPhotos([message.attachments!.find((a: any) => a.type === "sticker")!.image_url!]);
            }}
          />
        ) : null}

        {/* Giphy Rendering */}
        {message.attachments?.some((a: any) => a.type === "giphy") ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={message.attachments.find((a: any) => a.type === "giphy")?.image_url}
            alt="GIF"
            className={cn(
              "max-h-64 rounded-xl object-cover my-1 cursor-pointer",
              isAttachmentOnly ? "border-none" : "border-[0.5px] border-zinc-800/40"
            )}
            onClick={(e) => {
              e.stopPropagation();
              setGridMediaViewerPhotos([message.attachments!.find((a: any) => a.type === "giphy")!.image_url!]);
            }}
          />
        ) : null}

        {/* Standard Image Rendering (Single or Multiple Stack) */}
        {message.attachments?.some((a: any) => a.type === "image") ? (
          hasMultipleImages ? (
            <div className="flex flex-col cursor-pointer select-none" onClick={(e) => {
              e.stopPropagation();
              setGridMediaViewerPhotos(imageAttachments.map((a: any) => a.asset_url || a.image_url).filter(Boolean));
            }}>
              <span className={cn(
                "text-[12px] text-zinc-400 font-semibold mb-1.5 block select-none px-1",
                isOutgoing ? "text-right" : "text-left"
              )}>
                {isOutgoing ? "You sent" : `${message.user?.name || "Sent"}`} {imageAttachments.length} photos
              </span>
              {/* Stack of Cards container */}
              <div className="relative w-48 h-60 mt-1 select-none group/stack">
                {imageAttachments.slice(0, 4).map((att: any, idx: number) => {
                  const rotations = ["rotate-[-3deg]", "rotate-[4deg]", "rotate-[-6deg]", "rotate-[2deg]"];
                  const hoverRotations = [
                    "group-hover/stack:rotate-[-6deg] group-hover/stack:translate-x-[-8px] group-hover/stack:translate-y-[-4px]",
                    "group-hover/stack:rotate-[8deg] group-hover/stack:translate-x-[8px] group-hover/stack:translate-y-[-6px]",
                    "group-hover/stack:rotate-[-10deg] group-hover/stack:translate-x-[-14px] group-hover/stack:translate-y-[-10px]",
                    "group-hover/stack:rotate-[4deg] group-hover/stack:translate-x-[4px] group-hover/stack:translate-y-[-2px]"
                  ];
                  const translates = ["translate-x-0 translate-y-0", "translate-x-2 translate-y-[-6px]", "translate-x-[-4px] translate-y-[-12px]", "translate-x-[6px] translate-y-[-18px]"];
                  const opacities = ["opacity-100", "opacity-90", "opacity-80", "opacity-60"];
                  const zIndexes = ["z-30", "z-25", "z-20", "z-15"];
                  
                  return (
                    <div
                      key={idx}
                      className={cn(
                        "absolute inset-0 rounded-2xl overflow-hidden shadow-lg border border-zinc-800/10 transition-all duration-350 ease-out origin-bottom",
                        rotations[idx % 4],
                        translates[idx % 4],
                        opacities[idx % 4],
                        zIndexes[idx % 4],
                        hoverRotations[idx % 4]
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={att.asset_url || att.image_url}
                        alt={`stack-${idx}`}
                        className="w-full h-full object-cover select-none pointer-events-none"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={message.attachments.find((a: any) => a.type === "image")?.asset_url}
              alt="Image Attachment"
              className={cn(
                "max-h-64 rounded-xl object-cover my-1 cursor-pointer",
                isAttachmentOnly ? "border-none" : "border-[0.5px] border-zinc-800/40"
              )}
              onClick={(e) => {
                e.stopPropagation();
                setGridMediaViewerPhotos([message.attachments!.find((a: any) => a.type === "image")!.asset_url!]);
              }}
            />
          )
        ) : null}

        {/* Standard Video Rendering */}
        {message.attachments?.some((a: any) => a.type === "video") ? (
          <div 
            className={cn(
              "relative max-h-64 rounded-xl overflow-hidden my-1 cursor-pointer bg-zinc-950/80 group/video shrink-0",
              isAttachmentOnly ? "border-none" : "border-[0.5px] border-zinc-800/40"
            )}
            onClick={(e) => {
              e.stopPropagation();
              setGridMediaViewerPhotos([message.attachments!.find((a: any) => a.type === "video")!.asset_url!]);
            }}
          >
            <video
              src={message.attachments.find((a: any) => a.type === "video")?.asset_url}
              className="max-h-64 object-cover rounded-xl"
              preload="metadata"
              playsInline
              muted
            />
            {/* Play Overlay Icon */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover/video:bg-black/30 transition-colors">
              <div className="size-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white shadow-lg transform group-hover/video:scale-105 transition-transform">
                <Play className="size-6 fill-white ml-0.5" />
              </div>
            </div>
          </div>
        ) : null}

        {/* Message Text content */}
        {message.text && (
          <p className="whitespace-pre-wrap break-words pr-14 text-[16px] leading-[22px]">{message.text}</p>
        )}

        {/* Floating Metadata (Time and status checks) */}
        {!isProductShare && (
          <div className={cn(
            "absolute flex items-center gap-1 text-[9px] shrink-0 pointer-events-none select-none",
            isAttachmentOnly
              ? "bottom-2 right-2 bg-black/45 backdrop-blur-[2px] text-white px-1.5 py-0.5 rounded-full text-[10px] z-30"
              : "bottom-1 right-2 opacity-75 text-current"
          )}>
            <span>
              {new Date(message.created_at || (message as any).createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            
            {/* Read status checks for outgoing bubbles */}
            {isOutgoing && (
              isQueue ? (
                (message as any).status === "PENDING" || (message as any).status === "SENDING" ? (
                  <span className="size-2 rounded-full border border-current border-t-transparent animate-spin shrink-0" />
                ) : (
                  <AlertCircle className="size-3 text-destructive shrink-0" />
                )
              ) : (
                channel.state.read[otherMember?.id || ""]?.last_read && 
                new Date(channel.state.read[otherMember?.id || ""]?.last_read || "").getTime() >= new Date(message.created_at || "").getTime() ? (
                  <span className="text-[#38bdf8] font-bold">✓✓</span>
                ) : (
                  <span className={cn(isAttachmentOnly ? "text-white" : "opacity-75 text-white")}>✓</span>
                )
              )
            )}
          </div>
        )}

        {/* Reactions Display Panel (Overlapping bottom capsule) */}
        {message.latest_reactions && message.latest_reactions.length > 0 && (
          <div className={`absolute -bottom-3 ${isOutgoing ? "left-3" : "right-3"} z-10 flex items-center gap-1 bg-[#1c1c1e] border border-zinc-800 rounded-full px-2 py-0.5 text-xs shadow-md`}>
            {Object.entries(
              message.latest_reactions.reduce((acc: Record<string, number>, r: any) => {
                acc[r.type] = (acc[r.type] || 0) + 1;
                return acc;
              }, {})
            ).map(([type, count]: any) => {
              const ownReacted = message.own_reactions?.some((r: any) => r.type === type);
              return (
                <button
                  key={type}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleReaction(message.id, type);
                  }}
                  className={`flex items-center gap-0.5 hover:scale-110 active:scale-95 transition-transform ${
                    ownReacted ? "text-primary" : "text-zinc-400"
                  }`}
                >
                  <span>{reactionEmojiMap[type] || type}</span>
                  {count > 1 && <span className="text-[10px] font-semibold">{count}</span>}
                </button>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* For incoming message: render circular paper-plane forward button after message bubble */}
      {!isOutgoing && isAttachmentOnly && (
        <div className="flex items-center gap-1.5 self-center ml-1.5 shrink-0">
          {/* Forward Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setForwardingMessage(message);
              fetchForwardChannels();
              setShowForwardDialog(true);
            }}
            className="size-9 rounded-full bg-[#1c1c1e] hover:bg-zinc-800/80 flex items-center justify-center text-zinc-300 active:scale-95 transition-all shrink-0 shadow border border-zinc-800/40"
            title="Forward"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4 -rotate-45 translate-x-0.5">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>

          {/* Smiley Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedMessage(selectedMessage?.id === message.id ? null : message);
            }}
            className="size-9 rounded-full bg-[#1c1c1e] hover:bg-zinc-800/80 flex items-center justify-center text-zinc-300 active:scale-95 transition-all shrink-0 shadow border border-zinc-800/40"
            title="React"
          >
            <Smile className="size-4" />
          </button>

          {/* Reply Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setReplyMessage(message);
            }}
            className="size-9 rounded-full bg-[#1c1c1e] hover:bg-zinc-800/80 flex items-center justify-center text-zinc-300 active:scale-95 transition-all shrink-0 shadow border border-zinc-800/40"
            title="Reply"
          >
            <CornerUpLeft className="size-4" />
          </button>

          {/* Three Dots Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedMessage(selectedMessage?.id === message.id ? null : message);
            }}
            className="size-9 rounded-full bg-[#1c1c1e] hover:bg-zinc-800/80 flex items-center justify-center text-zinc-300 active:scale-95 transition-all shrink-0 shadow border border-zinc-800/40"
            title="Options"
          >
            <MoreHorizontal className="size-4.5" />
          </button>
        </div>
      )}

      {/* Floating Reaction Capsule + Adjacent Options Menu above/next to the bubble when selected */}
      <AnimatePresence>
        {isSelected && (
          <>
            {/* Reactions Bar: Center-positioned above the bubble, styled as #1e232b pill */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10, x: "-50%" }}
              animate={{ opacity: 1, scale: 1, y: 0, x: "-50%" }}
              exit={{ opacity: 0, scale: 0.9, y: 10, x: "-50%" }}
              className="absolute bottom-full mb-3.5 left-1/2 z-50 bg-[#1e232b] border border-zinc-800 rounded-full px-4 py-2 shadow-2xl flex flex-col items-center gap-1 shrink-0 min-w-[270px]"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-[10px] text-zinc-400 font-medium select-none">Tap and hold to super react</span>
              <div className="flex items-center gap-3">
                {["❤️", "😂", "😮", "😢", "😡", "👍"].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      handleToggleReaction(message.id, emoji);
                      setSelectedMessage(null);
                    }}
                    className="text-2xl hover:scale-125 active:scale-95 transition-all drop-shadow-md cursor-pointer shrink-0"
                  >
                    {emoji}
                  </button>
                ))}
                {/* Circular plus picker button */}
                <button
                  onClick={() => {
                    setShowStickerPicker(true);
                    setSelectedMessage(null);
                  }}
                  className="size-7 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 font-semibold text-[14px] cursor-pointer shrink-0"
                >
                  +
                </button>
              </div>
            </motion.div>

            {/* Options List popover menu adjacent to the bubble */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 5 }}
              className={cn(
                "absolute z-50 w-48 rounded-2xl bg-[#1c222b] border border-[#262626] shadow-2xl p-1.5 flex flex-col gap-0.5 text-[14px] text-white",
                isOutgoing ? "right-0 top-full mt-2" : "left-0 top-full mt-2"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  setReplyMessage(message);
                  setSelectedMessage(null);
                }}
                className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-zinc-800/60 text-start w-full"
              >
                <CornerUpLeft className="size-4 text-zinc-400" />
                <span>Reply</span>
              </button>

              <button
                onClick={() => {
                  setShowStickerPicker(true);
                  setSelectedMessage(null);
                }}
                className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-zinc-800/60 text-start w-full"
              >
                <Smile className="size-4 text-zinc-400" />
                <span>Add sticker</span>
              </button>

              <button
                onClick={() => {
                  setForwardingMessage(message);
                  fetchForwardChannels();
                  setShowForwardDialog(true);
                  setSelectedMessage(null);
                }}
                className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-zinc-800/60 text-start w-full"
              >
                <Share2 className="size-4 text-zinc-400" />
                <span>Forward</span>
              </button>

              <button
                onClick={() => {
                  if (message.text) {
                    navigator.clipboard.writeText(message.text);
                    setToastMessage("Copied to clipboard");
                    setTimeout(() => setToastMessage(null), 2000);
                  }
                  setSelectedMessage(null);
                }}
                className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-zinc-800/60 text-start w-full"
              >
                <Copy className="size-4 text-zinc-400" />
                <span>Copy</span>
              </button>

              <button
                onClick={() => {
                  setToastMessage("Translating message...");
                  setTimeout(() => {
                    setToastMessage("Translated: " + (message.text || ""));
                    setTimeout(() => setToastMessage(null), 3000);
                  }, 1000);
                  setSelectedMessage(null);
                }}
                className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-zinc-800/60 text-start w-full"
              >
                <Globe className="size-4 text-zinc-400" />
                <span>Translate</span>
              </button>

              {isOutgoing && (
                <button
                  onClick={() => {
                    handleDeleteMessage(message.id);
                    setSelectedMessage(null);
                  }}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-red-500/10 text-red-500 text-start w-full font-medium"
                >
                  <Trash2 className="size-4 text-red-500" />
                  <span>Unsend</span>
                </button>
              )}

              <button
                onClick={() => {
                  setMoreOptionsMessage(message);
                  setSelectedMessage(null);
                }}
                className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-zinc-800/60 text-start w-full text-zinc-300"
              >
                <span className="font-medium">More</span>
                <span className="text-[12px] text-zinc-500">&gt;</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Custom Fullscreen Grid Media Viewer Modal Portal */}
      {gridMediaViewerPhotos && createPortal(
        <div className="fixed inset-0 bg-black/95 z-[999] flex flex-col p-6 overflow-y-auto select-none justify-center items-center animate-in fade-in duration-200" onClick={() => setGridMediaViewerPhotos(null)}>
          {/* Close button */}
          <button onClick={() => setGridMediaViewerPhotos(null)} className="absolute top-6 left-6 text-white hover:text-zinc-300 z-50 transition-colors p-2 rounded-lg bg-zinc-900/50 backdrop-blur-sm">
            <X className="size-7" />
          </button>
          
          <div className="w-full max-w-lg mx-auto flex flex-col justify-center animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className={cn(
              "grid gap-4 w-full justify-center items-center",
              gridMediaViewerPhotos.length === 1 ? "grid-cols-1 max-w-sm mx-auto" : "grid-cols-2"
            )}>
              {gridMediaViewerPhotos.filter((url): url is string => typeof url === "string").map((url, idx) => {
                const isVideo = url.includes(".mp4") || url.includes(".mov") || url.includes("video") || url.includes("stream-chat-uploads");
                return isVideo ? (
                  <video
                    key={idx}
                    src={url}
                    controls
                    autoPlay
                    className="w-full aspect-[3/4] object-cover rounded-[20px] shadow-2xl border border-zinc-800/40 bg-black"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={idx}
                    src={url}
                    alt={`Fullscreen grid-${idx}`}
                    className="w-full aspect-[3/4] object-cover rounded-[20px] shadow-2xl border border-zinc-800/40"
                  />
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
});
MessageBubbleContainer.displayName = "MessageBubbleContainer";
const getFriendlyDate = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return "Today";
    }
    if (d.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  } catch (e) {
    return dateStr;
  }
};

const playToneSynth = (toneName: string) => {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    if (toneName === "No sound") return;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    const now = ctx.currentTime;
    
    if (toneName === "beak" || toneName === "Default") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (toneName === "bulb one") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(554, now + 0.1);
      osc.frequency.setValueAtTime(659, now + 0.2);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (toneName === "cough") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(150, now);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (toneName === "croak") {
      osc.type = "square";
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.setValueAtTime(90, now + 0.08);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
      osc.start(now);
      osc.stop(now + 0.18);
    } else if (toneName === "cuckoo") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.setValueAtTime(480, now + 0.2);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.25, now + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.38);
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (toneName === "doub") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.setValueAtTime(900, now + 0.08);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
      osc.start(now);
      osc.stop(now + 0.15);
      
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1100, now + 0.08);
      gain2.gain.setValueAtTime(0, now);
      gain2.gain.setValueAtTime(0.25, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.18);
    } else if (toneName === "flap") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.12);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else {
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, now);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  } catch (e) {
    console.warn("AudioContext init error:", e);
  }
};

export default function ChatChannel() {
  const { user: loggedInUser } = useSession();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const {
    activeChannel: channel,
    setActiveChannel,
    setMobileView,
    pins,
    mutes,
    conversationSettings,
    togglePreference,
    setMediaViewerState,
    setProfileOverlayChannel,
  } = useChatUI();

  const parentRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const chatClient = useChat();

  // UI state
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [queueMessages, setQueueMessages] = useState<QueueMessage[]>([]);
  const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [replyMessage, setReplyMessage] = useState<MessageResponse | null>(null);
  const [editingMessage, setEditingMessage] = useState<MessageResponse | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingState, setTypingState] = useState<string | null>(null);

  // Group Details Profile Page states
  const [showGroupProfile, setShowGroupProfile] = useState(false);
  const [showMuteDropdown, setShowMuteDropdown] = useState(false);
  const [showVideoChatDrawer, setShowVideoChatDrawer] = useState(false);
  const [showLeaveGroupDialog, setShowLeaveGroupDialog] = useState(false);
  const [leaveDeleteForAll, setLeaveDeleteForAll] = useState(false);

  // Group Edit Suite states
  const [showGroupEditPage, setShowGroupEditPage] = useState(false);
  const [showGroupSettingsSubPage, setShowGroupSettingsSubPage] = useState(false);
  const [showChatHistorySheet, setShowChatHistorySheet] = useState(false);
  const [showTopicsSubPage, setShowTopicsSubPage] = useState(false);

  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupDesc, setEditGroupDesc] = useState("");
  const [editGroupPhotoUrl, setEditGroupPhotoUrl] = useState<string | null>(null);
  const [groupTypeVal, setGroupTypeVal] = useState<"Private" | "Public">("Private");
  const [chatHistoryVal, setChatHistoryVal] = useState<"Hidden" | "Visible">("Hidden");
  const [topicsEnabled, setTopicsEnabled] = useState(false);
  const [approveMembersVal, setApproveMembersVal] = useState(false);
  const [restrictContentVal, setRestrictContentVal] = useState(false);

  const groupPhotoInputRef = useRef<HTMLInputElement>(null);

  // Group details displays and active call states
  const [videoJoinAsPersonal, setVideoJoinAsPersonal] = useState(true);
  const [showScheduleDrawer, setShowScheduleDrawer] = useState(false);
  const [showVideoCallSheet, setShowVideoCallSheet] = useState(false);
  const [isVideoCallFullscreen, setIsVideoCallFullscreen] = useState(false);
  const [isVideoCallPiP, setIsVideoCallPiP] = useState(false);
  const [isCallMuted, setIsCallMuted] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [userBio, setUserBio] = useState("tap to add a bio");
  const [isBioEditing, setIsBioEditing] = useState(false);

  // New video call feature states
  const [cameraShareType, setCameraShareType] = useState<"PHONE SCREEN" | "FRONT CAMERA" | "BACK CAMERA">("PHONE SCREEN");
  const [showCameraShareChoice, setShowCameraShareChoice] = useState(false);
  const [isNoiseSuppressionEnabled, setIsNoiseSuppressionEnabled] = useState(false);
  const [isRecordingCall, setIsRecordingCall] = useState(false);
  const [isCallMessagesDisabled, setIsCallMessagesDisabled] = useState(false);
  const [showCallOptionsMenu, setShowCallOptionsMenu] = useState(false);
  const [floatingMessages, setFloatingMessages] = useState<Array<{ id: string; text: string; sender: string; avatarUrl?: string }>>([]);
  const [showCallMessageInput, setShowCallMessageInput] = useState(false);
  const [callMessageText, setCallMessageText] = useState("");
  const [callTitle, setCallTitle] = useState("");

  const [selectedScheduleDate, setSelectedScheduleDate] = useState("Today");
  const [selectedScheduleHour, setSelectedScheduleHour] = useState("00");
  const [selectedScheduleMinute, setSelectedScheduleMinute] = useState("00");

  const [tempScheduleDate, setTempScheduleDate] = useState("Today");
  const [tempScheduleHour, setTempScheduleHour] = useState("00");
  const [tempScheduleMinute, setTempScheduleMinute] = useState("00");

  const scheduleDateScrollRef = useRef<HTMLDivElement>(null);
  const scheduleHourScrollRef = useRef<HTMLDivElement>(null);
  const scheduleMinuteScrollRef = useRef<HTMLDivElement>(null);

  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isCameraOn && (cameraShareType === "FRONT CAMERA" || cameraShareType === "BACK CAMERA")) {
      const constraints = {
        video: {
          facingMode: cameraShareType === "FRONT CAMERA" ? "user" : "environment",
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      };
      
      navigator.mediaDevices.getUserMedia(constraints)
        .then((s) => {
          setLocalStream(s);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = s;
          }
        })
        .catch((err) => {
          console.warn("Failed to get user media, falling back to simulation:", err);
          setLocalStream(null);
        });
    } else {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
        setLocalStream(null);
      }
    }
    
    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isCameraOn, cameraShareType]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, showVideoCallSheet, showCameraShareChoice]);

  // Compute schedule dates dynamically
  const scheduleDates = useMemo(() => {
    const list = [];
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    // Today
    list.push({ label: "Today", value: "Today", date: new Date() });
    
    // Next 6 days
    for (let i = 1; i <= 6; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dayName = daysOfWeek[d.getDay()];
      const monthName = months[d.getMonth()];
      const dayNum = d.getDate();
      const label = `${dayName} ${monthName} ${dayNum}`;
      list.push({ label, value: label, date: d });
    }
    return list;
  }, []);

  useEffect(() => {
    if (showScheduleDrawer) {
      setTempScheduleDate(selectedScheduleDate);
      setTempScheduleHour(selectedScheduleHour);
      setTempScheduleMinute(selectedScheduleMinute);
      
      setTimeout(() => {
        if (scheduleDateScrollRef.current) {
          const datesList = ["Today"];
          const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
          const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          for (let i = 1; i <= 6; i++) {
            const d = new Date();
            d.setDate(d.getDate() + i);
            datesList.push(`${daysOfWeek[d.getDay()]} ${months[d.getMonth()]} ${d.getDate()}`);
          }
          const idx = datesList.indexOf(selectedScheduleDate);
          if (idx !== -1) {
            scheduleDateScrollRef.current.scrollTop = idx * 44;
          }
        }
        if (scheduleHourScrollRef.current) {
          const idx = parseInt(selectedScheduleHour);
          if (!isNaN(idx)) {
            scheduleHourScrollRef.current.scrollTop = idx * 44;
          }
        }
        if (scheduleMinuteScrollRef.current) {
          const idx = parseInt(selectedScheduleMinute);
          if (!isNaN(idx)) {
            scheduleMinuteScrollRef.current.scrollTop = idx * 44;
          }
        }
      }, 100);
    }
  }, [showScheduleDrawer, selectedScheduleDate, selectedScheduleHour, selectedScheduleMinute]);

  const scheduleHours = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
  }, []);

  const scheduleMinutes = useMemo(() => {
    return Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"));
  }, []);

  // Compute text for starts-in scheduled warning
  const scheduleStartsInText = useMemo(() => {
    let hoursDiff = 2; 
    if (selectedScheduleHour) {
      const h = parseInt(selectedScheduleHour);
      const m = parseInt(selectedScheduleMinute);
      const now = new Date();
      let target = new Date();
      
      if (selectedScheduleDate !== "Today") {
        const found = scheduleDates.find(d => d.value === selectedScheduleDate);
        if (found) {
          target = new Date(found.date);
        }
      }
      target.setHours(h, m, 0, 0);
      
      let diffMs = target.getTime() - now.getTime();
      if (diffMs < 0) {
        diffMs += 24 * 60 * 60 * 1000;
      }
      
      const diffMins = Math.floor(diffMs / 60000);
      const diffHrs = Math.floor(diffMins / 60);
      
      if (diffHrs > 0) {
        return `Members of the group will be notified that the video chat starts in ${diffHrs} hour${diffHrs > 1 ? "s" : ""}.`;
      } else {
        return `Members of the group will be notified that the video chat starts in ${diffMins} minute${diffMins > 1 ? "s" : ""}.`;
      }
    }
    return `Members of the group will be notified that the video chat starts in 2 hours.`;
  }, [selectedScheduleDate, selectedScheduleHour, selectedScheduleMinute, scheduleDates]);

  // Mute options, toast notifications and custom settings states
  const [isSoundMuted, setIsSoundMuted] = useState(false);
  const [notificationBanner, setNotificationBanner] = useState<{ text: string; icon: "sound" | "muted" } | null>(null);
  const [showMuteForDrawer, setShowMuteForDrawer] = useState(false);
  const [selectedMuteDuration, setSelectedMuteDuration] = useState("30 minutes");
  const [showCustomNotificationsPage, setShowCustomNotificationsPage] = useState(false);

  // Custom Notifications config states
  const [showPreviews, setShowPreviews] = useState(true);
  const [smartNotificationsVal, setSmartNotificationsVal] = useState("2 / 3 minutes");
  const [priorityVal, setPriorityVal] = useState("Same as in Settings");
  const [popupNotificationsVal, setPopupNotificationsVal] = useState("Disabled");
  const [lightColorVal, setLightColorVal] = useState("#0095f6");

  // New configuration controllers
  const [showSoundPage, setShowSoundPage] = useState(false);
  const [showVibrateModal, setShowVibrateModal] = useState(false);
  const [showPriorityModal, setShowPriorityModal] = useState(false);
  const [showSmartSheet, setShowSmartSheet] = useState(false);

  const [selectedSound, setSelectedSound] = useState("Default");
  const [vibrateVal, setVibrateVal] = useState("Default");
  const [smartTimes, setSmartTimes] = useState("2 times");
  const [smartMinutes, setSmartMinutes] = useState("3 minutes");

  const [tempSmartTimes, setTempSmartTimes] = useState("2 times");
  const [tempSmartMinutes, setTempSmartMinutes] = useState("3 minutes");

  const timesScrollRef = useRef<HTMLDivElement>(null);
  const minutesScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showSmartSheet) {
      setTempSmartTimes(smartTimes);
      setTempSmartMinutes(smartMinutes);
      
      setTimeout(() => {
        if (timesScrollRef.current) {
          const timesList = Array.from({ length: 10 }, (_, i) => `${i + 1} time${i > 0 ? "s" : ""}`);
          const idx = timesList.indexOf(smartTimes);
          if (idx !== -1) {
            timesScrollRef.current.scrollTop = idx * 44;
          }
        }
        if (minutesScrollRef.current) {
          const minutesList = [
            "1 minute", "2 minutes", "3 minutes", "4 minutes", "5 minutes",
            "10 minutes", "15 minutes", "30 minutes", "60 minutes"
          ];
          const idx = minutesList.indexOf(smartMinutes);
          if (idx !== -1) {
            minutesScrollRef.current.scrollTop = idx * 44;
          }
        }
      }, 100);
    }
  }, [showSmartSheet, smartTimes, smartMinutes]);

  // Load preferences from localStorage on channel change
  useEffect(() => {
    if (channel?.id) {
      setShowPreviews(localStorage.getItem("show-previews-" + channel.id) !== "false");
      setSelectedSound(localStorage.getItem("sound-" + channel.id) || "Default");
      setVibrateVal(localStorage.getItem("vibrate-" + channel.id) || "Default");
      
      const st = localStorage.getItem("smart-times-" + channel.id) || "2 times";
      const sm = localStorage.getItem("smart-minutes-" + channel.id) || "3 minutes";
      setSmartTimes(st);
      setSmartMinutes(sm);
      setSmartNotificationsVal(`${st.split(" ")[0]} / ${sm}`);

      setPriorityVal(localStorage.getItem("priority-" + channel.id) || "Same as in Settings");
      setPopupNotificationsVal(localStorage.getItem("popup-" + channel.id) || "Disabled");
      setLightColorVal(localStorage.getItem("light-color-" + channel.id) || "#0095f6");
    }
  }, [channel?.id]);

  // Jump highlights & unread lock states
  const [initialFirstUnreadId, setInitialFirstUnreadId] = useState<string | null>(null);
  const [initialUnreadCount, setInitialUnreadCount] = useState<number>(0);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  // Context Actions Menu & Forward state
  const [contextMenuMessage, setContextMenuMessage] = useState<MessageResponse | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [showForwardDialog, setShowForwardDialog] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState<MessageResponse | null>(null);
  const [forwardChannels, setForwardChannels] = useState<Channel[]>([]);
  const [forwardSearchQuery, setForwardSearchQuery] = useState("");

  // Selection Mode states
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<MessageResponse | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [moreOptionsMessage, setMoreOptionsMessage] = useState<MessageResponse | null>(null);

  // Top-level derived values to solve block scoping constraints
  const members = channel ? Object.values(channel.state.members || {}) : [];
  const otherMember = channel ? members.find((m) => m.user?.id !== loggedInUser.id)?.user : undefined;
  const isGroup = channel ? (channel.data?.isGroup === true || members.length > 2) : false;
  const displayName = channel ? (channel.data?.name || (isGroup ? "Group Chat" : otherMember?.name || "Chat Room")) : "";
  const avatarUrl = channel ? (channel.data?.image || (isGroup ? undefined : otherMember?.image)) : undefined;
  const isOnline = otherMember?.online || false;
  const onlineMembersCount = channel ? members.filter(
    (m) => m.user?.id !== loggedInUser.id && m.user?.online
  ).length : 0;

  useEffect(() => {
    if (displayName) {
      setCallTitle(displayName);
      setEditGroupName(displayName);
    }
    if (channel?.data?.description) {
      setEditGroupDesc(channel.data.description as string);
    }
  }, [displayName, channel?.data?.description]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleGroupPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setEditGroupPhotoUrl(url);
      toast({ description: "Group photo selected" });
    }
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && channel) {
      const soundName = file.name.slice(0, 20) + (file.name.length > 20 ? "..." : "");
      setSelectedSound(soundName);
      localStorage.setItem("sound-" + channel.id, soundName);
      toast({ description: `Uploaded notification sound: ${soundName}` });
      
      try {
        const audio = new Audio(URL.createObjectURL(file));
        audio.volume = 0.5;
        audio.play().catch(err => console.log("Failed custom audio playback:", err));
      } catch (err) {
        console.warn(err);
      }
    }
  };

  const addFloatingMessage = (text: string) => {
    if (!text.trim()) return;
    const id = Math.random().toString(36).substring(2, 9);
    const senderName = videoJoinAsPersonal 
      ? (loggedInUser.displayName || loggedInUser.username)
      : (displayName || "Group");
    const senderAvatar = videoJoinAsPersonal 
      ? (loggedInUser.avatarUrl || undefined) 
      : undefined;

    setFloatingMessages((prev) => [
      ...prev,
      { id, text, sender: senderName, avatarUrl: senderAvatar }
    ]);

    setTimeout(() => {
      setFloatingMessages((prev) => prev.filter((msg) => msg.id !== id));
    }, 4000);
  };

  // Push history state when group profile opens for smooth back navigation
  useEffect(() => {
    if (showGroupProfile) {
      window.history.pushState({ groupProfile: true }, "");
      const handlePopState = () => {
        setShowGroupProfile(false);
      };
      window.addEventListener("popstate", handlePopState);
      return () => {
        window.removeEventListener("popstate", handlePopState);
      };
    }
  }, [showGroupProfile]);

  // Reset selected message when switching channels
  useEffect(() => {
    setSelectedMessage(null);
  }, [channel?.id]);

  const isMuted = channel ? mutes.some((m) => m.channelId === channel.id) : false;
  const isPinned = channel ? pins.includes(channel.id!) : false;

  const activeSettings = useMemo(() => {
    return conversationSettings.find((s) => s.channelId === channel?.id);
  }, [conversationSettings, channel?.id]);
  const lastClearedAt = activeSettings?.lastClearedAt;

  // Filter messages based on local user clearance
  const filteredMessages = useMemo(() => {
    return messages.filter((m) => {
      if (m.deleted_at || m.type === "system") return false;
      if (!lastClearedAt) return true;
      const clearedTime = new Date(lastClearedAt).getTime();
      const msgTime = new Date(m.created_at || (m as any).createdAt || Date.now()).getTime();
      return msgTime > clearedTime;
    });
  }, [messages, lastClearedAt]);

  // Lock first unread count and id when switching channels
  useEffect(() => {
    if (!channel) {
      setInitialFirstUnreadId(null);
      setInitialUnreadCount(0);
      return;
    }
    const lastRead = channel.state.read?.[loggedInUser.id]?.last_read;
    const lastReadTime = lastRead ? new Date(lastRead as any).getTime() : 0;
    
    // Filter messages based on history clearance
    const activeSettings = conversationSettings.find((s) => s.channelId === channel.id);
    const clearedTime = activeSettings?.lastClearedAt ? new Date(activeSettings.lastClearedAt).getTime() : 0;
    
    const relevantMessages = (channel.state.messages || []).filter((m) => {
      if (m.deleted_at || m.type === "system") return false;
      const msgTime = new Date(m.created_at || (m as any).createdAt || Date.now()).getTime();
      return msgTime > clearedTime;
    });

    const unreadMsgs = relevantMessages.filter(
      (m) => m.user?.id !== loggedInUser.id && new Date(m.created_at as any).getTime() > lastReadTime
    );
    if (unreadMsgs.length > 0) {
      setInitialFirstUnreadId(unreadMsgs[0].id);
      setInitialUnreadCount(unreadMsgs.length);
    } else {
      setInitialFirstUnreadId(null);
      setInitialUnreadCount(0);
    }
  }, [channel?.id, loggedInUser.id, conversationSettings]);

  // Combine real and optimistic queue messages
  const allMessages = useMemo(() => {
    return [...filteredMessages, ...queueMessages];
  }, [filteredMessages, queueMessages]);

  const filteredForwardChannels = useMemo(() => {
    if (!forwardSearchQuery) return forwardChannels;
    return forwardChannels.filter((c) => {
      const m = Object.values(c.state.members || {});
      const other = m.find((member) => member.user?.id !== loggedInUser.id)?.user;
      const name = c.data?.name || other?.name || "Chat Room";
      return name.toLowerCase().includes(forwardSearchQuery.toLowerCase());
    });
  }, [forwardChannels, forwardSearchQuery, loggedInUser.id]);

  // Compute final virtual list items (injecting Date and Unread separators)
  const listItems = useMemo(() => {
    const items: Array<
      | { type: "message"; message: any }
      | { type: "date"; date: string }
      | { type: "unread" }
    > = [];
    
    if (allMessages.length === 0) return [];
    
    let lastDateStr = "";
    
    allMessages.forEach((msg) => {
      // Check Date Separator
      const msgDate = new Date((msg as any).created_at || (msg as any).createdAt);
      const dateStr = msgDate.toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" });
      if (dateStr !== lastDateStr) {
        items.push({ type: "date", date: dateStr });
        lastDateStr = dateStr;
      }
      
      // Check Unread Separator
      if (initialFirstUnreadId && msg.id === initialFirstUnreadId) {
        items.push({ type: "unread" });
      }
      
      items.push({ type: "message", message: msg });
    });
    
    return items;
  }, [allMessages, initialFirstUnreadId]);

  // Jump to specific message by ID and briefly trigger a pulse highlight
  const scrollToMessage = (messageId: string) => {
    const idx = listItems.findIndex(
      (item) => item.type === "message" && item.message.id === messageId
    );
    if (idx !== -1) {
      rowVirtualizer.scrollToIndex(idx, { align: "center" });
      setHighlightedMessageId(messageId);
      setTimeout(() => {
        setHighlightedMessageId(null);
      }, 1500);
    }
  };

  const toggleMessageSelection = (messageId: string) => {
    setSelectedMessageIds((prev) =>
      prev.includes(messageId)
        ? prev.filter((id) => id !== messageId)
        : [...prev, messageId]
    );
  };

  const handleExitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedMessageIds([]);
  };

  const handleSelectionCopy = () => {
    const selectedMsgs = messages.filter((m) => selectedMessageIds.includes(m.id));
    const concatenatedText = selectedMsgs
      .map((m) => `${m.user?.name || "User"}: ${m.text || "[Attachment]"}`)
      .join("\n");
    navigator.clipboard.writeText(concatenatedText);
    handleExitSelectionMode();
  };

  const handleSelectionDelete = async () => {
    if (!chatClient) return;
    try {
      await Promise.all(selectedMessageIds.map((id) => chatClient.deleteMessage(id)));
      setMessages((prev) => prev.filter((m) => !selectedMessageIds.includes(m.id)));
    } catch (err) {
      console.error("Failed to delete selected messages:", err);
    }
    handleExitSelectionMode();
  };

  const handleSelectionForward = () => {
    const firstSelected = messages.find((m) => selectedMessageIds.includes(m.id));
    if (firstSelected) {
      setForwardingMessage(firstSelected);
      fetchForwardChannels();
      setShowForwardDialog(true);
    }
    handleExitSelectionMode();
  };

  // Virtualizer setup
  const rowVirtualizer = useVirtualizer({
    count: listItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 70,
    overscan: 10,
  });

  // Scroll to bottom on load or new message
  useEffect(() => {
    if (listItems.length > 0) {
      rowVirtualizer.scrollToIndex(listItems.length - 1, { align: "end" });
    }
  }, [listItems.length, rowVirtualizer]);

  // Load message history and bind listeners
  useEffect(() => {
    if (!channel) return;
    const loadHistory = async () => {
      try {
        const response = await channel.query({
          messages: { limit: 100 },
        });
        setMessages(response.messages || []);
        
        // Mark channel as read when opened!
        await channel.markRead();
        queryClient.invalidateQueries({ queryKey: ["unread-messages-count"] });
        
        // Restore local drafts if any
        const draft = await draftStorage.getDraft(channel.id!);
        if (draft && draft.draftText) {
          setInputText(draft.draftText);
        } else {
          setInputText("");
        }
      } catch (error) {
        console.error("Failed to load channel history:", error);
      }
    };

    loadHistory();

    // Listen to outgoing message queue updates
    const unsubscribeQueue = outgoingMessageQueue.subscribe((q) => {
      setQueueMessages(q.filter((m) => m.channelId === channel.id));
    });

    // Listen to Stream Events
    const handleNewMessage = (event: any) => {
      if (event.message) {
        setMessages((prev) => [...prev.filter((m) => m.id !== event.message.id), event.message]);
        
        // Mark channel as read and invalidate unread count queries
        channel.markRead()
          .then(() => queryClient.invalidateQueries({ queryKey: ["unread-messages-count"] }))
          .catch((err) => console.error("Failed to mark channel as read:", err));
      }
    };

    const handleTyping = (event: any) => {
      if (event.user?.id === loggedInUser.id) return;
      if (event.type === "typing.start") {
        setIsTyping(true);
        setTypingState(`${event.user.name} is typing...`);
      } else if (event.type === "typing.stop") {
        setIsTyping(false);
        setTypingState(null);
      }
    };

    channel.on("message.new", handleNewMessage);
    channel.on("typing.start", handleTyping);
    channel.on("typing.stop", handleTyping);

    return () => {
      unsubscribeQueue();
      channel.off("message.new", handleNewMessage);
      channel.off("typing.start", handleTyping);
      channel.off("typing.stop", handleTyping);
    };
  }, [channel, loggedInUser.id]);

  // Save drafts locally in IndexedDB
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!channel) return;
    const text = e.target.value;
    setInputText(text);
    if (text.trim()) {
      draftStorage.saveDraft(channel.id!, loggedInUser.id, text);
      try {
        channel.keystroke();
      } catch (err) {
        console.warn("Failed to trigger keystroke event:", err);
      }
    } else {
      draftStorage.deleteDraft(channel.id!);
    }
  };

  // Send or edit message
  const handleSendMessage = async () => {
    if (!channel || !inputText.trim()) return;

    const textToSend = inputText;
    setInputText("");
    draftStorage.deleteDraft(channel.id!);

    if (editingMessage) {
      try {
        await chatClient?.updateMessage({
          id: editingMessage.id,
          text: textToSend,
        });
      } catch (err) {
        console.error("Failed to edit message:", err);
      }
      setEditingMessage(null);
    } else {
      const parentId = replyMessage?.id;
      setReplyMessage(null);
      // Optimistic delivery via OutgoingMessageQueue
      await outgoingMessageQueue.addMessage(channel, textToSend, loggedInUser.id, [], parentId);
    }
  };

  // Send product/reel/post share cards
  const handleSelectShare = async (share: {
    type: string;
    id: string;
    title: string;
    thumbnailUrl?: string;
    deepLink: string;
    price?: string;
    originalPrice?: string;
  }) => {
    if (!channel) return;
    // Send as custom attachment card payload
    await outgoingMessageQueue.addMessage(
      channel,
      `Shared a ${share.type.toLowerCase()}: ${share.title}`,
      loggedInUser.id,
      [
        {
          type: "share-card",
          shareType: share.type,
          itemId: share.id,
          title: share.title,
          image_url: share.thumbnailUrl,
          deepLink: share.deepLink,
          price: share.price,
          originalPrice: share.originalPrice,
        },
      ]
    );
  };

  // Upload multiple file attachments
  const handleSelectFiles = async (files: File[]) => {
    if (!channel) return;
    try {
      const attachments = await Promise.all(
        files.map(async (file) => {
          const type = file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "file";
          
          // Upload using Stream sendFile/sendImage API
          let fileUrl = "";
          if (type === "image") {
            const response = await channel.sendImage(file);
            fileUrl = response.file || "";
          } else {
            const response = await channel.sendFile(file);
            fileUrl = response.file || "";
          }
          return {
            type,
            asset_url: fileUrl,
            title: file.name,
            file_size: file.size,
          };
        })
      );

      await outgoingMessageQueue.addMessage(channel, "", loggedInUser.id, attachments);
    } catch (error) {
      console.error("Failed to upload files:", error);
    }
  };

  const handleSelectEmoji = (emoji: string) => {
    if (!channel) return;
    setInputText((prev) => prev + emoji);
    draftStorage.saveDraft(channel.id!, loggedInUser.id, inputText + emoji);
  };

  const handleSelectSticker = async (url: string) => {
    if (!channel) return;
    await outgoingMessageQueue.addMessage(channel, "", loggedInUser.id, [
      {
        type: "sticker",
        image_url: url,
      },
    ]);
  };

  const handleSelectGif = async (url: string) => {
    if (!channel) return;
    await outgoingMessageQueue.addMessage(channel, "", loggedInUser.id, [
      {
        type: "giphy",
        image_url: url,
      },
    ]);
  };

  // Context Menu Mute handler
  const handleMute = async () => {
    if (!channel) return;
    if (isMuted) {
      await togglePreference("unmute", channel.id!);
    } else {
      await togglePreference("mute", channel.id!);
    }
  };

  // Context Menu Pin handler
  const handlePin = async () => {
    if (!channel) return;
    if (isPinned) {
      await togglePreference("unpin", channel.id!);
    } else {
      await togglePreference("pin", channel.id!);
    }
  };

  const handleToggleReaction = async (messageId: string, reactionType: string) => {
    if (!channel) return;
    const apiReactionType = reactionMap[reactionType] || reactionType;
    try {
      const message = messages.find((m) => m.id === messageId);
      const hasReaction = message?.own_reactions?.some((r) => r.type === apiReactionType);
      if (hasReaction) {
        await channel.deleteReaction(messageId, apiReactionType);
      } else {
        await channel.sendReaction(messageId, { type: apiReactionType });
      }
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          const ownReactions = m.own_reactions || [];
          const updatedOwn = hasReaction
            ? ownReactions.filter((r) => r.type !== apiReactionType)
            : [...ownReactions, { type: apiReactionType, user: loggedInUser }];
          const latestReactions = m.latest_reactions || [];
          const updatedLatest = hasReaction
            ? latestReactions.filter((r) => !(r.type === apiReactionType && r.user_id === loggedInUser.id))
            : [...latestReactions, { type: apiReactionType, user_id: loggedInUser.id, user: loggedInUser }];
          return { ...m, own_reactions: updatedOwn, latest_reactions: updatedLatest } as any;
        })
      );
    } catch (err) {
      console.error("Failed to toggle reaction:", err);
    }
  };

  const handlePinMessage = async (msg: MessageResponse) => {
    if (!chatClient) return;
    try {
      if (msg.pinned) {
        await (chatClient as any).unpinMessage(msg);
      } else {
        await (chatClient as any).pinMessage(msg);
      }
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, pinned: !msg.pinned } : m))
      );
    } catch (err) {
      console.error("Failed to toggle pin message:", err);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!chatClient) return;
    try {
      await chatClient.deleteMessage(messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch (err) {
      console.error("Failed to delete message:", err);
    }
  };

  const handleMessageClick = (e: React.MouseEvent, msg: any) => {
    e.preventDefault();
    setContextMenuMessage(msg);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
  };

  const fetchForwardChannels = async () => {
    if (!chatClient) return;
    try {
      const list = await chatClient.queryChannels(
        { members: { $in: [loggedInUser.id] } },
        { last_message_at: -1 },
        { limit: 10 }
      );
      setForwardChannels(list);
    } catch (e) {
      console.error("Failed to fetch channels for forward list:", e);
    }
  };

  const handleForwardToChannel = async (targetChannel: Channel) => {
    if (!forwardingMessage) return;
    try {
      await targetChannel.sendMessage({
        text: forwardingMessage.text,
        attachments: forwardingMessage.attachments,
      });
      setForwardingMessage(null);
      setShowForwardDialog(false);
      setActiveChannel(targetChannel);
      setMobileView("chat");
    } catch (err) {
      console.error("Failed to forward message:", err);
    }
  };

  // Get recipient (DM mode)
  if (!channel) return null;

  // Pinned Message banner
  const pinnedMessages = messages.filter((m) => m.pinned);
  const latestPinned = pinnedMessages[pinnedMessages.length - 1];

  return (
    <div className="flex h-full w-full flex-col bg-[#121212] select-none relative overflow-hidden">
      {/* Header Panel */}
      {selectedMessage && isSelectionMode ? (
        <div className="flex min-h-[56px] h-auto pt-[env(safe-area-inset-top)] pb-2 items-center justify-between border-b bg-[#005c4b] text-white px-4 z-30 animate-fade-in shrink-0 shadow-md sticky top-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedMessage(null)}
              className="rounded-full p-1.5 hover:bg-white/10"
              type="button"
            >
              <ArrowLeft className="size-5 text-white" />
            </button>
            <span className="text-[17px] font-semibold">1</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Reply */}
            <button
              onClick={() => {
                setReplyMessage(selectedMessage);
                setSelectedMessage(null);
              }}
              className="rounded-full p-2 hover:bg-white/10"
              title="Reply"
              type="button"
            >
              <CornerUpLeft className="size-5" />
            </button>

            {/* Star */}
            <button
              onClick={() => {
                setToastMessage("Message starred");
                setTimeout(() => setToastMessage(null), 2000);
                if (selectedMessage) {
                  (selectedMessage as any).starred = !(selectedMessage as any).starred;
                }
                setSelectedMessage(null);
              }}
              className="rounded-full p-2 hover:bg-white/10"
              title="Star"
              type="button"
            >
              <Star className="size-5" />
            </button>

            {/* Copy */}
            {selectedMessage?.text && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(selectedMessage.text || "");
                  setToastMessage("Copied to clipboard");
                  setTimeout(() => setToastMessage(null), 2000);
                  setSelectedMessage(null);
                }}
                className="rounded-full p-2 hover:bg-white/10"
                title="Copy"
                type="button"
              >
                <Copy className="size-5" />
              </button>
            )}

            {/* Pin */}
            <button
              onClick={() => {
                if (selectedMessage) {
                  handlePinMessage(selectedMessage);
                }
                setSelectedMessage(null);
              }}
              className="rounded-full p-2 hover:bg-white/10"
              title="Pin"
              type="button"
            >
              <Pin className="size-5 rotate-45" />
            </button>

            {/* Edit (if own message) */}
            {selectedMessage?.user?.id === loggedInUser.id && selectedMessage?.text && (
              <button
                onClick={() => {
                  setEditingMessage(selectedMessage);
                  setInputText(selectedMessage.text || "");
                  textareaRef.current?.focus();
                  setSelectedMessage(null);
                }}
                className="rounded-full p-2 hover:bg-white/10"
                title="Edit"
                type="button"
              >
                <Edit2 className="size-5" />
              </button>
            )}

            {/* Forward */}
            <button
              onClick={() => {
                setForwardingMessage(selectedMessage);
                fetchForwardChannels();
                setShowForwardDialog(true);
                setSelectedMessage(null);
              }}
              className="rounded-full p-2 hover:bg-white/10"
              title="Forward"
              type="button"
            >
              <Share2 className="size-5" />
            </button>

            {/* Message Info */}
            <button
              onClick={() => {
                const infoText = `Sent by: ${selectedMessage?.user?.name || "Unknown"}\nTime: ${new Date(selectedMessage?.created_at || "").toLocaleString()}\nStatus: Sent`;
                alert(infoText);
                setSelectedMessage(null);
              }}
              className="rounded-full p-2 hover:bg-white/10"
              title="Info"
              type="button"
            >
              <AlertCircle className="size-5" />
            </button>

            {/* Delete */}
            <button
              onClick={() => {
                if (selectedMessage) {
                  handleDeleteMessage(selectedMessage.id);
                }
                setSelectedMessage(null);
              }}
              className="rounded-full p-2 hover:bg-white/10 text-red-400"
              title="Delete"
              type="button"
            >
              <Trash2 className="size-5" />
            </button>
          </div>
        </div>
      ) : isSelectionMode ? (
        <div className="flex min-h-[56px] h-auto pt-[env(safe-area-inset-top)] pb-2 items-center justify-between border-b bg-primary/10 px-3 z-20 animate-fade-in shrink-0 sticky top-0">
          <div className="flex items-center gap-3">
            <button
              onClick={handleExitSelectionMode}
              className="rounded-full p-1.5 hover:bg-primary/20 text-primary"
              type="button"
            >
              <X className="size-5" />
            </button>
            <span className="text-[17px] font-semibold text-foreground">
              Selected: {selectedMessageIds.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectionCopy}
              disabled={selectedMessageIds.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-card hover:bg-muted border disabled:opacity-50 text-foreground"
              type="button"
            >
              <Copy className="size-3.5 text-muted-foreground" />
              <span>Copy</span>
            </button>
            <button
              onClick={handleSelectionForward}
              disabled={selectedMessageIds.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-card hover:bg-muted border disabled:opacity-50 text-foreground"
              type="button"
            >
              <Share2 className="size-3.5 text-muted-foreground" />
              <span>Forward</span>
            </button>
            <button
              onClick={handleSelectionDelete}
              disabled={selectedMessageIds.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 disabled:opacity-50 animate-pulse-once"
              type="button"
            >
              <Trash2 className="size-3.5" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex min-h-[64px] h-auto pt-[env(safe-area-inset-top)] pb-2.5 items-center justify-between bg-[#121212] border-b border-zinc-800/60 px-4 z-20 shrink-0 sticky top-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setActiveChannel(null);
                setMobileView("list");
              }}
              className="rounded-full p-1.5 hover:bg-zinc-800 text-zinc-400 md:hidden"
              type="button"
            >
              <ArrowLeft className="size-5" />
            </button>
            
            {/* Avatar details with pink/purple gradient story-ring */}
            <div
              className="flex items-center gap-3 cursor-pointer hover:opacity-90"
              onClick={() => {
                if (isGroup) {
                  setShowGroupProfile(true);
                } else {
                  setProfileOverlayChannel(channel);
                }
              }}
            >
              <div className="rounded-full p-[2.5px] bg-gradient-to-tr from-[#f91f76] to-[#a83ffc] shadow-md flex items-center justify-center">
                <div className="rounded-full bg-[#09090b] p-[1.5px] flex items-center justify-center">
                  {avatarUrl ? (
                    <UserAvatar avatarUrl={avatarUrl as string | undefined} size={36} className="size-9 rounded-full border-none" />
                  ) : isGroup ? (
                    <div className="size-9 rounded-full flex items-center justify-center text-sm font-bold text-white bg-[#2a87d0]">
                      {(displayName || "G")[0].toUpperCase()}
                    </div>
                  ) : (
                    <UserAvatar avatarUrl={undefined} size={36} className="size-9 rounded-full border-none" />
                  )}
                </div>
              </div>
              <div className="flex flex-col text-start leading-tight">
                <span className="text-[16px] font-bold text-white flex items-center gap-1">
                  {displayName}
                  {!!(otherMember as any)?.verified && <VerifiedBadge size={14} className="text-[#0095f6] fill-[#0095f6]" />}
                </span>
                <div className="flex items-center gap-1.5 text-[12px] text-zinc-400">
                  {typingState ? (
                    <span className="text-zinc-500 italic">{typingState}</span>
                  ) : isGroup ? (
                    <span>
                      {members.length} members{onlineMembersCount > 0 ? `, ${onlineMembersCount} online` : ""}
                    </span>
                  ) : isOnline ? (
                    <>
                      <span className="size-1.5 rounded-full bg-green-500 shrink-0" />
                      <span>Active now</span>
                    </>
                  ) : (
                    <span>Offline</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Header Action Icons */}
          <div className="flex items-center gap-1.5">
            <button
              className="rounded-full p-2 text-zinc-300 hover:bg-zinc-800/60 transition-colors"
              title="Voice Call"
              type="button"
            >
              <Phone className="size-[20px]" />
            </button>
            <button
              className="rounded-full p-2 text-zinc-300 hover:bg-zinc-800/60 transition-colors"
              title="Video Call"
              type="button"
            >
              <Video className="size-[20px]" />
            </button>
            <button
              onClick={() => {
                if (isGroup) {
                  setShowGroupProfile(true);
                } else {
                  setProfileOverlayChannel(channel);
                }
              }}
              className="rounded-full p-2 text-zinc-300 hover:bg-zinc-800/60 transition-colors"
              title="More Options"
              type="button"
            >
              <MoreVertical className="size-[20px]" />
            </button>
          </div>
        </div>
      )}

      {/* Dimmed backdrop overlay when selecting message */}
      {selectedMessage && (
        <div 
          className="fixed inset-0 z-20 bg-black/10 backdrop-blur-[1px] cursor-default" 
          onClick={() => setSelectedMessage(null)} 
        />
      )}

      {/* Toast message popup */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-[#005c4b] border border-[#004f40] text-white text-xs font-semibold py-2.5 px-4 rounded-xl shadow-xl flex items-center gap-2 animate-fade-in">
          <MessageSquare className="size-3.5 text-white shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Pinned Messages Banner */}
      {latestPinned && (
        <div
          onClick={() => scrollToMessage(latestPinned.id)}
          className="flex h-10 items-center justify-between border-b bg-primary/5 px-4 text-xs cursor-pointer hover:bg-primary/10 transition-colors z-10"
        >
          <div className="flex items-center gap-2 truncate">
            <Pin className="size-3.5 text-primary rotate-45 shrink-0" />
            <div className="truncate flex flex-col text-start">
              <span className="font-bold text-primary">Pinned Message</span>
              <span className="text-[10px] text-muted-foreground truncate">{latestPinned.text}</span>
            </div>
          </div>
        </div>
      )}

      {/* Scrollable Messages Panel with Outline Doodle Background */}
      <div
        ref={parentRef}
        className="flex-1 overflow-y-auto px-4 py-4 relative overscroll-contain"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cpath d='M20 35h8l3-4h12l3 4h8a4 4 0 0 1 4 4v16a4 4 0 0 1-4 4H20a4 4 0 0 1-4-4V39a4 4 0 0 1 4-4z' fill='none' stroke='rgba(255,255,255,0.02)' stroke-width='0.8'/%3E%3Ccircle cx='34' cy='47' r='5' fill='none' stroke='rgba(255,255,255,0.02)' stroke-width='0.8'/%3E%3Cpath d='M95 25c-4-4-10-4-14 0l-2 2-2-2c-4-4-10-4-14 0-4 4-4 10 0 14l16 16 16-16c4-4 4-10 0-14z' fill='none' stroke='rgba(255,255,255,0.02)' stroke-width='0.8'/%3E%3Cpath d='M30 90l4 8 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1z' fill='none' stroke='rgba(255,255,255,0.02)' stroke-width='0.8'/%3E%3Cpath d='M85 85h15a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-8l-5 5v-5h-2a3 3 0 0 1-3-3V88a3 3 0 0 1 3-3z' fill='none' stroke='rgba(255,255,255,0.02)' stroke-width='0.8'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundColor: '#09090b',
        }}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const item = listItems[virtualRow.index];
            if (!item) return null;

            if (item.type === "date") {
              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="py-2.5 flex justify-center text-center"
                >
                  <div className="rounded-full bg-[#18181b] border border-zinc-800/40 px-3.5 py-1 text-[11px] font-medium text-zinc-400 select-none shadow-sm">
                    {getFriendlyDate(item.date)}
                  </div>
                </div>
              );
            }

            if (item.type === "unread") {
              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="py-1 flex items-center w-full"
                >
                  <div className="flex-1 border-t border-zinc-800/40" />
                  <span className="mx-3 text-[13px] uppercase font-bold text-zinc-500 tracking-wider">
                    Unread Messages ({initialUnreadCount})
                  </span>
                  <div className="flex-1 border-t border-zinc-800/40" />
                </div>
              );
            }

            if (item.type !== "message") return null;

            const message = item.message;
            const getSenderId = (m: any) => m.user?.id || m.senderId;
            const msgSenderId = getSenderId(message);

            // Grouping bubble shapes logic
            let prevMsg = null;
            for (let i = virtualRow.index - 1; i >= 0; i--) {
              const currentItem = listItems[i];
              if (currentItem?.type === "message") {
                prevMsg = currentItem.message;
                break;
              }
            }
            let nextMsg = null;
            for (let i = virtualRow.index + 1; i < listItems.length; i++) {
              const currentItem = listItems[i];
              if (currentItem?.type === "message") {
                nextMsg = currentItem.message;
                break;
              }
            }

            const prevSenderId = prevMsg ? getSenderId(prevMsg) : null;
            const nextSenderId = nextMsg ? getSenderId(nextMsg) : null;

            const isFirstInGroup = !prevMsg || prevSenderId !== msgSenderId || 
              (new Date(message.created_at || (message as any).createdAt).getTime() - new Date(prevMsg.created_at || (prevMsg as any).createdAt).getTime() > 300000);
              
            const isLastInGroup = !nextMsg || nextSenderId !== msgSenderId || 
              (new Date(nextMsg.created_at || (nextMsg as any).createdAt).getTime() - new Date(message.created_at || (message as any).createdAt).getTime() > 300000);

            const position = isFirstInGroup && isLastInGroup
              ? "single"
              : isFirstInGroup
              ? "first"
              : isLastInGroup
              ? "last"
              : "middle";

            const members = Object.values(channel.state.members || {});
            const otherMember = members.find((m) => m.user?.id !== loggedInUser.id)?.user;

            return (
              <MessageBubbleContainer
                key={virtualRow.key}
                message={message}
                virtualRow={virtualRow}
                rowVirtualizer={rowVirtualizer}
                loggedInUser={loggedInUser}
                channel={channel}
                selectedMessage={selectedMessage}
                setSelectedMessage={setSelectedMessage}
                replyMessage={replyMessage}
                setReplyMessage={setReplyMessage}
                highlightedMessageId={highlightedMessageId}
                scrollToMessage={scrollToMessage}
                setMediaViewerState={setMediaViewerState}
                handleToggleReaction={handleToggleReaction}
                isSelectionMode={isSelectionMode}
                selectedMessageIds={selectedMessageIds}
                toggleMessageSelection={toggleMessageSelection}
                handlePinMessage={handlePinMessage}
                handleDeleteMessage={handleDeleteMessage}
                setEditingMessage={setEditingMessage}
                setInputText={setInputText}
                textareaRef={textareaRef}
                setShowStickerPicker={setShowStickerPicker}
                position={position}
                isFirstInGroup={isFirstInGroup}
                isLastInGroup={isLastInGroup}
                otherMember={otherMember}
                setForwardingMessage={setForwardingMessage}
                fetchForwardChannels={fetchForwardChannels}
                setShowForwardDialog={setShowForwardDialog}
                setMoreOptionsMessage={setMoreOptionsMessage}
                setToastMessage={setToastMessage}
              />
            );
          })}
        </div>
      </div>

      {/* Reply Preview Bar */}
      {replyMessage && (
        <div className="flex h-12 items-center justify-between border-l-[3px] border-primary pl-2 bg-zinc-950/40 backdrop-blur-md text-xs">
          <div className="flex items-center gap-2 truncate">
            <CornerUpLeft className="size-4 text-primary shrink-0" />
            <div className="truncate flex flex-col text-start">
              <span className="font-bold text-primary text-[11px]">Reply to {replyMessage.user?.name}</span>
              <span className="text-[10px] text-muted-foreground truncate">{replyMessage.text}</span>
            </div>
          </div>
          <button onClick={() => setReplyMessage(null)} className="text-muted-foreground hover:text-foreground pr-3">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Edit Preview Bar */}
      {editingMessage && (
        <div className="flex h-12 items-center justify-between border-t bg-muted/20 px-3 text-xs">
          <div className="flex items-center gap-2 truncate">
            <Edit2 className="size-4 text-primary shrink-0" />
            <div className="truncate flex flex-col text-start">
              <span className="font-bold text-primary">Edit Message</span>
              <span className="text-[10px] text-muted-foreground truncate">{editingMessage.text}</span>
            </div>
          </div>
          <button onClick={() => { setEditingMessage(null); setInputText(""); }} className="text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Input Message Composer Bar (Social Commerce Theme) */}
      <div className={cn("flex flex-col bg-[#09090b] border-t border-zinc-800/60 relative z-25 shrink-0 sticky bottom-0", !showStickerPicker && "pb-[env(safe-area-inset-bottom)]")}>
        <div className="flex items-center gap-2.5 p-3 select-none max-w-full">
          {/* Circular plus button on the left */}
          <button
            onClick={() => {
              setShowAttachmentPicker(true);
              setShowStickerPicker(false);
            }}
            className="size-10 rounded-full bg-[#1c1c1e] hover:bg-zinc-800/80 text-zinc-300 flex items-center justify-center transition-colors shrink-0 cursor-pointer shadow"
            type="button"
          >
            <Plus className="size-5" />
          </button>

          {/* Pill-shaped dark input wrapper */}
          <div className="flex-1 flex items-center bg-[#1c1c1e] border border-zinc-800/45 rounded-full px-3.5 py-1 min-w-0 transition-all">
            <textarea
              ref={textareaRef}
              placeholder="Message..."
              value={inputText}
              onChange={handleInputChange}
              onFocus={() => {
                if (window.scrollY !== 0) window.scrollTo(0, 0);
              }}
              rows={1}
              style={{ maxHeight: "120px" }}
              className="flex-1 resize-none bg-transparent py-1.5 text-[15px] text-white placeholder:text-zinc-500 outline-none border-none focus:ring-0 h-9 min-h-[36px] scrollbar-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />

            {/* Smile icon inside input wrapper on the right */}
            <button
              onClick={() => {
                setShowStickerPicker(!showStickerPicker);
                setShowAttachmentPicker(false);
              }}
              className={`rounded-full p-1.5 transition-colors shrink-0 ${
                showStickerPicker ? "text-[#2a87d0]" : "text-zinc-400 hover:text-zinc-200"
              }`}
              type="button"
            >
              <Smile className="size-5 shrink-0" />
            </button>

            {/* Mic icon inside input wrapper on the right */}
            <button
              className="rounded-full p-1.5 text-zinc-400 hover:text-zinc-200 shrink-0"
              type="button"
            >
              <Mic className="size-5 shrink-0" />
            </button>
          </div>

          {/* Purple soundwave FAB / Send button */}
          <button
            onClick={inputText.trim() ? handleSendMessage : undefined}
            className="size-10 rounded-full bg-[#2a87d0] text-white flex items-center justify-center shadow-lg hover:bg-[#2076b4] active:scale-95 transition-all shrink-0 cursor-pointer"
            type="button"
          >
            {inputText.trim() ? (
              <Send className="size-[18px] fill-white text-white ml-0.5" />
            ) : (
              <Volume2 className="size-[18px] text-white animate-pulse" />
            )}
          </button>
        </div>

        {/* Sticker Drawer Sheet */}
        {showStickerPicker && (
          <StickerPicker
            onSelectEmoji={handleSelectEmoji}
            onSelectGif={handleSelectGif}
            onSelectSticker={handleSelectSticker}
          />
        )}
      </div>

      {/* Attachment sheet overlay */}
      {showAttachmentPicker && (
        <AttachmentPicker
          onClose={() => setShowAttachmentPicker(false)}
          onSelectShare={handleSelectShare}
          onSelectFiles={handleSelectFiles}
        />
      )}

      {/* Context Actions Menu Overlay */}
      {contextMenuMessage && contextMenuPosition && (
        <div
          className="fixed inset-0 z-50 bg-black/15 cursor-default"
          onClick={() => {
            setContextMenuMessage(null);
            setContextMenuPosition(null);
          }}
        >
          <div
            style={{
              position: "fixed",
              top: Math.min(contextMenuPosition.y, window.innerHeight - 340),
              left: Math.min(contextMenuPosition.x, window.innerWidth - 240),
            }}
            className="z-50 w-52 rounded-2xl bg-card border border-border/80 shadow-2xl p-1.5 flex flex-col gap-0.5 text-[14px]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Quick Reactions Grid */}
            <div className="flex justify-around border-b border-border/50 pb-2 mb-1.5 px-1 gap-1">
              {["👍", "❤️", "😂", "😮", "😢", "🙏"].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    handleToggleReaction(contextMenuMessage.id, emoji);
                    setContextMenuMessage(null);
                    setContextMenuPosition(null);
                  }}
                  className="text-lg hover:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setReplyMessage(contextMenuMessage);
                setContextMenuMessage(null);
                setContextMenuPosition(null);
              }}
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted text-start w-full text-foreground"
            >
              <MessageSquare className="size-4 text-muted-foreground" />
              <span>Reply</span>
            </button>

            <button
              onClick={() => {
                navigator.clipboard.writeText(contextMenuMessage.text || "");
                setContextMenuMessage(null);
                setContextMenuPosition(null);
              }}
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted text-start w-full text-foreground"
            >
              <Copy className="size-4 text-muted-foreground" />
              <span>Copy Text</span>
            </button>

            <button
              onClick={() => {
                handlePinMessage(contextMenuMessage);
                setContextMenuMessage(null);
                setContextMenuPosition(null);
              }}
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted text-start w-full text-foreground"
            >
              <Pin className="size-4 text-muted-foreground rotate-45" />
              <span>{contextMenuMessage.pinned ? "Unpin Message" : "Pin Message"}</span>
            </button>

            <button
              onClick={() => {
                setForwardingMessage(contextMenuMessage);
                fetchForwardChannels();
                setShowForwardDialog(true);
                setContextMenuMessage(null);
                setContextMenuPosition(null);
              }}
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted text-start w-full text-foreground"
            >
              <Share2 className="size-4 text-muted-foreground" />
              <span>Forward</span>
            </button>

            <button
              onClick={() => {
                setIsSelectionMode(true);
                setSelectedMessageIds([contextMenuMessage.id]);
                setContextMenuMessage(null);
                setContextMenuPosition(null);
              }}
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted text-start w-full text-foreground"
            >
              <Check className="size-4 text-muted-foreground" />
              <span>Select Message</span>
            </button>

            {contextMenuMessage.user?.id === loggedInUser.id && (
              <>
                <button
                  onClick={() => {
                    setEditingMessage(contextMenuMessage);
                    setInputText(contextMenuMessage.text || "");
                    textareaRef.current?.focus();
                    setContextMenuMessage(null);
                    setContextMenuPosition(null);
                  }}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted text-start w-full text-foreground"
                >
                  <Edit2 className="size-4 text-muted-foreground" />
                  <span>Edit Message</span>
                </button>

                <button
                  onClick={() => {
                    handleDeleteMessage(contextMenuMessage.id);
                    setContextMenuMessage(null);
                    setContextMenuPosition(null);
                  }}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-red-500/10 text-red-500 text-start w-full font-medium"
                >
                  <Trash2 className="size-4 text-red-500" />
                  <span>Delete</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Forward Message Selector Dialog (Slide-in from Right Side) */}
      <AnimatePresence>
        {showForwardDialog && forwardingMessage && (
          <div className="chat-area-overlay fixed inset-0 z-50 overflow-hidden flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowForwardDialog(false);
                setForwardingMessage(null);
                setForwardSearchQuery("");
              }}
              className="absolute inset-0 bg-black/60 backdrop-blur-[1px]"
            />
            {/* Right Side Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 350, damping: 35 }}
              className="relative z-50 bg-[#121212] border-l border-zinc-800/60 h-full w-full max-w-md flex flex-col gap-4 pb-8 pt-6 px-6 select-none"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Panel */}
              <div className="relative border-b border-zinc-800/40 pb-4 flex items-center justify-between shrink-0">
                <span className="font-black text-white text-[17px] tracking-wide">Forward Message</span>
                <button
                  onClick={() => {
                    setShowForwardDialog(false);
                    setForwardingMessage(null);
                    setForwardSearchQuery("");
                  }}
                  className="rounded-full p-1.5 hover:bg-zinc-800/60 text-zinc-300 transition-colors"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Search bar inside forward panel */}
              <div className="relative w-full shrink-0">
                <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search chats"
                  value={forwardSearchQuery}
                  onChange={(e) => setForwardSearchQuery(e.target.value)}
                  className="w-full bg-[#262626] border border-transparent rounded-xl py-2.5 pl-10 pr-4 text-[14px] text-white placeholder:text-zinc-500 outline-none focus:border-zinc-700 transition-colors"
                />
              </div>

              {/* Channels List */}
              <div className="max-h-[300px] overflow-y-auto flex flex-col gap-2 scrollbar-none pr-1">
                {filteredForwardChannels.length > 0 ? (
                  filteredForwardChannels.map((c) => {
                    const m = Object.values(c.state.members || {});
                    const other = m.find((member) => member.user?.id !== loggedInUser.id)?.user;
                    const name = c.data?.name || other?.name || "Chat Room";
                    const avatar = c.data?.image || other?.image;
                    const isGroupChat = c.data?.isGroup === true || m.length > 2;

                    return (
                      <button
                        key={c.id}
                        onClick={() => {
                          handleForwardToChannel(c);
                          setForwardSearchQuery("");
                        }}
                        className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/40 hover:bg-zinc-800/40 border border-zinc-800/40 text-start w-full transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          {avatar ? (
                            <UserAvatar avatarUrl={avatar as string | undefined} size={36} className="size-9 rounded-full" />
                          ) : isGroupChat ? (
                            <div className="size-9 rounded-full bg-[#48bb78] flex items-center justify-center text-xs font-bold text-white uppercase">
                              {(name || "G").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
                            </div>
                          ) : (
                            <UserAvatar avatarUrl={undefined} size={36} className="size-9 rounded-full" />
                          )}
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-white truncate max-w-[200px]">{name}</span>
                            <span className="text-xs text-zinc-500">{isGroupChat ? `${m.length} members` : "chat"}</span>
                          </div>
                        </div>
                        <div className="size-5 rounded-full border border-zinc-700 group-hover:border-zinc-500 flex items-center justify-center">
                          <Check className="size-3 text-[#0095f6] hidden group-hover:block" />
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="flex h-24 items-center justify-center text-xs text-zinc-550">
                    No active chats found.
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {mounted && (
        createPortal(
          <AnimatePresence>
            {moreOptionsMessage && (
              <div className="fixed inset-0 z-50 overflow-hidden flex flex-col justify-end">
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setMoreOptionsMessage(null)}
                  className="fixed inset-0 bg-black/60 backdrop-blur-[1px]"
                />
                {/* Drawer */}
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 250 }}
                  className="relative z-50 bg-[#1c222b] border-t border-[#262626] rounded-t-3xl pb-8 pt-4 px-6 flex flex-col items-center gap-4 max-w-md mx-auto w-full"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Drag Handle */}
                  <div className="w-12 h-1 bg-zinc-700 rounded-full mb-1 shrink-0" />
                  
                  {/* Message Time Header */}
                  <div className="text-[15px] font-bold text-zinc-400 select-none">
                    {new Date(moreOptionsMessage.created_at || (moreOptionsMessage as any).createdAt || Date.now()).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </div>

                  {/* Options */}
                  <div className="w-full flex flex-col gap-2">
                    <button
                      onClick={() => {
                        handlePinMessage(moreOptionsMessage);
                        setMoreOptionsMessage(null);
                      }}
                      className="w-full py-3.5 bg-zinc-800/60 hover:bg-zinc-800 rounded-xl text-center font-bold text-white text-[15px] transition-colors"
                    >
                      {moreOptionsMessage.pinned ? "Unpin Message" : "Pin Message"}
                    </button>

                    <button
                      onClick={() => {
                        handleDeleteMessage(moreOptionsMessage.id);
                        setMoreOptionsMessage(null);
                      }}
                      className="w-full py-3.5 bg-red-500/10 hover:bg-red-500/20 rounded-xl text-center font-bold text-red-500 text-[15px] transition-colors"
                    >
                      Delete for you
                    </button>

                    <button
                      onClick={() => setMoreOptionsMessage(null)}
                      className="w-full py-3.5 bg-transparent hover:bg-zinc-850 rounded-xl text-center font-bold text-zinc-400 text-[15px] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              </div>
            )}

            {/* Group Details Profile Overlay (within chat area) */}
            {showGroupProfile && (
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 380, damping: 36 }}
                className="chat-area-overlay fixed inset-0 z-50 flex flex-col bg-[#121212] text-white overflow-y-auto select-none"
              >
                {/* Header panel */}
                <div className="flex h-12 items-center justify-between px-4 shrink-0 mt-2">
                  <button
                    onClick={() => setShowGroupProfile(false)}
                    className="rounded-full p-2 hover:bg-zinc-800/60 text-zinc-300 transition-colors"
                  >
                    <ArrowLeft className="size-6" />
                  </button>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setShowGroupEditPage(true)}
                      className="rounded-full p-2 hover:bg-zinc-800/60 text-zinc-300 transition-colors"
                    >
                      <Edit2 className="size-[20px]" />
                    </button>
                    <button className="rounded-full p-2 hover:bg-zinc-800/60 text-zinc-300 transition-colors">
                      <MoreVertical className="size-[20px]" />
                    </button>
                  </div>
                </div>

                {/* Group profile center details (Moved Up) */}
                <div className="flex flex-col items-center pt-0 pb-3 px-6 text-center shrink-0">
                  {/* Large Avatar */}
                  <div className="size-[100px] rounded-full flex items-center justify-center text-4xl font-bold text-white bg-[#48bb78] border border-zinc-800/60 shadow-lg select-none">
                    {(displayName || "G").slice(0, 2).toUpperCase()}
                  </div>
                  {/* Display Name */}
                  <h3 className="mt-3 text-xl font-bold tracking-tight text-white">{displayName}</h3>
                  {/* Member count */}
                  <p className="text-sm text-zinc-400 mt-1">{members.length} members</p>
                </div>

                {/* Action button cards (Reduced gap / padding) */}
                <div className="px-3 py-2 shrink-0">
                  <div className="grid grid-cols-4 gap-3">
                    {/* Message */}
                    <button
                      onClick={() => setShowGroupProfile(false)}
                      className="flex flex-col items-center justify-center bg-[#1c1c1e] hover:bg-zinc-850 rounded-[16px] py-3.5 transition-colors shadow-sm cursor-pointer"
                    >
                      <MessageSquare className="size-[20px] text-zinc-300" />
                      <span className="text-[11px] font-semibold text-zinc-400 mt-1.5">Message</span>
                    </button>

                    {/* Mute */}
                    <div className="relative">
                      <button
                        onClick={() => setShowMuteDropdown(!showMuteDropdown)}
                        className="flex flex-col items-center justify-center w-full bg-[#1c1c1e] hover:bg-zinc-850 rounded-[16px] py-3.5 transition-colors shadow-sm cursor-pointer"
                      >
                        {isSoundMuted ? (
                          <BellOff className="size-[20px] text-zinc-300" />
                        ) : (
                          <Bell className="size-[20px] text-zinc-300" />
                        )}
                        <span className="text-[11px] font-semibold text-zinc-400 mt-1.5">
                          {isSoundMuted ? "Unmute" : "Mute"}
                        </span>
                      </button>

                      {/* Mute Dropdown Popover */}
                      <AnimatePresence>
                        {showMuteDropdown && (
                          <>
                            {/* Transparent backdrop for dismissal */}
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setShowMuteDropdown(false)}
                            />
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: 10 }}
                              className="absolute top-full mt-2 left-0 z-50 w-48 rounded-xl bg-[#1c222b] border border-[#262626] shadow-2xl p-1.5 flex flex-col gap-0.5"
                            >
                              <button
                                onClick={() => {
                                  setShowMuteDropdown(false);
                                  const nextState = !isSoundMuted;
                                  setIsSoundMuted(nextState);
                                  if (nextState) {
                                    setNotificationBanner({ text: "Notifications muted.", icon: "muted" });
                                  } else {
                                    setNotificationBanner({ text: "You will receive notifications with sound.", icon: "sound" });
                                  }
                                  setTimeout(() => setNotificationBanner(null), 3000);
                                }}
                                className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg hover:bg-zinc-800/60 text-start w-full text-sm text-zinc-300 hover:text-white"
                              >
                                {isSoundMuted ? (
                                  <>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="size-4 shrink-0 text-zinc-400">
                                      <path d="M9 18V5l12-2v13" />
                                      <circle cx="6" cy="18" r="3" />
                                      <circle cx="18" cy="16" r="3" />
                                    </svg>
                                    <span>Enable sound</span>
                                  </>
                                ) : (
                                  <>
                                    <VolumeX className="size-4 shrink-0 text-zinc-400" />
                                    <span>Disable sound</span>
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  setShowMuteDropdown(false);
                                  setShowMuteForDrawer(true);
                                }}
                                className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg hover:bg-zinc-800/60 text-start w-full text-sm text-zinc-300 hover:text-white"
                              >
                                <BellOff className="size-4 shrink-0 text-zinc-400" />
                                <span>Mute for...</span>
                              </button>
                              <button
                                onClick={() => {
                                  setShowMuteDropdown(false);
                                  setShowCustomNotificationsPage(true);
                                }}
                                className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg hover:bg-zinc-800/60 text-start w-full text-sm text-zinc-300 hover:text-white"
                              >
                                <svg className="size-4 shrink-0 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" /></svg>
                                <span>Customize</span>
                              </button>
                              <button
                                onClick={() => {
                                  setShowMuteDropdown(false);
                                  setIsSoundMuted(true);
                                  setNotificationBanner({ text: "Notifications muted.", icon: "muted" });
                                  setTimeout(() => setNotificationBanner(null), 3000);
                                }}
                                className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg hover:bg-zinc-800/60 text-start w-full text-sm text-red-500 font-medium"
                              >
                                <VolumeX className="size-4 shrink-0 text-red-500" />
                                <span className="text-red-500">Mute Forever</span>
                              </button>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Video Chat */}
                    <button
                      onClick={() => setShowVideoChatDrawer(true)}
                      className="flex flex-col items-center justify-center bg-[#1c1c1e] hover:bg-zinc-850 rounded-[16px] py-3.5 transition-colors shadow-sm cursor-pointer"
                    >
                      <svg className="size-[20px] text-zinc-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 5v14M18 9v6M6 9v6" />
                      </svg>
                      <span className="text-[11px] font-semibold text-zinc-400 mt-1.5">Video Chat</span>
                    </button>

                    {/* Leave */}
                    <button
                      onClick={() => setShowLeaveGroupDialog(true)}
                      className="flex flex-col items-center justify-center bg-[#1c1c1e] hover:bg-zinc-850 rounded-[16px] py-3.5 transition-colors shadow-sm cursor-pointer"
                    >
                      <LogOut className="size-[20px] text-zinc-300" />
                      <span className="text-[11px] font-semibold text-zinc-400 mt-1.5">Leave</span>
                    </button>
                  </div>
                </div>

                {/* Main Body Section (Reduced Gap / Tighter Padding) */}
                <div className="px-3 pb-6 shrink-0">
                  <div className="bg-[#1c1c1e] rounded-[20px] overflow-hidden border border-zinc-800/30">
                    {/* Add Members Row */}
                    <button
                      onClick={() => {
                        toast({ description: "Add Members clicked" });
                      }}
                      className="flex items-center gap-3 px-3.5 py-3 w-full hover:bg-zinc-800/40 text-start transition-colors border-b border-zinc-800/40"
                    >
                      <UserPlus className="size-6 text-zinc-400 shrink-0" />
                      <span className="text-[15px] font-semibold text-white">Add Members</span>
                    </button>

                    {/* Members List (Avatars size increased to 48px) */}
                    <div className="flex flex-col">
                      {members.map((member: any) => {
                        const user = member.user;
                        if (!user) return null;
                        const isOnline = user.online;
                        
                        // Rule: Check if the user is the actual creator (Omkar only)
                        const isOwner = user.name?.toLowerCase().includes("omkar") ||
                                        user.username?.toLowerCase().includes("omkar");

                        return (
                          <div
                            key={user.id}
                            className="flex items-center justify-between px-3.5 py-3 hover:bg-zinc-800/20 transition-colors border-b border-zinc-800/20 last:border-b-0"
                          >
                            <div className="flex items-center gap-3">
                              <UserAvatar avatarUrl={user.image} size={48} className="size-[48px] border-none rounded-full bg-zinc-700 shrink-0" />
                              <div className="flex flex-col text-start">
                                <span className="text-[15px] font-semibold text-white">{user.name || user.username}</span>
                                {isOnline ? (
                                  <span className="text-xs text-[#0095f6] font-semibold mt-0.5">online</span>
                                ) : (
                                  <span className="text-xs text-zinc-500 mt-0.5">last seen a long time ago</span>
                                )}
                              </div>
                            </div>
                            
                            {isOwner && (
                              <span className="bg-[#8a2be2]/20 border border-[#8a2be2]/40 text-[#d8b4fe] px-2.5 py-0.5 rounded-[12px] text-[11px] font-semibold select-none shadow-sm shadow-purple-500/10 backdrop-blur-[2px]">
                                Owner
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <AnimatePresence>
                  {showVideoChatDrawer && (
                    <div className="fixed inset-0 z-[60] overflow-hidden flex flex-col justify-end">
                      {/* Script loader for standard lottie-player */}
                      <Script
                        src="https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js"
                        strategy="afterInteractive"
                      />
                      
                      {/* Drawer Backdrop */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowVideoChatDrawer(false)}
                        className="fixed inset-0 bg-black/70 backdrop-blur-[1px]"
                      />
                      {/* Drawer Body */}
                      <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 26, stiffness: 220 }}
                        className="relative z-50 bg-[#1c222b] border-t border-[#262626] rounded-t-3xl pb-8 pt-4 px-6 flex flex-col items-center max-w-md mx-auto w-full"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Drag Handle */}
                        <div className="w-12 h-1 bg-zinc-700 rounded-full mb-4 shrink-0" />

                        {/* Animated Lottie Emoji / Sound Wave */}
                        <div className="relative flex flex-col items-center justify-center w-full py-2 bg-transparent min-h-[120px]">
                          {isClient ? (
                            <>
                              {/* @ts-ignore */}
                              <lottie-player
                                src="https://assets2.lottiefiles.com/packages/lf20_myejig9g.json"
                                background="transparent"
                                speed="1"
                                style={{ width: "160px", height: "110px" }}
                                loop
                                autoplay
                              />
                            </>
                          ) : (
                            <div className="w-[160px] h-[110px] bg-transparent flex items-center justify-center">
                              <span className="text-4xl animate-bounce">🎧</span>
                            </div>
                          )}
                        </div>

                        {/* Text description */}
                        <h4 className="text-xl font-bold text-white mt-2">Video Chat</h4>
                        
                        <div className="text-start mt-2 px-2 max-h-[160px] overflow-y-auto scrollbar-none">
                          <p className="text-[13px] text-zinc-300 leading-relaxed font-normal">
                            Video chats on the platform refer to both 1-on-1 video calls and large-scale, interactive broadcasts hosted within channels and groups. The feature is highly interactive, secure, and packed with multitasking capabilities.
                          </p>
                          <h5 className="text-[13px] font-bold text-white mt-2.5">Key features include:</h5>
                          <ul className="text-[12px] text-zinc-400 space-y-1 mt-1 leading-normal list-disc pl-4">
                            <li><strong className="text-zinc-350">1-on-1 Video Calls:</strong> Direct, end-to-end encrypted conversations that allow you to toggle the camera on or off at any time.</li>
                            <li><strong className="text-zinc-350">Group Video Chats:</strong> Any group voice chat can seamlessly transform into a video call, accommodating up to 30 simultaneous video participants and up to 1,000 viewers in listen-and-watch mode.</li>
                            <li><strong className="text-zinc-350">Screen Sharing:</strong> Users can share their device screens (with or without audio) during video chats, making it a great tool for presentations, meetings, or group study sessions.</li>
                            <li><strong className="text-zinc-350">Multitasking:</strong> The app supports picture-in-picture mode, which lets you browse other chats or navigate your phone while your call continues in a floating, resizable window.</li>
                          </ul>
                        </div>

                        {/* displayed as */}
                        <div className="w-full text-start mt-4 px-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">You will be displayed as</span>
                          <p className="text-[11px] text-zinc-400 mt-1 leading-normal">
                            In a video chat, how you are displayed depends entirely on who you are talking to and whether you are joining as an individual or an admin.
                          </p>
                          
                          <div className="flex flex-col gap-1.5 mt-2.5 text-[11.5px] text-zinc-400 pl-1 leading-relaxed mb-3">
                            <div>
                              <span className="text-zinc-300 font-bold">1. In 1-on-1 Video Calls:</span>
                              <ul className="list-disc pl-4 mt-0.5 space-y-0.5">
                                <li><strong className="text-zinc-350">For Saved Contacts:</strong> If the other person has your phone number saved in their address book, they will see you by the name they saved you as.</li>
                                <li><strong className="text-zinc-350">For Non-Contacts / Strangers:</strong> Otherwise, they will see the custom profile name you set.</li>
                              </ul>
                            </div>
                            <div>
                              <span className="text-zinc-300 font-bold">2. In Group Video Chats & Live Streams:</span>
                              <p className="mt-0.5">When you join a larger chat, it gives you privacy choices:</p>
                              <ul className="list-disc pl-4 mt-0.5 space-y-0.5">
                                <li><strong className="text-zinc-350">Personal Account:</strong> Join with your profile name and picture.</li>
                                <li><strong className="text-zinc-350">Channel (Anonymity):</strong> Join as your Channel to hide your identity.</li>
                              </ul>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 mt-2">
                            {/* User details row */}
                            <div 
                              onClick={() => setVideoJoinAsPersonal(true)}
                              className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
                                videoJoinAsPersonal ? "bg-zinc-900/40 border border-zinc-800/40" : "bg-zinc-900/10 border border-zinc-800/20"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <UserAvatar avatarUrl={loggedInUser.avatarUrl} size={36} className="size-9 rounded-full" />
                                <div className="flex flex-col text-start leading-tight">
                                  <span className="text-sm font-semibold text-white uppercase">{loggedInUser.displayName || loggedInUser.username}</span>
                                  <span className="text-xs text-zinc-500 mt-0.5">personal account</span>
                                </div>
                              </div>
                              <div className={`size-5 rounded-full border flex items-center justify-center transition-colors ${
                                videoJoinAsPersonal ? "border-[#0095f6] bg-[#0095f6]" : "border-zinc-700 bg-transparent"
                              }`}>
                                {videoJoinAsPersonal && <Check className="size-3 text-white stroke-[3px]" />}
                              </div>
                            </div>

                            {/* Group details row */}
                            <div 
                              onClick={() => setVideoJoinAsPersonal(false)}
                              className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
                                !videoJoinAsPersonal ? "bg-zinc-900/40 border border-zinc-800/40" : "bg-zinc-900/10 border border-zinc-800/20"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="size-9 rounded-full bg-[#48bb78] flex items-center justify-center text-xs font-bold text-white uppercase">
                                  {(displayName || "G").slice(0, 2).toUpperCase()}
                                </div>
                                <div className="flex flex-col text-start leading-tight">
                                  <span className="text-sm font-semibold text-zinc-400">{displayName}</span>
                                  <span className="text-xs text-zinc-500 mt-0.5">{members.length} members</span>
                                </div>
                              </div>
                              <div className={`size-5 rounded-full border flex items-center justify-center transition-colors ${
                                !videoJoinAsPersonal ? "border-[#0095f6] bg-[#0095f6]" : "border-zinc-700 bg-transparent"
                              }`}>
                                {!videoJoinAsPersonal && <Check className="size-3 text-white stroke-[3px]" />}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* CTA Buttons */}
                        <div className="w-full flex flex-col gap-3 mt-6">
                          <button
                            onClick={() => {
                              setShowVideoChatDrawer(false);
                              setShowVideoCallSheet(true);
                              setIsVideoCallFullscreen(false);
                              setIsVideoCallPiP(false);
                            }}
                            className="w-full py-3.5 bg-[#0095f6] hover:bg-[#1a9bf0] rounded-xl text-center font-bold text-white text-[15px] transition-colors shadow-md"
                          >
                            Start Video Chat
                          </button>
                          
                          <button
                            onClick={() => {
                              setShowVideoChatDrawer(false);
                              setShowScheduleDrawer(true);
                            }}
                            className="w-full py-2.5 bg-transparent hover:bg-zinc-800/30 rounded-xl text-center font-bold text-[#0095f6] text-[14px] transition-colors"
                          >
                            Schedule Video Chat
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>

                {/* Mute notifications for... Scroll Wheel Drawer */}
                <AnimatePresence>
                  {showMuteForDrawer && (
                    <div className="fixed inset-0 z-[60] overflow-hidden flex flex-col justify-end">
                      {/* Drawer Backdrop */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowMuteForDrawer(false)}
                        className="fixed inset-0 bg-black/70 backdrop-blur-[1px]"
                      />
                      {/* Drawer Body */}
                      <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 220 }}
                        className="relative z-50 bg-[#1c222b] border-t border-[#262626] rounded-t-3xl pb-8 pt-4 px-6 flex flex-col items-center max-w-md mx-auto w-full select-none"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Drag Handle */}
                        <div className="w-12 h-1 bg-zinc-750 rounded-full mb-4 shrink-0" />

                        {/* Bell Notification Icon */}
                        <div className="size-12 rounded-full bg-[#2a87d0]/10 border border-[#2a87d0]/20 flex items-center justify-center text-[#2a87d0] mt-1">
                          <Bell className="size-6 text-[#2a87d0] fill-[#2a87d0]/15" />
                        </div>

                        {/* Title text */}
                        <h4 className="text-[17px] font-bold text-white text-center mt-3">Mute notifications for...</h4>

                        {/* Scroll Picker Drum Layout */}
                        <div className="relative w-full h-[200px] my-4 flex flex-col items-center justify-center overflow-hidden">
                          {/* Top and Bottom Horizontal Borders for Selection indicator */}
                          <div className="absolute left-0 right-0 top-[78px] h-[44px] border-y-2 border-[#0095f6] pointer-events-none" />
                          
                          {/* Scroll Container */}
                          <div
                            onScroll={(e) => {
                              const container = e.currentTarget;
                              const scrollTop = container.scrollTop;
                              const idx = Math.round(scrollTop / 44);
                              const list = ["30 minutes", "1 hour", "2 hours", "4 hours", "8 hours", "1 day", "2 days"];
                              if (idx >= 0 && idx < list.length) {
                                setSelectedMuteDuration(list[idx]);
                              }
                            }}
                            className="w-full h-full overflow-y-auto snap-y snap-mandatory scrollbar-none flex flex-col py-[78px] items-center text-center"
                          >
                            {["30 minutes", "1 hour", "2 hours", "4 hours", "8 hours", "1 day", "2 days"].map((duration) => {
                              const isSelected = selectedMuteDuration === duration;
                              return (
                                <div
                                  key={duration}
                                  onClick={(e) => {
                                    setSelectedMuteDuration(duration);
                                    const list = ["30 minutes", "1 hour", "2 hours", "4 hours", "8 hours", "1 day", "2 days"];
                                    const idx = list.indexOf(duration);
                                    e.currentTarget.parentElement?.scrollTo({
                                      top: idx * 44,
                                      behavior: "smooth"
                                    });
                                  }}
                                  className={`snap-center h-[44px] flex-shrink-0 flex items-center justify-center cursor-pointer transition-all duration-150 ${
                                    isSelected ? "text-white font-bold text-base scale-105" : "text-zinc-550 text-sm opacity-55"
                                  }`}
                                >
                                  {duration}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Confirm Button */}
                        <button
                          onClick={() => {
                            setShowMuteForDrawer(false);
                            setIsSoundMuted(true);
                            setNotificationBanner({ text: "Notifications muted.", icon: "muted" });
                            setTimeout(() => setNotificationBanner(null), 3000);
                          }}
                          className="w-full py-3.5 bg-[#0095f6] hover:bg-[#1a9bf0] rounded-xl text-center font-bold text-white text-[15px] transition-colors shadow-md mt-2"
                        >
                          Confirm
                        </button>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>

                {/* Custom Notifications Page (Slides in from right side fullscreen) */}
                <AnimatePresence>
                  {showCustomNotificationsPage && (
                    <motion.div
                      initial={{ x: "100%" }}
                      animate={{ x: 0 }}
                      exit={{ x: "100%" }}
                      transition={{ type: "spring", stiffness: 350, damping: 35 }}
                      className="fixed inset-0 z-[70] flex flex-col bg-[#121212] text-white w-full h-full overflow-y-auto select-none pt-[env(safe-area-inset-top,20px)] pb-[env(safe-area-inset-bottom,20px)]"
                    >
                      {/* Header panel */}
                      <div className="flex h-14 items-center gap-3 px-4 shrink-0 border-b border-zinc-800/40">
                        <button
                          onClick={() => setShowCustomNotificationsPage(false)}
                          className="rounded-full p-1.5 hover:bg-zinc-800/60 text-zinc-300 transition-colors"
                        >
                          <ArrowLeft className="size-6" />
                        </button>
                        <div className="size-9 rounded-full bg-[#48bb78] flex items-center justify-center text-xs font-bold text-white uppercase shrink-0">
                          {(displayName || "G").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col text-start leading-tight">
                          <span className="text-sm font-semibold text-white truncate max-w-[200px]">{displayName}</span>
                          <span className="text-[11px] text-zinc-400">Custom Notifications</span>
                        </div>
                      </div>

                      {/* Config Scrollable List */}
                      <div className="flex-1 py-4 overflow-y-auto space-y-6">
                        {/* Section 1: General */}
                        <div>
                          <span className="text-[#0095f6] text-[11px] font-bold uppercase tracking-wider mb-2 block px-4">General</span>
                          
                          <div className="bg-[#1c1c1e] rounded-xl mx-4 overflow-hidden border border-zinc-800/20 divide-y divide-zinc-850">
                            {/* Show Message Previews */}
                            <div className="flex items-center justify-between px-4 py-3.5">
                              <span className="text-sm text-zinc-200">Show Message Previews</span>
                              <button
                                onClick={() => {
                                  const next = !showPreviews;
                                  setShowPreviews(next);
                                  localStorage.setItem("show-previews-" + channel.id, next ? "true" : "false");
                                }}
                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                  showPreviews ? "bg-[#0095f6]" : "bg-zinc-700"
                                }`}
                              >
                                <span
                                  className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                    showPreviews ? "translate-x-5" : "translate-x-0"
                                  }`}
                                />
                              </button>
                            </div>

                            {/* Sound */}
                            <div
                              onClick={() => setShowSoundPage(true)}
                              className="flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-zinc-800/20"
                            >
                              <span className="text-sm text-zinc-200">Sound</span>
                              <span className="text-sm text-[#0095f6]">{selectedSound}</span>
                            </div>

                            {/* Vibrate */}
                            <div
                              onClick={() => setShowVibrateModal(true)}
                              className="flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-zinc-800/20"
                            >
                              <span className="text-sm text-zinc-200">Vibrate</span>
                              <span className="text-sm text-[#0095f6]">{vibrateVal}</span>
                            </div>

                            {/* Smart Notifications */}
                            <div
                              onClick={() => setShowSmartSheet(true)}
                              className="flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-zinc-800/20"
                            >
                              <span className="text-sm text-zinc-200">Smart Notifications</span>
                              <span className="text-sm text-[#0095f6] font-semibold">{smartNotificationsVal}</span>
                            </div>

                            {/* Priority */}
                            <div
                              onClick={() => setShowPriorityModal(true)}
                              className="flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-zinc-800/20"
                            >
                              <span className="text-sm text-zinc-200">Priority</span>
                              <span className="text-sm text-[#0095f6]">{priorityVal}</span>
                            </div>
                          </div>
                          <span className="text-zinc-500 text-xs px-4 mt-2 block leading-normal">
                            Higher priority notifications will work even in Do Not Disturb mode.
                          </span>
                        </div>

                        {/* Section 2: Popup notifications */}
                        <div>
                          <span className="text-[#0095f6] text-[11px] font-bold uppercase tracking-wider mb-2 block px-4">Popup notifications</span>
                          
                          <div className="bg-[#1c1c1e] rounded-xl mx-4 overflow-hidden border border-zinc-800/20 divide-y divide-zinc-850">
                            {/* Enabled */}
                            <button
                              onClick={() => {
                                setPopupNotificationsVal("Enabled");
                                localStorage.setItem("popup-" + channel.id, "Enabled");
                              }}
                              className="flex items-center justify-between px-4 py-3.5 w-full text-start hover:bg-zinc-800/20 transition-colors"
                            >
                              <span className="text-sm text-zinc-200">Enabled</span>
                              <div className={`size-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                popupNotificationsVal === "Enabled" ? "border-[#0095f6] bg-[#0095f6]" : "border-zinc-700 bg-transparent"
                              }`}>
                                {popupNotificationsVal === "Enabled" && <Check className="size-3 text-white stroke-[3px]" />}
                              </div>
                            </button>

                            {/* Disabled */}
                            <button
                              onClick={() => {
                                setPopupNotificationsVal("Disabled");
                                localStorage.setItem("popup-" + channel.id, "Disabled");
                              }}
                              className="flex items-center justify-between px-4 py-3.5 w-full text-start hover:bg-zinc-800/20 transition-colors"
                            >
                              <span className="text-sm text-zinc-200">Disabled</span>
                              <div className={`size-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                popupNotificationsVal === "Disabled" ? "border-[#0095f6] bg-[#0095f6]" : "border-zinc-700 bg-transparent"
                              }`}>
                                {popupNotificationsVal === "Disabled" && <Check className="size-3 text-white stroke-[3px]" />}
                              </div>
                            </button>
                          </div>
                          <span className="text-zinc-500 text-xs px-4 mt-2 block leading-normal">
                            New messages from this contact will appear on your screen when you are not using Telegram.
                          </span>
                        </div>

                        {/* Section 3: Light */}
                        <div>
                          <span className="text-[#0095f6] text-[11px] font-bold uppercase tracking-wider mb-2 block px-4">Light</span>
                          
                          <div className="bg-[#1c1c1e] rounded-xl mx-4 overflow-hidden border border-zinc-800/20">
                            {/* Color */}
                            <div className="flex items-center justify-between px-4 py-3.5">
                              <span className="text-sm text-zinc-200">Color</span>
                              <div className="size-5 rounded-full bg-[#0095f6] shadow-md border border-[#0095f6]/30 cursor-pointer" />
                            </div>
                          </div>
                          <span className="text-zinc-500 text-xs px-4 mt-2 block leading-normal">
                            Blinking light used to indicate new messages on some devices.
                          </span>
                        </div>

                        {/* Reset to Default */}
                        <div className="px-4">
                          <button
                            onClick={() => {
                              setShowPreviews(true);
                              setSelectedSound("Default");
                              setVibrateVal("Default");
                              setSmartTimes("2 times");
                              setSmartMinutes("3 minutes");
                              setSmartNotificationsVal("2 / 3 minutes");
                              setPriorityVal("Same as in Settings");
                              setPopupNotificationsVal("Disabled");
                              setLightColorVal("#0095f6");
                              localStorage.removeItem("show-previews-" + channel.id);
                              localStorage.removeItem("sound-" + channel.id);
                              localStorage.removeItem("vibrate-" + channel.id);
                              localStorage.removeItem("smart-times-" + channel.id);
                              localStorage.removeItem("smart-minutes-" + channel.id);
                              localStorage.removeItem("priority-" + channel.id);
                              localStorage.removeItem("popup-" + channel.id);
                              localStorage.removeItem("light-color-" + channel.id);
                              toast({ description: "Settings reset to default." });
                              setShowCustomNotificationsPage(false);
                            }}
                            className="w-full bg-[#1c1c1e] hover:bg-zinc-800/60 rounded-xl py-3.5 text-center font-bold text-[#f87171] text-sm border border-zinc-800/20 transition-colors"
                          >
                            Reset to default settings
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Custom Notification Sound sub-page */}
                <AnimatePresence>
                  {showSoundPage && (
                    <motion.div
                      initial={{ x: "100%" }}
                      animate={{ x: 0 }}
                      exit={{ x: "100%" }}
                      transition={{ type: "spring", stiffness: 350, damping: 35 }}
                      className="fixed inset-0 z-[80] flex flex-col bg-[#121212] text-white w-full h-full overflow-y-auto select-none pt-[env(safe-area-inset-top,20px)] pb-[env(safe-area-inset-bottom,20px)]"
                    >
                      {/* Header panel */}
                      <div className="flex h-14 items-center gap-3 px-4 shrink-0 border-b border-zinc-800/40">
                        <button
                          onClick={() => setShowSoundPage(false)}
                          className="rounded-full p-1.5 hover:bg-zinc-800/60 text-zinc-300 transition-colors"
                        >
                          <ArrowLeft className="size-6" />
                        </button>
                        <div className="size-9 rounded-full bg-[#48bb78] flex items-center justify-center text-xs font-bold text-white uppercase shrink-0">
                          {(displayName || "G").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col text-start leading-tight">
                          <span className="text-sm font-semibold text-white truncate max-w-[200px]">{displayName}</span>
                          <span className="text-[11px] text-zinc-400">Notification Sound</span>
                        </div>
                      </div>

                      {/* Sound Options List */}
                      <div className="flex-1 py-4 overflow-y-auto space-y-6">
                        {/* Hidden Audio File Input */}
                        <input
                          type="file"
                          ref={audioInputRef}
                          onChange={handleAudioUpload}
                          accept="audio/*"
                          className="hidden"
                        />

                        {/* Section 1: Telegram Tones */}
                        <div>
                          <span className="text-[#0095f6] text-[11px] font-bold uppercase tracking-wider mb-2 block px-4">Telegram Tones</span>
                          
                          <div className="bg-[#1c1c1e] rounded-xl mx-4 overflow-hidden border border-zinc-800/20 divide-y divide-zinc-850">
                            {/* Upload sound row */}
                            <button
                              onClick={() => audioInputRef.current?.click()}
                              className="flex items-center gap-3 px-4 py-3.5 w-full text-start hover:bg-zinc-800/20 transition-colors text-[#0095f6] font-semibold text-sm"
                            >
                              <Plus className="size-4 shrink-0" />
                              <span>Upload sound</span>
                            </button>

                            {/* If custom sound is uploaded and selected, display it here */}
                            {selectedSound && ![
                              "Default",
                              "beak",
                              "bulb one",
                              "cough",
                              "croak",
                              "cuckoo",
                              "doub",
                              "flap",
                              "gargle",
                              "guiro",
                              "hum",
                              "lonba",
                              "No sound"
                            ].includes(selectedSound) && (
                              <button
                                onClick={() => {
                                  setSelectedSound(selectedSound);
                                  if (channel) {
                                    localStorage.setItem("sound-" + channel.id, selectedSound);
                                  }
                                }}
                                className="flex items-center justify-between px-4 py-3.5 w-full text-start hover:bg-zinc-800/20 transition-colors"
                              >
                                <span className="text-sm text-zinc-200">{selectedSound}</span>
                                <div className="size-5 rounded-full border-2 flex items-center justify-center border-[#0095f6] bg-[#0095f6]">
                                  <Check className="size-3 text-white stroke-[3px]" />
                                </div>
                              </button>
                            )}
                          </div>
                          <span className="text-zinc-500 text-xs px-4 mt-2 block leading-normal">
                            You can upload custom notification sounds from your internal storage.
                          </span>
                        </div>

                        {/* Section 2: System Tones */}
                        <div>
                          <span className="text-[#0095f6] text-[11px] font-bold uppercase tracking-wider mb-2 block px-4">System Tones</span>
                          
                          <div className="bg-[#1c1c1e] rounded-xl mx-4 overflow-hidden border border-zinc-800/20 divide-y divide-zinc-850">
                            {[
                              "Default",
                              "beak",
                              "bulb one",
                              "cough",
                              "croak",
                              "cuckoo",
                              "doub",
                              "flap",
                              "gargle",
                              "guiro",
                              "hum",
                              "lonba",
                              "No sound"
                            ].map((tone) => {
                              const isSelected = selectedSound === tone;
                              return (
                                <button
                                  key={tone}
                                  onClick={() => {
                                    setSelectedSound(tone);
                                    if (channel) {
                                      localStorage.setItem("sound-" + channel.id, tone);
                                    }
                                    playToneSynth(tone);
                                  }}
                                  className="flex items-center justify-between px-4 py-3.5 w-full text-start hover:bg-zinc-800/20 transition-colors"
                                >
                                  <span className="text-sm text-zinc-200 capitalize">{tone}</span>
                                  <div className={`size-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                    isSelected ? "border-[#0095f6] bg-[#0095f6]" : "border-zinc-700 bg-transparent"
                                  }`}>
                                    {isSelected && <Check className="size-3 text-white stroke-[3px]" />}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Smart Notifications Frequency bottom sheet */}
                <AnimatePresence>
                  {showSmartSheet && (
                    <div className="fixed inset-0 z-[80] overflow-hidden flex flex-col justify-end">
                      {/* Sheet Backdrop */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowSmartSheet(false)}
                        className="fixed inset-0 bg-black/70 backdrop-blur-[1px]"
                      />
                      {/* Sheet Body */}
                      <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 220 }}
                        className="relative z-50 bg-[#1c222b] border-t border-[#262626] rounded-t-3xl pb-8 pt-4 px-6 flex flex-col items-start max-w-md mx-auto w-full select-none"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Drag Handle */}
                        <div className="w-12 h-1 bg-zinc-750 rounded-full mb-4 shrink-0 self-center" />

                        {/* Title */}
                        <h4 className="text-[17px] font-bold text-white text-left self-start mt-2">Notification frequency</h4>

                        {/* Dual Scroll Columns Picker */}
                        <div className="relative w-full h-[200px] my-4 flex items-center justify-center overflow-hidden">
                          {/* Selection indicator border */}
                          <div className="absolute left-0 right-0 top-[78px] h-[44px] border-y-2 border-[#0095f6] pointer-events-none" />

                          {/* Left Column: Times Picker */}
                          <div className="w-[45%] h-full relative overflow-hidden flex flex-col">
                            <div
                              ref={timesScrollRef}
                              onScroll={(e) => {
                                const container = e.currentTarget;
                                const scrollTop = container.scrollTop;
                                const idx = Math.round(scrollTop / 44);
                                const timesList = Array.from({ length: 10 }, (_, i) => `${i + 1} time${i > 0 ? "s" : ""}`);
                                if (idx >= 0 && idx < timesList.length) {
                                  setTempSmartTimes(timesList[idx]);
                                }
                              }}
                              className="w-full h-full overflow-y-auto snap-y snap-mandatory scrollbar-none flex flex-col py-[78px] text-center"
                            >
                              {Array.from({ length: 10 }, (_, i) => `${i + 1} time${i > 0 ? "s" : ""}`).map((t) => {
                                const isSelected = tempSmartTimes === t;
                                return (
                                  <div
                                    key={t}
                                    onClick={(e) => {
                                      setTempSmartTimes(t);
                                      const timesList = Array.from({ length: 10 }, (_, i) => `${i + 1} time${i > 0 ? "s" : ""}`);
                                      const idx = timesList.indexOf(t);
                                      e.currentTarget.parentElement?.scrollTo({
                                        top: idx * 44,
                                        behavior: "smooth"
                                      });
                                    }}
                                    className={`snap-center h-[44px] flex-shrink-0 flex items-center justify-center cursor-pointer transition-all duration-150 ${
                                      isSelected ? "text-white font-bold text-base scale-105" : "text-zinc-500 text-sm opacity-55"
                                    }`}
                                  >
                                    {t}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Center transition word: "in" */}
                          <div className="w-[10%] h-[44px] flex items-center justify-center text-zinc-400 text-sm font-semibold pointer-events-none">
                            in
                          </div>

                          {/* Right Column: Minutes Picker */}
                          <div className="w-[45%] h-full relative overflow-hidden flex flex-col">
                            <div
                              ref={minutesScrollRef}
                              onScroll={(e) => {
                                const container = e.currentTarget;
                                const scrollTop = container.scrollTop;
                                const idx = Math.round(scrollTop / 44);
                                const minutesList = [
                                  "1 minute", "2 minutes", "3 minutes", "4 minutes", "5 minutes",
                                  "10 minutes", "15 minutes", "30 minutes", "60 minutes"
                                ];
                                if (idx >= 0 && idx < minutesList.length) {
                                  setTempSmartMinutes(minutesList[idx]);
                                }
                              }}
                              className="w-full h-full overflow-y-auto snap-y snap-mandatory scrollbar-none flex flex-col py-[78px] text-center"
                            >
                              {[
                                "1 minute", "2 minutes", "3 minutes", "4 minutes", "5 minutes",
                                "10 minutes", "15 minutes", "30 minutes", "60 minutes"
                              ].map((m) => {
                                const isSelected = tempSmartMinutes === m;
                                return (
                                  <div
                                    key={m}
                                    onClick={(e) => {
                                      setTempSmartMinutes(m);
                                      const minutesList = [
                                        "1 minute", "2 minutes", "3 minutes", "4 minutes", "5 minutes",
                                        "10 minutes", "15 minutes", "30 minutes", "60 minutes"
                                      ];
                                      const idx = minutesList.indexOf(m);
                                      e.currentTarget.parentElement?.scrollTo({
                                        top: idx * 44,
                                        behavior: "smooth"
                                      });
                                    }}
                                    className={`snap-center h-[44px] flex-shrink-0 flex items-center justify-center cursor-pointer transition-all duration-150 ${
                                      isSelected ? "text-white font-bold text-base scale-105" : "text-zinc-500 text-sm opacity-55"
                                    }`}
                                  >
                                    {m}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Confirm Button */}
                        <button
                          onClick={() => {
                            setSmartTimes(tempSmartTimes);
                            setSmartMinutes(tempSmartMinutes);
                            const displayVal = `${tempSmartTimes.split(" ")[0]} / ${tempSmartMinutes}`;
                            setSmartNotificationsVal(displayVal);
                            if (channel) {
                              localStorage.setItem("smart-times-" + channel.id, tempSmartTimes);
                              localStorage.setItem("smart-minutes-" + channel.id, tempSmartMinutes);
                            }
                            setShowSmartSheet(false);
                          }}
                          className="w-full py-3.5 bg-[#0095f6] hover:bg-[#1a9bf0] rounded-xl text-center font-bold text-white text-[15px] transition-colors shadow-md mt-2"
                        >
                          Confirm
                        </button>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>

                {/* Vibrate Modal */}
                <AnimatePresence>
                  {showVibrateModal && (
                    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowVibrateModal(false)}
                        className="fixed inset-0 bg-black/80 backdrop-blur-[1px]"
                      />
                      <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 280 }}
                        className="relative z-50 bg-[#1c222b] border border-[#262626] rounded-[24px] max-w-xs w-full p-5 flex flex-col gap-4 text-start shadow-2xl"
                      >
                        <h4 className="text-[17px] font-bold text-white">Vibrate</h4>
                        
                        <div className="flex flex-col gap-1">
                          {["Default", "Short", "Long", "Disabled"].map((opt) => {
                            const isSelected = vibrateVal === opt;
                            return (
                              <button
                                key={opt}
                                onClick={() => {
                                  setVibrateVal(opt);
                                  if (channel) {
                                    localStorage.setItem("vibrate-" + channel.id, opt);
                                  }
                                  setShowVibrateModal(false);
                                }}
                                className="flex items-center gap-3 py-2.5 w-full text-start hover:bg-zinc-800/30 rounded-lg transition-colors"
                              >
                                <div className={`size-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                  isSelected ? "border-[#0095f6] bg-[#0095f6]" : "border-zinc-700 bg-transparent"
                                }`}>
                                  {isSelected && <Check className="size-3 text-white stroke-[3px]" />}
                                </div>
                                <span className="text-sm font-medium text-zinc-200">{opt}</span>
                              </button>
                            );
                          })}
                        </div>

                        <div className="flex justify-end mt-2">
                          <button
                            onClick={() => setShowVibrateModal(false)}
                            className="text-[#0095f6] text-[15px] font-bold hover:underline px-2 py-1"
                          >
                            Cancel
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>

                {/* Priority Modal */}
                <AnimatePresence>
                  {showPriorityModal && (
                    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowPriorityModal(false)}
                        className="fixed inset-0 bg-black/80 backdrop-blur-[1px]"
                      />
                      <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 280 }}
                        className="relative z-50 bg-[#1c222b] border border-[#262626] rounded-[24px] max-w-xs w-full p-5 flex flex-col gap-4 text-start shadow-2xl"
                      >
                        <h4 className="text-[17px] font-bold text-white">Priority</h4>
                        
                        <div className="flex flex-col gap-1">
                          {["Same as in Settings", "Low", "Medium", "High", "Urgent"].map((opt) => {
                            const isSelected = priorityVal === opt;
                            return (
                              <button
                                key={opt}
                                onClick={() => {
                                  setPriorityVal(opt);
                                  if (channel) {
                                    localStorage.setItem("priority-" + channel.id, opt);
                                  }
                                  setShowPriorityModal(false);
                                }}
                                className="flex items-center gap-3 py-2.5 w-full text-start hover:bg-zinc-800/30 rounded-lg transition-colors"
                              >
                                <div className={`size-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                  isSelected ? "border-[#0095f6] bg-[#0095f6]" : "border-zinc-700 bg-transparent"
                                }`}>
                                  {isSelected && <Check className="size-3 text-white stroke-[3px]" />}
                                </div>
                                <span className="text-sm font-medium text-zinc-200">{opt}</span>
                              </button>
                            );
                          })}
                        </div>

                        <div className="flex justify-end mt-2">
                          <button
                            onClick={() => setShowPriorityModal(false)}
                            className="text-[#0095f6] text-[15px] font-bold hover:underline px-2 py-1"
                          >
                            Cancel
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>

                {/* Leave Group Dialog (Modal Box) */}
                <AnimatePresence>
                  {showLeaveGroupDialog && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                      {/* Modal Backdrop */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowLeaveGroupDialog(false)}
                        className="fixed inset-0 bg-black/80 backdrop-blur-[1px]"
                      />
                      {/* Modal dialog box */}
                      <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 280 }}
                        className="relative z-50 bg-[#1c222b] border border-[#262626] rounded-[24px] max-w-sm w-full p-6 flex flex-col gap-4 text-start shadow-2xl"
                      >
                        {/* Title and group icon row */}
                        <div className="flex items-center gap-3">
                          <div className="size-[38px] rounded-full bg-[#48bb78] flex items-center justify-center text-sm font-bold text-white uppercase shrink-0">
                            {(displayName || "G").slice(0, 2).toUpperCase()}
                          </div>
                          <h4 className="text-[18px] font-bold text-white">Leave Group</h4>
                        </div>

                        {/* Confirmation text */}
                        <p className="text-[14px] text-zinc-300 leading-normal">
                          Are you sure you want to delete and leave the group <span className="font-bold text-white">{displayName}</span>?
                        </p>

                        {/* Delete for all checkbox (Only show if owner/admin) */}
                        <label className="flex items-center gap-3 cursor-pointer select-none py-1.5">
                          <input
                            type="checkbox"
                            checked={leaveDeleteForAll}
                            onChange={(e) => setLeaveDeleteForAll(e.target.checked)}
                            className="size-[18px] rounded border-zinc-700 bg-zinc-800 text-[#0095f6] focus:ring-0 focus:ring-offset-0"
                          />
                          <span className="text-sm text-zinc-300 font-medium">Delete the group for all members</span>
                        </label>

                        {/* Cancel / Delete Chat Actions */}
                        <div className="flex items-center justify-end gap-5 mt-2">
                          <button
                            onClick={() => {
                              setShowLeaveGroupDialog(false);
                            }}
                            className="text-[#0095f6] text-[15px] font-bold hover:underline"
                          >
                            Cancel
                          </button>
                          
                          <button
                            onClick={async () => {
                              setShowLeaveGroupDialog(false);
                              setShowGroupProfile(false);
                              toast({ description: "You left the group." });
                              try {
                                if (leaveDeleteForAll) {
                                  // delete group for all members
                                  await channel.delete();
                                } else {
                                  // leave group
                                  await channel.removeMembers([loggedInUser.id]);
                                }
                                setActiveChannel(null);
                                setMobileView("list");
                              } catch (err) {
                                console.error(err);
                              }
                            }}
                            className="text-[#f87171] text-[15px] font-bold hover:underline"
                          >
                            Delete chat
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>

                {/* Notification Toast Banner */}
                <AnimatePresence>
                  {notificationBanner && (
                    <motion.div
                      initial={{ opacity: 0, y: 50 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 50 }}
                      className="fixed bottom-10 left-4 right-4 z-[90] bg-[#1c222b] text-white py-3.5 px-4 rounded-xl flex items-center gap-3 shadow-2xl border border-zinc-800/80"
                    >
                      {notificationBanner.icon === "sound" ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="size-5 text-white">
                          <path d="M9 18V5l12-2v13" />
                          <circle cx="6" cy="18" r="3" />
                          <circle cx="18" cy="16" r="3" />
                        </svg>
                      ) : (
                        <BellOff className="size-5 text-white" />
                      )}
                      <span className="text-sm font-semibold tracking-wide">{notificationBanner.text}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Group Edit Page (within chat area) */}
            <AnimatePresence>
              {showGroupEditPage && (
                <motion.div
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "spring", stiffness: 380, damping: 36 }}
                  className="chat-area-overlay fixed inset-0 z-[70] flex flex-col bg-[#121212] text-white overflow-y-auto select-none"
                >
                  {/* Hidden File Input for Photo */}
                  <input
                    type="file"
                    ref={groupPhotoInputRef}
                    onChange={handleGroupPhotoUpload}
                    accept="image/*"
                    className="hidden"
                  />

                  {/* Top Header panel */}
                  <div className="flex h-14 items-center justify-between px-4 shrink-0 border-b border-zinc-800/40">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setShowGroupEditPage(false)}
                        className="rounded-full p-1.5 hover:bg-zinc-800/60 text-zinc-300 transition-colors"
                      >
                        <ArrowLeft className="size-6" />
                      </button>
                      <span className="text-lg font-bold text-white">Edit</span>
                    </div>
                    <button
                      onClick={async () => {
                        setShowGroupEditPage(false);
                        toast({ description: "Group settings saved successfully." });
                        if (channel && editGroupName.trim() !== "") {
                          try {
                            await channel.update({ name: editGroupName, description: editGroupDesc });
                          } catch (e) {
                            console.warn(e);
                          }
                        }
                      }}
                      className="rounded-full p-2 hover:bg-zinc-800/60 text-[#0095f6] transition-colors"
                    >
                      <Check className="size-6 stroke-[2.5]" />
                    </button>
                  </div>

                  {/* Main Form Body */}
                  <div className="flex-1 py-4 px-3 overflow-y-auto space-y-4">
                    {/* Top Group Info Card */}
                    <div className="bg-[#1c1c1e] rounded-[20px] p-4 border border-zinc-800/30 flex flex-col gap-4">
                      <div className="flex items-center gap-4">
                        {/* Avatar with Set Photo link */}
                        <div className="flex flex-col items-center gap-1 shrink-0">
                          <div 
                            onClick={() => groupPhotoInputRef.current?.click()}
                            className="relative size-16 rounded-full bg-[#0095f6] flex items-center justify-center text-xl font-bold text-white cursor-pointer hover:opacity-90 transition-opacity shadow-md overflow-hidden"
                          >
                            {editGroupPhotoUrl ? (
                              <img src={editGroupPhotoUrl} alt="Group" className="w-full h-full object-cover" />
                            ) : (
                              (editGroupName || displayName || "G").slice(0, 2).toUpperCase()
                            )}
                          </div>
                        </div>

                        {/* Name Input with underline & smiley */}
                        <div className="flex-1 flex flex-col justify-center">
                          <div className="relative flex items-center border-b border-[#0095f6] pb-1.5">
                            <input
                              type="text"
                              value={editGroupName}
                              onChange={(e) => setEditGroupName(e.target.value)}
                              placeholder="Group Name"
                              className="w-full bg-transparent text-base font-semibold text-white outline-none pr-7"
                            />
                            <Smile className="size-5 text-zinc-400 absolute right-0 shrink-0 cursor-pointer hover:text-white" />
                          </div>
                        </div>
                      </div>

                      {/* Set Photo Link Row */}
                      <button
                        onClick={() => groupPhotoInputRef.current?.click()}
                        className="flex items-center gap-2.5 text-[#0095f6] font-semibold text-sm hover:underline pt-1"
                      >
                        <div className="relative size-6 flex items-center justify-center">
                          <ImageIcon className="size-5 text-[#0095f6]" />
                          <Plus className="size-3 text-[#0095f6] absolute -top-1 -right-1 stroke-[3]" />
                        </div>
                        <span>Set Photo</span>
                      </button>

                      {/* Description Input */}
                      <div className="pt-2 border-t border-zinc-800/30">
                        <input
                          type="text"
                          value={editGroupDesc}
                          onChange={(e) => setEditGroupDesc(e.target.value)}
                          placeholder="Description (optional)"
                          className="w-full bg-transparent text-sm text-zinc-300 placeholder:text-zinc-500 outline-none"
                        />
                      </div>
                    </div>

                    {/* Group Settings Card (Type, History, Topics) */}
                    <div className="bg-[#1c1c1e] rounded-[20px] overflow-hidden border border-zinc-800/30 divide-y divide-zinc-850">
                      {/* Group Type */}
                      <div
                        onClick={() => setShowGroupSettingsSubPage(true)}
                        className="flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-zinc-800/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Users className="size-5 text-zinc-400" />
                          <span className="text-[15px] font-semibold text-white">Group Type</span>
                        </div>
                        <span className="text-[14px] text-[#0095f6] font-medium">{groupTypeVal}</span>
                      </div>

                      {/* Chat History */}
                      <div
                        onClick={() => setShowChatHistorySheet(true)}
                        className="flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-zinc-800/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <MessageSquare className="size-5 text-zinc-400" />
                          <span className="text-[15px] font-semibold text-white">Chat History</span>
                        </div>
                        <span className="text-[14px] text-[#0095f6] font-medium">{chatHistoryVal}</span>
                      </div>

                      {/* Topics */}
                      <div>
                        <div
                          onClick={() => setShowTopicsSubPage(true)}
                          className="flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-zinc-800/30 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <List className="size-5 text-zinc-400" />
                            <div className="flex items-center gap-2">
                              <span className="text-[15px] font-semibold text-white">Topics</span>
                              <span className="bg-[#0095f6] text-white text-[10px] font-bold px-1.5 py-0.2 rounded uppercase">NEW</span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setTopicsEnabled(!topicsEnabled);
                            }}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              topicsEnabled ? "bg-[#0095f6]" : "bg-zinc-700"
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                topicsEnabled ? "translate-x-5" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-500 px-3 leading-relaxed">
                      The group chat will be divided into topics created by admins or users.
                    </p>

                    {/* Action List Card */}
                    <div className="bg-[#1c1c1e] rounded-[20px] overflow-hidden border border-zinc-800/30 divide-y divide-zinc-850">
                      <div 
                        onClick={() => toast({ description: "Reactions settings" })}
                        className="flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-zinc-800/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Heart className="size-5 text-zinc-400" />
                          <span className="text-[15px] font-semibold text-white">Reactions</span>
                        </div>
                        <span className="text-[14px] text-[#0095f6] font-medium">All</span>
                      </div>

                      <div 
                        onClick={() => toast({ description: "Permissions settings" })}
                        className="flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-zinc-800/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Key className="size-5 text-zinc-400" />
                          <span className="text-[15px] font-semibold text-white">Permissions</span>
                        </div>
                        <span className="text-[14px] text-[#0095f6] font-medium">14/15</span>
                      </div>

                      <div 
                        onClick={() => setShowGroupSettingsSubPage(true)}
                        className="flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-zinc-800/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Link className="size-5 text-zinc-400" />
                          <span className="text-[15px] font-semibold text-white">Invite Links</span>
                        </div>
                        <span className="text-[14px] text-[#0095f6] font-medium">1</span>
                      </div>

                      <div 
                        onClick={() => toast({ description: "Administrators list" })}
                        className="flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-zinc-800/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Shield className="size-5 text-zinc-400" />
                          <span className="text-[15px] font-semibold text-white">Administrators</span>
                        </div>
                        <span className="text-[14px] text-[#0095f6] font-medium">1</span>
                      </div>

                      <div 
                        onClick={() => setShowGroupProfile(true)}
                        className="flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-zinc-800/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Users className="size-5 text-zinc-400" />
                          <span className="text-[15px] font-semibold text-white">Members</span>
                        </div>
                        <span className="text-[14px] text-[#0095f6] font-medium">{members.length}</span>
                      </div>
                    </div>

                    {/* Red Action Button */}
                    <button
                      onClick={() => {
                        setShowGroupEditPage(false);
                        setShowLeaveGroupDialog(true);
                      }}
                      className="w-full bg-[#1c1c1e] hover:bg-zinc-850 rounded-[20px] py-4 text-center font-semibold text-red-500 text-[15px] border border-zinc-800/30 transition-colors mt-4"
                    >
                      Delete and leave group
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Group Settings Page (within chat area) */}
            <AnimatePresence>
              {showGroupSettingsSubPage && (
                <motion.div
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "spring", stiffness: 380, damping: 36 }}
                  className="chat-area-overlay fixed inset-0 z-[75] flex flex-col bg-[#121212] text-white overflow-y-auto select-none"
                >
                  {/* Header panel */}
                  <div className="flex h-14 items-center justify-between px-4 shrink-0 border-b border-zinc-800/40">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setShowGroupSettingsSubPage(false)}
                        className="rounded-full p-1.5 hover:bg-zinc-800/60 text-zinc-300 transition-colors"
                      >
                        <ArrowLeft className="size-6" />
                      </button>
                      <span className="text-lg font-bold text-white">Group Settings</span>
                    </div>
                    <button
                      onClick={() => {
                        setShowGroupSettingsSubPage(false);
                        toast({ description: "Group settings saved." });
                      }}
                      className="rounded-full p-2 hover:bg-zinc-800/60 text-[#0095f6] transition-colors"
                    >
                      <Check className="size-6 stroke-[2.5]" />
                    </button>
                  </div>

                  {/* Settings Body */}
                  <div className="flex-1 py-4 px-3 overflow-y-auto space-y-4">
                    {/* Group Type Options Card */}
                    <div className="bg-[#1c1c1e] rounded-[20px] p-4 border border-zinc-800/30 space-y-4">
                      <h4 className="text-sm font-semibold text-[#0095f6]">Group type</h4>
                      
                      {/* Private option */}
                      <div
                        onClick={() => setGroupTypeVal("Private")}
                        className="flex items-start gap-3 cursor-pointer group"
                      >
                        <div className={`mt-0.5 size-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          groupTypeVal === "Private" ? "border-[#0095f6] bg-[#0095f6]" : "border-zinc-600"
                        }`}>
                          {groupTypeVal === "Private" && <div className="size-2 rounded-full bg-white" />}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[15px] font-semibold text-white">Private Group</span>
                          <span className="text-xs text-zinc-400 leading-relaxed mt-0.5">
                            Private groups can only be joined if you were invited or have an invite link.
                          </span>
                        </div>
                      </div>

                      {/* Public option */}
                      <div
                        onClick={() => setGroupTypeVal("Public")}
                        className="flex items-start gap-3 cursor-pointer group pt-2 border-t border-zinc-850"
                      >
                        <div className={`mt-0.5 size-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          groupTypeVal === "Public" ? "border-[#0095f6] bg-[#0095f6]" : "border-zinc-600"
                        }`}>
                          {groupTypeVal === "Public" && <div className="size-2 rounded-full bg-white" />}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[15px] font-semibold text-white">Public Group</span>
                          <span className="text-xs text-zinc-400 leading-relaxed mt-0.5">
                            Public groups can be found in search, chat history is available to everyone and anyone can join.
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Invite Link Card */}
                    <div className="bg-[#1c1c1e] rounded-[20px] p-4 border border-zinc-800/30 space-y-3">
                      <h4 className="text-sm font-semibold text-[#0095f6]">Invite Link</h4>
                      <div className="flex items-center justify-between bg-[#121212] rounded-xl px-3.5 py-2.5 border border-zinc-800/40">
                        <span className="text-xs text-zinc-300 font-mono select-all">
                          nextsocial.app/join/L337fpFJA2FiNTQ1
                        </span>
                        <button className="text-zinc-400 hover:text-white">
                          <MoreVertical className="size-4" />
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-3 pt-1">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText("https://nextsocial.app/join/L337fpFJA2FiNTQ1");
                            toast({ description: "Invite link copied to clipboard" });
                          }}
                          className="flex-1 bg-[#0095f6] hover:bg-[#0081d6] text-white py-2 rounded-full font-semibold text-xs text-center transition-colors"
                        >
                          Copy
                        </button>
                        <button
                          onClick={() => {
                            toast({ description: "Share dialog opened" });
                          }}
                          className="flex-1 bg-[#0095f6] hover:bg-[#0081d6] text-white py-2 rounded-full font-semibold text-xs text-center transition-colors"
                        >
                          Share
                        </button>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed pt-1">
                        People can join your group by following this link. You can revoke the link at any time.
                      </p>
                    </div>

                    {/* Manage Invite Links Button Card */}
                    <div
                      onClick={() => toast({ description: "Manage invite links" })}
                      className="bg-[#1c1c1e] rounded-[20px] p-4 border border-zinc-800/30 cursor-pointer hover:bg-zinc-850 transition-colors space-y-1"
                    >
                      <span className="text-[15px] font-semibold text-white block">Manage Invite Links</span>
                      <span className="text-xs text-zinc-400 block leading-relaxed">
                        You can create additional invite links that have a limited time or number of users.
                      </span>
                    </div>

                    {/* Approve New Members Toggle Card */}
                    <div className="bg-[#1c1c1e] rounded-[20px] p-4 border border-zinc-800/30 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[15px] font-semibold text-white">Approve new members</span>
                        <button
                          onClick={() => setApproveMembersVal(!approveMembersVal)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            approveMembersVal ? "bg-[#0095f6]" : "bg-zinc-700"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              approveMembersVal ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        An admin must approve users who want to join the group.
                      </p>
                    </div>

                    {/* Content Protection Card */}
                    <div className="bg-[#1c1c1e] rounded-[20px] p-4 border border-zinc-800/30 space-y-1.5">
                      <h4 className="text-sm font-semibold text-[#0095f6]">Content protection</h4>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[15px] font-semibold text-white">Restrict saving content</span>
                        <button
                          onClick={() => setRestrictContentVal(!restrictContentVal)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            restrictContentVal ? "bg-[#0095f6]" : "bg-zinc-700"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              restrictContentVal ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Members won&apos;t be able to copy, save or forward content from this group.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Sub-page 2: Topics Page */}
            <AnimatePresence>
              {showTopicsSubPage && (
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  transition={{ type: "spring", stiffness: 380, damping: 36 }}
                  className="fixed inset-0 z-[75] flex flex-col bg-[#121212] text-white w-full h-full overflow-y-auto select-none pt-[env(safe-area-inset-top,20px)] pb-[env(safe-area-inset-bottom,20px)]"
                >
                  {/* Header panel */}
                  <div className="flex h-14 items-center justify-between px-4 shrink-0 border-b border-zinc-800/40">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setShowTopicsSubPage(false)}
                        className="rounded-full p-1.5 hover:bg-zinc-800/60 text-zinc-300 transition-colors"
                      >
                        <ArrowLeft className="size-6" />
                      </button>
                      <span className="text-lg font-bold text-white">Topics</span>
                    </div>
                  </div>

                  {/* Center Content */}
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto space-y-6">
                    {/* Dual Chat Bubbles Illustration */}
                    <div className="relative size-28 flex items-center justify-center">
                      {/* Left Blue Bubble */}
                      <div className="absolute top-2 left-2 size-16 rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center shadow-lg transform -rotate-12">
                        <div className="size-6 rounded bg-white/20 flex items-center justify-center">
                          <span className="text-white text-xs font-bold">◆</span>
                        </div>
                      </div>
                      {/* Right Purple Bubble */}
                      <div className="absolute bottom-2 right-2 size-16 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg transform rotate-12">
                        <CornerUpLeft className="size-7 text-white" />
                      </div>
                    </div>

                    <p className="text-sm text-zinc-300 leading-relaxed font-medium px-2">
                      The group chat will be divided into topics created by admins or users.
                    </p>

                    {/* Enable Topics Card */}
                    <div className="w-full bg-[#1c1c1e] rounded-[20px] p-4 border border-zinc-800/30 flex items-center justify-between">
                      <span className="text-[15px] font-semibold text-white">Enable Topics</span>
                      <button
                        onClick={() => setTopicsEnabled(!topicsEnabled)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          topicsEnabled ? "bg-[#0095f6]" : "bg-zinc-700"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            topicsEnabled ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Chat History Bottom Sheet Drawer */}
            <AnimatePresence>
              {showChatHistorySheet && (
                <div className="fixed inset-0 z-[80] overflow-hidden flex flex-col justify-end">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowChatHistorySheet(false)}
                    className="fixed inset-0 bg-black/70 backdrop-blur-[1px]"
                  />
                  <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 220 }}
                    className="relative z-50 bg-[#1c222b] border-t border-[#262626] rounded-t-3xl pb-8 pt-4 px-6 flex flex-col max-w-md mx-auto w-full select-none"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="w-12 h-1 bg-zinc-700 rounded-full mb-4 shrink-0 mx-auto" />
                    <h4 className="text-base font-bold text-white mb-4 text-start">Chat history for new members</h4>

                    <div className="space-y-4 text-start">
                      {/* Visible Option */}
                      <div
                        onClick={() => {
                          setChatHistoryVal("Visible");
                          setShowChatHistorySheet(false);
                        }}
                        className="flex items-start gap-3 cursor-pointer group"
                      >
                        <div className={`mt-0.5 size-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          chatHistoryVal === "Visible" ? "border-[#0095f6] bg-[#0095f6]" : "border-zinc-600"
                        }`}>
                          {chatHistoryVal === "Visible" && <div className="size-2 rounded-full bg-white" />}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[15px] font-semibold text-white">Visible</span>
                          <span className="text-xs text-zinc-400 leading-relaxed mt-0.5">
                            New members will see messages that were sent before they joined.
                          </span>
                        </div>
                      </div>

                      {/* Hidden Option */}
                      <div
                        onClick={() => {
                          setChatHistoryVal("Hidden");
                          setShowChatHistorySheet(false);
                        }}
                        className="flex items-start gap-3 cursor-pointer group pt-2 border-t border-zinc-800/40"
                      >
                        <div className={`mt-0.5 size-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          chatHistoryVal === "Hidden" ? "border-[#0095f6] bg-[#0095f6]" : "border-zinc-600"
                        }`}>
                          {chatHistoryVal === "Hidden" && <div className="size-2 rounded-full bg-white" />}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[15px] font-semibold text-white">Hidden</span>
                          <span className="text-xs text-zinc-400 leading-relaxed mt-0.5">
                            New members won&apos;t see more than 100 previous messages.
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Schedule Video Chat Drawer (Bottom Sheet) */}
            {showScheduleDrawer && (
              <div className="fixed inset-0 z-[80] overflow-hidden flex flex-col justify-end">
                {/* Drawer Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowScheduleDrawer(false)}
                  className="fixed inset-0 bg-black/70 backdrop-blur-[1px]"
                />
                {/* Drawer Body */}
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 220 }}
                  className="relative z-50 bg-[#1c222b] border-t border-[#262626] rounded-t-3xl pb-8 pt-4 px-6 flex flex-col items-center max-w-md mx-auto w-full select-none"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Drag Handle */}
                  <div className="w-12 h-1 bg-zinc-750 rounded-full mb-4 shrink-0" />

                  {/* Title */}
                  <h4 className="text-xl font-bold text-white text-left self-start mt-2 px-2">Schedule Video Chat</h4>

                  {/* 3-Column Scroll Picker Drum */}
                  <div className="relative w-full h-[200px] my-5 flex items-center justify-center overflow-hidden">
                    {/* Selection indicator border lines */}
                    <div className="absolute left-0 right-0 top-[78px] h-[44px] border-y-2 border-[#0095f6] pointer-events-none" />

                    {/* Column 1: Date */}
                    <div className="w-[45%] h-full relative overflow-hidden flex flex-col">
                      <div
                        ref={scheduleDateScrollRef}
                        onScroll={(e) => {
                          const container = e.currentTarget;
                          const scrollTop = container.scrollTop;
                          const idx = Math.round(scrollTop / 44);
                          if (idx >= 0 && idx < scheduleDates.length) {
                            setTempScheduleDate(scheduleDates[idx].value);
                          }
                        }}
                        className="w-full h-full overflow-y-auto snap-y snap-mandatory scrollbar-none flex flex-col py-[78px] text-center"
                      >
                        {scheduleDates.map((d) => {
                          const isSelected = tempScheduleDate === d.value;
                          return (
                            <div
                              key={d.value}
                              onClick={(e) => {
                                setTempScheduleDate(d.value);
                                const idx = scheduleDates.findIndex(item => item.value === d.value);
                                e.currentTarget.parentElement?.scrollTo({
                                  top: idx * 44,
                                  behavior: "smooth"
                                });
                              }}
                              className={`snap-center h-[44px] flex-shrink-0 flex items-center justify-center cursor-pointer transition-all duration-150 ${
                                isSelected ? "text-white font-bold text-base scale-105" : "text-zinc-550 text-sm opacity-55"
                              }`}
                            >
                              {d.label}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Column 2: Hour */}
                    <div className="w-[25%] h-full relative overflow-hidden flex flex-col">
                      <div
                        ref={scheduleHourScrollRef}
                        onScroll={(e) => {
                          const container = e.currentTarget;
                          const scrollTop = container.scrollTop;
                          const idx = Math.round(scrollTop / 44);
                          if (idx >= 0 && idx < scheduleHours.length) {
                            setTempScheduleHour(scheduleHours[idx]);
                          }
                        }}
                        className="w-full h-full overflow-y-auto snap-y snap-mandatory scrollbar-none flex flex-col py-[78px] text-center"
                      >
                        {scheduleHours.map((h) => {
                          const isSelected = tempScheduleHour === h;
                          return (
                            <div
                              key={h}
                              onClick={(e) => {
                                setTempScheduleHour(h);
                                const idx = scheduleHours.indexOf(h);
                                e.currentTarget.parentElement?.scrollTo({
                                  top: idx * 44,
                                  behavior: "smooth"
                                });
                              }}
                              className={`snap-center h-[44px] flex-shrink-0 flex items-center justify-center cursor-pointer transition-all duration-150 ${
                                isSelected ? "text-white font-bold text-base scale-105" : "text-zinc-550 text-sm opacity-55"
                              }`}
                            >
                              {h}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Column 3: Minute */}
                    <div className="w-[30%] h-full relative overflow-hidden flex flex-col">
                      <div
                        ref={scheduleMinuteScrollRef}
                        onScroll={(e) => {
                          const container = e.currentTarget;
                          const scrollTop = container.scrollTop;
                          const idx = Math.round(scrollTop / 44);
                          if (idx >= 0 && idx < scheduleMinutes.length) {
                            setTempScheduleMinute(scheduleMinutes[idx]);
                          }
                        }}
                        className="w-full h-full overflow-y-auto snap-y snap-mandatory scrollbar-none flex flex-col py-[78px] text-center"
                      >
                        {scheduleMinutes.map((m) => {
                          const isSelected = tempScheduleMinute === m;
                          return (
                            <div
                              key={m}
                              onClick={(e) => {
                                setTempScheduleMinute(m);
                                const idx = scheduleMinutes.indexOf(m);
                                e.currentTarget.parentElement?.scrollTo({
                                  top: idx * 44,
                                  behavior: "smooth"
                                });
                              }}
                              className={`snap-center h-[44px] flex-shrink-0 flex items-center justify-center cursor-pointer transition-all duration-150 ${
                                isSelected ? "text-white font-bold text-base scale-105" : "text-zinc-550 text-sm opacity-55"
                              }`}
                            >
                              {m}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Scheduled warning description */}
                  <p className="text-xs text-zinc-400 text-center max-w-[320px] mb-6 leading-relaxed">
                    {scheduleStartsInText}
                  </p>

                  {/* CTA Gradient Button (Blue to Pink) */}
                  <button
                    onClick={() => {
                      setSelectedScheduleDate(tempScheduleDate);
                      setSelectedScheduleHour(tempScheduleHour);
                      setSelectedScheduleMinute(tempScheduleMinute);
                      setShowScheduleDrawer(false);
                      toast({ description: `Video chat scheduled starting on ${tempScheduleDate === "Today" ? "Today" : tempScheduleDate} at ${tempScheduleHour}:${tempScheduleMinute}.` });
                    }}
                    className="w-full py-3.5 rounded-xl text-center font-bold text-white text-[15px] transition-transform active:scale-98 shadow-lg bg-gradient-to-r from-[#2a87d0] via-[#8e2de2] to-[#f53d5c] hover:brightness-110"
                  >
                    Start on {tempScheduleDate === "Today" ? "Today" : tempScheduleDate.split(" ").slice(1).join(" ")} at {tempScheduleHour}:{tempScheduleMinute}
                  </button>
                </motion.div>
              </div>
            )}

            {/* Active Video Call Sheet (Drawer or Fullscreen) */}
            {showVideoCallSheet && !isVideoCallPiP && (
              <div className="fixed inset-0 z-[90] overflow-hidden flex flex-col justify-end">
                {/* Call Sheet Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/80 backdrop-blur-[1.5px]"
                  onClick={() => {
                    if (isVideoCallFullscreen) {
                      setIsVideoCallFullscreen(false);
                    }
                  }}
                />
                
                {/* Call Sheet Body */}
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 28, stiffness: 180 }}
                  style={{ height: isVideoCallFullscreen ? "100%" : "65%" }}
                  className="relative z-50 bg-[#0f141c] border-t border-zinc-800/60 rounded-t-[28px] pb-8 pt-4 flex flex-col justify-between max-w-md mx-auto w-full select-none text-white shadow-2xl overflow-hidden transition-all duration-300"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Camera stream background when camera is ON */}
                  {isCameraOn && (
                    <div className="absolute inset-0 z-0 bg-black">
                      {cameraShareType === "PHONE SCREEN" ? (
                        <div className="w-full h-full bg-gradient-to-b from-[#184e68] via-[#103040] to-[#0b1c24] flex flex-col items-center justify-center p-6 text-center select-none">
                          <div className="relative size-24 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center shadow-xl mb-4 animate-pulse">
                            <svg className="size-12 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                              <path d="M17 2H7v12h10V2z" />
                              <circle cx="12" cy="18" r="1" strokeWidth="3" />
                            </svg>
                          </div>
                          <span className="text-sm font-bold text-zinc-350">Sharing Screen...</span>
                          <span className="text-xs text-zinc-500 mt-1.5 leading-normal max-w-xs">Everything on your screen, including notifications, is shared</span>
                        </div>
                      ) : localStream ? (
                        <video 
                          ref={localVideoRef} 
                          autoPlay 
                          playsInline 
                          muted 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-b from-zinc-850 to-zinc-950 flex flex-col items-center justify-center text-center select-none">
                          <UserAvatar avatarUrl={videoJoinAsPersonal ? loggedInUser.avatarUrl : undefined} size={80} className="size-20 rounded-full border border-white/10 animate-pulse" />
                          <span className="text-sm font-bold text-zinc-400 mt-4 capitalize">{cameraShareType.toLowerCase()} starting...</span>
                        </div>
                      )}
                      {/* Dark overlay gradients for text readability */}
                      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/75 pointer-events-none" />
                    </div>
                  )}

                  {/* Drawer Top Section (Drag Bar / Back Arrow depending on size) */}
                  <div className="w-full shrink-0 flex flex-col items-center z-10">
                    {!isVideoCallFullscreen ? (
                      <div 
                        onClick={() => setIsVideoCallFullscreen(true)}
                        className="w-12 h-1 bg-zinc-700 hover:bg-zinc-500 rounded-full mb-3 cursor-pointer transition-colors"
                      />
                    ) : null}

                    {/* Dynamic Header Layout */}
                    {isVideoCallFullscreen ? (
                      <div className="w-full flex items-center justify-between px-4 py-2 mt-2">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setIsVideoCallFullscreen(false)}
                            className="rounded-full p-2 hover:bg-white/10 text-zinc-300 transition-colors"
                          >
                            <ArrowLeft className="size-6" />
                          </button>
                          <div className="flex flex-col text-start leading-tight">
                            <div className="flex items-center gap-2">
                              <span className="text-base font-bold text-white tracking-wide truncate max-w-[180px]">
                                {callTitle || displayName}
                              </span>
                              {isRecordingCall && (
                                <span className="flex items-center gap-1 bg-red-500/20 px-2 py-0.5 rounded-full border border-red-500/40 animate-pulse text-[9px] font-black text-red-400 uppercase select-none">
                                  <span className="size-1.5 rounded-full bg-red-500" />
                                  REC
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-zinc-400">1 participant</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => setIsVideoCallPiP(true)}
                            className="rounded-full p-2 hover:bg-white/10 text-zinc-300 transition-colors"
                            title="Picture in Picture"
                          >
                            <svg className="size-[20px]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                              <rect x="3" y="5" width="18" height="14" rx="2" ry="2" />
                              <rect x="13" y="11" width="7" height="7" rx="1" ry="1" />
                            </svg>
                          </button>
                          <button 
                            onClick={() => setShowCallOptionsMenu(!showCallOptionsMenu)}
                            className="rounded-full p-2 hover:bg-white/10 text-zinc-300 transition-colors relative"
                          >
                            <MoreVertical className="size-[20px]" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full flex items-center justify-between px-6 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold tracking-wide text-white">{callTitle || displayName}</span>
                          {isRecordingCall && (
                            <span className="flex items-center gap-1 bg-red-500/20 px-2 py-0.5 rounded-full border border-red-500/40 animate-pulse text-[9px] font-black text-red-400 uppercase select-none">
                              <span className="size-1.5 rounded-full bg-red-500" />
                              REC
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => setIsVideoCallPiP(true)}
                            className="rounded-full p-2 hover:bg-white/10 text-zinc-300 transition-colors"
                            title="Picture in Picture"
                          >
                            <svg className="size-[20px]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                              <rect x="3" y="5" width="18" height="14" rx="2" ry="2" />
                              <rect x="13" y="11" width="7" height="7" rx="1" ry="1" />
                            </svg>
                          </button>
                          <button 
                            onClick={() => setShowCallOptionsMenu(!showCallOptionsMenu)}
                            className="rounded-full p-2 hover:bg-white/10 text-zinc-300 transition-colors relative"
                          >
                            <MoreVertical className="size-[20px]" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Three-Dots Menu Dropdown Card */}
                  {showCallOptionsMenu && (
                    <>
                      <div 
                        onClick={() => setShowCallOptionsMenu(false)}
                        className="fixed inset-0 z-40 bg-transparent"
                      />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        className="absolute right-4 top-16 z-50 w-64 rounded-2xl bg-[#1c222b] border border-zinc-800/80 shadow-2xl p-1 flex flex-col divide-y divide-zinc-800/30 text-start text-white"
                      >
                        {/* Display me as... Option */}
                        <div 
                          onClick={() => {
                            const next = !videoJoinAsPersonal;
                            setVideoJoinAsPersonal(next);
                            toast({ description: `Now displaying as ${next ? "Personal Account" : "Channel Identity"}` });
                          }}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/40 cursor-pointer first:rounded-t-2xl transition-colors"
                        >
                          {videoJoinAsPersonal ? (
                            <UserAvatar avatarUrl={loggedInUser.avatarUrl} size={36} className="size-9 rounded-full shrink-0 border border-zinc-700" />
                          ) : (
                            <div className="size-9 rounded-full bg-[#48bb78] flex items-center justify-center text-xs font-bold text-white uppercase shrink-0">
                              {(displayName || "G").slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="flex flex-col leading-tight min-w-0">
                            <span className="text-[10px] text-zinc-500 uppercase font-black tracking-wider">Display me as...</span>
                            <span className="text-[13px] font-bold text-white truncate">
                              {videoJoinAsPersonal ? (loggedInUser.displayName || loggedInUser.username) : displayName}
                            </span>
                          </div>
                        </div>

                        {/* Audio Switch Option */}
                        <div 
                          onClick={() => {
                            setIsSpeakerOn(!isSpeakerOn);
                            toast({ description: `Audio output switched to ${!isSpeakerOn ? "Speaker" : "Phone"}` });
                          }}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-800/40 cursor-pointer transition-colors"
                        >
                          {isSpeakerOn ? <Volume2 className="size-5 text-zinc-400" /> : <Phone className="size-5 text-zinc-400" />}
                          <div className="flex flex-col leading-tight">
                            <span className="text-[13px] font-medium text-zinc-200">Audio</span>
                            <span className="text-[11px] text-[#0095f6] font-semibold">{isSpeakerOn ? "Speaker" : "Phone"}</span>
                          </div>
                        </div>

                        {/* Noise Suppression Option */}
                        <div 
                          onClick={() => setIsNoiseSuppressionEnabled(!isNoiseSuppressionEnabled)}
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-800/40 cursor-pointer transition-colors"
                        >
                          <Layers className="size-5 text-zinc-400" />
                          <div className="flex flex-col leading-tight">
                            <span className="text-[13px] font-medium text-zinc-200">Noise suppression</span>
                            <span className="text-[11px] text-[#0095f6] font-semibold">{isNoiseSuppressionEnabled ? "Enabled" : "Disabled"}</span>
                          </div>
                        </div>

                        {/* Edit Title Option */}
                        <div 
                          onClick={() => {
                            const newTitle = prompt("Edit video chat title:", callTitle || displayName);
                            if (newTitle !== null && newTitle.trim() !== "") {
                              setCallTitle(newTitle);
                            }
                            setShowCallOptionsMenu(false);
                          }}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/40 cursor-pointer text-zinc-300 transition-colors"
                        >
                          <Edit2 className="size-5 text-zinc-400" />
                          <span className="text-[13px] font-medium">Edit video chat title</span>
                        </div>

                        {/* Permissions Option */}
                        <div 
                          onClick={() => {
                            toast({ description: "Only admins can edit permissions." });
                            setShowCallOptionsMenu(false);
                          }}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/40 cursor-pointer text-zinc-300 transition-colors"
                        >
                          <svg className="size-5 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                          <span className="text-[13px] font-medium">Edit permissions</span>
                        </div>

                        {/* Invite Link Option */}
                        <div 
                          onClick={() => {
                            toast({ description: "Invite link copied to clipboard!" });
                            setShowCallOptionsMenu(false);
                          }}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/40 cursor-pointer text-zinc-300 transition-colors"
                        >
                          <Share2 className="size-5 text-zinc-400" />
                          <span className="text-[13px] font-medium">Share invite link</span>
                        </div>

                        {/* Share Screen Option */}
                        <div 
                          onClick={() => {
                            setCameraShareType("PHONE SCREEN");
                            setShowCameraShareChoice(true);
                            setShowCallOptionsMenu(false);
                          }}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/40 cursor-pointer text-zinc-300 transition-colors"
                        >
                          <svg className="size-5 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                            <polyline points="17 1 21 5 17 9" />
                            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                            <polyline points="7 23 3 19 7 15" />
                            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                          </svg>
                          <span className="text-[13px] font-medium">Share screen</span>
                        </div>

                        {/* Start Recording Option */}
                        <div 
                          onClick={() => {
                            setIsRecordingCall(!isRecordingCall);
                            toast({ description: !isRecordingCall ? "Video chat recording started" : "Video chat recording stopped" });
                            setShowCallOptionsMenu(false);
                          }}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/40 cursor-pointer text-zinc-300 transition-colors"
                        >
                          <Star className="size-5 text-zinc-400 fill-zinc-400" />
                          <span className="text-[13px] font-medium">{isRecordingCall ? "Stop recording" : "Start recording"}</span>
                        </div>

                        {/* Disable Messages Option */}
                        <div 
                          onClick={() => {
                            setIsCallMessagesDisabled(!isCallMessagesDisabled);
                            toast({ description: !isCallMessagesDisabled ? "Call screen chat overlay disabled" : "Call screen chat overlay enabled" });
                            setShowCallOptionsMenu(false);
                          }}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/40 cursor-pointer text-zinc-300 transition-colors"
                        >
                          <BellOff className="size-5 text-zinc-400" />
                          <span className="text-[13px] font-medium">{isCallMessagesDisabled ? "Enable Messages" : "Disable Messages"}</span>
                        </div>

                        {/* End Call Option */}
                        <div 
                          onClick={() => {
                            setShowVideoCallSheet(false);
                            setShowCallOptionsMenu(false);
                            toast({ description: "Video call ended" });
                          }}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-red-500/15 text-red-400 cursor-pointer last:rounded-b-2xl font-bold transition-colors"
                        >
                          <X className="size-5 text-red-400" />
                          <span className="text-[13px]">End video chat</span>
                        </div>
                      </motion.div>
                    </>
                  )}

                  {/* Mid Section: Active Caller Participant list */}
                  <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-4 z-10">
                    <div className="bg-[#1c222b]/70 backdrop-blur-md border border-zinc-800/40 rounded-[20px] p-4 flex flex-col gap-3">
                      {/* Active Caller details row */}
                      <div className="flex items-center justify-between pb-3 border-b border-zinc-800/30">
                        <div className="flex items-center gap-3">
                          {videoJoinAsPersonal ? (
                            <UserAvatar avatarUrl={loggedInUser.avatarUrl} size={48} className="size-[48px] rounded-full border border-zinc-800" />
                          ) : (
                            <div className="size-[48px] rounded-full bg-[#48bb78] flex items-center justify-center text-sm font-bold text-white uppercase shrink-0 border border-zinc-800">
                              {(displayName || "G").slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="flex flex-col text-start">
                            <span className="text-sm font-semibold text-white uppercase">
                              {videoJoinAsPersonal ? (loggedInUser.displayName || loggedInUser.username) : displayName}
                            </span>
                            {isBioEditing ? (
                              <input
                                autoFocus
                                type="text"
                                value={userBio}
                                onChange={(e) => setUserBio(e.target.value)}
                                onBlur={() => setIsBioEditing(false)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    setIsBioEditing(false);
                                  }
                                }}
                                className="bg-zinc-850 border border-[#0095f6] text-[11px] text-zinc-300 rounded px-1.5 py-0.5 outline-none max-w-[140px]"
                              />
                            ) : (
                              <span 
                                onClick={() => setIsBioEditing(true)}
                                className="text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer italic transition-colors mt-0.5"
                              >
                                {userBio}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center">
                          {isCallMuted ? (
                            <MicOff className="size-5 text-red-400 stroke-[2px]" />
                          ) : (
                            <div className="relative flex items-center justify-center">
                              <span className="absolute animate-ping size-4.5 rounded-full bg-green-500 opacity-25" />
                              <Mic className="size-5 text-green-400 stroke-[2px]" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Invite Members button card */}
                      <button
                        onClick={() => {
                          toast({ description: "Invite link copied to clipboard!" });
                        }}
                        className="flex items-center gap-3 px-1 py-1.5 hover:bg-zinc-800/30 text-start w-full text-[#0095f6] font-semibold text-sm rounded-lg transition-colors group"
                      >
                        <UserPlus className="size-5 text-[#0095f6] group-hover:scale-105 transition-transform" />
                        <span>Invite Members</span>
                      </button>
                    </div>
                  </div>

                  {/* Floating messages stack overlay on the call screen */}
                  <div className="absolute bottom-24 left-6 right-6 z-20 pointer-events-none flex flex-col items-center gap-2.5">
                    <AnimatePresence>
                      {!isCallMessagesDisabled && floatingMessages.map((msg) => (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 35, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -35, scale: 0.9 }}
                          transition={{ type: "spring", stiffness: 350, damping: 25 }}
                          className="bg-black/70 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-2.5 shadow-2xl flex items-center gap-2.5 max-w-[280px]"
                        >
                          {msg.avatarUrl ? (
                            <UserAvatar avatarUrl={msg.avatarUrl} size={28} className="size-7 rounded-full border border-white/10 shrink-0" />
                          ) : (
                            <div className="size-7 rounded-full bg-[#48bb78] flex items-center justify-center text-[10px] font-bold text-white uppercase shrink-0">
                              {msg.sender.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="flex flex-col text-start leading-tight min-w-0">
                            <span className="text-[11px] font-black text-[#0095f6] tracking-wide truncate">{msg.sender}</span>
                            <span className="text-xs text-white break-words mt-0.5">{msg.text}</span>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  {/* Call quick message input overlay */}
                  <AnimatePresence>
                    {showCallMessageInput && (
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 15 }}
                        className="absolute bottom-24 left-4 right-4 z-40 bg-[#1c222b] border border-zinc-800/80 rounded-2xl p-2.5 flex items-center gap-2 shadow-2xl max-w-sm mx-auto"
                      >
                        <input
                          autoFocus
                          type="text"
                          placeholder="Type a message to call screen..."
                          value={callMessageText}
                          onChange={(e) => setCallMessageText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              addFloatingMessage(callMessageText);
                              setCallMessageText("");
                              setShowCallMessageInput(false);
                            }
                          }}
                          className="flex-1 bg-zinc-900 border border-zinc-800 text-sm text-white rounded-xl px-3 py-2 outline-none placeholder:text-zinc-600"
                        />
                        <button
                          onClick={() => {
                            addFloatingMessage(callMessageText);
                            setCallMessageText("");
                            setShowCallMessageInput(false);
                          }}
                          className="p-2 bg-[#0095f6] hover:bg-[#1a9bf0] text-white rounded-xl transition-colors active:scale-95 shrink-0"
                        >
                          <Send className="size-4" />
                        </button>
                        <button
                          onClick={() => setShowCallMessageInput(false)}
                          className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-colors"
                        >
                          <X className="size-4" />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Call Controls circle buttons bar */}
                  <div className="w-full shrink-0 px-4 pt-4 border-t border-zinc-800/40 flex items-center justify-around max-w-md mx-auto z-10">
                    {/* Control 1: Speaker Switch */}
                    <div className="flex flex-col items-center">
                      <button
                        onClick={() => {
                          const next = !isSpeakerOn;
                          setIsSpeakerOn(next);
                          toast({ description: `Switched to ${next ? "Speaker" : "Phone"}` });
                        }}
                        className={`size-14 rounded-full flex items-center justify-center transition-colors active:scale-95 shadow-md ${
                          isSpeakerOn ? "bg-[#2a87d0] text-white" : "bg-[#1c2732] text-zinc-400 hover:text-white"
                        }`}
                      >
                        {isSpeakerOn ? <Volume2 className="size-6 animate-fade-in" /> : <Phone className="size-6 animate-fade-in" />}
                      </button>
                      <span className="text-[11px] text-zinc-400 mt-1.5 font-medium select-none capitalize">
                        {isSpeakerOn ? "Speaker" : "Phone"}
                      </span>
                    </div>

                    {/* Control 2: Camera Trigger Choice */}
                    <div className="flex flex-col items-center">
                      <button
                        onClick={() => {
                          if (isCameraOn) {
                            setIsCameraOn(false);
                            toast({ description: "Camera turned off" });
                          } else {
                            setShowCameraShareChoice(true);
                          }
                        }}
                        className={`size-14 rounded-full flex items-center justify-center transition-colors active:scale-95 shadow-md ${
                          isCameraOn ? "bg-[#2a87d0] text-white" : "bg-[#1c2732] text-zinc-400 hover:text-white"
                        }`}
                      >
                        {isCameraOn ? <Video className="size-6" /> : <VideoOff className="size-6" />}
                      </button>
                      <span className="text-[11px] text-zinc-400 mt-1.5 font-medium select-none">Camera</span>
                    </div>

                    {/* Control 3: Unmute/Mute */}
                    <div className="flex flex-col items-center relative">
                      <button
                        onClick={() => setIsCallMuted(!isCallMuted)}
                        className={`size-14 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-lg ${
                          !isCallMuted 
                            ? "bg-[#0095f6] text-white ring-4 ring-[#0095f6]/20 animate-pulse shadow-[0_0_15px_#0095f6]" 
                            : "bg-[#1c2732] text-zinc-400 hover:text-white"
                        }`}
                      >
                        {!isCallMuted ? <Mic className="size-6" /> : <MicOff className="size-6" />}
                      </button>
                      <span className="text-[11px] text-zinc-400 mt-1.5 font-medium select-none">
                        {isCallMuted ? "Unmute" : "Mute"}
                      </span>
                    </div>

                    {/* Control 4: Message Inline chat overlay */}
                    <div className="flex flex-col items-center">
                      <button
                        onClick={() => {
                          if (isCallMessagesDisabled) {
                            toast({ description: "Messages are disabled in this call." });
                          } else {
                            setShowCallMessageInput(!showCallMessageInput);
                          }
                        }}
                        className={`size-14 rounded-full flex items-center justify-center transition-colors active:scale-95 shadow-md ${
                          showCallMessageInput ? "bg-[#2a87d0] text-white" : "bg-[#1c2732] text-zinc-400 hover:text-white"
                        }`}
                      >
                        <MessageSquare className="size-6" />
                      </button>
                      <span className="text-[11px] text-zinc-400 mt-1.5 font-medium select-none">Message</span>
                    </div>

                    {/* Control 5: Leave */}
                    <div className="flex flex-col items-center">
                      <button
                        onClick={() => {
                          setShowVideoCallSheet(false);
                          toast({ description: "Video call ended" });
                        }}
                        className="size-14 rounded-full bg-[#ea4335] text-white flex items-center justify-center transition-colors active:scale-95 shadow-md hover:bg-red-650"
                      >
                        <PhoneOff className="size-6" />
                      </button>
                      <span className="text-[11px] text-zinc-400 mt-1.5 font-medium select-none">Leave</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}

            {/* Camera Sharing Choice Screen */}
            {showCameraShareChoice && (
              <motion.div
                initial={{ opacity: 0, y: "20%" }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: "20%" }}
                className="fixed inset-0 z-[100] flex flex-col bg-gradient-to-b from-[#184e68] via-[#103040] to-[#0b1c24] text-white p-6 justify-between select-none"
              >
                {/* Header Back Button */}
                <div className="flex h-14 items-center shrink-0">
                  <button
                    onClick={() => setShowCameraShareChoice(false)}
                    className="rounded-full p-2 hover:bg-white/10 text-white transition-colors"
                  >
                    <ArrowLeft className="size-6 text-white" />
                  </button>
                </div>

                {/* Big Centered Visual Area */}
                <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4 text-center">
                  {cameraShareType === "PHONE SCREEN" ? (
                    <div className="flex flex-col items-center gap-6 max-w-sm">
                      <div className="relative size-32 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center shadow-2xl">
                        <svg className="size-16 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                          <line x1="12" y1="18" x2="12.01" y2="18" />
                          <path d="M17 2H7v12h10V2z" />
                          <path d="M12 18h.01" strokeWidth="3" />
                        </svg>
                        <div className="absolute -right-2 -bottom-2 size-12 bg-[#0095f6] rounded-full flex items-center justify-center shadow-lg border-2 border-[#103040]">
                          <svg className="size-6 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <line x1="12" y1="19" x2="12" y2="5" />
                            <polyline points="5 12 12 5 19 12" />
                          </svg>
                        </div>
                      </div>
                      <p className="text-[17px] font-bold text-white max-w-xs leading-normal">
                        Everything on your screen, including notifications, will be shared.
                      </p>
                    </div>
                  ) : (
                    <div className="relative w-72 aspect-[3/4] bg-black/45 border border-white/15 rounded-[32px] overflow-hidden shadow-2xl flex items-center justify-center">
                      {localStream ? (
                        <video 
                          ref={localVideoRef} 
                          autoPlay 
                          playsInline 
                          muted 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-4 text-zinc-400 p-6 select-none">
                          <UserAvatar avatarUrl={videoJoinAsPersonal ? loggedInUser.avatarUrl : undefined} size={80} className="size-20 rounded-full border border-white/10" />
                          <span className="text-sm font-semibold">{cameraShareType === "FRONT CAMERA" ? "Front Camera Video Preview" : "Back Camera Video Preview"}</span>
                          <span className="text-xs text-zinc-500">Camera preview starting...</span>
                        </div>
                      )}
                      
                      {/* Gradient tag overlay */}
                      <div className="absolute bottom-4 left-4 right-4 bg-black/50 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10 text-xs text-zinc-300 flex items-center gap-2 select-none">
                        <span className="size-2 rounded-full bg-[#00ff87] animate-ping" />
                        <span className="capitalize">{cameraShareType.toLowerCase()} Preview</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Controls Area */}
                <div className="w-full flex flex-col items-center gap-6 pb-6">
                  {/* Share Video Gradient button + Mic toggle row */}
                  <div className="w-full flex items-center justify-center gap-4 max-w-sm">
                    {/* Microphone Circle Toggle */}
                    <button
                      onClick={() => setIsCallMuted(!isCallMuted)}
                      className={`size-12 rounded-full flex items-center justify-center border transition-all active:scale-95 shadow-md ${
                        !isCallMuted 
                          ? "bg-[#0095f6] border-[#0095f6] text-white shadow-[#0095f6]/20" 
                          : "bg-white/10 border-white/10 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {!isCallMuted ? <Mic className="size-5" /> : <MicOff className="size-5" />}
                    </button>

                    {/* Gradient Share Video Button */}
                    <button
                      onClick={() => {
                        setIsCameraOn(true);
                        setShowCameraShareChoice(false);
                      }}
                      className="flex-1 py-3.5 bg-gradient-to-r from-[#00ff87] to-[#60efff] hover:brightness-110 active:scale-[0.99] transition-all rounded-2xl text-center text-zinc-950 font-extrabold text-[15px] shadow-lg shadow-[#00ff87]/15"
                    >
                      Share Video
                    </button>
                  </div>

                  {/* Horizontal Scroll Selector tabs */}
                  <div className="flex items-center gap-8 text-[12px] font-black tracking-widest uppercase py-2">
                    {["PHONE SCREEN", "FRONT CAMERA", "BACK CAMERA"].map((type) => {
                      const isSelected = cameraShareType === type;
                      return (
                        <button
                          key={type}
                          onClick={() => setCameraShareType(type as any)}
                          className={`transition-all duration-200 relative py-1 ${
                            isSelected 
                              ? "text-white scale-105 font-black" 
                              : "text-zinc-550 hover:text-zinc-300 font-semibold"
                          }`}
                        >
                          <span>{type}</span>
                          {isSelected && (
                            <motion.div 
                              layoutId="cameraChoiceTab" 
                              className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full mt-1" 
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Floating Picture-in-Picture Call Window */}
            {isVideoCallPiP && showVideoCallSheet && (
              <motion.div
                drag
                dragConstraints={{ left: -300, right: 300, top: -500, bottom: 500 }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="fixed bottom-24 right-4 z-[99] w-36 h-48 bg-[#0f141c] border border-zinc-800/80 rounded-[20px] shadow-2xl p-3 flex flex-col justify-between cursor-move text-white"
              >
                {/* PiP Header */}
                <div className="flex items-center justify-between pointer-events-none">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider truncate max-w-[80px]">
                    {videoJoinAsPersonal ? (loggedInUser.displayName || loggedInUser.username) : displayName}
                  </span>
                  <span className="size-2 rounded-full bg-green-500 animate-pulse" />
                </div>

                {/* PiP Body: Avatar/Waveform */}
                <div className="flex flex-col items-center justify-center flex-1 my-2 w-full h-full overflow-hidden rounded-xl relative">
                  {isCameraOn ? (
                    cameraShareType === "PHONE SCREEN" ? (
                      <div className="w-full h-full bg-gradient-to-b from-[#184e68] via-[#103040] to-[#0b1c24] flex items-center justify-center">
                        <svg className="size-6 text-white animate-pulse" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                          <path d="M17 2H7v12h10V2z" />
                        </svg>
                      </div>
                    ) : localStream ? (
                      <video 
                        ref={localVideoRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                        <UserAvatar avatarUrl={videoJoinAsPersonal ? loggedInUser.avatarUrl : undefined} size={28} className="size-7 rounded-full animate-pulse border border-white/10" />
                      </div>
                    )
                  ) : (
                    <div className="flex flex-col items-center justify-center">
                      {videoJoinAsPersonal ? (
                        <UserAvatar avatarUrl={loggedInUser.avatarUrl} size={36} className="size-9 rounded-full border border-zinc-700 mb-1.5 select-none" />
                      ) : (
                        <div className="relative size-9 rounded-full bg-[#48bb78] flex items-center justify-center text-xs font-bold uppercase shadow-md mb-1.5 select-none border border-zinc-750">
                          {(displayName || "G").slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="text-[10px] text-zinc-400">
                        {isCallMuted ? "Muted" : "Active"}
                      </span>
                    </div>
                  )}
                </div>

                {/* PiP Action Toggles */}
                <div className="flex items-center justify-around gap-1 pt-1 border-t border-zinc-800/50">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsCallMuted(!isCallMuted);
                    }}
                    className={`p-1.5 rounded-full ${isCallMuted ? "bg-zinc-800 text-zinc-400" : "bg-[#0095f6] text-white"}`}
                  >
                    {isCallMuted ? <MicOff className="size-3.5" /> : <Mic className="size-3.5" />}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsVideoCallPiP(false); // Maximize
                    }}
                    className="p-1.5 rounded-full bg-zinc-800 text-zinc-300 hover:text-white"
                  >
                    <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="15 3 21 3 21 9" />
                      <polyline points="9 21 3 21 3 15" />
                      <line x1="21" y1="3" x2="14" y2="10" />
                      <line x1="3" y1="21" x2="10" y2="14" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowVideoCallSheet(false);
                      toast({ description: "Video call ended" });
                    }}
                    className="p-1.5 rounded-full bg-[#ea4335] text-white"
                  >
                    <svg className="size-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                    </svg>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )
      )}
      {/* CSS to constrain group profile overlays within the chat area on desktop */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media (min-width: 768px) {
            .chat-area-overlay {
              left: auto !important;
              right: 0 !important;
              width: calc(100vw - 72px - 320px) !important;
              max-width: none !important;
            }
          }
          @media (min-width: 1024px) {
            .chat-area-overlay {
              width: calc(100vw - 72px - 384px) !important;
            }
          }
          @media (min-width: 1280px) {
            .chat-area-overlay {
              width: calc(100vw - 244px - 384px) !important;
            }
            .minimized-sidebar ~ .main-content-wrapper .chat-area-overlay {
              width: calc(100vw - 72px - 384px) !important;
            }
          }
        `
      }} />
    </div>
  );
}

// Social Commerce unified ShareCard renderer
function ShareCardAttachment({
  attachment,
  message,
  isOutgoing,
  isQueue,
  otherMember,
  channel
}: {
  attachment: any;
  message?: any;
  isOutgoing?: boolean;
  isQueue?: boolean;
  otherMember?: any;
  channel?: any;
}) {
  const { shareType, title, image_url, deepLink } = attachment;

  let actionLabel = "View Product";
  let icon = <ShoppingBag className="size-5 text-[#8b5cf6]" />;

  if (shareType === "POST") {
    actionLabel = "View Post";
    icon = <Layers className="size-5 text-pink-500" />;
  } else if (shareType === "REEL") {
    actionLabel = "Play Reel";
    icon = <Film className="size-5 text-red-500" />;
  } else if (shareType === "PROFILE") {
    actionLabel = "View Profile";
    icon = <User className="size-5 text-teal-500" />;
  } else if (shareType === "COLLECTION") {
    actionLabel = "Open Collection";
    icon = <BookOpen className="size-5 text-indigo-500" />;
  }

  if (shareType === "PRODUCT") {
    return (
      <div className="w-[310px] rounded-[18px] overflow-hidden border-[0.5px] border-zinc-800/40 bg-[#18181b] shadow-lg flex flex-col relative select-none">
        {image_url ? (
          <div className="relative aspect-square w-full overflow-hidden bg-zinc-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image_url} alt={title} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="flex h-40 items-center justify-center bg-zinc-900">
            <ShoppingBag className="size-8 text-zinc-500" />
          </div>
        )}
        <div className="px-3.5 pt-3.5 pb-6 flex flex-col gap-2.5 relative">
          <span className="text-[14px] font-bold text-white line-clamp-2 leading-snug">{title}</span>
          
          {(attachment.price || attachment.originalPrice) && (
            <div className="flex items-baseline gap-2">
              {attachment.price && (
                <span className="text-[15px] font-black text-[#8b5cf6]">{attachment.price}</span>
              )}
              {attachment.originalPrice && (
                <span className="text-[11px] text-zinc-500 line-through">{attachment.originalPrice}</span>
              )}
            </div>
          )}

          <a
            href={deepLink}
            target="_blank"
            rel="noreferrer"
            className="w-full py-2 rounded-xl bg-[#2a87d0] hover:bg-[#2076b4] text-center text-xs font-semibold text-white transition-colors"
          >
            View Product
          </a>

          {/* Time & Read Status checkmarks aligned bottom right */}
          {message && (
            <div className="absolute bottom-1 right-3 flex items-center gap-1 text-[9px] opacity-60 text-zinc-400 select-none pointer-events-none">
              <span>
                {new Date(message.created_at || message.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              {isOutgoing && (
                isQueue ? (
                  message.status === "PENDING" || message.status === "SENDING" ? (
                    <span className="size-2 rounded-full border border-current border-t-transparent animate-spin shrink-0" />
                  ) : (
                    <AlertCircle className="size-3 text-destructive shrink-0" />
                  )
                ) : (
                  channel?.state?.read?.[otherMember?.id || ""]?.last_read && 
                  new Date(channel.state.read[otherMember.id || ""].last_read).getTime() >= new Date(message.created_at || "").getTime() ? (
                    <span className="text-[#38bdf8] font-bold">✓✓</span>
                  ) : (
                    <span className="opacity-75">✓</span>
                  )
                )
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Non-product attachments rendered inside bubble
  return (
    <a
      href={deepLink}
      target="_blank"
      rel="noreferrer"
      className="flex flex-col rounded-xl overflow-hidden border-[0.5px] border-zinc-800/40 bg-[#1c1c1e] my-1 max-w-xs shadow-sm hover:shadow-md transition-shadow shrink-0"
    >
      {image_url ? (
        <div className="relative aspect-video w-full overflow-hidden bg-zinc-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image_url} alt={title} className="w-full h-full object-cover" />
          {shareType === "REEL" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <Film className="size-12 text-white drop-shadow" />
            </div>
          )}
        </div>
      ) : (
        <div className="flex h-24 items-center justify-center bg-zinc-900">
          {icon}
        </div>
      )}
      <div className="p-3 flex flex-col gap-1 text-start">
        <div className="flex items-center gap-1.5">
          {icon}
          <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
            {shareType}
          </span>
        </div>
        <span className="text-sm font-semibold text-white line-clamp-2 mt-1">{title}</span>
        <span className="text-xs font-medium text-primary hover:underline mt-2 self-start flex items-center gap-1">
          {actionLabel} &rarr;
        </span>
      </div>
    </a>
  );
}

// Story Reply preview renderer
function StoryReplyAttachment({ attachment }: { attachment: any }) {
  const { mediaUrl, mediaType, username } = attachment;
  return (
    <div className="flex items-center gap-3 rounded-xl bg-black/15 p-2.5 max-w-xs mb-1.5 border border-white/5 shadow-inner">
      <div className="relative size-14 rounded-lg overflow-hidden bg-zinc-900 border border-zinc-850 shrink-0 shadow-sm">
        {mediaType === "IMAGE" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaUrl} alt="Story Reply" className="w-full h-full object-cover" />
        ) : (
          <video src={mediaUrl} className="w-full h-full object-cover" muted />
        )}
      </div>
      <div className="flex flex-col text-start min-w-0">
        <span className="text-[10px] font-black text-white/45 dark:text-zinc-500 uppercase tracking-widest leading-none">Story Reply</span>
        <span className="text-sm font-semibold text-white/95 mt-1 truncate">@{username}&apos;s story</span>
      </div>
    </div>
  );
}
