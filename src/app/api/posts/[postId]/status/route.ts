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
        videoJob: true,
        detectedObjects: true,
        assignments: {
          where: {
            status: "PUBLISHED",
          },
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
          orderBy: {
            displayOrder: "asc",
          },
        },
        detectedProducts: {
          where: {
            confidence: {
              gte: 0.80,
            },
          },
          include: {
            matches: {
              include: {
                merchant: true,
              },
            },
          },
        },
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const aiStatus = (post.videoJob?.status || "pending").toUpperCase();

    const processingLog = await prisma.videoProcessingLog.findFirst({
      where: { videoId: postId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      aiStatus,
      detectedObjects: post.detectedObjects,
      assignments: (post as any).assignments || [],
      detectedProducts: post.detectedProducts,
      processingLog: processingLog ? {
        visionCalls: processingLog.visionCalls,
        openrouterCalls: processingLog.openrouterCalls,
        nvidiaCalls: processingLog.nvidiaCalls,
        serpapiCalls: processingLog.serpapiCalls,
        processingCost: processingLog.processingCost,
        processingTime: processingLog.processingTime,
        shoppingResultsCount: processingLog.shoppingResultsCount,
      } : null,
    });
  } catch (error: any) {
    console.error("Error fetching post AI status:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
