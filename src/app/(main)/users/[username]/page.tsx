import { validateRequest } from "@/auth";
import FollowButton from "@/components/FollowButton";
import UserAvatar from "@/components/UserAvatar";
import prisma from "@/lib/prisma";
import { FollowerInfo, getUserDataSelect, UserData } from "@/lib/types";
import { Metadata } from "next";
import Link from "next/link";
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
    <div className="mx-auto w-full max-w-[600px] bg-black border-x border-[#1A1A1A] min-h-screen pb-14 sm:pb-0">
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

  return (
    <div className="w-full bg-black p-4 md:p-6 flex flex-col gap-4 border-b border-[#1A1A1A]">
      {/* Row 1: Left: Avatar (96px mobile, 120px desktop). Right: Stats Row */}
      <div className="flex items-center justify-between gap-6">
        <div className="shrink-0">
          <UserAvatar
            avatarUrl={user.avatarUrl}
            size={120}
            className="w-24 h-24 md:w-[120px] md:h-[120px] rounded-full border border-zinc-800 bg-zinc-900 object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <ProfileFollowsInfo
            userId={user.id}
            username={user.username}
            initialFollowerState={followerInfo}
            initialFollowingCount={user._count.following}
            postsCount={user._count.posts}
          />
        </div>
      </div>

      {/* Row 2: Bio details */}
      <div className="space-y-1 mt-1">
        <h1 className="text-[18px] font-bold text-white tracking-tight leading-none">
          {user.displayName}
        </h1>
        <p className="text-[14px] text-zinc-400 font-normal">@{user.username}</p>
        
        {user.professionalCategory && (
          <p className="text-[14px] text-zinc-400 font-normal bg-zinc-900 px-2.5 py-0.5 rounded-md w-fit mt-1">
            {user.professionalCategory}
          </p>
        )}

        {user.bio && (
          <p className="text-[16px] text-zinc-200 whitespace-pre-line break-words leading-normal mt-2">
            {user.bio}
          </p>
        )}

        {/* Info Items: Location, Website, Joined */}
        <div className="flex flex-col gap-1 mt-2.5 text-[14px] text-zinc-400 font-normal">
          {user.location && (
            <span className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4 text-zinc-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
              </svg>
              <span>{user.location}</span>
            </span>
          )}
          {user.websiteUrl && (
            <span className="flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4 text-zinc-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
              </svg>
              <a
                href={user.websiteUrl.startsWith("http") ? user.websiteUrl : `https://${user.websiteUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-400 hover:underline"
              >
                {user.websiteUrl.replace(/https?:\/\/(www\.)?/, "")}
              </a>
            </span>
          )}
        </div>
      </div>

      {/* Row 3: Action Buttons */}
      {user.id === loggedInUserId ? (
        <div className="space-y-2 mt-2 w-full">
          <ProfileHeaderActions user={user} />
          <Link
            href="/creator"
            className="w-full text-center block h-9 leading-[36px] rounded-[10px] bg-[#262626] hover:bg-zinc-800 text-white text-xs font-semibold transition-colors border-0"
          >
            Professional Dashboard
          </Link>
        </div>
      ) : (
        <div className="mt-2 w-full">
          <FollowButton userId={user.id} initialState={followerInfo} />
        </div>
      )}
    </div>
  );
}
