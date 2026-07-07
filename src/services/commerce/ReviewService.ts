import prisma from "@/lib/prisma";
import { ReviewStatus } from "@/generated/client";

export class ReviewService {
  static async list(productId: string, status?: ReviewStatus) {
    const where: any = { productId };
    if (status) {
      where.status = status;
    } else {
      where.status = ReviewStatus.REVIEW_APPROVED; // default show approved only
    }

    return prisma.shopReview.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  static async listAll() {
    return prisma.shopReview.findMany({
      include: {
        product: true,
        user: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  static async create(data: {
    productId: string;
    userId: string;
    rating: number;
    title?: string;
    body?: string;
    images?: string[];
  }) {
    if (data.rating < 1 || data.rating > 5) {
      throw new Error("Rating must be between 1 and 5");
    }

    // Verify user bought the product (Optional verify check but nice to have in marketplace)
    const bought = await prisma.shopOrderItem.findFirst({
      where: {
        productId: data.productId,
        order: {
          userId: data.userId,
          status: "DELIVERED",
        },
      },
    });

    return prisma.shopReview.create({
      data: {
        productId: data.productId,
        userId: data.userId,
        rating: data.rating,
        title: data.title,
        body: data.body,
        images: data.images ?? [],
        status: ReviewStatus.REVIEW_PENDING,
      },
    });
  }

  static async approve(id: string, adminNote?: string) {
    return prisma.$transaction(async (tx) => {
      const review = await tx.shopReview.update({
        where: { id },
        data: {
          status: ReviewStatus.REVIEW_APPROVED,
          adminNote,
        },
      });

      // Re-calculate product/merchant rating
      await this.recalculateProductRating(review.productId, tx);

      return review;
    });
  }

  static async reject(id: string, adminNote?: string) {
    return prisma.shopReview.update({
      where: { id },
      data: {
        status: ReviewStatus.REVIEW_REJECTED,
        adminNote,
      },
    });
  }

  static async feature(id: string) {
    return prisma.shopReview.update({
      where: { id },
      data: {
        status: ReviewStatus.REVIEW_FEATURED,
      },
    });
  }

  static async markHelpful(id: string) {
    return prisma.shopReview.update({
      where: { id },
      data: {
        helpfulCount: {
          increment: 1,
        },
      },
    });
  }

  /**
   * Helper to recalculate ratings for products when a review is approved
   */
  private static async recalculateProductRating(productId: string, tx: any) {
    const reviews = await tx.shopReview.findMany({
      where: {
        productId,
        status: {
          in: [ReviewStatus.REVIEW_APPROVED, ReviewStatus.REVIEW_FEATURED],
        },
      },
      select: { rating: true },
    });

    if (reviews.length === 0) return;

    const avgRating = reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length;

    // Save average rating back to Product metaData or custom fields if any
    const product = await tx.shopProduct.findUnique({
      where: { id: productId },
      select: { metaData: true },
    });

    const metaData = (product?.metaData as Record<string, any>) ?? {};
    metaData.rating = parseFloat(avgRating.toFixed(2));
    metaData.reviewsCount = reviews.length;

    await tx.shopProduct.update({
      where: { id: productId },
      data: {
        metaData,
      },
    });
  }
}
