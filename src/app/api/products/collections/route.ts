import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const productId = req.nextUrl.searchParams.get("productId");

    const collections = await prisma.productCollection.findMany({
      where: { userId: user.id },
      include: {
        items: productId
          ? {
              where: { productId },
            }
          : false,
      },
      orderBy: { name: "asc" },
    });

    const result = collections.map((col) => ({
      id: col.id,
      name: col.name,
      saved: productId ? (col.items?.length || 0) > 0 : false,
    }));

    return Response.json(result);
  } catch (error) {
    console.error("Error fetching collections:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { productId, collectionId, collectionName, action } = body;

    // 1. Handle collection creation only (without product saving) if productId is omitted
    if (!productId) {
      if (!collectionName) {
        return Response.json({ error: "Missing collection name" }, { status: 400 });
      }

      // Check if collection with same name exists
      const existing = await prisma.productCollection.findUnique({
        where: {
          userId_name: {
            userId: user.id,
            name: collectionName.trim(),
          },
        },
      });

      if (existing) {
        return Response.json({ error: "Collection already exists" }, { status: 400 });
      }

      const collection = await prisma.productCollection.create({
        data: {
          name: collectionName.trim(),
          userId: user.id,
        },
      });

      return Response.json({ id: collection.id, name: collection.name, saved: false });
    }

    // 2. Handle saving/unsaving products in collections
    let finalCollectionId = collectionId;

    if (!finalCollectionId && collectionName) {
      // Find or create the collection by name
      let collection = await prisma.productCollection.findUnique({
        where: {
          userId_name: {
            userId: user.id,
            name: collectionName.trim(),
          },
        },
      });

      if (!collection) {
        collection = await prisma.productCollection.create({
          data: {
            name: collectionName.trim(),
            userId: user.id,
          },
        });
      }
      finalCollectionId = collection.id;
    }

    if (!finalCollectionId) {
      return Response.json({ error: "Collection not specified" }, { status: 400 });
    }

    if (action === "unsave") {
      await prisma.productCollectionItem.deleteMany({
        where: {
          collectionId: finalCollectionId,
          productId: productId,
        },
      });
      return Response.json({ success: true, action: "unsave", collectionId: finalCollectionId });
    } else {
      // Save product to collection
      await prisma.productCollectionItem.upsert({
        where: {
          collectionId_productId: {
            collectionId: finalCollectionId,
            productId: productId,
          },
        },
        create: {
          collectionId: finalCollectionId,
          productId: productId,
        },
        update: {},
      });
      return Response.json({ success: true, action: "save", collectionId: finalCollectionId });
    }
  } catch (error) {
    console.error("Error saving to collection:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
