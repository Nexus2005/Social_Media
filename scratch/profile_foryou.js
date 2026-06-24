const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log("No user found");
    return;
  }
  console.log("Profiling for User:", user.username);

  // Step 1: Follow query
  let start = Date.now();
  const following = await prisma.follow.findMany({
    where: { followerId: user.id },
    select: { followingId: true },
  });
  const followedUserIds = following.map((f) => f.followingId);
  console.log(`Step 1 (Followers): ${Date.now() - start}ms`);

  // Step 2: Minimal posts fetch
  start = Date.now();
  const postsMinimal = await prisma.post.findMany({
    select: {
      id: true,
      userId: true,
      createdAt: true,
      reposts: {
        select: { id: true }
      },
      views: {
        select: { watchDuration: true, completed: true }
      },
      _count: {
        select: {
          likes: true,
          comments: true,
        }
      },
      videoJob: {
        select: { status: true }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  console.log(`Step 2 (Minimal Posts Fetch): ${Date.now() - start}ms (fetched ${postsMinimal.length} items)`);

  // Step 3: Ranking
  start = Date.now();
  // Simple in-memory filter / ranking simulation
  const rankedIds = postsMinimal.map(p => p.id);
  const paginatedIds = rankedIds.slice(0, 10);
  console.log(`Step 3/4 (Ranking and Pagination): ${Date.now() - start}ms`);

  // Step 5: Full posts fetch
  start = Date.now();
  const getPostDataInclude = (loggedInUserId) => ({
    user: {
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        verified: true,
        role: true,
      },
    },
    attachments: true,
    detectedObjects: true,
    likes: {
      where: {
        userId: loggedInUserId,
      },
      select: {
        userId: true,
      },
    },
    bookmarks: {
      where: {
        userId: loggedInUserId,
      },
      select: {
        userId: true,
      },
    },
    reposts: {
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
    },
    quotedPost: {
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            verified: true,
          },
        },
        attachments: true,
      },
    },
    views: true,
    _count: {
      select: {
        likes: true,
        comments: true,
        reposts: true,
        views: true,
      },
    },
    poll: {
      include: {
        options: {
          include: {
            votes: true,
          },
        },
      },
    },
    videoJob: true,
    detectedProducts: {
      where: {
        confidence: {
          gte: 0.80,
        },
      },
      include: {
        matches: true,
      },
    },
  });

  const fullPosts = await prisma.post.findMany({
    where: {
      id: { in: paginatedIds },
    },
    include: getPostDataInclude(user.id),
  });
  console.log(`Step 5 (Full Posts Fetch): ${Date.now() - start}ms (fetched ${fullPosts.length} items)`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
