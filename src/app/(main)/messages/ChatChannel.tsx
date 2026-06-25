"use client";

import React, { useRef, useState, useEffect, useMemo } from "react";
import { ArrowLeft, MoreVertical, Paperclip, Smile, Mic, Send, X, Pin, MessageSquare, Volume2, VolumeX, AlertCircle, Loader2, ShoppingBag, Copy, Edit2, Share2, Trash2, Film, BookOpen, Layers, User, Image as ImageIcon, FileText, Check, CornerUpLeft, Star, Phone, Plus, Video } from "lucide-react";
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
}: MessageBubbleContainerProps) => {
  const isOutgoing = message.user?.id === loggedInUser.id || (message as any).senderId === loggedInUser.id;
  const isQueue = "status" in message;
  const isSelected = selectedMessage?.id === message.id;
  const isSelectedMulti = selectedMessageIds.includes(message.id);
  const isStoryReply = message.attachments?.some((a: any) => a.type === "story-reply");
  const isProductShare = message.attachments?.some((a: any) => a.type === "share-card" && a.shareType === "PRODUCT");

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
          "relative max-w-[75%] shadow-sm cursor-pointer select-none transition-all duration-300",
          isProductShare
            ? "p-0 rounded-[18px] overflow-hidden"
            : cn(
                "px-3.5 py-2 text-[15px] leading-[20px]",
                isOutgoing
                  ? isStoryReply
                    ? "bg-gradient-to-tr from-pink-500/95 to-purple-600/95 text-white"
                    : "bg-[#7c3aed] text-white"
                  : isStoryReply
                  ? "bg-zinc-900/60 dark:bg-zinc-950/65 border border-zinc-800/50 text-white"
                  : "bg-[#1c1c1e] border border-transparent text-zinc-100",
                message.id === highlightedMessageId ? "ring-2 ring-zinc-500/30" : "",
                isSelected ? "ring-2 ring-zinc-500/20" : "",
                getBubbleCorners(isOutgoing, position)
              ),
          isFirstInGroup ? "mt-3" : "mt-0.5",
          message.id === highlightedMessageId || isSelected ? "scale-[1.03] shadow-md" : "",
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
          />
        ) : null}

        {/* Giphy Rendering */}
        {message.attachments?.some((a: any) => a.type === "giphy") ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={message.attachments.find((a: any) => a.type === "giphy")?.image_url}
            alt="GIF"
            className="max-h-40 rounded object-cover my-1 cursor-pointer"
            onClick={() => setMediaViewerState({
              attachments: [{ url: message.attachments!.find((a: any) => a.type === "giphy")!.image_url!, type: "image" }],
              initialIndex: 0
            })}
          />
        ) : null}

        {/* Standard Image Rendering */}
        {message.attachments?.some((a: any) => a.type === "image") ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={message.attachments.find((a: any) => a.type === "image")?.asset_url}
            alt="Image Attachment"
            className="max-h-48 rounded object-cover my-1 cursor-pointer"
            onClick={() => setMediaViewerState({
              attachments: [{ url: message.attachments!.find((a: any) => a.type === "image")!.asset_url!, type: "image" }],
              initialIndex: 0
            })}
          />
        ) : null}

        {/* Message Text content */}
        {message.text && (
          <p className="whitespace-pre-wrap break-words pr-14 text-[16px] leading-[22px]">{message.text}</p>
        )}

        {/* Floating Metadata (Time and status checks) */}
        {!isProductShare && (
          <div className="absolute bottom-1 right-2 flex items-center gap-1 text-[9px] opacity-75 shrink-0 pointer-events-none select-none">
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
                  <span className="opacity-75 text-white">✓</span>
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

      {/* Floating Reaction Capsule above the bubble when selected */}
      <AnimatePresence>
        {isSelected && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10, x: "-50%" }}
            animate={{ opacity: 1, scale: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, scale: 0.8, y: 10, x: "-50%" }}
            className="absolute -top-16 left-1/2 z-50 bg-[#1f2c34] dark:bg-[#233138] border border-[#2f3b43] rounded-full px-4 py-2.5 shadow-2xl flex items-center gap-3 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            {["👍", "❤️", "😂", "😮", "😢", "🙏"].map((emoji) => (
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
              className="size-8 rounded-full bg-[#374248] hover:bg-[#465158] flex items-center justify-center text-zinc-400 font-bold text-lg cursor-pointer shrink-0"
            >
              +
            </button>
          </motion.div>
        )}
      </AnimatePresence>
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

  // Selection Mode states
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<MessageResponse | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  // Upload file attachment
  const handleSelectFile = async (file: File) => {
    if (!channel) return;
    try {
      // Optimistic file uploading card in message list
      const tempId = `file-${Date.now()}`;
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

      await outgoingMessageQueue.addMessage(channel, "", loggedInUser.id, [
        {
          type,
          asset_url: fileUrl,
          title: file.name,
          file_size: file.size,
        },
      ]);
    } catch (error) {
      console.error("Failed to upload file:", error);
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

  const members = Object.values(channel.state.members || {});
  const otherMember = members.find((m) => m.user?.id !== loggedInUser.id)?.user;
  
  const displayName = channel.data?.name || otherMember?.name || "Chat Room";
  const avatarUrl = channel.data?.image || otherMember?.image;
  const isOnline = otherMember?.online || false;

  // Pinned Message banner
  const pinnedMessages = messages.filter((m) => m.pinned);
  const latestPinned = pinnedMessages[pinnedMessages.length - 1];

  return (
    <div className="flex h-full w-full flex-col bg-background select-none relative">
      {/* Header Panel */}
      {selectedMessage ? (
        <div className="flex h-14 items-center justify-between border-b bg-[#005c4b] text-white px-4 z-30 animate-fade-in shrink-0 shadow-md">
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
        <div className="flex h-14 items-center justify-between border-b bg-primary/10 px-3 z-10 animate-fade-in shrink-0">
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
        <div className="flex h-16 items-center justify-between bg-[#09090b] border-b border-zinc-800/60 px-4 z-10 shrink-0">
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
              onClick={() => setProfileOverlayChannel(channel)}
            >
              <div className="rounded-full p-[2.5px] bg-gradient-to-tr from-[#f91f76] to-[#a83ffc] shadow-md flex items-center justify-center">
                <div className="rounded-full bg-[#09090b] p-[1.5px] flex items-center justify-center">
                  <UserAvatar avatarUrl={avatarUrl as string | undefined} size={36} className="size-9 rounded-full border-none" />
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
              onClick={() => setProfileOverlayChannel(channel)}
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
        className="flex-1 overflow-y-auto px-4 py-4 relative"
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
      <div className="flex flex-col bg-[#09090b] border-t border-zinc-800/60 relative z-25">
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
                showStickerPicker ? "text-[#7c3aed]" : "text-zinc-400 hover:text-zinc-200"
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
            className="size-10 rounded-full bg-[#7c3aed] text-white flex items-center justify-center shadow-lg hover:bg-[#6d28d9] active:scale-95 transition-all shrink-0 cursor-pointer"
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
          onSelectFile={handleSelectFile}
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

      {/* Forward Message Selector Dialog */}
      {showForwardDialog && forwardingMessage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => {
            setShowForwardDialog(false);
            setForwardingMessage(null);
          }}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-card border shadow-2xl p-4 flex flex-col gap-3 mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-semibold text-base text-foreground">Forward Message</span>
              <button
                onClick={() => {
                  setShowForwardDialog(false);
                  setForwardingMessage(null);
                }}
                className="rounded-full p-1.5 hover:bg-muted text-muted-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground mb-1">
              Select a conversation to forward this message to:
            </p>

            <div className="max-h-60 overflow-y-auto flex flex-col gap-1.5">
              {forwardChannels.length > 0 ? (
                forwardChannels.map((c) => {
                  const m = Object.values(c.state.members || {});
                  const other = m.find((member) => member.user?.id !== loggedInUser.id)?.user;
                  const name = c.data?.name || other?.name || "Chat Room";
                  const avatar = c.data?.image || other?.image;
                  
                  return (
                    <button
                      key={c.id}
                      onClick={() => handleForwardToChannel(c)}
                      className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-muted text-start w-full border border-transparent hover:border-border transition-colors"
                    >
                      <UserAvatar avatarUrl={avatar as string | undefined} size={36} className="size-9 border" />
                      <span className="text-sm font-semibold truncate">{name}</span>
                    </button>
                  );
                })
              ) : (
                <div className="flex h-20 items-center justify-center text-xs text-muted-foreground">
                  No other active chats found.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
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
      <div className="w-[280px] rounded-[18px] overflow-hidden border border-zinc-800 bg-[#18181b] shadow-lg flex flex-col relative select-none">
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
            className="w-full py-2 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-center text-xs font-semibold text-white transition-colors"
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
      className="flex flex-col rounded-xl overflow-hidden border border-zinc-800 bg-[#1c1c1e] my-1 max-w-xs shadow-sm hover:shadow-md transition-shadow shrink-0"
    >
      {image_url ? (
        <div className="relative aspect-video w-full overflow-hidden bg-zinc-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image_url} alt={title} className="w-full h-full object-cover" />
          {shareType === "REEL" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <Film className="size-8 text-white drop-shadow" />
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
