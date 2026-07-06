import { IMarketplaceMatcher, StageMetrics } from "./interfaces";
import { MarketplaceProduct } from "../marketplace/types";
import { SearchManager } from "../marketplace/searchManager";

export class DefaultMarketplaceMatcher implements IMarketplaceMatcher {
  async search(queries: string[]): Promise<{
    results: MarketplaceProduct[];
    cacheHits: number;
    metrics: StageMetrics;
  }> {
    const startTime = Date.now();
    try {
      const { results, cacheHits } = await SearchManager.searchMultiQuery(queries, 20);
      return {
        results,
        cacheHits,
        metrics: {
          latencyMs: Date.now() - startTime,
          success: true,
          metadata: { queryCount: queries.length, cacheHits, resultsCount: results.length },
        },
      };
    } catch (err: any) {
      console.error(`[DefaultMarketplaceMatcher] search failed:`, err);
      return {
        results: [],
        cacheHits: 0,
        metrics: {
          latencyMs: Date.now() - startTime,
          success: false,
          metadata: { error: err.message },
        },
      };
    }
  }
}
