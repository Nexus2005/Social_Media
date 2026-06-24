"use client";

import { useState, useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useQuery } from "@tanstack/react-query";
import { Chat as StreamChat, ChannelList, ChannelPreviewMessenger, ChannelPreviewUIComponentProps, Channel, Window, MessageList, MessageInput, useChatContext } from "stream-chat-react";
import { useChat } from "@/app/(main)/ChatProvider";
import NewChatDialog from "@/app/(main)/messages/NewChatDialog";
import { useSession } from "@/app/(main)/SessionProvider";
import kyInstance from "@/lib/ky";
import { MessageCountInfo } from "@/lib/types";
import { ChevronUp, ChevronDown, MessageSquare, MailPlus, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

export default function FloatingChat() {
  const pathname = usePathname();

  // Hide on full message page or create page
  if (pathname.startsWith("/messages") || pathname === "/create") {
    return null;
  }

  return <FloatingChatWrapper />;
}

function FloatingChatWrapper() {
  const { user } = useSession();
  const { resolvedTheme } = useTheme();

  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<"list" | "chat">("list");
  const [showNewChat, setShowNewChat] = useState(false);

  const chatClient = useChat();


  // Share unread message count with the sidebar
  const { data: messagesData } = useQuery({
    queryKey: ["unread-messages-count"],
    queryFn: () =>
      kyInstance.get("/api/messages/unread-count").json<MessageCountInfo>(),
    refetchInterval: 60 * 1000,
  });

  const ChannelPreviewCustom = useCallback(
    (props: ChannelPreviewUIComponentProps) => (
      <ChannelPreviewMessenger
        {...props}
        onSelect={() => {
          props.setActiveChannel?.(props.channel, props.watchers);
          setView("chat");
        }}
      />
    ),
    []
  );

  return (
    <div
      className={cn(
        "fixed bottom-0 right-6 z-40 w-80 bg-card border border-border/80 shadow-2xl rounded-t-2xl flex flex-col transition-all duration-300 ease-in-out select-none",
        isOpen ? "h-[450px]" : "h-[48px]"
      )}
    >
      {/* Header Bar */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between p-3 border-b border-border/40 cursor-pointer hover:bg-muted/15 transition-colors rounded-t-2xl"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="size-5 text-primary" />
          <span className="font-semibold text-sm text-foreground">Messages</span>
          {!!messagesData?.unreadCount && !isOpen && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground animate-pulse">
              {messagesData.unreadCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {isOpen && chatClient && (
            <button
              onClick={() => setShowNewChat(true)}
              className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted/30 transition-colors"
              title="New Chat"
            >
              <MailPlus className="size-4.5" />
            </button>
          )}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted/30 transition-colors"
          >
            {isOpen ? <ChevronDown className="size-4.5" /> : <ChevronUp className="size-4.5" />}
          </button>
        </div>
      </div>

      {/* Expandable Chat Body */}
      {isOpen && (
        <div className="flex-grow overflow-hidden relative flex flex-col h-full bg-card">
          {!chatClient ? (
            <div className="flex-grow flex items-center justify-center">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          ) : (
            <StreamChat
              client={chatClient}
              theme={
                resolvedTheme === "dark"
                  ? "str-chat__theme-dark"
                  : "str-chat__theme-light"
              }
            >
              <FloatingChatInner
                view={view}
                setView={setView}
                user={user}
                ChannelPreviewCustom={ChannelPreviewCustom}
              />
              
              {/* New Chat Dialogue Overlay */}
              {showNewChat && (
                <NewChatDialog
                  onOpenChange={setShowNewChat}
                  onChatCreated={() => {
                    setShowNewChat(false);
                    setView("chat");
                  }}
                  chatClient={chatClient}
                />
              )}
            </StreamChat>
          )}
        </div>
      )}
    </div>
  );
}

interface FloatingChatInnerProps {
  view: "list" | "chat";
  setView: (v: "list" | "chat") => void;
  user: any;
  ChannelPreviewCustom: any;
}

function FloatingChatInner({
  view,
  setView,
  user,
  ChannelPreviewCustom,
}: FloatingChatInnerProps) {
  const { channel, setActiveChannel } = useChatContext();

  // Automatically reset to list view if active channel becomes null
  useEffect(() => {
    if (!channel) {
      setView("list");
    }
  }, [channel, setView]);

  return (
    <div className="flex-grow flex flex-col h-full overflow-hidden">
      {view === "list" ? (
        <div className="flex-grow flex flex-col h-full overflow-hidden">
          <ChannelList
            filters={{
              type: "messaging",
              members: { $in: [user.id] },
            }}
            showChannelSearch={false}
            options={{ state: true, presence: true, limit: 10 }}
            sort={{ last_message_at: -1 }}
            Preview={ChannelPreviewCustom}
          />
        </div>
      ) : (
        <div className="flex-grow flex flex-col h-full overflow-hidden">
          {/* Compact Active Channel Header */}
          <div className="flex items-center gap-2 p-2 border-b border-border/40 bg-card">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                setView("list");
                setActiveChannel(undefined);
              }}
              className="size-8"
            >
              <ArrowLeft className="size-4" />
            </Button>
            <span className="font-semibold text-xs text-muted-foreground truncate">
              Back to chats
            </span>
          </div>
          {/* Channel Window */}
          <div className="flex-grow flex flex-col h-full overflow-hidden">
            <Channel>
              <Window>
                <MessageList />
                <MessageInput />
              </Window>
            </Channel>
          </div>
        </div>
      )}
    </div>
  );
}
