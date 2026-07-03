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

export interface ConfidenceBreakdown {
  score: number;
  needCloud: boolean;
  reasons: string[];
}

export interface PipelineResult {
  objects: DetectedItem[];
  needCloudVision: boolean;
  overallConfidence: number;
  confidenceReasons: string[];
}

// Canonical Barcode Registry: only included when barcode is ACTUALLY decoded from real image
export const BARCODE_REGISTRY: Record<string, { label: string; category: string }> = {
  "884966820542": { label: "Nike Air Max SYSTM Men's Sneakers", category: "Shoes" },
  "190228392182": { label: "Adidas Originals Stan Smith Shoes", category: "Shoes" },
  "019123456789": { label: "Levi's 501 Original Fit Jeans", category: "Clothing" },
  "888241604561": { label: "Casio G-Shock Classic Digital Watch", category: "Watches" },
};

// Lightweight file-based cache for image hash → cv detections
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
    return data[hash] ?? null;
  } catch {
    return null;
  }
}

function setCachedDetections(hash: string, objects: DetectedItem[]) {
  ensureCacheDir();
  let data: Record<string, DetectedItem[]> = {};
  if (fs.existsSync(CACHE_FILE)) {
    try { data = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8")); } catch { data = {}; }
  }
  data[hash] = objects;
  try { fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2), "utf-8"); } catch { }
}

export class DetectionPipeline {
  private static CV_SERVICE_URL = "http://localhost:5000/detect";

  static async run(imageBuffer: Buffer): Promise<PipelineResult> {
    const md5Hash = crypto.createHash("md5").update(imageBuffer).digest("hex");
    const cached = getCachedDetections(md5Hash);

    if (cached) {
      console.log(`[DetectionPipeline] Cache hit for hash ${md5Hash.slice(0, 8)}...`);
      const { score, needCloud, reasons } = this.calculateConfidence(cached);
      return { objects: cached, needCloudVision: needCloud, overallConfidence: score, confidenceReasons: reasons };
    }

    try {
      const imgBase64 = imageBuffer.toString("base64");
      const response = await fetch(this.CV_SERVICE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imgBase64 }),
      });

      if (!response.ok) {
        throw new Error(`CV Service status ${response.status}`);
      }

      const body = await response.json();
      const objects: DetectedItem[] = body.objects || [];

      setCachedDetections(md5Hash, objects);

      const { score, needCloud, reasons } = this.calculateConfidence(objects);
      return { objects, needCloudVision: needCloud, overallConfidence: score, confidenceReasons: reasons };

    } catch (error) {
      console.warn("[DetectionPipeline] CV service unavailable. Forcing VLM:", error);
      return { objects: [], needCloudVision: true, overallConfidence: 0.0, confidenceReasons: ["CV service offline"] };
    }
  }

  /**
   * Additive evidence-based confidence scoring.
   * Confidence = confidence in the IDENTIFIED PRODUCT, not just that evidence exists.
   *
   * Points system (max 100):
   *   +50  Barcode decoded from actual image AND resolved to known product in registry
   *   +30  Logo/brand clearly detected from OCR
   *   +25  OCR contains model number or product-specific text (non-generic)
   *   +20  YOLO label matches a relevant fashion/product category
   *   +10  Color/style attributes detected
   *
   * Threshold:
   *   >= 80 → Skip VLM (high confidence product is identified)
   *   < 80  → Invoke Vision AI
   *
   * NOTE: A barcode alone scores 50, which is NOT enough to skip VLM.
   *       Barcode + logo = 80, which is the minimum threshold.
   *       This forces VLM for single-signal detections.
   */
  private static calculateConfidence(objects: DetectedItem[]): ConfidenceBreakdown {
    if (objects.length === 0) {
      return { score: 0, needCloud: true, reasons: ["No objects detected"] };
    }

    let highestScore = 0;
    let bestReasons: string[] = [];

    const FASHION_LABELS = new Set([
      "shoe", "shoes", "sneaker", "boot", "sandal",
      "shirt", "t-shirt", "top", "dress", "jacket", "coat", "hoodie", "sweater", "jeans",
      "bag", "handbag", "backpack", "purse",
      "watch", "clock", "sunglasses", "glasses",
      "tie", "belt", "hat", "cap",
    ]);

    for (const obj of objects) {
      let score = 0;
      const reasons: string[] = [];

      const hasBarcode = !!obj.barcode;
      const barcodeResolved = hasBarcode && !!BARCODE_REGISTRY[obj.barcode!];
      const hasLogo = !!obj.logo && obj.logo.trim().length > 0;
      const ocrWords = (obj.ocrText || "").trim().split(/\s+/).filter((w) => w.length > 1);
      const hasOcr = ocrWords.length > 0;
      // "Meaningful" OCR = not just generic words like "the", "and"
      const genericWords = new Set(["the", "and", "for", "with", "made", "in", "by", "of", "a", "an"]);
      const meaningfulOcr = ocrWords.filter((w) => !genericWords.has(w.toLowerCase())).length > 0;
      const yoloLabel = (obj.label || "").toLowerCase().trim();
      const isFashionLabel = FASHION_LABELS.has(yoloLabel) || yoloLabel.includes("shoe") || yoloLabel.includes("bag");
      const yoloConf = obj.confidence || 0;

      // Barcode: only counts if actually decoded AND resolved
      if (barcodeResolved) {
        score += 50;
        reasons.push(`Barcode resolved → "${BARCODE_REGISTRY[obj.barcode!].label}" (+50)`);
      } else if (hasBarcode) {
        score += 15;
        reasons.push(`Barcode detected but NOT in registry — VLM needed (+15)`);
      }

      // Logo/brand detected via OCR
      if (hasLogo) {
        score += 30;
        reasons.push(`Logo detected: "${obj.logo}" (+30)`);
      }

      // Meaningful OCR text (model codes, brand words)
      if (meaningfulOcr && hasOcr) {
        score += 25;
        reasons.push(`OCR text: "${ocrWords.slice(0, 3).join(" ")}" (+25)`);
      }

      // YOLO fashion category match (weighted by detection confidence)
      if (isFashionLabel && yoloConf > 0.4) {
        const yoloPoints = Math.round(yoloConf * 20);
        score += yoloPoints;
        reasons.push(`YOLO: "${obj.label}" conf=${yoloConf.toFixed(2)} (+${yoloPoints})`);
      } else if (yoloLabel) {
        reasons.push(`YOLO: "${obj.label}" — not fashion category or low conf (0 pts)`);
      }

      // Attribute bonus
      if (obj.attributes?.color && obj.attributes.color !== "unknown") {
        score += 10;
        reasons.push(`Color detected: "${obj.attributes.color}" (+10)`);
      }

      if (score > highestScore) {
        highestScore = score;
        bestReasons = reasons;
      }
    }

    // Normalize to 0.0–1.0 range (max possible = 135 points)
    const normalized = Math.min(1.0, highestScore / 135);
    // Threshold: need >= 80 raw points (≈ 0.59 normalized) AND barcode must be resolved OR logo present
    const topObj = objects[0];
    const hasResolvedBarcode = !!topObj?.barcode && !!BARCODE_REGISTRY[topObj.barcode!];
    const hasLogo = !!topObj?.logo;
    const needCloud = highestScore < 80 || (!hasResolvedBarcode && !hasLogo);

    return {
      score: normalized,
      needCloud,
      reasons: bestReasons,
    };
  }
}
