import { MarketplaceProduct } from "./types";
import { CacheManager } from "./cacheManager";

export class QueryCache {
  private static instance: QueryCache;

  private constructor() {}

  static getInstance(): QueryCache {
    if (!QueryCache.instance) {
      QueryCache.instance = new QueryCache();
    }
    return QueryCache.instance;
  }

  get(query: string): MarketplaceProduct[] | null {
    return CacheManager.getInstance().getMarketplace(query);
  }

  set(query: string, results: MarketplaceProduct[]): void {
    CacheManager.getInstance().setMarketplace(query, results);
  }

  has(query: string): boolean {
    return this.get(query) !== null;
  }

  clear(): void {
    CacheManager.getInstance().clear();
  }

  getStats(): { size: number; maxEntries: number; ttlMs: number } {
    return {
      size: 0,
      maxEntries: 500,
      ttlMs: 3600000,
    };
  }
}

