export interface MarketplaceProduct {
  title: string;
  price: string;
  numericPrice: number;
  currency: string;
  merchant: string; // "eBay" or "AliExpress"
  thumbnail: string | null;
  link: string;
  rating?: number;
  reviewsCount?: number;
  shippingInfo?: string;
}

export interface MarketplaceProvider {
  name: string;
  search(query: string, limit?: number): Promise<MarketplaceProduct[]>;
}
