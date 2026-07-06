import sharp from "sharp";
import { IVisualMatcher, VisualSimilarityResult, StageMetrics } from "./interfaces";
import { MarketplaceProduct } from "../marketplace/types";

// ─── Helpers for HashVisualMatcher ──────────────────────────────────────────

async function computeGrayscaleFingerprint(imageBufferOrUrl: Buffer | string): Promise<string | null> {
  try {
    let buffer: Buffer;
    if (typeof imageBufferOrUrl === "string") {
      const res = await fetch(imageBufferOrUrl, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return null;
      buffer = Buffer.from(await res.arrayBuffer());
    } else {
      buffer = imageBufferOrUrl;
    }

    // Compute dHash (9x8 grayscale → 64-bit difference hash)
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
    return null;
  }
}

function compareDHashFingerprints(fp1: string | null, fp2: string | null): number {
  if (!fp1 || !fp2 || fp1.length !== fp2.length || fp1.length === 0) return 0.5; // neutral

  let dist = 0;
  for (let i = 0; i < fp1.length; i++) {
    const a = parseInt(fp1[i], 16);
    const b = parseInt(fp2[i], 16);
    let xor = a ^ b;
    while (xor > 0) {
      dist += xor & 1;
      xor >>= 1;
    }
  }

  const totalBits = fp1.length * 4;
  return Math.max(0, 1 - (dist / totalBits) * 2);
}

// ─── HashVisualMatcher ────────────────────────────────────────────────────────

export class HashVisualMatcher implements IVisualMatcher {
  async compare(
    cropBuffer: Buffer,
    matches: MarketplaceProduct[],
  ): Promise<{ results: VisualSimilarityResult[]; metrics: StageMetrics }> {
    const startTime = Date.now();
    try {
      const cropFingerprint = await computeGrayscaleFingerprint(cropBuffer);
      const results: VisualSimilarityResult[] = await Promise.all(
        matches.map(async (product) => {
          let similarity = 0.5;
          if (cropFingerprint && product.thumbnail) {
            const thumbFingerprint = await computeGrayscaleFingerprint(product.thumbnail);
            similarity = compareDHashFingerprints(cropFingerprint, thumbFingerprint);
          }
          return { product, visualSimilarity: similarity };
        })
      );

      return {
        results,
        metrics: {
          latencyMs: Date.now() - startTime,
          success: true,
          metadata: { matcher: "hash", count: matches.length },
        },
      };
    } catch (err: any) {
      return {
        results: matches.map(product => ({ product, visualSimilarity: 0.5 })),
        metrics: {
          latencyMs: Date.now() - startTime,
          success: false,
          metadata: { matcher: "hash", error: err.message },
        },
      };
    }
  }
}

// ─── ClipVisualMatcher ────────────────────────────────────────────────────────

export class ClipVisualMatcher implements IVisualMatcher {
  private pythonUrl = "http://localhost:5000";

  async compare(
    cropBuffer: Buffer,
    matches: MarketplaceProduct[],
  ): Promise<{ results: VisualSimilarityResult[]; metrics: StageMetrics }> {
    const startTime = Date.now();
    if (matches.length === 0) {
      return {
        results: [],
        metrics: { latencyMs: Date.now() - startTime, success: true, metadata: { matcher: "clip", count: 0 } },
      };
    }

    try {
      const cropB64 = cropBuffer.toString("base64");

      // Fetch candidates in parallel and convert to base64
      const candidatePromises = matches.map(async (product) => {
        if (!product.thumbnail) return null;
        try {
          const res = await fetch(product.thumbnail, { signal: AbortSignal.timeout(3000) });
          if (!res.ok) return null;
          const arrayBuf = await res.arrayBuffer();
          return Buffer.from(arrayBuf).toString("base64");
        } catch {
          return null;
        }
      });

      const candidatesB64 = await Promise.all(candidatePromises);

      // Keep index map to map results back to original products
      const validIndices: number[] = [];
      const validB64List: string[] = [];

      candidatesB64.forEach((b64, idx) => {
        if (b64) {
          validIndices.push(idx);
          validB64List.push(b64);
        }
      });

      const results: VisualSimilarityResult[] = matches.map((p) => ({ product: p, visualSimilarity: 0.5 }));

      if (validB64List.length > 0) {
        const response = await fetch(`${this.pythonUrl}/clip-similarity`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            crop: cropB64,
            candidates: validB64List,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const similarities: number[] = data.similarities || [];
          similarities.forEach((sim, i) => {
            const origIdx = validIndices[i];
            results[origIdx].visualSimilarity = sim;
          });
        } else {
          console.warn(`[ClipVisualMatcher] python endpoint returned status ${response.status}`);
        }
      }

      return {
        results,
        metrics: {
          latencyMs: Date.now() - startTime,
          success: true,
          metadata: { matcher: "clip", count: matches.length, validCandidates: validB64List.length },
        },
      };
    } catch (err: any) {
      console.warn(`[ClipVisualMatcher] failed: ${err.message}. Falling back to neutral similarity.`);
      return {
        results: matches.map(product => ({ product, visualSimilarity: 0.5 })),
        metrics: {
          latencyMs: Date.now() - startTime,
          success: false,
          metadata: { matcher: "clip", error: err.message },
        },
      };
    }
  }
}
