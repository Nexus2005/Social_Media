import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ProductService } from "@/services/commerce/ProductService";
import { mapDbProductToFrontendProduct } from "@/features/shop/utils/mapCommerceCore";

export async function GET() {
  try {
    let deals = await prisma.shopDeal.findMany({
      where: { active: true },
      include: {
        product: {
          include: {
            images: {
              orderBy: { displayOrder: "asc" },
            },
            variants: {
              include: {
                attributes: true,
              },
            },
            brand: true,
            category: true,
          },
        },
      },
    });

    if (deals.length === 0) {
      // Auto-seed default deals matching reference specifications
      const now = new Date();
      const fiveHoursLater = new Date(now.getTime() + 5.5 * 60 * 60 * 1000); // 5h 30m countdown
      
      const defaultDeals = [
        { productId: "prod_boat_airdopes", originalPrice: 2999, dealPrice: 1699, soldCount: 12400, totalCount: 20000, startAt: now, endAt: fiveHoursLater },
        { productId: "prod_noise_watch", originalPrice: 3799, dealPrice: 2599, soldCount: 8700, totalCount: 15000, startAt: now, endAt: fiveHoursLater },
        { productId: "prod_philips_bulb", originalPrice: 1499, dealPrice: 1099, soldCount: 6200, totalCount: 10000, startAt: now, endAt: fiveHoursLater },
        { productId: "prod_safari_backpack", originalPrice: 1799, dealPrice: 1399, soldCount: 5900, totalCount: 8000, startAt: now, endAt: fiveHoursLater },
        { productId: "prod_nespresso_coffee", originalPrice: 17999, dealPrice: 10999, soldCount: 3800, totalCount: 5000, startAt: now, endAt: fiveHoursLater },
        { productId: "prod_wakefit_pillow", originalPrice: 1199, dealPrice: 849, soldCount: 3100, totalCount: 6000, startAt: now, endAt: fiveHoursLater }
      ];

      await prisma.shopDeal.createMany({
        data: defaultDeals
      });

      deals = await prisma.shopDeal.findMany({
        where: { active: true },
        include: {
          product: {
            include: {
              images: {
                orderBy: { displayOrder: "asc" },
              },
              variants: {
                include: {
                  attributes: true,
                },
              },
              brand: true,
              category: true,
            },
          },
        },
      });
    }

    const dealsWithProducts = deals.map(deal => {
      const mappedProduct = deal.product ? mapDbProductToFrontendProduct(deal.product) : null;
      return {
        ...deal,
        product: mappedProduct || {
          id: deal.productId,
          title: "Marketplace Special Deal",
          slug: deal.productId,
          price: deal.dealPrice,
          compareAtPrice: deal.originalPrice,
          images: [],
          variants: []
        }
      };
    });

    return NextResponse.json({ deals: dealsWithProducts });
  } catch (error: any) {
    console.error("API shop/deals GET error:", error);
    return NextResponse.json({ error: "Failed to fetch top deals" }, { status: 500 });
  }
}
