/**
 * Cartly v3 — Hierarchical Cache Manager
 *
 * Implements 5 specialized caches to reduce pipeline latency and API costs:
 * 1. Frame Cache (24h) — Scene frame hashes to skip repeated extraction.
 * 2. Gemini Cache (12h) — Gemini VLM output for identical crop hashes/queries.
 * 3. Marketplace Cache (1h) — Search query result cache (wrapped around QueryCache).
 * 4. Metadata Cache (6h) — Lazy-loaded product details.
 * 5. Image Cache (48h) — Downloaded/cached product images.
 */

import { MarketplaceProduct } from "./types";

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class CacheManager {
  private static instance: CacheManager;

  // Caches
  private frameCache = new Map<string, CacheEntry<any>>();
  private geminiCache = new Map<string, CacheEntry<any>>();
  private marketplaceCache = new Map<string, CacheEntry<MarketplaceProduct[]>>();
  private metadataCache = new Map<string, CacheEntry<MarketplaceProduct>>();
  private imageCache = new Map<string, CacheEntry<string>>(); // Mapping image URLs to local cached paths

  // TTL Settings
  private readonly TTL_FRAME = 24 * 60 * 60 * 1000;
  private readonly TTL_GEMINI = 12 * 60 * 60 * 1000;
  private readonly TTL_MARKETPLACE = 1 * 60 * 60 * 1000;
  private readonly TTL_METADATA = 6 * 60 * 60 * 1000;
  private readonly TTL_IMAGE = 48 * 60 * 60 * 1000;

  // Max Limit Settings
  private readonly MAX_LIMIT = 500;

  private constructor() {}

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  // ─── Eviction Helper ────────────────────────────────────────────────────────

  private setWithLimit<T>(map: Map<string, CacheEntry<T>>, key: string, value: T, ttl: number) {
    if (map.size >= this.MAX_LIMIT) {
      const oldestKey = map.keys().next().value;
      if (oldestKey) map.delete(oldestKey);
    }
    map.set(key, {
      value,
      expiresAt: Date.now() + ttl,
    });
  }

  private getWithExpiry<T>(map: Map<string, CacheEntry<T>>, key: string): T | null {
    const entry = map.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      map.delete(key);
      return null;
    }
    return entry.value;
  }

  // ─── 1. Frame Cache (24h) ───────────────────────────────────────────────────

  getFrame(key: string): any | null {
    return this.getWithExpiry(this.frameCache, key);
  }

  setFrame(key: string, value: any): void {
    this.setWithLimit(this.frameCache, key, value, this.TTL_FRAME);
  }

  // ─── 2. Gemini Cache (12h) ──────────────────────────────────────────────────

  getGemini(key: string): any | null {
    return this.getWithExpiry(this.geminiCache, key);
  }

  setGemini(key: string, value: any): void {
    this.setWithLimit(this.geminiCache, key, value, this.TTL_GEMINI);
  }

  // ─── 3. Marketplace Cache (1h) ──────────────────────────────────────────────

  getMarketplace(query: string): MarketplaceProduct[] | null {
    return this.getWithExpiry(this.marketplaceCache, this.normalizeQuery(query));
  }

  setMarketplace(query: string, results: MarketplaceProduct[]): void {
    this.setWithLimit(this.marketplaceCache, this.normalizeQuery(query), results, this.TTL_MARKETPLACE);
  }

  private normalizeQuery(query: string): string {
    return query
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0)
      .sort()
      .join(" ");
  }

  // ─── 4. Metadata Cache (6h) ─────────────────────────────────────────────────

  getMetadata(productId: string): MarketplaceProduct | null {
    return this.getWithExpiry(this.metadataCache, productId);
  }

  setMetadata(productId: string, product: MarketplaceProduct): void {
    this.setWithLimit(this.metadataCache, productId, product, this.TTL_METADATA);
  }

  // ─── 5. Image Cache (48h) ───────────────────────────────────────────────────

  getImage(originalUrl: string): string | null {
    return this.getWithExpiry(this.imageCache, originalUrl);
  }

  setImage(originalUrl: string, localPath: string): void {
    this.setWithLimit(this.imageCache, originalUrl, localPath, this.TTL_IMAGE);
  }

  // ─── Clear All ──────────────────────────────────────────────────────────────

  clear(): void {
    this.frameCache.clear();
    this.geminiCache.clear();
    this.marketplaceCache.clear();
    this.metadataCache.clear();
    this.imageCache.clear();
  }
}
