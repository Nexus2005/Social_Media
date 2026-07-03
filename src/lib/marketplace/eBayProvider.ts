import { MarketplaceProduct, MarketplaceProvider } from "./types";

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

    // Cache the token with 5-minute safety margin (eBay tokens typically last 2 hours)
    const expiresIn = data.expires_in ? parseInt(data.expires_in) * 1000 : 7200 * 1000;
    cachedOAuthToken = {
      token: data.access_token,
      expiresAt: Date.now() + expiresIn - 300000,
    };

    return cachedOAuthToken.token;
  }

  async search(query: string, limit = 8): Promise<MarketplaceProduct[]> {
    try {
      const { baseUrl } = this.getCredentials();
      const token = await this.getAccessToken();

      const searchUrl = `${baseUrl}/buy/browse/v1/item_summary/search?q=${encodeURIComponent(query)}&limit=${limit}`;
      const response = await fetch(searchUrl, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "X-EBAY-C-MARKETPLACE-ID": "EBAY-US",
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`eBay Browse API returned status ${response.status}`);
      }

      const data = await response.json();
      const items = data.itemSummaries || [];
      console.log(`[EBayProvider] Successfully fetched ${items.length} live products.`);

      return items.map((item: any) => {
        const priceVal = parseFloat(item.price?.value || "0");
        const currency = item.price?.currency || "USD";
        const symbol = currency === "INR" ? "₹" : "$";
        const formattedPrice = `${symbol}${priceVal.toLocaleString()}`;

        let shippingInfo = "Shipping details unavailable";
        if (item.shippingOptions && item.shippingOptions.length > 0) {
          const cost = parseFloat(item.shippingOptions[0].shippingCost?.value || "0");
          shippingInfo = cost === 0 ? "Free Shipping" : `+ ${symbol}${cost} Shipping`;
        }

        return {
          title: item.title,
          price: formattedPrice,
          numericPrice: priceVal,
          currency,
          merchant: "eBay",
          thumbnail: item.image?.imageUrl || null,
          link: item.itemWebUrl || `https://www.ebay.com/itm/${item.itemId}`,
          rating: item.seller?.feedbackPercentage ? parseFloat(item.seller.feedbackPercentage) / 20 : 4.2, // scale 100% to 5.0 scale
          reviewsCount: item.seller?.feedbackScore ? parseInt(item.seller.feedbackScore) : 120,
          shippingInfo,
        };
      });
    } catch (error) {
      console.warn("eBay search failed or is unconfigured. Returning mock eBay results. Error:", error);
      return this.getMockResults(query, limit);
    }
  }

  private getMockResults(query: string, limit: number): MarketplaceProduct[] {
    const cleanQuery = query.toLowerCase();
    const baseMockData = [
      {
        title: `Authentic Retro Style ${query} - Collector Edition`,
        price: "$45.99",
        numericPrice: 45.99,
        currency: "USD",
        merchant: "eBay",
        thumbnail: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=60",
        link: "https://www.ebay.com",
        rating: 4.8,
        reviewsCount: 340,
        shippingInfo: "Free Shipping",
      },
      {
        title: `Premium Wearable ${query} (Used, Excellent Condition)`,
        price: "$29.50",
        numericPrice: 29.50,
        currency: "USD",
        merchant: "eBay",
        thumbnail: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500&auto=format&fit=crop&q=60",
        link: "https://www.ebay.com",
        rating: 4.5,
        reviewsCount: 89,
        shippingInfo: "+ $4.99 Shipping",
      },
      {
        title: `Imported Custom ${query} - Bulk Stock Discount`,
        price: "$19.99",
        numericPrice: 19.99,
        currency: "USD",
        merchant: "eBay",
        thumbnail: "https://images.unsplash.com/photo-1495105787522-5334e3ffa0ef?w=500&auto=format&fit=crop&q=60",
        link: "https://www.ebay.com",
        rating: 4.2,
        reviewsCount: 15,
        shippingInfo: "Free Shipping",
      }
    ];

    return baseMockData.slice(0, limit);
  }
}
