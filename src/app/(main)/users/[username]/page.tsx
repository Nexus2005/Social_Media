import { validateRequest } from "@/auth";
import FollowButton from "@/components/FollowButton";
import FollowerCount from "@/components/FollowerCount";
import Linkify from "@/components/Linkify";
import UserAvatar from "@/components/UserAvatar";
import prisma from "@/lib/prisma";
import { FollowerInfo, getUserDataSelect, UserData } from "@/lib/types";
import { formatNumber } from "@/lib/utils";
import { formatDate } from "date-fns";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import ProfileHeaderActions from "./ProfileHeaderActions";
import UserPosts from "./UserPosts";
import ProfileFollowsInfo from "./ProfileFollowsInfo";

interface PageProps {
  params: { username: string };
}

const getUser = cache(async (username: string, loggedInUserId: string) => {
  const user = await prisma.user.findFirst({
    where: {
      username: {
        equals: username,
        mode: "insensitive",
      },
    },
    select: getUserDataSelect(loggedInUserId),
  });

  if (!user) notFound();

  return user;
});

export async function generateMetadata({
  params: { username },
}: PageProps): Promise<Metadata> {
  const { user: loggedInUser } = await validateRequest();

  if (!loggedInUser) return {};

  const user = await getUser(username, loggedInUser.id);

  return {
    title: `${user.displayName} (@${user.username})`,
  };
}

export default async function Page({ params: { username } }: PageProps) {
  const { user: loggedInUser } = await validateRequest();

  if (!loggedInUser) {
    return (
      <p className="text-destructive">
        You&apos;re not authorized to view this page.
      </p>
    );
  }

  const user = await getUser(username, loggedInUser.id);

  return (
    <div className="mx-auto w-full max-w-[600px] bg-background border-x border-border/40 min-h-screen pb-14 sm:pb-0">
      <UserProfile user={user} loggedInUserId={loggedInUser.id} />
      <UserPosts userId={user.id} />
    </div>
  );
}

interface UserProfileProps {
  user: UserData;
  loggedInUserId: string;
}

async function UserProfile({ user, loggedInUserId }: UserProfileProps) {
  const followerInfo: FollowerInfo = {
    followers: user._count.followers,
    isFollowedByUser: user.followers.some(
      ({ followerId }) => followerId === loggedInUserId,
    ),
  };

  // Fetch Creator Insights if viewing own profile
  let creatorInsights = null;
  if (user.id === loggedInUserId) {
    const productsDetected = await prisma.detectedProduct.count({
      where: {
        post: {
          userId: user.id,
        },
      },
    });

    const clickAggregate = await prisma.shoppingMatch.aggregate({
      where: {
        detectedProduct: {
          post: {
            userId: user.id,
          },
        },
      },
      _sum: {
        clickCount: true,
      },
    });
    const totalClicks = clickAggregate._sum.clickCount ?? 0;

    const topMatch = await prisma.shoppingMatch.findFirst({
      where: {
        detectedProduct: {
          post: {
            userId: user.id,
          },
        },
      },
      orderBy: {
        clickCount: "desc",
      },
      include: {
        detectedProduct: true,
      },
    });
    const topProduct = topMatch?.detectedProduct?.label || "None yet";

    // Get total views on posts that have detected products
    const shoppablePostsWithViews = await prisma.post.findMany({
      where: {
        userId: user.id,
        detectedProducts: {
          some: {},
        },
      },
      select: {
        _count: {
          select: {
            views: true,
          },
        },
      },
    });
    const totalViews = shoppablePostsWithViews.reduce((acc, p) => acc + p._count.views, 0);
    const ctr = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;

    creatorInsights = {
      productsDetected,
      totalClicks,
      topProduct,
      ctr: ctr.toFixed(1) + "%",
    };
  }

  return (
    <div className="w-full bg-background">
      {/* Twitter/X Style Header Banner */}
      <div className="w-full aspect-[3/1] bg-zinc-800 relative overflow-hidden">
        {user.headerBannerUrl ? (
          <img
            src={user.headerBannerUrl}
            alt="Header Banner"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-zinc-800 to-zinc-900" />
        )}
      </div>

      {/* Avatar & Action Button Row */}
      <div className="px-4 md:px-6 relative flex justify-between items-end mb-4">
        <div className="-mt-[48px] md:-mt-[72px] z-10">
          <UserAvatar
            avatarUrl={user.avatarUrl}
            size={144}
            className="size-24 md:size-36 rounded-full border-4 border-background bg-card object-cover"
          />
        </div>
        <div className="pt-3">
          {user.id === loggedInUserId ? (
            <ProfileHeaderActions user={user} />
          ) : (
            <FollowButton userId={user.id} initialState={followerInfo} />
          )}
        </div>
      </div>

      {/* Metadata Info Stack */}
      <div className="px-4 md:px-6 space-y-3 mb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">{user.displayName}</h1>
          <p className="text-sm text-muted-foreground">@{user.username}</p>
          {user.professionalCategory && (
            <p className="text-xs text-muted-foreground/80 mt-1 font-medium bg-secondary px-2.5 py-0.5 rounded-full w-fit">
              {user.professionalCategory}
            </p>
          )}
        </div>

        {user.bio && (
          <Linkify>
            <p className="text-sm whitespace-pre-line break-words text-foreground/90 leading-relaxed">
              {user.bio}
            </p>
          </Linkify>
        )}

        {/* Info Row: Location, Website, Joined, BirthDate */}
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
          {user.location && (
            <span className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
              </svg>
              <span>{user.location}</span>
            </span>
          )}
          {user.websiteUrl && (
            <span className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
              </svg>
              <a
                href={user.websiteUrl.startsWith("http") ? user.websiteUrl : `https://${user.websiteUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                {user.websiteUrl.replace(/https?:\/\/(www\.)?/, "")}
              </a>
            </span>
          )}
          {user.birthDate && (
            <span className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.01 6 8.936 6 10.026v.374a2 2 0 0 0 .586 1.414l2.5 2.5a2 2 0 0 0 2.828 0l2.5-2.5A2 2 0 0 0 15 10.4v-.374c0-1.09-.845-2.016-1.976-2.11A41.341 41.341 0 0 0 12 8.25Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 13.5v7.5" />
              </svg>
              <span>Born {new Date(user.birthDate).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</span>
            </span>
          )}
          <span className="flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" />
            </svg>
            <span>Joined {formatDate(user.createdAt, "MMMM yyyy")}</span>
          </span>
        </div>

        {/* Stats */}
        <ProfileFollowsInfo
          userId={user.id}
          initialFollowerState={followerInfo}
          initialFollowingCount={user._count.following}
          postsCount={user._count.posts}
        />

        {creatorInsights && (
          <div className="mt-4 p-4 border border-border/40 bg-card/60 backdrop-blur-md rounded-2xl shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <span>📊</span> Creator Insights
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-background/80 p-3.5 rounded-xl border border-border/30 text-center">
                <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">Products</span>
                <span className="text-lg font-black text-foreground">{creatorInsights.productsDetected}</span>
              </div>
              <div className="bg-background/80 p-3.5 rounded-xl border border-border/30 text-center">
                <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">Clicks</span>
                <span className="text-lg font-black text-foreground">{creatorInsights.totalClicks}</span>
              </div>
              <div className="bg-background/80 p-3.5 rounded-xl border border-border/30 text-center col-span-1">
                <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">CTR</span>
                <span className="text-lg font-black text-yellow-500">{creatorInsights.ctr}</span>
              </div>
              <div className="bg-background/80 p-3.5 rounded-xl border border-border/30 text-center col-span-1 min-w-0">
                <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider truncate">Top Product</span>
                <span className="text-xs font-black text-emerald-500 block truncate mt-2" title={creatorInsights.topProduct}>
                  {creatorInsights.topProduct}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

