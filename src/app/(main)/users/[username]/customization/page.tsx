import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { getUserDataSelect } from "@/lib/types";
import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import CustomizationClient from "./CustomizationClient";

interface PageProps {
  params: { username: string };
}

export async function generateMetadata({
  params: { username },
}: PageProps): Promise<Metadata> {
  return {
    title: "Channel customization - Cartly Studio",
  };
}

export default async function Page({ params: { username } }: PageProps) {
  const { user: loggedInUser } = await validateRequest();

  if (!loggedInUser) {
    redirect("/login");
  }

  // Ensure user can only edit their own profile
  if (loggedInUser.username.toLowerCase() !== username.toLowerCase()) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-4">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Unauthorized</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">You are not authorized to customize this channel.</p>
      </div>
    );
  }

  const user = await prisma.user.findFirst({
    where: {
      username: {
        equals: username,
        mode: "insensitive",
      },
    },
    select: getUserDataSelect(loggedInUser.id),
  });

  if (!user) {
    notFound();
  }

  return (
    <CustomizationClient user={user} />
  );
}
