import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { user: loggedInUser } = await validateRequest();
    if (!loggedInUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Fetch stories of user themselves or users they follow, created in the last 24 hours
    const stories = await prisma.story.findMany({
      where: {
        createdAt: {
          gt: twentyFourHoursAgo,
        },
        OR: [
          { userId: loggedInUser.id },
          {
            user: {
              followers: {
                some: {
                  followerId: loggedInUser.id,
                },
              },
            },
          },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Group stories by user
    const groupedStoriesMap = new Map<string, { user: any; stories: any[] }>();

    for (const story of stories) {
      const userId = story.userId;
      if (!groupedStoriesMap.has(userId)) {
        groupedStoriesMap.set(userId, {
          user: story.user,
          stories: [],
        });
      }
      groupedStoriesMap.get(userId)!.stories.push({
        id: story.id,
        mediaUrl: story.mediaUrl,
        mediaType: story.mediaType,
        createdAt: story.createdAt,
      });
    }

    // Convert map values to array
    const groupedStories = Array.from(groupedStoriesMap.values());

    return Response.json(groupedStories);
  } catch (error) {
    console.error("Fetch stories error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { user: loggedInUser } = await validateRequest();
    if (!loggedInUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { mediaUrl, mediaType } = await req.json();

    if (!mediaUrl || !mediaType) {
      return Response.json({ error: "Missing required parameters" }, { status: 400 });
    }

    if (mediaType !== "IMAGE" && mediaType !== "VIDEO") {
      return Response.json({ error: "Invalid media type" }, { status: 400 });
    }

    const newStory = await prisma.story.create({
      data: {
        userId: loggedInUser.id,
        mediaUrl,
        mediaType,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    return Response.json(newStory);
  } catch (error) {
    console.error("Create story error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
