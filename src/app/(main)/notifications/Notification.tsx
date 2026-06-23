"use client";

import UserAvatar from "@/components/UserAvatar";
import { cn } from "@/lib/utils";
import { Heart, MessageCircle, User2, Repeat2, MessageSquareQuote, ChevronRight, Bookmark } from "lucide-react";
import Link from "next/link";
import { UINotificationData } from "./types";
import { formatDistanceToNowStrict } from "date-fns";
import FollowButton from "@/components/FollowButton";

interface NotificationProps {
  notification: UINotificationData;
  isUnread: boolean;
}

function formatTimeShort(dateParam: string | Date) {
  try {
    const date = new Date(dateParam);
    const distance = formatDistanceToNowStrict(date);
    return distance
      .replace(" seconds", "s")
      .replace(" second", "s")
      .replace(" minutes", "m")
      .replace(" minute", "m")
      .replace(" hours", "h")
      .replace(" hour", "h")
      .replace(" days", "d")
      .replace(" day", "d")
      .replace(" months", "mo")
      .replace(" month", "mo")
      .replace(" years", "y")
      .replace(" year", "y")
      .replace(" ago", "");
  } catch (e) {
    return "";
  }
}

export default function Notification({ notification, isUnread }: NotificationProps) {
  // Determine text content and redirect href based on notification type
  let messageText = "";
  let href = `/posts/${notification.postId || ""}`;

  switch (notification.type) {
    case "FOLLOW":
      messageText = "started following you.";
      href = `/users/${notification.issuer.username}`;
      break;
    case "LIKE":
      messageText = "liked your post.";
      break;
    case "COMMENT":
      messageText = `commented: "${notification.post?.content?.slice(0, 35) || "Looks amazing 🔥"}"`;
      break;
    case "REPLY":
      messageText = "replied to your comment.";
      break;
    case "MENTION":
      messageText = "mentioned you in a post.";
      break;
    case "REPOST":
      messageText = "reposted your post.";
      break;
    case "QUOTE":
      messageText = "quoted your post.";
      break;
    case "PRODUCT_ORDER":
      messageText = `placed an order for ${notification.order?.productName || "Product"}.`;
      href = "/shop";
      break;
    case "PRODUCT_SHIPPED":
      messageText = `Your order #${notification.order?.id || "12345"} has shipped! 🚚`;
      href = "/shop";
      break;
    case "PRODUCT_DELIVERED":
      messageText = `Your order #${notification.order?.id || "12345"} has been delivered! 🎉`;
      href = "/shop";
      break;
    case "PRODUCT_PRICE_DROP":
      messageText = `Price dropped on a product you saved! Now $${notification.product?.newPrice}.`;
      href = "/shop";
      break;
    case "COLLECTION_ADD":
      messageText = `added your post to their collection "${notification.collection?.name || "Favorites"}".`;
      href = `/users/${notification.issuer.username}`;
      break;
    case "SYSTEM":
      messageText = "System alert updated.";
      href = "/";
      break;
    default:
      messageText = "interacted with you.";
  }

  const postAttachment = notification.post?.attachments?.[0];
  const postImageUrl = postAttachment?.url;

  const renderThumbnailWithBadge = (imageUrl: string | undefined, badgeType: "like" | "comment" | "repost" | "quote") => {
    const badges = {
      like: (
        <div className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-0.5 border border-black shadow-sm flex items-center justify-center">
          <Heart className="size-2 text-white fill-white" />
        </div>
      ),
      comment: (
        <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-0.5 border border-black shadow-sm flex items-center justify-center">
          <MessageCircle className="size-2 text-white fill-white" />
        </div>
      ),
      repost: (
        <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5 border border-black shadow-sm flex items-center justify-center">
          <Repeat2 className="size-2 text-white" />
        </div>
      ),
      quote: (
        <div className="absolute -bottom-1 -right-1 bg-purple-500 rounded-full p-0.5 border border-black shadow-sm flex items-center justify-center">
          <MessageSquareQuote className="size-2 text-white" />
        </div>
      ),
    };

    if (imageUrl) {
      return (
        <Link href={href} className="relative size-11 rounded-md overflow-hidden bg-zinc-900 border border-zinc-800 shrink-0 block hover:opacity-90 transition-opacity">
          <img src={imageUrl} className="object-cover w-full h-full" alt="Thumbnail" />
          {badges[badgeType]}
        </Link>
      );
    }

    return (
      <Link href={href} className="relative size-11 rounded-md bg-[#121212] border border-zinc-800 flex items-center justify-center p-1 text-[8px] text-zinc-400 overflow-hidden line-clamp-3 select-none leading-tight shrink-0 block hover:bg-zinc-900 transition-colors">
        {notification.post?.content || ""}
        {badges[badgeType]}
      </Link>
    );
  };

  const renderActionArea = () => {
    switch (notification.type) {
      case "FOLLOW":
        if (notification.issuer.id) {
          return (
            <FollowButton
              userId={notification.issuer.id}
              initialState={{
                followers: 0,
                isFollowedByUser: false,
              }}
              variant="notification-pill"
            />
          );
        }
        return (
          <button className="h-8 px-4 flex items-center justify-center rounded-full text-xs font-bold bg-[#0095f6] hover:bg-[#1877f2] text-white transition-all active:scale-95 shrink-0 border-0">
            Follow Back
          </button>
        );
      case "LIKE":
        return renderThumbnailWithBadge(postImageUrl, "like");
      case "COMMENT":
      case "REPLY":
        return renderThumbnailWithBadge(postImageUrl, "comment");
      case "REPOST":
        return renderThumbnailWithBadge(postImageUrl, "repost");
      case "QUOTE":
        return renderThumbnailWithBadge(postImageUrl, "quote");
      case "MENTION":
        if (postImageUrl) {
          return (
            <Link href={href} className="relative size-11 rounded-md overflow-hidden bg-zinc-900 border border-zinc-800 shrink-0 block hover:opacity-90 transition-opacity">
              <img src={postImageUrl} className="object-cover w-full h-full" alt="Mention" />
            </Link>
          );
        }
        return (
          <Link href={href} className="relative size-11 rounded-md bg-[#121212] border border-zinc-800 flex items-center justify-center p-1 text-[8px] text-zinc-400 overflow-hidden line-clamp-3 select-none leading-tight shrink-0 block hover:bg-zinc-900 transition-colors">
            {notification.post?.content || ""}
          </Link>
        );
      case "PRODUCT_PRICE_DROP":
        return (
          <Link href={href} className="relative size-11 rounded-md overflow-hidden bg-zinc-900 border border-zinc-800 shrink-0 block hover:opacity-90 transition-opacity">
            <img src={notification.product?.imageUrl} className="object-cover w-full h-full" alt="Product" />
            <div className="absolute -bottom-1 -right-1 bg-yellow-500 rounded-full p-0.5 border border-black shadow-sm flex items-center justify-center text-[8px] font-bold text-black size-4">
              $
            </div>
          </Link>
        );
      case "PRODUCT_SHIPPED":
      case "PRODUCT_DELIVERED":
      case "PRODUCT_ORDER":
        if (notification.order?.productImageUrl) {
          return (
            <Link href={href} className="relative size-11 rounded-md overflow-hidden bg-zinc-900 border border-zinc-800 shrink-0 block hover:opacity-90 transition-opacity">
              <img src={notification.order.productImageUrl} className="object-cover w-full h-full" alt="Order Product" />
              <div className="absolute -bottom-1 -right-1 bg-purple-600 rounded-full p-0.5 border border-black shadow-sm flex items-center justify-center text-white size-4">
                <Bookmark className="size-2 fill-white" />
              </div>
            </Link>
          );
        }
        return <ChevronRight className="size-5 text-zinc-650" />;
      case "COLLECTION_ADD":
        return (
          <div className="size-11 rounded-md bg-zinc-900 border border-zinc-850 flex items-center justify-center text-zinc-400 shrink-0">
            <Bookmark className="size-5 text-purple-400 fill-purple-400" />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-zinc-900/30 transition-colors bg-black w-full min-h-[64px] max-h-[72px] relative select-none">
      {/* Unread indicator dot */}
      {isUnread && (
        <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-2 h-2 bg-[#0095f6] rounded-full" />
      )}

      {/* Main navigation click triggers */}
      <Link href={href} className={cn("flex items-center gap-3 flex-grow min-w-0", isUnread && "pl-2")}>
        <div className="shrink-0">
          <UserAvatar avatarUrl={notification.issuer.avatarUrl} size={44} className="w-[44px] h-[44px]" />
        </div>
        <div className="flex flex-col justify-center min-w-0">
          <p className="text-[13px] text-white leading-tight break-words">
            <span className="font-semibold text-white hover:underline">{notification.issuer.username}</span>{" "}
            <span className="text-zinc-300">{messageText}</span>{" "}
            <span className="text-zinc-500 font-medium shrink-0 ml-1 whitespace-nowrap">{formatTimeShort(notification.createdAt)}</span>
          </p>
        </div>
      </Link>

      {/* Right side interactive button or post thumbnail */}
      <div className="shrink-0 flex items-center justify-end min-w-[44px]">
        {renderActionArea()}
      </div>
    </div>
  );
}
