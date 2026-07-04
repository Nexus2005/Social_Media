/**
 * Cartly v3 — Crop Quality Filter
 *
 * Assesses the quality of a cropped object image before processing.
 * Skips blurry, tiny, too dark, or content-less crops to avoid wasting
 * marketplace API calls on unusable detections.
 *
 * Calls the Python CV service /crop-quality endpoint for image analysis.
 * Falls back to a size-only check if the Python service is unavailable.
 */

export interface CropQualityBreakdown {
  size: number;       // 0-1: pixel area relative to minimum
  blur: number;       // 0-1: Laplacian variance (higher = sharper)
  brightness: number; // 0-1: mean brightness quality (0.5 = ideal)
  edges: number;      // 0-1: edge density (objects have edges)
}

export interface CropQualityResult {
  score: number;           // 0.0 - 1.0 weighted quality score
  pass: boolean;           // score >= threshold
  breakdown: CropQualityBreakdown;
  skipReason?: string;     // "too_small" | "too_blurry" | "too_dark" | "no_content"
}

const CV_SERVICE_URL = "http://localhost:5000";
const QUALITY_THRESHOLD = 0.35;

/**
 * Assess the quality of a cropped object image.
 * Returns a quality score and pass/fail decision.
 */
export async function assessCropQuality(cropBuffer: Buffer): Promise<CropQualityResult> {
  try {
    const response = await fetch(`${CV_SERVICE_URL}/crop-quality`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: cropBuffer.toString("base64") }),
    });

    if (response.ok) {
      const result = await response.json();
      return {
        score: result.quality || 0,
        pass: result.pass ?? (result.quality >= QUALITY_THRESHOLD),
        breakdown: result.breakdown || { size: 0, blur: 0, brightness: 0, edges: 0 },
        skipReason: result.pass ? undefined : determineSkipReason(result.breakdown),
      };
    }
  } catch {
    // Python service unavailable — fallback to basic size check
  }

  // Fallback: basic size check using buffer length as proxy
  return fallbackQualityCheck(cropBuffer);
}

function determineSkipReason(breakdown: CropQualityBreakdown): string {
  if (breakdown.size < 0.2) return "too_small";
  if (breakdown.blur < 0.2) return "too_blurry";
  if (breakdown.brightness < 0.15) return "too_dark";
  if (breakdown.edges < 0.1) return "no_content";
  return "low_quality";
}

function fallbackQualityCheck(cropBuffer: Buffer): CropQualityResult {
  // Rough heuristic: JPEG buffers < 2KB are likely tiny/useless crops
  const sizeScore = Math.min(1.0, cropBuffer.length / 10000);
  const pass = sizeScore >= 0.2;
  return {
    score: sizeScore,
    pass,
    breakdown: { size: sizeScore, blur: 0.5, brightness: 0.5, edges: 0.5 },
    skipReason: pass ? undefined : "too_small",
  };
}
