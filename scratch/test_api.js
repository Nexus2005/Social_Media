const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.time("db-query");
  
  // Test basic connection
  const userCount = await prisma.user.count();
  console.log("Users:", userCount);
  
  // Test the exact query the for-you feed does
  const posts = await prisma.post.findMany({
    select: {
      id: true,
      userId: true,
      createdAt: true,
      content: true,
      _count: {
        select: {
          likes: true,
          comments: true,
          reposts: true,
          views: true,
        }
      },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  
  console.log("\n=== POSTS ===");
  console.log("Total posts found:", posts.length);
  posts.forEach(p => {
    console.log(`- [${p.id}] by ${p.userId}: "${p.content.substring(0, 50)}..." (likes: ${p._count.likes}, comments: ${p._count.comments})`);
  });
  
  // Test session
  const sessions = await prisma.session.findMany({ take: 3 });
  console.log("\n=== SESSIONS ===");
  sessions.forEach(s => {
    console.log(`- Session ${s.id} for user ${s.userId}, expires: ${s.expiresAt}`);
  });
  
  console.timeEnd("db-query");
}

main().catch(e => {
  console.error("ERROR:", e.message);
}).finally(() => prisma.$disconnect());
