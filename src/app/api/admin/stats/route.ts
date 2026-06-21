import { NextRequest, NextResponse } from "next/server";
import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    const role = dbUser?.role || user.role;
    if (role !== "ADMIN" && user.username !== "Omkar2005") {
      return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
    }

    // 1. Worker Health
    const pendingCount = await prisma.videoProcessingJob.count({ where: { status: "pending" } });
    const processingCount = await prisma.videoProcessingJob.count({ where: { status: "processing" } });

    // Last log or job update to check worker activity
    const lastLog = await prisma.videoProcessingLog.findFirst({
      orderBy: { createdAt: "desc" },
    });

    const lastJob = await prisma.videoProcessingJob.findFirst({
      orderBy: { updatedAt: "desc" },
    });

    let lastActivityDate: Date | null = null;
    if (lastLog && lastJob) {
      lastActivityDate = lastLog.createdAt > lastJob.updatedAt ? lastLog.createdAt : lastJob.updatedAt;
    } else {
      lastActivityDate = lastLog?.createdAt || lastJob?.updatedAt || null;
    }

    let workerStatus = "offline";
    let lastActivityStr = "Never";

    if (lastActivityDate) {
      const diffMs = Date.now() - lastActivityDate.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      if (diffSecs < 180) {
        workerStatus = "online";
      }

      if (diffSecs < 60) {
        lastActivityStr = `${diffSecs}s ago`;
      } else if (diffSecs < 3600) {
        lastActivityStr = `${Math.floor(diffSecs / 60)}m ago`;
      } else {
        lastActivityStr = `${Math.floor(diffSecs / 3600)}h ago`;
      }
    }

    // If there is active processing, the worker is running
    if (processingCount > 0) {
      workerStatus = "online";
    }

    // 2. Job Stats
    const totalVideosCount = await prisma.post.count({
      where: {
        attachments: {
          some: { mediaType: "VIDEO" }
        }
      }
    });

    const completedCount = await prisma.videoProcessingJob.count({ where: { status: "completed" } });
    const failedCount = await prisma.videoProcessingJob.count({ where: { status: "failed" } });
    const noProductsCount = await prisma.videoProcessingJob.count({ where: { status: "no_products" } });
    const activeCount = pendingCount + processingCount;

    // 3. Clicks & Business Metrics
    const totalProducts = await prisma.detectedProduct.count();

    // Sum clicks
    const matches = await prisma.shoppingMatch.findMany({
      select: { clickCount: true, sourceStore: true }
    });

    const totalClicks = matches.reduce((acc, m) => acc + m.clickCount, 0);

    // Sum views of video posts
    const videoPostViews = await prisma.postView.count({
      where: {
        post: {
          attachments: {
            some: { mediaType: "VIDEO" }
          }
        }
      }
    });

    const ctr = videoPostViews > 0 ? parseFloat(((totalClicks / videoPostViews) * 100).toFixed(2)) : 0;

    // Group clicks by merchant
    const merchantClicksMap: Record<string, number> = {};
    matches.forEach(m => {
      const store = m.sourceStore || "Other";
      merchantClicksMap[store] = (merchantClicksMap[store] || 0) + m.clickCount;
    });

    const clicksByMerchant = Object.entries(merchantClicksMap).map(([merchant, count]) => ({
      merchant,
      count
    })).sort((a, b) => b.count - a.count);

    // 4. Categories Distribution
    const products = await prisma.detectedProduct.findMany({
      select: { category: true }
    });

    const categoryMap: Record<string, number> = {};
    products.forEach(p => {
      const cat = p.category || "Unknown";
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    });

    const totalProdsCount = products.length || 1;
    const categoriesDistribution = Object.entries(categoryMap).map(([category, count]) => ({
      category,
      percentage: parseFloat(((count / totalProdsCount) * 100).toFixed(1))
    })).sort((a, b) => b.percentage - a.percentage);

    // 5. Reels list
    const reels = await prisma.post.findMany({
      where: {
        attachments: {
          some: { mediaType: "VIDEO" }
        }
      },
      include: {
        user: {
          select: {
            username: true,
            displayName: true,
            avatarUrl: true
          }
        },
        videoJob: true,
        attachments: true,
        _count: {
          select: {
            detectedProducts: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return NextResponse.json({
      worker: {
        status: workerStatus,
        queueLength: pendingCount,
        jobsRunning: processingCount,
        lastActivity: lastActivityStr
      },
      stats: {
        totalReels: totalVideosCount,
        completed: completedCount,
        pending: pendingCount,
        processing: processingCount,
        failed: failedCount,
        noProducts: noProductsCount,
        unprocessed: totalVideosCount - (completedCount + failedCount + noProductsCount + activeCount)
      },
      business: {
        totalProducts,
        totalClicks,
        totalViews: videoPostViews,
        ctr,
        clicksByMerchant
      },
      categories: categoriesDistribution,
      reels: reels.map(r => ({
        id: r.id,
        creator: r.user,
        caption: r.content,
        thumbnail: r.attachments.find(a => a.mediaType === "VIDEO")?.url || null,
        status: r.videoJob?.status || "none",
        error: r.videoJob?.error || null,
        productsCount: r._count.detectedProducts,
        lastScan: r.videoJob?.completedAt || r.videoJob?.updatedAt || null
      }))
    });
  } catch (error: any) {
    console.error("Dashboard stats API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
