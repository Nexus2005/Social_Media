/**
 * Cartly v3 — Marketplace Types
 *
 * Rich data model supporting permanent identity fields, cached volatile fields,
 * gallery image URLs (not downloads), and product variants.
 */

// ─── Product Variant ──────────────────────────────────────────────────────────

export interface ProductVariantData {
  type: string;       // "color", "size", "storage", "capacity", "material"
  value: string;      // "Black", "XL", "256GB"
  price?: string;
  sku?: string;
  imageUrl?: string;  // URL only — not downloaded
  availability?: string;
}

// ─── Marketplace Product ──────────────────────────────────────────────────────

export interface MarketplaceProduct {
  // Core (always present from search)
  title: string;
  price: string;
  numericPrice: number;
  currency: string;
  merchant: string;        // "eBay" | "AliExpress"
  thumbnail: string | null;
  link: string;

  // ── Permanent Identity (store in DB) ────────────────────────────────────────
  brand?: string;
  manufacturer?: string;
  modelNumber?: string;
  sku?: string;
  upc?: string;
  description?: string;
  features?: string[];
  specifications?: Record<string, string>;
  highlights?: string[];
  categoryPath?: string;
  condition?: string;
  returnPolicy?: string;
  warranty?: string;
  galleryImageUrls?: string[];  // URLs only — NOT downloaded until user opens page

  // ── Volatile (cache 6h — refresh on demand via /api/products/refresh) ──────
  rating?: number;
  reviewCount?: number;
  sellerName?: string;
  sellerRating?: number;
  sellerReviews?: number;
  shippingInfo?: string;
  shippingCost?: string;
  estimatedDelivery?: string;
  stockAvailability?: string;
  originalPrice?: string;
  discountPercent?: number;

  // ── Variants ────────────────────────────────────────────────────────────────
  variants?: ProductVariantData[];

  // ── Internal metadata ──────────────────────────────────────────────────────
  itemId?: string;        // marketplace-specific ID for lazy detail loading
}

// ─── Marketplace Provider Interface ───────────────────────────────────────────

export interface MarketplaceProvider {
  name: string;

  /**
   * Search the marketplace. Returns up to `limit` results with
   * whatever fields are available from the search endpoint.
   */
  search(query: string, limit?: number): Promise<MarketplaceProduct[]>;

  /**
   * Lazy-load full product details. Called only when user opens a product page.
   * Returns complete description, specifications, gallery images, variants.
   */
  getItemDetails?(itemId: string): Promise<MarketplaceProduct | null>;
}

// ─── Verification Types ─────────────────────────────────────────────────────

export interface VerificationBreakdown {
  titleSimilarity: number;
  brandMatch: number;
  colorMatch: number;
  categoryMatch: number;
  visualSimilarity: number;
  priceSanity: number;
  ocrMatch: number;
}

export type VerificationTier = "exact" | "strong" | "approximate" | "weak";

export interface VerifiedMatch {
  product: MarketplaceProduct;
  marketplaceConfidence: number;  // 0.0 - 1.0 (separate from detection confidence)
  breakdown: VerificationBreakdown;
  tier: VerificationTier;
}
