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
import EditProfileButton from "./EditProfileButton";
import UserPosts from "./UserPosts";

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
    <div className="mx-auto w-full max-w-[600px] space-y-0 sm:space-y-5 px-0 sm:px-4 py-0 sm:py-6">
      <UserProfile user={user} loggedInUserId={loggedInUser.id} />
      {/* Posts header — hidden on mobile, shown on desktop */}
      <div className="hidden sm:block rounded-2xl bg-card p-5 shadow-sm border border-border/40">
        <h2 className="text-center text-2xl font-bold">
          {user.displayName}&apos;s posts
        </h2>
      </div>
      {/* Mobile tab separator */}
      <div className="sm:hidden border-t border-border/40" />
      <div className="px-0 sm:px-0">
        <UserPosts userId={user.id} />
      </div>
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

  return (
    <>
      {/* Desktop Profile Card (hidden on mobile) */}
      <div className="hidden sm:block h-fit w-full space-y-5 rounded-2xl bg-card p-5 shadow-sm">
        <UserAvatar
          avatarUrl={user.avatarUrl}
          size={250}
          className="mx-auto size-full max-h-60 max-w-60 rounded-full"
        />
        <div className="flex flex-wrap gap-3 sm:flex-nowrap">
          <div className="me-auto space-y-3">
            <div>
              <h1 className="text-3xl font-bold">{user.displayName}</h1>
              <div className="text-muted-foreground">@{user.username}</div>
            </div>
            <div>Member since {formatDate(user.createdAt, "MMM d, yyyy")}</div>
            <div className="flex items-center gap-3">
              <span>
                Posts:{" "}
                <span className="font-semibold">
                  {formatNumber(user._count.posts)}
                </span>
              </span>
              <FollowerCount userId={user.id} initialState={followerInfo} />
            </div>
          </div>
          {user.id === loggedInUserId ? (
            <EditProfileButton user={user} />
          ) : (
            <FollowButton userId={user.id} initialState={followerInfo} />
          )}
        </div>
        {user.bio && (
          <>
            <hr />
            <Linkify>
              <div className="overflow-hidden whitespace-pre-line break-words">
                {user.bio}
              </div>
            </Linkify>
          </>
        )}
      </div>

      {/* Mobile Profile Header (hidden on desktop) */}
      <div className="sm:hidden px-4 pt-4 pb-2 space-y-3">
        {/* Top row: Avatar left, username + button right */}
        <div className="flex items-center gap-4">
          <UserAvatar
            avatarUrl={user.avatarUrl}
            size={80}
            className="size-20 rounded-full flex-shrink-0"
          />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 justify-between">
              <h1 className="text-lg font-bold truncate">{user.username}</h1>
              {user.id === loggedInUserId ? (
                <EditProfileButton user={user} />
              ) : (
                <FollowButton userId={user.id} initialState={followerInfo} />
              )}
            </div>
          </div>
        </div>

        {/* Display name & bio */}
        <div className="space-y-1">
          <p className="text-sm font-semibold">{user.displayName}</p>
          {user.bio && (
            <Linkify>
              <p className="text-sm whitespace-pre-line break-words text-foreground/90">
                {user.bio}
              </p>
            </Linkify>
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-around py-2 border-t border-border/40">
          <div className="flex flex-col items-center">
            <span className="font-bold text-base">{formatNumber(user._count.posts)}</span>
            <span className="text-xs text-muted-foreground">posts</span>
          </div>
          <div className="flex flex-col items-center">
            <FollowerCount userId={user.id} initialState={followerInfo} />
          </div>
          <div className="flex flex-col items-center">
            <span className="font-bold text-base">—</span>
            <span className="text-xs text-muted-foreground">following</span>
          </div>
        </div>
      </div>
    </>
  );
}

