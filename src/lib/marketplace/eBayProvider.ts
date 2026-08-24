/**
 * Cartly v3 — eBay Provider
 *
 * Real marketplace provider. No mock data. If API fails, returns [].
 *
 * Changes from v2:
 * - Deleted getMockResults() entirely
 * - Search returns 20 results with all available fields
 * - Extracts seller info, shipping, condition, categories, gallery images
 * - NEW getItemDetails(itemId) for lazy-loaded full product info
 * - Returns empty array on any failure (never mocks)
 */

import { MarketplaceProduct, MarketplaceProvider, ProductVariantData } from "./types";

interface CachedToken {
  token: string;
  expiresAt: number;
}

let cachedOAuthToken: CachedToken | null = null;

export class EBayProvider implements MarketplaceProvider {
  name = "eBay";

  private getCredentials() {
    const isProd = !!process.env.EBAY_PROD_APP_ID;
    return {
      appId: isProd ? process.env.EBAY_PROD_APP_ID : process.env.EBAY_SANDBOX_APP_ID,
      certId: isProd ? process.env.EBAY_PROD_CERT_ID : process.env.EBAY_SANDBOX_CERT_ID,
      baseUrl: isProd ? "https://api.ebay.com" : "https://api.sandbox.ebay.com",
      isProd,
    };
  }

  private async getAccessToken(): Promise<string> {
    const { appId, certId, baseUrl } = this.getCredentials();

    if (!appId || !certId) {
      throw new Error("Missing eBay credentials in environment");
    }

    if (cachedOAuthToken && cachedOAuthToken.expiresAt > Date.now()) {
      return cachedOAuthToken.token;
    }

    const authHeader = Buffer.from(`${appId}:${certId}`).toString("base64");
    const response = await fetch(`${baseUrl}/identity/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${authHeader}`,
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        scope: "https://api.ebay.com/oauth/api_scope",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`eBay OAuth token request failed: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    if (!data.access_token) {
      throw new Error("No access token returned from eBay OAuth endpoint");
    }

    // Cache with 5-minute safety margin (eBay tokens typically last 2 hours)
    const expiresIn = data.expires_in ? parseInt(data.expires_in) * 1000 : 7200 * 1000;
    cachedOAuthToken = {
      token: data.access_token,
      expiresAt: Date.now() + expiresIn - 300000,
    };

    return cachedOAuthToken.token;
  }

  /**
   * Search eBay Browse API for products. Returns up to `limit` results
   * with all available fields from the search response.
   *
   * NO MOCKS. Returns [] on failure.
   */
  async search(query: string, limit = 20): Promise<MarketplaceProduct[]> {
    try {
      const { baseUrl } = this.getCredentials();
      const token = await this.getAccessToken();

      const searchUrl = `${baseUrl}/buy/browse/v1/item_summary/search?q=${encodeURIComponent(query)}&limit=${limit}`;
      const response = await fetch(searchUrl, {
        method: "GET",
        signal: AbortSignal.timeout(12000),
        headers: {
          "Authorization": `Bearer ${token}`,
          "X-EBAY-C-MARKETPLACE-ID": "EBAY-US",
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.warn(`[EBayProvider] Browse API returned status ${response.status}`);
        return []; // No mocks — return empty
      }

      const data = await response.json();
      const items = data.itemSummaries || [];
      console.log(`[EBayProvider] Fetched ${items.length} live products for "${query}"`);

      return items.map((item: any) => this.mapItemToProduct(item));
    } catch (error) {
      console.warn("[EBayProvider] Search failed:", error);
      return []; // No mocks — return empty
    }
  }

  /**
   * Lazy-load full product details. Called only when user opens a product page.
   * Fetches complete description, specifications, all gallery images, variants.
   */
  async getItemDetails(itemId: string): Promise<MarketplaceProduct | null> {
    try {
      const { baseUrl } = this.getCredentials();
      const token = await this.getAccessToken();

      const response = await fetch(
        `${baseUrl}/buy/browse/v1/item/${encodeURIComponent(itemId)}`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "X-EBAY-C-MARKETPLACE-ID": "EBAY-US",
          },
        },
      );

      if (!response.ok) {
        console.warn(`[EBayProvider] Item detail request failed: ${response.status}`);
        return null;
      }

      const item = await response.json();
      return this.mapDetailToProduct(item);
    } catch (error) {
      console.warn("[EBayProvider] Item detail fetch failed:", error);
      return null;
    }
  }

  // ─── Mappers ──────────────────────────────────────────────────────────────

  private mapItemToProduct(item: any): MarketplaceProduct {
    const priceVal = parseFloat(item.price?.value || "0");
    const currency = item.price?.currency || "USD";
    const symbol = currency === "INR" ? "₹" : "$";

    // Shipping info
    let shippingCost: string | undefined;
    let shippingInfo: string | undefined;
    let estimatedDelivery: string | undefined;
    if (item.shippingOptions?.length > 0) {
      const shipOpt = item.shippingOptions[0];
      const cost = parseFloat(shipOpt.shippingCost?.value || "0");
      shippingCost = cost === 0 ? "Free" : `${symbol}${cost.toFixed(2)}`;
      shippingInfo = cost === 0 ? "Free Shipping" : `+ ${symbol}${cost.toFixed(2)} Shipping`;
      estimatedDelivery = shipOpt.maxEstimatedDeliveryDate || undefined;
    }

    // Seller info
    const sellerName = item.seller?.username || undefined;
    const sellerRating = item.seller?.feedbackPercentage
      ? parseFloat(item.seller.feedbackPercentage) / 20 // scale 100% to 5.0
      : undefined;
    const sellerReviews = item.seller?.feedbackScore
      ? parseInt(item.seller.feedbackScore)
      : undefined;

    // Categories
    const categoryPath = item.categories?.map((c: any) => c.categoryName).join(" > ") || undefined;

    // Gallery images (URLs only)
    const galleryImageUrls: string[] = [];
    if (item.image?.imageUrl) galleryImageUrls.push(item.image.imageUrl);
    if (item.additionalImages?.length > 0) {
      for (const img of item.additionalImages) {
        if (img.imageUrl) galleryImageUrls.push(img.imageUrl);
      }
    }

    // Condition
    const condition = item.condition || undefined;

    // Original price / discount
    let originalPrice: string | undefined;
    let discountPercent: number | undefined;
    if (item.marketingPrice?.originalPrice) {
      const origVal = parseFloat(item.marketingPrice.originalPrice.value || "0");
      if (origVal > priceVal) {
        originalPrice = `${symbol}${origVal.toFixed(2)}`;
        discountPercent = Math.round(((origVal - priceVal) / origVal) * 100);
      }
    }

    return {
      title: item.title || "",
      price: `${symbol}${priceVal.toFixed(2)}`,
      numericPrice: priceVal,
      currency,
      merchant: "eBay",
      thumbnail: item.image?.imageUrl || null,
      link: item.itemWebUrl || `https://www.ebay.com/itm/${item.itemId}`,
      itemId: item.itemId || undefined,

      // Seller
      sellerName,
      sellerRating,
      sellerReviews,

      // Shipping
      shippingInfo,
      shippingCost,
      estimatedDelivery,

      // Category & condition
      categoryPath,
      condition,

      // Gallery
      galleryImageUrls: galleryImageUrls.length > 0 ? galleryImageUrls : undefined,

      // Pricing
      originalPrice,
      discountPercent,
    };
  }

  private mapDetailToProduct(item: any): MarketplaceProduct {
    // Start with search-level data
    const base = this.mapItemToProduct(item);

    // Add detail-level enrichments
    return {
      ...base,

      // Description
      description: item.description || undefined,

      // Specifications
      specifications: this.extractSpecs(item),

      // Return policy
      returnPolicy: item.returnTerms?.returnsAccepted
        ? `${item.returnTerms.returnPeriod?.value || "30"} Day Returns`
        : "No Returns",

      // Warranty
      warranty: item.warranty?.warrantyDescription || undefined,

      // Brand (from aspects)
      brand: this.extractAspect(item, "Brand") || base.brand,

      // Model number
      modelNumber: this.extractAspect(item, "Model") || this.extractAspect(item, "MPN") || undefined,

      // UPC
      upc: this.extractAspect(item, "UPC") || undefined,

      // Variants from localizedAspects
      variants: this.extractVariants(item),

      // Extended gallery (detail endpoint returns more images)
      galleryImageUrls: this.extractAllImages(item),
    };
  }

  private extractSpecs(item: any): Record<string, string> | undefined {
    if (!item.localizedAspects?.length) return undefined;
    const specs: Record<string, string> = {};
    for (const aspect of item.localizedAspects) {
      if (aspect.name && aspect.value) {
        specs[aspect.name] = aspect.value;
      }
    }
    return Object.keys(specs).length > 0 ? specs : undefined;
  }

  private extractAspect(item: any, name: string): string | undefined {
    if (!item.localizedAspects?.length) return undefined;
    const aspect = item.localizedAspects.find(
      (a: any) => a.name?.toLowerCase() === name.toLowerCase(),
    );
    return aspect?.value || undefined;
  }

  private extractVariants(item: any): ProductVariantData[] | undefined {
    if (!item.localizedAspects?.length) return undefined;
    const variantTypes = ["Color", "Size", "Style", "Material", "Pattern"];
    const variants: ProductVariantData[] = [];

    for (const aspect of item.localizedAspects) {
      if (variantTypes.some((vt) => aspect.name?.toLowerCase() === vt.toLowerCase())) {
        variants.push({
          type: aspect.name,
          value: aspect.value,
        });
      }
    }

    return variants.length > 0 ? variants : undefined;
  }

  private extractAllImages(item: any): string[] {
    const urls: string[] = [];
    if (item.image?.imageUrl) urls.push(item.image.imageUrl);
    if (item.additionalImages?.length > 0) {
      for (const img of item.additionalImages) {
        if (img.imageUrl) urls.push(img.imageUrl);
      }
    }
    return urls;
  }
}
