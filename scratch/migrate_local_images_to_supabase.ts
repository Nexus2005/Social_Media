import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Simple custom .env parser
function loadEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const firstEq = trimmed.indexOf("=");
    if (firstEq === -1) continue;
    const key = trimmed.slice(0, firstEq).trim();
    let val = trimmed.slice(firstEq + 1).trim();
    // remove surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadEnv();

const prisma = new PrismaClient();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("Missing Supabase credentials in environment variables.");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const uploadDir = path.join(process.cwd(), "public", "uploads", "products");

async function run() {
  console.log("Starting Supabase image migration script...");
  console.log(`Scanning local uploads directory: ${uploadDir}`);

  if (!fs.existsSync(uploadDir)) {
    console.log("Local uploads products directory does not exist.");
    process.exit(0);
  }

  const files = fs.readdirSync(uploadDir);
  console.log(`Found ${files.length} local files in public/uploads/products.`);

  // 1. Upload files to Supabase Storage under "uploads/products/" path
  const filenameToSupabaseUrl: Record<string, string> = {};

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = path.join(uploadDir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) continue;

    const fileBuffer = fs.readFileSync(filePath);
    const storagePath = `uploads/products/${file}`;
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/social-media/${storagePath}`;
    filenameToSupabaseUrl[file.toLowerCase()] = publicUrl;

    console.log(`[${i + 1}/${files.length}] Uploading ${file} to Supabase...`);

    const { error } = await supabaseAdmin.storage
      .from("social-media")
      .upload(storagePath, fileBuffer, {
        contentType: "image/jpeg",
        cacheControl: "31536000",
        upsert: true,
      });

    if (error) {
      console.error(`Error uploading ${file}:`, error.message);
    } else {
      console.log(`Uploaded: ${file} -> ${publicUrl}`);
    }
  }

  console.log("Supabase storage upload completed. Now updating database records...");

  // Helper function to map any path containing a filename to the Supabase URL
  function mapToSupabase(urlStr: string | null | undefined): string | null {
    if (!urlStr) return null;
    
    // Extract filename
    const parts = urlStr.replace(/\\/g, "/").split("/");
    const filename = parts[parts.length - 1];
    
    if (filename && filenameToSupabaseUrl[filename.toLowerCase()]) {
      return filenameToSupabaseUrl[filename.toLowerCase()];
    }
    
    // If it is a relative path starting with /uploads/products/ or uploads/products/ but we didn't upload it,
    // we still try to point it to the supabase path just in case
    if (urlStr.includes("uploads/products")) {
      return `${supabaseUrl}/storage/v1/object/public/social-media/uploads/products/${filename}`;
    }
    
    return urlStr;
  }

  // 2. Update DetectedProduct
  const detectedProducts = await prisma.detectedProduct.findMany({});
  console.log(`Scanning ${detectedProducts.length} DetectedProduct records...`);
  let dpCount = 0;
  for (const dp of detectedProducts) {
    const newThumbnail = mapToSupabase(dp.thumbnailUrl);
    const newCrop = mapToSupabase(dp.cropImageUrl);
    const newSourceFrame = mapToSupabase(dp.sourceFrameUrl);
    
    const newImages = (dp.images || []).map(img => mapToSupabase(img)).filter(Boolean) as string[];

    const hasChanges = 
      newThumbnail !== dp.thumbnailUrl ||
      newCrop !== dp.cropImageUrl ||
      newSourceFrame !== dp.sourceFrameUrl ||
      JSON.stringify(newImages) !== JSON.stringify(dp.images);

    if (hasChanges) {
      await prisma.detectedProduct.update({
        where: { id: dp.id },
        data: {
          thumbnailUrl: newThumbnail,
          cropImageUrl: newCrop,
          sourceFrameUrl: newSourceFrame,
          images: newImages,
        },
      });
      dpCount++;
    }
  }
  console.log(`Updated ${dpCount} DetectedProduct records.`);

  // 3. Update ShoppingMatch
  const shoppingMatches = await prisma.shoppingMatch.findMany({});
  console.log(`Scanning ${shoppingMatches.length} ShoppingMatch records...`);
  let smCount = 0;
  for (const sm of shoppingMatches) {
    const newImage = mapToSupabase(sm.imageUrl);
    const newGallery = (sm.galleryImageUrls || []).map(img => mapToSupabase(img)).filter(Boolean) as string[];

    const hasChanges = 
      newImage !== sm.imageUrl ||
      JSON.stringify(newGallery) !== JSON.stringify(sm.galleryImageUrls);

    if (hasChanges) {
      await prisma.shoppingMatch.update({
        where: { id: sm.id },
        data: {
          imageUrl: newImage,
          galleryImageUrls: newGallery,
        },
      });
      smCount++;
    }
  }
  console.log(`Updated ${smCount} ShoppingMatch records.`);

  // 4. Update ProductVariant
  const productVariants = await prisma.productVariant.findMany({});
  console.log(`Scanning ${productVariants.length} ProductVariant records...`);
  let pvCount = 0;
  for (const pv of productVariants) {
    const newImage = mapToSupabase(pv.imageUrl);

    if (newImage !== pv.imageUrl) {
      await prisma.productVariant.update({
        where: { id: pv.id },
        data: {
          imageUrl: newImage,
        },
      });
      pvCount++;
    }
  }
  console.log(`Updated ${pvCount} ProductVariant records.`);

  console.log("Migration completely finished!");
  process.exit(0);
}

run().catch(err => {
  console.error("Migration failed with error:", err);
  process.exit(1);
});
