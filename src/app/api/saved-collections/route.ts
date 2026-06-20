import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { user: loggedInUser } = await validateRequest();

    if (!loggedInUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const collections = await prisma.savedCollection.findMany({
      where: { userId: loggedInUser.id },
      include: {
        items: {
          select: {
            postId: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return Response.json(collections);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { user: loggedInUser } = await validateRequest();

    if (!loggedInUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await req.json();
    if (!name || !name.trim()) {
      return Response.json({ error: "Name is required" }, { status: 400 });
    }

    const collection = await prisma.savedCollection.create({
      data: {
        name: name.trim(),
        userId: loggedInUser.id,
      },
    });

    return Response.json(collection);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
