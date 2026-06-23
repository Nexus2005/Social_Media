import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { getPostDataInclude } from "@/lib/types";

export async function GET(
  req: Request,
  { params: { userId } }: { params: { userId: string } }
) {
  try {
    const { user: loggedInUser } = await validateRequest();

    if (!loggedInUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pinned = await prisma.pinnedContent.findMany({
      where: {
        userId,
        post: {
          contentFormat: "SPOT",
        },
      },
      orderBy: {
        position: "asc",
      },
      include: {
        post: {
          include: getPostDataInclude(loggedInUser.id),
        },
      },
      take: 3,
    });

    const posts = pinned.map((p) => p.post);
    return Response.json(posts);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
