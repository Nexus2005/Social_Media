import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateRequest } from "@/auth";

export async function GET() {
  try {
    const { user } = await validateRequest();
    if (!user?.id) {
      return NextResponse.json({ count: 0 });
    }

    const count = await prisma.shopWishlist.count({
      where: { userId: user.id }
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error("API /api/shop/wishlist/count GET error:", error);
    return NextResponse.json({ count: 0 });
  }
}
