import { NextResponse } from "next/server";
import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { ShopOrderStatus } from "@/generated/client";

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
    const orderId = resolvedParams.id;

    const body = await request.json();
    const { status, trackingNumber, courier, estimatedDeliveryAt } = body;

    const dataToUpdate: any = {};
    if (status && Object.values(ShopOrderStatus).includes(status)) {
      dataToUpdate.status = status as ShopOrderStatus;
      if (status === "DELIVERED") {
        dataToUpdate.deliveredAt = new Date();
      } else if (status === "CANCELLED") {
        dataToUpdate.cancelledAt = new Date();
      }
    }
    if (trackingNumber !== undefined) dataToUpdate.trackingNumber = trackingNumber;
    if (courier !== undefined) dataToUpdate.courier = courier;
    if (estimatedDeliveryAt !== undefined) dataToUpdate.estimatedDeliveryAt = estimatedDeliveryAt ? new Date(estimatedDeliveryAt) : null;

    const updatedOrder = await prisma.shopOrder.update({
      where: { id: orderId },
      data: dataToUpdate,
    });

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error: any) {
    console.error("API admin/orders PATCH error:", error);
    return NextResponse.json({ error: error.message || "Failed to update order details" }, { status: 500 });
  }
}
