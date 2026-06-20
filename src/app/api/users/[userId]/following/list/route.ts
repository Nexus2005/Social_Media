import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params: { userId } }: { params: { userId: string } }
) {
  try {
    const { user: loggedInUser } = await validateRequest();
    if (!loggedInUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      include: {
        following: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            bio: true,
            verified: true,
            followers: {
              where: { followerId: loggedInUser.id },
              select: { followerId: true },
            },
            following: {
              where: { followingId: loggedInUser.id },
              select: { followingId: true },
            },
          },
        },
      },
      orderBy: {
        following: {
          username: "asc"
        }
      }
    });

    const list = following.map((f) => {
      const u = f.following;
      return {
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        bio: u.bio,
        verified: u.verified,
        isFollowedByUser: u.followers.length > 0,
        followsYou: u.following.length > 0,
      };
    });

    return NextResponse.json(list);
  } catch (error) {
    console.error("Error in following list route:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
