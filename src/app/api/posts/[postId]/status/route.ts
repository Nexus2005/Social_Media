import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateRequest } from "@/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { user } = await validateRequest();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Await params for Next.js 15 compliance
    const { postId } = await params;

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        aiStatus: true,
        detectedObjects: true,
        detectedProducts: {
          include: {
            matches: true,
          },
        },
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json({
      aiStatus: post.aiStatus,
      detectedObjects: post.detectedObjects,
      detectedProducts: post.detectedProducts,
    });
  } catch (error: any) {
    console.error("Error fetching post AI status:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
