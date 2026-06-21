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

    // 1 & 2. Run followers + minimal posts queries IN PARALLEL
    const [following, postsMinimal] = await Promise.all([
      prisma.follow.findMany({
        where: { followerId: user.id },
        select: { followingId: true },
      }),
      prisma.post.findMany({
        select: {
          id: true,
          userId: true,
          createdAt: true,
          _count: {
            select: {
              likes: true,
              comments: true,
              reposts: true,
              views: true,
            }
          },
          videoJob: {
            select: { status: true }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
    ]);

    const followedUserIds = following.map((f) => f.followingId);

    // 3. Rank posts
    const rankedPosts = FeedRankingService.rankPosts(postsMinimal, user.id, followedUserIds);

    // 4. Custom cursor pagination
    let paginatedPosts = rankedPosts;
    if (cursor) {
      const cursorIndex = rankedPosts.findIndex((p) => p.id === cursor);
      if (cursorIndex !== -1) {
        paginatedPosts = rankedPosts.slice(cursorIndex + 1);
      }
    }

    const nextCursor = paginatedPosts.length > pageSize ? paginatedPosts[pageSize].id : null;
    const paginatedSlice = paginatedPosts.slice(0, pageSize);
    const paginatedIds = paginatedSlice.map((p) => p.id);

    // 5. Fetch full data ONLY for the paginated posts (using lateral JOINs)
    const fullPosts = await prisma.post.findMany({
      relationLoadStrategy: "join",
      where: {
        id: { in: paginatedIds },
      },
      include: getPostDataInclude(user.id),
    });

    // Order fullPosts to match the ranked order
    const orderedPosts = paginatedSlice
      .map((p) => fullPosts.find((fp) => fp.id === p.id))
      .filter(Boolean);

    const data: PostsPage = {
      posts: orderedPosts as any[],
      nextCursor,
    };

    return Response.json(data);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
