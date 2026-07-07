import prisma from "@/lib/prisma";
import { ShopSeller, UserRoleEnum } from "@/generated/client";
import { slugify } from "./ProductService";

export class SellerService {
  /**
   * Register a new seller store
   */
  static async register(
    userId: string,
    data: {
      storeName: string;
      description?: string;
      logoUrl?: string;
      bannerUrl?: string;
      payoutEmail?: string;
      kycData?: any;
    }
  ): Promise<ShopSeller> {
    const existingSeller = await prisma.shopSeller.findUnique({
      where: { userId },
    });

    if (existingSeller) {
      throw new Error("User is already registered as a seller");
    }

    const baseSlug = slugify(data.storeName);
    let slug = baseSlug;
    let count = 0;
    while (await prisma.shopSeller.findUnique({ where: { slug } })) {
      count++;
      slug = `${baseSlug}-${count}`;
    }

    return prisma.$transaction(async (tx) => {
      // Create seller profile
      const seller = await tx.shopSeller.create({
        data: {
          userId,
          storeName: data.storeName,
          slug,
          description: data.description,
          logoUrl: data.logoUrl,
          bannerUrl: data.bannerUrl,
          payoutEmail: data.payoutEmail,
          status: "PENDING",
          kycSubmitted: !!data.kycData,
          kycData: data.kycData ?? {},
        },
      });

      // Register / grant seller role in UserRole
      await tx.userRole.upsert({
        where: {
          userId_role: {
            userId,
            role: UserRoleEnum.SELLER,
          },
        },
        create: {
          userId,
          role: UserRoleEnum.SELLER,
        },
        update: {},
      });

      return seller;
    });
  }

  static async getById(id: string): Promise<ShopSeller | null> {
    return prisma.shopSeller.findUnique({
      where: { id },
    });
  }

  static async getByUserId(userId: string): Promise<ShopSeller | null> {
    return prisma.shopSeller.findUnique({
      where: { userId },
    });
  }

  static async getBySlug(slug: string): Promise<ShopSeller | null> {
    return prisma.shopSeller.findUnique({
      where: { slug },
    });
  }

  /**
   * Approve seller application
   */
  static async approve(id: string) {
    const seller = await prisma.shopSeller.findUnique({
      where: { id },
    });

    if (!seller) {
      throw new Error("Seller profile not found");
    }

    return prisma.shopSeller.update({
      where: { id },
      data: {
        status: "APPROVED",
        verified: true,
      },
    });
  }

  /**
   * Suspend seller store
   */
  static async suspend(id: string, reason: string) {
    const seller = await prisma.shopSeller.findUnique({
      where: { id },
    });

    if (!seller) {
      throw new Error("Seller profile not found");
    }

    return prisma.shopSeller.update({
      where: { id },
      data: {
        status: "SUSPENDED",
        description: seller.description ? `${seller.description}\n[Suspended. Reason: ${reason}]` : `[Suspended. Reason: ${reason}]`,
      },
    });
  }

  /**
   * Update store metadata
   */
  static async updateStore(
    id: string,
    data: {
      storeName?: string;
      description?: string;
      logoUrl?: string;
      bannerUrl?: string;
      payoutEmail?: string;
      kycData?: any;
    }
  ) {
    const updateData: any = { ...data };

    if (data.storeName) {
      const baseSlug = slugify(data.storeName);
      let slug = baseSlug;
      let count = 0;
      // Ensure unique slug if changing store name
      const current = await prisma.shopSeller.findUnique({ where: { id } });
      if (current && current.storeName !== data.storeName) {
        while (await prisma.shopSeller.findFirst({ where: { slug, id: { not: id } } })) {
          count++;
          slug = `${baseSlug}-${count}`;
        }
        updateData.slug = slug;
      }
    }

    return prisma.shopSeller.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Get public seller store preview (with published products, etc.)
   */
  static async getStorePreview(sellerId: string) {
    const seller = await prisma.shopSeller.findUnique({
      where: { id: sellerId },
    });

    if (!seller) {
      throw new Error("Seller store not found");
    }

    const products = await prisma.shopProduct.findMany({
      where: {
        sellerId,
        status: "PUBLISHED",
      },
      include: {
        images: {
          orderBy: { displayOrder: "asc" },
        },
        variants: true,
      },
      take: 12,
    });

    return {
      seller,
      products,
    };
  }
}
