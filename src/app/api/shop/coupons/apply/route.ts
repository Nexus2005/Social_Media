import { NextResponse } from "next/server";
import { CartService } from "@/services/commerce/CartService";
import { mapDbCartToFrontendCart } from "@/features/shop/utils/mapCommerceCore";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cartId, code } = body;

    if (!cartId || !code) {
      return NextResponse.json({ error: "Cart ID and Coupon Code are required" }, { status: 400 });
    }

    await CartService.applyCoupon(cartId, code.toUpperCase().trim());

    const dbCart = await CartService.getById(cartId);
    if (!dbCart) {
      return NextResponse.json({ error: "Cart not found" }, { status: 404 });
    }

    const totals = await CartService.calculateTotals(cartId);
    const cart = mapDbCartToFrontendCart(dbCart, totals);

    return NextResponse.json({ cart, success: true });
  } catch (error: any) {
    console.error("API /api/shop/coupons/apply POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to apply coupon" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cartId = searchParams.get("cartId");

    if (!cartId) {
      return NextResponse.json({ error: "Cart ID is required" }, { status: 400 });
    }

    await CartService.removeCoupon(cartId);

    const dbCart = await CartService.getById(cartId);
    if (!dbCart) {
      return NextResponse.json({ error: "Cart not found" }, { status: 404 });
    }

    const totals = await CartService.calculateTotals(cartId);
    const cart = mapDbCartToFrontendCart(dbCart, totals);

    return NextResponse.json({ cart, success: true });
  } catch (error: any) {
    console.error("API /api/shop/coupons/apply DELETE error:", error);
    return NextResponse.json({ error: error.message || "Failed to remove coupon" }, { status: 500 });
  }
}
