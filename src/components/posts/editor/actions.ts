"use server";

import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { getPostDataInclude } from "@/lib/types";
import { toPlainObject } from "@/lib/utils";
import { createPostSchema } from "@/lib/validation";
import { notifyQuote, notifyMention } from "@/lib/notification-center";
import { z } from "zod";

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

export async function updatePost(input: {
  id: string;
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
}) {
  const { user } = await validateRequest();

  if (!user) throw new Error("Unauthorized");

  const {
    id,
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
  } = z.object({
    id: z.string(),
    content: z.string().optional(),
    mediaIds: z.array(z.string()).max(10, "Cannot have more than 10 attachments").default([]),
    contentFormat: z.enum(["FEED", "SPOT"]).optional().default("FEED"),
    location: z.string().trim().optional().nullable(),
    locationName: z.string().trim().optional().nullable(),
    locationCity: z.string().trim().optional().nullable(),
    locationState: z.string().trim().optional().nullable(),
    locationCountry: z.string().trim().optional().nullable(),
    locationDisplay: z.string().trim().optional().nullable(),
    latitude: z.number().optional().nullable(),
    longitude: z.number().optional().nullable(),
    disableComments: z.boolean().optional().default(false),
    hideLikes: z.boolean().optional().default(false),
    altText: z.string().trim().optional().nullable(),
    tags: z.any().optional(),
    collaborators: z.any().optional(),
    audience: z.string().optional().default("PUBLIC"),
  }).parse(input);

  const post = await prisma.post.findUnique({
    where: { id },
  });

  if (!post) throw new Error("Post not found");
  if (post.userId !== user.id) throw new Error("Unauthorized");

  const connectedMediaWithVideo = mediaIds.length > 0 ? await prisma.media.findFirst({
    where: {
      id: { in: mediaIds },
      mediaType: "VIDEO",
    },
  }) : null;

  const resolvedContentFormat = connectedMediaWithVideo ? "SPOT" : (contentFormat || "FEED");

  // Disconnect existing media for this post to prevent orphan relations, then reconnect new ones
  await prisma.media.updateMany({
    where: { postId: id },
    data: { postId: null },
  });

  const updatedPost = await prisma.post.update({
    where: { id },
    data: {
      content: content || "",
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
      attachments: {
        connect: mediaIds.map((mediaId) => ({ id: mediaId })),
      },
    },
    include: getPostDataInclude(user.id),
  });

  // If the post has video attachments, process it in the background for object localization
  const hasVideo = updatedPost.attachments.some((att) => att.mediaType === "VIDEO");
  if (hasVideo) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    fetch(`${baseUrl}/api/process-reel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ postId: updatedPost.id }),
    }).catch((error) => {
      console.error("Failed to trigger background Reel processing:", error);
    });
  }

  return toPlainObject(updatedPost);
}

export async function translateCaption(text: string, targetLanguage: string): Promise<string> {
  const { user } = await validateRequest();
  if (!user) throw new Error("Unauthorized");

  const apiKey = process.env.OPENROUTER_API_KEY;
  const nvidiaKey = process.env.NVIDIA_API_KEY;

  if (!apiKey && !nvidiaKey) {
    return text;
  }

  const prompt = `Translate this social media caption into ${targetLanguage}. Return ONLY the translation, nothing else. Do not add quotes, markdown, explanations, or preface text. Here is the caption: "${text}"`;

  // 1. Try NVIDIA API key first (mostly Qwen models)
  if (nvidiaKey) {
    try {
      const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${nvidiaKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "qwen/qwen2.5-7b-instruct",
          messages: [
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.2,
          max_tokens: 1024
        })
      });

      if (response.ok) {
        const data = await response.json();
        const translation = data.choices?.[0]?.message?.content?.trim();
        if (translation) return translation;
      } else {
        console.warn(`NVIDIA Qwen model translation failed with status ${response.status}. Trying fallback model...`);
        // Fallback model on NVIDIA integrate API
        const fallbackResponse = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${nvidiaKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "meta/llama-3.1-8b-instruct",
            messages: [
              {
                role: "user",
                content: prompt
              }
            ],
            temperature: 0.2,
            max_tokens: 1024
          })
        });

        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          const translation = data.choices?.[0]?.message?.content?.trim();
          if (translation) return translation;
        }
      }
    } catch (error) {
      console.error("NVIDIA API translation error:", error);
    }
  }

  // 2. Try OpenRouter API key as fallback
  if (apiKey) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "Next Social Media Translation"
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.3
        })
      });

      if (response.ok) {
        const data = await response.json();
        const translation = data.choices?.[0]?.message?.content?.trim();
        if (translation) return translation;
      }
    } catch (error) {
      console.error("OpenRouter API translation error:", error);
    }
  }

  return text;
}


