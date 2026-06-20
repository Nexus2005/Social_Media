import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { getPostDataInclude, PostsPage } from "@/lib/types";
import { FeedRankingService } from "@/services/FeedRankingService";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const cursor = req.nextUrl.searchParams.get("cursor") || undefined;
    const pageSize = 10;

    const { user } = await validateRequest();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch followed users for affinity score
    const following = await prisma.follow.findMany({
      where: { followerId: user.id },
      select: { followingId: true },
    });
    const followedUserIds = following.map((f) => f.followingId);

    // 2. Fetch recent 200 posts to rank
    const posts = await prisma.post.findMany({
      include: getPostDataInclude(user.id),
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    // 3. Rank posts
    const rankedPosts = FeedRankingService.rankPosts(posts, user.id, followedUserIds);

    // 4. Custom cursor pagination
    let paginatedPosts = rankedPosts;
    if (cursor) {
      const cursorIndex = rankedPosts.findIndex((p) => p.id === cursor);
      if (cursorIndex !== -1) {
        paginatedPosts = rankedPosts.slice(cursorIndex + 1);
      }
    }

    const nextCursor = paginatedPosts.length > pageSize ? paginatedPosts[pageSize].id : null;

    const data: PostsPage = {
      posts: paginatedPosts.slice(0, pageSize),
      nextCursor,
    };

    return Response.json(data);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
