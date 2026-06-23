import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import FollowingClient from "./FollowingClient";
import { Metadata } from "next";

interface PageProps {
  params: { username: string };
}

export async function generateMetadata({
  params: { username },
}: PageProps): Promise<Metadata> {
  return {
    title: `People followed by ${username}`,
  };
}

export default async function Page({ params: { username } }: PageProps) {
  const { user: loggedInUser } = await validateRequest();

  if (!loggedInUser) {
    return (
      <p className="text-destructive p-4">
        You&apos;re not authorized to view this page.
      </p>
    );
  }

  // Fetch the profile user's ID
  const profileUser = await prisma.user.findFirst({
    where: {
      username: {
        equals: username,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      username: true,
      displayName: true,
    },
  });

  if (!profileUser) notFound();

  return (
    <div className="mx-auto w-full max-w-[600px] bg-black border-x border-[#1A1A1A] min-h-screen text-white pb-14 sm:pb-0">
      <FollowingClient
        profileUserId={profileUser.id}
        profileUsername={profileUser.username}
        profileDisplayName={profileUser.displayName}
      />
    </div>
  );
}
