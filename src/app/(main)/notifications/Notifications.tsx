"use client";

import { useState, useEffect, useMemo } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Settings } from "lucide-react";
import Link from "next/link";
import { startOfDay, subDays, isAfter } from "date-fns";
import kyInstance from "@/lib/ky";
import InfiniteScrollContainer from "@/components/InfiniteScrollContainer";
import { NotificationsPage } from "@/lib/types";
import { cn } from "@/lib/utils";
import Notification from "./Notification";
import { UINotificationData, UINotificationType } from "./types";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";

const FILTERS = ["All", "People", "Comments", "Mentions", "Likes", "Reposts"];

function NotificationSkeleton() {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-black w-full h-[68px] animate-pulse">
      <div className="flex items-center gap-3 flex-grow min-w-0">
        <div className="size-11 rounded-full bg-zinc-900 shrink-0" />
        <div className="flex flex-col gap-1.5 flex-grow">
          <div className="h-3 w-28 bg-zinc-900 rounded" />
          <div className="h-3 w-48 bg-zinc-900 rounded" />
        </div>
      </div>
      <div className="size-11 rounded-md bg-zinc-900 shrink-0" />
    </div>
  );
}

export default function Notifications() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [sessionUnreadIds, setSessionUnreadIds] = useState<Set<string>>(new Set());
  const [hasInitializedUnread, setHasInitializedUnread] = useState(false);

  // Connect to real-time SSE stream for instant notification updates
  useRealtimeNotifications();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey: ["notifications"],
    queryFn: ({ pageParam }) =>
      kyInstance
        .get(
        "/api/notifications",
        pageParam ? { searchParams: { cursor: pageParam } } : {},
      )
        .json<NotificationsPage>(),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const queryClient = useQueryClient();

  const { mutate } = useMutation({
    mutationFn: () => kyInstance.patch("/api/notifications/mark-as-read"),
    onSuccess: () => {
      queryClient.setQueryData(["unread-notification-count"], {
        unreadCount: 0,
      });
    },
    onError(error) {
      console.error("Failed to mark notifications as read", error);
    },
  });

  // Fetch and mark notifications as read on mount
  useEffect(() => {
    mutate();
  }, [mutate]);

  // Capture initial unread state in local session list
  useEffect(() => {
    if (status === "success" && !hasInitializedUnread && data?.pages) {
      const unreads = new Set<string>();
      data.pages.forEach((page) => {
        page.notifications.forEach((n) => {
          if (!n.read) {
            unreads.add(n.id);
          }
        });
      });
      setSessionUnreadIds(unreads);
      setHasInitializedUnread(true);
    }
  }, [status, data, hasInitializedUnread]);

  const notifications = data?.pages.flatMap((page) => page.notifications) || [];

  // Convert real database notifications to UINotificationData structure (no mocks)
  const uiNotifications = useMemo(() => {
    const converted: UINotificationData[] = notifications.map((n) => ({
      id: n.id,
      recipientId: n.recipientId,
      issuerId: n.issuerId,
      postId: n.postId,
      type: n.type as UINotificationType,
      read: n.read,
      deepLink: (n as any).deepLink || null,
      metadata: (n as any).metadata || null,
      createdAt: n.createdAt,
      issuer: n.issuer,
      post: n.post ? {
        id: n.post.id || "",
        content: n.post.content,
        attachments: n.post.attachments as any[] || [],
      } : null,
    }));

    return converted.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [notifications]);

  // Group notifications chronologically
  const grouped = useMemo(() => {
    const filtered = uiNotifications.filter((n) => {
      if (activeFilter === "All") return true;
      if (activeFilter === "People") return n.type === "FOLLOW" || n.type === "FOLLOW_REQUEST" || n.type === "FOLLOW_ACCEPTED";
      if (activeFilter === "Comments") return n.type === "COMMENT" || n.type === "REPLY" || n.type === "COMMENT_LIKE";
      if (activeFilter === "Mentions") return n.type === "MENTION" || n.type === "QUOTE" || n.type === "STORY_MENTION";
      if (activeFilter === "Likes") return n.type === "LIKE";
      if (activeFilter === "Reposts") return n.type === "REPOST" || n.type === "SHARE";
      return true;
    });

    const now = new Date();
    const todayStart = startOfDay(now);
    const oneWeekAgo = subDays(todayStart, 7);

    const newItems: UINotificationData[] = [];
    const todayItems: UINotificationData[] = [];
    const thisWeekItems: UINotificationData[] = [];
    const earlierItems: UINotificationData[] = [];

    filtered.forEach((item) => {
      const itemDate = new Date(item.createdAt);

      if (sessionUnreadIds.has(item.id)) {
        newItems.push(item);
      } else if (isAfter(itemDate, todayStart)) {
        todayItems.push(item);
      } else if (isAfter(itemDate, oneWeekAgo)) {
        thisWeekItems.push(item);
      } else {
        earlierItems.push(item);
      }
    });

    return { newItems, todayItems, thisWeekItems, earlierItems };
  }, [uiNotifications, activeFilter, sessionUnreadIds]);

  if (status === "pending") {
    return (
      <div className="flex flex-col min-h-screen bg-black">
        {/* Sticky Header */}
        <header className="sticky top-0 z-30 flex h-[56px] w-full items-center justify-between border-b border-neutral-900 bg-black px-4 shrink-0">
          <h1 className="text-lg font-bold text-white select-none">Notifications</h1>
          <Link href="/settings" className="p-2 text-zinc-400 hover:text-white transition-colors">
            <Settings className="size-6" />
          </Link>
        </header>

        {/* Filter Chips */}
        <div className="sticky top-[56px] z-20 bg-black border-b border-neutral-900/50 py-1.5 px-4 flex items-center gap-2 overflow-x-auto scrollbar-none select-none shrink-0">
          {FILTERS.map((filter) => (
            <div
              key={filter}
              className="h-8 px-4 rounded-full text-xs font-semibold bg-zinc-900 text-zinc-700 shrink-0 flex items-center justify-center"
            >
              {filter}
            </div>
          ))}
        </div>

        {/* Row Skeletons */}
        <div className="flex flex-col mt-2">
          {Array.from({ length: 8 }).map((_, idx) => (
            <NotificationSkeleton key={idx} />
          ))}
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col min-h-screen bg-black justify-center items-center p-4">
        <p className="text-center text-destructive font-medium">
          An error occurred while loading notifications.
        </p>
      </div>
    );
  }

  const renderSection = (title: string, items: UINotificationData[]) => {
    if (!items.length) return null;
    return (
      <div className="flex flex-col">
        <h2 className="text-[13px] font-bold text-white px-4 py-2 mt-2 select-none">
          {title}
        </h2>
        <div className="flex flex-col">
          {items.map((item) => (
            <Notification
              key={item.id}
              notification={item}
              isUnread={sessionUnreadIds.has(item.id)}
            />
          ))}
        </div>
      </div>
    );
  };

  const hasAnyItems =
    grouped.newItems.length > 0 ||
    grouped.todayItems.length > 0 ||
    grouped.thisWeekItems.length > 0 ||
    grouped.earlierItems.length > 0;

  return (
    <div className="flex flex-col min-h-screen bg-black">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 flex h-[56px] w-full items-center justify-between border-b border-neutral-900 bg-black px-4 shrink-0">
        <h1 className="text-lg font-bold text-white select-none">Notifications</h1>
        <Link href="/settings" className="p-2 text-zinc-400 hover:text-white transition-colors" title="Settings">
          <Settings className="size-6" />
        </Link>
      </header>

      {/* Filter Chips */}
      <div className="sticky top-[56px] z-20 bg-black border-b border-neutral-900/50 py-1.5 px-4 flex items-center gap-2 overflow-x-auto scrollbar-none select-none shrink-0">
        {FILTERS.map((filter) => {
          const isActive = activeFilter === filter;
          return (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={cn(
                "h-8 px-4 rounded-full text-xs font-semibold whitespace-nowrap transition-colors border-0 flex items-center justify-center shrink-0",
                isActive
                  ? "bg-white text-black"
                  : "bg-zinc-900 hover:bg-zinc-800 text-zinc-400"
              )}
            >
              {filter}
            </button>
          );
        })}
      </div>

      {/* Main Notifications Feeds */}
      {!hasAnyItems ? (
        <div className="flex flex-grow items-center justify-center py-20 px-4">
          <p className="text-center text-zinc-500 font-medium text-sm">
            No notifications found matching &quot;{activeFilter}&quot;.
          </p>
        </div>
      ) : (
        <InfiniteScrollContainer
          className="flex flex-col pb-6"
          onBottomReached={() => hasNextPage && !isFetching && fetchNextPage()}
        >
          {renderSection("New", ...[grouped.newItems])}
          {renderSection("Today", ...[grouped.todayItems])}
          {renderSection("This Week", ...[grouped.thisWeekItems])}
          {renderSection("Earlier", ...[grouped.earlierItems])}

          {isFetchingNextPage && <Loader2 className="mx-auto my-3 animate-spin text-zinc-650" />}
        </InfiniteScrollContainer>
      )}
    </div>
  );
}
