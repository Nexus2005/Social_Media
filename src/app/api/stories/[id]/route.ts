import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user: loggedInUser } = await validateRequest();
    if (!loggedInUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: storyId } = await params;
    if (!storyId) {
      return NextResponse.json({ error: "Missing story id" }, { status: 400 });
    }

    const story = await prisma.story.findUnique({
      where: { id: storyId },
    });

    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    if (story.userId !== loggedInUser.id) {
      return NextResponse.json({ error: "Forbidden: You do not own this story" }, { status: 403 });
    }

    await prisma.story.delete({
      where: { id: storyId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete story error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
