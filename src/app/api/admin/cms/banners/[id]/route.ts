import { NextResponse } from "next/server";
import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await validateRequest();
    if (!session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    const role = dbUser?.role || session.user.role;
    if (role !== "ADMIN" && session.user.username !== "Omkar2005") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const resolvedParams = await (params as any);
    const bannerId = resolvedParams.id;

    const { active, title, subtitle, imageUrl, ctaLink } = await request.json();
    
    const dataToUpdate: any = {};
    if (active !== undefined) dataToUpdate.active = active;
    if (title !== undefined) dataToUpdate.title = title;
    if (subtitle !== undefined) dataToUpdate.subtitle = subtitle;
    if (imageUrl !== undefined) dataToUpdate.imageUrl = imageUrl;
    if (ctaLink !== undefined) dataToUpdate.ctaLink = ctaLink;

    const updatedBanner = await prisma.shopBanner.update({
      where: { id: bannerId },
      data: dataToUpdate,
    });

    return NextResponse.json({ success: true, banner: updatedBanner });
  } catch (error: any) {
    console.error("API admin/cms/banners PATCH error:", error);
    return NextResponse.json({ error: error.message || "Failed to update banner" }, { status: 500 });
  }
}
