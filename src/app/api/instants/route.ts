import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Find followings (Users the logged-in user is following)
    const followings = await prisma.follow.findMany({
      where: { followerId: user.id, status: "ACCEPTED" },
      select: { followingId: true },
    });
    const followingIds = followings.map((f) => f.followingId);

    // 2. Find users who have designated the logged-in user as a Close Friend
    const closeFriendsOfOthers = await prisma.closeFriend.findMany({
      where: { friendId: user.id },
      select: { userId: true },
    });
    const whoDesignatedMeCF = closeFriendsOfOthers.map((cf) => cf.userId);

    // 3. Find IDs of instants already viewed by the current user
    const viewed = await prisma.instantView.findMany({
      where: { userId: user.id },
      select: { instantId: true },
    });
    const viewedIds = viewed.map((v) => v.instantId);

    // 4. Fetch instants created in the last 24 hours that are unviewed and matching audience
    const snaps = await prisma.instant.findMany({
      where: {
        id: { notIn: viewedIds },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        OR: [
          {
            senderId: { in: followingIds },
            audience: "FRIENDS",
          },
          {
            senderId: { in: whoDesignatedMeCF },
            audience: "CLOSE_FRIENDS",
          },
        ],
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            verified: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // 5. Group snaps by user
    const groupedMap = new Map<string, { user: any; instants: any[] }>();

    for (const snap of snaps) {
      const senderId = snap.senderId;
      if (!groupedMap.has(senderId)) {
        groupedMap.set(senderId, {
          user: snap.sender,
          instants: [],
        });
      }
      groupedMap.get(senderId)!.instants.push({
        id: snap.id,
        mediaUrl: snap.mediaUrl,
        audience: snap.audience,
        createdAt: snap.createdAt,
      });
    }

    return Response.json(Array.from(groupedMap.values()));
  } catch (error) {
    console.error("Failed to fetch instants:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
