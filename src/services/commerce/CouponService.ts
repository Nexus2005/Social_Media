import prisma from "@/lib/prisma";
import { CouponType } from "@/generated/client";

export class CouponService {
  /**
   * Validate coupon code eligibility
   */
  static async validate(code: string, cartTotal: number, sellerId?: string) {
    const coupon = await prisma.shopCoupon.findUnique({
      where: { code, active: true },
    });

    if (!coupon) {
      throw new Error("Coupon code is invalid or disabled");
    }

    const now = new Date();
    if (coupon.startAt && coupon.startAt > now) {
      throw new Error("Coupon code is not active yet");
    }
    if (coupon.endAt && coupon.endAt < now) {
      throw new Error("Coupon code has expired");
    }

    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      throw new Error("Coupon usage limit has been reached");
    }

    if (coupon.minOrderAmount && cartTotal < coupon.minOrderAmount) {
      throw new Error(`Minimum order amount of ${coupon.minOrderAmount} required for this coupon`);
    }

    // If sellerId coupon, check it matches the product vendor
    if (coupon.sellerId && sellerId && coupon.sellerId !== sellerId) {
      throw new Error("Coupon is not valid for items from this seller store");
    }

    return coupon;
  }

  static async list(sellerId?: string) {
    const where: any = {};
    if (sellerId) {
      where.sellerId = sellerId;
    }
    return prisma.shopCoupon.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  }

  static async create(data: {
    code: string;
    name: string;
    description?: string;
    type: CouponType;
    value: number;
    minOrderAmount?: number;
    maxDiscountAmount?: number;
    maxUses?: number;
    sellerId?: string | null;
    startAt?: Date | null;
    endAt?: Date | null;
    active?: boolean;
  }) {
    // Force uppercase code
    const code = data.code.toUpperCase().trim();

    const existing = await prisma.shopCoupon.findUnique({
      where: { code },
    });

    if (existing) {
      throw new Error("A coupon with this code already exists");
    }

    return prisma.shopCoupon.create({
      data: {
        code,
        name: data.name,
        description: data.description,
        type: data.type,
        value: data.value,
        minOrderAmount: data.minOrderAmount,
        maxDiscountAmount: data.maxDiscountAmount,
        maxUses: data.maxUses,
        sellerId: data.sellerId || null,
        startAt: data.startAt,
        endAt: data.endAt,
        active: data.active ?? true,
      },
    });
  }

  static async update(
    id: string,
    data: {
      name?: string;
      description?: string;
      value?: number;
      minOrderAmount?: number;
      maxDiscountAmount?: number;
      maxUses?: number;
      startAt?: Date | null;
      endAt?: Date | null;
      active?: boolean;
    }
  ) {
    return prisma.shopCoupon.update({
      where: { id },
      data,
    });
  }

  static async delete(id: string) {
    return prisma.shopCoupon.delete({
      where: { id },
    });
  }

  static async incrementUsage(id: string) {
    return prisma.shopCoupon.update({
      where: { id },
      data: {
        usedCount: {
          increment: 1,
        },
      },
    });
  }
}
