import { NextResponse } from "next/server";
import { ProductService } from "@/services/commerce/ProductService";
import { mapDbProductToFrontendProduct } from "@/features/shop/utils/mapCommerceCore";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || undefined;
    const categoryId = searchParams.get("category_id") || undefined;
    const collectionId = searchParams.get("collection_id") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 12;

    const dbProducts = await ProductService.list({
      status: "PUBLISHED",
      categoryId: categoryId,
      collectionId: collectionId,
      query: q,
      limit,
    });

    const products = dbProducts.items.map(mapDbProductToFrontendProduct);

    return NextResponse.json({ products }, {
      headers: {
        // Public catalog data — short CDN/browser cache with background refresh
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error: any) {
    console.error("API shop/products GET error:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}
