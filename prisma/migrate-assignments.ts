import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting spots data migration to ProductAssignment...");

  // 1. Fetch all detected products with their associated posts
  const detectedProducts = await prisma.detectedProduct.findMany({
    include: {
      post: true,
    },
  });

  console.log(`Found ${detectedProducts.length} detected products to migrate.`);

  let createdCount = 0;
  let updatedOwnerCount = 0;

  for (const product of detectedProducts) {
    if (!product.post) {
      console.warn(`Product ${product.id} does not have a valid associated post.`);
      continue;
    }

    const postId = product.post.id;
    const creatorId = product.post.userId;

    // 2. Set the creatorId on the DetectedProduct itself to establish ownership
    if (product.creatorId !== creatorId) {
      await prisma.detectedProduct.update({
        where: { id: product.id },
        data: { creatorId },
      });
      updatedOwnerCount++;
    }

    // 3. Create or upsert the ProductAssignment record
    const status = product.isVerifiedMatch ? "PUBLISHED" : "PENDING_REVIEW";
    const verificationSource = product.isVerifiedMatch ? "CREATOR_APPROVED" : "AI_DETECTED";

    await prisma.productAssignment.upsert({
      where: {
        postId_productId: {
          postId,
          productId: product.id,
        },
      },
      create: {
        postId,
        productId: product.id,
        status: status as any,
        verificationSource: verificationSource as any,
        sourceType: "AI_DETECTED",
        aiConfidence: product.confidence,
        assignedById: creatorId, // initially assigned by the creator/owner of the post
      },
      update: {
        aiConfidence: product.confidence,
      },
    });

    createdCount++;
  }

  console.log(`Data migration complete.`);
  console.log(`Updated creator ownership for ${updatedOwnerCount} products.`);
  console.log(`Populated/verified ${createdCount} ProductAssignment records.`);
}

main()
  .catch((e) => {
    console.error("Migration script failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
