const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const postsMinimal = await prisma.post.findMany({
    select: { id: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  const ids = postsMinimal.map(p => p.id);

  const relations = {
    user: { select: { id: true, username: true } },
    attachments: true,
    detectedObjects: true,
    likes: { select: { userId: true } },
    bookmarks: { select: { userId: true } },
    reposts: { include: { user: { select: { id: true } } } },
    quotedPost: { include: { user: { select: { id: true } }, attachments: true } },
    views: true,
    _count: { select: { likes: true, comments: true, reposts: true, views: true } },
    poll: { include: { options: { include: { votes: true } } } },
    videoJob: true,
    detectedProducts: { include: { matches: true } },
  };

  for (const [name, value] of Object.entries(relations)) {
    const start = Date.now();
    await prisma.post.findMany({
      where: { id: { in: ids } },
      include: { [name]: value },
    });
    console.log(`Relation '${name}' query time: ${Date.now() - start}ms`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
