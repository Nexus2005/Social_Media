import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    // 1. Fetch public collections for this user
    const collections = await prisma.productCollection.findMany({
      where: {
        userId,
        isPublic: true,
      },
      include: {
        products: {
          include: {
            matches: {
              include: {
                merchant: true,
              },
            },
          },
        },
        items: {
          include: {
            product: {
              include: {
                matches: {
                  include: {
                    merchant: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [
        { featured: "desc" },
        { updatedAt: "desc" },
      ],
    });

    // 2. Fetch all products owned/curated by this creator (published or with published assignments)
    const products = await prisma.detectedProduct.findMany({
      where: {
        creatorId: userId,
      },
      include: {
        matches: {
          include: {
            merchant: true,
          },
        },
        assignments: {
          where: {
            status: "PUBLISHED",
          },
          select: {
            id: true,
            postId: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // 3. Fetch user details to display shop banner
    const profile = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        headerBannerUrl: true,
        followers: {
          select: {
            followerId: true,
          },
        },
        _count: {
          select: {
            followers: true,
          },
        },
      },
    });

    return NextResponse.json({
      profile,
      collections,
      products,
    });
  } catch (error: any) {
    console.error("Error fetching storefront:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
