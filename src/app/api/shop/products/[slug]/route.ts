import { NextRequest, NextResponse } from "next/server";
import { ProductService } from "@/services/commerce/ProductService";
import { mapDbProductToFrontendProduct } from "@/features/shop/utils/mapCommerceCore";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    // Get product from DB by handle/slug or ID
    const dbProduct = await ProductService.getBySlug(slug).catch(() => null);
    const resolvedProduct = dbProduct || await ProductService.getById(slug).catch(() => null);

    if (!resolvedProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const product = mapDbProductToFrontendProduct(resolvedProduct);
    return NextResponse.json({ product });
  } catch (error: any) {
    console.error(`API shop/products/ GET error:`, error);
    return NextResponse.json({ error: "Failed to fetch product details" }, { status: 500 });
  }
}
