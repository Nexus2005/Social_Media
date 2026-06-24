const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const posts = await prisma.post.findMany({
    where: {
      NOT: {
        userId: {
          startsWith: "user_seed_"
        }
      }
    },
    include: {
      user: {
        select: {
          username: true,
          displayName: true
        }
      }
    }
  });

  console.log("Non-seed posts count:", posts.length);
  posts.forEach(p => {
    console.log(`- Post ID: ${p.id} | User: ${p.user.username} (${p.userId}) | Content: ${p.content.substring(0, 60)}...`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
