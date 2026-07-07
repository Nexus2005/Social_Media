import { NextResponse } from "next/server";
import { CategoryService } from "@/services/commerce/CategoryService";

export async function GET() {
  try {
    const dbCategories = await CategoryService.list();
    const categories = dbCategories.map((c) => ({
      id: c.id,
      name: c.name,
      handle: c.slug,
    }));
    return NextResponse.json({ categories });
  } catch (error: any) {
    console.error("API shop/categories GET error:", error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}
