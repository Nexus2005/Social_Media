/**
 * Cartly v3 — Duplicate Product Merger
 *
 * After all frames are processed and marketplace results collected,
 * merges duplicate product detections into single products with multiple sellers.
 *
 * Problem:
 *   Frame 1 → Nike Shoe → 5 sellers
 *   Frame 3 → Nike Shoe → 5 sellers
 *   Frame 5 → Nike Shoe → 5 sellers
 *   Without merging = 15 products
 *   With merging = 1 product, up to 15 unique sellers
 *
 * Merge criteria:
 * - Same trackingId (already fused across frames by frameFusion.ts)
 * - OR: Title similarity ≥ 0.80 across marketplace results
 * - OR: Same detected brand + same YOLO category
 */

import { VerifiedMatch } from "../marketplace/types";
import { TrackedObject } from "./frameFusion";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MergedProduct {
  trackingId: string;
  detection: TrackedObject;
  bestMatch: VerifiedMatch | null;
  allMatches: VerifiedMatch[];         // all unique sellers/listings
  timeline: number[];                   // all frame timestamps
  detectionConfidence: number;          // "this IS a shoe"
  marketplaceConfidence: number;        // "this LISTING matches"
  resolvedQueries: string[];            // queries used to find this product
}

// ─── String Similarity (Jaccard on tokens) ───────────────────────────────────

function tokenJaccard(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  if (s1 === s2) return 1.0;

  const words1 = new Set(s1.split(/\s+/));
  const words2 = new Set(s2.split(/\s+/));

  let intersection = 0;
  words1.forEach((w) => {
    if (words2.has(w)) intersection++;
  });

  const union = new Set([...words1, ...words2]).size;
  return union > 0 ? intersection / union : 0;
}

// ─── Deduplication of Sellers ─────────────────────────────────────────────────

function deduplicateSellers(matches: VerifiedMatch[]): VerifiedMatch[] {
  const seen = new Map<string, VerifiedMatch>(); // key = merchant+title hash

  for (const match of matches) {
    const key = `${match.product.merchant}:${match.product.title.toLowerCase().slice(0, 50)}`;

    const existing = seen.get(key);
    if (!existing || match.marketplaceConfidence > existing.marketplaceConfidence) {
      seen.set(key, match);
    }
  }

  // Sort by verification score → price → rating
  return Array.from(seen.values()).sort((a, b) => {
    // Primary: verification score
    const scoreDiff = b.marketplaceConfidence - a.marketplaceConfidence;
    if (Math.abs(scoreDiff) > 0.05) return scoreDiff;

    // Secondary: price (lower is better)
    const priceDiff = a.product.numericPrice - b.product.numericPrice;
    if (Math.abs(priceDiff) > 1) return priceDiff;

    // Tertiary: rating (higher is better)
    return (b.product.rating || 0) - (a.product.rating || 0);
  });
}

// ─── Merge Products ──────────────────────────────────────────────────────────

/**
 * Merge tracked objects with their marketplace results into deduplicated products.
 *
 * @param trackedObjects Objects tracked across frames (from frameFusion)
 * @param matchesByTrackingId Map of trackingId → verified marketplace matches
 * @param queriesByTrackingId Map of trackingId → resolver queries used
 * @param detectionConfidences Map of trackingId → detection confidence
 */
export function mergeProducts(
  trackedObjects: TrackedObject[],
  matchesByTrackingId: Map<string, VerifiedMatch[]>,
  queriesByTrackingId: Map<string, string[]>,
  detectionConfidences: Map<string, number>,
): MergedProduct[] {
  const merged: MergedProduct[] = [];

  for (const tracked of trackedObjects) {
    const matches = matchesByTrackingId.get(tracked.trackingId) || [];
    const queries = queriesByTrackingId.get(tracked.trackingId) || [];
    const detConf = detectionConfidences.get(tracked.trackingId) || tracked.bestConfidence;

    // Deduplicate sellers across all matches for this tracked object
    const uniqueMatches = deduplicateSellers(matches);

    // Best match = highest verification score
    const bestMatch = uniqueMatches.length > 0 ? uniqueMatches[0] : null;
    const mktConf = bestMatch?.marketplaceConfidence || 0;

    merged.push({
      trackingId: tracked.trackingId,
      detection: tracked,
      bestMatch,
      allMatches: uniqueMatches,
      timeline: [...tracked.frameTimestamps].sort((a, b) => a - b),
      detectionConfidence: detConf,
      marketplaceConfidence: mktConf,
      resolvedQueries: queries,
    });
  }

  // Now merge products that are the same but have different trackingIds
  // (can happen if frame fusion failed to track across distant frames)
  const finalMerged = mergeByMarketplaceSimilarity(merged);

  console.log(`[DuplicateMerger] ${trackedObjects.length} tracked objects → ${finalMerged.length} unique products`);

  return finalMerged;
}

/**
 * Secondary merge pass: merge products whose best marketplace matches
 * are very similar (same product from different detection tracks).
 */
function mergeByMarketplaceSimilarity(products: MergedProduct[]): MergedProduct[] {
  const result: MergedProduct[] = [];

  for (const product of products) {
    let mergedInto = false;

    for (const existing of result) {
      if (shouldMerge(existing, product)) {
        // Merge product into existing
        existing.allMatches.push(...product.allMatches);
        existing.timeline.push(...product.timeline);
        existing.timeline.sort((a, b) => a - b);
        existing.resolvedQueries.push(...product.resolvedQueries);

        // Keep best detection confidence
        if (product.detectionConfidence > existing.detectionConfidence) {
          existing.detectionConfidence = product.detectionConfidence;
        }

        // Keep best marketplace match
        if (product.bestMatch && (!existing.bestMatch ||
          product.marketplaceConfidence > existing.marketplaceConfidence)) {
          existing.bestMatch = product.bestMatch;
          existing.marketplaceConfidence = product.marketplaceConfidence;
        }

        // Deduplicate sellers after merge
        existing.allMatches = deduplicateSellers(existing.allMatches);

        mergedInto = true;
        break;
      }
    }

    if (!mergedInto) {
      result.push(product);
    }
  }

  return result;
}

function shouldMerge(a: MergedProduct, b: MergedProduct): boolean {
  // Same YOLO category is required
  if (a.detection.yoloLabel !== b.detection.yoloLabel) return false;

  // Check brand similarity from best matches
  const aBrand = a.bestMatch?.product.brand?.toLowerCase();
  const bBrand = b.bestMatch?.product.brand?.toLowerCase();
  if (aBrand && bBrand && aBrand === bBrand) {
    // Same brand + same category — likely same product
    return true;
  }

  // Check title similarity of best matches
  if (a.bestMatch && b.bestMatch) {
    const titleSim = tokenJaccard(a.bestMatch.product.title, b.bestMatch.product.title);
    if (titleSim >= 0.80) return true;
  }

  return false;
}
