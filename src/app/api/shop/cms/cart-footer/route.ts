import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    let setting = await prisma.shopAdminSetting.findUnique({
      where: { key: "cart_footer_trust" }
    });

    if (!setting) {
      const defaultVal = JSON.stringify({
        icon: "shield-check",
        title: "Secure & Safe Payments",
        description: "100% secure payments. Your data is protected."
      });

      setting = await prisma.shopAdminSetting.create({
        data: {
          key: "cart_footer_trust",
          value: defaultVal
        }
      });
    }

    return NextResponse.json(JSON.parse(setting.value));
  } catch (error) {
    console.error("API /api/shop/cms/cart-footer GET error:", error);
    return NextResponse.json({ error: "Failed to fetch trust banner" }, { status: 500 });
  }
}
