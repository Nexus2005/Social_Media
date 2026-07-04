/**
 * Cartly v3 — Shopping Lookup API
 *
 * GET /api/shopping-lookup?q=Nike+Air+Max
 *
 * Updated to return enriched marketplace data from v3 providers.
 */

import { NextRequest, NextResponse } from "next/server";
import { SearchManager } from "../../../lib/marketplace/searchManager";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const query = req.nextUrl.searchParams.get("q");

    if (!query) {
      return NextResponse.json({ error: "Missing search query parameter 'q'" }, { status: 400 });
    }

    console.log(`[Shopping Lookup] Searching marketplaces for: "${query}"`);
    const results = await SearchManager.search(query, 20);

    const products = results.map((item) => ({
      title: item.title,
      price: item.price,
      numericPrice: item.numericPrice,
      currency: item.currency,
      merchant: item.merchant,
      thumbnail: item.thumbnail,
      link: item.link,
      itemId: item.itemId,

      // v3 enrichments
      brand: item.brand,
      rating: item.rating,
      reviewCount: item.reviewCount,
      sellerName: item.sellerName,
      sellerRating: item.sellerRating,
      shippingCost: item.shippingCost,
      estimatedDelivery: item.estimatedDelivery,
      categoryPath: item.categoryPath,
      condition: item.condition,
      galleryImageUrls: item.galleryImageUrls,
      originalPrice: item.originalPrice,
      discountPercent: item.discountPercent,
    }));

    return NextResponse.json({ products, count: products.length });
  } catch (error: any) {
    console.error("Error in shopping lookup:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
