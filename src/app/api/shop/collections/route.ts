import { NextResponse } from "next/server";
import { CollectionService } from "@/services/commerce/CollectionService";

export async function GET() {
  try {
    const dbCollections = await CollectionService.list();
    const collections = dbCollections.map((c) => ({
      id: c.id,
      title: c.name,
      handle: c.slug,
    }));
    return NextResponse.json({ collections });
  } catch (error: any) {
    console.error("API shop/collections GET error:", error);
    return NextResponse.json({ error: "Failed to fetch collections" }, { status: 500 });
  }
}
