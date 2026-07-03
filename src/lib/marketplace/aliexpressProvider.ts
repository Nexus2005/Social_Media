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

  async search(query: string, limit = 8): Promise<MarketplaceProduct[]> {
    const appKey = process.env.ALIEXPRESS_APP_KEY;
    const appSecret = process.env.ALIEXPRESS_APP_SECRET;

    if (!appKey || !appSecret) {
      console.warn("[AliExpressProvider] Credentials missing. Returning mock AliExpress results.");
      return this.getMockResults(query, limit);
    }

    const now = new Date();
    const formattedTimestamp = now.toISOString()
      .replace(/T/, " ")
      .replace(/\..+/, ""); // "YYYY-MM-DD HH:mm:ss"

    const params: Record<string, string> = {
      app_key: appKey,
      timestamp: formattedTimestamp,
      sign_method: "md5",
      v: "2.0",
      format: "json",
      method: "aliexpress.affiliate.product.query",
      keywords: query,
      page_size: String(limit),
    };

    // Generate signature
    params.sign = this.generateSign(params, appSecret);

    // AliExpress Open Platform — REST business endpoint (POST)
    const GATEWAY = "https://api-sg.aliexpress.com/rest";

    try {
      console.log(`[AliExpressProvider] POST to ${GATEWAY} — query: "${query}"`);

      // AliExpress REST business API expects POST with form-urlencoded body
      const body = new URLSearchParams(params).toString();

      const response = await fetch(GATEWAY, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      });

      console.log(`[AliExpressProvider] Response status: ${response.status}`);

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json") && !contentType.includes("text/javascript")) {
        const bodyText = await response.text();
        console.warn(`[AliExpressProvider] Unexpected content-type "${contentType}". Snippet: ${bodyText.slice(0, 300)}`);
        return this.getMockResults(query, limit);
      }

      const data = await response.json();

      if (data.error_response) {
        console.warn(`[AliExpressProvider] API error:`, JSON.stringify(data.error_response));
        return this.getMockResults(query, limit);
      }

      const result = data.aliexpress_affiliate_product_query_response?.resp_result?.result;
      const productsList = result?.products?.product || [];

      console.log(`[AliExpressProvider] Live products fetched: ${productsList.length}`);

      if (productsList.length > 0) {
        return productsList.map((prod: any) => {
          const rawPrice = prod.target_sale_price || prod.sale_price || "0";
          const numericPrice = parseFloat(rawPrice.replace(/[^0-9.]/g, "")) || 0;
          const currency = prod.target_sale_price_currency || "USD";
          const symbol = currency === "INR" ? "₹" : "$";
          const formattedPrice = `${symbol}${numericPrice.toLocaleString()}`;

          return {
            title: prod.product_title || "",
            price: formattedPrice,
            numericPrice,
            currency,
            merchant: "AliExpress",
            thumbnail: prod.product_main_image_url || null,
            link: prod.promotion_link || prod.product_detail_url || "https://www.aliexpress.com",
            rating: prod.evaluate_rate ? parseFloat(prod.evaluate_rate) / 20 : 4.4,
            reviewsCount: prod.volume || 45,
            shippingInfo: "Free Shipping",
          };
        });
      }

      return this.getMockResults(query, limit);
    } catch (err) {
      console.error(`[AliExpressProvider] Request failed:`, err);
      return this.getMockResults(query, limit);
    }
  }

  private getMockResults(query: string, limit: number): MarketplaceProduct[] {
    return [
      {
        title: `Direct Factory ${query} - High Quality Smart Edition`,
        price: "$12.99",
        numericPrice: 12.99,
        currency: "USD",
        merchant: "AliExpress",
        thumbnail: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=60",
        link: "https://www.aliexpress.com",
        rating: 4.6,
        reviewsCount: 1450,
        shippingInfo: "Free Shipping",
      },
      {
        title: `Universal Multi-purpose ${query} (Eco-friendly Material)`,
        price: "$8.45",
        numericPrice: 8.45,
        currency: "USD",
        merchant: "AliExpress",
        thumbnail: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=500&auto=format&fit=crop&q=60",
        link: "https://www.aliexpress.com",
        rating: 4.4,
        reviewsCount: 320,
        shippingInfo: "Free Shipping",
      },
      {
        title: `Trendy ${query} (Comfort-Fit Collection)`,
        price: "$15.90",
        numericPrice: 15.90,
        currency: "USD",
        merchant: "AliExpress",
        thumbnail: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=500&auto=format&fit=crop&q=60",
        link: "https://www.aliexpress.com",
        rating: 4.7,
        reviewsCount: 890,
        shippingInfo: "+ $1.50 Shipping",
      }
    ].slice(0, limit);
  }
}
