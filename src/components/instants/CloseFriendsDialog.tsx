"use client";

import React, { useState, useEffect } from "react";
import { X, Search, UserCheck, Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import kyInstance from "@/lib/ky";
import Image from "next/image";
import { VerifiedBadge } from "@/components/VerifiedBadge";

interface UserItem {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  verified: boolean;
}

interface CloseFriendsDialogProps {
  open: boolean;
  onClose: () => void;
  loggedInUserId: string;
}

export default function CloseFriendsDialog({
  open,
  onClose,
  loggedInUserId,
}: CloseFriendsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch followings
  const { data: followings = [], isLoading: loadingFollowings } = useQuery<UserItem[]>({
    queryKey: ["users", loggedInUserId, "following", "list"],
    queryFn: () => kyInstance.get(`/api/users/${loggedInUserId}/following/list`).json<UserItem[]>(),
    enabled: open && !!loggedInUserId,
    staleTime: 60 * 1000,
  });

  // Fetch close friends
  const { data: closeFriends = [], isLoading: loadingCloseFriends } = useQuery<UserItem[]>({
    queryKey: ["instants-close-friends"],
    queryFn: () => kyInstance.get("/api/instants/close-friends").json<UserItem[]>(),
    enabled: open,
    staleTime: 30 * 1000,
  });

  const closeFriendIds = useMemo(() => {
    return new Set(closeFriends.map((f) => f.id));
  }, [closeFriends]);

  const mutation = useMutation({
    mutationFn: async (friendId: string) => {
      const res = await fetch("/api/instants/close-friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendId }),
      });
      if (!res.ok) throw new Error("Failed to toggle friend status");
      return res.json();
    },
    onSuccess: (data, friendId) => {
      // Invalidate query to trigger reload
      queryClient.invalidateQueries({ queryKey: ["instants-close-friends"] });
      
      const friendUser = followings.find((f) => f.id === friendId);
      const name = friendUser?.displayName || friendUser?.username || "User";
      toast({
        description: data.added
          ? `${name} added to Close Friends.`
          : `${name} removed from Close Friends.`,
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        description: "Failed to update close friend status.",
      });
    },
  });

  const handleToggle = (id: string) => {
    mutation.mutate(id);
  };

  const filteredFollowings = useMemo(() => {
    return followings.filter((f) => {
      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;
      return (
        f.displayName.toLowerCase().includes(query) ||
        f.username.toLowerCase().includes(query)
      );
    });
  }, [followings, searchQuery]);

  const isLoading = loadingFollowings || loadingCloseFriends;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm select-none p-4">
      <div className="relative w-full max-w-md h-[80vh] sm:max-h-[550px] flex flex-col justify-between bg-zinc-950 rounded-3xl border border-zinc-900 overflow-hidden text-white shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-900 shrink-0">
          <div className="flex items-center gap-2">
            <Star className="size-5 fill-green-400 text-green-400" />
            <h2 className="text-lg font-bold tracking-tight">Close Friends</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full bg-zinc-900/60 hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 pt-4 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search following"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-xl bg-zinc-900 pe-10 ps-9 text-xs focus:outline-none text-white border border-transparent focus:border-zinc-800 placeholder-zinc-500"
            />
          </div>
        </div>

        {/* List of followings */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-none">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-[#7c3aed]" />
            </div>
          ) : filteredFollowings.length === 0 ? (
            <p className="text-center text-xs text-zinc-500 my-12">
              No followings found.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredFollowings.map((userItem) => {
                const isCloseFriend = closeFriendIds.has(userItem.id);
                
                return (
                  <div
                    key={userItem.id}
                    className="flex items-center justify-between py-1 border-b border-zinc-900/40 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative size-10 rounded-full overflow-hidden bg-zinc-900 border border-zinc-800 shrink-0">
                        {userItem.avatarUrl ? (
                          <Image src={userItem.avatarUrl} alt={userItem.displayName} fill sizes="40px" className="object-cover" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center font-bold text-xs uppercase text-zinc-400">
                            {userItem.username[0]}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-white flex items-center gap-1">
                          {userItem.displayName}
                          {userItem.verified && (
                            <VerifiedBadge size={12} className="text-[#8a3ffc] shrink-0" />
                          )}
                        </span>
                        <span className="text-[10px] text-zinc-500">@{userItem.username}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggle(userItem.id)}
                      disabled={mutation.isPending}
                      className={`flex items-center justify-center size-9 rounded-xl transition-all ${
                        isCloseFriend
                          ? "bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20"
                          : "bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white"
                      }`}
                      title={isCloseFriend ? "Remove from Close Friends" : "Add to Close Friends"}
                    >
                      <Star className={`size-4.5 ${isCloseFriend ? "fill-green-400" : ""}`} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-900 bg-zinc-950/80 shrink-0 flex justify-end">
          <Button
            onClick={onClose}
            className="bg-zinc-900 hover:bg-zinc-800 text-white font-bold px-6 rounded-xl border border-zinc-800"
          >
            Done
          </Button>
        </div>

      </div>
    </div>
  );
}

// Custom useMemo implementation in file for TypeScript
function useMemo<T>(fn: () => T, deps: any[]): T {
  return React.useMemo(fn, deps);
}
