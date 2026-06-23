/**
 * SSE Stream Endpoint — GET /api/notifications/stream
 *
 * Establishes a Server-Sent Events connection for real-time notification delivery.
 * Sends heartbeats every 30 seconds to keep the connection alive.
 */

import { validateRequest } from "@/auth";
import { realtime } from "@/lib/realtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HEARTBEAT_INTERVAL = 30_000; // 30 seconds

export async function GET() {
  const { user } = await validateRequest();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = user.id;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Register this client in the realtime provider
      realtime.subscribe(userId, controller);

      // Send initial connection confirmation
      try {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "connected", data: { userId } })}\n\n`,
          ),
        );
      } catch {
        // Controller already closed
      }

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "heartbeat", data: { ts: Date.now() } })}\n\n`,
            ),
          );
        } catch {
          // Connection closed — cleanup
          clearInterval(heartbeat);
          realtime.unsubscribe(userId, controller);
        }
      }, HEARTBEAT_INTERVAL);

      // Cleanup when the stream is cancelled (client disconnects)
      return () => {
        clearInterval(heartbeat);
        realtime.unsubscribe(userId, controller);
      };
    },
    cancel() {
      // Also called when client disconnects
      // The controller is cleaned up via the realtime provider's dead-client detection
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  });
}
