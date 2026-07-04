/**
 * SearchQueryOptimizer
 *
 * Generates progressively broader fallback queries when a precise product search returns zero results.
 *
 * Example progression for "Nike Air Max SYSTM Men's Sneakers":
 *   1. "Nike Air Max SYSTM Men's Sneakers"   (original — exact)
 *   2. "Nike Air Max SYSTM"                  (drop gender + category)
 *   3. "Air Max SYSTM"                       (drop brand prefix)
 *   4. "Nike sneakers"                       (brand + category only)
 *   5. "sneakers"                            (category only)
 */

// Noise words stripped during query simplification
const GENDER_WORDS = new Set(["men's", "mens", "women's", "womens", "unisex", "boys", "girls", "kids"]);
const CATEGORY_WORDS = new Set([
  // Footwear
  "sneakers", "shoes", "boots", "sandals", "trainers", "heels",
  // Clothing
  "shirt", "t-shirt", "hoodie", "jacket", "coat", "sweater", "dress",
  "suit", "jeans", "shorts", "pants", "skirt", "top", "blouse",
  // Bags
  "bag", "handbag", "backpack", "suitcase", "purse", "tote", "clutch",
  // Accessories
  "watch", "smartwatch", "sunglasses", "glasses", "belt", "wallet",
  "hat", "cap", "tie", "umbrella",
  // Electronics
  "phone", "laptop", "tablet", "keyboard", "mouse", "monitor",
  "headphones", "earbuds", "speaker", "camera", "remote",
  // Furniture
  "chair", "sofa", "couch", "bed", "table",
  // Kitchen
  "bottle", "mug", "cup", "bowl", "vase", "clock",
  // Jewelry
  "ring", "necklace", "bracelet", "earrings", "jewelry", "jewellery",
  // Beauty
  "perfume", "lipstick", "foundation", "cosmetics",
  // Sports
  "skateboard", "surfboard", "bicycle", "snowboard",
  // Books
  "book",
  // Other
  "console", "controller",
]);

// Alphanumeric model codes to preserve (don't strip during simplification)
const MODEL_CODE_REGEX = /^[a-z]*\d+[a-z0-9]*$/i; // "S24", "A15", "90", "Air"


export class SearchQueryOptimizer {
  /**
   * Returns an ordered array of queries from most specific to most general.
   * The caller should iterate through them and stop at the first that returns results.
   */
  static generateFallbacks(originalQuery: string): string[] {
    const queries: string[] = [originalQuery];
    const words = originalQuery.split(/\s+/);

    // Step 1: strip gender words
    const noGender = words.filter((w) => !GENDER_WORDS.has(w.toLowerCase())).join(" ").trim();
    if (noGender && noGender !== originalQuery) {
      queries.push(noGender);
    }

    // Step 2: strip gender + trailing category word
    const withoutGender = noGender || originalQuery;
    const withoutGenderWords = withoutGender.split(/\s+/);
    const lastWord = withoutGenderWords[withoutGenderWords.length - 1]?.toLowerCase();
    if (CATEGORY_WORDS.has(lastWord)) {
      const noCategory = withoutGenderWords.slice(0, -1).join(" ").trim();
      if (noCategory && noCategory !== noGender) {
        queries.push(noCategory);
      }
    }

    // Step 3: extract brand (first word) + category only
    const firstWord = words[0];
    const categoryWord = words.find((w) => CATEGORY_WORDS.has(w.toLowerCase()));
    if (firstWord && categoryWord && firstWord.toLowerCase() !== categoryWord.toLowerCase()) {
      const brandCategory = `${firstWord} ${categoryWord}`;
      if (!queries.includes(brandCategory)) {
        queries.push(brandCategory);
      }
    }

    // Step 4: category only
    if (categoryWord && !queries.includes(categoryWord)) {
      queries.push(categoryWord);
    }

    // Remove duplicates and empty strings
    return [...new Set(queries)].filter(Boolean);
  }
}
