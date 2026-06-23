export type UINotificationType =
  // Social interactions
  | "LIKE"
  | "FOLLOW"
  | "FOLLOW_REQUEST"
  | "FOLLOW_ACCEPTED"
  | "COMMENT"
  | "COMMENT_LIKE"
  | "REPOST"
  | "QUOTE"
  | "REPLY"
  | "MENTION"
  | "STORY_MENTION"
  | "SHARE"
  | "COLLECTION_SAVE"
  // Commerce events
  | "PRODUCT_ORDER"
  | "PRODUCT_SHIPPED"
  | "PRODUCT_DELIVERED"
  | "PRODUCT_PRICE_DROP"
  | "PRODUCT_BACK_IN_STOCK"
  | "PRODUCT_APPROVED"
  | "POST_APPROVED"
  // Social groups
  | "COLLECTION_INVITE"
  | "GROUP_INVITE"
  | "MESSAGE"
  // Account & Security
  | "VERIFICATION_APPROVED"
  | "VERIFICATION_REJECTED"
  | "SECURITY_ALERT"
  | "PASSWORD_CHANGED"
  | "SYSTEM";

export interface UINotificationData {
  id: string;
  recipientId?: string;
  issuerId?: string;
  postId?: string | null;
  type: UINotificationType;
  read: boolean;
  deepLink?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string | Date;
  issuer: {
    id?: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  post?: {
    id: string;
    content: string;
    attachments: { url: string; mediaType: "IMAGE" | "VIDEO" }[];
  } | null;
}

