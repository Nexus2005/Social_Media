import { NextRequest, NextResponse } from "next/server";
import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";

async function checkAdmin() {
  const { user } = await validateRequest();
  if (!user) return { error: "Unauthorized", status: 401 };

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  const role = dbUser?.role || user.role;
  if (role !== "ADMIN" && user.username !== "Omkar2005") {
    return { error: "Forbidden: Admins only", status: 403 };
  }

  return { user };
}

export async function GET() {
  const check = await checkAdmin();
  if ("error" in check) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  try {
    const banners = await prisma.shopBanner.findMany({
      orderBy: { order: "asc" }
    });
    return NextResponse.json({ banners });
  } catch (error) {
    console.error("GET admin/banners error:", error);
    return NextResponse.json({ error: "Failed to fetch banners" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const check = await checkAdmin();
  if ("error" in check) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  try {
    const body = await req.json();
    const { action, id, title, subtitle, imageUrl, ctaText, ctaLink, active, order } = body;

    if (action === "delete") {
      if (!id) return NextResponse.json({ error: "Banner ID is required" }, { status: 400 });
      await prisma.shopBanner.delete({ where: { id } });
      return NextResponse.json({ success: true, message: "Banner deleted successfully" });
    }

    if (id) {
      // Update
      const updated = await prisma.shopBanner.update({
        where: { id },
        data: {
          title: title || "",
          subtitle: subtitle || "",
          imageUrl: imageUrl || "/1.png",
          ctaText: ctaText || "Shop Collection",
          ctaLink: ctaLink || "#",
          active: active !== undefined ? active : true,
          order: typeof order === "number" ? order : 1
        }
      });
      return NextResponse.json({ success: true, banner: updated });
    } else {
      // Create
      const created = await prisma.shopBanner.create({
        data: {
          title: title || "",
          subtitle: subtitle || "",
          imageUrl: imageUrl || "/1.png",
          ctaText: ctaText || "Shop Collection",
          ctaLink: ctaLink || "#",
          active: active !== undefined ? active : true,
          order: typeof order === "number" ? order : 1
        }
      });
      return NextResponse.json({ success: true, banner: created });
    }
  } catch (error) {
    console.error("POST admin/banners error:", error);
    return NextResponse.json({ error: "Failed to process banner action" }, { status: 500 });
  }
}
