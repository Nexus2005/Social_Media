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
const CATEGORY_WORDS = new Set(["sneakers", "shoes", "boots", "sandals", "shirt", "t-shirt", "hoodie", "jacket",
  "coat", "bag", "handbag", "backpack", "watch", "sunglasses", "glasses", "jeans", "shorts", "dress", "suit"]);

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
