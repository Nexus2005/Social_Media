import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { mapDbProductToFrontendProduct } from "@/features/shop/utils/mapCommerceCore";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "4");

    // Fetch live products for recommendations
    const [liveProducts, creatorPicksDb] = await Promise.all([
      prisma.shopProduct.findMany({
        where: { status: "PUBLISHED" },
        take: 12,
        include: {
          images: { orderBy: { displayOrder: "asc" } },
          variants: true,
          brand: true,
          category: true
        }
      }),
      prisma.shopCreatorPick.findMany({
        where: { active: true },
        take: 6,
        include: {
          product: {
            include: {
              images: { orderBy: { displayOrder: "asc" } },
              variants: true,
              brand: true,
              category: true
            }
          }
        }
      })
    ]);

    const mappedProducts = liveProducts.map(p => mapDbProductToFrontendProduct(p));
    
    // Organise into distinct recommendation lists
    const frequentlyBought = mappedProducts.slice(0, 4);
    const recommended = mappedProducts.slice(4, 8);
    const recentlyViewed = mappedProducts.slice(8, 12);
    
    const creatorPicks = creatorPicksDb
      .filter(cp => cp.product !== null)
      .map(cp => mapDbProductToFrontendProduct(cp.product!));

    return NextResponse.json({
      frequentlyBought,
      recommended,
      recentlyViewed,
      creatorPicks
    });
  } catch (error) {
    console.error("API /api/shop/recommendations GET error:", error);
    return NextResponse.json({ error: "Failed to load product recommendations" }, { status: 500 });
  }
}
