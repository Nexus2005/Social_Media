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

    // Try endpoints: 
    // 1. AliExpress Singapore Gateway: https://api-sg.aliexpress.com/rest
    // 2. Taobao Global Router: https://api.taobao.com/router/rest
    const endpoints = [
      "https://api-sg.aliexpress.com/rest",
      "https://api.taobao.com/router/rest"
    ];

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

    for (const gateway of endpoints) {
      try {
        console.log(`[AliExpressProvider] Fetching from AliExpress gateway: ${gateway} for query "${query}"`);
        const requestUrl = new URL(gateway);
        for (const [key, val] of Object.entries(params)) {
          requestUrl.searchParams.append(key, val);
        }

        const response = await fetch(requestUrl.toString(), {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });

        console.log(`[AliExpressProvider] Response status: ${response.status} from ${gateway}`);

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          const bodyText = await response.text();
          console.warn(`[AliExpressProvider] Expected JSON from ${gateway}, but got content-type "${contentType}". Response snippet: ${bodyText.slice(0, 300)}`);
          continue; // Try next gateway
        }

        const data = await response.json();
        
        // Log errors returned inside Alibaba Open Platform JSON response structure
        if (data.error_response) {
          console.warn(`[AliExpressProvider] API error response from ${gateway}:`, JSON.stringify(data.error_response));
          continue; // Try next gateway
        }

        const result = data.aliexpress_affiliate_product_query_response?.resp_result?.result;
        const productsList = result?.products?.product || [];

        console.log(`[AliExpressProvider] Successfully fetched ${productsList.length} live products from ${gateway}.`);

        if (productsList.length > 0) {
          return productsList.map((prod: any) => {
            const rawPrice = prod.target_sale_price || prod.sale_price || "0";
            const numericPrice = parseFloat(rawPrice.replace(/[^0-9.]/g, "")) || 0;
            const currency = prod.target_sale_price_currency || "USD";
            const symbol = currency === "INR" ? "₹" : "$";
            const formattedPrice = `${symbol}${numericPrice.toLocaleString()}`;

            return {
              title: prod.product_title || prod.product_main_image_url,
              price: formattedPrice,
              numericPrice,
              currency,
              merchant: "AliExpress",
              thumbnail: prod.product_main_image_url || null,
              link: prod.promotion_link || prod.product_detail_url || "https://www.aliexpress.com",
              rating: prod.evaluate_rate ? parseFloat(prod.evaluate_rate) / 20 : 4.4,
              reviewsCount: prod.volume || 45,
              shippingInfo: prod.first_level_category_name?.toLowerCase().includes("free") ? "Free Shipping" : "Free Shipping (Promo)",
            };
          });
        }
      } catch (err) {
        console.error(`[AliExpressProvider] Request failed for gateway ${gateway}:`, err);
      }
    }

    console.warn(`[AliExpressProvider] All live AliExpress endpoints failed/empty. Falling back to local mocks.`);
    return this.getMockResults(query, limit);
  }

  private getMockResults(query: string, limit: number): MarketplaceProduct[] {
    const baseMockData = [
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
        link: "https://www.amazon.in",
        rating: 4.4,
        reviewsCount: 320,
        shippingInfo: "Free Shipping",
      },
      {
        title: `Trendy Streetwear ${query} (Comfort-Fit Collection)`,
        price: "$15.90",
        numericPrice: 15.90,
        currency: "USD",
        merchant: "AliExpress",
        thumbnail: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=500&auto=format&fit=crop&q=60",
        link: "https://www.zara.com",
        rating: 4.7,
        reviewsCount: 890,
        shippingInfo: "+ $1.50 Shipping",
      }
    ];

    return baseMockData.slice(0, limit);
  }
}
