"use server";

import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { getCommentDataInclude } from "@/lib/types";
import { toPlainObject } from "@/lib/utils";
import { createCommentSchema } from "@/lib/validation";

export async function submitComment({
  postId,
  postUserId,
  content,
  parentCommentId,
}: {
  postId: string;
  postUserId: string;
  content: string;
  parentCommentId?: string | null;
}) {
  const { user } = await validateRequest();

  if (!user) throw new Error("Unauthorized");

  const { content: contentValidated } = createCommentSchema.parse({ content });

  const newComment = await prisma.comment.create({
    data: {
      content: contentValidated,
      postId,
      userId: user.id,
      parentCommentId: parentCommentId || undefined,
    },
    include: getCommentDataInclude(user.id),
  });

  // Handle notifications
  if (parentCommentId) {
    const parentComment = await prisma.comment.findUnique({
      where: { id: parentCommentId },
      select: { userId: true },
    });
    if (parentComment && parentComment.userId !== user.id) {
      await prisma.notification.create({
        data: {
          issuerId: user.id,
          recipientId: parentComment.userId,
          postId,
          type: "REPLY",
        },
      });
    }
  } else if (postUserId !== user.id) {
    await prisma.notification.create({
      data: {
        issuerId: user.id,
        recipientId: postUserId,
        postId,
        type: "COMMENT",
      },
    });
  }

  return toPlainObject(newComment);
}

export async function deleteComment(id: string) {
  const { user } = await validateRequest();

  if (!user) throw new Error("Unauthorized");

  const comment = await prisma.comment.findUnique({
    where: { id },
  });

  if (!comment) throw new Error("Comment not found");

  if (comment.userId !== user.id) throw new Error("Unauthorized");

  const deletedComment = await prisma.comment.delete({
    where: { id },
    include: getCommentDataInclude(user.id),
  });

  return toPlainObject(deletedComment);
}

export async function likeComment(commentId: string) {
  const { user } = await validateRequest();

  if (!user) throw new Error("Unauthorized");

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { userId: true },
  });

  if (!comment) throw new Error("Comment not found");

  await prisma.commentLike.upsert({
    where: {
      userId_commentId: {
        userId: user.id,
        commentId,
      },
    },
    create: {
      userId: user.id,
      commentId,
    },
    update: {},
  });
}

export async function unlikeComment(commentId: string) {
  const { user } = await validateRequest();

  if (!user) throw new Error("Unauthorized");

  await prisma.commentLike.deleteMany({
    where: {
      userId: user.id,
      commentId,
    },
  });
}
