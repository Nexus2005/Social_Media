const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const nonSeedUsers = await prisma.user.findMany({
    where: {
      NOT: {
        id: {
          startsWith: "user_seed_"
        }
      }
    },
    select: {
      id: true,
      username: true,
      displayName: true,
      email: true,
      _count: {
        select: {
          posts: true,
        }
      }
    }
  });

  console.log("Non-seed users count:", nonSeedUsers.length);
  nonSeedUsers.forEach(u => {
    console.log(`- ID: ${u.id} | Username: ${u.username} | Display Name: ${u.displayName} | Email: ${u.email} | Posts: ${u._count.posts}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
