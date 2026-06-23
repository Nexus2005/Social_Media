import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pins = await prisma.chatPin.findMany({
      where: { userId: user.id },
      select: { channelId: true },
    });

    const archives = await prisma.chatArchive.findMany({
      where: { userId: user.id },
      select: { channelId: true },
    });

    const mutes = await prisma.chatMute.findMany({
      where: { userId: user.id },
      select: { channelId: true, expiresAt: true },
    });

    const settings = await prisma.conversationSettings.findMany({
      where: { userId: user.id },
      select: { channelId: true, wallpaper: true },
    });

    return NextResponse.json({
      pins: pins.map((p) => p.channelId),
      archives: archives.map((a) => a.channelId),
      mutes: mutes.map((m) => ({ channelId: m.channelId, expiresAt: m.expiresAt })),
      settings: settings.map((s) => ({ channelId: s.channelId, wallpaper: s.wallpaper })),
    });
  } catch (error) {
    console.error("Error in messaging preferences GET API:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, channelId, expiresAt, wallpaper } = await req.json();

    if (!channelId) {
      return NextResponse.json({ error: "channelId is required" }, { status: 400 });
    }

    if (action === "pin") {
      await prisma.chatPin.upsert({
        where: { userId_channelId: { userId: user.id, channelId } },
        create: { userId: user.id, channelId },
        update: {},
      });
    } else if (action === "unpin") {
      await prisma.chatPin.deleteMany({
        where: { userId: user.id, channelId },
      });
    } else if (action === "archive") {
      await prisma.chatArchive.upsert({
        where: { userId_channelId: { userId: user.id, channelId } },
        create: { userId: user.id, channelId },
        update: {},
      });
    } else if (action === "unarchive") {
      await prisma.chatArchive.deleteMany({
        where: { userId: user.id, channelId },
      });
    } else if (action === "mute") {
      await prisma.chatMute.upsert({
        where: { userId_channelId: { userId: user.id, channelId } },
        create: { userId: user.id, channelId, expiresAt: expiresAt ? new Date(expiresAt) : null },
        update: { expiresAt: expiresAt ? new Date(expiresAt) : null },
      });
    } else if (action === "unmute") {
      await prisma.chatMute.deleteMany({
        where: { userId: user.id, channelId },
      });
    } else if (action === "wallpaper") {
      await prisma.conversationSettings.upsert({
        where: { userId_channelId: { userId: user.id, channelId } },
        create: { userId: user.id, channelId, wallpaper },
        update: { wallpaper },
      });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in messaging preferences POST API:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
