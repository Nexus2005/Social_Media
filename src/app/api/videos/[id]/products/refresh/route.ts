/**
 * Cartly v3 — Product Refresh API (Volatile Data)
 *
 * POST /api/videos/[id]/products/refresh?matchId=xxx
 *
 * Refreshes volatile marketplace data (price, stock, shipping, seller rating)
 * for a specific shopping match. Called when cached data is stale (> 6 hours).
 * Does NOT re-search — only updates the existing match with latest data.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { SearchManager } from "@/lib/marketplace/searchManager";

const STALE_THRESHOLD_MS = 6 * 60 * 60 * 1000; // 6 hours

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const matchId = req.nextUrl.searchParams.get("matchId");

    if (!id || !matchId) {
      return NextResponse.json(
        { error: "Missing video id or matchId" },
        { status: 400 },
      );
    }

    const match = await prisma.shoppingMatch.findUnique({
      where: { id: matchId },
      include: {
        detectedProduct: {
          select: { postId: true },
        },
      },
    });

    if (!match || match.detectedProduct.postId !== id) {
      return NextResponse.json(
        { error: "Match not found" },
        { status: 404 },
      );
    }

    // Check if data is stale
    const cachedAt = match.cachedAt ? new Date(match.cachedAt).getTime() : 0;
    const isStale = Date.now() - cachedAt > STALE_THRESHOLD_MS;

    if (!isStale) {
      return NextResponse.json({
        refreshed: false,
        reason: "Data is still fresh",
        cachedAt: match.cachedAt,
        nextRefreshAt: new Date(cachedAt + STALE_THRESHOLD_MS),
      });
    }

    // Extract item ID and refresh from marketplace
    const merchant = match.sourceStore;
    let itemId: string | null = null;

    const url = match.productUrl;
    if (merchant === "eBay") {
      const ebayMatch = url.match(/\/itm\/(\d+)/);
      if (ebayMatch) itemId = ebayMatch[1];
    } else if (merchant === "AliExpress") {
      const aliMatch = url.match(/\/item\/(\d+)/);
      if (aliMatch) itemId = aliMatch[1];
    }

    if (!itemId) {
      return NextResponse.json({
        refreshed: false,
        reason: "Cannot extract item ID from product URL",
      });
    }

    const details = await SearchManager.getItemDetails(merchant, itemId);

    if (!details) {
      return NextResponse.json({
        refreshed: false,
        reason: "Marketplace API returned no data",
      });
    }

    // Update volatile fields
    const updated = await prisma.shoppingMatch.update({
      where: { id: matchId },
      data: {
        price: details.price || match.price,
        rating: details.rating ?? match.rating,
        reviewCount: details.reviewCount ?? match.reviewCount,
        sellerName: details.sellerName || match.sellerName,
        sellerRating: details.sellerRating ?? match.sellerRating,
        shippingCost: details.shippingCost || match.shippingCost,
        estimatedDelivery: details.estimatedDelivery || match.estimatedDelivery,
        stockAvailability: details.stockAvailability || match.stockAvailability,
        originalPrice: details.originalPrice || match.originalPrice,
        discountPercent: details.discountPercent ?? match.discountPercent,
        cachedAt: new Date(),
      },
    });

    // Record price history if price changed
    const currentPrice = parseFloat((details.price || "0").replace(/[^0-9.]/g, ""));
    if (currentPrice > 0) {
      await prisma.priceHistory.create({
        data: {
          shoppingMatchId: matchId,
          price: currentPrice,
        },
      });
    }

    return NextResponse.json({
      refreshed: true,
      matchId: updated.id,
      price: updated.price,
      rating: updated.rating,
      reviewCount: updated.reviewCount,
      shippingCost: updated.shippingCost,
      stockAvailability: updated.stockAvailability,
      cachedAt: updated.cachedAt,
      nextRefreshAt: new Date(Date.now() + STALE_THRESHOLD_MS),
    });
  } catch (error: any) {
    console.error("Failed to refresh product:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
