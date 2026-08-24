import crypto from "crypto";
import { MarketplaceProduct, MarketplaceProvider } from "./types";

export class AliExpressProvider implements MarketplaceProvider {
  name = "AliExpress";

  private generateSign(params: Record<string, string>, appSecret: string): string {
    const sortedKeys = Object.keys(params).sort();
    let concatenated = "";
    for (const key of sortedKeys) {
      concatenated += key + params[key];
    }
    const rawString = appSecret + concatenated + appSecret;
    return crypto.createHash("md5").update(rawString, "utf8").digest("hex").toUpperCase();
  }

  /**
   * Search AliExpress Dropshipping (ds) recommend feed API.
   *
   * Audited against AliExpress-dropship permission group.
   */
  async search(query: string, limit = 20): Promise<MarketplaceProduct[]> {
    const appKey = process.env.ALIEXPRESS_APP_KEY;
    const appSecret = process.env.ALIEXPRESS_APP_SECRET;
    const accessToken = process.env.ALIEXPRESS_ACCESS_TOKEN;

    const method = "aliexpress.ds.recommend.feed.get";
    const GATEWAY = "https://api-sg.aliexpress.com/rest";

    // Setup active filters (for logging and request parameters)
    const feedName = "Y501"; // Standard Dropshipping bestseller feed
    const shipToCountry = undefined; // Optional filters
    const targetLanguage = "EN";
    const targetCurrency = "USD";

    const params: Record<string, string> = {
      app_key: appKey || "",
      timestamp: String(Date.now()),
      sign_method: "md5",
      v: "2.0",
      format: "json",
      method,
      feed_name: feedName,
      keywords: query,
      page_size: String(limit),
      page_no: "1",
    };

    if (accessToken) {
      params.access_token = accessToken;
    }

    if (targetLanguage) params.target_language = targetLanguage;
    if (targetCurrency) params.target_currency = targetCurrency;

    // Diagnose request details (excluding secrets)
    const loggedParams = { ...params };
    if (loggedParams.access_token) loggedParams.access_token = "***";
    const paginationActive = true; // page_size and page_no are passed
    const filtersActive = !!(targetLanguage || targetCurrency || shipToCountry);

    console.log(`[AliExpressProvider] Initiating search. Method: "${method}", Query: "${query}"`);
    console.log(`[AliExpressProvider] Request Parameters:`, JSON.stringify(loggedParams, null, 2));
    console.log(`[AliExpressProvider] Pagination active: ${paginationActive} (page_no: 1, page_size: ${limit})`);
    console.log(`[AliExpressProvider] Active filters: Language=${targetLanguage}, Currency=${targetCurrency}, ShipTo=${shipToCountry}`);

    // Check integration prerequisites
    if (!appKey || !appSecret) {
      const errorMsg = "Credentials missing (ALIEXPRESS_APP_KEY/ALIEXPRESS_APP_SECRET).";
      this.logFailure({
        reason: errorMsg,
        method,
        query,
        loggedParams,
        gateway: GATEWAY,
      });
      return [];
    }

    if (!accessToken) {
      const errorMsg = "OAuth access_token missing in environment variables (ALIEXPRESS_ACCESS_TOKEN). Dropship API requires user session authorization.";
      this.logFailure({
        reason: errorMsg,
        method,
        query,
        loggedParams,
        gateway: GATEWAY,
      });
      return [];
    }

    params.sign = this.generateSign(params, appSecret);

    try {
      // Sort keys to construct strict query parameters
      const queryParts = Object.keys(params).sort().map(key => {
        return `${key}=${encodeURIComponent(params[key])}`;
      });
      const queryString = queryParts.join("&");
      const url = `${GATEWAY}?${queryString}`;

      const response = await fetch(url, {
        method: "POST",
        signal: AbortSignal.timeout(12000),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((val, key) => {
        responseHeaders[key] = val;
      });

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json") && !contentType.includes("text/javascript")) {
        this.logFailure({
          reason: `Unexpected response content-type: "${contentType}"`,
          method,
          query,
          loggedParams,
          gateway: GATEWAY,
          status: response.status,
          headers: responseHeaders,
          body: await response.text(),
        });
        return [];
      }

      const data = await response.json();

      // Check for error responses
      const errorResponse = data.error_response || (data.code && data.code !== "200" ? data : null);
      if (errorResponse) {
        this.logFailure({
          reason: "API returned error code/response",
          method,
          query,
          loggedParams,
          gateway: GATEWAY,
          status: response.status,
          headers: responseHeaders,
          body: JSON.stringify(data),
          errorCode: errorResponse.code || errorResponse.sub_code || "UNKNOWN_ERROR",
        });
        return [];
      }

      const responseRoot = data.aliexpress_ds_recommend_feed_get_response;
      if (!responseRoot) {
        this.logFailure({
          reason: "Response missing expected aliexpress_ds_recommend_feed_get_response envelope",
          method,
          query,
          loggedParams,
          gateway: GATEWAY,
          status: response.status,
          headers: responseHeaders,
          body: JSON.stringify(data),
        });
        return [];
      }

      const productsList = responseRoot.result?.products?.product_dto || [];

      if (productsList.length === 0) {
        console.log(`[AliExpressProvider] Empty Search Results: API responded successfully (200 OK) but no products matched the query "${query}".`);
      } else {
        console.log(`[AliExpressProvider] Mapped ${productsList.length} products successfully for query "${query}".`);
      }

      return productsList.map((prod: any) => this.mapProductToResult(prod));
    } catch (err: any) {
      this.logFailure({
        reason: `Fetch operation threw exception: ${err.message}`,
        method,
        query,
        loggedParams,
        gateway: GATEWAY,
      });
      return [];
    }
  }

  /**
   * Fetch complete product details using aliexpress.ds.product.get (dropshipping details API).
   */
  async getItemDetails(productId: string): Promise<MarketplaceProduct | null> {
    const appKey = process.env.ALIEXPRESS_APP_KEY;
    const appSecret = process.env.ALIEXPRESS_APP_SECRET;
    const accessToken = process.env.ALIEXPRESS_ACCESS_TOKEN;

    const method = "aliexpress.ds.product.get";
    const GATEWAY = "https://api-sg.aliexpress.com/rest";

    const params: Record<string, string> = {
      app_key: appKey || "",
      timestamp: String(Date.now()),
      sign_method: "md5",
      v: "2.0",
      format: "json",
      method,
      product_id: productId,
    };

    if (accessToken) {
      params.access_token = accessToken;
    }

    const loggedParams = { ...params };
    if (loggedParams.access_token) loggedParams.access_token = "***";

    console.log(`[AliExpressProvider] Initiating detail fetch. Method: "${method}", ProductId: "${productId}"`);

    if (!appKey || !appSecret || !accessToken) {
      console.warn("[AliExpressProvider] Prerequisites missing for product detail fetch. Skipping.");
      return null;
    }

    params.sign = this.generateSign(params, appSecret);

    try {
      const queryParts = Object.keys(params).sort().map(key => {
        return `${key}=${encodeURIComponent(params[key])}`;
      });
      const queryString = queryParts.join("&");
      const url = `${GATEWAY}?${queryString}`;

      const response = await fetch(url, {
        method: "POST",
        signal: AbortSignal.timeout(12000),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      const data = await response.json();
      const errorResponse = data.error_response || (data.code && data.code !== "200" ? data : null);
      if (errorResponse) {
        console.warn(`[AliExpressProvider] Detail API Error:`, JSON.stringify(errorResponse));
        return null;
      }

      const result = data.aliexpress_ds_product_get_response?.result;
      if (!result) return null;

      return this.mapDetailToResult(result);
    } catch (err: any) {
      console.error(`[AliExpressProvider] Detail fetch failed: ${err.message}`);
      return null;
    }
  }

  /**
   * Centralized logs for API failure diagnostics.
   */
  private logFailure(info: {
    reason: string;
    method: string;
    query: string;
    loggedParams: Record<string, string>;
    gateway: string;
    status?: number;
    headers?: Record<string, string>;
    body?: string;
    errorCode?: string;
  }) {
    console.error(`════════════════════════════════════════════════════════════`);
    console.error(`  [AliExpressProvider] API INTEGRATION FAILURE DETECTED`);
    console.error(`  Reason: ${info.reason}`);
    console.error(`  Endpoint Name: ${info.gateway}`);
    console.error(`  API Method: ${info.method}`);
    console.error(`  Query Sent: "${info.query}"`);
    console.error(`  Error Code: ${info.errorCode || "N/A"}`);
    console.error(`────────────────────────────────────────────────────────────`);
    console.error(`  Request Parameters (Masked):`, JSON.stringify(info.loggedParams, null, 2));
    if (info.status !== undefined) {
      console.error(`  Response Status: ${info.status}`);
    }
    if (info.headers) {
      console.error(`  Response Headers:`, JSON.stringify(info.headers, null, 2));
    }
    if (info.body) {
      console.error(`  Raw JSON Response Body:`);
      console.error(info.body);
    }
    console.error(`════════════════════════════════════════════════════════════`);
  }

  // ─── Mappers ──────────────────────────────────────────────────────────────

  private mapProductToResult(prod: any): MarketplaceProduct {
    const rawPrice = prod.target_sale_price || prod.sale_price || "0";
    const numericPrice = parseFloat(rawPrice.replace(/[^0-9.]/g, "")) || 0;
    const currency = prod.target_sale_price_currency || prod.currency_code || "USD";
    const symbol = currency === "INR" ? "₹" : "$";

    // Original price and discount
    let originalPrice: string | undefined;
    let discountPercent: number | undefined;
    if (prod.target_original_price || prod.original_price) {
      const origRaw = prod.target_original_price || prod.original_price;
      const origVal = parseFloat(origRaw.replace(/[^0-9.]/g, "")) || 0;
      if (origVal > numericPrice) {
        originalPrice = `${symbol}${origVal.toFixed(2)}`;
        discountPercent = Math.round(((origVal - numericPrice) / origVal) * 100);
      }
    }

    // Gallery images
    const galleryImageUrls: string[] = [];
    if (prod.product_main_image_url) galleryImageUrls.push(prod.product_main_image_url);
    if (prod.product_small_image_urls?.string) {
      const urls = Array.isArray(prod.product_small_image_urls.string)
        ? prod.product_small_image_urls.string
        : [prod.product_small_image_urls.string];
      galleryImageUrls.push(...urls);
    }

    // Rating
    const rating = prod.evaluate_rate || prod.evaluate_score || prod.avg_evaluation_rating
      ? parseFloat(prod.evaluate_rate || prod.evaluate_score || prod.avg_evaluation_rating) / (prod.evaluate_rate ? 20 : 1) // scale 100% to 5.0 if evaluate_rate
      : undefined;

    // Review count / sales volume proxy
    const reviewCount = prod.lastest_volume || prod.volume
      ? parseInt(prod.lastest_volume || prod.volume)
      : undefined;

    // Category
    const categoryPath = [
      prod.first_level_category_name,
      prod.second_level_category_name,
    ].filter(Boolean).join(" > ") || undefined;

    return {
      title: prod.product_title || "",
      price: `${symbol}${numericPrice.toFixed(2)}`,
      numericPrice,
      currency,
      merchant: "AliExpress",
      thumbnail: prod.product_main_image_url || null,
      link: prod.promotion_link || prod.product_detail_url || "https://www.aliexpress.com",
      itemId: prod.product_id?.toString() || undefined,
      rating,
      reviewCount,
      sellerName: prod.shop_url ? "AliExpress Seller" : undefined,
      shippingInfo: "Free Shipping",
      shippingCost: "Free",
      categoryPath,
      galleryImageUrls: galleryImageUrls.length > 0 ? galleryImageUrls : undefined,
      originalPrice,
      discountPercent,
    };
  }

  private mapDetailToResult(prod: any): MarketplaceProduct {
    const base = this.mapProductToResult(prod);
    return {
      ...base,
      description: prod.product_detail_url || undefined,
    };
  }
}

