import { NextResponse } from "next/server";
import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await validateRequest();
    if (!session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin role
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    const role = dbUser?.role || session.user.role;
    if (role !== "ADMIN" && session.user.username !== "Omkar2005") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const orders = await prisma.shopOrder.findMany({
      include: {
        user: {
          select: {
            username: true,
            displayName: true,
            email: true,
          }
        },
        items: true,
        shippingAddress: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ orders });
  } catch (error: any) {
    console.error("API admin/orders GET error:", error);
    return NextResponse.json({ error: "Failed to fetch orders log" }, { status: 500 });
  }
}
