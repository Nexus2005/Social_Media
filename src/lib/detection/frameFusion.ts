/**
 * Cartly v3 — Frame Fusion / Object Tracking
 *
 * Tracks the same object across multiple video frames to prevent
 * duplicate detections. Instead of treating each frame independently,
 * this module merges detections of the same object across frames.
 */

import crypto from "crypto";
import { IObjectTracker, StageMetrics } from "./interfaces";

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
  avg_hsv?: number[];
}

export interface TrackedCrop {
  buffer: Buffer;
  quality: number;
  timestamp: number;
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

  // Multi-frame crops and visual color descriptor
  crops?: TrackedCrop[];
  avg_hsv?: number[];
}

// ─── Classical IoU / Proximity Helpers ────────────────────────────────────────

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

function relativePositionSimilarity(boxA: number[], boxB: number[]): number {
  const centerAx = (boxA[0] + boxA[2]) / 2;
  const centerAy = (boxA[1] + boxA[3]) / 2;
  const centerBx = (boxB[0] + boxB[2]) / 2;
  const centerBy = (boxB[1] + boxB[3]) / 2;

  const avgWidth = ((boxA[2] - boxA[0]) + (boxB[2] - boxB[0])) / 2;
  const avgHeight = ((boxA[3] - boxA[1]) + (boxB[3] - boxB[1])) / 2;

  if (avgWidth <= 0 || avgHeight <= 0) return 0;

  const dx = Math.abs(centerAx - centerBx) / avgWidth;
  const dy = Math.abs(centerAy - centerBy) / avgHeight;

  const distance = Math.sqrt(dx * dx + dy * dy);
  return Math.max(0, 1 - distance / 2);
}

function sizeSimilarity(boxA: number[], boxB: number[]): number {
  const areaA = (boxA[2] - boxA[0]) * (boxA[3] - boxA[1]);
  const areaB = (boxB[2] - boxB[0]) * (boxB[3] - boxB[1]);

  if (areaA <= 0 || areaB <= 0) return 0;
  return Math.min(areaA, areaB) / Math.max(areaA, areaB);
}

// ─── Color Similarity ────────────────────────────────────────────────────────

function colorSimilarity(hsvA: number[], hsvB: number[]): number {
  const [h1, s1, v1] = hsvA;
  const [h2, s2, v2] = hsvB;

  // Hue distance in circular 180-degree space
  let dh = Math.abs(h1 - h2);
  if (dh > 90) dh = 180 - dh;
  const nh = dh / 90;

  const ds = Math.abs(s1 - s2) / 255;
  const dv = Math.abs(v1 - v2) / 255;

  const distance = Math.sqrt(nh * nh + ds * ds + dv * dv);
  return Math.max(0, 1 - distance / Math.sqrt(3));
}

// ─── Match Decision Functions ───────────────────────────────────────────────

function isLikelyClassicalMatch(
  tracked: TrackedObject,
  detection: DetectedObject,
): boolean {
  let matchSignals = 0;

  if (tracked.yoloLabel === detection.label) {
    matchSignals++;
  }

  const iou = calculateIoU(tracked.bestBox, detection.box);
  const positionSim = relativePositionSimilarity(tracked.bestBox, detection.box);
  if (iou >= 0.3 || positionSim >= 0.6) {
    matchSignals++;
  }

  const sizeSim = sizeSimilarity(tracked.bestBox, detection.box);
  if (sizeSim >= 0.5) {
    matchSignals++;
  }

  return matchSignals >= 2;
}

function isLikelyEnhancedMatch(
  tracked: TrackedObject,
  detection: DetectedObject,
): boolean {
  const iou = calculateIoU(tracked.bestBox, detection.box);
  const positionSim = relativePositionSimilarity(tracked.bestBox, detection.box);

  // GATING 1: Spatial consistency check is mandatory
  const hasSpatialConsistency = iou >= 0.15 || positionSim >= 0.5;
  if (!hasSpatialConsistency) {
    return false;
  }

  // GATING 2: Circular HSV color visual similarity check
  if (
    tracked.avg_hsv && detection.avg_hsv &&
    tracked.avg_hsv.some(v => v > 0) && detection.avg_hsv.some(v => v > 0)
  ) {
    const colorSim = colorSimilarity(tracked.avg_hsv, detection.avg_hsv);
    if (colorSim < 0.70) {
      return false; // Reject match between different colored objects
    }
  }

  let matchSignals = 0;

  if (tracked.yoloLabel === detection.label) {
    matchSignals++;
  }

  if (iou >= 0.3 || positionSim >= 0.65) {
    matchSignals++;
  }

  const sizeSim = sizeSimilarity(tracked.bestBox, detection.box);
  if (sizeSim >= 0.5) {
    matchSignals++;
  }

  return matchSignals >= 2;
}

// ─── Classical Tracker implementation ────────────────────────────────────────

export class ClassicalTracker implements IObjectTracker {
  fuse(frames: FrameDetection[]): { tracked: TrackedObject[]; metrics: StageMetrics } {
    const startTime = Date.now();
    const tracked: TrackedObject[] = [];

    for (const frame of frames) {
      for (const detection of frame.objects) {
        let matched = false;
        for (const existing of tracked) {
          if (isLikelyClassicalMatch(existing, detection)) {
            existing.frameTimestamps.push(frame.frameTimestamp);
            existing.frameAppearances++;

            if (detection.confidence > existing.bestConfidence) {
              existing.bestConfidence = detection.confidence;
              existing.bestBox = detection.box;
            }

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

    return {
      tracked,
      metrics: {
        latencyMs: Date.now() - startTime,
        success: true,
        metadata: { tracker: "classical", trackedCount: tracked.length },
      },
    };
  }

  filter(tracked: TrackedObject[]): { filtered: TrackedObject[]; metrics: StageMetrics } {
    const startTime = Date.now();
    const filtered = tracked.filter((obj) => {
      if (obj.frameAppearances >= 2) return true;
      if (obj.bestConfidence >= 0.7) return true;
      return false;
    });

    return {
      filtered,
      metrics: {
        latencyMs: Date.now() - startTime,
        success: true,
        metadata: { filteredCount: filtered.length },
      },
    };
  }
}

// ─── Enhanced Tracker implementation ─────────────────────────────────────────

export class EnhancedTracker implements IObjectTracker {
  fuse(frames: FrameDetection[]): { tracked: TrackedObject[]; metrics: StageMetrics } {
    const startTime = Date.now();
    const tracked: TrackedObject[] = [];

    for (const frame of frames) {
      for (const detection of frame.objects) {
        let matched = false;
        for (const existing of tracked) {
          if (isLikelyEnhancedMatch(existing, detection)) {
            existing.frameTimestamps.push(frame.frameTimestamp);
            existing.frameAppearances++;

            if (detection.confidence > existing.bestConfidence) {
              existing.bestConfidence = detection.confidence;
              existing.bestBox = detection.box;
            }

            // Save crop to multi-crop collection (limit to top 3 by quality score)
            if (detection.cropBuffer) {
              const quality = detection.cropQuality ?? 0;
              if (!existing.crops) {
                existing.crops = [];
              }
              existing.crops.push({
                buffer: detection.cropBuffer,
                quality,
                timestamp: frame.frameTimestamp,
              });
              existing.crops.sort((a, b) => b.quality - a.quality);
              existing.crops = existing.crops.slice(0, 3);

              // Update best crop
              if (quality > existing.bestCropQuality) {
                existing.bestCrop = detection.cropBuffer;
                existing.bestCropQuality = quality;
              }
            }

            // Update average HSV representation
            if (detection.avg_hsv && detection.avg_hsv.some(v => v > 0)) {
              existing.avg_hsv = detection.avg_hsv;
            }

            matched = true;
            break;
          }
        }

        if (!matched) {
          const initialCrops: TrackedCrop[] = [];
          if (detection.cropBuffer) {
            initialCrops.push({
              buffer: detection.cropBuffer,
              quality: detection.cropQuality ?? 0,
              timestamp: frame.frameTimestamp,
            });
          }

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
            crops: initialCrops,
            avg_hsv: detection.avg_hsv || [0, 0, 0],
          });
        }
      }
    }

    return {
      tracked,
      metrics: {
        latencyMs: Date.now() - startTime,
        success: true,
        metadata: { tracker: "enhanced", trackedCount: tracked.length },
      },
    };
  }

  filter(tracked: TrackedObject[]): { filtered: TrackedObject[]; metrics: StageMetrics } {
    const startTime = Date.now();
    const filtered = tracked.filter((obj) => {
      // Keep if appears in >=2 frames OR has high single-frame confidence
      if (obj.frameAppearances >= 2) return true;
      if (obj.bestConfidence >= 0.7) return true;
      return false;
    });

    return {
      filtered,
      metrics: {
        latencyMs: Date.now() - startTime,
        success: true,
        metadata: { filteredCount: filtered.length },
      },
    };
  }
}

// ─── Backward Compatibility Exports ──────────────────────────────────────────

export function fuseFrameDetections(frames: FrameDetection[]): TrackedObject[] {
  const tracker = new ClassicalTracker();
  const { tracked } = tracker.fuse(frames);
  return tracked;
}

export function filterTrackedObjects(tracked: TrackedObject[]): TrackedObject[] {
  const tracker = new ClassicalTracker();
  const { filtered } = tracker.filter(tracked);
  return filtered;
}
