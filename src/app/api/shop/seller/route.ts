import { NextResponse } from "next/server";
import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await validateRequest();
    if (!session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const seller = await prisma.shopSeller.findUnique({
      where: { userId: session.user.id }
    });

    return NextResponse.json({ seller });
  } catch (error: any) {
    console.error("API shop/seller GET error:", error);
    return NextResponse.json({ error: "Failed to fetch seller status" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await validateRequest();
    if (!session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { storeName, description, logoUrl, bannerUrl, kycData } = await request.json();
    if (!storeName) {
      return NextResponse.json({ error: "Store name required" }, { status: 400 });
    }

    const seller = await prisma.shopSeller.upsert({
      where: { userId: session.user.id },
      update: {
        storeName,
        description,
        logoUrl,
        bannerUrl,
        kycData: kycData || {},
        kycSubmitted: true
      },
      create: {
        userId: session.user.id,
        storeName,
        description,
        logoUrl,
        bannerUrl,
        kycData: kycData || {},
        kycSubmitted: true,
        status: "APPROVED", // Auto-approved for development/review speed
        verified: true
      }
    });

    return NextResponse.json({ seller });
  } catch (error: any) {
    console.error("API shop/seller POST error:", error);
    return NextResponse.json({ error: "Failed to register seller store" }, { status: 500 });
  }
}
