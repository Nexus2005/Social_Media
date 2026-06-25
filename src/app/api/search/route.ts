import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { getPostDataInclude, PostsPage } from "@/lib/types";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q") || "";
    const type = req.nextUrl.searchParams.get("type") || "top";
    const cursor = req.nextUrl.searchParams.get("cursor") || undefined;

    const pageSize = 10;

    const { user } = await validateRequest();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (type === "accounts") {
      const users = await prisma.user.findMany({
        where: {
          OR: [
            { username: { contains: q, mode: "insensitive" } },
            { displayName: { contains: q, mode: "insensitive" } },
            { bio: { contains: q, mode: "insensitive" } },
            { location: { contains: q, mode: "insensitive" } },
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
            where: {
              followerId: user.id,
            },
            select: {
              followerId: true,
            },
          },
          following: {
            where: {
              followingId: user.id,
            },
            select: {
              followingId: true,
            },
          },
        },
        take: 50,
      });

      const mapped = users.map((u) => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
        bio: u.bio,
        location: u.location,
        verified: u.verified,
        isFollowing: u.followers.length > 0,
        isFollower: u.following.length > 0,
      }));

      return Response.json({ users: mapped });
    }

    if (type === "products") {
      const products = await prisma.detectedProduct.findMany({
        where: {
          OR: [
            { label: { contains: q, mode: "insensitive" } },
            { category: { contains: q, mode: "insensitive" } },
          ],
        },
        include: {
          matches: {
            orderBy: {
              createdAt: "asc",
            },
          },
        },
        take: 50,
      });

      return Response.json({ products });
    }

    const whereClause: any = {};

    if (q) {
      const parsedQ = q.trim();
      if (parsedQ.startsWith("#")) {
        whereClause.content = {
          contains: parsedQ,
          mode: "insensitive",
        };
      } else {
        whereClause.OR = [
          { content: { contains: q, mode: "insensitive" } },
          { user: { displayName: { contains: q, mode: "insensitive" } } },
          { user: { username: { contains: q, mode: "insensitive" } } },
        ];
      }
    }

    if (type === "photos") {
      whereClause.attachments = {
        some: {
          mediaType: "IMAGE",
        },
      };
    } else if (type === "videos") {
      whereClause.attachments = {
        some: {
          mediaType: "VIDEO",
        },
      };
    } else if (type === "explore") {
      whereClause.attachments = {
        some: {},
      };
    }

    const posts = await prisma.post.findMany({
      where: whereClause,
      include: getPostDataInclude(user.id),
      orderBy: type === "top" ? {
        likes: {
          _count: "desc",
        },
      } : {
        createdAt: "desc",
      },
      take: pageSize + 1,
      cursor: cursor ? { id: cursor } : undefined,
    });

    const nextCursor = posts.length > pageSize ? posts[pageSize].id : null;

    const data: PostsPage = {
      posts: posts.slice(0, pageSize),
      nextCursor,
    };

    return Response.json(data);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
