import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    let sections = await prisma.shopHomepageSection.findMany({
      where: { visible: true, active: true },
      orderBy: { order: "asc" }
    });

    if (sections.length === 0) {
      // Auto-seed default homepage sections layout order
      const defaultSections = [
        { type: "HERO", title: "Hero Showcase Slider", order: 1, visible: true, active: true, priority: 1, columns: 1 },
        { type: "FEATURE_STRIP", title: "Trust and AI Features Strip", order: 2, visible: true, active: true, priority: 2, columns: 5 },
        { type: "CREATOR_PICKS", title: "Creator Picks", order: 3, visible: true, active: true, priority: 3, columns: 4 },
        { type: "DEALS", title: "Top Deals of the Day", order: 4, visible: true, active: true, priority: 4, columns: 6 },
        { type: "CATEGORIES", title: "Shop by Category", order: 5, visible: true, active: true, priority: 5, columns: 10 },
        { type: "PRODUCT_GRID", title: "Explore Marketplace", order: 6, visible: true, active: true, priority: 6, columns: 4 }
      ];

      await prisma.shopHomepageSection.createMany({
        data: defaultSections
      });

      sections = await prisma.shopHomepageSection.findMany({
        where: { visible: true, active: true },
        orderBy: { order: "asc" }
      });
    }

    return NextResponse.json({ sections });
  } catch (error: any) {
    console.error("API shop/cms/sections GET error:", error);
    return NextResponse.json({ error: "Failed to fetch homepage CMS sections" }, { status: 500 });
  }
}
