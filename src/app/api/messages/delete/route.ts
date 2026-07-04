import { validateRequest } from "@/auth";
import streamServerClient from "@/lib/stream";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messageId } = await req.json();
    if (!messageId) {
      return NextResponse.json({ error: "messageId is required" }, { status: 400 });
    }

    // Retrieve message from streamServerClient to verify ownership
    const messageResponse = await streamServerClient.getMessage(messageId);
    if (!messageResponse || !messageResponse.message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    const messageUser = messageResponse.message.user;
    // Check if the current user is the owner of the message or is an admin
    if (messageUser?.id !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: You are not allowed to delete this message" }, { status: 403 });
    }

    // Delete message on Stream Chat server (hard delete = true)
    await streamServerClient.deleteMessage(messageId, true);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in messaging delete POST API:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
