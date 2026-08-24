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

import { PrismaClient } from "@/generated/client";
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
import { verifyMarketplaceResults, isVerificationSufficient, calculateVerificationConfidence } from "../marketplace/verificationEngine";
import { cleanMarketplaceTitle } from "../marketplace/titleCleaner";
import { VerifiedMatch, MarketplaceProduct } from "../marketplace/types";
import { PluginRegistry } from "../detection/pluginRegistry";
import { DiscoveryEngine } from "../detection/discoveryEngine";
import { LocalizationEngine } from "../detection/localization";
import { ProductMemoryProvider } from "../detection/productMemory";
import { ExperimentManager } from "../research/ExperimentManager";

// ─── Memory Cache ─────────────────────────────────────────────────────────────
export const MemoryPostCache = new Map<string, any>();

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

function getHighResEbayUrl(url: string): string {
  if (url && url.includes("i.ebayimg.com")) {
    return url.replace(/\/s-l\d+\.(jpg|png|jpeg|webp)/i, "/s-l500.$1");
  }
  return url;
}

async function verifyUrlExists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function downloadAndCacheGallery(
  matchId: string,
  urls: string[]
): Promise<{ imageUrl: string | null; galleryImageUrls: string[] }> {
  if (process.env.BENCHMARK_RUN === "true" || process.env.ABLATION_MODE) {
    const valid = urls.filter(Boolean);
    return {
      imageUrl: valid[0] || null,
      galleryImageUrls: valid,
    };
  }

  const targetUrls = Array.from(new Set(urls.filter(Boolean))).slice(0, 10);
  if (targetUrls.length === 0) {
    return { imageUrl: null, galleryImageUrls: [] };
  }

  const uploadedUrls: string[] = [];
  const seenHashes: string[] = [];

  await limitConcurrency(targetUrls, 3, async (originalUrl) => {
    try {
      let url = originalUrl;
      let response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) return;

      let arrayBuffer = await response.arrayBuffer();
      let buffer = Buffer.from(arrayBuffer);
      let image = sharp(buffer);
      let metadata = await image.metadata();

      if (!metadata.width || !metadata.height) return;

      let width = metadata.width;
      let height = metadata.height;

      let passesStrict = width >= 300 && height >= 300;
      let passesRelaxed = width >= 100 && height >= 100;

      // 1. eBay URL rewrite fallback if strict fails
      if (!passesStrict && url.includes("i.ebayimg.com")) {
        const highResUrl = getHighResEbayUrl(url);
        if (highResUrl !== url && await verifyUrlExists(highResUrl)) {
          const highResResponse = await fetch(highResUrl, { signal: AbortSignal.timeout(10000) });
          if (highResResponse.ok) {
            const hrArrayBuffer = await highResResponse.arrayBuffer();
            const hrBuffer = Buffer.from(hrArrayBuffer);
            const hrImage = sharp(hrBuffer);
            const hrMetadata = await hrImage.metadata();
            if (hrMetadata.width && hrMetadata.height && hrMetadata.width >= 300 && hrMetadata.height >= 300) {
              url = highResUrl;
              response = highResResponse;
              buffer = hrBuffer;
              image = hrImage;
              metadata = hrMetadata;
              width = hrMetadata.width;
              height = hrMetadata.height;
              passesStrict = true;
            }
          }
        }
      }

      // 2. Reject if it fails relaxed check
      if (!passesStrict && !passesRelaxed) {
        console.log(`[Sharp] Image ignored: extremely low resolution ${width}x${height} for ${url}`);
        return;
      }

      // Aspect Ratio check
      const ratio = width / height;
      const minRatio = passesStrict ? 0.5 : 0.3;
      const maxRatio = passesStrict ? 2.0 : 3.0;
      if (ratio < minRatio || ratio > maxRatio) {
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
      console.error(`[Supabase Archiver] Failed to download/process ${originalUrl}: ${err.message}`);
    }
  });

  return {
    imageUrl: uploadedUrls[0] || null,
    galleryImageUrls: uploadedUrls,
  };
}

async function queryGeminiForCrops(
  cropsBase64: string[],
  evidence: CropEvidence,
): Promise<GeminiCropStructuredResult | null> {
  const promptText = `Analyze the provided product crop image(s) (which show different views/frames of the same item) and identify exactly what this product is.
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
    const result = await VisionProviderManager.analyzeImages(cropsBase64, promptText);
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CORE PIPELINE — 20-Stage Video Processor
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function runVideoProcessor(videoId: string, jobId: string) {
  const startTime = Date.now();
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  Cartly v3 — Processing Reel: ${videoId}`);
  console.log(`${"═".repeat(60)}`);

  // Parse ablation flags
  const ablationMode = process.env.ABLATION_MODE || "baseline";
  console.log(`[Ablation Setup] Mode: ${ablationMode}`);

  const enableTracking = ablationMode === "baseline" || ablationMode === "yolo_ocr_tracking" || ablationMode === "yolo_ocr_adaptive";
  const enableOcr = ablationMode !== "yolo_only";
  const enableBrand = ablationMode !== "yolo_only" && ablationMode !== "yolo_ocr";
  const enableMarketplace = ablationMode === "baseline" || ablationMode === "yolo_ocr_amef" || ablationMode === "yolo_ocr_marketplace" || ablationMode === "yolo_ocr_adaptive";
  const enableVerification = ablationMode === "baseline" || ablationMode === "yolo_ocr_amef" || ablationMode === "yolo_ocr_adaptive";
  const enableGeminiVlm = ablationMode === "baseline" || ablationMode === "yolo_ocr_gemini" || ablationMode === "yolo_ocr_adaptive";
  const enableAdaptiveRouting = ablationMode === "baseline" || ablationMode === "yolo_ocr_adaptive";

  // Set environment variables for the child calls
  process.env.DISABLE_OCR = enableOcr ? "false" : "true";
  process.env.DISABLE_BRAND = enableBrand ? "false" : "true";

  // Initialize Research Session
  const ablationPrefix = process.env.ABLATION_MODE ? `${process.env.ABLATION_MODE}-` : "";
  const expId = ExperimentManager.getActiveExperimentId() || `${ablationPrefix}run-${Date.now()}`;
  ExperimentManager.startSession(expId, videoId);

  // ── Stage 1: Create Detection Session ─────────────────────────────
  const sessionHash = crypto.createHash("sha256")
    .update(`${videoId}:${Date.now()}`)
    .digest("hex")
    .slice(0, 32);

  let session: any = { id: `session-${Date.now()}` };
  try {
    session = await prisma.detectionSession.create({
      data: {
        postId: videoId,
        sessionHash,
        status: "processing",
      },
    });
    console.log(`[Stage 1] Detection session created: ${session.id}`);
  } catch (err) {
    console.warn(`[Stage 1] Database connection failed. Proceeding in dry-run mode for metrics collection.`, err);
  }

  let geminiCallCount = 0;
  let cacheHitCount = 0;
  let cropsPassedQuality = 0;
  let cropsFailedQuality = 0;
  let extractedFrames: { path: string; timestamp: number }[] = [];

  const tmpDir = path.join(process.cwd(), "tmp");
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  // ── Stage 2: Download Video ──────────────────────────────────────
  let post = MemoryPostCache.get(videoId);
  if (!post) {
    try {
      post = await prisma.post.findUnique({
        where: { id: videoId },
        include: { attachments: true },
      });
      if (post) {
        MemoryPostCache.set(videoId, post);
      }
    } catch (err) {
      console.warn(`[Stage 2] Database lookup failed for post ${videoId}.`, err);
    }
  }

  if (!post) {
    ExperimentManager.addFailure("API failures");
    throw new Error("Post not found");
  }

  const videoAttachment = post.attachments.find((a: any) => a.mediaType === "VIDEO");
  if (!videoAttachment) {
    ExperimentManager.addFailure("API failures");
    throw new Error("Post has no video attachment");
  }

  const fileExt = videoAttachment.url.split(".").pop()?.split("?")[0] || "mp4";
  const tempVideoPath = path.join(tmpDir, `cached-${videoId}.${fileExt}`);

  console.log(`[Stage 2] Downloading/retrieving video...`);
  const downloadStart = Date.now();
  ExperimentManager.startStage("download");
  
  let downloadSize = 0;
  try {
    if (fs.existsSync(tempVideoPath)) {
      console.log(`  ├─ Using locally cached video: ${tempVideoPath}`);
      const stats = fs.statSync(tempVideoPath);
      downloadSize = stats.size;
      ExperimentManager.recordMetric("download", "downloadSizeBytes", downloadSize);
      ExperimentManager.recordMetric("download", "downloadThroughputMbps", 10000.0);
    } else {
      const res = await fetch(videoAttachment.url);
      if (!res.ok) throw new Error(`Failed to download video: ${res.statusText}`);
      const videoBuffer = Buffer.from(await res.arrayBuffer());
      await fs.promises.writeFile(tempVideoPath, videoBuffer);
      const downloadTimeMs = Date.now() - downloadStart;
      downloadSize = videoBuffer.length;
      ExperimentManager.recordMetric("download", "downloadSizeBytes", downloadSize);
      const throughputMbps = (downloadSize * 8) / (downloadTimeMs / 1000 || 1) / 1000000;
      ExperimentManager.recordMetric("download", "downloadThroughputMbps", throughputMbps);
    }
  } catch (err: any) {
    ExperimentManager.addFailure("API failures");
    ExperimentManager.endStage("download");
    throw err;
  }
  ExperimentManager.endStage("download");

  try {
    // ── Stage 3: Frame Extraction ───────────────────────────────────
    console.log(`[Stage 3] Extracting frames...`);
    ExperimentManager.startStage("extraction");
    
    extractedFrames = await extractFramesFromVideo(tempVideoPath);
    console.log(`  ├─ ${extractedFrames.length} frames extracted`);
    
    const durationForExt = extractedFrames.length;
    ExperimentManager.recordMetric("extraction", "extractedFramesCount", durationForExt);
    ExperimentManager.recordMetric("extraction", "keyframesCount", extractedFrames.length);
    if (extractedFrames.length === 0) {
      ExperimentManager.addFailure("blur");
    }
    ExperimentManager.endStage("extraction");

    // ── Stage 4: Pluggable YOLO Detection on each frame ─────────────
    console.log(`[Stage 4] Running YOLO detection on ${extractedFrames.length} frames...`);
    ExperimentManager.startStage("yolo");
    
    const frameDetections: FrameDetection[] = [];
    const yoloDetector = PluginRegistry.getDetector();
    const tracker = PluginRegistry.getTracker();
    const visualMatcher = PluginRegistry.getVisualMatcher();
    const productResolver = PluginRegistry.getProductResolver();
    const marketplaceMatcher = PluginRegistry.getMarketplaceMatcher();

    let allDetectionsCount = 0;
    let sumConfidence = 0;

    for (const frame of extractedFrames) {
      if (!fs.existsSync(frame.path)) continue;
      const frameBuffer = await fs.promises.readFile(frame.path);
      const { detections: objects } = await yoloDetector.detect(frameBuffer);

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
            ExperimentManager.addFailure("small objects");
          }
        } else {
          ExperimentManager.addFailure("occlusion");
        }

        detectedObjects.push({
          box: obj.box,
          label: obj.label,
          confidence: obj.confidence,
          cropBuffer: cropBuffer || undefined,
          cropQuality,
          avg_hsv: obj.avg_hsv,
        });

        allDetectionsCount++;
        sumConfidence += obj.confidence;
      }

      if (detectedObjects.length > 0) {
        frameDetections.push({
          frameTimestamp: frame.timestamp,
          objects: detectedObjects,
        });
      }
      console.log(`  ├─ Frame @${frame.timestamp}s: ${detectedObjects.length} shoppable objects`);
    }

    const avgYoloConfidence = allDetectionsCount > 0 ? sumConfidence / allDetectionsCount : 0;
    ExperimentManager.recordMetric("yolo", "yoloObjectsDetectedCount", allDetectionsCount);
    ExperimentManager.recordMetric("yolo", "yoloAvgConfidence", avgYoloConfidence);
    ExperimentManager.recordMetric("yolo", "yoloObjectsPerFrame", allDetectionsCount / (extractedFrames.length || 1));
    ExperimentManager.endStage("yolo");

    // ── Stage 5: Frame Fusion (Object Tracking) ───────────────────────
    console.log(`[Stage 5] Frame fusion — tracking objects across frames...`);
    ExperimentManager.startStage("tracking");
    
    let trackedObjects: TrackedObject[] = [];
    if (enableTracking) {
      const { tracked: fusedTracked } = tracker.fuse(frameDetections);
      const filterResult = tracker.filter(fusedTracked);
      trackedObjects = filterResult.filtered;
      
      const mergedTracks = fusedTracked.length - trackedObjects.length;
      ExperimentManager.recordMetric("tracking", "trackingMergedTracksCount", mergedTracks);
      ExperimentManager.recordMetric("tracking", "trackingDuplicateRemovalCount", mergedTracks);
      if (mergedTracks > 0) {
        ExperimentManager.addFailure("multiple identical products");
      }
    } else {
      let index = 0;
      for (const fd of frameDetections) {
        for (const obj of fd.objects) {
          trackedObjects.push({
            trackingId: `det-${index++}`,
            yoloLabel: obj.label,
            bestConfidence: obj.confidence,
            bestBox: obj.box,
            frameAppearances: 1,
            frameTimestamps: [fd.frameTimestamp],
            bestCropQuality: obj.cropQuality,
            bestCrop: obj.cropBuffer || null,
            mergedLogos: [],
            mergedBarcodes: [],
            mergedOcrText: "",
          } as any);
        }
      }
      ExperimentManager.recordMetric("tracking", "trackingMergedTracksCount", 0);
      ExperimentManager.recordMetric("tracking", "trackingDuplicateRemovalCount", 0);
    }
    console.log(`  ├─ ${trackedObjects.length} unique tracked objects`);
    ExperimentManager.endStage("tracking");

    // ── Stage 5b: Discovery Engine ──────────────────────────────────
    console.log(`[Stage 5b] Discovery Engine — running adaptive VLM frame discovery...`);
    const vlmDiscoveredObjects: TrackedObject[] = [];
    const evidenceMap = new Map<string, CropEvidence>();
    const confidenceMap = new Map<string, number>();

    if (enableGeminiVlm) {
      const selectedFrames = await DiscoveryEngine.selectAdaptiveKeyframes(extractedFrames, frameDetections, extractedFrames.length);
      
      function normalizedToPixelBox(box2d: number[], w: number, h: number): [number, number, number, number] {
        return [
          Math.round((box2d[1] / 1000) * w),
          Math.round((box2d[0] / 1000) * h),
          Math.round((box2d[3] / 1000) * w),
          Math.round((box2d[2] / 1000) * h)
        ];
      }

      function getIoU(boxA: number[], boxB: number[]): number {
        const xA = Math.max(boxA[0], boxB[0]);
        const yA = Math.max(boxA[1], boxB[1]);
        const xB = Math.min(boxA[2], boxB[2]);
        const yB = Math.min(boxA[3], boxB[3]);
        const interArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
        const boxAArea = (boxA[2] - boxA[0]) * (boxA[3] - boxA[1]);
        const boxBArea = (boxB[2] - boxB[0]) * (boxB[3] - boxB[1]);
        const unionArea = boxAArea + boxBArea - interArea;
        return unionArea > 0 ? interArea / unionArea : 0;
      }

      for (const frame of selectedFrames) {
        if (!fs.existsSync(frame.path)) continue;
        const frameBuffer = await fs.promises.readFile(frame.path);
        const metadata = await sharp(frameBuffer).metadata();
        const width = metadata.width || 736;
        const height = metadata.height || 414;

        console.log(`  ├─ Running VLM discovery on Frame @${frame.timestamp}s...`);
        try {
          const discovered = await DiscoveryEngine.discoverProductsFullFrame(frameBuffer, frame.timestamp);
          geminiCallCount++;
          ExperimentManager.recordApiCall(0.00015);

          for (const prod of discovered) {
            let cropBuf: Buffer | null = null;
            let pixelBox: [number, number, number, number] = [0, 0, 0, 0];

            if (prod.box_2d) {
              cropBuf = await LocalizationEngine.cropFromNormalizedBox(frameBuffer, prod.box_2d);
              pixelBox = normalizedToPixelBox(prod.box_2d, width, height);
            }

            if (!cropBuf) cropBuf = frameBuffer;

            let isDuplicate = false;
            if (prod.box_2d) {
              for (const tracked of trackedObjects) {
                if (tracked.bestBox && tracked.bestBox[2] > 0) {
                  const iou = getIoU(tracked.bestBox, pixelBox);
                  if (iou >= 0.25) {
                    tracked.mergedLogos.push(prod.brand);
                    (tracked as any).vlmAttributes = prod;
                    isDuplicate = true;
                    break;
                  }
                }
              }
            }

            if (!isDuplicate) {
              const trackingId = `vlm-${crypto.randomUUID().slice(0, 8)}`;
              const evidence: CropEvidence = {
                yoloLabel: prod.category,
                yoloConfidence: prod.confidence,
                isShoppableCategory: true,
                logo: prod.brand !== "none" ? prod.brand : null,
                logoConfidence: prod.brand !== "none" ? 0.90 : 0,
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
                gender: prod.gender !== "none" ? prod.gender : undefined,
                brand: prod.brand !== "none" ? prod.brand : undefined,
              };

              vlmDiscoveredObjects.push({
                trackingId,
                yoloLabel: prod.category,
                bestConfidence: prod.confidence,
                bestBox: pixelBox,
                frameAppearances: 1,
                frameTimestamps: [frame.timestamp],
                bestCropQuality: 0.85,
                bestCrop: cropBuf,
                mergedLogos: prod.brand !== "none" ? [prod.brand] : [],
                mergedBarcodes: [],
                mergedOcrText: "",
                vlmAttributes: prod,
              } as any);

              evidenceMap.set(trackingId, evidence);
              confidenceMap.set(trackingId, prod.confidence);
            }
          }
        } catch (e) {
          ExperimentManager.addFailure("API failures");
        }
      }
    }

    trackedObjects = [...trackedObjects, ...vlmDiscoveredObjects];

    // ── Stage 5c: Product Memory Lookup ──────────────────────────────
    const resolvedMemoryMatches = new Set<string>();
    const memoryResolvedMap = new Map<string, { evidence: CropEvidence, matches: VerifiedMatch[], confidence: number }>();

    for (const tracked of trackedObjects) {
      if (!tracked.bestCrop) continue;
      try {
        const memMatch = await ProductMemoryProvider.findMatch(tracked.bestCrop);
        if (memMatch.isMatch) {
          resolvedMemoryMatches.add(tracked.trackingId);
          evidenceMap.set(tracked.trackingId, memMatch.evidence);
          confidenceMap.set(tracked.trackingId, memMatch.confidence);

          const verifiedMatches: VerifiedMatch[] = memMatch.matches.map(m => ({
            product: m,
            marketplaceConfidence: 0.95,
            tier: "exact",
            breakdown: {
              titleSimilarity: 1.0,
              brandMatch: 1.0,
              colorMatch: 1.0,
              categoryMatch: 1.0,
              visualSimilarity: 1.0,
              priceSanity: 1.0,
              ocrMatch: 1.0
            }
          }));

          memoryResolvedMap.set(tracked.trackingId, {
            evidence: memMatch.evidence,
            matches: verifiedMatches,
            confidence: memMatch.confidence
          });
        }
      } catch {
        // Memory match fail
      }
    }

    // ── Stages 6-11: OCR & Evidence Collection ──────────────────────────
    console.log(`[Stages 6-11] Running OCR & evidence pipeline...`);
    ExperimentManager.startStage("ocr");

    let totalOcrWords = 0;
    let totalOcrLen = 0;
    let ocrCallCount = 0;
    let ocrConfidenceSum = 0;

    for (const tracked of trackedObjects) {
      if (resolvedMemoryMatches.has(tracked.trackingId)) continue;
      if (!tracked.bestCrop) continue;

      const vlmAttr = (tracked as any).vlmAttributes;
      const labelToUse = vlmAttr ? vlmAttr.category : tracked.yoloLabel;

      const result = await collectCropEvidence(
        tracked.bestCrop,
        labelToUse,
        tracked.bestConfidence,
        tracked.frameAppearances,
      );

      if (!result) {
        if (!enableOcr) {
          ExperimentManager.addFailure("missing OCR");
        }
        continue;
      }

      if (vlmAttr) {
        result.evidence.brand = vlmAttr.brand !== "none" ? vlmAttr.brand : result.evidence.logo || undefined;
        result.evidence.subcategory = vlmAttr.subcategory !== "none" ? vlmAttr.subcategory : undefined;
        result.evidence.gender = vlmAttr.gender !== "none" ? vlmAttr.gender : undefined;
        result.evidence.colorDetected = vlmAttr.color !== "unknown" ? vlmAttr.color : result.evidence.colorDetected;
        result.evidence.materialDetected = vlmAttr.material !== "none" ? vlmAttr.material : result.evidence.materialDetected;
      }

      if (result.evidence.logo) tracked.mergedLogos.push(result.evidence.logo);
      if (result.evidence.ocrText) {
        tracked.mergedOcrText = result.evidence.ocrText;
        totalOcrWords += result.evidence.meaningfulOcrWords || 0;
        totalOcrLen += result.evidence.ocrText.length;
        ocrCallCount++;
        ocrConfidenceSum += 0.85; 
      }
      if (result.evidence.barcode) tracked.mergedBarcodes.push(result.evidence.barcode);

      evidenceMap.set(tracked.trackingId, result.evidence);
      confidenceMap.set(tracked.trackingId, result.confidence.detection);
    }

    ExperimentManager.recordMetric("ocr", "ocrWordsDetectedCount", totalOcrWords);
    ExperimentManager.recordMetric("ocr", "ocrTextLength", totalOcrLen);
    ExperimentManager.recordMetric("ocr", "ocrAvgConfidence", ocrCallCount > 0 ? ocrConfidenceSum / ocrCallCount : 0);
    ExperimentManager.endStage("ocr");

    // ── Stage 12: Multi-Query Product Resolver ──────────────────────
    console.log(`[Stage 12] Generating marketplace queries...`);
    const queriesByTrackingId = new Map<string, string[]>();

    for (const [trackingId, evidence] of evidenceMap) {
      if (resolvedMemoryMatches.has(trackingId)) continue;
      const resolverResult = resolveQueries(evidence);
      queriesByTrackingId.set(trackingId, resolverResult.queries);
    }

    // ── Stages 13-14: Query Cache + Parallel Marketplace Search ─────
    console.log(`[Stages 13-14] Searching marketplaces...`);
    ExperimentManager.startStage("search");

    const matchesByTrackingId = new Map<string, VerifiedMatch[]>();
    let searchRequests = 0;
    let searchSuccesses = 0;
    let searchFailures = 0;
    let searchCacheHits = 0;
    let searchTotalReturned = 0;

    for (const [trackingId, queries] of queriesByTrackingId) {
      if (resolvedMemoryMatches.has(trackingId)) continue;
      const evidence = evidenceMap.get(trackingId)!;
      const tracked = trackedObjects.find((t) => t.trackingId === trackingId);

      let results: MarketplaceProduct[] = [];
      let cacheHits = 0;

      if (enableMarketplace) {
        try {
          const searchResult = await marketplaceMatcher.search(queries);
          results = searchResult.results;
          cacheHits = searchResult.cacheHits;
          searchRequests++;
          searchCacheHits += cacheHits;
          if (results.length > 0) {
            searchSuccesses++;
            searchTotalReturned += results.length;
          } else {
            searchFailures++;
            ExperimentManager.addFailure("wrong retrieval");
          }
        } catch {
          searchFailures++;
          ExperimentManager.addFailure("API failures");
        }
      }

      const cropBuf = tracked?.bestCrop || null;
      const precomputedSims = new Map<string, number>();

      if (cropBuf && results.length > 0 && enableMarketplace) {
        try {
          const { results: visResults } = await visualMatcher.compare(cropBuf, results);
          for (const item of visResults) {
            precomputedSims.set(item.product.itemId || item.product.link, item.visualSimilarity);
          }
        } catch {
          // Visual matcher fail
        }
      }

      // ── Stage 16: Marketplace Verification Engine ───────────────
      let verified: VerifiedMatch[] = [];
      if (enableVerification && results.length > 0) {
        verified = await verifyMarketplaceResults(evidence, results, cropBuf, 15, precomputedSims);
      } else {
        verified = results.slice(0, 15).map(p => ({
          product: p,
          marketplaceConfidence: 0.50,
          breakdown: { titleSimilarity: 0.5, brandMatch: 0.5, colorMatch: 0.5, categoryMatch: 0.5, visualSimilarity: 0.5, priceSanity: 0.5, ocrMatch: 0.5 },
          tier: "approximate"
        }));
      }

      // ── Stage 18: Adaptive Routing (Gemini Call) ─────────────
      const cropsToResolve = tracked?.crops?.map(c => c.buffer) || (cropBuf ? [cropBuf] : []);
      const resolution = await productResolver.resolve(evidence, verified, cropsToResolve);

      const isVlmSourced = trackingId.startsWith("vlm-") || !!(tracked as any)?.vlmAttributes;
      
      if (enableAdaptiveRouting && !isVlmSourced && resolution.isGeminiNeeded && cropsToResolve.length > 0 && cropBuf) {
        console.log(`  ├─ ${trackingId}: Invoking Gemini Adaptive Routing...`);
        geminiCallCount++;
        ExperimentManager.recordApiCall(0.00015);

        const topCropsB64 = cropsToResolve.slice(0, 2).map(c => c.toString("base64"));
        const geminiResult = await queryGeminiForCrops(topCropsB64, evidence);

        if (geminiResult) {
          evidence.brand = geminiResult.brand !== "none" ? geminiResult.brand : evidence.logo;
          evidence.subcategory = geminiResult.subcategory !== "none" ? geminiResult.subcategory : undefined;
          evidence.gender = geminiResult.gender !== "none" ? geminiResult.gender : undefined;
          evidence.colorDetected = geminiResult.color !== "unknown" ? geminiResult.color : evidence.colorDetected;
          evidence.materialDetected = geminiResult.material !== "none" ? geminiResult.material : evidence.materialDetected;

          const resolverResult = resolveQueries(evidence);
          const searchResult = await marketplaceMatcher.search(resolverResult.queries);
          const reResults = searchResult.results;
          searchCacheHits += searchResult.cacheHits;

          if (reResults.length > 0) {
            const { results: reVisualSimResults } = await visualMatcher.compare(cropBuf, reResults);
            const rePrecomputedSims = new Map<string, number>();
            for (const item of reVisualSimResults) {
              rePrecomputedSims.set(item.product.itemId || item.product.link, item.visualSimilarity);
            }
            const reVerified = await verifyMarketplaceResults(evidence, reResults, cropBuf, 15, rePrecomputedSims);
            const allVerified = [...verified, ...reVerified]
              .sort((a, b) => b.marketplaceConfidence - a.marketplaceConfidence);

            matchesByTrackingId.set(trackingId, allVerified.slice(0, 15));
            continue;
          }
        }
      }

      matchesByTrackingId.set(trackingId, verified);
    }

    // Merge memory-matched items
    for (const [trackingId, mem] of memoryResolvedMap) {
      matchesByTrackingId.set(trackingId, mem.matches);
      queriesByTrackingId.set(trackingId, [mem.evidence.yoloLabel]);
    }

    ExperimentManager.recordMetric("search", "marketplaceTotalRequests", searchRequests);
    ExperimentManager.recordMetric("search", "marketplaceCacheHits", searchCacheHits);
    ExperimentManager.recordMetric("search", "marketplaceCacheMisses", searchRequests - searchCacheHits);
    ExperimentManager.recordMetric("search", "marketplaceSuccessfulSearches", searchSuccesses);
    ExperimentManager.recordMetric("search", "marketplaceFailedSearches", searchFailures);
    ExperimentManager.recordMetric("search", "marketplaceAvgProductsReturned", searchRequests > 0 ? searchTotalReturned / searchRequests : 0);
    ExperimentManager.endStage("search");

    // ── Stage 16: Verification Scoring (AMEF) ──────────────────────────
    console.log(`[Stage 16] Running verification scoring...`);
    ExperimentManager.startStage("verification");
    
    let totalAmef = 0;
    let verifiedProdCount = 0;
    let sumImgSim = 0, sumOcrSim = 0, sumBrandSim = 0, sumCatSim = 0;

    for (const [trackingId, verifiedMatches] of matchesByTrackingId) {
      if (verifiedMatches.length > 0) {
        const topMatch = verifiedMatches[0];
        totalAmef += topMatch.marketplaceConfidence;
        sumImgSim += topMatch.breakdown.visualSimilarity;
        sumOcrSim += topMatch.breakdown.ocrMatch;
        sumBrandSim += topMatch.breakdown.brandMatch;
        sumCatSim += topMatch.breakdown.categoryMatch;
        verifiedProdCount++;
      }
    }

    ExperimentManager.recordMetric("verification", "verificationAvgAmefScore", verifiedProdCount > 0 ? totalAmef / verifiedProdCount : 0);
    ExperimentManager.recordMetric("verification", "verificationAvgImageSimilarity", verifiedProdCount > 0 ? sumImgSim / verifiedProdCount : 0);
    ExperimentManager.recordMetric("verification", "verificationAvgOcrSimilarity", verifiedProdCount > 0 ? sumOcrSim / verifiedProdCount : 0);
    ExperimentManager.recordMetric("verification", "verificationAvgBrandSimilarity", verifiedProdCount > 0 ? sumBrandSim / verifiedProdCount : 0);
    ExperimentManager.recordMetric("verification", "verificationAvgCategorySimilarity", verifiedProdCount > 0 ? sumCatSim / verifiedProdCount : 0);
    ExperimentManager.endStage("verification");

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
    if (process.env.BENCHMARK_RUN === "true" || process.env.ABLATION_MODE) {
      console.log(`  ├─ [Benchmark Mode] Bypassing database persistence. Metric tracking is complete.`);
      ExperimentManager.endSession(mergedProducts);
      return;
    }
    try {
      const processedProducts = [];
      for (const product of mergedProducts) {
        const processedMatches = [];
        for (const match of product.allMatches.slice(0, 10)) {
          const matchId = `match_${crypto.randomUUID().slice(0, 12)}`;
          const galleryUrls = match.product.galleryImageUrls || [];
          if (match.product.thumbnail && !galleryUrls.includes(match.product.thumbnail)) {
            galleryUrls.unshift(match.product.thumbnail);
          }
          const { imageUrl, galleryImageUrls } = await downloadAndCacheGallery(matchId, galleryUrls);
          processedMatches.push({ id: matchId, match, imageUrl, galleryImageUrls });
        }
        processedProducts.push({ product, processedMatches });
      }

      await prisma.detectedProduct.deleteMany({ where: { postId: videoId } });

      for (const product of mergedProducts) {
        const evidence = evidenceMap.get(product.trackingId);
        if (!evidence) continue;

        let cropUrl: string | null = null;
        if (product.detection.bestCrop && !(process.env.BENCHMARK_RUN === "true" || process.env.ABLATION_MODE)) {
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
          } catch { /* upload fail */ }
        }

        let sourceFrameUrl: string | null = null;
        const matchingFrame = extractedFrames.find((f) => product.timeline.includes(f.timestamp));
        if (matchingFrame && fs.existsSync(matchingFrame.path) && !(process.env.BENCHMARK_RUN === "true" || process.env.ABLATION_MODE)) {
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
          } catch { /* upload fail */ }
        }

        const processed = processedProducts.find((p) => p.product.trackingId === product.trackingId)!;
        const label = product.bestMatch?.product.title
          ? cleanMarketplaceTitle(product.bestMatch.product.title)
          : product.resolvedQueries[0] || evidence.yoloLabel;

        const category = getCategoryForLabel(evidence.yoloLabel);
        const canonicalProductId = await getOrCreateCanonicalProduct(label, evidence.logo || undefined, category);

        const cropDHash = product.detection.bestCrop
          ? await ProductMemoryProvider.computeDHash(product.detection.bestCrop)
          : null;

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
            detectionSessionId: session.id,
            cropImageUrl: cropUrl,
            cropQualityScore: evidence.cropQuality.score,
            ocrText: evidence.ocrText || undefined,
            detectedLogo: evidence.logo || undefined,
            detectedBarcode: evidence.barcode || undefined,
            confidenceBreakdown: {
              dHash: cropDHash || undefined,
              detectorConfidence: evidence.yoloConfidence,
              discoveryConfidence: product.detectionConfidence,
              marketplaceConfidence: product.marketplaceConfidence,
              visualMatchConfidence: product.bestMatch?.marketplaceConfidence || 0.5,
              finalConfidence: product.detectionConfidence,
              confidenceVersion: "v3",
            } as any,
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
            visionConfidence: product.detectionConfidence,
            shoppingMatchConfidence: product.marketplaceConfidence,
            completenessScore: calculateCompleteness(evidence, product),
            isVerifiedMatch: product.marketplaceConfidence >= 0.50,
            matches: {
              create: processed.processedMatches.map((pm) => {
                const match = pm.match;
                const parsedPrice = parsePriceToFloat(match.product.price);
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
                  rawPayload: match.product as any,
                  rating: match.product.rating || undefined,
                  reviewCount: match.product.reviewCount || undefined,
                  sellerName: match.product.sellerName || undefined,
                  sellerRating: match.product.sellerRating || undefined,
                  shippingCost: match.product.shippingCost || undefined,
                  estimatedDelivery: match.product.estimatedDelivery || undefined,
                  originalPrice: match.product.originalPrice || undefined,
                  discountPercent: match.product.discountPercent || undefined,
                  cachedAt: new Date(),
                  priceHistories: parsedPrice !== null ? { create: { price: parsedPrice } } : undefined,
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

        for (const timestamp of product.timeline) {
          await prisma.productTimeline.create({
            data: { detectedProductId: detectedProduct.id, timestamp },
          }).catch(() => {});
        }
      }

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

      await prisma.videoProcessingJob.update({
        where: { postId: videoId },
        data: { status: finalStatus, completedAt: new Date() },
      });
    } catch (dbErr) {
      console.warn(`[Stage 20] Database persist skipped or failed. Metrics are preserved.`, dbErr);
    }

    // Resolve details for accuracy scoring
    const fullDetectionsForAccuracy = mergedProducts.map(prod => {
      const evidence = evidenceMap.get(prod.trackingId);
      return {
        category: getCategoryForLabel(evidence?.yoloLabel || ""),
        detectedLogo: evidence?.logo || prod.bestMatch?.product.brand || null,
        label: prod.bestMatch?.product.title || "",
        matches: prod.allMatches.map(m => ({
          title: m.product.title,
          brand: m.product.brand || null,
          verificationScore: m.marketplaceConfidence
        })),
        marketplaceConfidence: prod.marketplaceConfidence
      };
    });

    // End Research Session
    ExperimentManager.endSession(fullDetectionsForAccuracy);

    console.log(`\n${"─".repeat(60)}`);
    console.log(`  ✅ Pipeline complete for ${videoId}`);
    console.log(`  Products: ${mergedProducts.length} | Frames: ${extractedFrames.length}`);
    console.log(`  Gemini calls: ${geminiCallCount}`);
    console.log(`  Time: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
    console.log(`${"─".repeat(60)}\n`);
  } catch (err: any) {
    console.error(`[Pipeline] Error processing ${videoId}:`, err);
    ExperimentManager.addFailure("API failures");
    
    // End session with failure
    ExperimentManager.endSession([]);

    await prisma.detectionSession.update({
      where: { id: session.id },
      data: {
        status: "failed",
        processingTimeMs: Date.now() - startTime,
        completedAt: new Date(),
      },
    }).catch(() => {});

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
    try {
      if (fs.existsSync(tempVideoPath) && !path.basename(tempVideoPath).startsWith("cached-")) {
        fs.unlinkSync(tempVideoPath);
      }
      extractedFrames.forEach((f) => {
        if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
      });
    } catch { /* cleanup errors */ }
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

export async function verifyAndStartCVServer() {
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

// Only start worker if this file is run directly as the entry point
if (process.argv[1] && (process.argv[1].endsWith("videoProductWorker.ts") || process.argv[1].endsWith("videoProductWorker.js"))) {
  startWorker().catch((err) => {
    console.error("Fatal worker error:", err);
    process.exit(1);
  });
}
