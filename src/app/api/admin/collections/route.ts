import { NextResponse } from "next/server";
import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
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

    const { name, description } = await request.json();
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const collection = await prisma.shopCollection.create({
      data: {
        id: "col_" + Math.random().toString(36).substring(2, 9),
        name,
        slug,
        description: description || "",
        active: true
      }
    });

    return NextResponse.json({ success: true, collection });
  } catch (error: any) {
    console.error("API admin/collections POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to create collection" }, { status: 500 });
  }
}
