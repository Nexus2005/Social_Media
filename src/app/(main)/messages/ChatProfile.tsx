"use client";

import React, { useState, useEffect } from "react";
import { X, Bell, BellOff, Image as ImageIcon, FileText, Link as LinkIcon, Mic, Film, Users, Loader2, Ban, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";
import { Channel, MessageResponse } from "stream-chat";
import { useChatUI } from "./Chat";
import UserAvatar from "@/components/UserAvatar";
import { useChat } from "../ChatProvider";
import { useToast } from "@/components/ui/use-toast";

interface ChatProfileProps {
  channel: Channel;
  onClose: () => void;
}

export default function ChatProfile({ channel, onClose }: ChatProfileProps) {
  const { mutes, togglePreference } = useChatUI();
  const [activeTab, setActiveTab] = useState<"media" | "files" | "links" | "voice" | "groups">("media");
  
  // State for loaded attachments
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [commonGroups, setCommonGroups] = useState<Channel[]>([]);

  const isMuted = mutes.some((m) => m.channelId === channel.id);
  const { toast } = useToast();
  const chatClient = useChat();

  // Get recipient information (for DMs)
  const members = Object.values(channel.state.members || {});
  const otherMember = members.find((m) => m.user?.id !== chatClient?.userID)?.user;

  const displayName = (channel.data?.name || otherMember?.name || "Chat Info") as string;

  // Fetch messages with attachments and common groups
  useEffect(() => {
    const fetchSharedAttachments = async () => {
      try {
        setLoading(true);
        const response = await channel.query({
          messages: { limit: 100 },
        });
        setMessages(response.messages || []);
      } catch (error) {
        console.error("Failed to query shared attachments:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSharedAttachments();
  }, [channel]);

  useEffect(() => {
    if (!chatClient || !otherMember) return;
    const fetchCommonGroups = async () => {
      try {
        const response = await chatClient.queryChannels({
          type: "messaging",
          members: { $in: [chatClient.userID!, otherMember.id] },
        });
        const groups = response.filter((c) => {
          const memberIds = Object.keys(c.state.members || {});
          return memberIds.includes(chatClient.userID!) && memberIds.includes(otherMember.id) && memberIds.length > 2;
        });
        setCommonGroups(groups);
      } catch (e) {
        console.error("Error fetching common groups:", e);
      }
    };
    fetchCommonGroups();
  }, [chatClient, otherMember]);

  const handleBlockUser = async () => {
    if (!chatClient || !otherMember) return;
    try {
      await chatClient.blockUser(otherMember.id);
      toast({ description: `${displayName} has been blocked.` });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", description: "Failed to block user." });
    }
  };

  const handleReportUser = async () => {
    if (!chatClient || !otherMember) return;
    try {
      await chatClient.flagUser(otherMember.id);
      toast({ description: "Conversation reported successfully." });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", description: "Failed to report." });
    }
  };

  const handleClearHistory = async () => {
    try {
      await togglePreference("clear_history", channel.id!);
      toast({ description: "Chat history cleared." });
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", description: "Failed to clear history." });
    }
  };

  // Extract shared items by category
  const images = (messages.flatMap((m) =>
    ((m.attachments || []) as any[])
      .filter((a) => a.type === "image" || a.type === "video")
      .map((a) => ({ url: a.image_url || a.asset_url || a.thumb_url || "", type: a.type || "image" }))
  ).filter((i) => i.url !== "")) as any[];

  const files = (messages.flatMap((m) =>
    ((m.attachments || []) as any[])
      .filter((a) => a.type !== "image" && a.type !== "video" && a.type !== "audio" && a.type !== "giphy" && a.type !== "sticker")
      .map((a) => ({ url: a.asset_url || a.file_url || "", name: a.title || "File Attachment", size: a.file_size }))
  ).filter((f) => f.url !== "")) as any[];

  const voice = (messages.flatMap((m) =>
    ((m.attachments || []) as any[])
      .filter((a) => a.type === "audio" || a.mime_type?.startsWith("audio/"))
      .map((a) => ({ url: a.asset_url || a.file_url || "", name: a.title || "Voice Note", duration: a.duration }))
  ).filter((v) => v.url !== "")) as any[];

  const links = (messages
    .filter((m) => m.text && /(https?:\/\/[^\s]+)/g.test(m.text))
    .map((m) => {
      const match = m.text?.match(/(https?:\/\/[^\s]+)/g);
      return match ? match[0] : "";
    })
    .filter((l) => l !== "")) as any[];

  // Toggles notifications (mute/unmute) in Postgres preferences
  const handleMuteToggle = async () => {
    if (isMuted) {
      await togglePreference("unmute", channel.id!);
    } else {
      await togglePreference("mute", channel.id!);
    }
  };

  // Get recipient information (for DMs)
  const avatarUrl = (channel.data?.image || otherMember?.image) as string | undefined;
  const username = otherMember?.username ? `@${otherMember.username}` : "";
  const bio = ((otherMember as any)?.bio || "No bio info available") as string;

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", stiffness: 350, damping: 35 }}
      className="absolute bottom-0 right-0 top-0 z-30 flex h-full w-full flex-col border-s bg-background shadow-2xl md:w-80 lg:w-96"
    >
      {/* Header Panel */}
      <div className="flex h-14 items-center justify-between border-b px-4">
        <h2 className="text-lg font-bold">User Profile</h2>
        <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted">
          <X className="size-5" />
        </button>
      </div>

      {/* Info Card Panel */}
      <div className="flex flex-col items-center border-b p-6 text-center">
        <UserAvatar avatarUrl={avatarUrl} size={100} className="size-[100px] rounded-full border shadow-sm" />
        <h3 className="mt-4 text-xl font-bold">{displayName}</h3>
        {username && <p className="text-sm text-muted-foreground">{username}</p>}
        {bio && <p className="mt-3 text-sm max-w-xs">{bio}</p>}
      </div>

      {/* Settings Row */}
      <div className="flex items-center justify-between border-b px-4 py-3.5">
        <div className="flex items-center gap-3">
          {isMuted ? <BellOff className="size-5 text-muted-foreground" /> : <Bell className="size-5 text-primary" />}
          <span className="text-sm font-medium">Notifications</span>
        </div>
        <button
          onClick={handleMuteToggle}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            !isMuted ? "bg-primary" : "bg-zinc-300 dark:bg-zinc-700"
          }`}
        >
          <span
            className={`pointer-events-none inline-block size-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
              !isMuted ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Shared Media Section Tabs */}
      <div className="flex border-b text-sm text-muted-foreground select-none overflow-x-auto">
        <button
          onClick={() => setActiveTab("media")}
          className={`flex-1 py-3 text-center font-medium border-b-2 transition-colors shrink-0 px-3 ${
            activeTab === "media" ? "border-primary text-foreground" : "border-transparent hover:text-foreground"
          }`}
        >
          Media
        </button>
        <button
          onClick={() => setActiveTab("files")}
          className={`flex-1 py-3 text-center font-medium border-b-2 transition-colors shrink-0 px-3 ${
            activeTab === "files" ? "border-primary text-foreground" : "border-transparent hover:text-foreground"
          }`}
        >
          Files
        </button>
        <button
          onClick={() => setActiveTab("links")}
          className={`flex-1 py-3 text-center font-medium border-b-2 transition-colors shrink-0 px-3 ${
            activeTab === "links" ? "border-primary text-foreground" : "border-transparent hover:text-foreground"
          }`}
        >
          Links
        </button>
        <button
          onClick={() => setActiveTab("voice")}
          className={`flex-1 py-3 text-center font-medium border-b-2 transition-colors shrink-0 px-3 ${
            activeTab === "voice" ? "border-primary text-foreground" : "border-transparent hover:text-foreground"
          }`}
        >
          Voice
        </button>
        <button
          onClick={() => setActiveTab("groups")}
          className={`flex-1 py-3 text-center font-medium border-b-2 transition-colors shrink-0 px-3 ${
            activeTab === "groups" ? "border-primary text-foreground" : "border-transparent hover:text-foreground"
          }`}
        >
          Groups
        </button>
      </div>

      {/* Media Content Panel */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {activeTab === "media" && (
              images.length > 0 ? (
                <div className="grid grid-cols-3 gap-1">
                  {images.map((item, i) => (
                    <div key={i} className="aspect-square relative cursor-pointer overflow-hidden rounded bg-muted">
                      {item.type === "video" ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <Film className="size-6 text-white" />
                        </div>
                      ) : null}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.url} alt="shared file" className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={<ImageIcon />} label="No shared media" />
              )
            )}

            {activeTab === "files" && (
              files.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {files.map((file, i) => (
                    <a
                      key={i}
                      href={file.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50"
                    >
                      <FileText className="size-5 text-muted-foreground" />
                      <div className="flex-1 overflow-hidden">
                        <p className="truncate text-sm font-medium">{file.name}</p>
                        {file.size && <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>}
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <EmptyState icon={<FileText />} label="No shared files" />
              )
            )}

            {activeTab === "links" && (
              links.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {links.map((link, i) => (
                    <a
                      key={i}
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 truncate text-sm text-primary hover:underline"
                    >
                      <LinkIcon className="size-4 shrink-0" />
                      <span className="truncate">{link}</span>
                    </a>
                  ))}
                </div>
              ) : (
                <EmptyState icon={<LinkIcon />} label="No shared links" />
              )
            )}

            {activeTab === "voice" && (
              voice.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {voice.map((audio, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
                      <Mic className="size-5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{audio.name}</p>
                        <audio src={audio.url} controls className="mt-1 h-8 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={<Mic />} label="No shared voice notes" />
              )
            )}

            {activeTab === "groups" && (
              commonGroups.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {commonGroups.map((c, i) => {
                    const m = Object.values(c.state.members || {});
                    const count = m.length;
                    return (
                      <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
                        <Users className="size-5 text-muted-foreground shrink-0" />
                        <div className="flex-1 overflow-hidden">
                          <p className="truncate text-sm font-medium">{c.data?.name || "Group Chat"}</p>
                          <p className="text-xs text-muted-foreground">{count} members</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState icon={<Users />} label="No groups in common" />
              )
            )}
          </>
        )}
      </div>

      {/* Destructive Actions Footer */}
      {otherMember && (
        <div className="border-t p-4 flex flex-col gap-2 bg-muted/10 shrink-0">
          <button
            onClick={handleClearHistory}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 py-2 text-sm font-semibold text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Clear History
          </button>
          <button
            onClick={handleBlockUser}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Ban className="size-4" />
            Block User
          </button>
          <button
            onClick={handleReportUser}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 py-2 text-sm font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:text-zinc-400 transition-colors"
          >
            <ShieldAlert className="size-4" />
            Report User
          </button>
        </div>
      )}
    </motion.div>
  );
}

function EmptyState({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
      {React.cloneElement(icon as React.ReactElement, { className: "size-8 mb-2" })}
      <p className="text-sm">{label}</p>
    </div>
  );
}
