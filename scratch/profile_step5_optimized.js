const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log("No user found");
    return;
  }

  const postsMinimal = await prisma.post.findMany({
    select: { id: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  const paginatedIds = postsMinimal.map(p => p.id);

  const getPostDataIncludeOptimized = (loggedInUserId) => ({
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
    // REMOVED views: true
    _count: {
      select: {
        likes: true,
        comments: true,
        reposts: true,
        views: true, // KEEP this to get the view count
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

  const start = Date.now();
  const fullPosts = await prisma.post.findMany({
    where: {
      id: { in: paginatedIds },
    },
    include: getPostDataIncludeOptimized(user.id),
  });
  console.log(`Step 5 (Optimized Full Posts Fetch): ${Date.now() - start}ms (fetched ${fullPosts.length} items)`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
