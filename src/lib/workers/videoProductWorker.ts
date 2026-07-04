/**
 * Cartly v3 — Video Product Worker
 *
 * Complete 20-stage pipeline orchestrator.
 *
 * Pipeline:
 *  1.  DetectionSession creation (per-reel isolation)
 *  2.  Download video
 *  3.  Intelligent frame extraction
 *  4.  Per-frame YOLO detection (shoppable classes only)
 *  5.  Frame Fusion — track objects across frames
 *  6.  Crop Quality Filter — skip bad crops
 *  7.  Brand/Logo Detection (BEFORE OCR)
 *  8.  OCR (informed by brand)
 *  9.  Barcode (bonus only)
 * 10.  Visual Attributes
 * 11.  Confidence Scoring (detection + marketplace separate)
 * 12.  Multi-Query Product Resolver (4 variants per product)
 * 13.  Query Cache check
 * 14.  Parallel Marketplace Search (Promise.all across queries × providers)
 * 15.  Title Cleaner (remove spam)
 * 16.  Marketplace Verification Engine (score each result)
 * 17.  Product Knowledge Graph (rank within families)
 * 18.  Decision: verification ≥ 0.75? Accept. Otherwise → Gemini → re-search → re-verify
 * 19.  Duplicate Product Merger (1 product, N sellers)
 * 20.  Persist to DB (detection layer + marketplace layer + timeline)
 */

import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import crypto from "crypto";
import { spawn } from "child_process";
import { extractFramesFromVideo } from "../videoProcessor";
import { SearchManager } from "../marketplace/searchManager";
import { getOrCreateCanonicalProduct } from "../marketplace/productNormalizer";
import { extractProductMetadata } from "../marketplace/metadataExtractor";
import { VisionProviderManager } from "../ai/visionProviderManager";
import {
  detectObjectsInFrame,
  cropObjectFromFrame,
  collectCropEvidence,
  CropEvidence,
} from "../detection/detectionPipeline";
import { resolveQueries, ResolverResult } from "../detection/productResolver";
import {
  fuseFrameDetections,
  filterTrackedObjects,
  FrameDetection,
  TrackedObject,
} from "../detection/frameFusion";
import { assessCropQuality } from "../detection/cropQualityFilter";
import { mergeProducts, MergedProduct } from "../detection/duplicateMerger";
import { selectBestMatch } from "../detection/productKnowledgeGraph";
import { verifyMarketplaceResults, isVerificationSufficient } from "../marketplace/verificationEngine";
import { cleanMarketplaceTitle } from "../marketplace/titleCleaner";
import { VerifiedMatch, MarketplaceProduct } from "../marketplace/types";

// ─── Environment Loading ──────────────────────────────────────────────────────

function loadEnv() {
  try {
    const envPath = path.join(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, "utf-8").split("\n");
      for (const line of lines) {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?$/);
        if (match) {
          const key = match[1];
          let value = match[2] || "";
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
          }
          process.env[key] = value;
        }
      }
    }
  } catch (e) {
    console.error("Failed to load .env:", e);
  }
}
loadEnv();

const prisma = new PrismaClient();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing Supabase configuration environment variables.");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ─── Category Mapping ─────────────────────────────────────────────────────────

const CATEGORY_MAP: Record<string, string[]> = {
  "👕 Clothing & Apparel": [
    "clothing", "shirt", "t-shirt", "top", "dress", "pants", "shorts", "skirt",
    "jacket", "coat", "suit", "jeans", "hoodie", "sweater", "blouse",
  ],
  "👟 Footwear": [
    "shoe", "shoes", "sneaker", "sneakers", "boot", "boots", "sandal", "sandals",
    "heels", "slipper", "slippers",
  ],
  "👜 Bags & Luggage": [
    "bag", "handbag", "backpack", "suitcase", "purse", "tote", "clutch", "wallet",
  ],
  "⌚ Watches & Jewelry": [
    "watch", "smartwatch", "ring", "necklace", "bracelet", "earring", "jewelry", "jewellery",
  ],
  "🕶️ Eyewear & Accessories": [
    "sunglasses", "glasses", "tie", "belt", "hat", "cap", "umbrella",
  ],
  "📱 Electronics": [
    "phone", "cell phone", "laptop", "tablet", "keyboard", "mouse", "monitor", "tv",
    "headphones", "earphones", "speaker", "camera", "remote",
  ],
  "🪑 Furniture & Home": [
    "chair", "couch", "sofa", "bed", "table", "dining table", "vase", "clock",
  ],
  "🍶 Kitchen & Drinkware": [
    "bottle", "cup", "mug", "wine glass", "bowl",
  ],
  "💄 Beauty & Cosmetics": [
    "perfume", "lipstick", "foundation", "cosmetics",
  ],
  "📚 Books & Stationery": ["book", "scissors"],
  "🎿 Sports & Outdoors": [
    "sports ball", "tennis racket", "skateboard", "surfboard",
    "snowboard", "skis", "bicycle", "motorcycle",
  ],
};

function getCategoryForLabel(label: string): string {
  const lowercase = label.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_MAP)) {
    if (keywords.some((kw) => lowercase.includes(kw))) return category;
  }
  return "👕 Clothing & Apparel";
}

// ─── Utility Helpers ──────────────────────────────────────────────────────────

function parsePriceToFloat(priceStr: string): number | null {
  if (!priceStr) return null;
  const cleaned = priceStr.replace(/[^0-9.]/g, "");
  const val = parseFloat(cleaned);
  return isNaN(val) ? null : val;
}

function generateAffiliateUrl(urlStr: string): string | null {
  if (!urlStr) return null;
  try {
    const url = new URL(urlStr);
    if (url.hostname.includes("amazon.")) {
      url.searchParams.set("tag", "omkarstore086-21");
      return url.toString();
    }
  } catch { /* not a valid URL */ }
  return urlStr;
}

// ─── Gemini Vision (Last Resort) ──────────────────────────────────────────────

interface GeminiCropStructuredResult {
  category: string;
  subcategory: string;
  gender: string;
  color: string;
  neckline: string;
  sleeve: string;
  fit: string;
  pattern: string;
  material: string;
  brand: string;
  confidence: number;
}

async function downloadProductImage(url: string, destPath: string): Promise<boolean> {
  try {
    const res = await fetch(url);
    if (!res.ok) return false;
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    await fs.promises.writeFile(destPath, buffer);
    return true;
  } catch (err) {
    console.error(`[ImageDownloader] Failed downloading ${url}:`, err);
    return false;
  }
}

async function limitConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker(): Promise<void> {
    while (index < items.length) {
      const currentIndex = index++;
      results[currentIndex] = await fn(items[currentIndex], currentIndex);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function computeDHash(buffer: Buffer): Promise<string> {
  try {
    const raw = await sharp(buffer)
      .resize(9, 8, { fit: "fill" })
      .grayscale()
      .raw()
      .toBuffer();
    
    let hash = "";
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const left = raw[row * 9 + col];
        const right = raw[row * 9 + col + 1];
        hash += left < right ? "1" : "0";
      }
    }
    let hex = "";
    for (let i = 0; i < hash.length; i += 4) {
      hex += parseInt(hash.slice(i, i + 4), 2).toString(16);
    }
    return hex;
  } catch {
    return "";
  }
}

function getHammingDistance(h1: string, h2: string): number {
  if (h1.length !== h2.length) return 999;
  let dist = 0;
  for (let i = 0; i < h1.length; i++) {
    if (h1[i] !== h2[i]) dist++;
  }
  return dist;
}

async function downloadAndCacheGallery(
  matchId: string,
  urls: string[]
): Promise<{ imageUrl: string | null; galleryImageUrls: string[] }> {
  const targetUrls = Array.from(new Set(urls.filter(Boolean))).slice(0, 10);
  if (targetUrls.length === 0) {
    return { imageUrl: null, galleryImageUrls: [] };
  }

  const uploadedUrls: string[] = [];
  const seenHashes: string[] = [];

  await limitConcurrency(targetUrls, 3, async (url) => {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) return;

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Objective checks via sharp
      const image = sharp(buffer);
      const metadata = await image.metadata();

      if (!metadata.width || !metadata.height) return;

      // 1. Min resolution check (e.g. 300px width/height)
      if (metadata.width < 300 || metadata.height < 300) {
        console.log(`[Sharp] Image ignored: low resolution ${metadata.width}x${metadata.height} for ${url}`);
        return;
      }

      // 2. Aspect Ratio check (bounds 0.5 to 2.0)
      const ratio = metadata.width / metadata.height;
      if (ratio < 0.5 || ratio > 2.0) {
        console.log(`[Sharp] Image ignored: bad aspect ratio ${ratio.toFixed(2)} for ${url}`);
        return;
      }

      // 3. Duplicate visual check using dHash
      const hash = await computeDHash(buffer);
      if (hash) {
        const isDuplicate = seenHashes.some((h) => getHammingDistance(h, hash) <= 3);
        if (isDuplicate) {
          console.log(`[Sharp] Image ignored: duplicate visual hash detected for ${url}`);
          return;
        }
        seenHashes.push(hash);
      }

      // 4. Compress to optimized JPEG
      const compressedBuffer = await image
        .jpeg({ quality: 80, progressive: true })
        .toBuffer();

      // 5. Upload to Supabase Storage
      const extension = "jpg";
      const fileName = `products/matches/${matchId}_${crypto.randomUUID().slice(0, 8)}.${extension}`;
      const { error } = await supabaseAdmin.storage
        .from("social-media")
        .upload(fileName, compressedBuffer, {
          contentType: "image/jpeg",
          cacheControl: "31536000",
          upsert: true,
        });

      if (!error) {
        const supabaseUrlStr = `${supabaseUrl}/storage/v1/object/public/social-media/${fileName}`;
        uploadedUrls.push(supabaseUrlStr);
      } else {
        console.error(`[Supabase Upload Error] ${error.message} for ${url}`);
      }
    } catch (err: any) {
      console.error(`[Supabase Archiver] Failed to download/process ${url}: ${err.message}`);
    }
  });

  return {
    imageUrl: uploadedUrls[0] || null,
    galleryImageUrls: uploadedUrls,
  };
}

async function queryGeminiForCrop(
  cropBase64: string,
  evidence: CropEvidence,
): Promise<GeminiCropStructuredResult | null> {
  const promptText = `Analyze this product image and identify exactly what this product is.
You MUST return a JSON object matching this schema:
{
  "category": "Clothing | Shoes | Bags | Watches | Jewelry | Accessories | Electronics | Furniture | Home | Kitchen | Beauty | Sports",
  "subcategory": "specific category (e.g., 'Sneakers', 'T-Shirt', 'Halter Top', 'Hoodie', 'Handbag')",
  "gender": "Men | Women | Unisex | Kids",
  "color": "primary color name",
  "neckline": "e.g., 'Halter Neck', 'V-Neck', 'Crew Neck', 'Asymmetrical', 'none'",
  "sleeve": "e.g., 'Sleeveless', 'Short Sleeve', 'Long Sleeve', 'none'",
  "fit": "e.g., 'Slim Fit', 'Loose', 'Oversized', 'Regular', 'none'",
  "pattern": "e.g., 'Solid', 'Striped', 'Floral', 'Knit', 'none'",
  "material": "e.g., 'Knit', 'Leather', 'Cotton', 'Mesh', 'Denim', 'none'",
  "brand": "e.g., 'Nike', 'Adidas', 'Zara', 'none'",
  "confidence": 0.0 to 1.0 (float)
}

Do NOT include markdown formatting or backticks around the JSON. Return only the JSON object.
Known evidence so far:
- YOLO detected: "${evidence.yoloLabel}"
- Brand/Logo: "${evidence.logo || "unknown"}"
- OCR text: "${evidence.ocrText || "none"}"
- Color: "${evidence.colorDetected || "unknown"}"`;

  try {
    const result = await VisionProviderManager.analyzeImage(cropBase64, promptText);
    if (!result) return null;
    let text = typeof result === "string" ? result : JSON.stringify(result);
    text = text.replace(/```json/i, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(text);
    return {
      category: parsed.category || "Clothing",
      subcategory: parsed.subcategory || "none",
      gender: parsed.gender || "Unisex",
      color: parsed.color || "unknown",
      neckline: parsed.neckline || "none",
      sleeve: parsed.sleeve || "none",
      fit: parsed.fit || "none",
      pattern: parsed.pattern || "none",
      material: parsed.material || "none",
      brand: parsed.brand || "none",
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.85,
    };
  } catch (err) {
    console.error("[Gemini] VLM query failed:", err);
    return null;
  }
}

// ─── Redis Queue ──────────────────────────────────────────────────────────────

async function runRedisCommand(command: string[]): Promise<any> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
    });
    if (!res.ok) throw new Error(`Redis error ${res.status}`);
    const data = await res.json();
    return data.result;
  } catch (err) {
    console.error("Redis command failed:", err);
    return null;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CORE PIPELINE — 20-Stage Video Processor
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function runVideoProcessor(videoId: string, jobId: string) {
  const startTime = Date.now();
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  Cartly v3 — Processing Reel: ${videoId}`);
  console.log(`${"═".repeat(60)}`);

  // ── Stage 1: Create Detection Session ─────────────────────────────
  const sessionHash = crypto.createHash("sha256")
    .update(`${videoId}:${Date.now()}`)
    .digest("hex")
    .slice(0, 32);

  const session = await prisma.detectionSession.create({
    data: {
      postId: videoId,
      sessionHash,
      status: "processing",
    },
  });
  console.log(`[Stage 1] Detection session created: ${session.id}`);

  let geminiCallCount = 0;
  let cacheHitCount = 0;
  let cropsPassedQuality = 0;
  let cropsFailedQuality = 0;
  let extractedFrames: { path: string; timestamp: number }[] = [];

  // ── Stage 2: Download Video ──────────────────────────────────────
  const post = await prisma.post.findUnique({
    where: { id: videoId },
    include: { attachments: true },
  });
  if (!post) throw new Error("Post not found");

  const videoAttachment = post.attachments.find((a) => a.mediaType === "VIDEO");
  if (!videoAttachment) throw new Error("Post has no video attachment");

  const tmpDir = path.join(process.cwd(), "tmp");
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const fileExt = videoAttachment.url.split(".").pop()?.split("?")[0] || "mp4";
  const tempVideoPath = path.join(tmpDir, `temp-${videoId}.${fileExt}`);

  console.log(`[Stage 2] Downloading video...`);
  const res = await fetch(videoAttachment.url);
  if (!res.ok) throw new Error(`Failed to download video: ${res.statusText}`);
  const videoBuffer = Buffer.from(await res.arrayBuffer());
  await fs.promises.writeFile(tempVideoPath, videoBuffer);

  try {
    // ── Stage 3: Frame Extraction ───────────────────────────────────
    console.log(`[Stage 3] Extracting frames...`);
    extractedFrames = await extractFramesFromVideo(tempVideoPath);
    console.log(`  ├─ ${extractedFrames.length} frames extracted`);

    // ── Stage 4: YOLO Detection on each frame ───────────────────────
    console.log(`[Stage 4] Running YOLO detection on ${extractedFrames.length} frames...`);
    const frameDetections: FrameDetection[] = [];

    for (const frame of extractedFrames) {
      const frameBuffer = await fs.promises.readFile(frame.path);
      const objects = await detectObjectsInFrame(frameBuffer);

      // Crop each detected object
      const detectedObjects = [];
      for (const obj of objects) {
        const cropBuffer = await cropObjectFromFrame(frameBuffer, obj.box);
        let cropQuality = 0;

        if (cropBuffer) {
          const qualityResult = await assessCropQuality(cropBuffer);
          cropQuality = qualityResult.score;

          if (qualityResult.pass) {
            cropsPassedQuality++;
          } else {
            cropsFailedQuality++;
          }
        }

        detectedObjects.push({
          box: obj.box,
          label: obj.label,
          confidence: obj.confidence,
          cropBuffer: cropBuffer || undefined,
          cropQuality,
        });
      }

      if (detectedObjects.length > 0) {
        frameDetections.push({
          frameTimestamp: frame.timestamp,
          objects: detectedObjects,
        });
      }

      console.log(`  ├─ Frame @${frame.timestamp}s: ${detectedObjects.length} shoppable objects`);
    }

    // ── Stage 5: Frame Fusion ───────────────────────────────────────
    console.log(`[Stage 5] Frame fusion — tracking objects across frames...`);
    let trackedObjects = fuseFrameDetections(frameDetections);
    trackedObjects = filterTrackedObjects(trackedObjects);
    console.log(`  ├─ ${trackedObjects.length} unique tracked objects after fusion`);

    // ── Stages 6-11: Per-Crop Evidence Collection ───────────────────
    console.log(`[Stages 6-11] Running per-crop evidence pipeline...`);
    const evidenceMap = new Map<string, CropEvidence>();
    const confidenceMap = new Map<string, number>();

    for (const tracked of trackedObjects) {
      if (!tracked.bestCrop) {
        console.log(`  ├─ ${tracked.trackingId}: No crop available — skipping`);
        continue;
      }

      console.log(`  ├─ ${tracked.trackingId}: "${tracked.yoloLabel}" × ${tracked.frameAppearances} frames`);

      const result = await collectCropEvidence(
        tracked.bestCrop,
        tracked.yoloLabel,
        tracked.bestConfidence,
        tracked.frameAppearances,
      );

      if (!result) {
        // Crop quality filter rejected this crop
        continue;
      }

      // Merge evidence back into tracked object
      if (result.evidence.logo) tracked.mergedLogos.push(result.evidence.logo);
      if (result.evidence.ocrText) tracked.mergedOcrText = result.evidence.ocrText;
      if (result.evidence.barcode) tracked.mergedBarcodes.push(result.evidence.barcode);

      evidenceMap.set(tracked.trackingId, result.evidence);
      confidenceMap.set(tracked.trackingId, result.confidence.detection);
    }

    // ── VLM Fallback: Run full-frame analysis if no shoppable objects were tracked ──
    if (evidenceMap.size === 0 && extractedFrames.length > 0) {
      console.log(`[VLM Fallback] YOLO/Fusion detected 0 shoppable products. Running full-frame Gemini VLM fallback...`);
      // Select up to 3 frames: first, middle, last
      const indicesToQuery = [
        0,
        Math.floor(extractedFrames.length / 2),
        extractedFrames.length - 1
      ].filter((v, i, a) => a.indexOf(v) === i && v < extractedFrames.length);

      for (const idx of indicesToQuery) {
        const frame = extractedFrames[idx];
        console.log(`  ├─ Querying Gemini VLM for Frame @${frame.timestamp}s...`);
        try {
          const frameBuffer = await fs.promises.readFile(frame.path);
          const base64Frame = frameBuffer.toString("base64");
          geminiCallCount++;

          const promptText = `Analyze this image and identify all visible, purchaseable fashion products. Return ONLY a JSON object matching this structure:
{
  "products": [
    {
      "category": "Clothing | Shoes | Bags | Watches | Jewelry | Accessories | Electronics | Furniture | Home | Kitchen | Beauty | Sports",
      "subcategory": "specific category (e.g., 'Sneakers', 'T-Shirt', 'Halter Top', 'Hoodie', 'Handbag')",
      "gender": "Men | Women | Unisex | Kids",
      "color": "primary color name",
      "neckline": "e.g., 'Halter Neck', 'V-Neck', 'Crew Neck', 'Asymmetrical', 'none'",
      "sleeve": "e.g., 'Sleeveless', 'Short Sleeve', 'Long Sleeve', 'none'",
      "fit": "e.g., 'Slim Fit', 'Loose', 'Oversized', 'Regular', 'none'",
      "pattern": "e.g., 'Solid', 'Striped', 'Floral', 'Knit', 'none'",
      "material": "e.g., 'Knit', 'Leather', 'Cotton', 'Mesh', 'Denim', 'none'",
      "brand": "e.g., 'Nike', 'Adidas', 'Zara', 'none'",
      "confidence": 0.0 to 1.0 (float)
    }
  ]
}

Only return products a user could realistically purchase online.
Ignore: people, faces, backgrounds, trees, buildings, furniture, pets, vehicles.`;

          const response = await VisionProviderManager.analyzeImage(base64Frame, promptText);
          if (response && Array.isArray(response.products)) {
            console.log(`  │   └─ VLM found ${response.products.length} products on Frame @${frame.timestamp}s`);
            for (const prod of response.products) {
              const desc = prod.subcategory || prod.category || "Clothing";
              if (desc.toLowerCase() === "none") continue;

              const trackingId = `vlm-${crypto.randomUUID().slice(0, 8)}`;
              const category = prod.category || "Clothing";
              const confidence = prod.confidence || 0.85;

              console.log(`  │       ├─ Product: "${desc}" (${category})`);

              // Construct CropEvidence for this VLM product
              const evidence: CropEvidence = {
                yoloLabel: category,
                yoloConfidence: confidence,
                isShoppableCategory: true,
                logo: prod.brand && prod.brand !== "none" ? prod.brand : null,
                logoConfidence: prod.brand && prod.brand !== "none" ? 0.90 : 0,
                ocrText: "",
                meaningfulOcrWords: 0,
                ocrPreview: "",
                barcode: null,
                colorDetected: prod.color || "unknown",
                materialDetected: prod.material || "unknown",
                shapeCategory: null,
                frameAppearances: 1,
                cropQuality: {
                  score: 0.85,
                  pass: true,
                  breakdown: { size: 0.85, blur: 0.85, brightness: 0.85, edges: 0.85 }
                },
                // Structured fashion details
                brand: prod.brand && prod.brand !== "none" ? prod.brand : undefined,
                subcategory: prod.subcategory && prod.subcategory !== "none" ? prod.subcategory : undefined,
                gender: prod.gender && prod.gender !== "none" ? prod.gender : undefined,
                neckline: prod.neckline && prod.neckline !== "none" ? prod.neckline : undefined,
                sleeve: prod.sleeve && prod.sleeve !== "none" ? prod.sleeve : undefined,
                fit: prod.fit && prod.fit !== "none" ? prod.fit : undefined,
                pattern: prod.pattern && prod.pattern !== "none" ? prod.pattern : undefined,
              };

              // Register in maps
              evidenceMap.set(trackingId, evidence);
              confidenceMap.set(trackingId, confidence);

              // Add to trackedObjects
              trackedObjects.push({
                trackingId,
                yoloLabel: category,
                bestConfidence: confidence,
                bestBox: [0, 0, 0, 0],
                frameAppearances: 1,
                frameTimestamps: [frame.timestamp],
                bestCropQuality: 0.85,
                bestCrop: frameBuffer, // use the full frame buffer as best crop
                mergedLogos: prod.brand && prod.brand !== "none" ? [prod.brand] : [],
                mergedBarcodes: [],
                mergedOcrText: ""
              });
            }
          } else {
            console.log(`  │   └─ No products found by VLM on Frame @${frame.timestamp}s`);
          }
        } catch (err) {
          console.error(`  │   └─ Gemini VLM query failed:`, err);
        }
      }
    }

    // ── Stage 12: Multi-Query Product Resolver ──────────────────────
    console.log(`[Stage 12] Generating marketplace queries...`);
    const queriesByTrackingId = new Map<string, string[]>();

    for (const [trackingId, evidence] of evidenceMap) {
      const resolverResult = resolveQueries(evidence);
      queriesByTrackingId.set(trackingId, resolverResult.queries);
    }

    // ── Stages 13-14: Query Cache + Parallel Marketplace Search ─────
    console.log(`[Stages 13-14] Searching marketplaces...`);
    const matchesByTrackingId = new Map<string, VerifiedMatch[]>();

    for (const [trackingId, queries] of queriesByTrackingId) {
      const evidence = evidenceMap.get(trackingId)!;
      const tracked = trackedObjects.find((t) => t.trackingId === trackingId);

      // Search all queries across all providers in parallel
      const { results, cacheHits } = await SearchManager.searchMultiQuery(queries, 20);
      cacheHitCount += cacheHits;

      if (results.length === 0) {
        console.log(`  ├─ ${trackingId}: No marketplace results found`);
        matchesByTrackingId.set(trackingId, []);
        continue;
      }

      // ── Stage 15: Title Cleaner ─────────────────────────────────
      // (Verification Engine uses cleanMarketplaceTitle internally)

      // ── Stage 16: Marketplace Verification Engine ───────────────
      const verified = await verifyMarketplaceResults(evidence, results, tracked?.bestCrop || null, 15);

      // ── Stage 17: Product Knowledge Graph ───────────────────────
      const bestMatch = selectBestMatch(
        {
          yoloLabel: evidence.yoloLabel,
          logo: evidence.logo || undefined,
          ocrText: evidence.ocrText || undefined,
          color: evidence.colorDetected || undefined,
        },
        verified,
      );

      // ── Stage 18: Gemini Decision ───────────────────────────────
      if (!isVerificationSufficient(verified) && tracked_has_crop(trackedObjects, trackingId)) {
        console.log(`  ├─ ${trackingId}: Verification insufficient. Invoking Gemini Vision...`);
        geminiCallCount++;

        if (tracked?.bestCrop) {
          const cropBase64 = tracked.bestCrop.toString("base64");
          const geminiResult = await queryGeminiForCrop(cropBase64, evidence);

          if (geminiResult) {
            console.log(`  ├─ ${trackingId}: Gemini returned structured attributes:`, JSON.stringify(geminiResult));

            // Enrich evidence
            evidence.brand = geminiResult.brand !== "none" ? geminiResult.brand : evidence.logo;
            evidence.subcategory = geminiResult.subcategory !== "none" ? geminiResult.subcategory : undefined;
            evidence.gender = geminiResult.gender !== "none" ? geminiResult.gender : undefined;
            evidence.colorDetected = geminiResult.color !== "unknown" ? geminiResult.color : evidence.colorDetected;
            evidence.materialDetected = geminiResult.material !== "none" ? geminiResult.material : evidence.materialDetected;
            evidence.neckline = geminiResult.neckline !== "none" ? geminiResult.neckline : undefined;
            evidence.sleeve = geminiResult.sleeve !== "none" ? geminiResult.sleeve : undefined;
            evidence.fit = geminiResult.fit !== "none" ? geminiResult.fit : undefined;
            evidence.pattern = geminiResult.pattern !== "none" ? geminiResult.pattern : undefined;

            // Re-resolve queries
            const resolverResult = resolveQueries(evidence);
            console.log(`  ├─ ${trackingId}: Re-resolved queries:`, resolverResult.queries);

            // Re-search with Gemini's improved description
            const { results: reResults, cacheHits: reCacheHits } =
              await SearchManager.searchMultiQuery(resolverResult.queries, 20);
            cacheHitCount += reCacheHits;

            if (reResults.length > 0) {
              // Re-verify with new results
              const reVerified = await verifyMarketplaceResults(evidence, reResults, tracked.bestCrop, 15);

              // Merge with original results, keep best
              const allVerified = [...verified, ...reVerified]
                .sort((a, b) => b.marketplaceConfidence - a.marketplaceConfidence);

              matchesByTrackingId.set(trackingId, allVerified.slice(0, 15));
              continue;
            }
          }
        }
      }

      matchesByTrackingId.set(trackingId, verified);
    }

    // ── Stage 19: Duplicate Product Merger ───────────────────────────
    console.log(`[Stage 19] Merging duplicate products...`);
    const mergedProducts = mergeProducts(
      trackedObjects.filter((t) => evidenceMap.has(t.trackingId)),
      matchesByTrackingId,
      queriesByTrackingId,
      confidenceMap,
    );
    console.log(`  ├─ ${mergedProducts.length} unique products after merging`);

    // ── Stage 20: Persist to Database ────────────────────────────────
    console.log(`[Stage 20] Persisting results to database...`);

    // Pre-download all match images in parallel to satisfy local gallery carousel requirement
    console.log(`[Stage 20] Asynchronously downloading and caching gallery images locally...`);
    const processedProducts = [];
    for (const product of mergedProducts) {
      const processedMatches = [];
      for (const match of product.allMatches.slice(0, 10)) {
        const matchId = `match_${crypto.randomUUID().slice(0, 12)}`;
        
        // Retrieve remote images (gallery + thumbnail fallback)
        const galleryUrls = match.product.galleryImageUrls || [];
        if (match.product.thumbnail && !galleryUrls.includes(match.product.thumbnail)) {
          galleryUrls.unshift(match.product.thumbnail);
        }
        
        // Download in parallel with concurrency limits
        const { imageUrl, galleryImageUrls } = await downloadAndCacheGallery(matchId, galleryUrls);
        
        processedMatches.push({
          id: matchId,
          match,
          imageUrl,
          galleryImageUrls,
        });
      }
      processedProducts.push({
        product,
        processedMatches,
      });
    }

    // Clear previous products for this reel
    await prisma.detectedProduct.deleteMany({
      where: { postId: videoId },
    });

    for (const product of mergedProducts) {
      const evidence = evidenceMap.get(product.trackingId);
      if (!evidence) continue;

      // Upload best crop to Supabase
      let cropUrl: string | null = null;
      if (product.detection.bestCrop) {
        try {
          const cropKey = `products/crops/${videoId}_${crypto.randomUUID().slice(0, 8)}.jpg`;
          const { error } = await supabaseAdmin.storage
            .from("social-media")
            .upload(cropKey, product.detection.bestCrop, {
              contentType: "image/jpeg",
              cacheControl: "31536000",
              upsert: true,
            });
          if (!error) {
            cropUrl = `${supabaseUrl}/storage/v1/object/public/social-media/${cropKey}`;
          }
        } catch { /* upload failed, continue without crop URL */ }
      }

      // Upload source frame to Supabase
      let sourceFrameUrl: string | null = null;
      const matchingFrame = extractedFrames.find((f) =>
        product.timeline.includes(f.timestamp),
      );
      if (matchingFrame && fs.existsSync(matchingFrame.path)) {
        try {
          const frameBuffer = await fs.promises.readFile(matchingFrame.path);
          const frameKey = `products/frames/${videoId}_${crypto.randomUUID().slice(0, 8)}.jpg`;
          const { error } = await supabaseAdmin.storage
            .from("social-media")
            .upload(frameKey, frameBuffer, {
              contentType: "image/jpeg",
              cacheControl: "31536000",
              upsert: true,
            });
          if (!error) {
            sourceFrameUrl = `${supabaseUrl}/storage/v1/object/public/social-media/${frameKey}`;
          }
        } catch { /* frame upload failed */ }
      }

      // Find the processed product entry containing local image paths
      const processed = processedProducts.find((p) => p.product.trackingId === product.trackingId)!;

      // Determine product label
      const label = product.bestMatch?.product.title
        ? cleanMarketplaceTitle(product.bestMatch.product.title)
        : product.resolvedQueries[0] || evidence.yoloLabel;

      const category = getCategoryForLabel(evidence.yoloLabel);

      // Resolve stable internal canonical product identity
      const canonicalProductId = await getOrCreateCanonicalProduct(
        label,
        evidence.logo || undefined,
        category
      );

      // Create DetectedProduct (detection layer)
      const detectedProduct = await prisma.detectedProduct.create({
        data: {
          postId: videoId,
          label: label.slice(0, 200),
          category,
          canonicalProductId,
          color: evidence.colorDetected || "unknown",
          confidence: product.detectionConfidence,
          frameTimestamp: product.timeline[0] || 0,
          sourceFrameUrl,
          dominantColor: evidence.colorDetected || "unknown",
          thumbnailUrl: processed.processedMatches[0]?.imageUrl || null,
          material: evidence.materialDetected || undefined,
          keywords: product.resolvedQueries.slice(0, 5),

          // Cartly v3 detection layer
          detectionSessionId: session.id,
          cropImageUrl: cropUrl,
          cropQualityScore: evidence.cropQuality.score,
          ocrText: evidence.ocrText || undefined,
          detectedLogo: evidence.logo || undefined,
          detectedBarcode: evidence.barcode || undefined,
          confidenceBreakdown: product.detection ? {
            frameAppearances: product.detection.frameAppearances,
            yoloLabel: evidence.yoloLabel,
            yoloConfidence: evidence.yoloConfidence,
          } : undefined,
          resolvedQueries: product.resolvedQueries,
          boundingBox: product.detection.bestBox ? {
            x1: product.detection.bestBox[0],
            y1: product.detection.bestBox[1],
            x2: product.detection.bestBox[2],
            y2: product.detection.bestBox[3],
          } : undefined,
          trackingId: product.trackingId,
          frameAppearances: product.detection.frameAppearances,
          detectionConfidence: product.detectionConfidence,
          marketplaceConfidence: product.marketplaceConfidence,
          verificationScore: product.bestMatch?.marketplaceConfidence || 0,

          // Completeness scoring
          visionConfidence: product.detectionConfidence,
          shoppingMatchConfidence: product.marketplaceConfidence,
          completenessScore: calculateCompleteness(evidence, product),
          isVerifiedMatch: product.marketplaceConfidence >= 0.50, // lower threshold to 0.50 as requested by task 4/12

          // Shopping matches (marketplace layer)
          matches: {
            create: processed.processedMatches.map((pm) => {
              const match = pm.match;
              const parsedPrice = parsePriceToFloat(match.product.price);
              
              // Extract rich metadata from marketplace listing
              const ext = extractProductMetadata(
                match.product.title || "Product Match",
                match.product.description || "",
                (match.product as any).attributes || {}
              );

              return {
                id: pm.id,
                title: match.product.title || "Product Match",
                price: match.product.price || "Contact Store",
                sourceStore: match.product.merchant || "Online Retailer",
                productUrl: match.product.link || "https://www.google.com",
                affiliateUrl: generateAffiliateUrl(match.product.link || ""),
                imageUrl: pm.imageUrl,

                // Cartly v3 permanent fields
                cleanedTitle: cleanMarketplaceTitle(match.product.title),
                matchBrand: match.product.brand || ext.specifications["Brand"] || ext.specifications["brand"] || undefined,
                manufacturer: match.product.manufacturer || undefined,
                modelNumber: match.product.modelNumber || undefined,
                galleryImageUrls: pm.galleryImageUrls,
                categoryPath: ext.categoryPath,
                condition: ext.condition,
                returnPolicy: ext.returnPolicy,
                warranty: ext.warranty,
                verificationScore: match.marketplaceConfidence,
                features: ext.features,
                highlights: ext.highlights,
                rawPayload: match.product as any, // Preserve raw marketplace payload

                // Cartly v3 cached fields
                rating: match.product.rating || undefined,
                reviewCount: match.product.reviewCount || undefined,
                sellerName: match.product.sellerName || undefined,
                sellerRating: match.product.sellerRating || undefined,
                shippingCost: match.product.shippingCost || undefined,
                estimatedDelivery: match.product.estimatedDelivery || undefined,
                originalPrice: match.product.originalPrice || undefined,
                discountPercent: match.product.discountPercent || undefined,
                cachedAt: new Date(),

                // Price history
                priceHistories: parsedPrice !== null ? {
                  create: { price: parsedPrice },
                } : undefined,

                // Variants nested create
                variants: match.product.variants && match.product.variants.length > 0 ? {
                  create: match.product.variants.map((v) => ({
                    variantType: v.type,
                    variantValue: v.value,
                    price: v.price || null,
                    sku: v.sku || null,
                    imageUrl: v.imageUrl || null,
                    availability: v.availability || "in_stock",
                  })),
                } : undefined,
              };
            }),
          },
        },
      });

      // Create Product Timeline entries
      for (const timestamp of product.timeline) {
        await prisma.productTimeline.create({
          data: {
            detectedProductId: detectedProduct.id,
            timestamp,
          },
        });
      }
    }

    // Update Detection Session with stats
    const processingTimeMs = Date.now() - startTime;
    const finalStatus = mergedProducts.length === 0 ? "no_products" : "completed";

    await prisma.detectionSession.update({
      where: { id: session.id },
      data: {
        frameCount: extractedFrames.length,
        rawObjectCount: frameDetections.reduce((sum, fd) => sum + fd.objects.length, 0),
        cropsPassedQuality,
        cropsFailedQuality,
        trackedObjectCount: trackedObjects.length,
        mergedProductCount: mergedProducts.length,
        geminiCallCount,
        cacheHitCount,
        processingTimeMs,
        status: finalStatus,
        completedAt: new Date(),
      },
    });

    // Update VideoProcessingJob
    await prisma.videoProcessingJob.update({
      where: { postId: videoId },
      data: {
        status: finalStatus,
        completedAt: new Date(),
      },
    });

    console.log(`\n${"─".repeat(60)}`);
    console.log(`  ✅ Pipeline complete for ${videoId}`);
    console.log(`  Products: ${mergedProducts.length} | Frames: ${extractedFrames.length}`);
    console.log(`  Gemini calls: ${geminiCallCount} | Cache hits: ${cacheHitCount}`);
    console.log(`  Quality filter: ${cropsPassedQuality} passed / ${cropsFailedQuality} failed`);
    console.log(`  Time: ${(processingTimeMs / 1000).toFixed(1)}s`);
    console.log(`${"─".repeat(60)}\n`);
  } catch (err: any) {
    console.error(`[Pipeline] Error processing ${videoId}:`, err);

    // Update session as failed
    await prisma.detectionSession.update({
      where: { id: session.id },
      data: {
        status: "failed",
        processingTimeMs: Date.now() - startTime,
        completedAt: new Date(),
      },
    }).catch(() => {});

    // Update VideoProcessingJob as failed as well
    await prisma.videoProcessingJob.update({
      where: { postId: videoId },
      data: {
        status: "failed",
        error: err.message || "Unknown error",
        completedAt: new Date(),
      },
    }).catch(() => {});

    throw err;
  } finally {
    // Cleanup temp files
    try {
      if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath);
      extractedFrames.forEach((f) => {
        if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
      });
    } catch { /* cleanup errors are non-fatal */ }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tracked_has_crop(tracked: TrackedObject[], trackingId: string): boolean {
  return tracked.some((t) => t.trackingId === trackingId && t.bestCrop !== null);
}

function calculateCompleteness(evidence: CropEvidence, product: MergedProduct): number {
  let score = 0;
  if (evidence.yoloLabel) score += 0.15;
  if (evidence.logo) score += 0.20;
  if (evidence.ocrText) score += 0.15;
  if (evidence.colorDetected && evidence.colorDetected !== "unknown") score += 0.10;
  if (evidence.materialDetected) score += 0.10;
  if (product.bestMatch) score += 0.20;
  if (product.allMatches.length >= 3) score += 0.10;
  return Math.min(1.0, score);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  QUEUE EXECUTION LOOP (unchanged from v2 — same Redis/DB queue logic)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const isRedisActive = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

async function processNextQueueItem(): Promise<boolean> {
  let jobId: string | null = null;
  let videoId: string | null = null;

  if (isRedisActive) {
    const payloadStr = await runRedisCommand(["RPOP", "video-product-processing"]);
    if (!payloadStr) return false;

    try {
      const payload = JSON.parse(payloadStr);
      videoId = payload.videoId;
    } catch {
      console.error("Failed to parse Redis queue payload:", payloadStr);
      return true;
    }

    if (!videoId) return true;

    const lockAcquired = await runRedisCommand(["SET", "video-processing-lock", "true", "EX", "300", "NX"]);
    if (lockAcquired !== "OK") {
      await runRedisCommand(["RPUSH", "video-product-processing", payloadStr]);
      return false;
    }

    let dbJob = await prisma.videoProcessingJob.findUnique({
      where: { postId: videoId },
    });

    if (!dbJob) {
      dbJob = await prisma.videoProcessingJob.create({
        data: { postId: videoId, status: "processing", startedAt: new Date() },
      });
    } else {
      if (dbJob.status === "completed" || dbJob.status === "no_products") {
        await runRedisCommand(["DEL", "video-processing-lock"]);
        return true;
      }
      dbJob = await prisma.videoProcessingJob.update({
        where: { id: dbJob.id },
        data: { status: "processing", startedAt: new Date() },
      });
    }
    jobId = dbJob.id;
  } else {
    const pendingJob = await prisma.videoProcessingJob.findFirst({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
    });
    if (!pendingJob) return false;

    const updateResult = await prisma.videoProcessingJob.updateMany({
      where: { id: pendingJob.id, status: "pending" },
      data: { status: "processing", startedAt: new Date() },
    });

    if (updateResult.count === 0) return false;
    jobId = pendingJob.id;
    videoId = pendingJob.postId;
  }

  try {
    await runVideoProcessor(videoId!, jobId!);
  } catch (err: any) {
    console.error(`Failed to process video ${videoId}:`, err);
    const currentJob = await prisma.videoProcessingJob.findUnique({
      where: { id: jobId! },
    });
    if (currentJob) {
      const nextRetryCount = currentJob.retryCount + 1;
      if (nextRetryCount >= 3) {
        await prisma.videoProcessingJob.update({
          where: { id: jobId },
          data: {
            status: "failed",
            error: err.message || String(err),
            completedAt: new Date(),
          },
        });
      } else {
        await prisma.videoProcessingJob.update({
          where: { id: jobId },
          data: {
            status: "pending",
            retryCount: nextRetryCount,
            lastRetryAt: new Date(),
            error: err.message || String(err),
          },
        });
        if (isRedisActive) {
          await runRedisCommand([
            "LPUSH", "video-product-processing",
            JSON.stringify({ videoId, createdAt: Date.now() }),
          ]);
        }
      }
    }
  } finally {
    if (isRedisActive) {
      await runRedisCommand(["DEL", "video-processing-lock"]);
    }
  }

  return true;
}

// ─── CV Server Bootstrap ──────────────────────────────────────────────────────

async function verifyAndStartCVServer() {
  try {
    const response = await fetch("http://localhost:5000/health");
    if (response.ok) {
      console.log("[Worker] CV service is already running.");
      return;
    }
  } catch { /* not running */ }

  console.log("[Worker] CV service not detected. Launching...");
  const pythonCmd = process.platform === "win32" ? "python" : "python3";
  const serverScript = path.join(process.cwd(), "src/lib/detection/py-service/cv_server.py");

  try {
    const pyProcess = spawn(pythonCmd, [serverScript], {
      detached: true,
      stdio: "ignore",
    });
    pyProcess.unref();
    console.log("[Worker] Spawned cv_server.py. Waiting 3s for boot...");
    await new Promise((resolve) => setTimeout(resolve, 3000));
  } catch (e) {
    console.error("[Worker] Failed to launch CV service:", e);
  }
}

// ─── Worker Entry Point ───────────────────────────────────────────────────────

const BACKOFF_STEPS = [1000, 2000, 5000, 10000, 30000];
let backoffIndex = 0;

async function startWorker() {
  console.log("Cartly v3 Video Product Detection Worker starting...");
  await verifyAndStartCVServer();
  console.log("Cartly v3 Worker initialized. Listening for jobs...\n");

  while (true) {
    let jobProcessed = false;
    try {
      jobProcessed = await processNextQueueItem();
    } catch (err) {
      console.error("Worker loop error:", err);
    }

    if (jobProcessed) {
      backoffIndex = 0;
    } else {
      const delay = BACKOFF_STEPS[backoffIndex];
      console.log(`Worker idle. Backing off ${delay / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      if (backoffIndex < BACKOFF_STEPS.length - 1) backoffIndex++;
    }
  }
}

startWorker().catch((err) => {
  console.error("Fatal worker error:", err);
  process.exit(1);
});
