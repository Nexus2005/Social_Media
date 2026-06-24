const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const posts = await prisma.post.findMany({
    select: {
      id: true,
      createdAt: true,
      videoJob: {
        select: { status: true }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  console.log("Current system time (Date.now()):", new Date().toISOString(), Date.now());

  let nanCount = 0;
  let negativeAgeCount = 0;

  posts.forEach((post, i) => {
    const ageInHours = (Date.now() - new Date(post.createdAt).getTime()) / 3600000;
    const gravity = 1.8;
    const denominator = Math.pow(ageInHours + 2, gravity);
    const score = (10) / denominator;

    if (ageInHours < 0) {
      negativeAgeCount++;
    }
    if (isNaN(score)) {
      nanCount++;
      if (nanCount <= 5) {
        console.log(`Post ID: ${post.id}, createdAt: ${post.createdAt.toISOString()}, ageInHours: ${ageInHours}, denominator: ${denominator}, score: ${score}`);
      }
    }
  });

  console.log("Total Posts:", posts.length);
  console.log("Negative age count:", negativeAgeCount);
  console.log("NaN score count:", nanCount);
}

main().catch(console.error).finally(() => prisma.$disconnect());
