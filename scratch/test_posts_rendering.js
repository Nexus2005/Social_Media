const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Simulated getPostDataInclude
function getPostDataInclude(loggedInUserId) {
  return {
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
  };
}

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log("No user found");
    return;
  }

  const posts = await prisma.post.findMany({
    take: 10,
    include: getPostDataInclude(user.id),
  });

  console.log(`Fetched ${posts.length} posts successfully.`);

  posts.forEach((post, idx) => {
    console.log(`\nValidating Post #${idx + 1} (ID: ${post.id})`);
    try {
      // Check required fields used in Post.tsx
      if (!post.user) throw new Error("post.user is null/undefined");
      console.log(`- Author: @${post.user.username}`);
      
      const imageUrls = post.attachments.filter(a => a.mediaType === "IMAGE").map(a => a.url);
      console.log(`- Image attachments count: ${imageUrls.length}`);
      
      const videoAttachment = post.attachments.find(a => a.mediaType === "VIDEO");
      console.log(`- Has Video attachment: ${!!videoAttachment}`);

      const repostInfo = post.reposts && post.reposts.length > 0 ? post.reposts[0] : null;
      if (repostInfo) {
        if (!repostInfo.user) throw new Error("repostInfo.user is null/undefined");
        console.log(`- Reposted by: ${repostInfo.user.displayName}`);
      }

      if (post.quotedPost) {
        if (!post.quotedPost.user) throw new Error("post.quotedPost.user is null/undefined");
        console.log(`- Quoting: @${post.quotedPost.user.username}`);
      }

      if (post.poll) {
        console.log(`- Poll Options Count: ${post.poll.options.length}`);
      }
      
      console.log("-> VALID");
    } catch (err) {
      console.error(`-> INVALID: ${err.message}`);
    }
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
