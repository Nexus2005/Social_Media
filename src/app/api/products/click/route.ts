import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const matchId = body.matchId;

    if (!matchId) {
      return NextResponse.json({ error: "Missing matchId" }, { status: 400 });
    }

    // Increment click count atomically
    const updatedMatch = await prisma.shoppingMatch.update({
      where: { id: matchId },
      data: {
        clickCount: {
          increment: 1,
        },
      },
    });

    // Return the appropriate link: affiliateUrl if configured, otherwise original productUrl
    const redirectUrl = updatedMatch.affiliateUrl || updatedMatch.productUrl;

    return NextResponse.json({
      success: true,
      redirectUrl,
    });
  } catch (error: any) {
    console.error("Failed to process product click:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
