import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { CommentsPage, getCommentDataInclude } from "@/lib/types";
import { NextRequest } from "next/server";

export async function GET(
  req: NextRequest,
  { params: { postId } }: { params: { postId: string } },
) {
  try {
    const cursor = req.nextUrl.searchParams.get("cursor") || undefined;

    const pageSize = 5;

    const { user } = await validateRequest();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user blocks and mutes
    const [blockedList, mutedList] = await Promise.all([
      prisma.userBlock.findMany({
        where: { blockerId: user.id },
        select: { blockedId: true },
      }),
      prisma.userMute.findMany({
        where: { muterId: user.id },
        select: { mutedId: true },
      }),
    ]);

    const excludedUserIds = new Set([
      ...blockedList.map((b) => b.blockedId),
      ...mutedList.map((m) => m.mutedId),
    ]);

    const comments = await prisma.comment.findMany({
      where: {
        postId,
        parentCommentId: null,
        userId: { notIn: Array.from(excludedUserIds) },
      },
      include: getCommentDataInclude(user.id),
      orderBy: { createdAt: "asc" },
      take: -pageSize - 1,
      cursor: cursor ? { id: cursor } : undefined,
    });

    // Increment views for these comments in the database
    if (comments.length > 0) {
      const commentIds = comments.map((c) => c.id);
      await prisma.comment.updateMany({
        where: { id: { in: commentIds } },
        data: {
          viewsCount: {
            increment: 1,
          },
        },
      }).catch(console.error);
    }

    const previousCursor = comments.length > pageSize ? comments[0].id : null;
    const rawList = comments.length > pageSize ? comments.slice(1) : comments;

    // Filter replies recursively to remove blocked/muted users
    const filteredList = rawList.map((c) => ({
      ...c,
      replies: c.replies
        ? c.replies.filter((reply: any) => !excludedUserIds.has(reply.userId))
        : [],
    }));

    const data: CommentsPage = {
      comments: filteredList as any,
      previousCursor,
    };

    return Response.json(data);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
