import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all posts with their likes, comments, and reposts counts
    const posts = await prisma.post.findMany({
      select: {
        content: true,
        createdAt: true,
        likes: { select: { userId: true } },
        comments: { select: { id: true } },
        reposts: { select: { userId: true } },
      },
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
        stats.likes += post.likes.length;
        stats.comments += post.comments.length;
        stats.reposts += post.reposts.length;
        stats.totalEngagement += post.likes.length + post.comments.length + post.reposts.length;
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

    return NextResponse.json(sortedTrends);
  } catch (error) {
    console.error("Error in trending API route:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
