/**
 * Cartly v3 — Detection Pipeline (Phase 1)
 *
 * Per-crop processing pipeline with confidence gating and selective OCR:
 *   1. Confidence Gating (< 0.45 → reject, 0.45–0.65 → needs evidence, ≥ 0.65 → direct)
 *   2. Crop Quality Filter → skip bad crops
 *   3. Brand/Logo Detection → identify brand FIRST
 *   4. Selective OCR (only on text-benefiting categories)
 *   5. Barcode (bonus only) → near-certain if found
 *   6. Visual Attributes (color, shape)
 *   7. Confidence Scoring (visual-first, barcode bonus)
 *
 * Key design decisions:
 * - Confidence gating saves API calls by rejecting low-confidence detections early
 * - OCR only runs on categories that benefit from text recognition (shoes, watches, phones, electronics, bottles)
 * - Logo detection runs BEFORE OCR so OCR is brand-informed
 * - Barcode is a bonus signal — no penalty when absent
 * - Returns detection confidence separate from marketplace confidence
 */

import sharp from "sharp";
import { assessCropQuality, CropQualityResult } from "./cropQualityFilter";
import { IObjectDetector, YoloDetection, StageMetrics } from "./interfaces";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CropEvidence {
  yoloLabel: string;
  yoloConfidence: number;
  isShoppableCategory: boolean;

  // Logo (runs BEFORE OCR)
  logo: string | null;
  logoConfidence: number;

  // OCR (informed by logo)
  ocrText: string;
  meaningfulOcrWords: number;
  ocrPreview: string;

  // Barcode (bonus only)
  barcode: string | null;

  // Visual attributes
  colorDetected: string | null;
  materialDetected: string | null;
  shapeCategory: string | null;

  // Structured fashion details
  gender?: string | null;
  neckline?: string | null;
  sleeve?: string | null;
  fit?: string | null;
  pattern?: string | null;
  subcategory?: string | null;
  occasion?: string | null;
  visibleAccessories?: string | null;
  brand?: string | null;

  // Frame tracking
  frameAppearances: number;

  // Quality
  cropQuality: CropQualityResult;
}

export interface DetectionConfidenceResult {
  detection: number;           // "I'm sure this IS a [label]" (0.0 - 1.0)
  detectionReasons: string[];
  barcodeBonus: boolean;
}

export interface PipelineResult {
  evidence: CropEvidence;
  confidence: DetectionConfidenceResult;
  needVisionAI: boolean;       // true if detection confidence is very low
}

// ─── CV Service Communication ─────────────────────────────────────────────────

const CV_SERVICE_URL = "http://localhost:5000";

export class OpenImagesDetector implements IObjectDetector {
  async detect(frameBuffer: Buffer): Promise<{ detections: YoloDetection[]; metrics: StageMetrics }> {
    const startTime = Date.now();
    try {
      const response = await fetch(`${CV_SERVICE_URL}/detect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: frameBuffer.toString("base64"),
          provider: "openimages"
        }),
      });

      if (!response.ok) {
        throw new Error(`YOLO OpenImages detection failed with status ${response.status}`);
      }

      const body = await response.json();
      if (body.debug?.debug_log_str) {
        console.log(body.debug.debug_log_str);
      }

      return {
        detections: (body.objects || []) as YoloDetection[],
        metrics: {
          latencyMs: Date.now() - startTime,
          success: true,
          metadata: { provider: "openimages", count: body.objects?.length || 0 }
        }
      };
    } catch (err: any) {
      console.warn("[OpenImagesDetector] failed:", err);
      return {
        detections: [],
        metrics: {
          latencyMs: Date.now() - startTime,
          success: false,
          metadata: { provider: "openimages", error: err.message }
        }
      };
    }
  }
}

export class FashionpediaDetector implements IObjectDetector {
  async detect(frameBuffer: Buffer): Promise<{ detections: YoloDetection[]; metrics: StageMetrics }> {
    const startTime = Date.now();
    try {
      const response = await fetch(`${CV_SERVICE_URL}/detect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: frameBuffer.toString("base64"),
          provider: "fashionpedia"
        }),
      });

      if (!response.ok) {
        throw new Error(`YOLO Fashionpedia detection failed with status ${response.status}`);
      }

      const body = await response.json();
      if (body.debug?.debug_log_str) {
        console.log(body.debug.debug_log_str);
      }

      return {
        detections: (body.objects || []) as YoloDetection[],
        metrics: {
          latencyMs: Date.now() - startTime,
          success: true,
          metadata: { provider: "fashionpedia", count: body.objects?.length || 0 }
        }
      };
    } catch (err: any) {
      console.warn("[FashionpediaDetector] failed:", err);
      return {
        detections: [],
        metrics: {
          latencyMs: Date.now() - startTime,
          success: false,
          metadata: { provider: "fashionpedia", error: err.message }
        }
      };
    }
  }
}

/**
 * Run YOLO detection on a full frame. Returns all shoppable objects detected (Default OpenImages implementation).
 */
export async function detectObjectsInFrame(frameBuffer: Buffer): Promise<YoloDetection[]> {
  try {
    const detector = new OpenImagesDetector();
    const { detections } = await detector.detect(frameBuffer);
    return detections;
  } catch (error) {
    console.warn("[DetectionPipeline] CV service unavailable for YOLO:", error);
    return [];
  }
}

/**
 * Crop a detected object from a frame using its bounding box.
 */
export async function cropObjectFromFrame(
  frameBuffer: Buffer,
  box: number[],
): Promise<Buffer | null> {
  try {
    const [x1, y1, x2, y2] = box;
    const image = sharp(frameBuffer);
    const metadata = await image.metadata();
    const width = metadata.width || 1;
    const height = metadata.height || 1;

    // Pad by 15% of width/height on each side to avoid clipping sleeves or shoes
    const w = x2 - x1;
    const h = y2 - y1;
    const padX = w * 0.15;
    const padY = h * 0.15;

    const left = Math.max(0, Math.round(x1 - padX));
    const top = Math.max(0, Math.round(y1 - padY));
    const cropWidth = Math.max(1, Math.min(Math.round(x2 + padX - left), width - left));
    const cropHeight = Math.max(1, Math.min(Math.round(y2 + padY - top), height - top));

    return await image
      .extract({ left, top, width: cropWidth, height: cropHeight })
      .jpeg({ quality: 85 })
      .toBuffer();
  } catch (err) {
    console.error("[DetectionPipeline] Failed to crop object:", err);
    return null;
  }
}

// ─── Confidence Gating Thresholds ─────────────────────────────────────────────

const CONFIDENCE_REJECT = 0.25;    // Lowered to match the specialized fashion model
const CONFIDENCE_NEEDS_EVIDENCE = 0.55; // Lowered to align with the better model

// ─── Selective OCR Categories ─────────────────────────────────────────────────
// OCR is slow. Only run it on categories that benefit from text recognition.

const OCR_BENEFICIAL_CATEGORIES = new Set([
  // Footwear (model numbers, brand names on sole/tongue)
  "shoe", "shoes", "sneaker", "sneakers", "boot", "boots",
  // Watches (brand names, model)
  "watch", "smartwatch",
  // Electronics (model numbers, specs)
  "phone", "cell phone", "laptop", "tablet", "keyboard", "camera", "headphones",
  // Drinkware (brand names)
  "bottle", "cup", "mug",
  // Bags with logos
  "handbag", "backpack", "bag",
  // Eyewear with brand names
  "sunglasses", "glasses",
]);

// Wearable fashion items that should bypass the evidence check (logo/OCR is not mandatory)
const FASHION_CATEGORIES = new Set([
  "clothing", "coat", "dress", "footwear", "jacket", "shirt", "suit", "trousers", "jeans",
  "pants", "skirt", "sweater", "boot", "sneaker", "shoes", "shoe", "hat", "scarf", "belt",
  "necklace", "earrings", "glasses", "sunglasses"
]);

function shouldRunOCR(yoloLabel: string, hasLogo: boolean, yoloConfidence: number): boolean {
  // Always run OCR if logo was detected (likely has brand text)
  if (hasLogo) return true;

  // Run OCR on text-benefiting categories
  if (OCR_BENEFICIAL_CATEGORIES.has(yoloLabel.toLowerCase())) return true;

  // High-confidence detections on any category: skip OCR to save time
  if (yoloConfidence >= 0.80) return false;

  // For medium-confidence detections, OCR might help identify the product
  if (yoloConfidence >= CONFIDENCE_NEEDS_EVIDENCE) return false;

  return false;
}

// ─── Per-Crop Evidence Collection ─────────────────────────────────────────────

/**
 * Run the complete evidence collection pipeline on a single crop.
 *
 * Confidence Gating:
 *   < 0.45 → Reject (don't waste API calls)
 *   0.45–0.65 → Needs logo or OCR evidence to proceed
 *   ≥ 0.65 → Direct marketplace search
 *
 * Selective OCR: Only runs on categories that benefit from text recognition.
 *
 * Order: Gating → Quality → Logo → OCR (selective) → Barcode → Attributes
 */
export async function collectCropEvidence(
  cropBuffer: Buffer,
  yoloLabel: string,
  yoloConfidence: number,
  frameAppearances: number,
): Promise<PipelineResult | null> {
  // ── Step 0: Confidence Gating ─────────────────────────────────────────────
  if (yoloConfidence < CONFIDENCE_REJECT) {
    console.log(`  ├─ REJECT: YOLO confidence ${yoloConfidence.toFixed(2)} < ${CONFIDENCE_REJECT} threshold for "${yoloLabel}"`);
    return null;
  }

  const needsEvidence = yoloConfidence < CONFIDENCE_NEEDS_EVIDENCE;
  const isFashion = FASHION_CATEGORIES.has(yoloLabel.toLowerCase());
  if (needsEvidence) {
    if (isFashion) {
      console.log(`  ├─ GATED: YOLO confidence ${yoloConfidence.toFixed(2)} for fashion item "${yoloLabel}" (bypassing evidence requirements)`);
    } else {
      console.log(`  ├─ GATED: YOLO confidence ${yoloConfidence.toFixed(2)} (needs logo/OCR evidence to proceed)`);
    }
  }

  const base64Crop = cropBuffer.toString("base64");

  // ── Step 1: Crop Quality Filter ───────────────────────────────────────────
  const cropQuality = await assessCropQuality(cropBuffer);
  if (!cropQuality.pass) {
    console.log(`  ├─ SKIP: Crop quality too low (${cropQuality.score.toFixed(2)}) — reason: ${cropQuality.skipReason}`);
    return null;
  }

  // ── Step 2: Brand/Logo Detection (BEFORE OCR) ─────────────────────────────
  let logo: string | null = null;
  let logoConfidence = 0;
  try {
    const logoResponse = await fetch(`${CV_SERVICE_URL}/logo-detect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64Crop }),
    });
    if (logoResponse.ok) {
      const logoResult = await logoResponse.json();
      logo = logoResult.brand || null;
      logoConfidence = logoResult.confidence || 0;
    }
  } catch {
    // Logo detection unavailable — continue without it
  }

  // ── Step 2b: Evidence Gate Check ───────────────────────────────────────────
  // For low-confidence detections, reject if no logo was found (unless it is fashion)
  if (needsEvidence && !logo && !isFashion) {
    // Still allow if we detect OCR text in a beneficial category
    if (!OCR_BENEFICIAL_CATEGORIES.has(yoloLabel.toLowerCase())) {
      console.log(`  ├─ REJECT: Low confidence (${yoloConfidence.toFixed(2)}) + no logo + non-OCR category "${yoloLabel}"`);
      return null;
    }
  }

  // ── Step 3: Selective OCR (informed by known brand) ───────────────────────
  let ocrText = "";
  let meaningfulOcrWords = 0;
  let ocrPreview = "";

  if (shouldRunOCR(yoloLabel, !!logo, yoloConfidence)) {
    try {
      const ocrResponse = await fetch(`${CV_SERVICE_URL}/ocr-crop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64Crop, knownBrand: logo }),
      });
      if (ocrResponse.ok) {
        const ocrResult = await ocrResponse.json();
        ocrText = ocrResult.text || "";

        // Count meaningful words (exclude generic/noise words)
        const genericWords = new Set([
          "the", "and", "for", "with", "made", "in", "by", "of", "a", "an",
          "to", "is", "it", "or", "at", "on", "no", "be", "do",
        ]);
        const words = ocrText.split(/\s+/).filter((w: string) => w.length > 2);
        meaningfulOcrWords = words.filter(
          (w: string) => !genericWords.has(w.toLowerCase()),
        ).length;
        ocrPreview = words.slice(0, 4).join(" ");
      }
    } catch {
      // OCR unavailable — continue without it
    }
  } else {
    console.log(`  ├─ OCR skipped: category "${yoloLabel}" does not benefit from text recognition`);
  }

  // ── Step 3b: Final Evidence Gate Check ─────────────────────────────────────
  // For gated detections: reject if we have neither logo nor OCR text (unless it is fashion)
  if (needsEvidence && !logo && meaningfulOcrWords === 0 && !isFashion) {
    console.log(`  ├─ REJECT: Gated detection (${yoloConfidence.toFixed(2)}) with no logo and no OCR evidence`);
    return null;
  }

  // ── Step 4: Barcode Detection (bonus only) ────────────────────────────────
  let barcode: string | null = null;
  try {
    const barcodeResponse = await fetch(`${CV_SERVICE_URL}/barcode-crop`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64Crop }),
    });
    if (barcodeResponse.ok) {
      const barcodeResult = await barcodeResponse.json();
      barcode = barcodeResult.barcode || null;
    }
  } catch {
    // Barcode detection unavailable — no penalty
  }

  // ── Step 5: Visual Attributes ─────────────────────────────────────────────
  let colorDetected: string | null = null;
  let materialDetected: string | null = null;
  let shapeCategory: string | null = null;
  try {
    const attrResponse = await fetch(`${CV_SERVICE_URL}/attributes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64Crop }),
    });
    if (attrResponse.ok) {
      const attrResult = await attrResponse.json();
      colorDetected = attrResult.color || null;
      materialDetected = attrResult.material || null;
      shapeCategory = attrResult.shape || null;
    }
  } catch {
    // Attributes unavailable — continue
  }

  // ── Build Evidence ────────────────────────────────────────────────────────
  const isShoppableCategory = isShoppable(yoloLabel);

  const evidence: CropEvidence = {
    yoloLabel,
    yoloConfidence,
    isShoppableCategory,
    logo,
    logoConfidence,
    ocrText,
    meaningfulOcrWords,
    ocrPreview,
    barcode,
    colorDetected,
    materialDetected,
    shapeCategory,
    frameAppearances,
    cropQuality,
  };

  // ── Calculate Detection Confidence ────────────────────────────────────────
  const confidence = calculateDetectionConfidence(evidence);

  // Log evidence summary
  const ocrStatus = shouldRunOCR(yoloLabel, !!logo, yoloConfidence) ? `ocr="${ocrPreview || "(none)"}"` : "ocr=SKIPPED";
  console.log(`  ├─ Evidence: logo="${logo || "(none)"}" ${ocrStatus} barcode="${barcode || "(none)"}" color="${colorDetected || "(none)"}" quality=${cropQuality.score.toFixed(2)}`);
  console.log(`  ├─ Detection confidence: ${confidence.detection.toFixed(2)} — ${confidence.detectionReasons.join(" | ")}`);

  return {
    evidence,
    confidence,
    needVisionAI: confidence.detection < 0.30, // very low — unclear what object is
  };
}

// ─── Confidence Scoring (Visual-First, Barcode Bonus) ─────────────────────────

/**
 * Visual-first confidence scoring.
 *
 * Weights:
 *   Visual (color, shape, category)  35%
 *   Logo/brand detection             20%
 *   OCR (model numbers, text)        20%
 *   YOLO category + confidence       15%
 *   Color/material                   10%
 *   Barcode                          BONUS ONLY (no penalty if absent)
 *
 * This is the DETECTION confidence ("I'm sure this IS a shoe").
 * Marketplace confidence is calculated separately by the Verification Engine.
 */
function calculateDetectionConfidence(evidence: CropEvidence): DetectionConfidenceResult {
  let score = 0;
  const reasons: string[] = [];

  // ── Visual (35 max) ─────────────────────────────────────────────────────
  if (evidence.yoloConfidence >= CONFIDENCE_REJECT) {
    const visualPoints = Math.round(evidence.yoloConfidence * 20); // up to 20
    score += visualPoints;
    reasons.push(`YOLO: "${evidence.yoloLabel}" conf=${evidence.yoloConfidence.toFixed(2)} (+${visualPoints})`);
  }
  if (evidence.colorDetected && evidence.colorDetected !== "unknown") {
    score += 8;
    reasons.push(`Color: "${evidence.colorDetected}" (+8)`);
  }
  if (evidence.shapeCategory) {
    score += 7;
    reasons.push(`Shape: "${evidence.shapeCategory}" (+7)`);
  }

  // ── Logo (20 max) ───────────────────────────────────────────────────────
  if (evidence.logo) {
    score += 20;
    reasons.push(`Logo: "${evidence.logo}" (+20)`);
  }

  // ── OCR (20 max) ────────────────────────────────────────────────────────
  if (evidence.meaningfulOcrWords > 0) {
    const ocrPoints = Math.min(20, evidence.meaningfulOcrWords * 7);
    score += ocrPoints;
    reasons.push(`OCR: "${evidence.ocrPreview}" (+${ocrPoints})`);
  }

  // ── Category (15 max) ───────────────────────────────────────────────────
  if (evidence.isShoppableCategory) {
    score += 15;
    reasons.push(`Shoppable category (+15)`);
  }

  // ── Color/Material (10 max) ─────────────────────────────────────────────
  if (evidence.materialDetected) {
    score += 5;
    reasons.push(`Material: "${evidence.materialDetected}" (+5)`);
  }
  if (evidence.frameAppearances >= 2) {
    score += 5;
    reasons.push(`Tracked × ${evidence.frameAppearances} frames (+5)`);
  }

  // ── BARCODE BONUS (not part of base score) ──────────────────────────────
  let barcodeBonus = false;
  if (evidence.barcode) {
    score = Math.max(score, 90); // barcode = near-certain, override upward
    barcodeBonus = true;
    reasons.push(`BARCODE BONUS: "${evidence.barcode}" → score overridden to ≥90`);
  }

  const normalized = Math.min(1.0, score / 100);
  return { detection: normalized, detectionReasons: reasons, barcodeBonus };
}

// ─── Shoppable Class List ────────────────────────────────────────────────────

const SHOPPABLE_LABELS = new Set([
  // COCO classes
  "backpack", "handbag", "suitcase", "umbrella", "tie",
  "cell phone", "laptop", "remote", "keyboard", "mouse", "tv",
  "chair", "couch", "bed", "dining table",
  "bottle", "wine glass", "cup", "bowl", "vase", "clock",
  "book", "scissors",
  "sports ball", "tennis racket", "skateboard", "surfboard",
  "snowboard", "skis", "bicycle", "motorcycle",
  // VLM-detected categories (not in COCO but detected by Gemini)
  "clothing", "shoe", "shoes", "sneaker", "sneakers", "boot", "boots", "sandal", "sandals",
  "shirt", "t-shirt", "top", "dress", "jacket", "coat", "hoodie", "sweater",
  "jeans", "pants", "shorts", "skirt", "suit",
  "watch", "smartwatch", "sunglasses", "glasses",
  "bag", "purse", "wallet", "belt", "hat", "cap",
  "headphones", "earphones", "speaker", "tablet", "camera",
  "ring", "necklace", "bracelet", "earring", "jewelry", "jewellery",
  "perfume", "lipstick", "foundation", "cosmetics",
  "gaming console", "monitor",
]);

function isShoppable(label: string): boolean {
  return SHOPPABLE_LABELS.has(label.toLowerCase());
}
