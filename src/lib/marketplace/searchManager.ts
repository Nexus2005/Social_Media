import { EBayProvider } from "./eBayProvider";
import { AliExpressProvider } from "./aliexpressProvider";
import { MarketplaceProduct, MarketplaceProvider } from "./types";

export class SearchManager {
  private static providers: MarketplaceProvider[] = [
    new EBayProvider(),
    new AliExpressProvider(),
  ];

  // Token intersection similarity helper (Jaccard)
  private static getTitleSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    if (s1 === s2) return 1.0;

    const words1 = s1.split(/\s+/);
    const words2 = s2.split(/\s+/);
    const set1 = new Set(words1);
    const set2 = new Set(words2);

    let intersectionCount = 0;
    set1.forEach((word) => {
      if (set2.has(word)) {
        intersectionCount++;
      }
    });

    const unionSize = new Set([...words1, ...words2]).size;
    return unionSize > 0 ? intersectionCount / unionSize : 0;
  }

  // Scoring and ranking function
  private static calculateScore(product: MarketplaceProduct, query: string): number {
    const titleLower = product.title.toLowerCase();
    const queryWords = query.toLowerCase().split(/\s+/).filter(Boolean);

    // 1. Relevance: ratio of matched query words
    let matchedWords = 0;
    for (const word of queryWords) {
      if (titleLower.includes(word)) {
        matchedWords++;
      }
    }
    const relevanceScore = queryWords.length > 0 ? matchedWords / queryWords.length : 1;

    // 2. Rating Score: normalized to 0-1
    const ratingVal = product.rating || 0;
    const ratingScore = ratingVal / 5.0;

    // 3. Shipping Bonus: free shipping receives higher preference
    const isFreeShipping = product.shippingInfo?.toLowerCase().includes("free") ? 1 : 0;

    // Weighted Score: 50% relevance, 30% rating, 20% shipping bonus
    return relevanceScore * 0.5 + ratingScore * 0.3 + isFreeShipping * 0.2;
  }

  /**
   * Search all configured marketplaces in parallel, deduplicate results, and rank them.
   */
  static async search(query: string, limit = 10): Promise<MarketplaceProduct[]> {
    if (!query) return [];

    // Step 2: Query all providers in parallel
    const searchPromises = this.providers.map(async (provider) => {
      try {
        return await provider.search(query, limit);
      } catch (err) {
        console.error(`Provider ${provider.name} failed during search:`, err);
        return [];
      }
    });

    const resultsArray = await Promise.all(searchPromises);
    const allProducts = resultsArray.flat();

    // Step 4: Merge duplicates using Title Similarity >= 0.85
    const mergedProducts: MarketplaceProduct[] = [];

    for (const prod of allProducts) {
      let isDuplicate = false;

      for (const existing of mergedProducts) {
        const similarity = this.getTitleSimilarity(existing.title, prod.title);
        if (similarity >= 0.85) {
          isDuplicate = true;
          // Combine offers: keep the cheaper offer or the one with higher rating
          if (prod.numericPrice < existing.numericPrice || (prod.rating || 0) > (existing.rating || 0)) {
            existing.price = prod.price;
            existing.numericPrice = prod.numericPrice;
            existing.currency = prod.currency;
            existing.merchant = prod.merchant;
            existing.link = prod.link;
            existing.thumbnail = prod.thumbnail || existing.thumbnail;
            existing.rating = prod.rating || existing.rating;
            existing.reviewsCount = prod.reviewsCount || existing.reviewsCount;
            existing.shippingInfo = prod.shippingInfo || existing.shippingInfo;
          }
          break;
        }
      }

      if (!isDuplicate) {
        mergedProducts.push(prod);
      }
    }

    // Step 5: Rank results based on match quality, shipping, and rating
    return mergedProducts
      .map((prod) => ({
        product: prod,
        score: this.calculateScore(prod, query),
      }))
      .sort((a, b) => b.score - a.score)
      .map((item) => item.product)
      .slice(0, limit);
  }
}
