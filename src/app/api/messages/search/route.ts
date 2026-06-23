import { validateRequest } from "@/auth";
import streamServerClient from "@/lib/stream";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    const channelId = searchParams.get("channelId");
    const filterType = searchParams.get("type"); // image, video, file, voice, link

    // Build channel filters - must ensure the user is a member of the channels being searched
    const channelFilters: any = {
      members: { $in: [user.id] },
    };
    if (channelId) {
      channelFilters["id"] = channelId;
    }

    // Build message filters for attachment types if specified
    const messageFilters: any = {};
    if (filterType === "image") {
      messageFilters["attachments.type"] = "image";
    } else if (filterType === "video") {
      messageFilters["attachments.type"] = "video";
    } else if (filterType === "file") {
      messageFilters["attachments.type"] = "file";
    } else if (filterType === "voice") {
      messageFilters["attachments.type"] = "audio"; // Stream audio/voice attachment type
    } else if (filterType === "link") {
      // Stream doesn't have a direct link filter, we search for http/https URLs in text
      messageFilters["text"] = { $text: "http" };
    }

    const searchResponse = await streamServerClient.search(
      channelFilters,
      query,
      {
        message_filter_conditions: Object.keys(messageFilters).length > 0 ? messageFilters : undefined,
        limit: 30,
      } as any
    );

    return NextResponse.json({
      messages: searchResponse.results.map((r) => r.message),
    });
  } catch (error) {
    console.error("Error in messaging search API:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
