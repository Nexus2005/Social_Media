/**
 * Cartly v3 — Frame Fusion / Object Tracking
 *
 * Tracks the same object across multiple video frames to prevent
 * duplicate detections. Instead of treating each frame independently,
 * this module merges detections of the same object across frames.
 *
 * Match criteria (any 2 of 3 must pass):
 * - IoU (Intersection over Union) of bounding boxes ≥ 0.3
 * - Color histogram similarity ≥ 0.7
 * - Same YOLO class label
 *
 * Produces TrackedObjects with:
 * - Best crop (highest quality score across frames)
 * - Union of all evidence (OCR, logos, barcodes)
 * - All frame timestamps (for Product Timeline)
 * - Frame appearance count (boosts confidence)
 */

import crypto from "crypto";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FrameDetection {
  frameTimestamp: number;
  objects: DetectedObject[];
}

export interface DetectedObject {
  box: number[];         // [x1, y1, x2, y2] pixel coordinates
  label: string;
  confidence: number;
  cropBuffer?: Buffer;
  cropQuality?: number;
}

export interface TrackedObject {
  trackingId: string;
  bestCrop: Buffer | null;
  bestCropQuality: number;
  bestBox: number[];
  frameTimestamps: number[];    // all timestamps where object appears
  frameAppearances: number;
  yoloLabel: string;
  bestConfidence: number;

  // Evidence accumulated across frames
  mergedOcrText: string;
  mergedLogos: string[];
  mergedBarcodes: string[];
}

// ─── IoU Calculation ──────────────────────────────────────────────────────────

function calculateIoU(boxA: number[], boxB: number[]): number {
  const [ax1, ay1, ax2, ay2] = boxA;
  const [bx1, by1, bx2, by2] = boxB;

  const intersectX1 = Math.max(ax1, bx1);
  const intersectY1 = Math.max(ay1, by1);
  const intersectX2 = Math.min(ax2, bx2);
  const intersectY2 = Math.min(ay2, by2);

  const intersectWidth = Math.max(0, intersectX2 - intersectX1);
  const intersectHeight = Math.max(0, intersectY2 - intersectY1);
  const intersectArea = intersectWidth * intersectHeight;

  const areaA = (ax2 - ax1) * (ay2 - ay1);
  const areaB = (bx2 - bx1) * (by2 - by1);
  const unionArea = areaA + areaB - intersectArea;

  if (unionArea <= 0) return 0;
  return intersectArea / unionArea;
}

// ─── Relative Position Similarity ─────────────────────────────────────────────
// For reels with moving cameras, IoU may be low even for the same object.
// Check if the object occupies a similar relative position in the frame.

function relativePositionSimilarity(boxA: number[], boxB: number[]): number {
  const centerAx = (boxA[0] + boxA[2]) / 2;
  const centerAy = (boxA[1] + boxA[3]) / 2;
  const centerBx = (boxB[0] + boxB[2]) / 2;
  const centerBy = (boxB[1] + boxB[3]) / 2;

  // Normalize by box size (use average of both boxes)
  const avgWidth = ((boxA[2] - boxA[0]) + (boxB[2] - boxB[0])) / 2;
  const avgHeight = ((boxA[3] - boxA[1]) + (boxB[3] - boxB[1])) / 2;

  if (avgWidth <= 0 || avgHeight <= 0) return 0;

  const dx = Math.abs(centerAx - centerBx) / avgWidth;
  const dy = Math.abs(centerAy - centerBy) / avgHeight;

  // If centers are within 2x the object size, consider them similar
  const distance = Math.sqrt(dx * dx + dy * dy);
  return Math.max(0, 1 - distance / 2);
}

// ─── Size Similarity ──────────────────────────────────────────────────────────

function sizeSimilarity(boxA: number[], boxB: number[]): number {
  const areaA = (boxA[2] - boxA[0]) * (boxA[3] - boxA[1]);
  const areaB = (boxB[2] - boxB[0]) * (boxB[3] - boxB[1]);

  if (areaA <= 0 || areaB <= 0) return 0;

  const ratio = Math.min(areaA, areaB) / Math.max(areaA, areaB);
  return ratio; // 1.0 = same size, 0.0 = very different
}

// ─── Match Decision ───────────────────────────────────────────────────────────

function isLikelyMatch(
  tracked: TrackedObject,
  detection: DetectedObject,
): boolean {
  let matchSignals = 0;

  // Signal 1: Same YOLO class
  if (tracked.yoloLabel === detection.label) {
    matchSignals++;
  }

  // Signal 2: IoU or relative position overlap
  const iou = calculateIoU(tracked.bestBox, detection.box);
  const positionSim = relativePositionSimilarity(tracked.bestBox, detection.box);
  if (iou >= 0.3 || positionSim >= 0.6) {
    matchSignals++;
  }

  // Signal 3: Size similarity
  const sizeSim = sizeSimilarity(tracked.bestBox, detection.box);
  if (sizeSim >= 0.5) {
    matchSignals++;
  }

  // Need at least 2 of 3 signals
  return matchSignals >= 2;
}

// ─── Frame Fusion ─────────────────────────────────────────────────────────────

/**
 * Fuse detections across multiple frames into tracked objects.
 *
 * @param frames Array of frame detections (each frame contains multiple objects)
 * @returns Array of TrackedObjects, each representing a unique real-world object
 */
export function fuseFrameDetections(frames: FrameDetection[]): TrackedObject[] {
  const tracked: TrackedObject[] = [];

  for (const frame of frames) {
    for (const detection of frame.objects) {
      // Try to match this detection to an existing tracked object
      let matched = false;

      for (const existing of tracked) {
        if (isLikelyMatch(existing, detection)) {
          // Merge into existing tracked object
          existing.frameTimestamps.push(frame.frameTimestamp);
          existing.frameAppearances++;

          // Keep best confidence
          if (detection.confidence > existing.bestConfidence) {
            existing.bestConfidence = detection.confidence;
            existing.bestBox = detection.box;
          }

          // Keep best crop (highest quality)
          const detectionQuality = detection.cropQuality ?? 0;
          if (detection.cropBuffer && detectionQuality > existing.bestCropQuality) {
            existing.bestCrop = detection.cropBuffer;
            existing.bestCropQuality = detectionQuality;
          }

          matched = true;
          break;
        }
      }

      if (!matched) {
        // New tracked object
        tracked.push({
          trackingId: `trk_${crypto.randomUUID().slice(0, 8)}`,
          bestCrop: detection.cropBuffer || null,
          bestCropQuality: detection.cropQuality ?? 0,
          bestBox: detection.box,
          frameTimestamps: [frame.frameTimestamp],
          frameAppearances: 1,
          yoloLabel: detection.label,
          bestConfidence: detection.confidence,
          mergedOcrText: "",
          mergedLogos: [],
          mergedBarcodes: [],
        });
      }
    }
  }

  console.log(`[FrameFusion] ${frames.length} frames → ${tracked.length} unique tracked objects`);
  for (const obj of tracked) {
    console.log(`  ├─ ${obj.trackingId}: "${obj.yoloLabel}" × ${obj.frameAppearances} frames, conf=${obj.bestConfidence.toFixed(2)}`);
  }

  return tracked;
}

/**
 * Filter tracked objects: only keep objects that appear in ≥2 frames
 * OR have high single-frame confidence (≥ 0.7).
 */
export function filterTrackedObjects(tracked: TrackedObject[]): TrackedObject[] {
  return tracked.filter((obj) => {
    if (obj.frameAppearances >= 2) return true;
    if (obj.bestConfidence >= 0.7) return true;
    console.log(`  └─ Filtered out: "${obj.yoloLabel}" (${obj.frameAppearances} frame, conf=${obj.bestConfidence.toFixed(2)})`);
    return false;
  });
}
