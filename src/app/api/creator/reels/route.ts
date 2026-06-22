import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user's video posts
    const reels = await prisma.post.findMany({
      where: {
        userId: user.id,
        attachments: {
          some: {
            mediaType: "VIDEO",
          },
        },
      },
      include: {
        attachments: {
          where: {
            mediaType: "VIDEO",
          },
        },
        videoJob: true,
        assignments: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const result = reels.map((reel) => {
      const pendingCount = reel.assignments.filter((a) => a.status === "PENDING_REVIEW").length;
      const publishedCount = reel.assignments.filter((a) => a.status === "PUBLISHED").length;
      const hiddenCount = reel.assignments.filter((a) => a.status === "HIDDEN").length;

      return {
        id: reel.id,
        caption: reel.content,
        createdAt: reel.createdAt,
        videoUrl: reel.attachments[0]?.url || "",
        status: (reel.videoJob?.status || "none").toUpperCase(),
        pendingCount,
        publishedCount,
        hiddenCount,
        totalProducts: reel.assignments.length,
      };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in creator reels API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
