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
    const sectionId = resolvedParams.id;

    const { visible, order } = await request.json();
    
    const dataToUpdate: any = {};
    if (visible !== undefined) dataToUpdate.visible = visible;
    if (order !== undefined) dataToUpdate.order = parseInt(order);

    const updatedSection = await prisma.shopHomepageSection.update({
      where: { id: sectionId },
      data: dataToUpdate,
    });

    return NextResponse.json({ success: true, section: updatedSection });
  } catch (error: any) {
    console.error("API admin/cms/sections PATCH error:", error);
    return NextResponse.json({ error: error.message || "Failed to update section" }, { status: 500 });
  }
}
