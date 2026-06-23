import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { getUserDataSelect } from "@/lib/types";

export async function GET(
  req: Request,
  { params: { postId } }: { params: { postId: string } },
) {
  try {
    const { user: loggedInUser } = await validateRequest();

    if (!loggedInUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const likes = await prisma.like.findMany({
      where: { postId },
      select: {
        user: {
          select: getUserDataSelect(loggedInUser.id),
        },
      },
    });

    const users = likes.map((like) => like.user);
    return Response.json(users);
  } catch (error) {
    console.error("Failed to fetch liking users:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
