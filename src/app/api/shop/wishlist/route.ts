import { NextResponse } from "next/server";
import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { ProductService } from "@/services/commerce/ProductService";
import { mapDbProductToFrontendProduct } from "@/features/shop/utils/mapCommerceCore";

export async function GET() {
  try {
    const session = await validateRequest();
    if (!session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbItems = await prisma.shopWishlist.findMany({
      where: { userId: session.user.id }
    });

    const productIds = dbItems.map(item => item.productId);
    if (productIds.length === 0) {
      return NextResponse.json({ wishlist: [] });
    }

    // Fetch exactly the wishlisted products instead of scanning the catalog
    const dbProducts = await ProductService.list({
      ids: productIds,
      status: "PUBLISHED",
      limit: productIds.length,
    });

    const wishlistedProducts = dbProducts.items.map(mapDbProductToFrontendProduct);

    return NextResponse.json({ wishlist: wishlistedProducts });
  } catch (error: any) {
    console.error("API shop/wishlist GET error:", error);
    return NextResponse.json({ error: "Failed to fetch wishlist" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await validateRequest();
    if (!session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { productId } = await request.json();
    if (!productId) {
      return NextResponse.json({ error: "Product ID required" }, { status: 400 });
    }

    // Insert or ignore if duplicate exists
    await prisma.shopWishlist.upsert({
      where: {
        userId_productId: {
          userId: session.user.id,
          productId
        }
      },
      update: {},
      create: {
        userId: session.user.id,
        productId
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("API shop/wishlist POST error:", error);
    return NextResponse.json({ error: "Failed to add to wishlist" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await validateRequest();
    if (!session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json({ error: "Product ID required" }, { status: 400 });
    }

    await prisma.shopWishlist.deleteMany({
      where: {
        userId: session.user.id,
        productId
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("API shop/wishlist DELETE error:", error);
    return NextResponse.json({ error: "Failed to remove from wishlist" }, { status: 500 });
  }
}
