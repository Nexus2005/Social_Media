import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { getPostDataInclude, PostsPage } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params: { hashtag } }: { params: { hashtag: string } }
) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const type = req.nextUrl.searchParams.get("type") || "latest";
    const cursor = req.nextUrl.searchParams.get("cursor") || undefined;
    const pageSize = 10;

    const normalizedHashtag = `#${hashtag.toLowerCase()}`;

    // Get stats for this hashtag
    const allPostsWithHashtag = await prisma.post.findMany({
      where: {
        content: {
          contains: normalizedHashtag,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        createdAt: true,
        likes: { select: { userId: true } },
        comments: { select: { id: true } },
        reposts: { select: { userId: true } },
      },
    });

    const totalPosts = allPostsWithHashtag.length;
    const likesCount = allPostsWithHashtag.reduce((sum, p) => sum + p.likes.length, 0);
    const commentsCount = allPostsWithHashtag.reduce((sum, p) => sum + p.comments.length, 0);
    const repostsCount = allPostsWithHashtag.reduce((sum, p) => sum + p.reposts.length, 0);
    const totalEngagement = likesCount + commentsCount + repostsCount;

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentActivityCount = allPostsWithHashtag.filter(
      (p) => p.createdAt >= oneDayAgo
    ).length;

    const trendingScore = totalPosts * 10 + totalEngagement * 2 + recentActivityCount * 5;

    // Build the query where clause
    const whereClause: any = {
      content: {
        contains: normalizedHashtag,
        mode: "insensitive",
      },
    };

    if (type === "media") {
      whereClause.attachments = {
        some: {},
      };
    } else if (type === "videos") {
      whereClause.attachments = {
        some: {
          mediaType: "VIDEO",
        },
      };
    }

    // Determine ordering
    let orderBy: any = { createdAt: "desc" };
    if (type === "top") {
      orderBy = {
        likes: {
          _count: "desc",
        },
      };
    }

    const posts = await prisma.post.findMany({
      where: whereClause,
      include: getPostDataInclude(user.id),
      orderBy,
      take: pageSize + 1,
      cursor: cursor ? { id: cursor } : undefined,
    });

    const nextCursor = posts.length > pageSize ? posts[pageSize].id : null;

    return NextResponse.json({
      posts: posts.slice(0, pageSize),
      nextCursor,
      stats: {
        totalPosts,
        recentActivityCount,
        trendingScore,
      },
    });
  } catch (error) {
    console.error("Error in hashtag API route:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
