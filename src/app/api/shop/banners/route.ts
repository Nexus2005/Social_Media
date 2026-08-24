import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    let banners = await prisma.shopBanner.findMany({
      where: { active: true },
      orderBy: { order: "asc" }
    });

    if (banners.length === 0) {
      // Auto-seed default promo banners (matching HomeBanners)
      const defaultBanners = [
        {
          title: "Nike Store Collection",
          subtitle: "Explore premium sports gear and sneakers.",
          imageUrl: "/1.png",
          ctaText: "Shop Collection",
          ctaLink: "https://www.amazon.in/stores/page/ABA9E99C-FF6E-473E-9AAB-998B82236503",
          active: true,
          order: 1
        },
        {
          title: "JBL Premium Audio",
          subtitle: "Unleash professional sound quality.",
          imageUrl: "/2.png",
          ctaText: "Shop Collection",
          ctaLink: "https://www.amazon.in/stores/JBL/page/B17687EB-972F-4FED-AF3E-AD13D6BA2A89",
          active: true,
          order: 2
        },
        {
          title: "Apple Authorized Store",
          subtitle: "Direct access to official Apple products.",
          imageUrl: "/3.png",
          ctaText: "Shop Collection",
          ctaLink: "https://www.amazon.in/stores/Apple/page/88D59F86-9161-4804-A524-0A5B39CD714A",
          active: true,
          order: 3
        }
      ];

      // Single batch insert avoids N sequential round-trips and races
      await prisma.shopBanner.createMany({
        data: defaultBanners,
        skipDuplicates: true,
      });

      banners = await prisma.shopBanner.findMany({
        where: { active: true },
        orderBy: { order: "asc" }
      });
    }

    return NextResponse.json({ banners }, {
      headers: {
        // Banners are CMS content that rarely changes
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      },
    });
  } catch (error: any) {
    console.error("API shop/banners GET error:", error);
    return NextResponse.json({ error: "Failed to fetch banners" }, { status: 500 });
  }
}
