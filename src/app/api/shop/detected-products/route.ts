import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Product } from "@/features/shop/types";

export async function GET(req: NextRequest) {
  try {
    // Retrieve latest verified or high confidence detected products
    const dbProducts = await (prisma.detectedProduct as any).findMany({
      where: {
        confidence: { gte: 0.35 },
      },
      include: {
        matches: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const products: Product[] = dbProducts.map((p: any) => {
      const match = p.matches?.[0];
      const price = match?.price ? parseFloat(match.price) : 59.99;
      
      return {
        id: p.id,
        slug: p.id, // using ID as slug for detected products
        title: match?.title || p.label || "Detected Apparel",
        brand: match?.matchBrand || "Detected In Spot",
        description: p.label || "Shoppable item detected in Cartly video.",
        images: [p.cropImageUrl || p.thumbnailUrl || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80"],
        price: price,
        compareAtPrice: price * 1.25,
        source: "custom",
        options: [],
        variants: [
          {
            id: match?.id || p.id,
            title: "Standard",
            price: price,
            inventoryQuantity: 5,
            options: {},
          }
        ],
        rating: 4.8,
        freeDelivery: true,
      };
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error("Failed to fetch shop detected products:", error);
    return NextResponse.json({ products: [] });
  }
}
