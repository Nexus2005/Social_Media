import prisma from "@/lib/prisma";
import { AnalyticsEventType } from "@/generated/client";

export interface TrackEventInput {
  eventType: AnalyticsEventType;
  productId?: string;
  categoryId?: string;
  sellerId?: string;
  userId?: string;
  sessionId?: string;
  metadata?: any;
  revenue?: number;
}

export class AnalyticsService {
  /**
   * Tracks a commerce event in the database
   */
  static async track(event: TrackEventInput) {
    try {
      // Increment counts on related models if applicable to avoid slow queries later
      if (event.eventType === AnalyticsEventType.PRODUCT_VIEW && event.productId) {
        // Fire and forget view count increment
        prisma.shopProduct
          .update({
            where: { id: event.productId },
            data: { viewCount: { increment: 1 } },
          })
          .catch((err) => console.error("Error incrementing view count:", err));
      }

      return await prisma.shopAnalyticsEvent.create({
        data: {
          eventType: event.eventType,
          productId: event.productId,
          categoryId: event.categoryId,
          sellerId: event.sellerId,
          userId: event.userId,
          sessionId: event.sessionId,
          metadata: event.metadata ?? {},
          revenue: event.revenue,
        },
      });
    } catch (error) {
      console.error("Failed to track analytics event:", error);
    }
  }

  /**
   * Get basic stats for a product
   */
  static async getProductStats(productId: string) {
    const views = await prisma.shopAnalyticsEvent.count({
      where: { productId, eventType: AnalyticsEventType.PRODUCT_VIEW },
    });

    const clicks = await prisma.shopAnalyticsEvent.count({
      where: { productId, eventType: AnalyticsEventType.PRODUCT_CLICK },
    });

    const cartAdds = await prisma.shopAnalyticsEvent.count({
      where: { productId, eventType: AnalyticsEventType.ADD_TO_CART },
    });

    const purchases = await prisma.shopAnalyticsEvent.count({
      where: { productId, eventType: AnalyticsEventType.PURCHASE },
    });

    const revenueResult = await prisma.shopAnalyticsEvent.aggregate({
      where: { productId, eventType: AnalyticsEventType.PURCHASE },
      _sum: {
        revenue: true,
      },
    });

    return {
      views,
      clicks,
      cartAdds,
      purchases,
      revenue: revenueResult._sum.revenue ?? 0,
      clickThroughRate: views > 0 ? (clicks / views) * 100 : 0,
      conversionRate: views > 0 ? (purchases / views) * 100 : 0,
    };
  }

  /**
   * Get dashboard stats for a seller
   */
  static async getSellerStats(sellerId: string) {
    // Total Revenue
    const revenueResult = await prisma.shopOrder.aggregate({
      where: { sellerId, status: "DELIVERED" },
      _sum: {
        total: true,
      },
    });

    // Total Orders Count
    const totalOrders = await prisma.shopOrder.count({
      where: { sellerId },
    });

    // Total Products Count
    const totalProducts = await prisma.shopProduct.count({
      where: { sellerId },
    });

    // Recent orders
    const recentOrders = await prisma.shopOrder.findMany({
      where: { sellerId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        user: {
          select: { displayName: true, username: true },
        },
      },
    });

    // Sales over time (group by day in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const salesHistory = await prisma.shopOrder.findMany({
      where: {
        sellerId,
        status: "DELIVERED",
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        total: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    // Simple group by date utility
    const salesByDate: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      salesByDate[d.toISOString().split("T")[0]] = 0;
    }

    for (const order of salesHistory) {
      const dateStr = order.createdAt.toISOString().split("T")[0];
      if (salesByDate[dateStr] !== undefined) {
        salesByDate[dateStr] += order.total;
      }
    }

    const chartData = Object.entries(salesByDate)
      .map(([date, amount]) => ({ date, amount }))
      .reverse();

    return {
      revenue: revenueResult._sum.total ?? 0,
      totalOrders,
      totalProducts,
      recentOrders,
      chartData,
    };
  }

  /**
   * Get system-wide platform dashboard stats
   */
  static async getPlatformStats() {
    const revenueResult = await prisma.shopOrder.aggregate({
      where: { status: "DELIVERED" },
      _sum: {
        total: true,
      },
    });

    const totalOrders = await prisma.shopOrder.count();
    const totalSellers = await prisma.shopSeller.count();
    const totalProducts = await prisma.shopProduct.count();

    const topSellers = await prisma.shopOrder.groupBy({
      by: ["sellerId"],
      where: { status: "DELIVERED" },
      _sum: {
        total: true,
      },
      orderBy: {
        _sum: {
          total: "desc",
        },
      },
      take: 5,
    });

    // Map seller IDs to names
    const sellerIds = topSellers.map((s) => s.sellerId).filter(Boolean) as string[];
    const sellers = await prisma.shopSeller.findMany({
      where: { id: { in: sellerIds } },
      select: { id: true, storeName: true },
    });

    const topSellersData = topSellers.map((s) => {
      const seller = sellers.find((sel) => sel.id === s.sellerId);
      return {
        storeName: seller?.storeName ?? "Platform",
        revenue: s._sum.total ?? 0,
      };
    });

    return {
      totalRevenue: revenueResult._sum.total ?? 0,
      totalOrders,
      totalSellers,
      totalProducts,
      topSellers: topSellersData,
    };
  }

  /**
   * Get funnel metrics (views -> clicks -> additions -> purchase conversions)
   */
  static async getConversionFunnel(sellerId?: string) {
    const where: any = {};
    if (sellerId) where.sellerId = sellerId;

    const views = await prisma.shopAnalyticsEvent.count({
      where: { ...where, eventType: AnalyticsEventType.PRODUCT_VIEW },
    });

    const clicks = await prisma.shopAnalyticsEvent.count({
      where: { ...where, eventType: AnalyticsEventType.PRODUCT_CLICK },
    });

    const cartAdds = await prisma.shopAnalyticsEvent.count({
      where: { ...where, eventType: AnalyticsEventType.ADD_TO_CART },
    });

    const purchases = await prisma.shopAnalyticsEvent.count({
      where: { ...where, eventType: AnalyticsEventType.PURCHASE },
    });

    return {
      funnel: [
        { stage: "Product Views", count: views, percentage: 100 },
        { stage: "Product Clicks", count: clicks, percentage: views > 0 ? (clicks / views) * 100 : 0 },
        { stage: "Added to Cart", count: cartAdds, percentage: views > 0 ? (cartAdds / views) * 100 : 0 },
        { stage: "Purchased", count: purchases, percentage: views > 0 ? (purchases / views) * 100 : 0 },
      ],
      conversionRates: {
        clickThroughRate: views > 0 ? (clicks / views) * 100 : 0,
        purchaseConversionRate: views > 0 ? (purchases / views) * 100 : 0,
        cartAbandonmentRate: cartAdds > 0 ? ((cartAdds - purchases) / cartAdds) * 100 : 0,
      },
    };
  }
}
