/**
 * Cartly v3 — Search Manager
 *
 * Parallel multi-query marketplace search with DB-backed composite caching.
 *
 * Changes:
 * - Removed QueryCache (in-memory) -> uses Prisma-backed MarketplaceSearchCache
 * - Cache key tracks query, marketplace, country, currency, and language
 * - Enforces 6h TTL
 * - Invalidates cache on empty / corrupted payloads
 * - Runs queries and cache checks in parallel
 */

import { EBayProvider } from "./eBayProvider";
import { AliExpressProvider } from "./aliexpressProvider";
import { MarketplaceProduct, MarketplaceProvider } from "./types";
import prisma from "../prisma";

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
   * Database Cache Getter
   */
  private static async getCachedResults(
    query: string,
    marketplace: string,
    country = "US",
    currency = "USD",
    language = "en"
  ): Promise<MarketplaceProduct[] | null> {
    try {
      const cache = await prisma.marketplaceSearchCache.findUnique({
        where: {
          query_marketplace_country_currency_language: {
            query,
            marketplace,
            country,
            currency,
            language,
          },
        },
      });

      if (!cache) return null;

      // 6-hour TTL check
      const ageMs = Date.now() - new Date(cache.updatedAt).getTime();
      if (ageMs > 6 * 60 * 60 * 1000) {
        console.log(`[SearchCache] Expired cached results for query: "${query}" on ${marketplace}`);
        return null;
      }

      // Invalidate if empty/corrupted payload
      const results = cache.results as any[];
      if (!Array.isArray(results) || results.length === 0) {
        console.log(`[SearchCache] Invalid/empty cache hit for query: "${query}" on ${marketplace}. Invalidate.`);
        return null;
      }

      return results as MarketplaceProduct[];
    } catch (err) {
      console.error("[SearchCache] Error reading cache:", err);
      return null;
    }
  }

  /**
   * Database Cache Setter
   */
  private static async setCachedResults(
    query: string,
    marketplace: string,
    results: MarketplaceProduct[],
    country = "US",
    currency = "USD",
    language = "en"
  ): Promise<void> {
    if (!Array.isArray(results) || results.length === 0) return; // Don't cache empty results (comply with invalidation rules)

    try {
      const normalizedQuery = query.toLowerCase().trim();
      await prisma.marketplaceSearchCache.upsert({
        where: {
          query_marketplace_country_currency_language: {
            query,
            marketplace,
            country,
            currency,
            language,
          },
        },
        create: {
          query,
          normalizedQuery,
          marketplace,
          country,
          currency,
          language,
          results: results as any,
        },
        update: {
          results: results as any,
          updatedAt: new Date(),
        },
      });
    } catch (err) {
      console.error("[SearchCache] Error writing cache:", err);
    }
  }

  /**
   * Search all marketplace providers for a single query.
   * Returns raw results (unverified).
   */
  static async search(
    query: string,
    limit = 20,
    options?: {
      country?: string;
      currency?: string;
      language?: string;
    }
  ): Promise<MarketplaceProduct[]> {
    if (!query || query.trim().length === 0) return [];

    const country = options?.country || "US";
    const currency = options?.currency || "USD";
    const language = options?.language || "en";

    // Search all providers IN PARALLEL
    const results = await Promise.all(
      this.providers.map(async (provider) => {
        try {
          // Check DB Cache first
          const cached = await this.getCachedResults(query, provider.name, country, currency, language);
          if (cached) {
            console.log(`[SearchManager] DB Cache hit for: "${query}" on ${provider.name} (${cached.length} results)`);
            return cached;
          }

          const providerResults = await provider.search(query, limit);
          console.log(`  ├─ ${provider.name}: ${providerResults.length} results`);

          // Cache results
          await this.setCachedResults(query, provider.name, providerResults, country, currency, language);
          return providerResults;
        } catch (err) {
          console.error(`  ├─ ${provider.name}: FAILED`, err);
          return [] as MarketplaceProduct[];
        }
      }),
    );

    return results.flat();
  }

  /**
   * Search multiple queries across all providers IN PARALLEL.
   * This is the primary entry point for the worker pipeline.
   *
   * @param queries Array of resolver queries (specific → broad)
   * @param limit Max results per query
   * @param options Language, Currency, Country overrides
   * @returns All results from all queries, deduplicated
   */
  static async searchMultiQuery(
    queries: string[],
    limit = 20,
    options?: {
      country?: string;
      currency?: string;
      language?: string;
    }
  ): Promise<{
    results: MarketplaceProduct[];
    cacheHits: number;
  }> {
    if (queries.length === 0) return { results: [], cacheHits: 0 };

    const country = options?.country || "US";
    const currency = options?.currency || "USD";
    const language = options?.language || "en";

    let cacheHits = 0;
    const allResults: MarketplaceProduct[] = [];

    // Solve cache checks and fetches in parallel across queries and providers
    await Promise.all(
      queries.map(async (query) => {
        const queryResults = await Promise.all(
          this.providers.map(async (provider) => {
            try {
              // Cache Lookup
              const cached = await this.getCachedResults(query, provider.name, country, currency, language);
              if (cached) {
                cacheHits++;
                return cached;
              }

              // Search Provider
              const results = await provider.search(query, limit);
              await this.setCachedResults(query, provider.name, results, country, currency, language);
              return results;
            } catch (err) {
              console.error(`[SearchManager] ${provider.name} failed for "${query}":`, err);
              return [] as MarketplaceProduct[];
            }
          })
        );
        allResults.push(...queryResults.flat());
      })
    );

    if (cacheHits > 0) {
      console.log(`[SearchManager] ${cacheHits} query/provider hits served from DB cache`);
    }

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
