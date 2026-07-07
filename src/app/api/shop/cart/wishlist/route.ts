import { NextResponse } from "next/server";
import { CartService } from "@/services/commerce/CartService";
import { mapDbCartToFrontendCart } from "@/features/shop/utils/mapCommerceCore";
import { validateRequest } from "@/auth";

export async function POST(request: Request) {
  try {
    const { user } = await validateRequest();
    if (!user?.id) {
      return NextResponse.json({ error: "Authentication required to use wishlist" }, { status: 401 });
    }

    const body = await request.json();
    const { cartId, itemIds } = body;

    if (!cartId || !itemIds || !Array.isArray(itemIds)) {
      return NextResponse.json({ error: "Cart ID and Item IDs array are required" }, { status: 400 });
    }

    await CartService.moveToWishlistBatch(user.id, cartId, itemIds);

    const dbCart = await CartService.getById(cartId);
    if (!dbCart) {
      return NextResponse.json({ error: "Cart not found" }, { status: 404 });
    }

    const totals = await CartService.calculateTotals(cartId);
    const cart = mapDbCartToFrontendCart(dbCart, totals);

    return NextResponse.json({ cart });
  } catch (error: any) {
    console.error("API /api/shop/cart/wishlist POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to move items to wishlist" }, { status: 500 });
  }
}
