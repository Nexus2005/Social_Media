import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
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

    // Verify if story exists
    const story = await prisma.story.findUnique({
      where: { id: storyId },
    });

    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }

    // Do not record views for creator
    if (story.userId === loggedInUser.id) {
      return NextResponse.json({ success: true, message: "Creator view ignored" });
    }

    // Upsert or create view
    await prisma.storyView.upsert({
      where: {
        storyId_userId: {
          storyId,
          userId: loggedInUser.id,
        },
      },
      update: {
        viewedAt: new Date(),
      },
      create: {
        storyId,
        userId: loggedInUser.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Record story view error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
