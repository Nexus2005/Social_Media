import sharp from "sharp";
import { CropEvidence } from "../detection/detectionPipeline";
import { cleanMarketplaceTitle } from "./titleCleaner";
import { MarketplaceProduct, VerifiedMatch, VerificationBreakdown, VerificationTier } from "./types";

// ─── String Similarity (Jaccard on tokens) ───────────────────────────────────

function tokenJaccard(str1: string, str2: string): number {
  const words1 = new Set(str1.toLowerCase().split(/\s+/).filter((w) => w.length > 1));
  const words2 = new Set(str2.toLowerCase().split(/\s+/).filter((w) => w.length > 1));

  if (words1.size === 0 && words2.size === 0) return 0;

  let intersection = 0;
  words1.forEach((w) => {
    if (words2.has(w)) intersection++;
  });

  const union = new Set([...words1, ...words2]).size;
  return union > 0 ? intersection / union : 0;
}

// ─── Color Matching ──────────────────────────────────────────────────────────

const COLOR_SYNONYMS: Record<string, string[]> = {
  red: ["red", "scarlet", "crimson", "burgundy", "maroon", "cherry", "ruby"],
  blue: ["blue", "navy", "cobalt", "royal", "sky", "azure", "indigo", "sapphire"],
  green: ["green", "olive", "emerald", "sage", "forest", "lime", "jade", "mint"],
  black: ["black", "onyx", "jet", "ebony", "charcoal", "dark"],
  white: ["white", "ivory", "cream", "snow", "pearl", "off-white", "chalk"],
  pink: ["pink", "rose", "blush", "fuchsia", "magenta", "coral"],
  purple: ["purple", "violet", "lavender", "plum", "mauve", "lilac"],
  orange: ["orange", "tangerine", "peach", "amber", "copper"],
  yellow: ["yellow", "gold", "golden", "mustard", "lemon"],
  brown: ["brown", "tan", "beige", "khaki", "camel", "mocha", "chocolate", "cognac"],
  gray: ["gray", "grey", "silver", "slate", "graphite", "ash", "pewter"],
};

function colorMatch(detectedColor: string | null, title: string): number {
  if (!detectedColor) return 1.0; // neutral (no penalty)
  const lower = detectedColor.toLowerCase();
  const titleLower = title.toLowerCase();

  if (lower === "unknown" || lower === "none") return 1.0;

  // Direct match
  if (titleLower.includes(lower)) return 1.0;

  // Synonym match
  for (const [, synonyms] of Object.entries(COLOR_SYNONYMS)) {
    if (synonyms.includes(lower)) {
      for (const syn of synonyms) {
        if (titleLower.includes(syn)) return 0.8;
      }
    }
  }

  return 0.1; // mismatches have penalty
}

// ─── Category Matching ───────────────────────────────────────────────────────

const CATEGORY_SYNONYMS: Record<string, string[]> = {
  shoe: ["shoe", "shoes", "sneaker", "sneakers", "footwear", "boot", "boots", "trainer", "trainers"],
  shirt: ["shirt", "t-shirt", "tee", "top", "blouse", "polo"],
  pants: ["pants", "jeans", "trousers", "leggings", "chinos"],
  bag: ["bag", "handbag", "purse", "tote", "backpack", "clutch", "satchel"],
  watch: ["watch", "smartwatch", "timepiece", "wristwatch"],
  phone: ["phone", "smartphone", "cellphone", "mobile", "iphone", "galaxy"],
  laptop: ["laptop", "notebook", "chromebook", "macbook"],
  headphones: ["headphones", "earbuds", "earphones", "airpods", "headset"],
  sunglasses: ["sunglasses", "shades", "eyewear", "glasses"],
  dress: ["dress", "gown", "frock"],
  jacket: ["jacket", "coat", "blazer", "windbreaker", "parka"],
};

function categoryMatch(yoloLabel: string, title: string): number {
  const labelLower = yoloLabel.toLowerCase();
  const titleLower = title.toLowerCase();

  // Direct match
  if (titleLower.includes(labelLower)) return 1.0;

  // Synonym match
  for (const [, synonyms] of Object.entries(CATEGORY_SYNONYMS)) {
    if (synonyms.includes(labelLower)) {
      for (const syn of synonyms) {
        if (titleLower.includes(syn)) return 0.8;
      }
    }
  }

  return 0.1;
}

// ─── Price Sanity ────────────────────────────────────────────────────────────

const PRICE_RANGES: Record<string, [number, number]> = {
  shoe: [10, 500], shoes: [10, 500], sneaker: [20, 400], sneakers: [20, 400],
  shirt: [5, 200], "t-shirt": [5, 100], dress: [10, 500],
  bag: [10, 2000], handbag: [15, 5000], backpack: [10, 300],
  watch: [10, 10000], smartwatch: [50, 1000],
  phone: [50, 2000], "cell phone": [50, 2000],
  laptop: [200, 5000], tablet: [100, 2000],
  headphones: [10, 500], sunglasses: [5, 500],
  chair: [20, 2000], couch: [100, 5000],
  perfume: [10, 500], book: [3, 100],
};

function priceSanity(price: number, category: string): number {
  if (price <= 0) return 0;

  const range = PRICE_RANGES[category.toLowerCase()];
  if (!range) {
    return price >= 1 && price <= 5000 ? 0.7 : 0.2;
  }

  const [min, max] = range;
  if (price >= min && price <= max) return 1.0;
  if (price < min * 0.5 || price > max * 2) return 0.2;
  return 0.5;
}

// ─── Text / OCR / Attribute Checking Helpers ─────────────────────────────────

function wordIncludesMatch(text: string | null, target: string | null): number {
  if (!target || target === "none" || target === "unknown") return 1.0;
  if (!text) return 0.1;
  const textLower = text.toLowerCase();
  const targetLower = target.toLowerCase();
  return textLower.includes(targetLower) ? 1.0 : 0.1;
}

function ocrModelMatch(ocrText: string, title: string): number {
  if (!ocrText || ocrText.trim().length === 0) return 0;

  const ocrWords = ocrText.split(/\s+/).filter((w) => w.length >= 3);
  const titleLower = title.toLowerCase();

  let matches = 0;
  for (const word of ocrWords) {
    if (titleLower.includes(word.toLowerCase())) {
      matches++;
    }
  }

  return ocrWords.length > 0 ? Math.min(1.0, matches / ocrWords.length) : 0;
}

// ─── Image Visual Similarity (dHash Fingerprint) ─────────────────────────────

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

  // Compute bit-level Hamming distance between hex hashes
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

  // Total bits = fp1.length * 4 (each hex char = 4 bits)
  const totalBits = fp1.length * 4;
  // Similarity: 0 distance = 1.0, max distance = 0.0
  return Math.max(0, 1 - (dist / totalBits) * 2); // scale so 50% bit diff = 0 similarity
}

function materialMatch(detectedMaterial: string | null, title: string): number {
  if (!detectedMaterial || detectedMaterial === "none" || detectedMaterial === "unknown") return 1.0;
  const lower = detectedMaterial.toLowerCase();
  const titleLower = title.toLowerCase();
  if (titleLower.includes(lower)) return 1.0;
  return 0.2;
}

// ─── Verification Engine ─────────────────────────────────────────────────────

export async function verifyMarketplaceResults(
  evidence: CropEvidence,
  results: MarketplaceProduct[],
  cropBuffer: Buffer | null = null,
  limit = 10,
  precomputedVisualSimilarities?: Map<string, number>,
): Promise<VerifiedMatch[]> {
  if (results.length === 0) return [];

  // Build target query string from evidence for title comparison
  const queryTerms: string[] = [];
  const brand = evidence.brand || evidence.logo;
  if (brand) queryTerms.push(brand);
  if (evidence.ocrPreview) queryTerms.push(evidence.ocrPreview);
  if (evidence.colorDetected) queryTerms.push(evidence.colorDetected);
  queryTerms.push(evidence.yoloLabel);
  const queryString = queryTerms.join(" ");

  // Compute fingerprint for crop once
  const cropFingerprint = cropBuffer ? await computeGrayscaleFingerprint(cropBuffer) : null;

  // Process all results in parallel
  const verifiedPromises = results.map(async (product) => {
    const cleanedTitle = cleanMarketplaceTitle(product.title);

    // 1. Title Similarity (Jaccard) — 20%
    const titleSimilarity = tokenJaccard(queryString, cleanedTitle);

    // 2. Brand Match — 15%
    const brandMatch = brand && product.title.toLowerCase().includes(brand.toLowerCase())
      ? 1.0
      : brand && product.brand?.toLowerCase() === brand.toLowerCase()
        ? 1.0
        : 0;

    // 3. Image Similarity (dHash/CLIP comparison) — 30%
    let visualSimilarity = 0.5; // neutral fallback
    const key = product.itemId || product.link;
    if (precomputedVisualSimilarities && precomputedVisualSimilarities.has(key)) {
      visualSimilarity = precomputedVisualSimilarities.get(key)!;
    } else if (cropFingerprint && product.thumbnail) {
      const thumbFingerprint = await computeGrayscaleFingerprint(product.thumbnail);
      visualSimilarity = compareDHashFingerprints(cropFingerprint, thumbFingerprint);
    }

    // 4. Category/Subcategory — 10%
    const categoryM = categoryMatch(evidence.yoloLabel, cleanedTitle);

    // 5. Color Match — 10%
    const colorM = colorMatch(evidence.colorDetected, cleanedTitle);

    // 6. Material Match — 10%
    const materialM = materialMatch(evidence.materialDetected || null, cleanedTitle);

    // 7. Price Sanity — 5%
    const priceM = priceSanity(product.numericPrice, evidence.yoloLabel);

    // Reweighted Confidence Score:
    // Visual: 30% | Title: 20% | Brand: 15% | Category: 10% | Color: 10% | Material: 10% | Price: 5%
    const baseConfidence =
      visualSimilarity * 0.30 +
      titleSimilarity * 0.20 +
      brandMatch * 0.15 +
      categoryM * 0.10 +
      colorM * 0.10 +
      materialM * 0.10 +
      priceM * 0.05;

    // 8. Seller Quality & Popularity multipliers
    let sellerQuality = 1.0;
    if (product.sellerRating !== undefined) {
      if (product.sellerRating < 4.5) { // scale out of 5.0
        sellerQuality = 0.85; // penalize poor sellers
      } else {
        sellerQuality = 1.05; // boost trusted sellers
      }
    }

    let popularity = 1.0;
    if (product.rating !== undefined && product.rating > 0) {
      if (product.rating >= 4.0) popularity = 1.05;
      else if (product.rating < 3.0) popularity = 0.90;
    }

    const marketplaceConfidence = Math.min(1.0, Math.max(0.0, baseConfidence * sellerQuality * popularity));

    // Assign tiers based on final composite confidence
    let tier: VerificationTier;
    if (marketplaceConfidence >= 0.85) tier = "exact";
    else if (marketplaceConfidence >= 0.75) tier = "strong";
    else if (marketplaceConfidence >= 0.50) tier = "approximate";
    else tier = "weak";

    return {
      product,
      marketplaceConfidence,
      breakdown: {
        titleSimilarity,
        brandMatch,
        colorMatch: colorM,
        categoryMatch: categoryM,
        visualSimilarity,
        priceSanity: priceM,
        ocrMatch: ocrModelMatch(evidence.ocrText, cleanedTitle),
      },
      tier,
    };
  });

  const verified = await Promise.all(verifiedPromises);

  // Sort by marketplace confidence (highest first)
  verified.sort((a, b) => b.marketplaceConfidence - a.marketplaceConfidence);

  // Log top results
  const top3 = verified.slice(0, 3);
  console.log(`[VerificationEngine] Top 3 matches:`);
  for (const match of top3) {
    console.log(`  ├─ [${match.tier.toUpperCase()}] ${match.marketplaceConfidence.toFixed(2)} — "${match.product.title.slice(0, 60)}"`);
  }

  return verified.slice(0, limit);
}

export function getBestTier(results: VerifiedMatch[]): VerificationTier {
  if (results.length === 0) return "weak";
  return results[0].tier;
}

export function isVerificationSufficient(results: VerifiedMatch[]): boolean {
  if (results.length === 0) return false;
  return results[0].marketplaceConfidence >= 0.75;
}

export function calculateVerificationConfidence(
  evidence: CropEvidence,
  match: VerifiedMatch,
): number {
  const yoloScore = evidence.yoloConfidence;
  const brandScore = match.breakdown.brandMatch || 0;
  const ocrScore = match.breakdown.ocrMatch || 0;
  const visualScore = match.breakdown.visualSimilarity || 0.5;
  const titleScore = match.breakdown.titleSimilarity || 0;

  // Marketplace visual + title score
  const marketScore = (visualScore * 0.6 + titleScore * 0.4);

  // Composite Verification Score:
  // YOLO: 40% | Brand Logo: 20% | OCR match: 20% | Marketplace (Visual+Title): 20%
  const compositeScore =
    yoloScore * 0.40 +
    brandScore * 0.20 +
    ocrScore * 0.20 +
    marketScore * 0.20;

  return Math.min(1.0, Math.max(0.0, compositeScore));
}


