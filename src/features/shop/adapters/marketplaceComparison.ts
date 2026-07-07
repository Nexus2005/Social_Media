export interface MarketplaceOffer {
  marketplace: "ebay" | "amazon" | "flipkart" | "meesho" | "shopify";
  price: number;
  currency: string;
  url: string;
  sellerName?: string;
  availability: boolean;
}

export interface MarketplaceComparisonAdapter {
  getAlternativeOffers(productId: string): Promise<MarketplaceOffer[]>;
}
