const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const spotCount = await prisma.post.count({
    where: { contentFormat: "SPOT" }
  });
  const feedCount = await prisma.post.count({
    where: { contentFormat: "FEED" }
  });
  console.log("=== POST FORMATS ===");
  console.log("SPOT (Reels) posts:", spotCount);
  console.log("FEED posts:", feedCount);

  if (spotCount > 0) {
    const spots = await prisma.post.findMany({
      where: { contentFormat: "SPOT" },
      take: 5
    });
    console.log("=== SPOTS SAMPLE ===");
    spots.forEach(s => console.log(`- ID: ${s.id}, content: ${s.content.substring(0, 50)}...`));
  } else {
    console.log("No SPOT posts in DB! Showing first 5 posts:");
    const posts = await prisma.post.findMany({ take: 5 });
    posts.forEach(p => console.log(`- ID: ${p.id}, format: ${p.contentFormat}, content: ${p.content.substring(0, 50)}...`));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
