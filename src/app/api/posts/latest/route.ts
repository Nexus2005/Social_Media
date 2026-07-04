import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { getPostDataInclude, PostsPage } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const cursor = req.nextUrl.searchParams.get("cursor") || undefined;
    const pageSize = 10;

    const { user } = await validateRequest();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const posts = await prisma.post.findMany({
      relationLoadStrategy: "join",
      where: {},
      include: getPostDataInclude(user.id),
      orderBy: { createdAt: "desc" },
      take: pageSize + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
    });

    const nextCursor = posts.length > pageSize ? posts[pageSize].id : null;
    const postsSlice = posts.slice(0, pageSize);

    const data: PostsPage = {
      posts: postsSlice,
      nextCursor,
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in latest posts API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
