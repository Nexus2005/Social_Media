"use client";

import React, { useState, useEffect } from "react";
import { Search, FolderDown, Edit, Pin, VolumeX, Check, CheckCheck, Loader2, LogOut } from "lucide-react";
import { Channel, UserResponse } from "stream-chat";
import { useChat } from "../ChatProvider";
import { useChatUI } from "./Chat";
import UserAvatar from "@/components/UserAvatar";
import NewChatDialog from "./NewChatDialog";
import { draftStorage } from "@/lib/draft-storage";
import { useSession } from "../SessionProvider";
import { Button } from "@/components/ui/button";

export default function ChatSidebar() {
  const chatClient = useChat();
  const { user: loggedInUser } = useSession();
  
  const {
    activeChannel,
    setActiveChannel,
    pins,
    archives,
    mutes,
    setMobileView,
  } = useChatUI();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchUsers, setSearchUsers] = useState<UserResponse[]>([]);
  const [searching, setSearching] = useState(false);
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  // Load channels and register event listeners
  useEffect(() => {
    if (!chatClient || !loggedInUser) return;

    const fetchChannels = async () => {
      try {
        setLoading(true);
        const filter = { members: { $in: [loggedInUser.id] } };
        const sort: any = { last_message_at: -1 };
        const list = await chatClient.queryChannels(filter, sort, {
          watch: true,
          state: true,
          presence: true,
        });
        setChannels(list);
        
        // Fetch drafts from IndexedDB for each channel
        const draftsMap: Record<string, string> = {};
        for (const channel of list) {
          const draft = await draftStorage.getDraft(channel.id!);
          if (draft && draft.draftText) {
            draftsMap[channel.id!] = draft.draftText;
          }
        }
        setDrafts(draftsMap);
      } catch (error) {
        console.error("Failed to query Stream channels:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchChannels();

    // Stream Chat Real-time Listeners
    const handleNewMessage = () => fetchChannels();
    const handlePresence = () => fetchChannels();
    
    chatClient.on("message.new", handleNewMessage);
    chatClient.on("notification.message_new", handleNewMessage);
    chatClient.on("user.presence.changed", handlePresence);
    chatClient.on("message.read", handleNewMessage);
    chatClient.on("notification.mark_read", handleNewMessage);

    return () => {
      chatClient.off("message.new", handleNewMessage);
      chatClient.off("notification.message_new", handleNewMessage);
      chatClient.off("user.presence.changed", handlePresence);
      chatClient.off("message.read", handleNewMessage);
      chatClient.off("notification.mark_read", handleNewMessage);
    };
  }, [chatClient, loggedInUser]);

  // Global user search Suggester
  useEffect(() => {
    if (!chatClient || !searchQuery) {
      setSearchUsers([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        setSearching(true);
        const response = await chatClient.queryUsers(
          {
            id: { $ne: loggedInUser.id },
            role: { $ne: "admin" },
            $or: [
              { name: { $autocomplete: searchQuery } },
              { username: { $autocomplete: searchQuery } },
            ],
          },
          { name: 1, username: 1 },
          { limit: 8 }
        );
        setSearchUsers(response.users || []);
      } catch (error) {
        console.error("Failed to query global users:", error);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [chatClient, searchQuery, loggedInUser.id]);

  // Handle start chat with search suggested user
  const handleStartChat = async (user: UserResponse) => {
    if (!chatClient) return;
    try {
      const channel = chatClient.channel("messaging", {
        members: [loggedInUser.id, user.id],
      });
      await channel.watch();
      setActiveChannel(channel);
      setMobileView("chat");
      setSearchQuery("");
      setSearchUsers([]);
    } catch (error) {
      console.error("Failed to initiate channel with user:", error);
    }
  };

  // Organize channels: Pinned, Archived, Active
  const archivedChannels = channels.filter((c) => archives.includes(c.id!));
  const activeChatList = channels.filter((c) => !archives.includes(c.id!));

  // Sort: pins first, then chronologically by last_message_at
  const sortedChannels = [...activeChatList].sort((a, b) => {
    const aPinned = pins.includes(a.id!);
    const bPinned = pins.includes(b.id!);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;

    const aTime = a.state.last_message_at ? new Date(a.state.last_message_at).getTime() : 0;
    const bTime = b.state.last_message_at ? new Date(b.state.last_message_at).getTime() : 0;
    return bTime - aTime;
  });

  // Filter channels based on local search input
  const filteredChannels = sortedChannels.filter((channel) => {
    if (!searchQuery) return true;
    const members = Object.values(channel.state.members || {});
    const otherMember = members.find((m) => m.user?.id !== loggedInUser.id)?.user;
    const channelName = channel.data?.name || otherMember?.name || "";
    return channelName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex h-full w-full flex-col bg-background select-none">
      {/* Search Header Panel */}
      <div className="flex items-center gap-3 p-3 pb-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 transform text-muted-foreground" />
          <input
            type="text"
            placeholder="Search Chats"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-lg bg-muted/50 pe-3 ps-10 text-sm focus:outline-none focus:ring-1 focus:ring-primary/45 border"
          />
        </div>
        <button
          onClick={() => setShowNewChatDialog(true)}
          className="rounded-full bg-primary/10 p-2 text-primary hover:bg-primary/20 transition-colors"
          title="New Message"
        >
          <Edit className="size-4" />
        </button>
      </div>

      {/* Main Channels List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Global User Suggestion List */}
            {searchQuery && searchUsers.length > 0 && (
              <div className="border-b pb-2">
                <span className="px-4 py-1 text-xs font-bold text-muted-foreground uppercase tracking-wider block">Global Suggestions</span>
                {searching ? (
                  <Loader2 className="mx-auto my-3 size-4 animate-spin text-muted-foreground" />
                ) : (
                  searchUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleStartChat(user)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-muted/50 text-start"
                    >
                      <UserAvatar avatarUrl={user.image as string | null | undefined} size={40} />
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold">{user.name}</span>
                        <span className="text-xs text-muted-foreground">@{user.username}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Archived Folders Row */}
            {!searchQuery && archivedChannels.length > 0 && (
              <div className="border-b">
                <button
                  onClick={() => setShowArchived(!showArchived)}
                  className="flex w-full items-center gap-3 px-4 py-3 hover:bg-muted/30 text-start transition-colors"
                >
                  <div className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <FolderDown className="size-5" />
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-foreground">Archived Chats</span>
                    <p className="text-xs text-muted-foreground">{archivedChannels.length} chats</p>
                  </div>
                </button>

                {/* Collapsible Archived List */}
                {showArchived && (
                  <div className="bg-muted/10 border-t">
                    {archivedChannels.map((channel) => (
                      <ChatRow
                        key={channel.id}
                        channel={channel}
                        draftText={drafts[channel.id!]}
                        isActive={activeChannel?.id === channel.id}
                        isPinned={pins.includes(channel.id!)}
                        isMuted={mutes.some((m) => m.channelId === channel.id)}
                        onClick={() => {
                          setActiveChannel(channel);
                          setMobileView("chat");
                        }}
                        loggedInUserId={loggedInUser.id}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Active Chats List */}
            <div className="flex flex-col">
              {filteredChannels.map((channel) => (
                <ChatRow
                  key={channel.id}
                  channel={channel}
                  draftText={drafts[channel.id!]}
                  isActive={activeChannel?.id === channel.id}
                  isPinned={pins.includes(channel.id!)}
                  isMuted={mutes.some((m) => m.channelId === channel.id)}
                  onClick={() => {
                    setActiveChannel(channel);
                    setMobileView("chat");
                  }}
                  loggedInUserId={loggedInUser.id}
                />
              ))}

              {filteredChannels.length === 0 && !searchQuery && (
                <p className="text-center text-sm text-muted-foreground mt-12 px-4">
                  No conversations yet. Tap the edit icon to start.
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Compose Dialog overlay */}
      {showNewChatDialog && (
        <NewChatDialog
          onOpenChange={setShowNewChatDialog}
          onChatCreated={() => setShowNewChatDialog(false)}
        />
      )}
    </div>
  );
}

interface ChatRowProps {
  channel: Channel;
  draftText?: string;
  isActive: boolean;
  isPinned: boolean;
  isMuted: boolean;
  onClick: () => void;
  loggedInUserId: string;
}

function ChatRow({ channel, draftText, isActive, isPinned, isMuted, onClick, loggedInUserId }: ChatRowProps) {
  const members = Object.values(channel.state.members || {});
  const otherMember = members.find((m) => m.user?.id !== loggedInUserId)?.user;
  
  const displayName = channel.data?.name || otherMember?.name || "Chat Room";
  const avatarUrl = channel.data?.image || otherMember?.image;
  const isOnline = otherMember?.online || false;

  // Extract last message info
  const messages = channel.state.messages || [];
  const lastMessage = messages[messages.length - 1];
  
  const unreadCount = channel.countUnread();
  
  // Format Timestamp (Telegram-style)
  let timestampStr = "";
  if (channel.state.last_message_at) {
    const date = new Date(channel.state.last_message_at);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      timestampStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else {
      timestampStr = date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  }

  // Last message string formatter
  const renderLastMessage = () => {
    if (draftText) {
      return (
        <span className="text-sm">
          <span className="text-red-500 font-medium">Draft: </span>
          <span className="text-muted-foreground">{draftText}</span>
        </span>
      );
    }
    
    if (!lastMessage) return "No messages";

    const sender = lastMessage.user?.id === loggedInUserId ? "You: " : "";
    
    // Check attachments
    if (lastMessage.attachments?.length) {
      const type = lastMessage.attachments[0].type;
      return (
        <span className="text-muted-foreground text-sm flex items-center gap-1.5 truncate">
          <span>{sender}</span>
          <span className="italic text-primary">[{type === "image" ? "Photo" : type === "video" ? "Video" : "File"}]</span>
          <span>{lastMessage.text}</span>
        </span>
      );
    }

    return (
      <span className="text-muted-foreground text-sm truncate">
        {sender}{lastMessage.text}
      </span>
    );
  };

  return (
    <button
      onClick={onClick}
      className={`relative flex w-full items-center gap-3 px-4 py-2.5 transition-colors ${
        isActive ? "bg-muted" : "hover:bg-muted/30"
      }`}
    >
      {/* Avatar circular frame (56px) */}
      <div className="relative size-11 shrink-0">
        <UserAvatar avatarUrl={avatarUrl as string | null | undefined} size={44} className="size-[44px] rounded-full border" />
        {isOnline && (
          <span className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-background bg-green-500" />
        )}
      </div>

      {/* Row detail cards */}
      <div className="flex flex-1 flex-col overflow-hidden text-start">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold truncate flex-1 pr-2">{displayName}</span>
          <span className="text-xs text-muted-foreground shrink-0">{timestampStr}</span>
        </div>
        
        <div className="flex items-center justify-between mt-0.5">
          <div className="truncate flex-1 pr-4">
            {renderLastMessage()}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isMuted && <VolumeX className="size-3 text-muted-foreground" />}
            {isPinned && <Pin className="size-3 text-muted-foreground fill-muted-foreground rotate-45" />}
            
            {/* Unread badge */}
            {unreadCount > 0 && (
              <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${
                isMuted ? "bg-zinc-400" : "bg-primary"
              }`}>
                {unreadCount}
              </span>
            )}
            
            {/* Delivery/Seen status indicator checkmarks */}
            {!unreadCount && lastMessage && lastMessage.user?.id === loggedInUserId && (
              channel.state.read[otherMember?.id || ""]?.last_read && 
              new Date(channel.state.read[otherMember?.id || ""]!.last_read).getTime() >= new Date(lastMessage.created_at).getTime() ? (
                <CheckCheck className="size-4 text-primary" />
              ) : (
                <Check className="size-4 text-muted-foreground" />
              )
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
