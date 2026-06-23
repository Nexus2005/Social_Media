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

    // Find users followed by loggedInUser who also follow target userId
    const mutuals = await prisma.follow.findMany({
      where: {
        followingId: userId,
        follower: {
          followers: {
            some: {
              followerId: loggedInUser.id
            }
          }
        }
      },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          }
        }
      },
      take: 3,
    });

    const totalMutualCount = await prisma.follow.count({
      where: {
        followingId: userId,
        follower: {
          followers: {
            some: {
              followerId: loggedInUser.id
            }
          }
        }
      }
    });

    const list = mutuals.map(m => m.follower);
    return NextResponse.json({
      users: list,
      count: totalMutualCount,
    });
  } catch (error) {
    console.error("Error in mutuals route:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
