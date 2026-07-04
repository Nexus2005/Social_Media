/**
 * Cartly v3 — Product Knowledge Graph
 *
 * Groups marketplace results into product families and ranks within families.
 * Understands that "Nike Air Max 90", "Nike Air Max SYSTM", and "Nike Pegasus"
 * are related products in the same brand but different product lines.
 *
 * This module is lightweight — no external AI calls, just string parsing
 * and ranking logic.
 */

import { VerifiedMatch } from "../marketplace/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProductFamily {
  brand: string;
  productLine: string;        // "Air Max", "Galaxy S", "MacBook"
  members: FamilyMember[];
}

interface FamilyMember {
  match: VerifiedMatch;
  specificModel: string;      // "90", "SYSTM", "Pegasus"
  specificity: number;        // how specific this result is (0-1)
}

interface CropEvidence {
  yoloLabel: string;
  logo?: string;
  ocrText?: string;
  color?: string;
}

// ─── Brand Extraction ─────────────────────────────────────────────────────────

const KNOWN_BRANDS_MULTI_WORD = new Set([
  "new balance", "under armour", "louis vuitton", "calvin klein",
  "ralph lauren", "tommy hilfiger", "ray ban", "michael kors",
  "kate spade", "north face", "the north face",
]);

function extractBrand(title: string): string {
  const lower = title.toLowerCase().trim();

  // Check multi-word brands first
  for (const brand of KNOWN_BRANDS_MULTI_WORD) {
    if (lower.startsWith(brand)) {
      return brand;
    }
  }

  // First word is often the brand
  const words = title.split(/\s+/);
  if (words.length > 0 && words[0].length >= 2) {
    return words[0].toLowerCase();
  }

  return "unknown";
}

// ─── Product Line Extraction ──────────────────────────────────────────────────

function extractProductLine(title: string, brand: string): string {
  // Remove brand from title
  let remaining = title.toLowerCase().replace(brand, "").trim();

  // Extract the first 2-3 words after brand as the product line
  const words = remaining.split(/\s+/).filter((w) => w.length > 1);
  return words.slice(0, 3).join(" ") || "general";
}

function extractSpecificModel(title: string, brand: string, productLine: string): string {
  let remaining = title.toLowerCase()
    .replace(brand, "")
    .replace(productLine, "")
    .trim();

  // Look for model numbers (alphanumeric codes)
  const modelMatch = remaining.match(/\b([a-z]*\d+[a-z0-9]*)\b/i);
  if (modelMatch) return modelMatch[1];

  // Return first remaining word
  const words = remaining.split(/\s+/).filter((w) => w.length > 1);
  return words[0] || "";
}

// ─── Family Building ──────────────────────────────────────────────────────────

/**
 * Group verified marketplace results into product families.
 */
export function buildProductFamilies(results: VerifiedMatch[]): ProductFamily[] {
  const familyMap = new Map<string, ProductFamily>();

  for (const match of results) {
    const title = match.product.title;
    const brand = match.product.brand?.toLowerCase() || extractBrand(title);
    const productLine = extractProductLine(title, brand);
    const specificModel = extractSpecificModel(title, brand, productLine);

    const familyKey = `${brand}:${productLine}`;

    if (!familyMap.has(familyKey)) {
      familyMap.set(familyKey, {
        brand,
        productLine,
        members: [],
      });
    }

    const family = familyMap.get(familyKey)!;
    family.members.push({
      match,
      specificModel,
      specificity: calculateSpecificity(title, brand, productLine, specificModel),
    });
  }

  // Sort families by size (larger families = more relevant product line)
  return Array.from(familyMap.values()).sort(
    (a, b) => b.members.length - a.members.length,
  );
}

function calculateSpecificity(
  title: string,
  brand: string,
  productLine: string,
  model: string,
): number {
  let score = 0;
  if (brand && brand !== "unknown") score += 0.3;
  if (productLine && productLine !== "general") score += 0.3;
  if (model && model.length > 0) score += 0.2;
  if (title.split(/\s+/).length >= 4) score += 0.2; // detailed title
  return Math.min(1.0, score);
}

// ─── Ranking Within Family ────────────────────────────────────────────────────

/**
 * Rank products within a family based on how well they match the detection evidence.
 * Returns the best match from the family.
 */
export function rankWithinFamily(
  evidence: CropEvidence,
  family: ProductFamily,
): VerifiedMatch[] {
  const scored = family.members.map((member) => {
    let score = member.match.marketplaceConfidence; // base score from verification

    // Boost: OCR model code appears in title
    if (evidence.ocrText) {
      const ocrWords = evidence.ocrText.toLowerCase().split(/\s+/);
      const titleLower = member.match.product.title.toLowerCase();
      for (const word of ocrWords) {
        if (word.length >= 3 && titleLower.includes(word)) {
          score += 0.05;
        }
      }
    }

    // Boost: color match
    if (evidence.color) {
      const titleLower = member.match.product.title.toLowerCase();
      if (titleLower.includes(evidence.color.toLowerCase())) {
        score += 0.05;
      }
    }

    // Boost: specificity (more specific = better)
    score += member.specificity * 0.1;

    return { match: member.match, score };
  });

  // Sort by combined score
  return scored
    .sort((a, b) => b.score - a.score)
    .map((item) => item.match);
}

/**
 * Run the full knowledge graph pipeline:
 * 1. Group results into families
 * 2. Rank within each family
 * 3. Return the best match across all families
 */
export function selectBestMatch(
  evidence: CropEvidence,
  results: VerifiedMatch[],
): VerifiedMatch | null {
  if (results.length === 0) return null;

  const families = buildProductFamilies(results);
  const allRanked: VerifiedMatch[] = [];

  for (const family of families) {
    const ranked = rankWithinFamily(evidence, family);
    allRanked.push(...ranked);
  }

  // Return the overall best match
  return allRanked.length > 0 ? allRanked[0] : null;
}
