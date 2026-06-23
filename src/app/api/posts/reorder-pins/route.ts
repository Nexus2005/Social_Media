import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { user: loggedInUser } = await validateRequest();

    if (!loggedInUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { postIds } = await req.json();

    if (!Array.isArray(postIds)) {
      return Response.json({ error: "postIds must be an array" }, { status: 400 });
    }

    await prisma.$transaction(
      postIds.map((postId, index) =>
        prisma.pinnedContent.updateMany({
          where: {
            userId: loggedInUser.id,
            postId,
          },
          data: {
            position: index,
          },
        })
      )
    );

    return new Response();
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
