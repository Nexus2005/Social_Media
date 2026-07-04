/**
 * Cartly v3 — Product Details API (Lazy-Load)
 *
 * GET /api/videos/[id]/products/details?matchId=xxx
 *
 * Lazy-loads full product details from the marketplace provider.
 * Called only when user clicks on a specific product match.
 * Returns: full description, specifications, all gallery images, variants.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { SearchManager } from "@/lib/marketplace/searchManager";

export async function GET(
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

    // Find the shopping match
    const match = await prisma.shoppingMatch.findUnique({
      where: { id: matchId },
      include: {
        detectedProduct: {
          select: { postId: true },
        },
        variants: true,
      },
    });

    if (!match || match.detectedProduct.postId !== id) {
      return NextResponse.json(
        { error: "Match not found" },
        { status: 404 },
      );
    }

    // If we already have full details cached, return them
    if (match.matchDescription && match.specifications) {
      return NextResponse.json({
        matchId: match.id,
        title: match.title,
        cleanedTitle: match.cleanedTitle,
        price: match.price,
        currency: match.currency,
        sourceStore: match.sourceStore,
        productUrl: match.productUrl,
        imageUrl: match.imageUrl,
        brand: match.matchBrand,
        description: match.matchDescription,
        specifications: match.specifications,
        features: match.features,
        highlights: match.highlights,
        galleryImageUrls: match.galleryImageUrls,
        categoryPath: match.categoryPath,
        condition: match.condition,
        returnPolicy: match.returnPolicy,
        warranty: match.warranty,
        rating: match.rating,
        reviewCount: match.reviewCount,
        sellerName: match.sellerName,
        sellerRating: match.sellerRating,
        shippingCost: match.shippingCost,
        estimatedDelivery: match.estimatedDelivery,
        originalPrice: match.originalPrice,
        discountPercent: match.discountPercent,
        variants: match.variants?.map((v) => ({
          type: v.variantType,
          value: v.variantValue,
          price: v.price,
          imageUrl: v.imageUrl,
          availability: v.availability,
        })),
        cached: true,
      });
    }

    // Lazy-load full details from marketplace provider
    // Extract itemId from product URL if not stored
    const merchant = match.sourceStore;
    let itemId: string | null = null;

    // Try to extract item ID from URL
    const url = match.productUrl;
    if (merchant === "eBay") {
      const ebayMatch = url.match(/\/itm\/(\d+)/);
      if (ebayMatch) itemId = ebayMatch[1];
    } else if (merchant === "AliExpress") {
      const aliMatch = url.match(/\/item\/(\d+)/);
      if (aliMatch) itemId = aliMatch[1];
    }

    if (itemId) {
      const details = await SearchManager.getItemDetails(merchant, itemId);

      if (details) {
        // Persist the full details to avoid re-fetching
        await (prisma.shoppingMatch as any).update({
          where: { id: matchId },
          data: {
            matchDescription: details.description || undefined,
            specifications: details.specifications || undefined,
            features: details.features || [],
            highlights: details.highlights || [],
            matchBrand: details.brand || match.matchBrand,
            manufacturer: details.manufacturer || null,
            modelNumber: details.modelNumber || null,
            sku: details.sku || null,
            upc: details.upc || null,
            galleryImageUrls: details.galleryImageUrls || match.galleryImageUrls,
            returnPolicy: details.returnPolicy || null,
            warranty: details.warranty || null,
            categoryPath: details.categoryPath || match.categoryPath,
          },
        });

        // Persist variants if available
        if (details.variants && details.variants.length > 0) {
          // Clear existing variants
          await prisma.productVariant.deleteMany({
            where: { shoppingMatchId: matchId },
          });

          await prisma.productVariant.createMany({
            data: details.variants.map((v) => ({
              shoppingMatchId: matchId,
              variantType: v.type,
              variantValue: v.value,
              price: v.price || null,
              sku: v.sku || null,
              imageUrl: v.imageUrl || null,
              availability: v.availability || "in_stock",
            })),
          });
        }

        return NextResponse.json({
          matchId: match.id,
          title: match.title,
          cleanedTitle: match.cleanedTitle,
          price: match.price,
          currency: match.currency,
          sourceStore: match.sourceStore,
          productUrl: match.productUrl,
          imageUrl: match.imageUrl,
          brand: details.brand || match.matchBrand,
          description: details.description,
          specifications: details.specifications,
          features: details.features,
          highlights: details.highlights,
          galleryImageUrls: details.galleryImageUrls || match.galleryImageUrls,
          categoryPath: details.categoryPath || match.categoryPath,
          condition: details.condition || match.condition,
          returnPolicy: details.returnPolicy,
          warranty: details.warranty,
          rating: details.rating || match.rating,
          reviewCount: details.reviewCount || match.reviewCount,
          sellerName: details.sellerName || match.sellerName,
          sellerRating: details.sellerRating || match.sellerRating,
          shippingCost: details.shippingCost || match.shippingCost,
          estimatedDelivery: details.estimatedDelivery || match.estimatedDelivery,
          originalPrice: details.originalPrice || match.originalPrice,
          discountPercent: details.discountPercent || match.discountPercent,
          variants: details.variants?.map((v) => ({
            type: v.type,
            value: v.value,
            price: v.price,
            imageUrl: v.imageUrl,
          })),
          cached: false,
        });
      }
    }

    // Couldn't load details — return what we have
    return NextResponse.json({
      matchId: match.id,
      title: match.title,
      cleanedTitle: match.cleanedTitle,
      price: match.price,
      sourceStore: match.sourceStore,
      productUrl: match.productUrl,
      imageUrl: match.imageUrl,
      brand: match.matchBrand,
      galleryImageUrls: match.galleryImageUrls,
      rating: match.rating,
      reviewCount: match.reviewCount,
      cached: false,
      detailsUnavailable: true,
    });
  } catch (error: any) {
    console.error("Failed to fetch product details:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
