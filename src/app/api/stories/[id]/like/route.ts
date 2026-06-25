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

    // Check if the like already exists
    const existingLike = await prisma.storyLike.findUnique({
      where: {
        storyId_userId: {
          storyId,
          userId: loggedInUser.id,
        },
      },
    });

    let liked = false;

    if (existingLike) {
      // Remove like
      await prisma.storyLike.delete({
        where: {
          id: existingLike.id,
        },
      });
    } else {
      // Add like
      await prisma.storyLike.create({
        data: {
          storyId,
          userId: loggedInUser.id,
        },
      });
      liked = true;
    }

    return NextResponse.json({ success: true, liked });
  } catch (error) {
    console.error("Toggle story like error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
