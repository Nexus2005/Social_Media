import crypto from "crypto";
import fs from "fs";
import path from "path";

export interface DetectedItem {
  box: number[];
  label: string;
  confidence: number;
  ocrText?: string;
  barcode?: string | null;
  logo?: string | null;
  attributes?: Record<string, any>;
}

export interface PipelineResult {
  objects: DetectedItem[];
  needCloudVision: boolean;
  overallConfidence: number;
}

// Canonical Barcode Registry to map GTIN/UPC directly to product names
export const BARCODE_REGISTRY: Record<string, { label: string; category: string }> = {
  "884966820542": { label: "Nike Air Max SYSTM Men's Sneakers", category: "Shoes" },
  "190228392182": { label: "Adidas Originals Men Stan Smith Shoes", category: "Shoes" },
  "019123456789": { label: "Levi's Men's 501 Original Fit Jeans", category: "Clothing" },
  "888241604561": { label: "Casio G-Shock Classic Digital Watch", category: "Watches" },
};

// Lightweight file-based cache in the tmp folder to persist hash lookups across execution
const CACHE_DIR = path.join(process.cwd(), "tmp");
const CACHE_FILE = path.join(CACHE_DIR, "cv_image_cache.json");

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function getCachedDetections(hash: string): DetectedItem[] | null {
  ensureCacheDir();
  if (!fs.existsSync(CACHE_FILE)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
    return data[hash] || null;
  } catch (e) {
    console.error("Failed to read CV cache file:", e);
    return null;
  }
}

function setCachedDetections(hash: string, objects: DetectedItem[]) {
  ensureCacheDir();
  let data: Record<string, DetectedItem[]> = {};
  if (fs.existsSync(CACHE_FILE)) {
    try {
      data = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
    } catch (e) {
      data = {};
    }
  }
  data[hash] = objects;
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to save CV cache file:", e);
  }
}

export class DetectionPipeline {
  private static CV_SERVICE_URL = "http://localhost:5000/detect";

  /**
   * Run local detection: hashes the image, checks the cache, queries Python CV service,
   * calculates confidence, and determines if cloud Vision VLM fallback is required.
   */
  static async run(imageBuffer: Buffer): Promise<PipelineResult> {
    // 1. MD5 Hash check
    const md5Hash = crypto.createHash("md5").update(imageBuffer).digest("hex");
    const cached = getCachedDetections(md5Hash);
    if (cached) {
      console.log(`[DetectionPipeline] Image hash ${md5Hash} found in cache. Skipping AI inference.`);
      const { score, needCloud } = this.calculateConfidence(cached);
      return {
        objects: cached,
        needCloudVision: needCloud,
        overallConfidence: score,
      };
    }

    try {
      // 2. Query Python Computer Vision service
      const imgBase64 = imageBuffer.toString("base64");
      const response = await fetch(this.CV_SERVICE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: imgBase64 }),
      });

      if (!response.ok) {
        throw new Error(`Local CV Service responded with status ${response.status}`);
      }

      const body = await response.json();
      const objects: DetectedItem[] = body.objects || [];

      // 3. Save to cache
      setCachedDetections(md5Hash, objects);

      // 4. Calculate overall confidence score
      const { score, needCloud } = this.calculateConfidence(objects);

      return {
        objects,
        needCloudVision: needCloud,
        overallConfidence: score,
      };
    } catch (error) {
      console.warn("[DetectionPipeline] Local CV microservice query failed. Forcing VLM fallback. Error:", error);
      return {
        objects: [],
        needCloudVision: true,
        overallConfidence: 0.0,
      };
    }
  }

  /**
   * Evidence-based overall confidence scoring.
   * - Barcode mapped to known product: 1.00 (Skip VLM)
   * - Barcode unmapped: 0.50 (Requires VLM)
   * - OCR + Logo: 0.92 (Skip VLM)
   * - Generic label (e.g. shoe): 0.30 (Requires VLM)
   * - Nothing: 0.10 (Requires VLM)
   */
  private static calculateConfidence(objects: DetectedItem[]): { score: number; needCloud: boolean } {
    if (objects.length === 0) {
      return { score: 0.10, needCloud: true };
    }

    let highestScore = 0.0;

    for (const obj of objects) {
      let score = 0.0;
      
      const hasBarcode = !!obj.barcode;
      const hasLogo = !!obj.logo;
      const hasOcr = !!obj.ocrText && obj.ocrText.trim().length > 0;
      const yoloConf = obj.confidence || 0.0;

      if (hasBarcode) {
        const isResolved = !!BARCODE_REGISTRY[obj.barcode!];
        score = isResolved ? 1.00 : 0.50; // Set to 0.50 if barcode cannot be locally resolved
      } else if (hasLogo && hasOcr) {
        score = 0.92;
      } else if (hasOcr) {
        score = 0.65;
      } else {
        score = yoloConf * 0.35; // Generic label is low confidence (e.g. 0.35 * 0.9 = 0.315)
      }

      if (score > highestScore) {
        highestScore = score;
      }
    }

    // Any confidence score below 0.85 requires Cloud Vision query enrichment
    return {
      score: highestScore,
      needCloud: highestScore < 0.85,
    };
  }
}
