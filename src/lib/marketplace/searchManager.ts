import { EBayProvider } from "./eBayProvider";
import { AliExpressProvider } from "./aliexpressProvider";
import { MarketplaceProduct, MarketplaceProvider } from "./types";
import { SearchQueryOptimizer } from "./searchQueryOptimizer";

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

  private static searchCache = new Map<string, { results: MarketplaceProduct[]; expiresAt: number }>();

  /**
   * Search all configured marketplaces in parallel with progressive query fallback.
   * If a query returns zero live results, progressively broader fallbacks are attempted.
   */
  static async search(originalQuery: string, limit = 10): Promise<MarketplaceProduct[]> {
    if (!originalQuery) return [];

    const cacheKey = `${originalQuery.toLowerCase().trim()}_limit_${limit}`;
    const cached = this.searchCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      console.log(`[SearchManager] Cache hit for query: "${originalQuery}"`);
      return cached.results;
    }

    // Generate progressive fallback queries
    const fallbacks = SearchQueryOptimizer.generateFallbacks(originalQuery);
    console.log(`[SearchManager] Query fallback chain: ${fallbacks.map((q) => `"${q}"`).join(" → ")}`);

    for (const query of fallbacks) {
      console.log(`[SearchManager] Trying query: "${query}"`);

      // Query all providers in parallel
      const searchPromises = this.providers.map(async (provider) => {
        try {
          return await provider.search(query, limit);
        } catch (err) {
          console.error(`[SearchManager] Provider ${provider.name} failed during search:`, err);
          return [] as MarketplaceProduct[];
        }
      });

      const resultsArray = await Promise.all(searchPromises);
      const allProducts = resultsArray.flat();

      // Count only non-mock results (mock results use generic placeholder titles)
      const liveProducts = allProducts.filter(
        (p) => !p.title.startsWith("Direct Factory") &&
                !p.title.startsWith("Universal Multi-purpose") &&
                !p.title.startsWith("Trendy") &&
                !p.title.startsWith("Authentic Retro") &&
                !p.title.startsWith("Premium Wearable") &&
                !p.title.startsWith("Imported Custom")
      );

      if (liveProducts.length > 0) {
        console.log(`[SearchManager] Got ${liveProducts.length} live results for query "${query}". Stopping fallback chain.`);
        const ranked = this.rankAndDeduplicate(allProducts, query, limit);
        this.searchCache.set(cacheKey, { results: ranked, expiresAt: Date.now() + 300000 });
        return ranked;
      }

      console.log(`[SearchManager] Zero live results for "${query}". Trying next fallback...`);
    }

    // All fallbacks exhausted — return whatever we have from the last attempt (mocks)
    console.warn(`[SearchManager] All query fallbacks exhausted for "${originalQuery}". Returning mock results.`);
    const mockResults = this.providers.reduce<MarketplaceProduct[]>((acc, _) => acc, []);
    const lastQuery = fallbacks[fallbacks.length - 1];
    const lastResults = await Promise.all(
      this.providers.map((p) => p.search(lastQuery, limit).catch(() => [] as MarketplaceProduct[]))
    ).then((r) => r.flat());
    const ranked = this.rankAndDeduplicate(lastResults, lastQuery, limit);
    this.searchCache.set(cacheKey, { results: ranked, expiresAt: Date.now() + 60000 }); // shorter cache for fallbacks
    return ranked;
  }

  private static rankAndDeduplicate(products: MarketplaceProduct[], query: string, limit: number): MarketplaceProduct[] {
    // Merge duplicates using Title Similarity >= 0.85
    const merged: MarketplaceProduct[] = [];
    for (const prod of products) {
      let isDuplicate = false;
      for (const existing of merged) {
        const similarity = this.getTitleSimilarity(existing.title, prod.title);
        if (similarity >= 0.85) {
          isDuplicate = true;
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
        merged.push(prod);
      }
    }

    // Rank by relevance, rating, and shipping
    return merged
      .map((prod) => ({ product: prod, score: this.calculateScore(prod, query) }))
      .sort((a, b) => b.score - a.score)
      .map((item) => item.product)
      .slice(0, limit);
  }
}
