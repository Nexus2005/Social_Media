"use server";

import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { getPostDataInclude } from "@/lib/types";
import { toPlainObject } from "@/lib/utils";
import { createPostSchema } from "@/lib/validation";

export async function submitPost(input: {
  content?: string;
  mediaIds?: string[];
  location?: string | null;
  disableComments?: boolean;
  hideLikes?: boolean;
  altText?: string | null;
  tags?: any;
  collaborators?: any;
  audience?: string;
  quotedPostId?: string | null;
  poll?: {
    options: string[];
    duration: {
      days: number;
      hours: number;
      minutes: number;
    };
  } | null;
}) {
  const { user } = await validateRequest();

  if (!user) throw new Error("Unauthorized");

  const {
    content,
    mediaIds,
    location,
    disableComments,
    hideLikes,
    altText,
    tags,
    collaborators,
    audience,
    quotedPostId,
    poll,
  } = createPostSchema.parse(input);

  const durationMs = poll
    ? (poll.duration.days * 24 * 60 + poll.duration.hours * 60 + poll.duration.minutes) * 60 * 1000
    : 0;

  const newPost = await prisma.post.create({
    data: {
      content: content || "",
      userId: user.id,
      location,
      disableComments,
      hideLikes,
      altText,
      tags: tags || undefined,
      collaborators: collaborators || undefined,
      audience,
      quotedPostId,
      attachments: {
        connect: mediaIds.map((id) => ({ id })),
      },
      poll: poll
        ? {
            create: {
              expiresAt: new Date(Date.now() + durationMs),
              options: {
                create: poll.options.map((option) => ({ text: option })),
              },
            },
          }
        : undefined,
    },
    include: getPostDataInclude(user.id),
  });

  // Trigger QUOTE notification if applicable
  if (quotedPostId) {
    const quotedPost = await prisma.post.findUnique({
      where: { id: quotedPostId },
      select: { userId: true },
    });
    if (quotedPost && quotedPost.userId !== user.id) {
      await prisma.notification.create({
        data: {
          issuerId: user.id,
          recipientId: quotedPost.userId,
          postId: newPost.id,
          type: "QUOTE",
        },
      });
    }
  }

  // If the post has video attachments, process it in the background for object localization
  const hasVideo = newPost.attachments.some((att) => att.mediaType === "VIDEO");
  if (hasVideo) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    fetch(`${baseUrl}/api/process-reel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ postId: newPost.id }),
    }).catch((error) => {
      console.error("Failed to trigger background Reel processing:", error);
    });
  }

  return toPlainObject(newPost);
}

