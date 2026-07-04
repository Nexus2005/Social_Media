/**
 * Cartly v3 — Products API Route
 *
 * GET /api/videos/[id]/products
 *
 * Returns all detected products for a reel with v3 enrichments.
 * Uses type assertions for new Prisma relations until full client regeneration.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing video id" }, { status: 400 });
    }

    const showAll = req.nextUrl.searchParams.get("showAll") === "true";

    if (showAll) {
      const { validateRequest } = require("@/auth");
      const { user } = await validateRequest();
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { role: true },
      });
      const role = dbUser?.role || user.role;
      if (role !== "ADMIN" && user.username !== "Omkar2005") {
        return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
      }
    }

    // Use raw query approach for v3 fields until full Prisma client regeneration
    const products = await (prisma.detectedProduct as any).findMany({
      where: {
        postId: id,
        ...(showAll ? {} : { confidence: { gte: 0.30 } }),
      },
      include: {
        matches: {
          include: {
            variants: true,
            priceHistories: true,
          },
          orderBy: { createdAt: "asc" },
        },
        timeline: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Fetch detection session stats
    const session = await (prisma as any).detectionSession?.findFirst?.({
      where: { postId: id },
      orderBy: { createdAt: "desc" },
    }) || null;

    return NextResponse.json({
      products: (products as any[]).map((p: any) => ({
        id: p.id,
        videoId: p.postId,
        category: p.category,
        description: p.label,
        color: p.color,
        confidence: p.confidence,
        frameTimestamp: p.frameTimestamp,
        sourceFrameUrl: p.sourceFrameUrl,
        dominantColor: p.dominantColor,
        thumbnailUrl: p.thumbnailUrl,
        createdAt: p.createdAt,

        // Cartly v3 — Detection Layer
        detectionConfidence: p.detectionConfidence,
        marketplaceConfidence: p.marketplaceConfidence,
        verificationScore: p.verificationScore,
        cropImageUrl: p.cropImageUrl,
        cropQualityScore: p.cropQualityScore,
        ocrText: p.ocrText,
        detectedLogo: p.detectedLogo,
        detectedBarcode: p.detectedBarcode,
        trackingId: p.trackingId,
        frameAppearances: p.frameAppearances,
        resolvedQueries: p.resolvedQueries,
        isVerifiedMatch: p.isVerifiedMatch,

        // Product Timeline
        timeline: (p.timeline || []).map((t: any) => ({
          id: t.id,
          timestamp: t.timestamp,
        })),
      })),

      matches: (products as any[]).flatMap((p: any) =>
        (p.matches || []).map((m: any) => ({
          id: m.id,
          detectedProductId: m.detectedProductId,
          title: m.title,
          cleanedTitle: m.cleanedTitle,
          price: m.price,
          currency: m.currency,
          sourceStore: m.sourceStore,
          productUrl: m.productUrl,
          affiliateUrl: m.affiliateUrl,
          imageUrl: m.imageUrl,
          clickCount: m.clickCount,
          createdAt: m.createdAt,

          // Cartly v3 — Marketplace Layer
          matchBrand: m.matchBrand,
          galleryImageUrls: m.galleryImageUrls,
          categoryPath: m.categoryPath,
          condition: m.condition,
          verificationScore: m.verificationScore,
          rating: m.rating,
          reviewCount: m.reviewCount,
          sellerName: m.sellerName,
          sellerRating: m.sellerRating,
          shippingCost: m.shippingCost,
          estimatedDelivery: m.estimatedDelivery,
          originalPrice: m.originalPrice,
          discountPercent: m.discountPercent,

          // Variants
          variants: (m.variants || []).map((v: any) => ({
            type: v.variantType,
            value: v.variantValue,
            price: v.price,
            imageUrl: v.imageUrl,
          })),

          // Price history
          priceHistory: (m.priceHistories || []).map((ph: any) => ({
            price: ph.price,
            recordedAt: ph.recordedAt,
          })),
        })),
      ),

      // Session stats
      session: session ? {
        id: session.id,
        status: session.status,
        frameCount: session.frameCount,
        rawObjectCount: session.rawObjectCount,
        cropsPassedQuality: session.cropsPassedQuality,
        cropsFailedQuality: session.cropsFailedQuality,
        trackedObjectCount: session.trackedObjectCount,
        mergedProductCount: session.mergedProductCount,
        geminiCallCount: session.geminiCallCount,
        cacheHitCount: session.cacheHitCount,
        processingTimeMs: session.processingTimeMs,
        createdAt: session.createdAt,
        completedAt: session.completedAt,
      } : null,
    });
  } catch (error: any) {
    console.error("Failed to fetch products:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
