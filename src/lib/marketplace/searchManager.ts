/**
 * Cartly v3 — Search Manager
 *
 * Parallel multi-query marketplace search with session-aware caching.
 *
 * Changes from v2:
 * - Removed ALL mock-detection logic ("Direct Factory" checks, etc.)
 * - Uses QueryCache with 1h TTL (instead of internal 5-min cache)
 * - Searches all 4 resolver queries across all providers IN PARALLEL
 * - Returns 20 results to feed the Verification Engine
 * - No mock fallback — returns [] when no results found
 */

import { EBayProvider } from "./eBayProvider";
import { AliExpressProvider } from "./aliexpressProvider";
import { MarketplaceProduct, MarketplaceProvider } from "./types";
import { QueryCache } from "./queryCache";
import { SearchQueryOptimizer } from "./searchQueryOptimizer";

export class SearchManager {
  private static providers: MarketplaceProvider[] = [
    new EBayProvider(),
    new AliExpressProvider(),
  ];

  // Token intersection similarity (Jaccard)
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
      if (set2.has(word)) intersectionCount++;
    });

    const unionSize = new Set([...words1, ...words2]).size;
    return unionSize > 0 ? intersectionCount / unionSize : 0;
  }

  /**
   * Search all marketplace providers for a single query.
   * Uses QueryCache. Returns raw results (unverified).
   */
  static async search(query: string, limit = 20): Promise<MarketplaceProduct[]> {
    if (!query || query.trim().length === 0) return [];

    // Check cache first
    const cache = QueryCache.getInstance();
    const cached = cache.get(query);
    if (cached) {
      console.log(`[SearchManager] Cache hit for: "${query}" (${cached.length} results)`);
      return cached;
    }

    // Search all providers IN PARALLEL
    console.log(`[SearchManager] Searching all providers for: "${query}"`);
    const results = await Promise.all(
      this.providers.map(async (provider) => {
        try {
          const providerResults = await provider.search(query, limit);
          console.log(`  ├─ ${provider.name}: ${providerResults.length} results`);
          return providerResults;
        } catch (err) {
          console.error(`  ├─ ${provider.name}: FAILED`, err);
          return [] as MarketplaceProduct[];
        }
      }),
    );

    const allProducts = results.flat();

    // Cache results (no mock filtering needed — providers never return mocks now)
    cache.set(query, allProducts);

    return allProducts;
  }

  /**
   * Search multiple queries across all providers IN PARALLEL.
   * This is the primary entry point for the worker pipeline.
   *
   * @param queries Array of resolver queries (specific → broad)
   * @param limit Max results per query
   * @returns All results from all queries, deduplicated
   */
  static async searchMultiQuery(queries: string[], limit = 20): Promise<{
    results: MarketplaceProduct[];
    cacheHits: number;
  }> {
    if (queries.length === 0) return { results: [], cacheHits: 0 };

    const cache = QueryCache.getInstance();
    let cacheHits = 0;

    // Separate cached vs uncached queries
    const cachedResults: MarketplaceProduct[] = [];
    const uncachedQueries: string[] = [];

    for (const query of queries) {
      const cached = cache.get(query);
      if (cached) {
        cachedResults.push(...cached);
        cacheHits++;
      } else {
        uncachedQueries.push(query);
      }
    }

    if (cacheHits > 0) {
      console.log(`[SearchManager] ${cacheHits}/${queries.length} queries served from cache`);
    }

    // Search uncached queries across all providers IN PARALLEL
    const freshResultArrays = await Promise.all(
      uncachedQueries.flatMap((query) =>
        this.providers.map(async (provider) => {
          try {
            const results = await provider.search(query, limit);
            // Cache per-provider results
            return { query, results };
          } catch (err) {
            console.error(`[SearchManager] ${provider.name} failed for "${query}":`, err);
            return { query, results: [] as MarketplaceProduct[] };
          }
        }),
      ),
    );

    // Group fresh results by query and cache them
    const queryResultMap = new Map<string, MarketplaceProduct[]>();
    for (const { query, results } of freshResultArrays) {
      const existing = queryResultMap.get(query) || [];
      existing.push(...results);
      queryResultMap.set(query, existing);
    }
    for (const [query, results] of queryResultMap) {
      cache.set(query, results);
    }

    const freshResults = freshResultArrays.flatMap((r) => r.results);
    const allResults = [...cachedResults, ...freshResults];

    // Deduplicate across queries (same product from different queries)
    const deduped = this.deduplicateResults(allResults);

    console.log(`[SearchManager] Multi-query: ${queries.length} queries → ${allResults.length} raw → ${deduped.length} deduplicated`);

    return { results: deduped, cacheHits };
  }

  /**
   * Deduplicate marketplace results based on title similarity and merchant.
   */
  private static deduplicateResults(products: MarketplaceProduct[]): MarketplaceProduct[] {
    const merged: MarketplaceProduct[] = [];

    for (const prod of products) {
      let isDuplicate = false;

      for (const existing of merged) {
        // Same merchant + high title similarity = duplicate
        if (existing.merchant === prod.merchant) {
          const similarity = this.getTitleSimilarity(existing.title, prod.title);
          if (similarity >= 0.80) {
            isDuplicate = true;
            // Keep the one with more data
            if (
              prod.numericPrice < existing.numericPrice ||
              (prod.rating || 0) > (existing.rating || 0)
            ) {
              // Replace with better product
              Object.assign(existing, prod);
            }
            break;
          }
        }
      }

      if (!isDuplicate) {
        merged.push(prod);
      }
    }

    return merged;
  }

  /**
   * Get item details from the appropriate provider (lazy-loaded).
   * Called when user opens a product page.
   */
  static async getItemDetails(
    merchant: string,
    itemId: string,
  ): Promise<MarketplaceProduct | null> {
    const provider = this.providers.find((p) => p.name === merchant);
    if (!provider?.getItemDetails) return null;

    try {
      return await provider.getItemDetails(itemId);
    } catch (err) {
      console.error(`[SearchManager] getItemDetails failed for ${merchant}/${itemId}:`, err);
      return null;
    }
  }
}
