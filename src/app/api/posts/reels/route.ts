import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { getPostDataInclude, PostsPage } from "@/lib/types";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const cursor = req.nextUrl.searchParams.get("cursor") || undefined;
    const pageSize = 10;

    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch recent 200 reels with minimal fields for status sorting
    const reelsMinimal = await prisma.post.findMany({
      where: {
        attachments: {
          some: {
            mediaType: "VIDEO",
          },
        },
      },
      select: {
        id: true,
        createdAt: true,
        videoJob: {
          select: {
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    // Priority mapping for statuses
    const statusOrder: Record<string, number> = {
      completed: 4,
      processing: 3,
      pending: 2,
      failed: 1,
      no_products: 1,
    };

    const getJobPriority = (post: any) => {
      const status = post.videoJob?.status || "pending";
      return statusOrder[status] || 2;
    };

    // Sort by status priority first, then by createdAt DESC
    const sortedReels = reelsMinimal.sort((a, b) => {
      const priorityA = getJobPriority(a);
      const priorityB = getJobPriority(b);
      
      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }
      
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // 2. Custom cursor pagination
    let paginatedReels = sortedReels;
    if (cursor) {
      const cursorIndex = sortedReels.findIndex((r) => r.id === cursor);
      if (cursorIndex !== -1) {
        paginatedReels = sortedReels.slice(cursorIndex + 1);
      }
    }

    const nextCursor = paginatedReels.length > pageSize ? paginatedReels[pageSize].id : null;
    const paginatedSlice = paginatedReels.slice(0, pageSize);
    const paginatedIds = paginatedSlice.map((r) => r.id);

    // 3. Fetch full data ONLY for the paginated reels
    const fullReels = await prisma.post.findMany({
      relationLoadStrategy: "join",
      where: {
        id: { in: paginatedIds },
      },
      include: getPostDataInclude(user.id),
    });

    // Order fullReels to match the sorted priority order
    const orderedReels = paginatedSlice
      .map((r) => fullReels.find((fr) => fr.id === r.id))
      .filter(Boolean);

    const data: PostsPage = {
      posts: orderedReels as any[],
      nextCursor,
    };

    return Response.json(data);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
