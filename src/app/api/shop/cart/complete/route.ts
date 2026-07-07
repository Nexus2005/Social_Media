import { NextResponse } from "next/server";
import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { OrderService } from "@/services/commerce/OrderService";
import { mapDbOrderToFrontendOrder } from "@/features/shop/utils/mapCommerceCore";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cartId, details } = body;
    if (!cartId) {
      return NextResponse.json({ error: "Cart ID required" }, { status: 400 });
    }

    const session = await validateRequest();
    let userId = session.user?.id;

    const email = details?.email || details?.shippingAddress?.email;
    const addressData = details?.shippingAddress || {};

    if (!userId && email) {
      // Look up user by email
      const existingUser = await prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
      });
      if (existingUser) {
        userId = existingUser.id;
      } else {
        // Create a guest user in the system
        const username = "guest_" + Math.random().toString(36).substring(2, 8);
        const guestId = "usr_guest_" + Math.random().toString(36).substring(2, 15);
        const guest = await prisma.user.create({
          data: {
            id: guestId,
            username,
            displayName: `${addressData.firstName || "Guest"} ${addressData.lastName || "User"}`,
            email: email,
            passwordHash: "guest-checkout-stub-hash",
          },
        });
        userId = guest.id;
      }
    }

    if (!userId) {
      // Fallback to seeded super admin user ID
      userId = "ddtyr2pxl2g76x64";
    }

    // Create shipping address record in DB
    const dbAddress = await prisma.shopAddress.create({
      data: {
        userId: userId,
        firstName: addressData.firstName || "Guest",
        lastName: addressData.lastName || "User",
        addressLine: addressData.addressLine1 || addressData.addressLine || "No Address Provided",
        addressLine2: addressData.addressLine2 || null,
        city: addressData.city || "No City",
        state: addressData.province || addressData.state || null,
        postalCode: addressData.postalCode || "00000",
        countryCode: addressData.countryCode || "IN",
        phone: addressData.phone || null,
      },
    });

    // Process checkout and create the order
    const dbOrder = await OrderService.create(
      userId,
      cartId,
      dbAddress.id,
      details?.notes || ""
    );

    const order = mapDbOrderToFrontendOrder(dbOrder);
    return NextResponse.json({ order });
  } catch (error: any) {
    console.error("API shop/cart/complete POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to complete checkout" }, { status: 500 });
  }
}
