/**
 * useRealtimeNotifications — React Hook for SSE Notification Stream
 *
 * Establishes an EventSource connection to /api/notifications/stream
 * and updates react-query cache in real-time when notifications arrive.
 *
 * Usage:
 *   useRealtimeNotifications();  // Call in a top-level layout or provider
 */

"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { NotificationsPage } from "@/lib/types";

interface SSEEvent {
  type: "notification" | "badge_update" | "connected" | "heartbeat";
  data: Record<string, unknown>;
}

export function useRealtimeNotifications() {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let isMounted = true;

    function connect() {
      if (!isMounted) return;

      // Close existing connection if any
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const es = new EventSource("/api/notifications/stream");
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          const parsed: SSEEvent = JSON.parse(event.data);

          if (parsed.type === "notification") {
            // Prepend the new notification to the react-query cache
            queryClient.setQueryData<{
              pages: NotificationsPage[];
              pageParams: unknown[];
            }>(["notifications"], (old) => {
              if (!old) return old;

              const newNotification = parsed.data as any;
              const firstPage = old.pages[0];
              if (!firstPage) return old;

              // Check for duplicate
              const exists = firstPage.notifications.some(
                (n) => n.id === newNotification.id,
              );
              if (exists) return old;

              return {
                ...old,
                pages: [
                  {
                    ...firstPage,
                    notifications: [
                      newNotification,
                      ...firstPage.notifications,
                    ],
                  },
                  ...old.pages.slice(1),
                ],
              };
            });
          }

          if (parsed.type === "badge_update") {
            const action = parsed.data.action as string;

            queryClient.setQueryData<{ unreadCount: number }>(
              ["unread-notification-count"],
              (old) => {
                if (!old) return { unreadCount: 1 };

                if (action === "increment") {
                  return { unreadCount: old.unreadCount + 1 };
                }
                if (action === "decrement") {
                  const count = (parsed.data.count as number) || 1;
                  return {
                    unreadCount: Math.max(0, old.unreadCount - count),
                  };
                }
                if (action === "reset") {
                  return { unreadCount: 0 };
                }

                return old;
              },
            );
          }
        } catch {
          // Ignore malformed events
        }
      };

      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;

        // Reconnect after 3 seconds
        if (isMounted) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3000);
        }
      };
    }

    connect();

    return () => {
      isMounted = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [queryClient]);
}
