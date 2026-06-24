const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const postsMinimal = await prisma.post.findMany({
    select: { id: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  const ids = postsMinimal.map(p => p.id);

  console.log("Warm-up query completed. Running 5 consecutive queries...");

  for (let i = 0; i < 5; i++) {
    const start = Date.now();
    await prisma.post.findMany({
      where: { id: { in: ids } },
    });
    console.log(`Query ${i + 1} time: ${Date.now() - start}ms`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
