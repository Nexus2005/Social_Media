import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Aggregate hashtag stats over a bounded recent window using _count
    // aggregates instead of loading every like/comment/repost row.
    // Trending is inherently a recency signal, so 60 days is plenty.
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const posts = await prisma.post.findMany({
      where: {
        createdAt: { gte: sixtyDaysAgo },
        content: { contains: "#" },
      },
      select: {
        content: true,
        createdAt: true,
        _count: {
          select: {
            likes: true,
            comments: true,
            reposts: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 1000,
    });

    const hashtagStats: Record<string, {
      hashtag: string;
      totalPosts: number;
      likes: number;
      comments: number;
      reposts: number;
      totalEngagement: number;
      recentActivity: number;
    }> = {};

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    for (const post of posts) {
      if (!post.content) continue;

      // Parse hashtags (words starting with # followed by alphanumeric or underscores)
      const hashtags = post.content.match(/#[a-zA-Z0-9_]+/g);
      if (!hashtags) continue;

      // De-duplicate tags per post and normalize to lowercase for aggregation
      const uniqueTags = Array.from(new Set(hashtags.map(t => t.toLowerCase())));

      const likesCount = post._count.likes;
      const commentsCount = post._count.comments;
      const repostsCount = post._count.reposts;

      for (const tag of uniqueTags) {
        if (!hashtagStats[tag]) {
          hashtagStats[tag] = {
            hashtag: tag,
            totalPosts: 0,
            likes: 0,
            comments: 0,
            reposts: 0,
            totalEngagement: 0,
            recentActivity: 0,
          };
        }
        const stats = hashtagStats[tag];
        stats.totalPosts += 1;
        stats.likes += likesCount;
        stats.comments += commentsCount;
        stats.reposts += repostsCount;
        stats.totalEngagement += likesCount + commentsCount + repostsCount;
        if (post.createdAt >= oneWeekAgo) {
          stats.recentActivity += 1;
        }
      }
    }

    // Convert to array and sort by totalPosts descending, then by totalEngagement descending
    const sortedTrends = Object.values(hashtagStats).sort((a, b) => {
      if (b.totalPosts !== a.totalPosts) {
        return b.totalPosts - a.totalPosts;
      }
      return b.totalEngagement - a.totalEngagement;
    });

    return NextResponse.json(sortedTrends, {
      headers: {
        // Same trending data for all users — cache briefly in the browser
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    console.error("Error in trending API route:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
