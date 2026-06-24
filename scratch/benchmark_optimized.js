// Benchmark the optimized for-you feed queries
process.env.POSTGRES_PRISMA_URL = "postgresql://postgres.xpsrieayxkzykxdjbpag:Abhishek%409822067720%23@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres?connection_limit=10";

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({ where: { id: "6iv247knfjko7iyp" } });
  if (!user) { console.log("No user"); return; }
  console.log("Benchmarking for:", user.username);

  const totalStart = Date.now();

  // Step 1+2: Parallel queries
  let start = Date.now();
  const [following, postsMinimal] = await Promise.all([
    prisma.follow.findMany({
      where: { followerId: user.id },
      select: { followingId: true },
    }),
    prisma.post.findMany({
      select: {
        id: true,
        userId: true,
        createdAt: true,
        _count: {
          select: { likes: true, comments: true, reposts: true, views: true }
        },
        videoJob: { select: { status: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);
  console.log(`Step 1+2 (Parallel followers + minimal posts): ${Date.now() - start}ms`);

  // Step 3: Take top 10 IDs  
  const paginatedIds = postsMinimal.slice(0, 10).map(p => p.id);

  // Step 5: Full posts with relationLoadStrategy: join
  start = Date.now();
  const fullPosts = await prisma.post.findMany({
    relationLoadStrategy: "join",
    where: { id: { in: paginatedIds } },
    include: {
      user: { select: { id: true, username: true, displayName: true, avatarUrl: true, verified: true, role: true } },
      attachments: true,
      detectedObjects: true,
      likes: { where: { userId: user.id }, select: { userId: true } },
      bookmarks: { where: { userId: user.id }, select: { userId: true } },
      reposts: { include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } } },
      quotedPost: { include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true, verified: true } }, attachments: true } },
      _count: { select: { likes: true, comments: true, reposts: true, views: true } },
      poll: { include: { options: { include: { votes: true } } } },
      videoJob: true,
      detectedProducts: { where: { confidence: { gte: 0.80 } }, include: { matches: true } },
    },
  });
  console.log(`Step 5 (Full posts with JOIN strategy): ${Date.now() - start}ms (${fullPosts.length} items)`);

  console.log(`\nTOTAL: ${Date.now() - totalStart}ms`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
