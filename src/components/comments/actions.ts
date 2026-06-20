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
}: {
  postId: string;
  postUserId: string;
  content: string;
}) {
  const { user } = await validateRequest();

  if (!user) throw new Error("Unauthorized");

  const { content: contentValidated } = createCommentSchema.parse({ content });

  const [newComment] = await prisma.$transaction([
    prisma.comment.create({
      data: {
        content: contentValidated,
        postId,
        userId: user.id,
      },
      include: getCommentDataInclude(user.id),
    }),
    ...(postUserId !== user.id
      ? [
          prisma.notification.create({
            data: {
              issuerId: user.id,
              recipientId: postUserId,
              postId,
              type: "COMMENT",
            },
          }),
        ]
      : []),
  ]);

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
