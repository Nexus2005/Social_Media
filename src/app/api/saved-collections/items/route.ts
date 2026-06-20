import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { user: loggedInUser } = await validateRequest();

    if (!loggedInUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { collectionId, postId } = await req.json();

    if (!collectionId || !postId) {
      return Response.json({ error: "collectionId and postId are required" }, { status: 400 });
    }

    const collection = await prisma.savedCollection.findUnique({
      where: { id: collectionId },
    });

    if (!collection || collection.userId !== loggedInUser.id) {
      return Response.json({ error: "Collection not found" }, { status: 404 });
    }

    const existingItem = await prisma.savedCollectionItem.findUnique({
      where: {
        collectionId_postId: {
          collectionId,
          postId,
        },
      },
    });

    if (existingItem) {
      await prisma.savedCollectionItem.delete({
        where: {
          collectionId_postId: {
            collectionId,
            postId,
          },
        },
      });
      return Response.json({ added: false });
    } else {
      await prisma.savedCollectionItem.create({
        data: {
          collectionId,
          postId,
        },
      });
      return Response.json({ added: true });
    }
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
