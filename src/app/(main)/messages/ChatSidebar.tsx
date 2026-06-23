"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Search, FolderDown, Edit, Pin, VolumeX, Check, CheckCheck, Loader2, LogOut, Volume2, Trash2, X } from "lucide-react";
import { Channel, UserResponse } from "stream-chat";
import { useChat } from "../ChatProvider";
import { useChatUI } from "./Chat";
import UserAvatar from "@/components/UserAvatar";
import NewChatDialog from "./NewChatDialog";
import { draftStorage } from "@/lib/draft-storage";
import { useSession } from "../SessionProvider";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

const getFuzzyRatio = (str: string, query: string): number => {
  str = str.toLowerCase();
  query = query.toLowerCase();
  if (str === query) return 1.0;
  if (str.startsWith(query)) return 0.8 + (query.length / str.length) * 0.15;
  if (str.includes(query)) return 0.5 + (query.length / str.length) * 0.2;
  
  const strWords = str.split(/[\s_-]+/);
  const queryWords = query.split(/[\s_-]+/);
  let matches = 0;
  for (const qWord of queryWords) {
    if (strWords.some(sWord => sWord.includes(qWord) || qWord.includes(sWord))) {
      matches++;
    }
  }
  return matches / Math.max(strWords.length, queryWords.length);
};

const rankSearchUsers = (users: any[], query: string, recentChatUserIds: string[]) => {
  const q = query.toLowerCase().trim();
  if (!q) return users;

  return [...users].sort((a, b) => {
    const aExactUsername = a.username?.toLowerCase() === q;
    const bExactUsername = b.username?.toLowerCase() === q;
    if (aExactUsername && !bExactUsername) return -1;
    if (!aExactUsername && bExactUsername) return 1;

    const aExactName = a.displayName?.toLowerCase() === q;
    const bExactName = b.displayName?.toLowerCase() === q;
    if (aExactName && !bExactName) return -1;
    if (!aExactName && bExactName) return 1;

    const aRecent = recentChatUserIds.includes(a.id);
    const bRecent = recentChatUserIds.includes(b.id);
    if (aRecent && !bRecent) return -1;
    if (!aRecent && bRecent) return 1;

    const aMutual = a.isFollowing && a.isFollower;
    const bMutual = b.isFollowing && b.isFollower;
    if (aMutual && !bMutual) return -1;
    if (!aMutual && bMutual) return 1;

    if (a.isFollowing && !b.isFollowing) return -1;
    if (!a.isFollowing && b.isFollowing) return 1;

    if (a.verified && !b.verified) return -1;
    if (!a.verified && b.verified) return 1;

    const aFuzzy = Math.max(getFuzzyRatio(a.username || "", q), getFuzzyRatio(a.displayName || "", q));
    const bFuzzy = Math.max(getFuzzyRatio(b.username || "", q), getFuzzyRatio(b.displayName || "", q));
    if (aFuzzy !== bFuzzy) {
      return bFuzzy - aFuzzy;
    }

    return 0;
  });
};

export default function ChatSidebar() {
  const chatClient = useChat();
  const { user: loggedInUser } = useSession();
  const queryClient = useQueryClient();
  
  const {
    activeChannel,
    setActiveChannel,
    pins,
    archives,
    mutes,
    togglePreference,
    setMobileView,
  } = useChatUI();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchUsers, setSearchUsers] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  // Focus and context state
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<any[]>([]);
  const [contextMenuChannel, setContextMenuChannel] = useState<Channel | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);

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
    const handleNewMessage = (event: any) => {
      const channelId = event.channel_id;
      if (!channelId) return;
      setChannels((prev) => {
        const index = prev.findIndex((c) => c.id === channelId);
        if (index > -1) {
          const updated = [...prev];
          const channel = updated[index];
          updated.splice(index, 1);
          return [channel, ...updated];
        } else {
          fetchChannels();
          return prev;
        }
      });
    };

    const handlePresence = () => {
      setChannels((prev) => [...prev]);
    };

    const handleMarkRead = () => {
      setChannels((prev) => [...prev]);
    };

    const handleChannelHidden = (event: any) => {
      const channelId = event.channel_id;
      if (channelId) {
        setChannels((prev) => prev.filter((c) => c.id !== channelId));
      }
    };

    const handleChannelVisible = () => {
      fetchChannels();
    };

    chatClient.on("message.new", handleNewMessage);
    chatClient.on("notification.message_new", fetchChannels);
    chatClient.on("user.presence.changed", handlePresence);
    chatClient.on("message.read", handleMarkRead);
    chatClient.on("notification.mark_read", handleMarkRead);
    chatClient.on("channel.hidden", handleChannelHidden);
    chatClient.on("channel.visible", handleChannelVisible);

    return () => {
      chatClient.off("message.new", handleNewMessage);
      chatClient.off("notification.message_new", fetchChannels);
      chatClient.off("user.presence.changed", handlePresence);
      chatClient.off("message.read", handleMarkRead);
      chatClient.off("notification.mark_read", handleMarkRead);
      chatClient.off("channel.hidden", handleChannelHidden);
      chatClient.off("channel.visible", handleChannelVisible);
    };
  }, [chatClient, loggedInUser]);

  const recentChatUserIds = useMemo(() => {
    return channels.flatMap((c) =>
      Object.keys(c.state.members || {}).filter((id) => id !== loggedInUser.id)
    );
  }, [channels, loggedInUser.id]);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("cartly-recent-searches");
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleAddRecentSearch = (user: any) => {
    try {
      const item = {
        id: user.id,
        name: user.name || user.displayName,
        image: user.image || user.avatarUrl,
        username: user.username,
      };
      const stored = localStorage.getItem("cartly-recent-searches");
      let list = stored ? JSON.parse(stored) : [];
      list = list.filter((i: any) => i.id !== item.id);
      list.unshift(item);
      list = list.slice(0, 8);
      localStorage.setItem("cartly-recent-searches", JSON.stringify(list));
      setRecentSearches(list);
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearRecentSearches = () => {
    try {
      localStorage.removeItem("cartly-recent-searches");
      setRecentSearches([]);
    } catch (e) {
      console.error(e);
    }
  };

  // Global user search Suggester
  useEffect(() => {
    if (!chatClient || !searchQuery) {
      setSearchUsers([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await fetch(`/api/search?type=accounts&q=${encodeURIComponent(searchQuery)}`);
        if (!res.ok) throw new Error("Failed to fetch users");
        const data = await res.json();
        const mappedUsers = (data.users || [])
          .filter((u: any) => u.id !== loggedInUser.id)
          .map((u: any) => ({
            id: u.id,
            name: u.displayName || u.username,
            image: u.avatarUrl,
            username: u.username,
            isFollowing: u.isFollowing,
            isFollower: u.isFollower,
            verified: u.verified,
          }));
        
        const ranked = rankSearchUsers(mappedUsers, searchQuery, recentChatUserIds);
        setSearchUsers(ranked);
      } catch (error) {
        console.error("Failed to query global users:", error);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [chatClient, searchQuery, loggedInUser.id, recentChatUserIds]);

  // Handle start chat with search suggested user
  const handleStartChat = async (user: any) => {
    if (!chatClient) return;
    try {
      handleAddRecentSearch(user);
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

  const handleContextMenu = (e: React.MouseEvent, channel: Channel) => {
    e.preventDefault();
    setContextMenuChannel(channel);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
  };

  return (
    <div className="flex h-full w-full flex-col bg-background select-none relative">
      {/* Search Header Panel */}
      <div className="flex items-center gap-3 p-3 pb-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 transform text-muted-foreground" />
          <input
            type="text"
            placeholder="Search Chats"
            value={searchQuery}
            onFocus={() => setIsSearchFocused(true)}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-lg bg-muted/50 pe-8 ps-10 text-sm focus:outline-none focus:ring-1 focus:ring-primary/45 border"
          />
          {isSearchFocused && (
            <button
              onClick={() => {
                setSearchQuery("");
                setIsSearchFocused(false);
              }}
              className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 transform text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowNewChatDialog(true)}
          className="rounded-full bg-primary/10 p-2 text-primary hover:bg-primary/20 transition-colors shrink-0"
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
            {/* Recent Searches Panel (horizontal avatars) */}
            {!searchQuery && isSearchFocused && recentSearches.length > 0 && (
              <div className="border-b pb-3 bg-card px-4 py-2.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Recent Searches</span>
                  <button 
                    onClick={handleClearRecentSearches}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    Clear All
                  </button>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
                  {recentSearches.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleStartChat(item)}
                      className="flex flex-col items-center gap-1 min-w-[64px] text-center"
                    >
                      <UserAvatar avatarUrl={item.image} size={48} className="size-12 border" />
                      <span className="text-[11px] font-medium text-foreground truncate max-w-[64px]">
                        {item.name.split(" ")[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

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
                      <UserAvatar avatarUrl={user.image as string | null | undefined} size={48} className="size-[48px]" />
                      <div className="flex flex-col">
                        <span className="text-[17px] font-semibold text-foreground flex items-center gap-1">
                          {user.name}
                          {user.verified && (
                            <span className="bg-primary text-white rounded-full p-0.5 text-[8px] leading-none">✓</span>
                          )}
                        </span>
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
                  className="flex w-full items-center gap-3 px-4 h-[72px] hover:bg-muted/30 text-start transition-colors"
                >
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <FolderDown className="size-6" />
                  </div>
                  <div className="flex-1">
                    <span className="text-[17px] font-semibold text-foreground">Archived Chats</span>
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
                        onContextMenu={handleContextMenu}
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
                  onContextMenu={handleContextMenu}
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

      {/* Context Actions Menu Overlay */}
      {contextMenuChannel && contextMenuPosition && (
        <div
          className="fixed inset-0 z-50 bg-black/10 cursor-default"
          onClick={() => {
            setContextMenuChannel(null);
            setContextMenuPosition(null);
          }}
        >
          <div
            style={{
              position: "fixed",
              top: Math.min(contextMenuPosition.y, window.innerHeight - 280),
              left: Math.min(contextMenuPosition.x, window.innerWidth - 220),
            }}
            className="z-50 w-52 rounded-2xl bg-card border border-border/80 shadow-2xl p-1.5 flex flex-col gap-0.5 text-[14px]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={async () => {
                const channelId = contextMenuChannel.id!;
                const isPinned = pins.includes(channelId);
                await togglePreference(isPinned ? "unpin" : "pin", channelId);
                setContextMenuChannel(null);
                setContextMenuPosition(null);
              }}
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted text-start w-full text-foreground"
            >
              <Pin className="size-4 text-muted-foreground rotate-45" />
              <span>{pins.includes(contextMenuChannel.id!) ? "Unpin Chat" : "Pin Chat"}</span>
            </button>

            <button
              onClick={async () => {
                const channelId = contextMenuChannel.id!;
                const isMuted = mutes.some((m) => m.channelId === channelId);
                await togglePreference(isMuted ? "unmute" : "mute", channelId);
                setContextMenuChannel(null);
                setContextMenuPosition(null);
              }}
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted text-start w-full text-foreground"
            >
              {mutes.some((m) => m.channelId === contextMenuChannel.id) ? (
                <>
                  <Volume2 className="size-4 text-muted-foreground" />
                  <span>Unmute Chat</span>
                </>
              ) : (
                <>
                  <VolumeX className="size-4 text-muted-foreground" />
                  <span>Mute Chat</span>
                </>
              )}
            </button>

            <button
              onClick={async () => {
                const channelId = contextMenuChannel.id!;
                const isArchived = archives.includes(channelId);
                await togglePreference(isArchived ? "unarchive" : "archive", channelId);
                setContextMenuChannel(null);
                setContextMenuPosition(null);
              }}
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted text-start w-full text-foreground"
            >
              <FolderDown className="size-4 text-muted-foreground" />
              <span>{archives.includes(contextMenuChannel.id!) ? "Unarchive" : "Archive"}</span>
            </button>

            <button
              onClick={async () => {
                await contextMenuChannel.markRead();
                queryClient.invalidateQueries({ queryKey: ["unread-messages-count"] });
                setContextMenuChannel(null);
                setContextMenuPosition(null);
              }}
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted text-start w-full text-foreground"
            >
              <CheckCheck className="size-4 text-muted-foreground" />
              <span>Mark Read</span>
            </button>

            <button
              onClick={async () => {
                const channelId = contextMenuChannel.id!;
                await contextMenuChannel.hide();
                if (activeChannel?.id === channelId) {
                  setActiveChannel(null);
                }
                setContextMenuChannel(null);
                setContextMenuPosition(null);
              }}
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-red-500/10 text-red-500 text-start w-full font-medium"
            >
              <Trash2 className="size-4 text-red-500" />
              <span>Delete Chat</span>
            </button>
          </div>
        </div>
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
  onContextMenu: (e: React.MouseEvent, channel: Channel) => void;
  loggedInUserId: string;
}

function ChatRow({ channel, draftText, isActive, isPinned, isMuted, onClick, onContextMenu, loggedInUserId }: ChatRowProps) {
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

  let touchTimeout: any = null;
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const clientX = touch.clientX;
    const clientY = touch.clientY;
    touchTimeout = setTimeout(() => {
      onContextMenu({ clientX, clientY, preventDefault: () => {} } as any, channel);
    }, 600);
  };
  const handleTouchEnd = () => {
    if (touchTimeout) clearTimeout(touchTimeout);
  };

  return (
    <button
      onClick={onClick}
      onContextMenu={(e) => onContextMenu(e, channel)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
      className={`relative flex w-full items-center gap-3 px-4 h-[72px] transition-colors ${
        isActive ? "bg-muted" : "hover:bg-muted/30"
      }`}
    >
      {/* Avatar circular frame (48px) */}
      <div className="relative size-12 shrink-0">
        <UserAvatar avatarUrl={avatarUrl as string | null | undefined} size={48} className="size-[48px] rounded-full border" />
        {isOnline && (
          <span className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-background bg-green-500" />
        )}
      </div>

      {/* Row detail cards */}
      <div className="flex flex-1 flex-col overflow-hidden text-start">
        <div className="flex items-center justify-between">
          <span className="text-[17px] font-semibold text-foreground truncate flex-1 pr-2">{displayName}</span>
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
