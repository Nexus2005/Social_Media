"use client";

import UserAvatar from "@/components/UserAvatar";
import { cn } from "@/lib/utils";
import { Heart, MessageCircle, User2, Repeat2, MessageSquareQuote, ChevronRight, Bookmark, AtSign, Shield, CheckCircle, Bell } from "lucide-react";
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

// Build message text and fallback href based on notification type
function getNotificationContent(notification: UINotificationData): {
  messageText: string;
  fallbackHref: string;
} {
  const meta = notification.metadata as Record<string, unknown> | null;

  switch (notification.type) {
    case "FOLLOW":
      return { messageText: "started following you.", fallbackHref: `/users/${notification.issuer.username}` };
    case "FOLLOW_REQUEST":
      return { messageText: "requested to follow you.", fallbackHref: `/users/${notification.issuer.username}` };
    case "FOLLOW_ACCEPTED":
      return { messageText: "accepted your follow request.", fallbackHref: `/users/${notification.issuer.username}` };
    case "LIKE":
      return { messageText: "liked your post.", fallbackHref: `/posts/${notification.postId || ""}` };
    case "COMMENT": {
      const preview = (meta?.commentPreview as string) || notification.post?.content?.slice(0, 35) || "";
      return {
        messageText: preview ? `commented: "${preview}"` : "commented on your post.",
        fallbackHref: `/posts/${notification.postId || ""}`,
      };
    }
    case "COMMENT_LIKE":
      return { messageText: "liked your comment.", fallbackHref: `/posts/${notification.postId || ""}` };
    case "REPLY": {
      const preview = (meta?.commentPreview as string) || "";
      return {
        messageText: preview ? `replied: "${preview}"` : "replied to your comment.",
        fallbackHref: `/posts/${notification.postId || ""}`,
      };
    }
    case "MENTION":
      return { messageText: "mentioned you in a post.", fallbackHref: `/posts/${notification.postId || ""}` };
    case "STORY_MENTION":
      return { messageText: "mentioned you in their story.", fallbackHref: "/" };
    case "REPOST":
      return { messageText: "reposted your post.", fallbackHref: `/posts/${notification.postId || ""}` };
    case "QUOTE":
      return { messageText: "quoted your post.", fallbackHref: `/posts/${notification.postId || ""}` };
    case "SHARE":
      return { messageText: "shared your post.", fallbackHref: `/posts/${notification.postId || ""}` };
    case "COLLECTION_SAVE":
      return { messageText: "saved your post to a collection.", fallbackHref: `/posts/${notification.postId || ""}` };
    case "SECURITY_ALERT":
      return { messageText: "Security alert: unusual login detected.", fallbackHref: "/settings" };
    case "PASSWORD_CHANGED":
      return { messageText: "Your password was changed successfully.", fallbackHref: "/settings" };
    case "VERIFICATION_APPROVED":
      return { messageText: "Your verification has been approved! ✓", fallbackHref: `/users/${notification.issuer.username}` };
    case "VERIFICATION_REJECTED":
      return { messageText: "Your verification request was not approved.", fallbackHref: "/settings" };
    case "SYSTEM": {
      const msg = (meta?.message as string) || "System notification.";
      return { messageText: msg, fallbackHref: "/" };
    }
    default:
      return { messageText: "interacted with you.", fallbackHref: "/" };
  }
}

export default function Notification({ notification, isUnread }: NotificationProps) {
  const { messageText, fallbackHref } = getNotificationContent(notification);

  // Use deepLink if available, otherwise fall back to generated href
  const href = notification.deepLink || fallbackHref;

  const postAttachment = notification.post?.attachments?.[0];
  const postImageUrl = postAttachment?.url;

  const renderThumbnailWithBadge = (imageUrl: string | undefined, badgeType: "like" | "comment" | "repost" | "quote" | "mention" | "share" | "save") => {
    const badges: Record<string, React.ReactNode> = {
      like: (
        <div className="absolute -bottom-1.5 -right-1.5 bg-red-500 rounded-full p-1 border-2 border-black shadow-sm flex items-center justify-center">
          <Heart className="size-3.5 text-white fill-white" />
        </div>
      ),
      comment: (
        <div className="absolute -bottom-1.5 -right-1.5 bg-blue-500 rounded-full p-1 border-2 border-black shadow-sm flex items-center justify-center">
          <MessageCircle className="size-3.5 text-white fill-white" />
        </div>
      ),
      repost: (
        <div className="absolute -bottom-1.5 -right-1.5 bg-green-500 rounded-full p-1 border-2 border-black shadow-sm flex items-center justify-center">
          <Repeat2 className="size-3.5 text-white" />
        </div>
      ),
      quote: (
        <div className="absolute -bottom-1.5 -right-1.5 bg-white rounded-full p-1 border-2 border-black shadow-sm flex items-center justify-center">
          <MessageSquareQuote className="size-3.5 text-black" />
        </div>
      ),
      mention: (
        <div className="absolute -bottom-1.5 -right-1.5 bg-orange-500 rounded-full p-1 border-2 border-black shadow-sm flex items-center justify-center">
          <AtSign className="size-3.5 text-white" />
        </div>
      ),
      share: (
        <div className="absolute -bottom-1.5 -right-1.5 bg-sky-500 rounded-full p-1 border-2 border-black shadow-sm flex items-center justify-center">
          <Repeat2 className="size-3.5 text-white" />
        </div>
      ),
      save: (
        <div className="absolute -bottom-1.5 -right-1.5 bg-white rounded-full p-1 border-2 border-black shadow-sm flex items-center justify-center">
          <Bookmark className="size-3.5 text-black fill-black" />
        </div>
      ),
    };

    if (imageUrl) {
      return (
        <Link href={href} className="relative w-[76px] h-[76px] rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 shrink-0 block hover:opacity-90 transition-opacity">
          <img src={imageUrl} className="object-cover w-full h-full" alt="Thumbnail" />
          {badges[badgeType]}
        </Link>
      );
    }

    return (
      <Link href={href} className="relative w-[76px] h-[76px] rounded-xl bg-[#121212] border border-zinc-800 flex items-center justify-center p-2 text-[12px] text-zinc-400 overflow-hidden line-clamp-3 select-none leading-tight shrink-0 block hover:bg-zinc-900 transition-colors">
        {notification.post?.content || ""}
        {badges[badgeType]}
      </Link>
    );
  };

  const renderActionArea = () => {
    switch (notification.type) {
      case "FOLLOW":
      case "FOLLOW_REQUEST":
      case "FOLLOW_ACCEPTED":
        if (notification.issuer.id) {
          // No fake initial state — the hook fetches the real follow status
          return (
            <FollowButton
              userId={notification.issuer.id}
              variant="notification-pill"
            />
          );
        }
        return null;
      case "LIKE":
        return renderThumbnailWithBadge(postImageUrl, "like");
      case "COMMENT":
      case "REPLY":
      case "COMMENT_LIKE":
        return renderThumbnailWithBadge(postImageUrl, "comment");
      case "REPOST":
        return renderThumbnailWithBadge(postImageUrl, "repost");
      case "QUOTE":
        return renderThumbnailWithBadge(postImageUrl, "quote");
      case "MENTION":
      case "STORY_MENTION":
        return renderThumbnailWithBadge(postImageUrl, "mention");
      case "SHARE":
        return renderThumbnailWithBadge(postImageUrl, "share");
      case "COLLECTION_SAVE":
        return renderThumbnailWithBadge(postImageUrl, "save");
      case "SECURITY_ALERT":
      case "PASSWORD_CHANGED":
        return (
          <div className="w-[76px] h-[76px] rounded-xl bg-zinc-900 border border-zinc-850 flex items-center justify-center text-zinc-400 shrink-0">
            <Shield className="size-9 text-red-400" />
          </div>
        );
      case "VERIFICATION_APPROVED":
        return (
          <div className="w-[76px] h-[76px] rounded-xl bg-zinc-900 border border-zinc-850 flex items-center justify-center text-zinc-400 shrink-0">
            <CheckCircle className="size-9 text-blue-400" />
          </div>
        );
      case "SYSTEM":
        return (
          <div className="w-[76px] h-[76px] rounded-xl bg-zinc-900 border border-zinc-850 flex items-center justify-center text-zinc-400 shrink-0">
            <Bell className="size-9 text-zinc-400" />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center justify-between gap-5 px-4 py-4 hover:bg-zinc-900/30 transition-colors bg-black w-full min-h-[110px] relative select-none">
      {/* Unread indicator dot */}
      {isUnread && (
        <div className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-[#0095f6] rounded-full" />
      )}

      {/* Main navigation click triggers */}
      <Link href={href} className={cn("flex items-center gap-5 flex-grow min-w-0", isUnread && "pl-4")}>
        <div className="shrink-0">
          <UserAvatar avatarUrl={notification.issuer.avatarUrl} size={76} className="w-[76px] h-[76px]" />
        </div>
        <div className="flex flex-col justify-center min-w-0">
          <p className="text-[17px] text-white leading-tight break-words">
            <span className="font-semibold text-white hover:underline">{notification.issuer.username}</span>{" "}
            <span className="text-zinc-300">{messageText}</span>{" "}
            <span className="text-zinc-500 font-medium shrink-0 ml-2 whitespace-nowrap text-[14px]">{formatTimeShort(notification.createdAt)}</span>
          </p>
        </div>
      </Link>

      {/* Right side interactive button or post thumbnail */}
      <div className="shrink-0 flex items-center justify-end min-w-[80px]">
        {renderActionArea()}
      </div>
    </div>
  );
}
