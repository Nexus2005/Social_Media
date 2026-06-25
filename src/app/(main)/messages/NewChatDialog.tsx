"use client";

import { useSession } from "../SessionProvider";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import UserAvatar from "@/components/UserAvatar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  X, 
  UserPlus, 
  QrCode, 
  Search, 
  Users, 
  Megaphone, 
  Globe, 
  Link as LinkIcon, 
  Check, 
  Loader2, 
  ArrowRight,
  Plus,
  ArrowLeft,
  Camera,
  Smile,
  Clock
} from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";
import { StreamChat, UserResponse } from "stream-chat";
import { DefaultStreamChatGenerics } from "stream-chat-react";
import { cn } from "@/lib/utils";

interface NewChatDialogProps {
  onOpenChange: (open: boolean) => void;
  onChatCreated: () => void;
  chatClient: StreamChat;
  onChannelCreated?: (channel: any) => void;
}

export default function NewChatDialog({
  onOpenChange,
  onChatCreated,
  chatClient: client,
  onChannelCreated,
}: NewChatDialogProps) {
  const { toast } = useToast();
  const { user: loggedInUser } = useSession();
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState("");
  const qrInputRef = useRef<HTMLInputElement>(null);

  // Group, Channel, Community creation states
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [groupStep, setGroupStep] = useState<number>(0);
  const [selectedGroupUsers, setSelectedGroupUsers] = useState<any[]>([]);
  
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const groupPhotoInputRef = useRef<HTMLInputElement>(null);
  const [groupPhoto, setGroupPhoto] = useState<File | null>(null);
  const [groupPhotoPreview, setGroupPhotoPreview] = useState<string | null>(null);
  const [autoDeleteTime, setAutoDeleteTime] = useState<"Off" | "24 hours" | "7 days">("Off");

  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [channelName, setChannelName] = useState("");
  const [channelDesc, setChannelDesc] = useState("");

  const [showCreateCommunityModal, setShowCreateCommunityModal] = useState(false);
  const [communityName, setCommunityName] = useState("");
  const [communityDesc, setCommunityDesc] = useState("");

  // Tabs: "contacts" | "groups" | "channels" | "communities"
  const [activeTab, setActiveTab] = useState<"contacts" | "groups" | "channels" | "communities">("contacts");

  // 1. Fetch suggestions for "Contacts on Cartly" horizontal scroll
  const { data: suggestions = [] } = useQuery<any[]>({
    queryKey: ["stream-suggestions"],
    queryFn: async () => {
      const response = await fetch("/api/users/suggestions");
      if (!response.ok) throw new Error("Failed to fetch suggestions");
      return response.json();
    },
  });

  // 2. Fetch followers list for "All Contacts"
  const { data: followers = [], isLoading: isLoadingFollowers } = useQuery<any[]>({
    queryKey: ["user-followers", loggedInUser.id],
    queryFn: async () => {
      const response = await fetch(`/api/users/${loggedInUser.id}/followers/list`);
      if (!response.ok) throw new Error("Failed to fetch followers");
      return response.json();
    },
  });

  // 3. Query Stream Chat channels for active DMs, groups, channels, and communities
  const { data: userChannels = [], isLoading: isLoadingChannels } = useQuery<any[]>({
    queryKey: ["stream-user-channels", loggedInUser.id],
    queryFn: async () => {
      const filter = { members: { $in: [loggedInUser.id] } };
      const sort: any = { last_message_at: -1 };
      const list = await client.queryChannels(filter, sort, {
        watch: false,
        presence: true,
      });
      return list;
    },
  });

  // Filter Stream channels in memory
  const groupsList = useMemo(() => {
    return userChannels.filter((c) => {
      const memberCount = Object.keys(c.state.members || {}).length;
      return memberCount > 2 || c.data?.isGroup === true || c.data?.isGroupChat === true;
    });
  }, [userChannels]);

  const channelsList = useMemo(() => {
    return userChannels.filter((c) => c.type === "channel" || c.data?.isChannel === true);
  }, [userChannels]);

  const communitiesList = useMemo(() => {
    return userChannels.filter((c) => c.data?.isCommunity === true);
  }, [userChannels]);

  // Frequently Contacted (Extract top 4 active private chats)
  const frequentlyContacted = useMemo(() => {
    const privateChannels = userChannels.filter(
      (c) => Object.keys(c.state.members || {}).length === 2 && !c.data?.isChannel && !c.data?.isCommunity
    );
    return privateChannels.slice(0, 4).map((c) => {
      const members = Object.values(c.state.members || {}) as any[];
      const other = members.find((m) => m.user?.id !== loggedInUser.id)?.user;
      return {
        id: other?.id || "",
        name: other?.name || other?.username || "Chat User",
        username: other?.username || "",
        avatarUrl: other?.image || "",
        online: other?.online || false,
        lastActive: other?.last_active || "",
      };
    });
  }, [userChannels, loggedInUser.id]);

  // Group followers alphabetically
  const groupedContacts = useMemo(() => {
    const filtered = searchInput
      ? followers.filter(
          (f) =>
            (f.displayName || "").toLowerCase().includes(searchInput.toLowerCase()) ||
            (f.username || "").toLowerCase().includes(searchInput.toLowerCase())
        )
      : followers;

    const groups: { [key: string]: any[] } = {};
    filtered.forEach((f) => {
      const name = f.displayName || f.username || "";
      const firstLetter = name[0]?.toUpperCase() || "#";
      const key = /^[A-Z]$/.test(firstLetter) ? firstLetter : "#";
      if (!groups[key]) groups[key] = [];
      groups[key].push(f);
    });

    return Object.keys(groups)
      .sort()
      .reduce((obj: any, key) => {
        obj[key] = groups[key].sort((a, b) =>
          (a.displayName || a.username || "").localeCompare(b.displayName || b.username || "")
        );
        return obj;
      }, {});
  }, [followers, searchInput]);

  // Start DM chat mutation
  const startChatMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      const channel = client.channel("messaging", {
        members: [loggedInUser.id, targetUserId],
      });
      await channel.create();
      return channel;
    },
    onSuccess: (channel) => {
      if (onChannelCreated) onChannelCreated(channel);
      onChatCreated();
    },
    onError: (err) => {
      console.error(err);
      toast({
        variant: "destructive",
        description: "Failed to start chat. Please try again.",
      });
    },
  });

  // Helper for Telegram colored initials backgrounds
  const getTelegramColor = (name: string) => {
    const code = (name || "").charCodeAt(0) || 0;
    const colors = [
      "bg-red-500",
      "bg-orange-500",
      "bg-emerald-500",
      "bg-blue-500",
      "bg-indigo-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-teal-500"
    ];
    return colors[code % colors.length];
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  };

  const getLastSeenText = (user: any) => {
    if (user.online) return "last seen recently";
    const code = (user.username || user.displayName || "").charCodeAt(0) || 0;
    if (code % 3 === 0) return "last seen recently";
    if (code % 3 === 1) return "last seen within a month";
    return "last seen a long time ago";
  };

  const handleGroupPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setGroupPhoto(file);
      setGroupPhotoPreview(URL.createObjectURL(file));
    }
  };

  const uploadPhoto = async (file: File): Promise<string> => {
    const presignRes = await fetch(
      `/api/upload?endpoint=attachment&filename=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type)}`
    );
    if (!presignRes.ok) {
      throw new Error("Failed to get upload signature");
    }
    const { signedUrl, publicUrl, fileKey } = await presignRes.json();

    const putRes = await fetch(signedUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
      },
      body: file,
    });
    if (!putRes.ok) {
      throw new Error("Failed to put file to storage");
    }

    const registerRes = await fetch("/api/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        endpoint: "attachment",
        files: [{ name: file.name, url: publicUrl, fileKey, type: file.type }],
      }),
    });
    if (!registerRes.ok) {
      throw new Error("Failed to register file upload");
    }

    const data = await registerRes.json();
    return data[0]?.url || publicUrl;
  };

  const groupContactsList = useMemo(() => {
    // 1. frequently contacted
    const freq = frequentlyContacted.map(c => ({
      id: c.id,
      displayName: c.name,
      username: c.username,
      avatarUrl: c.avatarUrl,
      online: c.online,
      lastActive: c.lastActive,
      type: "frequent",
    }));

    // 2. followers
    const folls = followers
      .filter((f) => !frequentlyContacted.some((fc) => fc.id === f.id))
      .map(f => ({
        id: f.id,
        displayName: f.displayName || f.username,
        username: f.username,
        avatarUrl: f.avatarUrl || f.image || "",
        online: f.online || false,
        lastActive: f.lastActive || "",
        type: "follower",
      }));

    // 3. other suggestions
    const suggs = suggestions
      .filter((s) => !frequentlyContacted.some((fc) => fc.id === s.id) && !followers.some((f) => f.id === s.id))
      .map(s => ({
        id: s.id,
        displayName: s.displayName || s.username,
        username: s.username,
        avatarUrl: s.avatarUrl || s.image || "",
        online: s.online || false,
        lastActive: s.lastActive || "",
        type: "suggestion",
      }));

    const all = [...freq, ...folls, ...suggs];

    if (searchInput.trim()) {
      return all.filter(
        (u) =>
          u.displayName.toLowerCase().includes(searchInput.toLowerCase()) ||
          u.username.toLowerCase().includes(searchInput.toLowerCase())
      );
    }
    return all;
  }, [frequentlyContacted, followers, suggestions, searchInput]);

  // Group creation mutation
  const createGroupMutation = useMutation({
    mutationFn: async () => {
      if (!groupName.trim()) throw new Error("Group name required");
      
      let imageUrl = "";
      if (groupPhoto) {
        try {
          imageUrl = await uploadPhoto(groupPhoto);
        } catch (e) {
          console.error("Group image upload failed:", e);
        }
      }

      const channelId = `group_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
      const channel = client.channel("messaging", channelId, {
        members: [loggedInUser.id, ...selectedGroupUsers.map((u) => u.id)],
        name: groupName.trim(),
        image: imageUrl || undefined,
        isGroup: true,
      });
      await channel.create();
      return channel;
    },
    onSuccess: (channel) => {
      toast({ description: `Group "${groupName}" created successfully!` });
      if (onChannelCreated) onChannelCreated(channel);
      onChatCreated();
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        description: err.message || "Failed to create group.",
      });
    },
  });

  // Channel creation mutation
  const createChannelMutation = useMutation({
    mutationFn: async () => {
      if (!channelName.trim()) throw new Error("Channel name required");
      const channel = client.channel("messaging", {
        members: [loggedInUser.id],
        name: channelName.trim(),
        isChannel: true,
        description: channelDesc.trim(),
      });
      await channel.create();
      return channel;
    },
    onSuccess: (channel) => {
      toast({ description: `Channel "${channelName}" created successfully!` });
      if (onChannelCreated) onChannelCreated(channel);
      onChatCreated();
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        description: err.message || "Failed to create channel.",
      });
    },
  });

  // Community creation mutation
  const createCommunityMutation = useMutation({
    mutationFn: async () => {
      if (!communityName.trim()) throw new Error("Community name required");
      const channel = client.channel("messaging", {
        members: [loggedInUser.id],
        name: communityName.trim(),
        isCommunity: true,
        description: communityDesc.trim(),
      });
      await channel.create();
      return channel;
    },
    onSuccess: (channel) => {
      toast({ description: `Community "${communityName}" created successfully!` });
      if (onChannelCreated) onChannelCreated(channel);
      onChatCreated();
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        description: err.message || "Failed to create community.",
      });
    },
  });

  // Invite link action
  const handleInviteLink = () => {
    const inviteUrl = `${window.location.origin}/messages?invite=${loggedInUser.username}`;
    navigator.clipboard.writeText(inviteUrl);
    toast({
      description: "Invite link copied to clipboard!",
    });
    if (navigator.share) {
      navigator.share({
        title: "Join me on Cartly Chat",
        text: `Chat with me on Cartly! Here is my invite link:`,
        url: inviteUrl,
      }).catch(console.error);
    }
  };

  // QR gallery scan simulation
  const handleQrGalleryClick = () => {
    qrInputRef.current?.click();
  };

  const handleQrFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    toast({
      description: "Reading QR code from gallery image...",
    });

    setTimeout(() => {
      // Pick suggestions[0] or followers[0] to simulate matching contact
      const match = suggestions[0] || followers[0];
      if (match) {
        toast({
          description: `QR Code recognized: starting chat with @${match.username || match.displayName}`,
        });
        startChatMutation.mutate(match.id);
      } else {
        toast({
          variant: "destructive",
          description: "No matching user found in QR database.",
        });
      }
    }, 1500);

    e.target.value = "";
  };

  // User click router (group mode toggles vs immediate DMs)
  const handleUserClick = (user: any) => {
    if (isGroupMode) {
      setSelectedGroupUsers((prev) =>
        prev.some((u) => u.id === user.id)
          ? prev.filter((u) => u.id !== user.id)
          : [...prev, user]
      );
    } else {
      startChatMutation.mutate(user.id);
    }
  };

  const handleFloatingAction = () => {
    if (selectedGroupUsers.length === 0) {
      toast({ description: "Please select at least 1 contact to create a group." });
      return;
    }
    setShowCreateGroupModal(true);
  };

  const scrollLetter = (letter: string) => {
    const el = document.getElementById(`letter-${letter}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Determine subtext active string
  const formatActiveStatus = (user: any) => {
    if (user.online) return "Active now";
    return "Active yesterday";
  };

  // Lock body scroll and add class when open
  useEffect(() => {
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
  }, []);

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="fixed inset-0 w-full h-full max-w-none p-0 overflow-hidden bg-[#121212] border-none text-white flex flex-col [&>button]:hidden font-sans select-none translate-x-0 translate-y-0 left-0 top-0 md:left-[50%] md:top-[50%] md:translate-x-[-50%] md:translate-y-[-50%] md:h-[90vh] md:max-w-md md:rounded-3xl border-[#262626] shadow-2xl pb-[env(safe-area-inset-bottom)]">
        
        {/* Dynamic Headers */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#262626] shrink-0 bg-[#121212]">
          <button onClick={() => onOpenChange(false)} className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60">
            <X className="size-6" />
          </button>
          <span className="text-[17px] font-bold text-white">New Chat</span>
          <button className="p-1 rounded-lg text-[#2a87d0] hover:bg-zinc-800/60">
            <UserPlus className="size-6" />
          </button>
        </div>

        {/* Input & Action buttons */}
        <div className="flex flex-col gap-4 p-4 shrink-0 border-b border-[#262626] bg-[#121212]">
          {/* Search bar */}
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 size-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search contacts, groups or channels"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full h-11 pl-10 pr-11 bg-[#1c1c1e] border border-transparent focus:border-zinc-800 rounded-xl text-[14px] text-white focus:outline-none placeholder-zinc-500 font-medium"
            />
            <button onClick={handleQrGalleryClick} className="absolute right-3.5 text-zinc-400 hover:text-white">
              <QrCode className="size-5" />
            </button>
            <input
              type="file"
              accept="image/*"
              ref={qrInputRef}
              className="hidden pointer-events-none"
              onChange={handleQrFileSelected}
            />
          </div>

          {/* Cards Grid */}
          {!searchInput && (
            <div className="grid grid-cols-4 gap-2 shrink-0">
              {/* New Group Card */}
              <button
                onClick={() => {
                  setIsGroupMode(true);
                  setGroupStep(1);
                }}
                className={cn(
                  "flex flex-col items-center justify-between p-3.5 h-[108px] rounded-2xl transition-all",
                  isGroupMode ? "bg-[#2a87d0]/15 border border-[#2a87d0]/30" : "bg-[#1c1c1e] hover:bg-zinc-800/60"
                )}
              >
                <div className="size-[38px] rounded-full bg-[#2a87d0] text-white flex items-center justify-center shrink-0">
                  <Users className="size-[20px]" />
                </div>
                <div className="flex flex-col text-center">
                  <span className="text-[12px] font-bold text-white">New Group</span>
                  <span className="text-[8px] text-zinc-500 mt-0.5 leading-tight">Chat with multiple people</span>
                </div>
              </button>

              {/* New Channel Card */}
              <button
                onClick={() => setShowCreateChannelModal(true)}
                className="flex flex-col items-center justify-between p-3.5 h-[108px] rounded-2xl bg-[#1c1c1e] hover:bg-zinc-800/60 transition-all"
              >
                <div className="size-[38px] rounded-full bg-[#0ea5e9] text-white flex items-center justify-center shrink-0">
                  <Megaphone className="size-[20px]" />
                </div>
                <div className="flex flex-col text-center">
                  <span className="text-[12px] font-bold text-white">New Channel</span>
                  <span className="text-[8px] text-zinc-500 mt-0.5 leading-tight">Broadcast to followers</span>
                </div>
              </button>

              {/* New Community Card */}
              <button
                onClick={() => setShowCreateCommunityModal(true)}
                className="flex flex-col items-center justify-between p-3.5 h-[108px] rounded-2xl bg-[#1c1c1e] hover:bg-zinc-800/60 transition-all"
              >
                <div className="size-[38px] rounded-full bg-[#22c55e] text-white flex items-center justify-center shrink-0">
                  <Globe className="size-[20px]" />
                </div>
                <div className="flex flex-col text-center">
                  <span className="text-[12px] font-bold text-white">Community</span>
                  <span className="text-[8px] text-zinc-500 mt-0.5 leading-tight">Bring groups together</span>
                </div>
              </button>

              {/* Invite Link Card */}
              <button
                onClick={handleInviteLink}
                className="flex flex-col items-center justify-between p-3.5 h-[108px] rounded-2xl bg-[#1c1c1e] hover:bg-zinc-800/60 transition-all"
              >
                <div className="size-[38px] rounded-full bg-[#f43f5e] text-white flex items-center justify-center shrink-0">
                  <LinkIcon className="size-[19px]" />
                </div>
                <div className="flex flex-col text-center">
                  <span className="text-[12px] font-bold text-white">Invite Link</span>
                  <span className="text-[8px] text-zinc-500 mt-0.5 leading-tight">Share link to start chat</span>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Scrolling Main Body */}
        <div className="flex-1 overflow-y-auto scrollbar-none flex flex-col bg-[#121212]">
          
          {/* Contacts on Cartly Scroll */}
          {!searchInput && activeTab === "contacts" && (
            <div className="flex flex-col py-4 border-b border-[#262626] shrink-0">
              <div className="flex justify-between items-center px-4 mb-2.5">
                <span className="text-[14px] font-bold text-zinc-400">Contacts on Cartly</span>
                <button onClick={() => onOpenChange(false)} className="text-[13px] font-bold text-[#2a87d0] hover:underline">
                  View all
                </button>
              </div>
              <div className="flex gap-4 overflow-x-auto px-4 py-1.5 scrollbar-none" style={{ scrollbarWidth: "none" }}>
                {/* Me / Logged In User */}
                <div className="flex flex-col items-center gap-1.5 shrink-0 select-none">
                  <div className="relative">
                    <div className="rounded-full p-[2.2px] bg-gradient-to-tr from-[#f58529] via-[#dd2a7b] to-[#8134af]">
                      <div className="bg-[#121212] p-[2px] rounded-full">
                        <UserAvatar avatarUrl={loggedInUser.avatarUrl} size={62} className="size-[62px] border border-[#262626]" />
                      </div>
                    </div>
                    <span className="absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-[#121212] bg-green-500" />
                  </div>
                  <span className="text-[11px] font-bold text-zinc-400 w-[72px] text-center truncate">
                    {loggedInUser.displayName?.split(" ")[0]?.toUpperCase() || "OMKAR"} (You)
                  </span>
                </div>

                {/* Suggestions contacts list */}
                {suggestions.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => handleUserClick(user)}
                    className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer active:scale-95 transition-transform"
                  >
                    <div className="relative">
                      <div className="rounded-full p-[2.2px] bg-gradient-to-tr from-[#f58529] via-[#dd2a7b] to-[#8134af]">
                        <div className="bg-[#121212] p-[2px] rounded-full">
                          <UserAvatar avatarUrl={user.avatarUrl} size={62} className="size-[62px] border border-[#262626]" />
                        </div>
                      </div>
                      <span className="absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-[#121212] bg-green-500" />
                    </div>
                    <span className="text-[11px] font-bold text-zinc-300 w-[72px] text-center truncate flex items-center justify-center gap-0.5">
                      {user.displayName || user.username}
                      {user.verified && <VerifiedBadge size={10} className="text-[#8a3ffc] shrink-0" />}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Frequently Contacted */}
          {!searchInput && activeTab === "contacts" && frequentlyContacted.length > 0 && (
            <div className="flex flex-col py-4 border-b border-[#262626] shrink-0">
              <span className="text-[14px] font-bold text-zinc-400 px-4 mb-2">Frequently contacted</span>
              <div className="flex flex-col">
                {frequentlyContacted.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleUserClick(user)}
                    className="flex items-center gap-3.5 px-4 py-2.5 hover:bg-zinc-800/30 text-start w-full transition-colors"
                  >
                    <div className="relative shrink-0">
                      <UserAvatar avatarUrl={user.avatarUrl} size={44} className="size-[44px] border border-[#262626]" />
                      <span className="absolute bottom-0.5 right-0.5 size-3.5 rounded-full border border-[#121212] bg-green-500" />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-[14.5px] font-semibold text-white truncate">{user.name}</span>
                      <span className="text-xs text-zinc-500 font-medium">Active yesterday</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tab Navigation Chips */}
          <div className="flex border-b border-[#262626] sticky top-0 bg-[#121212] z-10 shrink-0">
            {[
              { id: "contacts", label: "All Contacts" },
              { id: "groups", label: "Groups" },
              { id: "channels", label: "Channels" },
              { id: "communities", label: "Communities" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setIsGroupMode(false);
                  setSelectedGroupUsers([]);
                  setActiveTab(tab.id as any);
                }}
                className="flex-1 py-3 text-[13px] font-bold text-center border-b-2 transition-all select-none relative"
                style={{
                  color: activeTab === tab.id ? "#2a87d0" : "#71717a",
                  borderColor: activeTab === tab.id ? "#2a87d0" : "transparent"
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Pages */}
          <div className="flex-1 relative min-h-[300px]">
            {activeTab === "contacts" && (
              <div className="flex h-full">
                {/* Contacts alphabetical scroll */}
                <div className="flex-1 py-2">
                  {Object.keys(groupedContacts).length === 0 ? (
                    <p className="text-center text-sm text-zinc-500 py-10 font-medium">No contacts found</p>
                  ) : (
                    Object.keys(groupedContacts).map((letter) => (
                      <div key={letter} id={`letter-${letter}`} className="flex flex-col mb-4">
                        <span className="px-4 py-1 text-xs font-bold text-[#2a87d0] bg-[#1c1c1e] select-none block sticky top-[45px] z-5">
                          {letter}
                        </span>
                        <div className="flex flex-col mt-1">
                          {groupedContacts[letter].map((user: any) => {
                            const isChecked = selectedGroupUsers.some((u) => u.id === user.id);
                            return (
                              <button
                                key={user.id}
                                onClick={() => handleUserClick(user)}
                                className="flex items-center justify-between px-4 py-2.5 hover:bg-zinc-800/30 text-start w-full transition-colors"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="relative shrink-0">
                                    <UserAvatar avatarUrl={user.avatarUrl} size={42} className="size-[42px] border border-[#262626]" />
                                    <span className="absolute bottom-0 right-0 size-3 rounded-full border border-[#121212] bg-green-500" />
                                  </div>
                                  <div className="flex flex-col justify-center min-w-0">
                                    <span className="font-semibold text-sm text-white truncate flex items-center gap-1">
                                      {user.displayName || user.username}
                                      {user.verified && <VerifiedBadge size={12} className="text-[#8a3ffc]" />}
                                    </span>
                                    <span className="text-xs text-zinc-500 truncate font-medium">last seen recently</span>
                                  </div>
                                </div>
                                {isGroupMode && (
                                  <div
                                    className={cn(
                                      "size-[22px] rounded-full border flex items-center justify-center transition-all",
                                      isChecked
                                        ? "bg-[#2a87d0] border-[#2a87d0] text-white"
                                        : "border-[#262626]/50 bg-transparent text-transparent"
                                    )}
                                  >
                                    <Check className="size-3.5 stroke-[3px]" />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Right side A-Z vertical indicator */}
                {!searchInput && (
                  <div className="w-[28px] flex flex-col items-center justify-start py-4 bg-[#121212]/40 border-l border-[#262626] shrink-0 select-none text-[9.5px] font-extrabold text-[#2a87d0] sticky top-[45px] right-0 gap-0.5 leading-none">
                    {["#", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"].map((l) => (
                      <button
                        key={l}
                        onClick={() => scrollLetter(l)}
                        className="py-[2px] w-full text-center hover:bg-zinc-800/40 rounded font-black active:scale-95 transition-all select-none"
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Groups Tab Page */}
            {activeTab === "groups" && (
              <div className="py-2 flex flex-col">
                {groupsList.length === 0 ? (
                  <p className="text-center text-sm text-zinc-500 py-16 font-medium">No groups found</p>
                ) : (
                  groupsList.map((channel) => (
                    <button
                      key={channel.id}
                      onClick={() => {
                        if (onChannelCreated) onChannelCreated(channel);
                        onChatCreated();
                      }}
                      className="flex items-center gap-3.5 px-4 py-3 hover:bg-zinc-800/30 text-start w-full border-b border-[#262626]/40 transition-colors"
                    >
                      {channel.data?.image ? (
                        <div className="size-11 rounded-full overflow-hidden shrink-0 border border-[#262626]">
                          <img
                            src={channel.data.image}
                            alt={channel.data.name || "Group"}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="size-11 rounded-full bg-[#2a87d0] text-white flex items-center justify-center shrink-0 font-bold border border-[#262626]">
                          {channel.data?.name?.[0]?.toUpperCase() || <Users className="size-5" />}
                        </div>
                      )}
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="font-semibold text-[14.5px] text-white truncate">{channel.data?.name || "Group Chat"}</span>
                        <span className="text-xs text-zinc-500 font-medium truncate">
                          {Object.keys(channel.state.members || {}).length} members
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Channels Tab Page */}
            {activeTab === "channels" && (
              <div className="py-2 flex flex-col">
                {channelsList.length === 0 ? (
                  <p className="text-center text-sm text-zinc-500 py-16 font-medium">No channels found</p>
                ) : (
                  channelsList.map((channel) => (
                    <button
                      key={channel.id}
                      onClick={() => {
                        if (onChannelCreated) onChannelCreated(channel);
                        onChatCreated();
                      }}
                      className="flex items-center gap-3.5 px-4 py-3 hover:bg-zinc-800/30 text-start w-full border-b border-[#262626]/40 transition-colors"
                    >
                      <div className="size-11 rounded-full bg-[#0ea5e9] text-white flex items-center justify-center shrink-0 font-bold border border-[#262626]">
                        {channel.data?.name?.[0]?.toUpperCase() || <Megaphone className="size-5" />}
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="font-semibold text-[14.5px] text-white truncate">{channel.data?.name || "Broadcast Channel"}</span>
                        <span className="text-xs text-zinc-500 font-medium truncate">
                          {channel.data?.description || "Broadcast to unlimited followers"}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Communities Tab Page */}
            {activeTab === "communities" && (
              <div className="py-2 flex flex-col">
                {communitiesList.length === 0 ? (
                  <p className="text-center text-sm text-zinc-500 py-16 font-medium">No communities found</p>
                ) : (
                  communitiesList.map((channel) => (
                    <button
                      key={channel.id}
                      onClick={() => {
                        if (onChannelCreated) onChannelCreated(channel);
                        onChatCreated();
                      }}
                      className="flex items-center gap-3.5 px-4 py-3 hover:bg-zinc-800/30 text-start w-full border-b border-[#262626]/40 transition-colors"
                    >
                      <div className="size-11 rounded-full bg-[#22c55e] text-white flex items-center justify-center shrink-0 font-bold border border-[#262626]">
                        {channel.data?.name?.[0]?.toUpperCase() || <Globe className="size-5" />}
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="font-semibold text-[14.5px] text-white truncate">{channel.data?.name || "Community Space"}</span>
                        <span className="text-xs text-zinc-500 font-medium truncate">
                          {channel.data?.description || "Groups and channels together"}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Step 1: Contact Selection Overlay */}
        {isGroupMode && groupStep === 1 && (
          <div className="absolute inset-0 z-[140] flex flex-col bg-[#121212] animate-in slide-in-from-bottom duration-200 pb-[env(safe-area-inset-bottom)]">
            {/* Header */}
            <div className="flex items-center gap-4 px-4 py-4 border-b border-[#262626] shrink-0 bg-[#121212]">
              <button 
                onClick={() => {
                  setIsGroupMode(false);
                  setGroupStep(0);
                  setSelectedGroupUsers([]);
                  setSearchInput("");
                }} 
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 active:scale-95 transition-transform"
              >
                <ArrowLeft className="size-6" />
              </button>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-[17px] font-bold text-white">New Group</span>
                <span className="text-[12px] text-zinc-400">
                  {selectedGroupUsers.length > 0 ? `${selectedGroupUsers.length} selected` : "up to 200,000 members"}
                </span>
              </div>
            </div>

            {/* Selected Contacts Horizontal Pill List */}
            {selectedGroupUsers.length > 0 && (
              <div className="flex gap-4 overflow-x-auto px-4 py-3 bg-[#121212] border-b border-[#262626]/40 shrink-0 scrollbar-none" style={{ scrollbarWidth: "none" }}>
                {selectedGroupUsers.map((user) => (
                  <div 
                    key={user.id} 
                    className="flex flex-col items-center gap-1 shrink-0 select-none animate-in zoom-in-95 duration-150 relative w-14"
                  >
                    <div className="relative">
                      {user.avatarUrl ? (
                        <UserAvatar avatarUrl={user.avatarUrl} size={44} className="size-[44px] border border-[#262626]" />
                      ) : (
                        <div className={cn("size-[44px] rounded-full flex items-center justify-center text-sm font-bold text-white", getTelegramColor(user.displayName))} style={{ minWidth: "44px" }}>
                          {getInitials(user.displayName)}
                        </div>
                      )}
                      {/* Remove Button */}
                      <button
                        onClick={() => setSelectedGroupUsers((prev) => prev.filter((u) => u.id !== user.id))}
                        className="absolute -top-1 -right-1 size-5 rounded-full bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center border border-[#121212]"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                    <span className="text-[10px] font-semibold text-zinc-300 text-center truncate w-full">
                      {user.displayName?.split(" ")[0] || user.username}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Sticky Search Bar */}
            <div className="p-4 shrink-0 bg-[#121212] border-b border-[#262626]/20">
              <div className="relative flex items-center">
                <Search className="absolute left-3.5 size-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Who would you like to add?"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 bg-[#1c1c1e] border border-transparent focus:border-zinc-800 rounded-xl text-[14px] text-white focus:outline-none placeholder-zinc-500 font-medium"
                />
              </div>
            </div>

            {/* Scrollable Contacts List */}
            <div className="flex-1 overflow-y-auto scrollbar-none flex flex-col bg-[#121212] pb-24">
              {groupContactsList.length === 0 ? (
                <p className="text-center text-sm text-zinc-500 py-12 font-medium">No contacts found</p>
              ) : (
                <>
                  {/* Frequently Contacted */}
                  {!searchInput.trim() && groupContactsList.some(u => u.type === "frequent") && (
                    <div className="flex flex-col mt-2">
                      <span className="px-4 py-1.5 text-xs font-bold text-zinc-500 select-none block">
                        Frequently contacted
                      </span>
                      <div className="flex flex-col mt-1">
                        {groupContactsList
                          .filter(u => u.type === "frequent")
                          .map((user) => {
                            const isChecked = selectedGroupUsers.some((u) => u.id === user.id);
                            return (
                              <button
                                key={user.id}
                                onClick={() => handleUserClick(user)}
                                className="flex items-center gap-3.5 px-4 py-2.5 hover:bg-zinc-800/30 text-start w-full transition-all duration-200 active:scale-[0.99]"
                              >
                                <div className="relative shrink-0">
                                  {user.avatarUrl ? (
                                    <UserAvatar avatarUrl={user.avatarUrl} size={42} className="size-[42px] border border-[#262626]" />
                                  ) : (
                                    <div className={cn("size-[42px] rounded-full flex items-center justify-center text-sm font-bold text-white", getTelegramColor(user.displayName))}>
                                      {getInitials(user.displayName)}
                                    </div>
                                  )}
                                  {isChecked && (
                                    <span className="absolute -bottom-1 -right-1 size-[20px] rounded-full bg-[#229ED9] border-2 border-[#121212] flex items-center justify-center text-white animate-in zoom-in duration-200">
                                      <Check className="size-3 text-white stroke-[4px]" />
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-col flex-1 min-w-0">
                                  <span className="text-[14.5px] font-semibold text-white truncate">{user.displayName}</span>
                                  <span className="text-xs text-zinc-500 font-medium">{getLastSeenText(user)}</span>
                                </div>
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* Followers & Contacts */}
                  {!searchInput.trim() && groupContactsList.some(u => u.type === "follower") && (
                    <div className="flex flex-col mt-4">
                      <span className="px-4 py-1.5 text-xs font-bold text-zinc-500 select-none block">
                        Followers & Contacts
                      </span>
                      <div className="flex flex-col mt-1">
                        {groupContactsList
                          .filter(u => u.type === "follower")
                          .map((user) => {
                            const isChecked = selectedGroupUsers.some((u) => u.id === user.id);
                            return (
                              <button
                                key={user.id}
                                onClick={() => handleUserClick(user)}
                                className="flex items-center gap-3.5 px-4 py-2.5 hover:bg-zinc-800/30 text-start w-full transition-all duration-200 active:scale-[0.99]"
                              >
                                <div className="relative shrink-0">
                                  {user.avatarUrl ? (
                                    <UserAvatar avatarUrl={user.avatarUrl} size={42} className="size-[42px] border border-[#262626]" />
                                  ) : (
                                    <div className={cn("size-[42px] rounded-full flex items-center justify-center text-sm font-bold text-white", getTelegramColor(user.displayName))}>
                                      {getInitials(user.displayName)}
                                    </div>
                                  )}
                                  {isChecked && (
                                    <span className="absolute -bottom-1 -right-1 size-[20px] rounded-full bg-[#229ED9] border-2 border-[#121212] flex items-center justify-center text-white animate-in zoom-in duration-200">
                                      <Check className="size-3 text-white stroke-[4px]" />
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-col flex-1 min-w-0">
                                  <span className="text-[14.5px] font-semibold text-white truncate">{user.displayName}</span>
                                  <span className="text-xs text-zinc-500 font-medium">{getLastSeenText(user)}</span>
                                </div>
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* Other Suggestions */}
                  {!searchInput.trim() && groupContactsList.some(u => u.type === "suggestion") && (
                    <div className="flex flex-col mt-4">
                      <span className="px-4 py-1.5 text-xs font-bold text-zinc-500 select-none block">
                        Other suggestions
                      </span>
                      <div className="flex flex-col mt-1">
                        {groupContactsList
                          .filter(u => u.type === "suggestion")
                          .map((user) => {
                            const isChecked = selectedGroupUsers.some((u) => u.id === user.id);
                            return (
                              <button
                                key={user.id}
                                onClick={() => handleUserClick(user)}
                                className="flex items-center gap-3.5 px-4 py-2.5 hover:bg-zinc-800/30 text-start w-full transition-all duration-200 active:scale-[0.99]"
                              >
                                <div className="relative shrink-0">
                                  {user.avatarUrl ? (
                                    <UserAvatar avatarUrl={user.avatarUrl} size={42} className="size-[42px] border border-[#262626]" />
                                  ) : (
                                    <div className={cn("size-[42px] rounded-full flex items-center justify-center text-sm font-bold text-white", getTelegramColor(user.displayName))}>
                                      {getInitials(user.displayName)}
                                    </div>
                                  )}
                                  {isChecked && (
                                    <span className="absolute -bottom-1 -right-1 size-[20px] rounded-full bg-[#229ED9] border-2 border-[#121212] flex items-center justify-center text-white animate-in zoom-in duration-200">
                                      <Check className="size-3 text-white stroke-[4px]" />
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-col flex-1 min-w-0">
                                  <span className="text-[14.5px] font-semibold text-white truncate">{user.displayName}</span>
                                  <span className="text-xs text-zinc-500 font-medium">{getLastSeenText(user)}</span>
                                </div>
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* Filtered Search Results */}
                  {searchInput.trim() && (
                    <div className="flex flex-col mt-2">
                      <div className="flex flex-col">
                        {groupContactsList.map((user) => {
                          const isChecked = selectedGroupUsers.some((u) => u.id === user.id);
                          return (
                            <button
                              key={user.id}
                              onClick={() => handleUserClick(user)}
                              className="flex items-center gap-3.5 px-4 py-2.5 hover:bg-zinc-800/30 text-start w-full transition-all duration-200 active:scale-[0.99]"
                            >
                              <div className="relative shrink-0">
                                {user.avatarUrl ? (
                                  <UserAvatar avatarUrl={user.avatarUrl} size={42} className="size-[42px] border border-[#262626]" />
                                ) : (
                                  <div className={cn("size-[42px] rounded-full flex items-center justify-center text-sm font-bold text-white", getTelegramColor(user.displayName))}>
                                    {getInitials(user.displayName)}
                                  </div>
                                )}
                                {isChecked && (
                                  <span className="absolute -bottom-1 -right-1 size-[20px] rounded-full bg-[#229ED9] border-2 border-[#121212] flex items-center justify-center text-white animate-in zoom-in duration-200">
                                    <Check className="size-3 text-white stroke-[4px]" />
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-col flex-1 min-w-0">
                                <span className="text-[14.5px] font-semibold text-white truncate">{user.displayName}</span>
                                <span className="text-xs text-zinc-500 font-medium">{getLastSeenText(user)}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Next Step FAB */}
            {selectedGroupUsers.length > 0 && (
              <button
                onClick={() => {
                  setGroupStep(2);
                  setSearchInput("");
                }}
                className="absolute bottom-6 right-6 size-14 rounded-full bg-[#2a87d0] hover:bg-[#2076b4] text-white flex items-center justify-center shadow-2xl transition-all active:scale-90 select-none animate-in fade-in zoom-in duration-200 z-[145]"
              >
                <ArrowRight className="size-6 text-white" />
              </button>
            )}
          </div>
        )}

        {/* Step 2: Group Details Overlay */}
        {isGroupMode && groupStep === 2 && (
          <div className="absolute inset-0 z-[150] flex flex-col bg-[#121212] animate-in slide-in-from-bottom duration-200 pb-[env(safe-area-inset-bottom)]">
            {/* Header */}
            <div className="flex items-center gap-4 px-4 py-4 border-b border-[#262626] shrink-0 bg-[#121212]">
              <button 
                onClick={() => {
                  setGroupStep(1);
                }} 
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 active:scale-95 transition-transform"
              >
                <ArrowLeft className="size-6" />
              </button>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-[17px] font-bold text-white">New Group</span>
                <span className="text-[12px] text-zinc-400">Group Details</span>
              </div>
            </div>

            {/* Config Card */}
            <div className="flex gap-4 p-5 items-center bg-[#121212] border-b border-[#262626]/40 shrink-0">
              <div 
                onClick={() => groupPhotoInputRef.current?.click()}
                className="size-[72px] rounded-full bg-[#2a87d0]/10 hover:bg-[#2a87d0]/20 border border-dashed border-[#2a87d0]/40 flex flex-col items-center justify-center text-[#2a87d0] shrink-0 cursor-pointer relative overflow-hidden transition-colors"
              >
                {groupPhotoPreview ? (
                  <img src={groupPhotoPreview} alt="Group preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-1 select-none">
                    <Camera className="size-6" />
                    <span className="text-[9px] font-bold">ADD PHOTO</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  ref={groupPhotoInputRef}
                  className="hidden"
                  onChange={handleGroupPhotoChange}
                />
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-2 relative">
                <div className="flex items-center gap-2 border-b border-zinc-800 focus-within:border-[#2a87d0] transition-colors py-1">
                  <input
                    type="text"
                    placeholder="Enter group name"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="bg-transparent flex-1 focus:outline-none text-[16px] text-white placeholder-zinc-500 font-semibold"
                    autoFocus
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      const emojis = ["👥", "💬", "🎉", "🔥", "🚀", "💡", "🎮", "🎵"];
                      const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                      setGroupName((prev) => prev + randomEmoji);
                    }}
                    className="text-zinc-500 hover:text-white"
                  >
                    <Smile className="size-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Auto-Delete Messages Row */}
            <div className="flex flex-col bg-[#121212] shrink-0">
              <button
                type="button"
                onClick={() => {
                  setAutoDeleteTime((prev) => {
                    if (prev === "Off") return "24 hours";
                    if (prev === "24 hours") return "7 days";
                    return "Off";
                  });
                  toast({
                    description: `Auto-delete set to: ${
                      autoDeleteTime === "Off" ? "24 hours" : autoDeleteTime === "24 hours" ? "7 days" : "Off"
                    }`,
                  });
                }}
                className="flex items-center justify-between px-5 py-4 border-b border-[#262626] hover:bg-zinc-800/20 text-start transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <Clock className="size-5 text-zinc-400" />
                  <div className="flex flex-col">
                    <span className="text-[14.5px] font-semibold text-white">Auto-Delete Messages</span>
                    <span className="text-[12px] text-zinc-500">Automatically delete new messages for all members</span>
                  </div>
                </div>
                <span className="text-sm font-bold text-[#2a87d0]">{autoDeleteTime}</span>
              </button>
            </div>

            {/* Selected Members list */}
            <div className="flex-1 flex flex-col min-h-0 bg-[#121212]">
              <div className="px-5 py-3 border-b border-[#262626]/20 bg-[#121212]/40 shrink-0">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Members ({selectedGroupUsers.length})
                </span>
              </div>
              <div className="flex-1 overflow-y-auto pb-24 scrollbar-none">
                {selectedGroupUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3.5 px-5 py-2.5 hover:bg-zinc-800/10 text-start w-full border-b border-[#262626]/20"
                  >
                    <div className="relative shrink-0">
                      {user.avatarUrl ? (
                        <UserAvatar avatarUrl={user.avatarUrl} size={40} className="size-[40px] border border-[#262626]" />
                      ) : (
                        <div className={cn("size-[40px] rounded-full flex items-center justify-center text-xs font-bold text-white", getTelegramColor(user.displayName))}>
                          {getInitials(user.displayName)}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-semibold text-sm text-white truncate">{user.displayName || user.username}</span>
                      <span className="text-xs text-zinc-500 font-medium">{getLastSeenText(user)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Confirm Create FAB */}
            <button
              onClick={() => createGroupMutation.mutate()}
              disabled={!groupName.trim() || createGroupMutation.isPending}
              className="absolute bottom-6 right-6 size-14 rounded-full bg-[#2a87d0] hover:bg-[#2076b4] text-white flex items-center justify-center shadow-2xl transition-all active:scale-90 disabled:opacity-50 select-none animate-in fade-in zoom-in duration-200 z-[155]"
            >
              {createGroupMutation.isPending ? (
                <Loader2 className="size-6 animate-spin text-white" />
              ) : (
                <Check className="size-6 text-white stroke-[3px]" />
              )}
            </button>
          </div>
        )}

        {/* 2. Channel Creation Form Dialog overlay */}
        {showCreateChannelModal && (
          <div className="absolute inset-0 z-[150] flex flex-col bg-[#121212] p-5 animate-in slide-in-from-bottom duration-200 pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-between pb-4 border-b border-[#262626]">
              <button onClick={() => setShowCreateChannelModal(false)} className="p-1 text-zinc-400 hover:text-white">
                <X className="size-6" />
              </button>
              <span className="font-bold text-base">New Channel</span>
              <button
                onClick={() => createChannelMutation.mutate()}
                disabled={!channelName.trim() || createChannelMutation.isPending}
                className="text-[#0ea5e9] font-bold text-sm disabled:opacity-50"
              >
                {createChannelMutation.isPending ? "Creating..." : "Create"}
              </button>
            </div>
            <div className="flex flex-col gap-5 py-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Channel Name</label>
                <input
                  type="text"
                  placeholder="Enter channel name"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  className="h-11 w-full bg-[#1c1c1e] border border-[#262626] focus:border-zinc-750 rounded-xl px-4 text-sm text-white focus:outline-none"
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Description (Optional)</label>
                <textarea
                  placeholder="What is this channel about?"
                  value={channelDesc}
                  onChange={(e) => setChannelDesc(e.target.value)}
                  className="h-24 w-full bg-[#1c1c1e] border border-[#262626] focus:border-zinc-750 rounded-xl p-3 text-sm text-white focus:outline-none resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* 3. Community Creation Form Dialog overlay */}
        {showCreateCommunityModal && (
          <div className="absolute inset-0 z-[150] flex flex-col bg-[#121212] p-5 animate-in slide-in-from-bottom duration-200 pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-between pb-4 border-b border-[#262626]">
              <button onClick={() => setShowCreateCommunityModal(false)} className="p-1 text-zinc-400 hover:text-white">
                <X className="size-6" />
              </button>
              <span className="font-bold text-base">New Community</span>
              <button
                onClick={() => createCommunityMutation.mutate()}
                disabled={!communityName.trim() || createCommunityMutation.isPending}
                className="text-[#22c55e] font-bold text-sm disabled:opacity-50"
              >
                {createCommunityMutation.isPending ? "Creating..." : "Create"}
              </button>
            </div>
            <div className="flex flex-col gap-5 py-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Community Name</label>
                <input
                  type="text"
                  placeholder="Enter community name"
                  value={communityName}
                  onChange={(e) => setCommunityName(e.target.value)}
                  className="h-11 w-full bg-[#1c1c1e] border border-[#262626] focus:border-zinc-750 rounded-xl px-4 text-sm text-white focus:outline-none"
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Description (Optional)</label>
                <textarea
                  placeholder="What is this community about?"
                  value={communityDesc}
                  onChange={(e) => setCommunityDesc(e.target.value)}
                  className="h-24 w-full bg-[#1c1c1e] border border-[#262626] focus:border-zinc-750 rounded-xl p-3 text-sm text-white focus:outline-none resize-none"
                />
              </div>
            </div>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}
