const { PrismaClient } = require("@prisma/client");

// Note: To use relation joins in javascript directly, we need to regenerate prisma client with relationJoins preview feature enabled.
// Let's first test if it works with the current client or if it throws.
async function main() {
  const prisma = new PrismaClient();
  const postsMinimal = await prisma.post.findMany({
    select: { id: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  const ids = postsMinimal.map(p => p.id);

  console.log("Testing full posts query with relationLoadStrategy: 'join'...");
  try {
    const start = Date.now();
    const fullPosts = await prisma.post.findMany({
      where: {
        id: { in: ids },
      },
      relationLoadStrategy: "join",
      include: {
        user: {
          select: { id: true, username: true }
        },
        attachments: true,
      }
    });
    console.log(`Relation Joins query time: ${Date.now() - start}ms (fetched ${fullPosts.length} items)`);
  } catch (err) {
    console.log("Joins not supported in current client:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
