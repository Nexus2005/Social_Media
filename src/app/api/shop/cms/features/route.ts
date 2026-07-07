import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    let setting = await prisma.shopAdminSetting.findUnique({
      where: { key: "cart_footer_features" }
    });

    if (!setting) {
      const defaultVal = JSON.stringify([
        { icon: "truck", title: "Free Delivery", description: "On orders above ₹499" },
        { icon: "rotate-ccw", title: "10 Days Return", description: "No questions asked" },
        { icon: "award", title: "Assured Quality", description: "100% authentic products" },
        { icon: "shield-check", title: "Secure Payments", description: "100% safe & trusted" },
        { icon: "star", title: "Cartly Plus Benefits", description: "Extra savings & perks" }
      ]);

      setting = await prisma.shopAdminSetting.create({
        data: {
          key: "cart_footer_features",
          value: defaultVal
        }
      });
    }

    return NextResponse.json({ features: JSON.parse(setting.value) });
  } catch (error) {
    console.error("API /api/shop/cms/features GET error:", error);
    return NextResponse.json({ error: "Failed to fetch footer features" }, { status: 500 });
  }
}
