import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";

export async function POST(
  req: Request,
  { params: { postId } }: { params: { postId: string } },
) {
  try {
    const { user: loggedInUser } = await validateRequest();

    if (!loggedInUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const watchDuration = body.watchDuration !== undefined ? Number(body.watchDuration) : null;
    const completed = !!body.completed;

    const view = await prisma.postView.upsert({
      where: {
        postId_userId: {
          postId,
          userId: loggedInUser.id,
        },
      },
      create: {
        postId,
        userId: loggedInUser.id,
        watchDuration,
        completed,
      },
      update: {
        // Only update if the new watch duration is longer or we completed it
        watchDuration: watchDuration !== null ? watchDuration : undefined,
        completed: completed ? true : undefined,
      },
    });

    return Response.json(view);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
