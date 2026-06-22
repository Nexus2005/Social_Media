import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { postId } = await params;
    if (!postId) {
      return NextResponse.json({ error: "Missing post ID" }, { status: 400 });
    }

    // Verify post ownership
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { userId: true },
    });

    if (!post) {
      return NextResponse.json({ error: "Reel not found" }, { status: 404 });
    }

    if (post.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden: Not the owner" }, { status: 403 });
    }

    // Fetch assignments with products and merchants
    const assignments = await prisma.productAssignment.findMany({
      where: { postId },
      include: {
        product: {
          include: {
            matches: {
              include: {
                merchant: true,
              },
            },
          },
        },
      },
      orderBy: [
        { featured: "desc" },
        { displayOrder: "asc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json(assignments);
  } catch (error: any) {
    console.error("Error fetching creator reel products:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
