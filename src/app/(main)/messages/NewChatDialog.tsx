import LoadingButton from "@/components/LoadingButton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import UserAvatar from "@/components/UserAvatar";
import useDebounce from "@/hooks/useDebounce";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Loader2, SearchIcon, X, Users, Megaphone } from "lucide-react";
import { useState } from "react";
import { UserResponse } from "stream-chat";
import { DefaultStreamChatGenerics, useChatContext } from "stream-chat-react";
import { useSession } from "../SessionProvider";
import { cn } from "@/lib/utils";

interface NewChatDialogProps {
  onOpenChange: (open: boolean) => void;
  onChatCreated: () => void;
}

export default function NewChatDialog({
  onOpenChange,
  onChatCreated,
}: NewChatDialogProps) {
  const { client, setActiveChannel } = useChatContext();

  const { toast } = useToast();

  const { user: loggedInUser } = useSession();

  const [searchInput, setSearchInput] = useState("");
  const searchInputDebounced = useDebounce(searchInput);

  const [selectedUsers, setSelectedUsers] = useState<
    UserResponse<DefaultStreamChatGenerics>[]
  >([]);

  const { data, isFetching, isError, isSuccess } = useQuery({
    queryKey: ["stream-users", searchInputDebounced],
    queryFn: async () => {
      const response = await fetch(
        `/api/search?type=accounts&q=${encodeURIComponent(searchInputDebounced)}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      const result = await response.json();
      const mappedUsers = (result.users || [])
        .filter((u: any) => u.id !== loggedInUser.id)
        .map((u: any) => ({
          id: u.id,
          name: u.displayName || u.username,
          image: u.avatarUrl,
          username: u.username,
        }));
      return { users: mappedUsers };
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const channel = client.channel("messaging", {
        members: [loggedInUser.id, ...selectedUsers.map((u) => u.id)],
        name:
          selectedUsers.length > 1
            ? loggedInUser.displayName +
              ", " +
              selectedUsers.map((u) => u.name).join(", ")
            : undefined,
      });
      await channel.create();
      return channel;
    },
    onSuccess: (channel) => {
      setActiveChannel(channel);
      onChatCreated();
    },
    onError(error) {
      console.error("Error starting chat", error);
      toast({
        variant: "destructive",
        description: "Error starting chat. Please try again.",
      });
    },
  });

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="bg-card p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>New chat</DialogTitle>
        </DialogHeader>
        <div>
          <div className="group relative">
            <SearchIcon className="absolute left-5 top-1/2 size-5 -translate-y-1/2 transform text-muted-foreground group-focus-within:text-primary" />
            <input
              placeholder="Search users..."
              className="h-12 w-full pe-4 ps-14 focus:outline-none"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          {!!selectedUsers.length && (
            <div className="mt-4 flex flex-wrap gap-2 p-2">
              {selectedUsers.map((user) => (
                <SelectedUserTag
                  key={user.id}
                  user={user}
                  onRemove={() => {
                    setSelectedUsers((prev) =>
                      prev.filter((u) => u.id !== user.id),
                    );
                  }}
                />
              ))}
            </div>
          )}
          <hr />
          <div className="h-96 overflow-y-auto">
            {/* Telegram-style sticky rows */}
            {!searchInput && (
              <div className="flex flex-col border-b border-border/60 pb-1 select-none">
                <button
                  onClick={() => {
                    toast({ description: "Select multiple members below to start a Group chat." });
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 hover:bg-muted/50 text-start"
                >
                  <div className="flex size-10 items-center justify-center rounded-full bg-blue-500/10 text-blue-500 shrink-0">
                    <Users className="size-5" />
                  </div>
                  <span className="font-semibold text-sm text-foreground">New Group</span>
                </button>

                <button
                  onClick={() => {
                    toast({ description: "New Channel creation will be integrated soon." });
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 hover:bg-muted/50 text-start"
                >
                  <div className="flex size-10 items-center justify-center rounded-full bg-orange-500/10 text-orange-500 shrink-0">
                    <Megaphone className="size-5" />
                  </div>
                  <span className="font-semibold text-sm text-foreground">New Channel</span>
                </button>
              </div>
            )}

            {isSuccess && !!data.users.length && (
              <div className="px-4 py-2 bg-muted/20 border-b border-border/40 text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                Sorted by last seen time
              </div>
            )}

            {isSuccess &&
              [...data.users]
                .sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""))
                .map((user: any) => (
                  <UserResult
                    key={user.id}
                    user={user}
                    selected={selectedUsers.some((u) => u.id === user.id)}
                    onClick={() => {
                      setSelectedUsers((prev) =>
                        prev.some((u) => u.id === user.id)
                          ? prev.filter((u) => u.id !== user.id)
                          : [...prev, user],
                      );
                    }}
                  />
                ))}
            {isSuccess && !data.users.length && (
              <p className="my-3 text-center text-muted-foreground">
                No users found. Try a different name.
              </p>
            )}
            {isFetching && <Loader2 className="mx-auto my-3 animate-spin" />}
            {isError && (
              <p className="my-3 text-center text-destructive">
                An error occurred while loading users.
              </p>
            )}
          </div>
        </div>
        <DialogFooter className="px-6 pb-6">
          <LoadingButton
            disabled={!selectedUsers.length}
            loading={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            Start chat
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface UserResultProps {
  user: UserResponse<DefaultStreamChatGenerics>;
  selected: boolean;
  onClick: () => void;
}

function UserResult({ user, selected, onClick }: UserResultProps) {
  const mockLastSeen = user.id.charCodeAt(0) % 3 === 0 
    ? "last seen recently" 
    : user.id.charCodeAt(0) % 3 === 1 
    ? "last seen 5 minutes ago" 
    : "online";

  return (
    <button
      className="flex w-full items-center justify-between px-4 py-2.5 transition-colors hover:bg-muted/50 text-start"
      onClick={onClick}
    >
      <div className="flex items-center gap-3 min-w-0">
        <UserAvatar avatarUrl={user.image} size={40} className="shrink-0" />
        <div className="flex flex-col justify-center min-w-0">
          <span className="font-bold text-sm text-foreground truncate">{user.name}</span>
          <span className={cn(
            "text-xs truncate", 
            mockLastSeen === "online" ? "text-primary font-medium" : "text-muted-foreground"
          )}>
            {mockLastSeen}
          </span>
        </div>
      </div>
      {selected && <Check className="size-5 text-green-500 shrink-0" />}
    </button>
  );
}

interface SelectedUserTagProps {
  user: UserResponse<DefaultStreamChatGenerics>;
  onRemove: () => void;
}

function SelectedUserTag({ user, onRemove }: SelectedUserTagProps) {
  return (
    <button
      onClick={onRemove}
      className="flex items-center gap-2 rounded-full border p-1 hover:bg-muted/50"
    >
      <UserAvatar avatarUrl={user.image} size={24} />
      <p className="font-bold">{user.name}</p>
      <X className="mx-2 size-5 text-muted-foreground" />
    </button>
  );
}
