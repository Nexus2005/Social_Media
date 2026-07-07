import { NextResponse } from "next/server";
import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { mapDbProductToFrontendProduct } from "@/features/shop/utils/mapCommerceCore";

export async function GET() {
  try {
    const session = await validateRequest();
    if (!session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin role in DB
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    const role = dbUser?.role || session.user.role;
    if (role !== "ADMIN" && session.user.username !== "Omkar2005") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Load all products (Drafts, Pending Review, Published, etc.) for administration
    const allDbProducts = await prisma.shopProduct.findMany({
      include: {
        images: {
          orderBy: { displayOrder: "asc" },
        },
        variants: {
          include: {
            attributes: true,
          },
        },
        category: true,
        brand: true,
        seller: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const products = allDbProducts.map(mapDbProductToFrontendProduct);

    return NextResponse.json({ products });
  } catch (error: any) {
    console.error("API admin/products GET error:", error);
    return NextResponse.json({ error: "Failed to fetch all products" }, { status: 500 });
  }
}
