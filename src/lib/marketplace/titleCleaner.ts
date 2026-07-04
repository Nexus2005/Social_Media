/**
 * Cartly v3 — Marketplace Title Cleaner
 *
 * Removes spam, promotional words, and noise from marketplace listing titles
 * BEFORE the Verification Engine runs. Marketplace titles often contain
 * irrelevant keywords stuffed for SEO.
 *
 * Example:
 *   Input:  "Nike Air Max 90 Shoes Running Sneakers Free Shipping Hot Sale 2025 Official Best"
 *   Output: "Nike Air Max 90 Shoes Running Sneakers"
 */

// Spam phrases to remove (case-insensitive)
const SPAM_PHRASES = [
  "free shipping",
  "fast shipping",
  "fast delivery",
  "same day",
  "next day delivery",
  "express delivery",
  "hot sale",
  "flash sale",
  "clearance sale",
  "big sale",
  "super sale",
  "mega sale",
  "best seller",
  "best price",
  "best quality",
  "top quality",
  "high quality",
  "premium quality",
  "factory direct",
  "direct factory",
  "wholesale price",
  "dropship",
  "dropshipping",
  "new arrival",
  "new arrivals",
  "limited time",
  "limited stock",
  "limited edition",
  "while supplies last",
  "buy now",
  "order now",
  "shop now",
  "click here",
  "brand new",
  "100% original",
  "100% authentic",
  "100% genuine",
  "100% new",
  "in stock",
  "ready to ship",
  "ships from",
];

// Single spam words to remove
const SPAM_WORDS = new Set([
  "official",
  "authentic",
  "genuine",
  "original",
  "discount",
  "clearance",
  "wholesale",
  "dropship",
  "bestseller",
]);

// Year patterns to remove (2020-2029)
const YEAR_REGEX = /\b20[2-9]\d\b/g;

// Excessive punctuation and special characters
const SPECIAL_CHARS_REGEX = /[!@#$%^&*(){}[\]|\\<>]+/g;

// Multiple spaces
const MULTI_SPACE_REGEX = /\s{2,}/g;

/**
 * Clean a marketplace title by removing spam and promotional content.
 * Returns the cleaned title suitable for verification scoring.
 */
export function cleanMarketplaceTitle(rawTitle: string): string {
  let cleaned = rawTitle;

  // 1. Remove spam phrases (longest first to avoid partial matches)
  const sortedPhrases = [...SPAM_PHRASES].sort((a, b) => b.length - a.length);
  for (const phrase of sortedPhrases) {
    const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    cleaned = cleaned.replace(regex, " ");
  }

  // 2. Remove individual spam words (only if standalone)
  const words = cleaned.split(/\s+/);
  const filteredWords = words.filter((w) => {
    const lower = w.toLowerCase().replace(/[^a-z0-9]/g, "");
    return !SPAM_WORDS.has(lower);
  });
  cleaned = filteredWords.join(" ");

  // 3. Remove year patterns
  cleaned = cleaned.replace(YEAR_REGEX, " ");

  // 4. Remove excessive special characters
  cleaned = cleaned.replace(SPECIAL_CHARS_REGEX, " ");

  // 5. Collapse multiple spaces
  cleaned = cleaned.replace(MULTI_SPACE_REGEX, " ").trim();

  // 6. Don't return empty — fallback to first 8 meaningful words of original
  if (cleaned.length < 3) {
    cleaned = rawTitle
      .replace(SPECIAL_CHARS_REGEX, " ")
      .replace(MULTI_SPACE_REGEX, " ")
      .trim()
      .split(/\s+/)
      .slice(0, 8)
      .join(" ");
  }

  return cleaned;
}

/**
 * Extract brand name from a marketplace title.
 * Returns the first word that looks like a brand (capitalized, known pattern).
 */
export function extractBrandFromTitle(title: string): string | null {
  const words = title.split(/\s+/);
  if (words.length === 0) return null;

  // The first word is often the brand
  const firstWord = words[0];
  if (firstWord && firstWord.length >= 2 && /^[A-Z]/.test(firstWord)) {
    return firstWord;
  }
  return null;
}
