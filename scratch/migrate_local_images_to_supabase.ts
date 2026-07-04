import { PrismaClient } from "@prisma/client";
import supabaseAdmin from "../src/lib/supabase";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

async function uploadToSupabase(filePath: string, filename: string): Promise<string | null> {
  if (!fs.existsSync(filePath)) {
    console.log(`[File Not Found] Local file does not exist: ${filePath}`);
    return null;
  }

  try {
    const buffer = await fs.promises.readFile(filePath);
    const destinationKey = `products/migrated/${filename}`;

    const { error } = await supabaseAdmin.storage
      .from("social-media")
      .upload(destinationKey, buffer, {
        contentType: "image/jpeg",
        cacheControl: "31536000",
        upsert: true,
      });

    if (error) {
      console.error(`[Upload Error] Supabase failed to upload ${filename}:`, error.message);
      return null;
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/social-media/${destinationKey}`;
    console.log(`[Success] Uploaded ${filename} -> ${publicUrl}`);
    return publicUrl;
  } catch (err: any) {
    console.error(`[Error] Failed to process file ${filename}:`, err.message);
    return null;
  }
}

async function main() {
  console.log("=== Starting Image Migration to Supabase ===");
  if (!supabaseUrl) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable.");
    return;
  }

  const productsDir = path.join(process.cwd(), "public", "uploads", "products");
  console.log(`Local products upload directory: ${productsDir}`);

  // 1. Migrate DetectedProduct thumbnails
  const localProducts = await prisma.detectedProduct.findMany({
    where: {
      OR: [
        { thumbnailUrl: { contains: "uploads" } },
        { thumbnailUrl: { contains: "Users" } },
      ]
    }
  });

  console.log(`Found ${localProducts.length} DetectedProduct records to migrate.`);
  for (const product of localProducts) {
    if (!product.thumbnailUrl) continue;
    const filename = path.basename(product.thumbnailUrl);
    const localFilePath = path.join(productsDir, filename);

    const publicUrl = await uploadToSupabase(localFilePath, filename);
    if (publicUrl) {
      await prisma.detectedProduct.update({
        where: { id: product.id },
        data: { thumbnailUrl: publicUrl }
      });
      console.log(`Updated DetectedProduct ${product.id} thumbnail.`);
    }
  }

  // 2. Migrate ShoppingMatch image & galleries
  const allMatches = await prisma.shoppingMatch.findMany();
  const matchesToMigrate = allMatches.filter(m => {
    const hasLocalImage = m.imageUrl && (m.imageUrl.includes("uploads") || m.imageUrl.includes("Users"));
    const hasLocalGallery = m.galleryImageUrls && m.galleryImageUrls.some(url => url.includes("uploads") || url.includes("Users"));
    return hasLocalImage || hasLocalGallery;
  });

  console.log(`Found ${matchesToMigrate.length} ShoppingMatch records to migrate.`);
  for (const match of matchesToMigrate) {
    let updatedImageUrl = match.imageUrl;
    let updatedGallery = [...match.galleryImageUrls];
    let changed = false;

    // A. Image Url
    if (match.imageUrl && (match.imageUrl.includes("uploads") || match.imageUrl.includes("Users"))) {
      const filename = path.basename(match.imageUrl);
      const localFilePath = path.join(productsDir, filename);
      const publicUrl = await uploadToSupabase(localFilePath, filename);
      if (publicUrl) {
        updatedImageUrl = publicUrl;
        changed = true;
      }
    }

    // B. Gallery Image Urls
    for (let i = 0; i < updatedGallery.length; i++) {
      const url = updatedGallery[i];
      if (url && (url.includes("uploads") || url.includes("Users"))) {
        const filename = path.basename(url);
        const localFilePath = path.join(productsDir, filename);
        const publicUrl = await uploadToSupabase(localFilePath, filename);
        if (publicUrl) {
          updatedGallery[i] = publicUrl;
          changed = true;
        }
      }
    }

    if (changed) {
      await prisma.shoppingMatch.update({
        where: { id: match.id },
        data: {
          imageUrl: updatedImageUrl,
          galleryImageUrls: updatedGallery
        }
      });
      console.log(`Updated ShoppingMatch ${match.id} images.`);
    }
  }

  console.log("=== Migration Completed ===");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
