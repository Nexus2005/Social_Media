const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$queryRaw`SELECT * FROM _prisma_migrations ORDER BY applied_steps_count DESC`;
  console.log(result);
}

main().catch(console.error).finally(() => prisma.$disconnect());
