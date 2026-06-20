import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params: { collectionId } }: { params: { collectionId: string } }
) {
  try {
    const { user: loggedInUser } = await validateRequest();

    if (!loggedInUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await req.json();
    if (!name || !name.trim()) {
      return Response.json({ error: "Name is required" }, { status: 400 });
    }

    const collection = await prisma.savedCollection.findUnique({
      where: { id: collectionId },
    });

    if (!collection) {
      return Response.json({ error: "Collection not found" }, { status: 404 });
    }

    if (collection.userId !== loggedInUser.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updated = await prisma.savedCollection.update({
      where: { id: collectionId },
      data: { name: name.trim() },
    });

    return Response.json(updated);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params: { collectionId } }: { params: { collectionId: string } }
) {
  try {
    const { user: loggedInUser } = await validateRequest();

    if (!loggedInUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const collection = await prisma.savedCollection.findUnique({
      where: { id: collectionId },
    });

    if (!collection) {
      return Response.json({ error: "Collection not found" }, { status: 404 });
    }

    if (collection.userId !== loggedInUser.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.savedCollection.delete({
      where: { id: collectionId },
    });

    return new Response();
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
