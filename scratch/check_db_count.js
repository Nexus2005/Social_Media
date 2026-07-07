const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const userCount = await prisma.user.count();
  const postCount = await prisma.post.count();
  const sessionCount = await prisma.session.count();
  
  console.log("=== DB COUNTS ===");
  console.log("Users:", userCount);
  console.log("Posts:", postCount);
  console.log("Sessions:", sessionCount);

  const users = await prisma.user.findMany({ take: 5 });
  console.log("=== USERS IN DB ===");
  users.forEach(u => console.log(`- Username: ${u.username}, ID: ${u.id}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
