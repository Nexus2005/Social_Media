import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { productId } = await params;
    const body = await req.json();
    const { action, matchId } = body;

    // Verify creator owns the product
    const product = await prisma.detectedProduct.findUnique({
      where: { id: productId },
      select: { creatorId: true, label: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (product.creatorId && product.creatorId !== user.id) {
      return NextResponse.json({ error: "Forbidden: Not the owner" }, { status: 403 });
    }

    // --- ACTION: CREATE RETAILER LINK ---
    if (action === "create") {
      const { sourceStore, price, currency, productUrl, affiliateUrl, directUrl, deliveryText, availability, trackingCode } = body;

      if (!sourceStore || !price || !productUrl) {
        return NextResponse.json({ error: "Missing required fields (sourceStore, price, productUrl)" }, { status: 400 });
      }

      // Find or create Merchant
      let merchant = await prisma.merchant.findUnique({
        where: { name: sourceStore.trim() },
      });
      if (!merchant) {
        merchant = await prisma.merchant.create({
          data: { name: sourceStore.trim() },
        });
      }

      const match = await prisma.shoppingMatch.create({
        data: {
          detectedProductId: productId,
          title: product.label,
          price,
          currency: currency || "INR",
          sourceStore: sourceStore.trim(),
          productUrl,
          directUrl: directUrl || productUrl,
          affiliateUrl: affiliateUrl || null,
          deliveryText: deliveryText || null,
          availability: availability || "IN_STOCK",
          trackingCode: trackingCode || null,
          retailerSource: "MANUAL",
          merchantId: merchant.id,
        },
        include: {
          merchant: true,
        },
      });

      return NextResponse.json({ success: true, match });
    }

    // --- ACTION: UPDATE RETAILER LINK ---
    if (action === "update") {
      if (!matchId) {
        return NextResponse.json({ error: "Missing matchId" }, { status: 400 });
      }

      const { price, currency, productUrl, affiliateUrl, directUrl, deliveryText, availability, trackingCode } = body;

      const match = await prisma.shoppingMatch.update({
        where: { id: matchId },
        data: {
          price: price !== undefined ? price : undefined,
          currency: currency !== undefined ? currency : undefined,
          productUrl: productUrl !== undefined ? productUrl : undefined,
          directUrl: directUrl !== undefined ? directUrl : undefined,
          affiliateUrl: affiliateUrl !== undefined ? affiliateUrl : undefined,
          deliveryText: deliveryText !== undefined ? deliveryText : undefined,
          availability: availability !== undefined ? availability : undefined,
          trackingCode: trackingCode !== undefined ? trackingCode : undefined,
          retailerSource: "CREATOR_MATCH",
        },
        include: {
          merchant: true,
        },
      });

      return NextResponse.json({ success: true, match });
    }

    // --- ACTION: DELETE RETAILER LINK ---
    if (action === "delete") {
      if (!matchId) {
        return NextResponse.json({ error: "Missing matchId" }, { status: 400 });
      }

      await prisma.shoppingMatch.delete({
        where: { id: matchId },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Error in retailers API route:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
