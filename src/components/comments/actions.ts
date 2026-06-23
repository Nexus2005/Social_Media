"use server";

import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { getCommentDataInclude } from "@/lib/types";
import { toPlainObject } from "@/lib/utils";
import { createCommentSchema } from "@/lib/validation";
import {
  notifyComment,
  notifyReply,
  notifyMention,
  notifyCommentLike,
} from "@/lib/notification-center";

// Parse @mentions from text content
function parseMentions(text: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;
  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1]);
  }
  return [...new Set(mentions)]; // deduplicate
}

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

  // Handle notifications via centralized notification center
  if (parentCommentId) {
    const parentComment = await prisma.comment.findUnique({
      where: { id: parentCommentId },
      select: { userId: true },
    });
    if (parentComment && parentComment.userId !== user.id) {
      notifyReply(user.id, parentComment.userId, postId, {
        commentPreview: contentValidated.slice(0, 80),
      }).catch(console.error);
    }
  } else if (postUserId !== user.id) {
    notifyComment(user.id, postUserId, postId, {
      commentPreview: contentValidated.slice(0, 80),
    }).catch(console.error);
  }

  // Parse and send @mention notifications
  const mentionedUsernames = parseMentions(contentValidated);
  if (mentionedUsernames.length > 0) {
    const mentionedUsers = await prisma.user.findMany({
      where: {
        username: { in: mentionedUsernames },
        id: { not: user.id }, // Don't notify yourself
      },
      select: { id: true },
    });

    for (const mentionedUser of mentionedUsers) {
      notifyMention(user.id, mentionedUser.id, postId, {
        contentPreview: contentValidated.slice(0, 80),
      }).catch(console.error);
    }
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
    select: { userId: true, postId: true, content: true },
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

  // Send COMMENT_LIKE notification
  if (comment.userId !== user.id) {
    notifyCommentLike(user.id, comment.userId, comment.postId, {
      commentPreview: comment.content?.slice(0, 80),
    }).catch(console.error);
  }
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

