import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { mapDbProductToFrontendProduct } from "@/features/shop/utils/mapCommerceCore";

export async function GET() {
  try {
    let picks = await prisma.shopCreatorPick.findMany({
      where: { active: true },
      orderBy: { order: "asc" },
      include: {
        product: {
          include: {
            images: {
              orderBy: { displayOrder: "asc" },
            },
            variants: {
              include: {
                attributes: true,
              },
            },
            brand: true,
            category: true,
          },
        },
      },
    });

    if (picks.length === 0) {
      // Auto-seed default creator selections
      const defaultPicks = [
        { creatorId: "techburner", productId: "prod_sony_xm5", discountLabel: "17% OFF", order: 1 },
        { creatorId: "beerbiceps", productId: "prod_on_protein", discountLabel: "25% OFF", order: 2 },
        { creatorId: "komalpandeyofficial", productId: "prod_lancome_perfume", discountLabel: "25% OFF", order: 3 },
        { creatorId: "mrwhosetheboss", productId: "prod_iphone_15", discountLabel: "13% OFF", order: 4 },
        { creatorId: "theformaledit", productId: "prod_noise_watch", discountLabel: "29% OFF", order: 5 },
        { creatorId: "fit_tuber", productId: "prod_nike_pegasus", discountLabel: "23% OFF", order: 6 }
      ];

      await prisma.shopCreatorPick.createMany({
        data: defaultPicks
      });

      picks = await prisma.shopCreatorPick.findMany({
        where: { active: true },
        orderBy: { order: "asc" },
        include: {
          product: {
            include: {
              images: {
                orderBy: { displayOrder: "asc" },
              },
              variants: {
                include: {
                  attributes: true,
                },
              },
              brand: true,
              category: true,
            },
          },
        },
      });
    }

    // Creators metadata list matching reference mockups
    const creatorMeta: Record<string, { name: string; followers: string; avatar: string }> = {
      techburner: {
        name: "techburner",
        followers: "1.8M followers",
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80"
      },
      beerbiceps: {
        name: "beerbiceps",
        followers: "6.7M followers",
        avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&q=80"
      },
      komalpandeyofficial: {
        name: "komalpandeyofficial",
        followers: "3.2M followers",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80"
      },
      mrwhosetheboss: {
        name: "mrwhosetheboss",
        followers: "2.1M followers",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80"
      },
      theformaledit: {
        name: "theformaledit",
        followers: "1.2M followers",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&q=80"
      },
      fit_tuber: {
        name: "fit_tuber",
        followers: "2.3M followers",
        avatar: "https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=150&q=80"
      }
    };

    const picksWithData = picks.map(pick => {
      const mappedProduct = pick.product ? mapDbProductToFrontendProduct(pick.product) : null;
      const meta = creatorMeta[pick.creatorId] || {
        name: pick.creatorId,
        followers: "100K followers",
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80"
      };

      return {
        ...pick,
        creator: meta,
        product: mappedProduct || {
          id: pick.productId,
          title: "Creator Product Selection",
          slug: pick.productId,
          price: 2500,
          images: [],
          variants: []
        }
      };
    });

    return NextResponse.json({ picks: picksWithData });
  } catch (error: any) {
    console.error("API shop/creators GET error:", error);
    return NextResponse.json({ error: "Failed to fetch creator picks" }, { status: 500 });
  }
}
