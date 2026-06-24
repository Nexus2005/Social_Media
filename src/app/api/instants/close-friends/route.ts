import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const closeFriends = await prisma.closeFriend.findMany({
      where: { userId: user.id },
      include: {
        friend: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return Response.json(closeFriends.map((cf) => cf.friend));
  } catch (error) {
    console.error("Failed to get close friends:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { friendId } = await req.json();
    if (!friendId) {
      return Response.json({ error: "Friend ID is required" }, { status: 400 });
    }

    // Toggle close friend status
    const existing = await prisma.closeFriend.findUnique({
      where: {
        userId_friendId: {
          userId: user.id,
          friendId,
        },
      },
    });

    if (existing) {
      await prisma.closeFriend.delete({
        where: {
          id: existing.id,
        },
      });
      return Response.json({ added: false });
    } else {
      await prisma.closeFriend.create({
        data: {
          userId: user.id,
          friendId,
        },
      });
      return Response.json({ added: true });
    }
  } catch (error) {
    console.error("Failed to toggle close friend:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
