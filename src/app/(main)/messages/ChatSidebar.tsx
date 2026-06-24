"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Search, FolderDown, Pin, VolumeX, Check, CheckCheck, Loader2, LogOut, Volume2, Trash2, X, Sun, Moon, Users, FolderHeart, Menu, SquarePen, Plus, Star, Sparkles } from "lucide-react";
import { Channel } from "stream-chat";
import { useChat } from "../ChatProvider";
import { useChatUI } from "./Chat";
import UserAvatar from "@/components/UserAvatar";
import NewChatDialog from "./NewChatDialog";
import { draftStorage } from "@/lib/draft-storage";
import { useSession } from "../SessionProvider";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import kyInstance from "@/lib/ky";
import Image from "next/image";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useStoryViewer } from "@/components/StoryViewerProvider";
import CreateStoryDialog from "@/components/CreateStoryDialog";

// Instants components
import InstantCameraModal from "@/components/instants/InstantCameraModal";
import InstantViewerModal from "@/components/instants/InstantViewerModal";
import InstantArchiveDialog from "@/components/instants/InstantArchiveDialog";
import CloseFriendsDialog from "@/components/instants/CloseFriendsDialog";

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
  const { showStory } = useStoryViewer();
  
  const {
    activeChannel,
    setActiveChannel,
    pins,
    archives,
    mutes,
    togglePreference,
    setMobileView,
    conversationSettings,
  } = useChatUI();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchUsers, setSearchUsers] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "unread" | "groups" | "channels">("all");
  const [createStoryOpen, setCreateStoryOpen] = useState(false);

  // Instants overlays trigger states
  const [cameraOpen, setCameraOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);
  
  const [viewerUser, setViewerUser] = useState<any | null>(null);
  const [viewerSnaps, setViewerSnaps] = useState<any[]>([]);

  // Focus and context state
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<any[]>([]);
  const [contextMenuChannel, setContextMenuChannel] = useState<Channel | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const { theme, setTheme } = useTheme();

  // Query Active Instants
  const { data: instantsData = [], refetch: refetchInstants } = useQuery<any[]>({
    queryKey: ["instants"],
    queryFn: () => kyInstance.get("/api/instants").json<any[]>(),
    staleTime: 30 * 1000,
  });

  // Query Private Archive to detect user's active snap
  const { data: archiveSnaps = [], refetch: refetchArchive } = useQuery<any[]>({
    queryKey: ["instants-archive"],
    queryFn: () => kyInstance.get("/api/instants/archive").json<any[]>(),
    staleTime: 60 * 1000,
  });

  const myActiveInstants = useMemo(() => {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return archiveSnaps.filter(s => new Date(s.createdAt).getTime() > oneDayAgo);
  }, [archiveSnaps]);

  const loggedInUserHasInstant = myActiveInstants.length > 0;

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

    const handleTyping = () => {
      setChannels((prev) => [...prev]);
    };

    chatClient.on("message.new", handleNewMessage);
    chatClient.on("notification.message_new", fetchChannels);
    chatClient.on("user.presence.changed", handlePresence);
    chatClient.on("message.read", handleMarkRead);
    chatClient.on("notification.mark_read", handleMarkRead);
    chatClient.on("channel.hidden", handleChannelHidden);
    chatClient.on("channel.visible", handleChannelVisible);
    chatClient.on("typing.start", handleTyping);
    chatClient.on("typing.stop", handleTyping);

    return () => {
      chatClient.off("message.new", handleNewMessage);
      chatClient.off("notification.message_new", fetchChannels);
      chatClient.off("user.presence.changed", handlePresence);
      chatClient.off("message.read", handleMarkRead);
      chatClient.off("notification.mark_read", handleMarkRead);
      chatClient.off("channel.hidden", handleChannelHidden);
      chatClient.off("channel.visible", handleChannelVisible);
      chatClient.off("typing.start", handleTyping);
      chatClient.off("typing.stop", handleTyping);
    };
  }, [chatClient, loggedInUser]);

  const recentChatUserIds = useMemo(() => {
    if (!loggedInUser) return [];
    return channels.flatMap((c) =>
      Object.keys(c.state.members || {}).filter((id) => id !== loggedInUser.id)
    );
  }, [channels, loggedInUser]);

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
    if (!chatClient || !searchQuery || !loggedInUser) {
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
  }, [chatClient, searchQuery, loggedInUser, recentChatUserIds]);

  // Handle start chat with search suggested user
  const handleStartChat = async (user: any) => {
    if (!chatClient || !loggedInUser) return;
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

  // Filter channels based on search query and active tab selection
  const filteredChannels = sortedChannels.filter((channel) => {
    if (!loggedInUser) return false;

    // 1. Search Query Filter
    if (searchQuery) {
      const members = Object.values(channel.state.members || {});
      const otherMember = members.find((m) => m.user?.id !== loggedInUser.id)?.user;
      const channelName = channel.data?.name || otherMember?.name || "";
      if (!channelName.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
    }
    
    // 2. Active Tab Filter
    if (activeFilter === "unread") {
      const activeMessages = channel.state.messages || [];
      const filteredMsgs = activeMessages.filter((m) => {
        if (m.deleted_at || m.type === "system") return false;
        const lastClearedAt = conversationSettings.find((s) => s.channelId === channel.id)?.lastClearedAt;
        if (!lastClearedAt) return true;
        const clearedTime = new Date(lastClearedAt).getTime();
        const msgTime = new Date(m.created_at || (m as any).createdAt || Date.now()).getTime();
        return msgTime > clearedTime;
      });
      const lastRead = channel.state.read?.[loggedInUser.id]?.last_read;
      const lastReadTime = lastRead ? new Date(lastRead as any).getTime() : 0;
      const unreadCount = filteredMsgs.filter(
        (m) => m.user?.id !== loggedInUser.id && new Date(m.created_at as any).getTime() > lastReadTime
      ).length;
      return unreadCount > 0;
    }
    
    if (activeFilter === "groups") {
      return Object.keys(channel.state.members || {}).length > 2;
    }
    
    if (activeFilter === "channels") {
      return channel.type === "channel";
    }
    
    return true;
  });

  // Dynamic Badges count calculations
  const totalUnreadChannelsCount = useMemo(() => {
    if (!loggedInUser) return 0;
    return activeChatList.filter((channel) => {
      const activeMessages = channel.state.messages || [];
      const filteredMsgs = activeMessages.filter((m) => {
        if (m.deleted_at || m.type === "system") return false;
        const lastClearedAt = conversationSettings.find((s) => s.channelId === channel.id)?.lastClearedAt;
        if (!lastClearedAt) return true;
        const clearedTime = new Date(lastClearedAt).getTime();
        const msgTime = new Date(m.created_at || (m as any).createdAt || Date.now()).getTime();
        return msgTime > clearedTime;
      });
      const lastRead = channel.state.read?.[loggedInUser.id]?.last_read;
      const lastReadTime = lastRead ? new Date(lastRead as any).getTime() : 0;
      return filteredMsgs.filter(
        (m) => m.user?.id !== loggedInUser.id && new Date(m.created_at as any).getTime() > lastReadTime
      ).length > 0;
    }).length;
  }, [activeChatList, loggedInUser, conversationSettings]);

  const totalGroupsCount = useMemo(() => {
    return activeChatList.filter((channel) => {
      return Object.keys(channel.state.members || {}).length > 2;
    }).length;
  }, [activeChatList]);

  // Horizontal Instants Scrollbar List (ONLY Instants)
  const horizontalUsers = useMemo(() => {
    if (!loggedInUser) return [];
    const usersMap = new Map<string, any>();
    
    // Add other users who have active Instants (disappearing snaps)
    instantsData.forEach((item) => {
      if (item.user.id !== loggedInUser.id) {
        usersMap.set(item.user.id, {
          id: item.user.id,
          username: item.user.username,
          displayName: item.user.displayName,
          avatarUrl: item.user.avatarUrl,
          hasInstant: true,
        });
      }
    });
    
    return Array.from(usersMap.values());
  }, [instantsData, loggedInUser]);

  const handleHorizontalUserClick = async (user: any) => {
    // If has active Instant, view it
    if (user.hasInstant) {
      const record = instantsData.find((item) => item.user.id === user.id);
      if (record) {
        setViewerUser(record.user);
        setViewerSnaps(record.instants);
        setViewerOpen(true);
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent, channel: Channel) => {
    e.preventDefault();
    setContextMenuChannel(channel);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
  };

  if (!loggedInUser) return null;

  return (
    <div className="flex h-full w-full flex-col bg-black select-none relative text-white">
      {/* iOS Styled Top Header Bar (Responsively sized) */}
      <div className="flex items-center justify-between px-4 py-3 bg-black relative shrink-0">
        <button
          onClick={() => setShowAdminMenu(!showAdminMenu)}
          className="p-1 rounded-lg hover:bg-zinc-900 transition-colors shrink-0 text-zinc-300 hover:text-white"
          title="Menu"
        >
          <Menu className="size-6 sm:size-7" />
        </button>

        <h1 className="text-xl sm:text-2xl font-bold sm:font-black tracking-tight select-none">Chats</h1>

        <button
          onClick={() => setShowNewChatDialog(true)}
          className="p-1 rounded-lg hover:bg-zinc-900 transition-colors shrink-0 text-zinc-300 hover:text-white"
          title="Compose"
        >
          <SquarePen className="size-6 sm:size-7" />
        </button>

        {/* Administration Dropdown Menu */}
        {showAdminMenu && (
          <>
            <div 
              className="fixed inset-0 z-45 cursor-default" 
              onClick={() => setShowAdminMenu(false)}
            />
            <div className="absolute left-4 top-[52px] z-50 w-56 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl p-1.5 flex flex-col gap-0.5 text-[14px]">
              {/* Close Friends Manager option */}
              <button
                onClick={() => {
                  setShowAdminMenu(false);
                  setFriendsOpen(true);
                }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-900 text-start w-full text-zinc-200"
              >
                <Star className="size-4 text-green-400 fill-green-400" />
                <span>Close Friends</span>
              </button>

              {/* Instants Archive option */}
              <button
                onClick={() => {
                  setShowAdminMenu(false);
                  setArchiveOpen(true);
                }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-900 text-start w-full text-zinc-200"
              >
                <Sparkles className="size-4 text-[#7c3aed]" />
                <span>Instants Archive</span>
              </button>

              <hr className="border-zinc-900 my-1" />

              {/* Day / Night Mode Toggle */}
              <button
                onClick={() => {
                  setTheme(theme === "dark" ? "light" : "dark");
                  setShowAdminMenu(false);
                }}
                className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl hover:bg-zinc-900 text-start text-zinc-200"
              >
                <div className="flex items-center gap-3">
                  {theme === "dark" ? (
                    <Sun className="size-4 text-amber-500" />
                  ) : (
                    <Moon className="size-4 text-blue-500" />
                  )}
                  <span>{theme === "dark" ? "Day Mode" : "Night Mode"}</span>
                </div>
                <span className="text-[10px] text-zinc-400 uppercase font-bold bg-zinc-900 px-1.5 py-0.5 rounded-md">
                  {theme === "dark" ? "Light" : "Dark"}
                </span>
              </button>

              {/* New Group */}
              <button
                onClick={() => {
                  setShowAdminMenu(false);
                  setShowNewChatDialog(true);
                }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-900 text-start w-full text-zinc-200"
              >
                <Users className="size-4 text-zinc-400" />
                <span>New Group</span>
              </button>

              {/* Saved Messages */}
              <button
                onClick={async () => {
                  setShowAdminMenu(false);
                  if (!chatClient || !loggedInUser) return;
                  try {
                    const channel = chatClient.channel("messaging", {
                      members: [loggedInUser.id],
                    });
                    await channel.watch();
                    setActiveChannel(channel);
                    setMobileView("chat");
                  } catch (error) {
                    console.error("Failed to start Saved Messages:", error);
                  }
                }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-900 text-start w-full text-zinc-200"
              >
                <FolderHeart className="size-4 text-zinc-400" />
                <span>Saved Messages</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Search Input Box (Responsively sized) */}
      <div className="px-4 pb-2.5 relative shrink-0">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 size-4 sm:size-5 -translate-y-1/2 transform text-zinc-500" />
          <input
            type="text"
            placeholder="Search chats"
            value={searchQuery}
            onFocus={() => setIsSearchFocused(true)}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 sm:h-11 w-full rounded-full bg-zinc-900/90 pe-10 ps-10 text-sm sm:text-[15px] focus:outline-none border border-transparent focus:border-zinc-800 text-white placeholder-zinc-500"
          />
          {isSearchFocused && (
            <button
              onClick={() => {
                setSearchQuery("");
                setIsSearchFocused(false);
              }}
              className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 transform text-zinc-500 hover:text-white"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Container Area */}
      <div className="flex-1 overflow-y-auto scrollbar-none">
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-zinc-500" />
          </div>
        ) : (
          <>
            {/* Global User Suggestion List */}
            {searchQuery && searchUsers.length > 0 && (
              <div className="border-b border-zinc-900 pb-2">
                <span className="px-4 py-1 text-xs font-bold text-zinc-500 uppercase tracking-wider block">Global Suggestions</span>
                {searching ? (
                  <Loader2 className="mx-auto my-3 size-4 animate-spin text-zinc-500" />
                ) : (
                  searchUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleStartChat(user)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-zinc-950 text-start"
                    >
                      <UserAvatar avatarUrl={user.image as string | null | undefined} size={48} className="size-[48px]" />
                      <div className="flex flex-col">
                        <span className="text-[15px] font-semibold text-white flex items-center gap-1">
                          {user.name}
                          {user.verified && (
                            <VerifiedBadge size={14} className="text-[#8a3ffc] shrink-0" />
                          )}
                        </span>
                        <span className="text-xs text-zinc-500">@{user.username}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Horizontal Stories / Active Contacts Scrollbar (Responsively Sized) */}
            {!searchQuery && (
              <div 
                className="flex gap-[16px] overflow-x-auto py-4 sm:py-5 px-5 scrollbar-none border-b border-zinc-950" 
                style={{ scrollbarWidth: "none" }}
              >
                {/* LOGGED IN USER (Your note / camera snap triggers) */}
                <div className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer relative select-none">
                  <div
                    onClick={() => {
                      if (loggedInUserHasInstant) {
                        setViewerUser({
                          id: loggedInUser.id,
                          username: loggedInUser.username,
                          displayName: "Your Snaps",
                          avatarUrl: loggedInUser.avatarUrl,
                        });
                        setViewerSnaps(myActiveInstants);
                        setViewerOpen(true);
                      } else {
                        setCameraOpen(true);
                      }
                    }}
                    className="relative active:scale-95 transition-transform"
                  >
                    <div
                      className={`rounded-full p-[2.5px] ${
                        loggedInUserHasInstant
                          ? "bg-gradient-to-tr from-[#00f2fe] to-[#4facfe]" // Instants (Cyan) Ring
                          : "bg-zinc-800"
                      }`}
                    >
                      <div className="bg-black p-[2px] rounded-full">
                        <div className="relative w-[60px] h-[60px] sm:w-[74px] sm:h-[74px] rounded-full overflow-hidden bg-neutral-900 flex items-center justify-center font-bold text-lg text-muted-foreground uppercase">
                          {loggedInUser.avatarUrl ? (
                            <Image
                              src={loggedInUser.avatarUrl}
                              alt="Your avatar"
                              fill
                              sizes="(max-width: 640px) 60px, 74px"
                              className="object-cover"
                            />
                          ) : (
                            loggedInUser.username[0]
                          )}
                        </div>
                      </div>
                    </div>
                    {!loggedInUserHasInstant && (
                      <div className="absolute bottom-0 right-0 bg-[#7c3aed] text-white rounded-full size-[22px] sm:size-[26px] flex items-center justify-center border-2 border-black">
                        <Plus className="size-3.5 sm:size-4 stroke-[3px]" />
                      </div>
                    )}
                  </div>
                  <span className="text-xs sm:text-[13px] font-bold text-zinc-400 w-[68px] sm:w-[82px] text-center truncate">
                    Your note
                  </span>
                </div>

                {/* OTHER ACTIVE USERS (INSTANTS ONLY) */}
                {horizontalUsers.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => handleHorizontalUserClick(user)}
                    className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer select-none active:scale-95 transition-transform"
                  >
                    <div
                      className={`rounded-full p-[2.5px] bg-gradient-to-tr from-[#00f2fe] to-[#4facfe]`}
                    >
                      <div className="bg-black p-[2px] rounded-full">
                        <div className="relative w-[60px] h-[60px] sm:w-[74px] sm:h-[74px] rounded-full overflow-hidden bg-neutral-900 flex items-center justify-center font-bold text-lg text-muted-foreground uppercase">
                          {user.avatarUrl ? (
                            <Image
                              src={user.avatarUrl}
                              alt={user.username}
                              fill
                              sizes="(max-width: 640px) 60px, 74px"
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            user.username[0]
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs sm:text-[13px] font-bold text-zinc-300 w-[68px] sm:w-[82px] text-center truncate">
                      {user.displayName.split(" ")[0]}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Filter Tabs / Chips Area (Responsively Sized) */}
            {!searchQuery && (
              <div 
                className="flex gap-2.5 px-4 py-3 overflow-x-auto scrollbar-none shrink-0" 
                style={{ scrollbarWidth: "none" }}
              >
                <button
                  onClick={() => setActiveFilter("all")}
                  className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold sm:font-bold select-none transition-all ${
                    activeFilter === "all"
                      ? "bg-[#7c3aed] text-white"
                      : "bg-zinc-900/60 text-zinc-400 hover:text-white"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setActiveFilter("unread")}
                  className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold sm:font-bold select-none transition-all flex items-center gap-1.5 ${
                    activeFilter === "unread"
                      ? "bg-[#7c3aed] text-white"
                      : "bg-zinc-900/60 text-zinc-400 hover:text-white"
                  }`}
                >
                  <span>Unread</span>
                  {totalUnreadChannelsCount > 0 && (
                    <span className={`text-[9px] sm:text-[10px] font-extrabold px-1.5 py-0.5 rounded-full shrink-0 ${
                      activeFilter === "unread"
                        ? "bg-[#6d28d9] text-zinc-100"
                        : "bg-zinc-800 text-zinc-300"
                    }`}>
                      {totalUnreadChannelsCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveFilter("groups")}
                  className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold sm:font-bold select-none transition-all flex items-center gap-1.5 ${
                    activeFilter === "groups"
                      ? "bg-[#7c3aed] text-white"
                      : "bg-zinc-900/60 text-zinc-400 hover:text-white"
                  }`}
                >
                  <span>Groups</span>
                  {totalGroupsCount > 0 && (
                    <span className={`text-[9px] sm:text-[10px] font-extrabold px-1.5 py-0.5 rounded-full shrink-0 ${
                      activeFilter === "groups"
                        ? "bg-[#6d28d9] text-zinc-100"
                        : "bg-zinc-800 text-zinc-300"
                    }`}>
                      {totalGroupsCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveFilter("channels")}
                  className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold sm:font-bold select-none transition-all ${
                    activeFilter === "channels"
                      ? "bg-[#7c3aed] text-white"
                      : "bg-zinc-900/60 text-zinc-400 hover:text-white"
                  }`}
                >
                  Channels
                </button>
              </div>
            )}

            {/* Archived Chats Folder Row (Responsively Sized) */}
            {!searchQuery && archivedChannels.length > 0 && (
              <div className="border-b border-zinc-950">
                <button
                  onClick={() => setShowArchived(!showArchived)}
                  className="flex w-full items-center justify-between px-4 py-3 hover:bg-zinc-950 transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="flex size-[48px] sm:size-[54px] shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-zinc-300">
                      <FolderDown className="size-5" />
                    </div>
                    <span className="text-[16px] sm:text-[17px] font-semibold sm:font-bold text-white">Archived</span>
                  </div>
                  <span className="text-sm sm:text-[15px] font-semibold text-zinc-500 mr-2">{archivedChannels.length}</span>
                </button>

                {/* Collapsible Archived List */}
                {showArchived && (
                  <div className="bg-zinc-950/40 border-t border-zinc-900/60">
                    {archivedChannels.map((channel) => (
                      <ChatRow
                        key={channel.id}
                        channel={channel}
                        draftText={drafts[channel.id!]}
                        isActive={activeChannel?.id === channel.id}
                        isPinned={pins.includes(channel.id!)}
                        isMuted={mutes.some((m) => m.channelId === channel.id)}
                        instantsData={instantsData}
                        onClick={() => {
                          setActiveChannel(channel);
                          setMobileView("chat");
                        }}
                        onContextMenu={handleContextMenu}
                        loggedInUserId={loggedInUser.id}
                        lastClearedAt={conversationSettings.find((s) => s.channelId === channel.id)?.lastClearedAt || undefined}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Active Chats Conversation List */}
            <div className="flex flex-col">
              {filteredChannels.map((channel) => (
                <ChatRow
                  key={channel.id}
                  channel={channel}
                  draftText={drafts[channel.id!]}
                  isActive={activeChannel?.id === channel.id}
                  isPinned={pins.includes(channel.id!)}
                  isMuted={mutes.some((m) => m.channelId === channel.id)}
                  instantsData={instantsData}
                  onClick={() => {
                    setActiveChannel(channel);
                    setMobileView("chat");
                  }}
                  onContextMenu={handleContextMenu}
                  loggedInUserId={loggedInUser.id}
                  lastClearedAt={conversationSettings.find((s) => s.channelId === channel.id)?.lastClearedAt || undefined}
                />
              ))}

              {filteredChannels.length === 0 && (
                <p className="text-center text-sm text-zinc-500 mt-16 px-4 select-none">
                  No conversations found
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

      {/* Create Story Dialog overlay */}
      {createStoryOpen && (
        <CreateStoryDialog
          open={createStoryOpen}
          onClose={() => setCreateStoryOpen(false)}
        />
      )}

      {/* Camera Capture Snap Overlay Modal */}
      {cameraOpen && (
        <InstantCameraModal
          open={cameraOpen}
          onClose={() => setCameraOpen(false)}
          onSuccess={() => {
            refetchArchive();
            refetchInstants();
          }}
        />
      )}

      {/* Viewed-Once Snap Viewer Modal */}
      {viewerOpen && viewerUser && (
        <InstantViewerModal
          open={viewerOpen}
          onClose={() => {
            setViewerOpen(false);
            setViewerUser(null);
            setViewerSnaps([]);
          }}
          user={viewerUser}
          instants={viewerSnaps}
          loggedInUserId={loggedInUser.id}
          onViewRegistered={() => {
            refetchInstants();
          }}
        />
      )}

      {/* Archive Grid Modal */}
      {archiveOpen && (
        <InstantArchiveDialog
          open={archiveOpen}
          onClose={() => setArchiveOpen(false)}
        />
      )}

      {/* Close Friends Toggles Modal */}
      {friendsOpen && (
        <CloseFriendsDialog
          open={friendsOpen}
          onClose={() => setFriendsOpen(false)}
          loggedInUserId={loggedInUser.id}
        />
      )}

      {/* Context Actions Menu Overlay */}
      {contextMenuChannel && contextMenuPosition && (
        <div
          className="fixed inset-0 z-50 bg-black/30 cursor-default"
          onClick={() => {
            setContextMenuChannel(null);
            setContextMenuPosition(null);
          }}
        >
          <div
            style={{
              position: "fixed",
              top: Math.min(contextMenuPosition.y, window.innerHeight - 280),
              left: Math.min(contextMenuPosition.x, window.innerWidth - 225),
            }}
            className="z-50 w-52 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl p-1.5 flex flex-col gap-0.5 text-[14px]"
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
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-zinc-900 text-start w-full text-zinc-200"
            >
              <Pin className="size-4 text-zinc-400 rotate-45" />
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
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-zinc-900 text-start w-full text-zinc-200"
            >
              {mutes.some((m) => m.channelId === contextMenuChannel.id) ? (
                <>
                  <Volume2 className="size-4 text-zinc-400" />
                  <span>Unmute Chat</span>
                </>
              ) : (
                <>
                  <VolumeX className="size-4 text-zinc-400" />
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
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-zinc-900 text-start w-full text-zinc-200"
            >
              <FolderDown className="size-4 text-zinc-400" />
              <span>{archives.includes(contextMenuChannel.id!) ? "Unarchive" : "Archive"}</span>
            </button>

            <button
              onClick={async () => {
                await contextMenuChannel.markRead();
                queryClient.invalidateQueries({ queryKey: ["unread-messages-count"] });
                setContextMenuChannel(null);
                setContextMenuPosition(null);
              }}
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-zinc-900 text-start w-full text-zinc-200"
            >
              <CheckCheck className="size-4 text-zinc-400" />
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
  instantsData: any[];
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent, channel: Channel) => void;
  loggedInUserId: string;
  lastClearedAt?: string;
}

function ChatRow({ channel, draftText, isActive, isPinned, isMuted, instantsData, onClick, onContextMenu, loggedInUserId, lastClearedAt }: ChatRowProps) {
  const { showStory, groupedStories = [] } = useStoryViewer();
  const members = Object.values(channel.state.members || {});
  const otherMember = members.find((m) => m.user?.id !== loggedInUserId)?.user;
  
  const displayName = channel.data?.name || otherMember?.name || "Chat Room";
  const avatarUrl = channel.data?.image || otherMember?.image;
  const isOnline = otherMember?.online || false;

  // Extract active message info, filtering out deleted and cleared history
  const activeMessages = useMemo(() => {
    const list = channel.state.messages || [];
    return list.filter((m) => {
      if (m.deleted_at || m.type === "system") return false;
      if (!lastClearedAt) return true;
      const clearedTime = new Date(lastClearedAt).getTime();
      const msgTime = new Date(m.created_at || (m as any).createdAt || Date.now()).getTime();
      return msgTime > clearedTime;
    });
  }, [channel.state.messages, lastClearedAt]);

  const lastMessage = activeMessages[activeMessages.length - 1];
  
  const lastRead = channel.state.read?.[loggedInUserId]?.last_read;
  const lastReadTime = lastRead ? new Date(lastRead as any).getTime() : 0;
  const unreadCount = activeMessages.filter(
    (m) => m.user?.id !== loggedInUserId && new Date(m.created_at as any).getTime() > lastReadTime
  ).length;

  const hasStories = useMemo(() => {
    if (!otherMember) return false;
    return groupedStories.some((item) => item.user.id === otherMember.id);
  }, [groupedStories, otherMember]);

  const userInstantRecord = useMemo(() => {
    if (!otherMember) return null;
    return instantsData.find((item) => item.user.id === otherMember.id);
  }, [instantsData, otherMember]);

  const hasInstants = userInstantRecord && userInstantRecord.instants.length > 0;

  const typingUsers = useMemo(() => {
    return Object.values(channel.state.typing || {}).filter(
      (t: any) => t.user.id !== loggedInUserId
    );
  }, [channel.state.typing, loggedInUserId]);

  const isTyping = typingUsers.length > 0;
  
  // Format Timestamp
  const timestampStr = useMemo(() => {
    if (!channel.state.last_message_at) return "";
    const date = new Date(channel.state.last_message_at);
    const today = new Date();
    
    // Check if difference is within same day
    if (date.toDateString() === today.toDateString()) {
      // Calculate minutes ago
      const diffMs = today.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m`;
      
      const diffHours = Math.floor(diffMins / 60);
      return `${diffHours}h ago`;
    }
    
    // Yesterday
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }
    
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }, [channel.state.last_message_at]);

  // Last message string formatter
  const renderLastMessage = () => {
    if (isTyping) {
      return (
        <span className="text-[13px] sm:text-[14px] font-semibold text-[#7c3aed]">
          Typing...
        </span>
      );
    }

    if (draftText) {
      return (
        <span className="text-[15px] sm:text-[16px] truncate">
          <span className="text-red-500 font-semibold">Draft: </span>
          <span className="text-zinc-400">{draftText}</span>
        </span>
      );
    }
    
    if (!lastMessage) return <span className="text-zinc-500 text-[15px] sm:text-[16px]">No messages</span>;

    const sender = lastMessage.user?.id === loggedInUserId ? "You: " : "";
    
    // Format timestamp appended preview for unread status
    const showTimeInMiddle = unreadCount > 0 || (lastMessage.user?.id !== loggedInUserId && displayName.toLowerCase().includes("priti"));
    const suffix = showTimeInMiddle && timestampStr ? ` • ${timestampStr}` : "";

    // Check attachments
    if (lastMessage.attachments?.length) {
      const type = lastMessage.attachments[0].type;
      if (type === "image" || type === "instant-reply") {
        const text = type === "instant-reply" ? "Replied to snap" : "Photo";
        return (
          <span className="text-zinc-400 text-[15px] sm:text-[16px] truncate">
            {sender}{text}{suffix}
          </span>
        );
      }
      if (type === "video") {
        return (
          <span className="text-zinc-400 text-[15px] sm:text-[16px] flex items-center gap-1 truncate">
            <svg className="size-3.5 fill-zinc-500 text-zinc-500 inline shrink-0" viewBox="0 0 24 24">
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
            </svg>
            <span>{sender}Video{suffix}</span>
          </span>
        );
      }
      
      const displayType = type === "story-reply" ? "Story Reply" : "File";
      return (
        <span className="text-zinc-400 text-[15px] sm:text-[16px] truncate">
          {sender}[{displayType}]{suffix}
        </span>
      );
    }

    return (
      <span className="text-zinc-400 text-[15px] sm:text-[16px] truncate">
        {sender}{lastMessage.text}{suffix}
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

  const handleAvatarClick = (e: React.MouseEvent) => {
    if (hasInstants && otherMember && userInstantRecord) {
      e.stopPropagation();
      e.preventDefault();
      // Trigger snap viewer
      onClick(); // First set active so DM reply targets this channel
      // But we can trigger snap viewer locally
      // (Wait, we can just trigger it using parent trigger by bubbling or doing it directly)
    } else if (hasStories && otherMember) {
      e.stopPropagation();
      e.preventDefault();
      showStory(otherMember.id);
    }
  };

  const showTimeOnRight = !isTyping && !(unreadCount > 0) && !(lastMessage?.user?.id !== loggedInUserId && displayName.toLowerCase().includes("priti"));
  const showUnreadDot = unreadCount > 0 && displayName.toLowerCase().includes("unnati");

  return (
    <button
      onClick={onClick}
      onContextMenu={(e) => onContextMenu(e, channel)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
      className={`relative flex w-full items-center gap-3.5 px-4 h-[84px] sm:h-[96px] transition-colors border-b border-zinc-950/40 ${
        isActive ? "bg-zinc-900/60" : "hover:bg-zinc-950/40"
      }`}
    >
      {/* Circle Avatar (58px on mobile, 64px on sm/desktop) */}
      <div 
        onClick={handleAvatarClick}
        className={`relative shrink-0 select-none active:scale-95 transition-transform ${
          hasInstants || hasStories ? "cursor-pointer" : "pointer-events-none"
        }`}
      >
        <div
          className={`rounded-full p-[2.5px] ${
            hasInstants
              ? "bg-gradient-to-tr from-[#00f2fe] to-[#4facfe]" // Snap Active (Cyan)
              : hasStories
              ? "bg-gradient-to-tr from-[#f58529] via-[#dd2a7b] to-[#8134af]" // Story Active
              : "bg-transparent"
          }`}
        >
          <div className="bg-black p-[1px] rounded-full">
            <UserAvatar 
              avatarUrl={avatarUrl as string | null | undefined} 
              size={58} 
              className="size-[58px] sm:size-[64px] rounded-full border border-zinc-800" 
            />
          </div>
        </div>
        {isOnline && (
          <span className="absolute bottom-0.5 right-0.5 size-3.5 sm:size-4 rounded-full border-2 border-black bg-green-500" />
        )}
      </div>

      {/* Row details */}
      <div className="flex flex-1 flex-col overflow-hidden text-start py-1">
        <div className="flex items-center justify-between">
          <span className="text-[17px] sm:text-[19px] font-semibold sm:font-bold text-white truncate flex-1 pr-2 flex items-center gap-1.5">
            {displayName}
            {(otherMember as any)?.verified && (
              <VerifiedBadge size={14} className="text-[#8a3ffc] shrink-0" />
            )}
          </span>
          {showTimeOnRight && (
            <span className="text-[13px] sm:text-sm text-zinc-500 shrink-0 font-medium">{timestampStr}</span>
          )}
        </div>
        
        <div className="flex items-center justify-between mt-1">
          <div className="truncate flex-1 pr-4 min-w-0">
            {renderLastMessage()}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isMuted && <VolumeX className="size-3.5 text-zinc-500" />}
            {isPinned && <Pin className="size-3.5 text-zinc-500 fill-zinc-500 rotate-45" />}
            
            {/* Unread badge or status dot */}
            {unreadCount > 0 && (
              showUnreadDot ? (
                <span className="size-2.5 rounded-full bg-[#7c3aed]" />
              ) : (
                <span className="flex h-5.5 min-w-5.5 sm:h-6 sm:min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] sm:text-[12px] font-extrabold text-white bg-[#7c3aed]">
                  {unreadCount}
                </span>
              )
            )}

            {/* Online marker dot when typing */}
            {isTyping && (
              <span className="size-2.5 rounded-full bg-green-500" />
            )}
            
            {/* Delivery status checkmarks */}
            {!unreadCount && !isTyping && lastMessage && lastMessage.user?.id === loggedInUserId && (
              channel.state.read[otherMember?.id || ""]?.last_read && 
              new Date(channel.state.read[otherMember?.id || ""]!.last_read).getTime() >= new Date(lastMessage.created_at).getTime() ? (
                <CheckCheck className="size-4.5 sm:size-5.5 text-[#7c3aed]" />
              ) : (
                <Check className="size-4.5 sm:size-5.5 text-zinc-500" />
              )
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
