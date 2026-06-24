const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log("No user found");
    return;
  }
  console.log("Profiling Optimized for User:", user.username);

  // Step 2: Optimized Minimal posts fetch
  const start = Date.now();
  const postsMinimal = await prisma.post.findMany({
    select: {
      id: true,
      userId: true,
      createdAt: true,
      _count: {
        select: {
          likes: true,
          comments: true,
          reposts: true,
          views: true,
        }
      },
      videoJob: {
        select: { status: true }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  console.log(`Step 2 (Optimized Minimal Posts Fetch): ${Date.now() - start}ms (fetched ${postsMinimal.length} items)`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
