import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";

    if (!query.trim()) {
      return NextResponse.json({ users: [] });
    }

    // Get current user following IDs to compute mutual followers
    const currentFollowing = await prisma.follow.findMany({
      where: { followerId: user.id },
      select: { followingId: true },
    });
    const currentFollowingIds = new Set(currentFollowing.map((f) => f.followingId));

    const matchedUsers = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: query, mode: "insensitive" } },
          { displayName: { contains: query, mode: "insensitive" } },
          { bio: { contains: query, mode: "insensitive" } },
          { location: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        location: true,
        verified: true,
        followers: {
          select: {
            followerId: true,
          },
        },
      },
      take: 50, // Grab a pool of candidates to prioritize
    });

    // In-memory sort prioritizing exact username match, display name match, verified users, mutual followers, and total follower count
    matchedUsers.sort((a, b) => {
      // 1. Exact username match (case-insensitive)
      const aExact = a.username.toLowerCase() === query.toLowerCase() ? 1 : 0;
      const bExact = b.username.toLowerCase() === query.toLowerCase() ? 1 : 0;
      if (aExact !== bExact) return bExact - aExact;

      // 2. Prefix username match
      const aPrefix = a.username.toLowerCase().startsWith(query.toLowerCase()) ? 1 : 0;
      const bPrefix = b.username.toLowerCase().startsWith(query.toLowerCase()) ? 1 : 0;
      if (aPrefix !== bPrefix) return bPrefix - aPrefix;

      // 3. Prefix display name match
      const aDispPrefix = a.displayName.toLowerCase().startsWith(query.toLowerCase()) ? 1 : 0;
      const bDispPrefix = b.displayName.toLowerCase().startsWith(query.toLowerCase()) ? 1 : 0;
      if (aDispPrefix !== bDispPrefix) return bDispPrefix - aDispPrefix;

      // 4. Verified users
      const aVerified = a.verified ? 1 : 0;
      const bVerified = b.verified ? 1 : 0;
      if (aVerified !== bVerified) return bVerified - aVerified;

      // 5. Mutual followers
      const aMutual = a.followers.filter((f) => currentFollowingIds.has(f.followerId)).length;
      const bMutual = b.followers.filter((f) => currentFollowingIds.has(f.followerId)).length;
      if (aMutual !== bMutual) return bMutual - aMutual;

      // 6. Total followers count
      return b.followers.length - a.followers.length;
    });

    return NextResponse.json({ users: matchedUsers.slice(0, 8) });
  } catch (error) {
    console.error("Error in search autocomplete route:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
