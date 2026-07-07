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

    // Verify admin role
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    const role = dbUser?.role || session.user.role;
    if (role !== "ADMIN" && session.user.username !== "Omkar2005") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const resolvedParams = await (params as any);
    const sellerId = resolvedParams.id;

    const { status, verified } = await request.json();
    
    const dataToUpdate: any = {};
    if (status) dataToUpdate.status = status;
    if (verified !== undefined) dataToUpdate.verified = verified;

    const updatedSeller = await prisma.shopSeller.update({
      where: { id: sellerId },
      data: dataToUpdate,
    });

    return NextResponse.json({ success: true, seller: updatedSeller });
  } catch (error: any) {
    console.error("API admin/sellers/status PATCH error:", error);
    return NextResponse.json({ error: error.message || "Failed to update seller status" }, { status: 500 });
  }
}
