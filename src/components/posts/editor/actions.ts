"use server";

import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { getPostDataInclude } from "@/lib/types";
import { toPlainObject } from "@/lib/utils";
import { createPostSchema } from "@/lib/validation";
import { notifyQuote, notifyMention } from "@/lib/notification-center";

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

export async function submitPost(input: {
  content?: string;
  mediaIds?: string[];
  contentFormat?: "FEED" | "SPOT";
  location?: string | null;
  locationName?: string | null;
  locationCity?: string | null;
  locationState?: string | null;
  locationCountry?: string | null;
  locationDisplay?: string | null;
  latitude?: number | null;
  longitude?: number | null;
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
    contentFormat,
    location,
    locationName,
    locationCity,
    locationState,
    locationCountry,
    locationDisplay,
    latitude,
    longitude,
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

  const connectedMediaWithVideo = mediaIds.length > 0 ? await prisma.media.findFirst({
    where: {
      id: { in: mediaIds },
      mediaType: "VIDEO"
    }
  }) : null;

  const resolvedContentFormat = connectedMediaWithVideo ? "SPOT" : (contentFormat || "FEED");

  const newPost = await prisma.post.create({
    data: {
      content: content || "",
      userId: user.id,
      contentFormat: resolvedContentFormat,
      location,
      locationName,
      locationCity,
      locationState,
      locationCountry,
      locationDisplay,
      latitude,
      longitude,
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

  // Trigger QUOTE notification via notification center
  if (quotedPostId) {
    const quotedPost = await prisma.post.findUnique({
      where: { id: quotedPostId },
      select: { userId: true },
    });
    if (quotedPost && quotedPost.userId !== user.id) {
      notifyQuote(user.id, quotedPost.userId, newPost.id, {
        contentPreview: (content || "").slice(0, 80),
      }).catch(console.error);
    }
  }

  // Parse and send @mention notifications from post content
  if (content) {
    const mentionedUsernames = parseMentions(content);
    if (mentionedUsernames.length > 0) {
      const mentionedUsers = await prisma.user.findMany({
        where: {
          username: { in: mentionedUsernames },
          id: { not: user.id },
        },
        select: { id: true },
      });

      for (const mentionedUser of mentionedUsers) {
        notifyMention(user.id, mentionedUser.id, newPost.id, {
          contentPreview: content.slice(0, 80),
        }).catch(console.error);
      }
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


