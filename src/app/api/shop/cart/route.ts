import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { CartService } from "@/services/commerce/CartService";
import { mapDbCartToFrontendCart } from "@/features/shop/utils/mapCommerceCore";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cartId = searchParams.get("cartId");
    if (!cartId) {
      return NextResponse.json({ error: "Cart ID required" }, { status: 400 });
    }

    const [dbCart, totals] = await Promise.all([
      CartService.getById(cartId),
      CartService.calculateTotals(cartId),
    ]);
    if (!dbCart) {
      return NextResponse.json({ error: "Cart not found" }, { status: 404 });
    }
    const cart = mapDbCartToFrontendCart(dbCart, totals);

    return NextResponse.json({ cart });
  } catch (error: any) {
    console.error("API shop/cart GET error:", error);
    return NextResponse.json({ error: "Failed to fetch cart" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cartId, variantId, lineItemId, quantity, email, shippingAddress, shippingOption } = body;

    // Case 1: Create a new cart
    if (!cartId && !variantId && !lineItemId) {
      const tempSessionId = "session_" + Math.random().toString(36).substring(2, 15);
      const dbCart = await CartService.getOrCreate(undefined, tempSessionId);
      const totals = await CartService.calculateTotals(dbCart.id);
      const cart = mapDbCartToFrontendCart(dbCart, totals);
      return NextResponse.json({ cart });
    }

    // Case 2: Update item quantity if lineItemId is provided
    if (cartId && lineItemId) {
      await CartService.updateItem(cartId, lineItemId, quantity);
      const [dbCart, totals] = await Promise.all([
        CartService.getById(cartId),
        CartService.calculateTotals(cartId),
      ]);
      const cart = mapDbCartToFrontendCart(dbCart, totals);
      return NextResponse.json({ cart });
    }

    // Case 3: Update email & shipping details in response
    if (cartId && (email || shippingAddress || shippingOption)) {
      const [dbCart, totals] = await Promise.all([
        CartService.getById(cartId),
        CartService.calculateTotals(cartId),
      ]);
      if (!dbCart) {
        return NextResponse.json({ error: "Cart not found" }, { status: 404 });
      }
      const cart = mapDbCartToFrontendCart(dbCart, totals);
      
      // Attach in-memory values for client persistence
      if (email) cart.email = email;
      if (shippingAddress) cart.shippingAddress = shippingAddress;
      if (shippingOption) cart.shippingOption = shippingOption;

      return NextResponse.json({ cart });
    }

    // Case 4: Add item to existing cart
    if (cartId && variantId) {
      const variant = await prisma.shopProductVariant.findUnique({
        where: { id: variantId },
      });

      if (!variant) {
        return NextResponse.json({ error: "Product variant not found" }, { status: 404 });
      }

      await CartService.addItem(cartId, variant.productId, variantId, quantity || 1);

      const [dbCart, totals] = await Promise.all([
        CartService.getById(cartId),
        CartService.calculateTotals(cartId),
      ]);
      const cart = mapDbCartToFrontendCart(dbCart, totals);

      return NextResponse.json({ cart });
    }

    return NextResponse.json({ error: "Invalid request parameters" }, { status: 400 });
  } catch (error: any) {
    console.error("API shop/cart POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to execute cart operation" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { cartId, lineItemId, quantity } = body;

    if (!cartId || !lineItemId) {
      return NextResponse.json({ error: "cartId and lineItemId are required" }, { status: 400 });
    }

    await CartService.updateItem(cartId, lineItemId, quantity);

    const [dbCart, totals] = await Promise.all([
      CartService.getById(cartId),
      CartService.calculateTotals(cartId),
    ]);
    const cart = mapDbCartToFrontendCart(dbCart, totals);

    return NextResponse.json({ cart });
  } catch (error: any) {
    console.error("API shop/cart PUT error:", error);
    return NextResponse.json({ error: error.message || "Failed to update line item" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cartId = searchParams.get("cartId");
    const lineItemId = searchParams.get("lineItemId");
    const batchIds = searchParams.get("batchIds");

    if (!cartId) {
      return NextResponse.json({ error: "cartId is required" }, { status: 400 });
    }

    if (batchIds) {
      const ids = batchIds.split(",");
      await CartService.removeLineItemsBatch(cartId, ids);
    } else if (lineItemId) {
      await CartService.removeItem(cartId, lineItemId);
    } else {
      return NextResponse.json({ error: "lineItemId or batchIds are required" }, { status: 400 });
    }

    const [dbCart, totals] = await Promise.all([
      CartService.getById(cartId),
      CartService.calculateTotals(cartId),
    ]);
    const cart = mapDbCartToFrontendCart(dbCart, totals);

    return NextResponse.json({ cart });
  } catch (error: any) {
    console.error("API shop/cart DELETE error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete item(s)" }, { status: 500 });
  }
}
