/**
 * Realtime Provider Abstraction
 *
 * Current implementation: Server-Sent Events (SSE)
 * Future: swap to WebSocket, Pusher, Ably without rewriting notification system
 *
 * Usage:
 *   import { realtime } from "@/lib/realtime";
 *   realtime.publish(userId, { type: "notification", data: {...} });
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RealtimeEvent {
  type: "notification" | "badge_update" | "heartbeat";
  data: Record<string, unknown>;
}

export interface RealtimeProvider {
  /** Register a new SSE client controller for a user */
  subscribe(userId: string, controller: ReadableStreamDefaultController): void;
  /** Remove a client controller when the connection closes */
  unsubscribe(userId: string, controller: ReadableStreamDefaultController): void;
  /** Push an event to all connected clients for a specific user */
  publish(userId: string, event: RealtimeEvent): void;
  /** Get count of connected clients for a user */
  getConnectionCount(userId: string): number;
}

// ─── SSE Provider (In-Process) ───────────────────────────────────────────────

class SSERealtimeProvider implements RealtimeProvider {
  private clients = new Map<string, Set<ReadableStreamDefaultController>>();

  subscribe(userId: string, controller: ReadableStreamDefaultController): void {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId)!.add(controller);
  }

  unsubscribe(
    userId: string,
    controller: ReadableStreamDefaultController,
  ): void {
    const userClients = this.clients.get(userId);
    if (userClients) {
      userClients.delete(controller);
      if (userClients.size === 0) {
        this.clients.delete(userId);
      }
    }
  }

  publish(userId: string, event: RealtimeEvent): void {
    const userClients = this.clients.get(userId);
    if (!userClients || userClients.size === 0) return;

    const payload = `data: ${JSON.stringify(event)}\n\n`;
    const encoder = new TextEncoder();
    const encoded = encoder.encode(payload);

    const deadControllers: ReadableStreamDefaultController[] = [];

    for (const controller of userClients) {
      try {
        controller.enqueue(encoded);
      } catch {
        // Client disconnected — mark for cleanup
        deadControllers.push(controller);
      }
    }

    // Clean up dead connections
    for (const dead of deadControllers) {
      userClients.delete(dead);
    }
    if (userClients.size === 0) {
      this.clients.delete(userId);
    }
  }

  getConnectionCount(userId: string): number {
    return this.clients.get(userId)?.size ?? 0;
  }
}

// ─── Singleton Export ────────────────────────────────────────────────────────

// Use globalThis to survive Next.js hot reloads in development
const globalForRealtime = globalThis as unknown as {
  __realtime?: RealtimeProvider;
};

export const realtime: RealtimeProvider =
  globalForRealtime.__realtime ?? new SSERealtimeProvider();

if (process.env.NODE_ENV !== "production") {
  globalForRealtime.__realtime = realtime;
}
