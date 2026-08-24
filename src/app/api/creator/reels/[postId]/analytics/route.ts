import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { ProductEventType } from "@/generated/client";

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

    // Get all assignments for this reel
    const assignments = await prisma.productAssignment.findMany({
      where: { postId },
      select: { id: true, productId: true },
    });

    const assignmentIds = assignments.map((a) => a.id);

    // Fetch and aggregate events from ProductEvent table
    const events = await prisma.productEvent.groupBy({
      by: ["assignmentId", "eventType"],
      where: {
        assignmentId: { in: assignmentIds },
      },
      _count: {
        id: true,
      },
    });

    // Initialize stats
    const productStats: Record<string, {
      views: number;
      opens: number;
      productClicks: number;
      retailerClicks: number;
      saves: number;
      productCtr: number;
      retailerCtr: number;
    }> = {};

    assignmentIds.forEach((id) => {
      productStats[id] = {
        views: 0,
        opens: 0,
        productClicks: 0,
        retailerClicks: 0,
        saves: 0,
        productCtr: 0,
        retailerCtr: 0,
      };
    });

    let totalViews = 0;
    let totalOpens = 0;
    let totalProductClicks = 0;
    let totalRetailerClicks = 0;
    let totalSaves = 0;

    // Populating counts
    events.forEach((group) => {
      const asgId = group.assignmentId;
      if (!asgId || !productStats[asgId]) return;

      const count = group._count.id;
      const type = group.eventType;

      if (type === ProductEventType.VIEW) {
        productStats[asgId].views += count;
        totalViews += count;
      } else if (type === ProductEventType.DRAWER_OPEN) {
        productStats[asgId].opens += count;
        totalOpens += count;
      } else if (type === ProductEventType.PRODUCT_CLICK) {
        productStats[asgId].productClicks += count;
        totalProductClicks += count;
      } else if (type === ProductEventType.RETAILER_CLICK) {
        productStats[asgId].retailerClicks += count;
        totalRetailerClicks += count;
      } else if (type === ProductEventType.SAVE) {
        productStats[asgId].saves += count;
        totalSaves += count;
      }
    });

    // Calculate CTRs (CTR = Clicks / Views)
    Object.keys(productStats).forEach((asgId) => {
      const stats = productStats[asgId];
      if (stats.views > 0) {
        stats.productCtr = stats.productClicks / stats.views;
        stats.retailerCtr = stats.retailerClicks / stats.views;
      }
    });

    const reelStats = {
      views: totalViews,
      opens: totalOpens,
      productClicks: totalProductClicks,
      retailerClicks: totalRetailerClicks,
      saves: totalSaves,
      productCtr: totalViews > 0 ? totalProductClicks / totalViews : 0,
      retailerCtr: totalViews > 0 ? totalRetailerClicks / totalViews : 0,
    };

    return NextResponse.json({
      reelStats,
      productStats,
    });
  } catch (error: any) {
    console.error("Error in creator reel analytics API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
