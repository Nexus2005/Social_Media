import prisma from "@/lib/prisma";
import { Prisma } from "@/generated/client";

export class HomepageService {
  /**
   * Get homepage sections with filtering for device visibility
   */
  static async getSections(device?: "desktop" | "tablet" | "mobile" | "all") {
    const where: Prisma.ShopHomepageSectionWhereInput = {
      active: true,
      visible: true,
    };

    // Filter based on requested device
    if (device === "desktop") {
      where.desktopVisible = true;
    } else if (device === "tablet") {
      where.tabletVisible = true;
    } else if (device === "mobile") {
      where.mobileVisible = true;
    }

    return prisma.shopHomepageSection.findMany({
      where,
      orderBy: { order: "asc" },
    });
  }

  static async getSectionsAll() {
    return prisma.shopHomepageSection.findMany({
      orderBy: { order: "asc" },
    });
  }

  static async createSection(data: {
    type: string;
    title?: string;
    subtitle?: string;
    layout?: string;
    columns?: number;
    background?: string;
    icon?: string;
    cta?: string;
    priority?: number;
    desktopVisible?: boolean;
    tabletVisible?: boolean;
    mobileVisible?: boolean;
    active?: boolean;
    visible?: boolean;
    order?: number;
    configuration?: any;
    items?: any;
  }) {
    return prisma.shopHomepageSection.create({
      data: {
        ...data,
        configuration: data.configuration ?? {},
        items: data.items ?? {},
      },
    });
  }

  static async updateSection(id: string, data: any) {
    return prisma.shopHomepageSection.update({
      where: { id },
      data,
    });
  }

  /**
   * Reorder homepage sections in bulk
   */
  static async reorderSections(sectionIds: string[]) {
    return prisma.$transaction(
      sectionIds.map((id, index) =>
        prisma.shopHomepageSection.update({
          where: { id },
          data: { order: index },
        })
      )
    );
  }

  /**
   * Get shop banners with device filtering
   */
  static async getBanners(device?: "desktop" | "tablet" | "mobile") {
    const now = new Date();
    const where: Prisma.ShopBannerWhereInput = {
      active: true,
      OR: [
        { startAt: null },
        { startAt: { lte: now } },
      ],
      AND: [
        {
          OR: [
            { endAt: null },
            { endAt: { gte: now } },
          ],
        },
      ],
    };

    const banners = await prisma.shopBanner.findMany({
      where,
      orderBy: { order: "asc" },
    });

    // Map device-specific URLs if present
    return banners.map((banner) => {
      let url = banner.imageUrl;
      if (device === "mobile" && banner.mobileImageUrl) {
        url = banner.mobileImageUrl;
      } else if (device === "tablet" && banner.tabletImageUrl) {
        url = banner.tabletImageUrl;
      } else if (device === "desktop" && banner.desktopImageUrl) {
        url = banner.desktopImageUrl;
      }
      return {
        ...banner,
        imageUrl: url,
      };
    });
  }

  static async getBannersAll() {
    return prisma.shopBanner.findMany({
      orderBy: { order: "asc" },
    });
  }

  static async createBanner(data: {
    title: string;
    subtitle: string;
    imageUrl: string;
    desktopImageUrl?: string;
    mobileImageUrl?: string;
    tabletImageUrl?: string;
    ctaText: string;
    ctaLink: string;
    active?: boolean;
    startAt?: Date | null;
    endAt?: Date | null;
    order?: number;
  }) {
    return prisma.shopBanner.create({
      data,
    });
  }

  static async updateBanner(id: string, data: any) {
    return prisma.shopBanner.update({
      where: { id },
      data,
    });
  }

  static async deleteSection(id: string) {
    return prisma.shopHomepageSection.delete({
      where: { id },
    });
  }

  static async deleteBanner(id: string) {
    return prisma.shopBanner.delete({
      where: { id },
    });
  }
}
