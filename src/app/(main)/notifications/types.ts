import { Prisma } from "@prisma/client";

export type UINotificationType =
  | "LIKE"
  | "FOLLOW"
  | "COMMENT"
  | "REPOST"
  | "QUOTE"
  | "REPLY"
  | "MENTION"
  | "PRODUCT_ORDER"
  | "PRODUCT_SHIPPED"
  | "PRODUCT_DELIVERED"
  | "PRODUCT_PRICE_DROP"
  | "COLLECTION_ADD"
  | "SYSTEM";

export interface UINotificationData {
  id: string;
  recipientId?: string;
  issuerId?: string;
  postId?: string | null;
  type: UINotificationType;
  read: boolean;
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
  product?: {
    title: string;
    imageUrl: string;
    oldPrice?: number;
    newPrice: number;
  };
  order?: {
    id: string;
    status: string;
    productName: string;
    productImageUrl?: string;
  };
  collection?: {
    name: string;
  };
}
