/**
 * Notification Center — Centralized Notification Service
 *
 * All notification creation goes through this module.
 * No route should call prisma.notification.create() directly.
 *
 * Each method:
 * 1. Checks user notification preferences
 * 2. Creates the notification in the database
 * 3. Increments the recipient's cached unread count
 * 4. Emits a real-time event via the realtime provider
 */

import prisma from "@/lib/prisma";
import { realtime } from "@/lib/realtime";
import { NotificationType, Prisma } from "@/generated/client";

// ─── Preference Category Mapping ─────────────────────────────────────────────

const PREFERENCE_MAP: Record<NotificationType, string> = {
  LIKE: "likes",
  FOLLOW: "follows",
  FOLLOW_REQUEST: "follows",
  FOLLOW_ACCEPTED: "follows",
  COMMENT: "comments",
  COMMENT_LIKE: "comments",
  REPLY: "comments",
  REPOST: "reposts",
  QUOTE: "quotes",
  MENTION: "mentions",
  STORY_MENTION: "mentions",
  SHARE: "shares",
  COLLECTION_SAVE: "shares",
  PRODUCT_ORDER: "orders",
  PRODUCT_SHIPPED: "orders",
  PRODUCT_DELIVERED: "orders",
  PRODUCT_PRICE_DROP: "products",
  PRODUCT_BACK_IN_STOCK: "products",
  PRODUCT_APPROVED: "products",
  POST_APPROVED: "products",
  COLLECTION_INVITE: "system",
  GROUP_INVITE: "system",
  MESSAGE: "messages",
  VERIFICATION_APPROVED: "system",
  VERIFICATION_REJECTED: "system",
  SECURITY_ALERT: "security",
  PASSWORD_CHANGED: "security",
  SYSTEM: "system",
};

// ─── Core Creation Function ──────────────────────────────────────────────────

interface CreateNotificationInput {
  recipientId: string;
  issuerId: string;
  type: NotificationType;
  postId?: string | null;
  deepLink?: string | null;
  metadata?: Record<string, unknown> | null;
}

async function checkPreference(
  recipientId: string,
  type: NotificationType,
): Promise<boolean> {
  const prefField = PREFERENCE_MAP[type];
  if (!prefField) return true;

  const pref = await prisma.notificationPreference.findUnique({
    where: { userId: recipientId },
  });

  // No preferences set = all enabled by default
  if (!pref) return true;

  return (pref as Record<string, unknown>)[prefField] !== false;
}

async function createNotification(
  input: CreateNotificationInput,
): Promise<void> {
  const { recipientId, issuerId, type, postId, deepLink, metadata } = input;

  // Never notify yourself
  if (recipientId === issuerId) return;

  // Check notification preferences
  const allowed = await checkPreference(recipientId, type);
  if (!allowed) return;

  // Create notification + increment unread count in a transaction
  const notification = await prisma.$transaction(async (tx) => {
    const notif = await tx.notification.create({
      data: {
        recipientId,
        issuerId,
        type,
        postId: postId || undefined,
        deepLink: deepLink || undefined,
        metadata: (metadata as Prisma.InputJsonValue) ?? undefined,
      },
    });

    await tx.user.update({
      where: { id: recipientId },
      data: { unreadNotificationCount: { increment: 1 } },
    });

    return notif;
  });

  // Fetch issuer data for the real-time payload
  const issuer = await prisma.user.findUnique({
    where: { id: issuerId },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
    },
  });

  // Emit real-time event to all connected clients of the recipient
  realtime.publish(recipientId, {
    type: "notification",
    data: {
      id: notification.id,
      recipientId: notification.recipientId,
      issuerId: notification.issuerId,
      type: notification.type,
      read: notification.read,
      deepLink: notification.deepLink,
      metadata: notification.metadata,
      createdAt: notification.createdAt.toISOString(),
      issuer: issuer || { id: issuerId, username: "unknown", displayName: "Unknown", avatarUrl: null },
      postId: notification.postId,
    },
  });

  // Also push badge count update
  realtime.publish(recipientId, {
    type: "badge_update",
    data: { action: "increment" },
  });
}

// ─── Delete Notification Helper ──────────────────────────────────────────────

interface DeleteNotificationInput {
  recipientId: string;
  issuerId: string;
  type: NotificationType;
  postId?: string | null;
}

async function deleteNotification(
  input: DeleteNotificationInput,
): Promise<void> {
  const { recipientId, issuerId, type, postId } = input;

  const where: Record<string, unknown> = {
    issuerId,
    recipientId,
    type,
  };
  if (postId) where.postId = postId;

  // Count existing unread notifications matching this criteria before deleting
  const unreadCount = await prisma.notification.count({
    where: { ...where, read: false } as any,
  });

  await prisma.notification.deleteMany({ where: where as any });

  // Decrement unread count if we deleted unread notifications
  if (unreadCount > 0) {
    await prisma.user.update({
      where: { id: recipientId },
      data: {
        unreadNotificationCount: { decrement: unreadCount },
      },
    });

    realtime.publish(recipientId, {
      type: "badge_update",
      data: { action: "decrement", count: unreadCount },
    });
  }
}

// ─── Mark As Read ────────────────────────────────────────────────────────────

export async function markAllAsRead(userId: string): Promise<void> {
  await prisma.$transaction([
    prisma.notification.updateMany({
      where: { recipientId: userId, read: false },
      data: { read: true },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { unreadNotificationCount: 0 },
    }),
  ]);

  realtime.publish(userId, {
    type: "badge_update",
    data: { action: "reset" },
  });
}

// ─── Get Unread Count (Cached) ───────────────────────────────────────────────

export async function getUnreadCount(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { unreadNotificationCount: true },
  });
  return user?.unreadNotificationCount ?? 0;
}

// ─── Specific Notification Methods ───────────────────────────────────────────

export async function notifyLike(
  issuerId: string,
  recipientId: string,
  postId: string,
  metadata?: { thumbnail?: string; contentPreview?: string },
): Promise<void> {
  await createNotification({
    recipientId,
    issuerId,
    type: "LIKE",
    postId,
    deepLink: `/posts/${postId}`,
    metadata: metadata || null,
  });
}

export async function deleteLikeNotification(
  issuerId: string,
  recipientId: string,
  postId: string,
): Promise<void> {
  await deleteNotification({ recipientId, issuerId, type: "LIKE", postId });
}

export async function notifyFollow(
  issuerId: string,
  recipientId: string,
  issuerUsername: string,
): Promise<void> {
  await createNotification({
    recipientId,
    issuerId,
    type: "FOLLOW",
    deepLink: `/users/${issuerUsername}`,
  });
}

export async function deleteFollowNotification(
  issuerId: string,
  recipientId: string,
): Promise<void> {
  await deleteNotification({ recipientId, issuerId, type: "FOLLOW" });
}

export async function notifyFollowRequest(
  issuerId: string,
  recipientId: string,
  issuerUsername: string,
): Promise<void> {
  await createNotification({
    recipientId,
    issuerId,
    type: "FOLLOW_REQUEST",
    deepLink: `/users/${issuerUsername}`,
  });
}

export async function notifyFollowAccepted(
  issuerId: string,
  recipientId: string,
  issuerUsername: string,
): Promise<void> {
  await createNotification({
    recipientId,
    issuerId,
    type: "FOLLOW_ACCEPTED",
    deepLink: `/users/${issuerUsername}`,
  });
}

export async function notifyComment(
  issuerId: string,
  recipientId: string,
  postId: string,
  metadata?: { commentPreview?: string; thumbnail?: string; commentId?: string },
): Promise<void> {
  await createNotification({
    recipientId,
    issuerId,
    type: "COMMENT",
    postId,
    deepLink: metadata?.commentId
      ? `/posts/${postId}?comment=${metadata.commentId}`
      : `/posts/${postId}`,
    metadata: metadata || null,
  });
}

export async function notifyReply(
  issuerId: string,
  recipientId: string,
  postId: string,
  metadata?: { commentPreview?: string; thumbnail?: string; commentId?: string },
): Promise<void> {
  await createNotification({
    recipientId,
    issuerId,
    type: "REPLY",
    postId,
    deepLink: metadata?.commentId
      ? `/posts/${postId}?comment=${metadata.commentId}`
      : `/posts/${postId}`,
    metadata: metadata || null,
  });
}

export async function notifyCommentLike(
  issuerId: string,
  recipientId: string,
  postId: string,
  metadata?: { commentPreview?: string; commentId?: string },
): Promise<void> {
  await createNotification({
    recipientId,
    issuerId,
    type: "COMMENT_LIKE",
    postId,
    deepLink: metadata?.commentId
      ? `/posts/${postId}?comment=${metadata.commentId}`
      : `/posts/${postId}`,
    metadata: metadata || null,
  });
}

export async function notifyRepost(
  issuerId: string,
  recipientId: string,
  postId: string,
  metadata?: { thumbnail?: string; contentPreview?: string },
): Promise<void> {
  await createNotification({
    recipientId,
    issuerId,
    type: "REPOST",
    postId,
    deepLink: `/posts/${postId}`,
    metadata: metadata || null,
  });
}

export async function deleteRepostNotification(
  issuerId: string,
  recipientId: string,
  postId: string,
): Promise<void> {
  await deleteNotification({ recipientId, issuerId, type: "REPOST", postId });
}

export async function notifyQuote(
  issuerId: string,
  recipientId: string,
  postId: string,
  metadata?: { contentPreview?: string },
): Promise<void> {
  await createNotification({
    recipientId,
    issuerId,
    type: "QUOTE",
    postId,
    deepLink: `/posts/${postId}`,
    metadata: metadata || null,
  });
}

export async function notifyMention(
  issuerId: string,
  recipientId: string,
  postId: string,
  metadata?: { contentPreview?: string; thumbnail?: string },
): Promise<void> {
  await createNotification({
    recipientId,
    issuerId,
    type: "MENTION",
    postId,
    deepLink: `/posts/${postId}`,
    metadata: metadata || null,
  });
}

export async function notifyShare(
  issuerId: string,
  recipientId: string,
  postId: string,
): Promise<void> {
  await createNotification({
    recipientId,
    issuerId,
    type: "SHARE",
    postId,
    deepLink: `/posts/${postId}`,
  });
}

export async function notifyCollectionSave(
  issuerId: string,
  recipientId: string,
  postId: string,
  metadata?: { collectionName?: string },
): Promise<void> {
  await createNotification({
    recipientId,
    issuerId,
    type: "COLLECTION_SAVE",
    postId,
    deepLink: `/posts/${postId}`,
    metadata: metadata || null,
  });
}

export async function notifySecurityAlert(
  recipientId: string,
  metadata: { event: string; ip?: string; device?: string },
): Promise<void> {
  // Security alerts use the system as issuer — use recipient as issuer (self-notification)
  await createNotification({
    recipientId,
    issuerId: recipientId,
    type: "SECURITY_ALERT",
    deepLink: "/settings",
    metadata,
  });
}

export async function notifyPasswordChanged(
  recipientId: string,
): Promise<void> {
  await createNotification({
    recipientId,
    issuerId: recipientId,
    type: "PASSWORD_CHANGED",
    deepLink: "/settings",
    metadata: { event: "password_changed" },
  });
}

export async function notifySystem(
  recipientId: string,
  message: string,
  deepLink?: string,
): Promise<void> {
  await createNotification({
    recipientId,
    issuerId: recipientId,
    type: "SYSTEM",
    deepLink: deepLink || "/",
    metadata: { message },
  });
}

// Export everything as a namespace-style object for convenience
const notificationCenter = {
  notifyLike,
  deleteLikeNotification,
  notifyFollow,
  deleteFollowNotification,
  notifyFollowRequest,
  notifyFollowAccepted,
  notifyComment,
  notifyReply,
  notifyCommentLike,
  notifyRepost,
  deleteRepostNotification,
  notifyQuote,
  notifyMention,
  notifyShare,
  notifyCollectionSave,
  notifySecurityAlert,
  notifyPasswordChanged,
  notifySystem,
  markAllAsRead,
  getUnreadCount,
};

export default notificationCenter;
