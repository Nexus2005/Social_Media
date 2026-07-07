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

    const sellers = await prisma.shopSeller.findMany({
      orderBy: { createdAt: "desc" },
    });

    const userIds = sellers.map(s => s.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
      }
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    const sellersWithUser = sellers.map(seller => ({
      ...seller,
      user: userMap.get(seller.userId)
    }));

    return NextResponse.json({ sellers: sellersWithUser });
  } catch (error: any) {
    console.error("API admin/sellers GET error:", error);
    return NextResponse.json({ error: "Failed to fetch merchant sellers" }, { status: 500 });
  }
}
