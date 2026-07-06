/**
 * Cartly v3 — Multi-Query Product Resolver (Phase 1)
 *
 * Generates 4 query variants from detection evidence (most specific → broadest).
 * All queries are searched in parallel. The Verification Engine picks the winner.
 *
 * Phase 1 Enhancement: Now incorporates video captions, hashtags, and
 * creator tags alongside YOLO, OCR, and logo evidence.
 *
 * Example for a Nike Air Max shoe in a reel with #adidas #football:
 *   1. "Adidas Predator White Football Boots"   (brand from hashtag + color + category)
 *   2. "Adidas White Football Boots"             (brand + color + category)
 *   3. "White Football Boots"                    (color + category)
 *   4. "Football Boots"                          (category only fallback)
 *
 * Key design decisions:
 * - Video captions/hashtags can override or supplement logo-detected brands
 * - Hashtag brands take priority when no logo was detected
 * - OCR model codes are included verbatim (e.g., "S24", "A15")
 * - Query quality score (0-1) measures specificity
 */

import { CropEvidence } from "./detectionPipeline";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ResolverResult {
  queries: string[];        // 4 variants, specific → broad
  queryQuality: number;     // 0-1, how specific is the best query
  primaryQuery: string;     // the most specific query
}

// ─── Category Label Mapping ───────────────────────────────────────────────────
// Maps YOLO labels to shopping-friendly category names

const LABEL_TO_CATEGORY: Record<string, string> = {
  // Footwear
  shoe: "Shoes", shoes: "Shoes", sneaker: "Sneakers", sneakers: "Sneakers",
  boot: "Boots", boots: "Boots", sandal: "Sandals", sandals: "Sandals",
  // Clothing
  shirt: "Shirt", "t-shirt": "T-Shirt", top: "Top", dress: "Dress",
  jacket: "Jacket", coat: "Coat", hoodie: "Hoodie", sweater: "Sweater",
  jeans: "Jeans", pants: "Pants", shorts: "Shorts", skirt: "Skirt", suit: "Suit",
  // Bags
  handbag: "Handbag", backpack: "Backpack", suitcase: "Suitcase",
  bag: "Bag", purse: "Purse",
  // Accessories
  watch: "Watch", smartwatch: "Smartwatch", sunglasses: "Sunglasses",
  glasses: "Glasses", tie: "Tie", belt: "Belt", wallet: "Wallet",
  hat: "Hat", cap: "Cap", umbrella: "Umbrella",
  // Electronics
  "cell phone": "Phone", laptop: "Laptop", tablet: "Tablet",
  keyboard: "Keyboard", mouse: "Mouse", tv: "Monitor",
  headphones: "Headphones", earphones: "Earphones",
  speaker: "Speaker", camera: "Camera", remote: "Remote Control",
  // Furniture
  chair: "Chair", couch: "Sofa", bed: "Bed", "dining table": "Table",
  // Kitchen
  bottle: "Bottle", "wine glass": "Wine Glass", cup: "Mug", bowl: "Bowl",
  vase: "Vase", clock: "Clock",
  // Jewelry
  ring: "Ring", necklace: "Necklace", bracelet: "Bracelet",
  earring: "Earrings", jewelry: "Jewelry", jewellery: "Jewellery",
  // Other
  book: "Book", scissors: "Scissors",
  "sports ball": "Sports Ball", "tennis racket": "Tennis Racket",
  skateboard: "Skateboard", surfboard: "Surfboard",
  bicycle: "Bicycle", motorcycle: "Motorcycle",
  perfume: "Perfume", lipstick: "Lipstick",
  cosmetics: "Cosmetics", "gaming console": "Gaming Console",
};

// ─── Hashtag / Caption Parsing ───────────────────────────────────────────

// Known fashion/product brands to detect in hashtags and captions
const KNOWN_BRANDS = new Set([
  "nike", "adidas", "puma", "reebok", "converse", "vans", "newbalance",
  "gucci", "prada", "chanel", "louisvuitton", "lv", "hermes", "dior", "versace",
  "zara", "hm", "uniqlo", "gap", "levis", "tommy", "calvin", "armani",
  "samsung", "apple", "sony", "bose", "jbl", "beats", "xiaomi", "oneplus",
  "rolex", "casio", "seiko", "omega", "tissot", "fossil",
  "rayban", "oakley", "carrera",
  "supreme", "offwhite", "balenciaga", "yeezy", "jordan",
  "underarmour", "northface", "patagonia", "columbia",
]);

// Product-relevant keywords to extract from captions
const PRODUCT_KEYWORDS = new Set([
  "football", "soccer", "running", "basketball", "tennis", "gym", "training",
  "vintage", "retro", "classic", "limited", "edition", "premium",
  "leather", "cotton", "silk", "denim", "linen", "wool",
  "oversized", "slim", "skinny", "loose", "cropped",
  "streetwear", "casual", "formal", "sporty", "athletic",
]);

function extractBrandsFromHashtags(hashtags: string[]): string[] {
  const found: string[] = [];
  for (const tag of hashtags) {
    const clean = tag.replace(/^#/, "").toLowerCase().trim();
    if (KNOWN_BRANDS.has(clean)) {
      // Capitalize properly
      found.push(clean.charAt(0).toUpperCase() + clean.slice(1));
    }
  }
  return [...new Set(found)];
}

function extractProductKeywordsFromCaption(caption: string): string[] {
  if (!caption) return [];
  const words = caption.toLowerCase().split(/[\s#@,.:;!?]+/).filter(Boolean);
  const found: string[] = [];
  for (const word of words) {
    if (PRODUCT_KEYWORDS.has(word)) {
      found.push(word.charAt(0).toUpperCase() + word.slice(1));
    }
  }
  return [...new Set(found)];
}

function extractHashtagBrands(captionText: string): string[] {
  // Extract all #hashtags from caption text
  const hashtags = captionText.match(/#[\w]+/g) || [];
  return extractBrandsFromHashtags(hashtags);
}

// ─── OCR Cleaning ─────────────────────────────────────────────────────────────

const SKIP_WORDS = new Set([
  "the", "and", "for", "with", "from", "original", "made", "in",
  "china", "usa", "product", "new", "style", "quality", "premium",
  "free", "shipping", "sale", "hot", "best",
]);

function cleanOcrForQuery(text: string, brand: string | null): string {
  const brandLower = (brand || "").toLowerCase();

  return text
    .split(/[^a-zA-Z0-9]/g)
    .map((w) => w.trim())
    .filter((w) => {
      const wLower = w.toLowerCase();
      return (
        w.length > 2 &&
        !SKIP_WORDS.has(wLower) &&
        wLower !== brandLower &&
        !/^\d+$/.test(w)  // skip pure numbers (keep alphanumeric like "A15", "S24")
      );
    })
    .slice(0, 4)
    .join(" ");
}

// ─── Query Generation ───────────────────────────────────────────────────────

/**
 * Generate search query variants from detection evidence + video context.
 *
 * @param evidence - Detection evidence from the crop analysis pipeline
 * @param captionText - Optional video caption/description (may contain hashtags)
 * @param hashtags - Optional array of hashtags from the video post
 * @returns Queries from most specific to broadest
 */
export function resolveQueries(
  evidence: CropEvidence,
  captionText?: string,
  hashtags?: string[],
): ResolverResult {
  // Extract fields with normalization
  const logoBrand = evidence.brand || evidence.logo || null;
  const category = LABEL_TO_CATEGORY[evidence.yoloLabel.toLowerCase()] || evidence.yoloLabel;
  const subcategory = evidence.subcategory && evidence.subcategory !== "none" && evidence.subcategory !== "unknown" ? evidence.subcategory : null;
  const gender = evidence.gender && evidence.gender !== "none" && evidence.gender !== "unknown" ? evidence.gender : null;
  const color = (evidence.colorDetected && evidence.colorDetected !== "unknown") ? evidence.colorDetected : null;
  const material = evidence.materialDetected && evidence.materialDetected !== "none" && evidence.materialDetected !== "unknown" ? evidence.materialDetected : null;
  const neckline = evidence.neckline && evidence.neckline !== "none" && evidence.neckline !== "unknown" ? evidence.neckline : null;
  const sleeve = evidence.sleeve && evidence.sleeve !== "none" && evidence.sleeve !== "unknown" ? evidence.sleeve : null;
  const fit = evidence.fit && evidence.fit !== "none" && evidence.fit !== "unknown" ? evidence.fit : null;
  const pattern = evidence.pattern && evidence.pattern !== "none" && evidence.pattern !== "unknown" ? evidence.pattern : null;
  const cleanedOcr = cleanOcrForQuery(evidence.ocrText, logoBrand);

  // ── Enrich brand from video context (captions & hashtags) ─────────────────
  let brand = logoBrand;
  const captionKeywords: string[] = [];

  // Extract brands from hashtags
  if (hashtags && hashtags.length > 0) {
    const hashtagBrands = extractBrandsFromHashtags(hashtags);
    if (!brand && hashtagBrands.length > 0) {
      brand = hashtagBrands[0]; // Use first detected brand from hashtags
      console.log(`[ProductResolver] Brand from hashtag: "${brand}"`);
    }
  }

  // Extract brands and keywords from caption text
  if (captionText) {
    const captionBrands = extractHashtagBrands(captionText);
    if (!brand && captionBrands.length > 0) {
      brand = captionBrands[0];
      console.log(`[ProductResolver] Brand from caption hashtag: "${brand}"`);
    }

    // Extract product-relevant keywords from caption
    const keywords = extractProductKeywordsFromCaption(captionText);
    captionKeywords.push(...keywords);
    if (keywords.length > 0) {
      console.log(`[ProductResolver] Caption keywords: ${keywords.join(", ")}`);
    }
  }

  const productType = subcategory || category;

  const queries: string[] = [];

  // ── Query 1: Most specific (gender + color + fit + pattern + neckline + sleeve + material + productType + brand + OCR + caption keywords) ──
  const q1Parts: string[] = [];
  if (gender) q1Parts.push(gender);
  if (color) q1Parts.push(color);
  if (fit) q1Parts.push(fit);
  if (pattern) q1Parts.push(pattern);
  if (neckline) q1Parts.push(neckline);
  if (sleeve) q1Parts.push(sleeve);
  if (material) q1Parts.push(material);
  if (brand) q1Parts.push(brand);
  q1Parts.push(productType);
  if (cleanedOcr) q1Parts.push(cleanedOcr);
  // Add up to 2 caption keywords for extra specificity
  for (const kw of captionKeywords.slice(0, 2)) {
    if (!q1Parts.some(p => p.toLowerCase() === kw.toLowerCase())) {
      q1Parts.push(kw);
    }
  }

  const specific = dedup(q1Parts).join(" ");
  if (specific.length >= 3) queries.push(specific);

  // ── Query 2: Medium specific (brand + color + gender + productType) ──
  const q2Parts: string[] = [];
  if (brand) q2Parts.push(brand);
  if (color) q2Parts.push(color);
  if (gender) q2Parts.push(gender);
  q2Parts.push(productType);
  const q2 = dedup(q2Parts).join(" ");
  if (q2 !== specific && q2.length >= 3) queries.push(q2);

  // ── Query 3: Color + pattern + productType + brand ──
  const q3Parts: string[] = [];
  if (color) q3Parts.push(color);
  if (pattern) q3Parts.push(pattern);
  q3Parts.push(productType);
  if (brand) q3Parts.push(brand);
  const q3 = dedup(q3Parts).join(" ");
  if (!queries.includes(q3) && q3.length >= 3) queries.push(q3);

  // ── Query 4: Product type only (broadest fallback) ──
  if (!queries.includes(productType) && productType.length >= 3) {
    queries.push(productType);
  }

  // Ensure at least 1 query
  if (queries.length === 0) {
    queries.push(evidence.yoloLabel);
  }

  // Calculate query quality (0-1)
  let quality = 0;
  if (brand) quality += 0.20;
  if (cleanedOcr) quality += 0.15;
  if (color) quality += 0.10;
  if (gender) quality += 0.10;
  if (neckline || sleeve) quality += 0.15;
  if (fit || pattern) quality += 0.15;
  if (material) quality += 0.10;
  if (subcategory) quality += 0.15;
  if (captionKeywords.length > 0) quality += 0.05;
  quality = Math.min(1.0, quality);

  console.log(`[ProductResolver] Evidence: brand="${brand}" gender="${gender}" neckline="${neckline}" sleeve="${sleeve}" fit="${fit}" pattern="${pattern}" color="${color}" category="${category}"`);
  if (captionKeywords.length > 0) {
    console.log(`[ProductResolver] Caption context: ${captionKeywords.join(", ")}`);
  }
  console.log(`[ProductResolver] Queries (${queries.length}): ${queries.map(q => `"${q}"`).join(" → ")}`);
  console.log(`[ProductResolver] Query quality: ${quality.toFixed(2)}`);

  return {
    queries,
    queryQuality: quality,
    primaryQuery: queries[0],
  };
}

function dedup(words: string[]): string[] {
  const seen = new Set<string>();
  return words.filter((w) => {
    const lower = w.toLowerCase();
    if (seen.has(lower)) return false;
    seen.add(lower);
    return true;
  });
}

import { IProductResolver, ResolutionResult } from "./interfaces";
import { calculateVerificationConfidence } from "../marketplace/verificationEngine";
import { VerifiedMatch } from "../marketplace/types";
import { PluginRegistry } from "./pluginRegistry";

export class ProductResolverPlugin implements IProductResolver {
  async resolve(
    evidence: CropEvidence,
    results: VerifiedMatch[],
    crops: Buffer[],
  ): Promise<ResolutionResult> {
    const startTime = Date.now();
    const bestMatch = results.length > 0 ? results[0] : null;
    const confidenceScore = bestMatch ? calculateVerificationConfidence(evidence, bestMatch) : 0.0;
    const threshold = PluginRegistry.getVerifyThreshold();
    const isGeminiNeeded = !bestMatch || confidenceScore < threshold;

    return {
      resolvedMatch: bestMatch,
      confidenceScore,
      isGeminiNeeded,
      metrics: {
        latencyMs: Date.now() - startTime,
        success: true,
        metadata: { confidenceScore, threshold, isGeminiNeeded },
      },
    };
  }
}

