import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(
  req: Request,
  { params: { postId } }: { params: { postId: string } },
) {
  try {
    const { user: loggedInUser } = await validateRequest();

    if (!loggedInUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pinned = await prisma.pinnedContent.findUnique({
      where: {
        userId_postId: {
          userId: loggedInUser.id,
          postId,
        },
      },
      select: {
        position: true,
      },
    });

    return Response.json({
      isPinned: !!pinned,
      position: pinned ? pinned.position : null,
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params: { postId } }: { params: { postId: string } },
) {
  try {
    const { user: loggedInUser } = await validateRequest();

    if (!loggedInUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { userId: true },
    });

    if (!post) {
      return Response.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.userId !== loggedInUser.id) {
      return Response.json({ error: "You can only pin your own posts" }, { status: 403 });
    }

    // Check current count
    const pinnedCount = await prisma.pinnedContent.count({
      where: { userId: loggedInUser.id },
    });

    if (pinnedCount >= 3) {
      return Response.json({ error: "You can only pin up to 3 items. Unpin another item first." }, { status: 400 });
    }

    // Create pinned content
    await prisma.pinnedContent.upsert({
      where: {
        userId_postId: {
          userId: loggedInUser.id,
          postId,
        },
      },
      create: {
        userId: loggedInUser.id,
        postId,
        position: pinnedCount,
      },
      update: {},
    });

    return new Response();
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params: { postId } }: { params: { postId: string } },
) {
  try {
    const { user: loggedInUser } = await validateRequest();

    if (!loggedInUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.$transaction(async (tx) => {
      // Delete the pin
      await tx.pinnedContent.deleteMany({
        where: {
          userId: loggedInUser.id,
          postId,
        },
      });

      // Re-order remaining pins
      const remaining = await tx.pinnedContent.findMany({
        where: { userId: loggedInUser.id },
        orderBy: { position: "asc" },
      });

      for (let i = 0; i < remaining.length; i++) {
        await tx.pinnedContent.update({
          where: { id: remaining[i].id },
          data: { position: i },
        });
      }
    });

    return new Response();
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
