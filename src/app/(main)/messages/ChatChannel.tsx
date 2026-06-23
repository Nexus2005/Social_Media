"use client";

import React, { useRef, useState, useEffect, useMemo } from "react";
import { ArrowLeft, MoreVertical, Paperclip, Smile, Mic, Send, X, Pin, MessageSquare, Volume2, VolumeX, AlertCircle, Loader2, ShoppingBag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Channel, MessageResponse } from "stream-chat";
import { useChatUI } from "./Chat";
import { useSession } from "../SessionProvider";
import UserAvatar from "@/components/UserAvatar";
import { outgoingMessageQueue, QueueMessage } from "@/lib/message-queue";
import { draftStorage } from "@/lib/draft-storage";
import AttachmentPicker from "./AttachmentPicker";
import StickerPicker from "./StickerPicker";

export default function ChatChannel() {
  const { user: loggedInUser } = useSession();
  
  const {
    activeChannel: channel,
    setActiveChannel,
    setMobileView,
    pins,
    mutes,
    togglePreference,
    setMediaViewerState,
    setProfileOverlayChannel,
  } = useChatUI();

  const parentRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // UI state
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [queueMessages, setQueueMessages] = useState<QueueMessage[]>([]);
  const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [replyMessage, setReplyMessage] = useState<MessageResponse | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingState, setTypingState] = useState<string | null>(null);

  const isMuted = channel ? mutes.some((m) => m.channelId === channel.id) : false;
  const isPinned = channel ? pins.includes(channel.id!) : false;

  // Combine real and optimistic queue messages
  const allMessages = useMemo(() => {
    return [...messages, ...queueMessages];
  }, [messages, queueMessages]);

  // Virtualizer setup
  const rowVirtualizer = useVirtualizer({
    count: allMessages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 70,
    overscan: 10,
  });

  // Scroll to bottom on load or new message
  useEffect(() => {
    if (allMessages.length > 0) {
      rowVirtualizer.scrollToIndex(allMessages.length - 1, { align: "end" });
    }
  }, [allMessages.length, rowVirtualizer]);

  // Load message history and bind listeners
  useEffect(() => {
    if (!channel) return;
    const loadHistory = async () => {
      try {
        const response = await channel.query({
          messages: { limit: 100 },
        });
        setMessages(response.messages || []);
        
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
      channel.keystroke();
    } else {
      draftStorage.deleteDraft(channel.id!);
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!channel || !inputText.trim()) return;

    const textToSend = inputText;
    setInputText("");
    draftStorage.deleteDraft(channel.id!);
    setReplyMessage(null);

    // Optimistic delivery via OutgoingMessageQueue
    await outgoingMessageQueue.addMessage(channel, textToSend, loggedInUser.id, []);
  };

  // Send product/reel/post share cards
  const handleSelectShare = async (share: { type: string; id: string; title: string; thumbnailUrl?: string; deepLink: string }) => {
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
      <div className="flex h-14 items-center justify-between border-b bg-card/50 px-3 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setActiveChannel(null);
              setMobileView("list");
            }}
            className="rounded-full p-1.5 hover:bg-muted md:hidden"
          >
            <ArrowLeft className="size-5" />
          </button>
          
          {/* Avatar details */}
          <div
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-85"
            onClick={() => setProfileOverlayChannel(channel)}
          >
            <UserAvatar avatarUrl={avatarUrl as string | undefined} size={36} className="size-9 border" />
            <div className="flex flex-col text-start leading-tight">
              <span className="text-sm font-semibold">{displayName}</span>
              <span className="text-[10px] text-muted-foreground">
                {typingState || (isOnline ? "online" : "offline")}
              </span>
            </div>
          </div>
        </div>

        {/* Ellipsis Actions menu */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleMute}
            className="rounded-full p-1.5 hover:bg-muted text-muted-foreground"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="size-4 text-red-500" /> : <Volume2 className="size-4" />}
          </button>
          <button
            onClick={handlePin}
            className="rounded-full p-1.5 hover:bg-muted text-muted-foreground"
            title={isPinned ? "Unpin" : "Pin"}
          >
            <Pin className={`size-4 ${isPinned ? "text-primary fill-primary rotate-45" : ""}`} />
          </button>
          <button
            onClick={() => setProfileOverlayChannel(channel)}
            className="rounded-full p-1.5 hover:bg-muted text-muted-foreground"
          >
            <MoreVertical className="size-4" />
          </button>
        </div>
      </div>

      {/* Pinned Messages Banner */}
      {latestPinned && (
        <div
          onClick={() => {
            const idx = allMessages.findIndex((m) => m.id === latestPinned.id);
            if (idx !== -1) rowVirtualizer.scrollToIndex(idx, { align: "center" });
          }}
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

      {/* Scrollable Messages Panel */}
      <div
        ref={parentRef}
        className="flex-1 overflow-y-auto px-4 py-3 bg-muted/5 relative"
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const message = allMessages[virtualRow.index] as any;
            const isOutgoing = message.user?.id === loggedInUser.id;
            const isQueue = "status" in message;
            
            // Grouping bubble shapes
            const prevMsg = allMessages[virtualRow.index - 1] as any;
            const isFirstInGroup = !prevMsg || prevMsg.user?.id !== message.user?.id;

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
                className={`py-0.5 flex ${isOutgoing ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`relative max-w-[70vw] rounded-2xl px-3 py-1.5 text-sm ${
                    isOutgoing
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-card border border-border/50 text-foreground rounded-tl-sm"
                  } ${isFirstInGroup ? "mt-1.5" : "mt-0.5"}`}
                >
                  {/* Sender Name if Group chat */}
                  {!isOutgoing && isFirstInGroup && channel.data?.isGroup && (
                    <span className="text-[10px] font-bold text-primary block mb-0.5">
                      {message.user?.name}
                    </span>
                  )}

                  {/* Share Card Payload Rendering */}
                  {message.attachments?.some((a: any) => a.type === "share-card") ? (
                    <ShareCardAttachment
                      attachment={message.attachments.find((a: any) => a.type === "share-card")}
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
                    <p className="whitespace-pre-wrap break-words pr-12">{message.text}</p>
                  )}

                  {/* Floating Metadata (Time and status checks) */}
                  <div className="absolute bottom-1 right-2 flex items-center gap-1 text-[9px] opacity-75">
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
                        new Date(channel.state.read[otherMember?.id || ""]!.last_read).getTime() >= new Date(message.created_at).getTime() ? (
                          <span className="text-white font-bold">✓✓</span>
                        ) : (
                          <span className="opacity-75 text-white">✓</span>
                        )
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reply Preview Bar */}
      {replyMessage && (
        <div className="flex h-12 items-center justify-between border-t bg-muted/20 px-3 text-xs">
          <div className="flex items-center gap-2 truncate">
            <MessageSquare className="size-4 text-primary shrink-0" />
            <div className="truncate flex flex-col text-start">
              <span className="font-bold text-primary">Reply to {replyMessage.user?.name}</span>
              <span className="text-[10px] text-muted-foreground truncate">{replyMessage.text}</span>
            </div>
          </div>
          <button onClick={() => setReplyMessage(null)} className="text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Input Message Composer Bar */}
      <div className="flex flex-col border-t bg-card">
        <div className="flex items-end gap-2 p-2">
          {/* Sticker drawer toggle */}
          <button
            onClick={() => {
              setShowStickerPicker(!showStickerPicker);
              setShowAttachmentPicker(false);
            }}
            className={`rounded-full p-2 hover:bg-muted transition-colors ${
              showStickerPicker ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Smile className="size-5" />
          </button>

          {/* Attachment Paperclip toggle */}
          <button
            onClick={() => {
              setShowAttachmentPicker(true);
              setShowStickerPicker(false);
            }}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted transition-colors"
          >
            <Paperclip className="size-5" />
          </button>

          {/* Expanding input text editor */}
          <textarea
            ref={textareaRef}
            placeholder="Message"
            value={inputText}
            onChange={handleInputChange}
            rows={1}
            style={{ maxHeight: "120px" }}
            className="flex-1 resize-none rounded-lg border bg-muted/40 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/45 h-9 min-h-[36px]"
          />

          {/* Send FAB Action */}
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim()}
            className="rounded-full bg-primary p-2 text-primary-foreground hover:bg-primary/95 disabled:opacity-50 shrink-0"
          >
            <Send className="size-4" />
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
    </div>
  );
}

// Social Commerce unified ShareCard renderer
function ShareCardAttachment({ attachment }: { attachment: any }) {
  return (
    <a
      href={attachment.deepLink}
      target="_blank"
      rel="noreferrer"
      className="flex gap-3 rounded-lg border bg-muted/20 p-2 my-1 hover:bg-muted/40 max-w-sm"
    >
      {attachment.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={attachment.image_url} alt={attachment.title} className="size-12 rounded object-cover border shrink-0" />
      ) : (
        <div className="flex size-12 items-center justify-center rounded bg-muted shrink-0">
          <ShoppingBag className="size-6 text-primary" />
        </div>
      )}
      <div className="flex flex-col text-start justify-center overflow-hidden">
        <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">
          Shared {attachment.shareType}
        </span>
        <span className="text-xs font-semibold truncate block mt-0.5">{attachment.title}</span>
        <span className="text-[9px] text-muted-foreground block truncate mt-0.5">Tap to view</span>
      </div>
    </a>
  );
}
