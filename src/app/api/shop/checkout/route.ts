import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateRequest } from "@/auth";

export async function POST(request: Request) {
  try {
    const { user } = await validateRequest();
    if (!user?.id) {
      return NextResponse.json({ error: "Authentication required to checkout" }, { status: 401 });
    }

    const body = await request.json();
    const { cartId } = body;

    if (!cartId) {
      return NextResponse.json({ error: "Cart ID is required" }, { status: 400 });
    }

    const verification = await prisma.$transaction(async (tx) => {
      const cart = await tx.shopCart.findUnique({
        where: { id: cartId },
        include: {
          items: {
            where: { selected: true },
            include: {
              product: true,
              variant: true
            }
          }
        }
      });

      if (!cart) {
        throw new Error("Cart not found");
      }

      if (cart.items.length === 0) {
        throw new Error("No selected items in the cart to checkout");
      }

      // Check stock levels for all selected items
      for (const item of cart.items) {
        const liveVariant = item.variant;
        if (!liveVariant) {
          throw new Error(`Variant configuration missing for item: ${item.snapTitle}`);
        }

        if (liveVariant.stock < item.quantity) {
          throw new Error(`Insufficient stock for "${item.snapTitle}". Only ${liveVariant.stock} items left.`);
        }
      }

      // Verify shipping address exists
      const address = await tx.shopAddress.findFirst({
        where: { userId: user.id }
      });

      // Write Cart Audit Log
      await tx.shopCartAuditLog.create({
        data: {
          cartId,
          userId: user.id,
          action: "CHECKOUT",
          payload: { itemsCount: cart.items.length, hasAddress: !!address }
        }
      });

      return {
        success: true,
        itemsVerified: cart.items.length,
        hasAddress: !!address
      };
    });

    return NextResponse.json({ success: true, verification });
  } catch (error: any) {
    console.error("API /api/shop/checkout POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to proceed to checkout" }, { status: 400 });
  }
}
