import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { getUserDataSelect } from "@/lib/types";
import { Suspense } from "react";
import Link from "next/link";
import UserAvatar from "@/components/UserAvatar";
import UserTooltip from "@/components/UserTooltip";
import FollowButton from "@/components/FollowButton";
import { Loader2 } from "lucide-react";
import TrendingAndSportsCard from "@/components/TrendingAndSportsCard";
import SuggestedFollowsCard from "@/components/SuggestedFollowsCard";

export default function SuggestedSidebar() {
  return (
    <div className="sticky top-6 hidden w-[380px] flex-none flex-col gap-6 xl:flex">
      <Suspense fallback={<Loader2 className="mx-auto animate-spin" />}>
        <TrendingSection />
      </Suspense>

      <Suspense fallback={<Loader2 className="mx-auto animate-spin" />}>
        <SuggestionsList />
      </Suspense>
    </div>
  );
}

async function UserProfileCard() {
  const { user } = await validateRequest();
  if (!user) return null;

  return (
    <div className="flex items-center justify-between gap-4 px-1 py-2">
      <Link href={`/users/${user.username}`} className="flex items-center gap-3">
        <UserAvatar avatarUrl={user.avatarUrl} size={44} />
        <div className="flex flex-col text-start">
          <span className="font-bold text-[14px] leading-tight hover:underline text-foreground">
            {user.username}
          </span>
          <span className="text-[14px] leading-none text-muted-foreground">
            {user.displayName}
          </span>
        </div>
      </Link>
      <Link href="/login" className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors">
        Switch
      </Link>
    </div>
  );
}

async function SuggestionsList() {
  const { user } = await validateRequest();
  if (!user) return null;

  // Get up to 5 suggested users that the current user is not following
  const suggestions = await prisma.user.findMany({
    where: {
      NOT: {
        id: user.id,
      },
      followers: {
        none: {
          followerId: user.id,
        },
      },
    },
    select: getUserDataSelect(user.id),
    take: 5,
  });

  if (!suggestions.length) return null;

  return (
    <SuggestedFollowsCard
      initialSuggestions={suggestions as any[]}
      currentUserId={user.id}
    />
  );
}

async function TrendingSection() {
  const { user } = await validateRequest();
  if (!user) return null;

  // Fetch recent posts to extract hashtags dynamically
  const recentPosts = await prisma.post.findMany({
    where: {
      content: {
        contains: "#",
      },
    },
    select: {
      content: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
  });

  const hashtagCounts: Record<string, number> = {};
  recentPosts.forEach((p) => {
    const tags = p.content.match(/#[a-zA-Z0-9_]+/g);
    if (tags) {
      tags.forEach((tag) => {
        hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
      });
    }
  });

  const hashtags = Object.entries(hashtagCounts)
    .map(([hashtag, count]) => ({ hashtag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return <TrendingAndSportsCard hashtags={hashtags} />;
}
