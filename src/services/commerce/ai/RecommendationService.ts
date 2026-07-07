import prisma from "@/lib/prisma";

export class RecommendationService {
  /**
   * Get personalized recommendations for a user.
   * Simple collaborative filtering stub: fall back to top trending/popular products.
   */
  static async getRecommendedProducts(userId?: string, limit = 6) {
    if (!userId) {
      return this.getTrendingProducts(limit);
    }

    // Collaborative/similarity logic:
    // 1. Find categories the user has previously bought or viewed
    const userPurchasedCategories = await prisma.shopOrderItem.findMany({
      where: {
        order: {
          userId,
          status: "DELIVERED",
        },
      },
      select: {
        product: {
          select: {
            categoryId: true,
          },
        },
      },
    });

    const categoryIds = userPurchasedCategories
      .map((item) => item.product?.categoryId)
      .filter(Boolean) as string[];

    if (categoryIds.length === 0) {
      // Fallback to trending
      return this.getTrendingProducts(limit);
    }

    // 2. Fetch products in those categories, excluding ones already bought
    const purchasedProductIds = await prisma.shopOrderItem.findMany({
      where: {
        order: {
          userId,
        },
      },
      select: {
        productId: true,
      },
    }).then((items) => items.map((i) => i.productId));

    const recommended = await prisma.shopProduct.findMany({
      where: {
        status: "PUBLISHED",
        categoryId: { in: categoryIds },
        id: { notIn: purchasedProductIds },
      },
      include: {
        images: {
          orderBy: { displayOrder: "asc" },
        },
        variants: true,
      },
      orderBy: [
        { salesCount: "desc" },
        { viewCount: "desc" },
      ],
      take: limit,
    });

    // Fill up with trending if not enough recommendations
    if (recommended.length < limit) {
      const trending = await this.getTrendingProducts(limit - recommended.length, [
        ...purchasedProductIds,
        ...recommended.map((r) => r.id),
      ]);
      return [...recommended, ...trending];
    }

    return recommended;
  }

  /**
   * Get trending products based on views and sales count
   */
  static async getTrendingProducts(limit = 6, excludeIds: string[] = []) {
    return prisma.shopProduct.findMany({
      where: {
        status: "PUBLISHED",
        id: { notIn: excludeIds },
      },
      include: {
        images: {
          orderBy: { displayOrder: "asc" },
        },
        variants: true,
      },
      orderBy: [
        { salesCount: "desc" },
        { viewCount: "desc" },
      ],
      take: limit,
    });
  }
}
