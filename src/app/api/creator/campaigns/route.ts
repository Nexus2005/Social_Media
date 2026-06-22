import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { CampaignStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const campaigns = await prisma.campaign.findMany({
      where: { creatorId: user.id },
      include: {
        brand: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(campaigns);
  } catch (error: any) {
    console.error("Error fetching creator campaigns:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { brandName, campaignName, commissionRate, status } = body;

    if (!brandName || !campaignName) {
      return NextResponse.json(
        { error: "Missing brandName or campaignName" },
        { status: 400 }
      );
    }

    // 1. Find or create the brand
    let brand = await prisma.brand.findUnique({
      where: { name: brandName },
    });

    if (!brand) {
      brand = await prisma.brand.create({
        data: {
          name: brandName,
          logoUrl: `https://logo.clearbit.com/${brandName.toLowerCase().replace(/\s+/g, "")}.com` || null,
        },
      });
    }

    // 2. Create the campaign
    const rate = parseFloat(commissionRate) || 0;
    const campaign = await prisma.campaign.create({
      data: {
        name: campaignName,
        brandId: brand.id,
        creatorId: user.id,
        commissionRate: rate,
        commissionEarned: 0,
        status: (status as CampaignStatus) || CampaignStatus.ACTIVE,
      },
      include: {
        brand: true,
      },
    });

    return NextResponse.json(campaign);
  } catch (error: any) {
    console.error("Error creating creator campaign:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
