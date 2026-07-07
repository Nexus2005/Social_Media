import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateRequest } from "@/auth";

export async function GET() {
  try {
    const { user } = await validateRequest();
    
    if (user?.id) {
      const address = await prisma.shopAddress.findFirst({
        where: { userId: user.id, isDefault: true }
      });

      if (address) {
        return NextResponse.json({
          address: {
            city: address.city,
            postalCode: address.postalCode,
            countryCode: address.countryCode,
            formatted: `${address.city}, ${address.postalCode}`
          }
        });
      }
    }

    // Default Fallback
    return NextResponse.json({
      address: {
        city: "Nashik",
        postalCode: "422001",
        countryCode: "IN",
        formatted: "Nashik, 422001"
      }
    });
  } catch (error) {
    console.error("API /api/shop/location GET error:", error);
    return NextResponse.json({ error: "Failed to resolve shipping location" }, { status: 500 });
  }
}
