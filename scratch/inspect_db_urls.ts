import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Inspecting Database URLs ===");

  // 1. DetectedProduct
  const localProducts = await prisma.detectedProduct.findMany({
    where: {
      OR: [
        { thumbnailUrl: { contains: "uploads" } },
        { thumbnailUrl: { contains: "Users" } },
        { cropImageUrl: { contains: "uploads" } },
        { cropImageUrl: { contains: "Users" } },
        { sourceFrameUrl: { contains: "uploads" } },
        { sourceFrameUrl: { contains: "Users" } },
      ]
    }
  });
  console.log(`Found ${localProducts.length} DetectedProduct records with local URLs`);
  if (localProducts.length > 0) {
    console.log("Sample local DetectedProduct urls:", localProducts.slice(0, 5).map(p => ({
      id: p.id,
      thumbnail: p.thumbnailUrl,
      crop: p.cropImageUrl,
      frame: p.sourceFrameUrl
    })));
  }

  // 2. ShoppingMatch
  const allMatches = await prisma.shoppingMatch.findMany();
  const localMatches = allMatches.filter(m => {
    const hasLocalImage = m.imageUrl && (m.imageUrl.includes("uploads") || m.imageUrl.includes("Users"));
    const hasLocalGallery = m.galleryImageUrls && m.galleryImageUrls.some(url => url.includes("uploads") || url.includes("Users"));
    return hasLocalImage || hasLocalGallery;
  });
  console.log(`Found ${localMatches.length} ShoppingMatch records with local URLs`);
  if (localMatches.length > 0) {
    console.log("Sample local ShoppingMatch urls:", localMatches.slice(0, 5).map(m => ({
      id: m.id,
      imageUrl: m.imageUrl,
      gallery: m.galleryImageUrls
    })));
  }

  // 3. Media (Post attachments)
  const localMedia = await prisma.media.findMany({
    where: {
      OR: [
        { url: { contains: "uploads" } },
        { url: { contains: "Users" } },
      ]
    }
  });
  console.log(`Found ${localMedia.length} Media records with local URLs`);
  if (localMedia.length > 0) {
    console.log("Sample local Media urls:", localMedia.slice(0, 5).map(m => ({
      id: m.id,
      url: m.url
    })));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
