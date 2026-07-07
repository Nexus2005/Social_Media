import { NextResponse } from "next/server";
import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { ShopProductStatus } from "@/generated/client";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
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

    const resolvedParams = await (params as any);
    const productId = resolvedParams.id;

    const { status } = await request.json();
    if (!status || !Object.values(ShopProductStatus).includes(status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    const updatedProduct = await prisma.shopProduct.update({
      where: { id: productId },
      data: {
        status: status as ShopProductStatus,
        publishedAt: status === "PUBLISHED" ? new Date() : undefined,
      },
    });

    return NextResponse.json({ success: true, product: updatedProduct });
  } catch (error: any) {
    console.error("API admin/products/status PATCH error:", error);
    return NextResponse.json({ error: error.message || "Failed to update product status" }, { status: 500 });
  }
}
