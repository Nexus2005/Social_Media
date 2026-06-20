import { z } from "zod";

const requiredString = z.string().trim().min(1, "Required");

export const signUpSchema = z.object({
  email: requiredString.email("Invalid email address"),
  username: requiredString.regex(
    /^[a-zA-Z0-9_-]+$/,
    "Only letters, numbers, - and _ allowed",
  ),
  password: requiredString.min(8, "Must be at least 8 characters"),
});

export type SignUpValues = z.infer<typeof signUpSchema>;

export const loginSchema = z.object({
  username: requiredString,
  password: requiredString,
});

export type LoginValues = z.infer<typeof loginSchema>;

export const createPostSchema = z.object({
  content: z.string().optional(),
  mediaIds: z.array(z.string()).max(10, "Cannot have more than 10 attachments").default([]),
  location: z.string().trim().optional().nullable(),
  disableComments: z.boolean().optional().default(false),
  hideLikes: z.boolean().optional().default(false),
  altText: z.string().trim().optional().nullable(),
  tags: z.any().optional(),
  collaborators: z.any().optional(),
  audience: z.string().optional().default("PUBLIC"),
  quotedPostId: z.string().optional().nullable(),
  poll: z.object({
    options: z.array(z.string().trim().min(1, "Option text cannot be empty")).min(2, "At least 2 choices required").max(4, "Maximum 4 choices allowed"),
    duration: z.object({
      days: z.number().min(0).max(7),
      hours: z.number().min(0).max(23),
      minutes: z.number().min(0).max(59),
    }),
  }).optional().nullable(),
}).refine(
  (data) => (data.content && data.content.trim().length > 0) || data.mediaIds.length > 0 || !!data.poll || !!data.quotedPostId,
  {
    message: "Post must contain text, media, a poll, or quote a post",
    path: ["content"],
  }
);

export const updateUserProfileSchema = z.object({
  displayName: requiredString,
  username: requiredString.regex(
    /^[a-zA-Z0-9_-]+$/,
    "Only letters, numbers, - and _ allowed",
  ),
  bio: z.string().max(1000, "Must be at most 1000 characters").optional(),
  location: z.string().max(100, "Must be at most 100 characters").optional(),
  websiteUrl: z.string().max(200, "Must be at most 200 characters").optional(),
  birthDate: z.preprocess((val) => {
    if (!val || val === "") return null;
    return new Date(val as any);
  }, z.date().nullable().optional()),
  professionalCategory: z.string().max(100).optional().nullable(),
});

export type UpdateUserProfileValues = z.infer<typeof updateUserProfileSchema>;

export const createCommentSchema = z.object({
  content: requiredString,
});

export const allowedMediaExtensions = ["jpg", "jpeg", "png", "webp", "gif", "mp4", "mov", "webm"];

export const allowedMediaMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/quicktime",
  "video/webm",
];

export function validateMediaFile(file: File): string | null {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!extension || !allowedMediaExtensions.includes(extension)) {
    return `Unsupported file extension (.${extension || "unknown"}). Allowed: ${allowedMediaExtensions.join(", ")}`;
  }

  if (!allowedMediaMimeTypes.includes(file.type)) {
    return `Unsupported file type (${file.type || "unknown"}).`;
  }

  // Maximum sizes: 10MB for images, 100MB for videos
  const isVideo = file.type.startsWith("video/");
  const maxSizeBytes = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return `File is too large. Maximum size is ${isVideo ? "100MB" : "10MB"}.`;
  }

  return null;
}
