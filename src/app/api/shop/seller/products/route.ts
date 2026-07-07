import { NextResponse } from "next/server";
import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { ProductService } from "@/services/commerce/ProductService";
import { mapDbProductToFrontendProduct } from "@/features/shop/utils/mapCommerceCore";

export async function GET() {
  try {
    const session = await validateRequest();
    if (!session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const seller = await prisma.shopSeller.findUnique({
      where: { userId: session.user.id }
    });

    if (!seller) {
      return NextResponse.json({ products: [] });
    }

    // Get all products of the seller regardless of status
    const sellerProducts = await prisma.shopProduct.findMany({
      where: { sellerId: seller.id },
      include: {
        images: {
          orderBy: { displayOrder: "asc" },
        },
        variants: {
          include: {
            attributes: true,
          },
        },
        category: true,
        brand: true,
        seller: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const products = sellerProducts.map(mapDbProductToFrontendProduct);

    return NextResponse.json({ products });
  } catch (error: any) {
    console.error("API shop/seller/products GET error:", error);
    return NextResponse.json({ error: "Failed to fetch seller products" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await validateRequest();
    if (!session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const seller = await prisma.shopSeller.findUnique({
      where: { userId: session.user.id }
    });

    if (!seller) {
      return NextResponse.json({ error: "You must register as a seller first" }, { status: 400 });
    }

    const { title, description, price, imageUrl, categoryId } = await request.json();
    if (!title || !price) {
      return NextResponse.json({ error: "Title and price are required" }, { status: 400 });
    }

    // Ensure category exists
    let validCategoryId = categoryId;
    if (validCategoryId) {
      const catExists = await prisma.shopCategory.findFirst({
        where: { id: validCategoryId }
      });
      if (!catExists) {
        const defaultCat = await prisma.shopCategory.findFirst();
        validCategoryId = defaultCat ? defaultCat.id : undefined;
      }
    } else {
      const defaultCat = await prisma.shopCategory.findFirst();
      validCategoryId = defaultCat ? defaultCat.id : undefined;
    }

    // Create product via service
    const product = await ProductService.create(seller.id, {
      title,
      description: description || "No description provided.",
      price: parseFloat(price),
      categoryId: validCategoryId,
      images: imageUrl ? [{ originalUrl: imageUrl }] : [],
      variants: [
        {
          title: "Standard Edition",
          price: parseFloat(price),
          stock: 100,
          isDefault: true
        }
      ]
    });

    // Make the created product published immediately for instant feedback
    await prisma.shopProduct.update({
      where: { id: product.id },
      data: { status: "PUBLISHED", publishedAt: new Date() }
    });

    const mappedProduct = mapDbProductToFrontendProduct(product);

    return NextResponse.json({ success: true, product: mappedProduct });
  } catch (error: any) {
    console.error("API shop/seller/products POST error:", error);
    return NextResponse.json({ error: error.message || "Failed to create seller product" }, { status: 500 });
  }
}
