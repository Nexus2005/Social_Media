import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateRequest } from "@/auth";
import { ProductEventType } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const { user } = await validateRequest();
    const body = await req.json().catch(() => ({}));
    const { productId, assignmentId, eventType, metadata } = body;

    if (!productId || !eventType) {
      return NextResponse.json(
        { error: "Missing required fields: productId and eventType" },
        { status: 400 }
      );
    }

    // Verify valid eventType
    if (!Object.values(ProductEventType).includes(eventType)) {
      return NextResponse.json(
        { error: `Invalid eventType. Allowed: ${Object.values(ProductEventType).join(", ")}` },
        { status: 400 }
      );
    }

    // 1. Create the event record
    const event = await prisma.productEvent.create({
      data: {
        productId,
        assignmentId: assignmentId || null,
        userId: user?.id || null,
        eventType: eventType as ProductEventType,
        metadata: metadata || null,
      },
    });

    // 2. Safely update cached counter on the product (fast read optimization)
    // Run this asynchronously or inline. Inline update is fast and keeps read counts hot.
    try {
      const updateData: any = {};
      if (eventType === ProductEventType.VIEW) {
        updateData.viewsCount = { increment: 1 };
      } else if (eventType === ProductEventType.DRAWER_OPEN) {
        updateData.drawerOpensCount = { increment: 1 };
      } else if (eventType === ProductEventType.PRODUCT_CLICK) {
        updateData.productClicksCount = { increment: 1 };
      } else if (eventType === ProductEventType.RETAILER_CLICK) {
        updateData.retailerClicksCount = { increment: 1 };
      } else if (eventType === ProductEventType.SAVE) {
        updateData.wishlistSavesCount = { increment: 1 };
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.detectedProduct.update({
          where: { id: productId },
          data: updateData,
        });
      }
    } catch (countError) {
      console.warn("Failed to update cached analytics counters:", countError);
    }

    return NextResponse.json({ success: true, eventId: event.id });
  } catch (error: any) {
    console.error("Error logging product event:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
