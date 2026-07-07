import prisma from "@/lib/prisma";

export class DealService {
  static async listActive() {
    const now = new Date();
    return prisma.shopDeal.findMany({
      where: {
        active: true,
        startAt: { lte: now },
        endAt: { gte: now },
      },
      include: {
        product: {
          include: {
            images: {
              orderBy: { displayOrder: "asc" },
            },
            variants: true,
          },
        },
      },
      orderBy: { startAt: "asc" },
    });
  }

  static async listAll() {
    return prisma.shopDeal.findMany({
      include: {
        product: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  static async create(data: {
    productId: string;
    originalPrice: number;
    dealPrice: number;
    totalCount: number;
    startAt: Date;
    endAt: Date;
    active?: boolean;
  }) {
    return prisma.shopDeal.create({
      data: {
        productId: data.productId,
        originalPrice: data.originalPrice,
        dealPrice: data.dealPrice,
        totalCount: data.totalCount,
        soldCount: 0,
        startAt: data.startAt,
        endAt: data.endAt,
        active: data.active ?? true,
      },
    });
  }

  static async update(
    id: string,
    data: {
      dealPrice?: number;
      totalCount?: number;
      soldCount?: number;
      startAt?: Date;
      endAt?: Date;
      active?: boolean;
    }
  ) {
    return prisma.shopDeal.update({
      where: { id },
      data,
    });
  }

  static async delete(id: string) {
    return prisma.shopDeal.delete({
      where: { id },
    });
  }
}
