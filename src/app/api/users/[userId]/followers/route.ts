import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { notifyFollow, notifyFollowRequest, deleteFollowNotification } from "@/lib/notification-center";

export async function GET(
  req: Request,
  { params: { userId } }: { params: { userId: string } },
) {
  try {
    const { user: loggedInUser } = await validateRequest();

    if (!loggedInUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!userExists) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const followersCount = await prisma.follow.count({
      where: {
        followingId: userId,
        status: "ACCEPTED",
      },
    });

    const followRelation = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: loggedInUser.id,
          followingId: userId,
        },
      },
      select: {
        status: true,
      },
    });

    const followsYouRelation = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: loggedInUser.id,
        },
      },
      select: {
        status: true,
      },
    });

    return Response.json({
      followers: followersCount,
      isFollowedByUser: followRelation?.status === "ACCEPTED",
      status: followRelation?.status || null, // PENDING, ACCEPTED, or null
      followsYou: followsYouRelation?.status === "ACCEPTED",
    });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params: { userId } }: { params: { userId: string } },
) {
  try {
    const { user: loggedInUser } = await validateRequest();

    if (!loggedInUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (loggedInUser.id === userId) {
      return Response.json({ error: "You cannot follow yourself" }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { isPrivate: true },
    });

    if (!targetUser) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const status = targetUser.isPrivate ? "PENDING" : "ACCEPTED";

    await prisma.follow.upsert({
      where: {
        followerId_followingId: {
          followerId: loggedInUser.id,
          followingId: userId,
        },
      },
      create: {
        followerId: loggedInUser.id,
        followingId: userId,
        status,
      },
      update: {
        status,
      },
    });

    // Send notification via centralized notification center
    if (status === "PENDING") {
      notifyFollowRequest(loggedInUser.id, userId, loggedInUser.username).catch(console.error);
    } else {
      notifyFollow(loggedInUser.id, userId, loggedInUser.username).catch(console.error);
    }

    return Response.json({ status });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params: { userId } }: { params: { userId: string } },
) {
  try {
    const { user: loggedInUser } = await validateRequest();

    if (!loggedInUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.follow.deleteMany({
      where: {
        followerId: loggedInUser.id,
        followingId: userId,
      },
    });

    // Remove notification via centralized notification center
    deleteFollowNotification(loggedInUser.id, userId).catch(console.error);

    return new Response();
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
