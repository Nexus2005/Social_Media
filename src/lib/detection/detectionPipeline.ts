/**
 * Cartly v3 — Detection Pipeline
 *
 * Per-crop processing pipeline with reordered stages:
 *   1. Crop Quality Filter → skip bad crops
 *   2. Brand/Logo Detection → identify brand FIRST
 *   3. OCR (informed by known brand) → find model numbers
 *   4. Barcode (bonus only) → near-certain if found
 *   5. Visual Attributes (color, shape)
 *   6. Confidence Scoring (visual-first, barcode bonus)
 *
 * Key design decisions:
 * - Logo detection runs BEFORE OCR so OCR is brand-informed
 * - Barcode is a bonus signal — no penalty when absent
 * - Confidence weighting: 35% visual, 20% logo, 20% OCR, 15% category, 10% color
 * - Returns detection confidence separate from marketplace confidence
 */

import sharp from "sharp";
import { assessCropQuality, CropQualityResult } from "./cropQualityFilter";

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

interface YoloDetection {
  box: number[];
  label: string;
  confidence: number;
}

/**
 * Run YOLO detection on a full frame. Returns all shoppable objects detected.
 */
export async function detectObjectsInFrame(frameBuffer: Buffer): Promise<YoloDetection[]> {
  try {
    const response = await fetch(`${CV_SERVICE_URL}/detect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: frameBuffer.toString("base64") }),
    });

    if (!response.ok) {
      console.warn(`[DetectionPipeline] YOLO detection failed: ${response.status}`);
      return [];
    }

    const body = await response.json();
    return (body.objects || []) as YoloDetection[];
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

    const left = Math.max(0, Math.round(x1));
    const top = Math.max(0, Math.round(y1));
    const cropWidth = Math.max(1, Math.min(Math.round(x2 - x1), width - left));
    const cropHeight = Math.max(1, Math.min(Math.round(y2 - y1), height - top));

    return await image
      .extract({ left, top, width: cropWidth, height: cropHeight })
      .jpeg({ quality: 85 })
      .toBuffer();
  } catch (err) {
    console.error("[DetectionPipeline] Failed to crop object:", err);
    return null;
  }
}

// ─── Per-Crop Evidence Collection ─────────────────────────────────────────────

/**
 * Run the complete evidence collection pipeline on a single crop.
 * Order: Quality → Logo → OCR → Barcode → Attributes
 */
export async function collectCropEvidence(
  cropBuffer: Buffer,
  yoloLabel: string,
  yoloConfidence: number,
  frameAppearances: number,
): Promise<PipelineResult | null> {
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

  // ── Step 3: OCR (informed by known brand) ─────────────────────────────────
  let ocrText = "";
  let meaningfulOcrWords = 0;
  let ocrPreview = "";
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
  console.log(`  ├─ Evidence: logo="${logo || "(none)"}" ocr="${ocrPreview || "(none)"}" barcode="${barcode || "(none)"}" color="${colorDetected || "(none)"}" quality=${cropQuality.score.toFixed(2)}`);
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
  if (evidence.yoloConfidence > 0.5) {
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
  "shoe", "shoes", "sneaker", "sneakers", "boot", "boots", "sandal", "sandals",
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
