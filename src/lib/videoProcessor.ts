/**
 * Cartly v3 — Adaptive Keyframe Extractor
 *
 * Extracts keyframes from video reels using scene-change detection
 * and visual variance analysis instead of fixed frame counts.
 *
 * Design:
 *  1. Extract candidate frames at regular intervals (every 0.5s)
 *  2. Compute dHash for each candidate frame
 *  3. Compare consecutive frames — keep those with significant visual difference
 *  4. Filter out blurry frames (low variance check)
 *  5. Return 2–10 optimal, non-redundant keyframes
 *
 * Most reels (10–30s) yield 2–4 keyframes.
 * Longer or rapidly-changing reels may yield 5–10.
 * Redundant/duplicate frames are never returned.
 */

import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import sharp from "sharp";

// ─── Public Types ─────────────────────────────────────────────────────────────

export interface ExtractedFrame {
  path: string;
  timestamp: number;
}

// ─── Video Duration ───────────────────────────────────────────────────────────

export function getVideoDuration(videoPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        return reject(err);
      }
      const duration = metadata.format?.duration;
      resolve(duration || 0);
    });
  });
}

// ─── dHash (Difference Hash) ──────────────────────────────────────────────────

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
  if (h1.length !== h2.length || h1.length === 0) return 999;
  let dist = 0;
  for (let i = 0; i < h1.length; i++) {
    const a = parseInt(h1[i], 16);
    const b = parseInt(h2[i], 16);
    let xor = a ^ b;
    while (xor > 0) {
      dist += xor & 1;
      xor >>= 1;
    }
  }
  return dist;
}

// ─── Blur Detection (Laplacian Variance) ──────────────────────────────────────

async function isBlurry(buffer: Buffer): Promise<boolean> {
  try {
    // Apply a Laplacian-like edge detection and measure variance
    const edgeBuffer = await sharp(buffer)
      .resize(320, 240, { fit: "inside" })
      .grayscale()
      .convolve({
        width: 3,
        height: 3,
        kernel: [0, -1, 0, -1, 4, -1, 0, -1, 0],
      })
      .raw()
      .toBuffer();

    // Calculate variance of edge values
    const pixels = Array.from(edgeBuffer);
    const mean = pixels.reduce((sum, p) => sum + p, 0) / pixels.length;
    const variance = pixels.reduce((sum, p) => sum + (p - mean) ** 2, 0) / pixels.length;

    // Threshold: frames with very low edge variance are blurry
    return variance < 100;
  } catch {
    return false; // If analysis fails, assume not blurry
  }
}

// ─── Adaptive Keyframe Extraction ─────────────────────────────────────────────

/**
 * Extract adaptive keyframes from a video using scene-change detection.
 *
 * Instead of fixed 6 frames at preset percentages, this:
 * 1. Samples candidate frames every 0.5–1.0s
 * 2. Computes perceptual hashes (dHash) for each
 * 3. Keeps frames that differ significantly from the previous keyframe
 * 4. Filters out blurry frames
 * 5. Returns 2–10 non-redundant keyframes
 */
export async function extractFramesFromVideo(videoPath: string): Promise<ExtractedFrame[]> {
  const tmpDir = path.join(process.cwd(), "tmp");
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const duration = await getVideoDuration(videoPath);
  console.log(`[FrameExtractor] Video duration: ${duration.toFixed(1)}s`);

  // Determine sampling interval based on video length
  // Short reels (< 15s): sample every 1.0s (was 0.5s — 10+ keyframes is too many)
  // Medium (15-60s): sample every 1.5s
  // Long (> 60s): sample every 2.0s
  let samplingInterval: number;
  if (duration <= 15) {
    samplingInterval = 1.0;
  } else if (duration <= 60) {
    samplingInterval = 1.5;
  } else {
    samplingInterval = 2.0;
  }

  // Generate candidate timestamps (skip first 5% and last 5% to avoid intros/outros)
  const startOffset = Math.max(0.1, duration * 0.05);
  const endOffset = Math.max(0.1, duration * 0.95);
  const candidateTimestamps: number[] = [];

  for (let t = startOffset; t <= endOffset; t += samplingInterval) {
    candidateTimestamps.push(parseFloat(t.toFixed(2)));
  }

  // Ensure at least 3 candidates and cap at 30
  if (candidateTimestamps.length < 3 && duration >= 1) {
    // Fallback to simple percentage-based sampling
    candidateTimestamps.length = 0;
    const fallbackPercentages = [0.15, 0.35, 0.55, 0.75, 0.90];
    for (const p of fallbackPercentages) {
      candidateTimestamps.push(parseFloat((duration * p).toFixed(2)));
    }
  }
  const capped = candidateTimestamps.slice(0, 30);
  console.log(`[FrameExtractor] Sampling ${capped.length} candidate frames (interval: ${samplingInterval}s)`);

  // Extract all candidate frames via ffmpeg
  const baseName = path.basename(videoPath, path.extname(videoPath));
  const candidateFrames: ExtractedFrame[] = capped.map((timestamp) => ({
    path: path.join(tmpDir, `cand-${timestamp}-${baseName}.jpg`),
    timestamp,
  }));

  await new Promise<void>((resolve, reject) => {
    ffmpeg(videoPath)
      .on("end", () => resolve())
      .on("error", (err) => reject(err))
      .screenshots({
        timestamps: capped,
        filename: `cand-%s-${baseName}.jpg`,
        folder: tmpDir,
      });
  });

  // Phase 2: Scene-change filtering using dHash comparison
  const SCENE_CHANGE_THRESHOLD = 8; // Hamming distance threshold (raised from 5 to reduce redundant keyframes)
  const keyframes: ExtractedFrame[] = [];
  let prevHash = "";

  for (const frame of candidateFrames) {
    if (!fs.existsSync(frame.path)) continue;

    const buffer = await fs.promises.readFile(frame.path);

    // Skip blurry frames
    if (await isBlurry(buffer)) {
      console.log(`[FrameExtractor] Skipping blurry frame @${frame.timestamp}s`);
      try { fs.unlinkSync(frame.path); } catch { /* ignore */ }
      continue;
    }

    // Compute dHash
    const hash = await computeDHash(buffer);
    if (!hash) {
      try { fs.unlinkSync(frame.path); } catch { /* ignore */ }
      continue;
    }

    // Compare with previous keyframe
    if (prevHash) {
      const hammingDist = getHammingDistance(prevHash, hash);
      if (hammingDist < SCENE_CHANGE_THRESHOLD) {
        // Too similar to the previous keyframe — skip
        try { fs.unlinkSync(frame.path); } catch { /* ignore */ }
        continue;
      }
    }

    // This frame is a keyframe
    keyframes.push(frame);
    prevHash = hash;
  }

  // Ensure minimum 2 frames and maximum 6 (reduced from 10 — most reels need 3-4)
  if (keyframes.length < 2 && candidateFrames.length >= 2) {
    // Force-include first and last candidate frames
    const first = candidateFrames[0];
    const last = candidateFrames[candidateFrames.length - 1];
    if (!keyframes.some((kf) => kf.timestamp === first.timestamp) && fs.existsSync(first.path)) {
      keyframes.unshift(first);
    }
    if (!keyframes.some((kf) => kf.timestamp === last.timestamp) && fs.existsSync(last.path)) {
      keyframes.push(last);
    }
  }

  const finalFrames = keyframes.slice(0, 6);

  // Cleanup unused candidate frames
  for (const frame of candidateFrames) {
    if (!finalFrames.includes(frame) && fs.existsSync(frame.path)) {
      try { fs.unlinkSync(frame.path); } catch { /* ignore */ }
    }
  }

  console.log(`[FrameExtractor] ${candidateFrames.length} candidates → ${finalFrames.length} keyframes extracted`);
  for (const kf of finalFrames) {
    console.log(`  ├─ Keyframe @${kf.timestamp}s`);
  }

  return finalFrames;
}
