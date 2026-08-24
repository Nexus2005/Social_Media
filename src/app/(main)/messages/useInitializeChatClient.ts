import kyInstance from "@/lib/ky";
import { useEffect, useState } from "react";
import type { StreamChat } from "stream-chat";
import { useSession } from "../SessionProvider";

export default function useInitializeChatClient() {
  const { user } = useSession();
  const [chatClient, setChatClient] = useState<StreamChat | null>(null);

  useEffect(() => {
    let cancelled = false;
    let client: StreamChat | null = null;

    const connect = async () => {
      try {
        // Defer connection work until the main thread is idle so the
        // initial page render and feed data are never blocked by chat setup
        if (typeof window !== "undefined" && "requestIdleCallback" in window) {
          await new Promise<void>((resolve) =>
            (window as any).requestIdleCallback(() => resolve(), { timeout: 3000 })
          );
        } else {
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
        if (cancelled) return;

        // Code-split the Stream SDK so it is not part of the shared bundle
        const { StreamChat } = await import("stream-chat");
        if (cancelled) return;

        client = StreamChat.getInstance(process.env.NEXT_PUBLIC_STREAM_KEY!);

        await client.connectUser(
          {
            id: user.id,
            username: user.username,
            name: user.displayName,
            image: user.avatarUrl || undefined,
          },
          async () => {
            try {
              const data = await kyInstance
                .get("/api/get-token", { timeout: 25000 })
                .json<{ token: string }>();
              return data.token;
            } catch (e) {
              console.error("Stream token provider failed:", e);
              return "";
            }
          }
        );

        if (!cancelled) {
          setChatClient(client);
        } else {
          client.disconnectUser().catch(() => {});
        }
      } catch (error) {
        console.error("Failed to connect user", error);
      }
    };

    connect();

    return () => {
      cancelled = true;
      setChatClient(null);
      if (client) {
        client
          .disconnectUser()
          .catch((error) => console.error("Failed to disconnect user", error));
      }
    };
  }, [user.id, user.username, user.displayName, user.avatarUrl]);

  return chatClient;
}
