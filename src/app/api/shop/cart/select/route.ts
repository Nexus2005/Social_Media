import { NextResponse } from "next/server";
import { CartService } from "@/services/commerce/CartService";
import { mapDbCartToFrontendCart } from "@/features/shop/utils/mapCommerceCore";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cartId, itemId, itemIds, selected } = body;

    if (!cartId) {
      return NextResponse.json({ error: "Cart ID is required" }, { status: 400 });
    }

    if (itemIds && Array.isArray(itemIds)) {
      await CartService.updateItemSelectionBatch(cartId, itemIds, !!selected);
    } else if (itemId) {
      await CartService.updateItemSelection(cartId, itemId, !!selected);
    } else {
      return NextResponse.json({ error: "Item ID or Item IDs are required" }, { status: 400 });
    }

    // Return updated cart recalculated
    const dbCart = await CartService.getById(cartId);
    if (!dbCart) {
      return NextResponse.json({ error: "Cart not found" }, { status: 404 });
    }

    const totals = await CartService.calculateTotals(cartId);
    const cart = mapDbCartToFrontendCart(dbCart, totals);

    return NextResponse.json({ cart });
  } catch (error: any) {
    console.error("API /api/shop/cart/select POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to update item selection" }, { status: 500 });
  }
}
