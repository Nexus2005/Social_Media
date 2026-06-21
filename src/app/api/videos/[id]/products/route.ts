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

    const products = await prisma.detectedProduct.findMany({
      where: {
        postId: id,
        ...(showAll ? {} : { confidence: { gte: 0.80 } }),
      },
      include: {
        matches: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Format matches flat list or keep grouped
    const matches = products.flatMap((p) => p.matches);

    return NextResponse.json({
      products: products.map((p) => ({
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
      })),
      matches: matches.map((m) => ({
        id: m.id,
        detectedProductId: m.detectedProductId,
        title: m.title,
        price: m.price,
        currency: m.currency,
        sourceStore: m.sourceStore,
        productUrl: m.productUrl,
        affiliateUrl: m.affiliateUrl,
        imageUrl: m.imageUrl,
        clickCount: m.clickCount,
        createdAt: m.createdAt,
      })),
    });
  } catch (error: any) {
    console.error("Failed to fetch products:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
