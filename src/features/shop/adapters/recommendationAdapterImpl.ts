import { Product } from "../types";
import { RecommendationAdapter } from "./recommendationAdapter";
import { CartlyAdapter } from "./cartlyAdapter";

export class CartlyRecommendationAdapter implements RecommendationAdapter {
  private cartlyAdapter: CartlyAdapter;

  constructor(cartlyAdapter: CartlyAdapter) {
    this.cartlyAdapter = cartlyAdapter;
  }

  async getRecommendations(userId?: string, limit = 6): Promise<Product[]> {
    try {
      // In a real application, this would query a dedicated ML model,
      // collaborative filtering database, or user interest profile.
      // We fall back to fetching featured products from the commerce adapter.
      const products = await this.cartlyAdapter.getProducts({ limit });
      
      // Shuffle or mark as AI recommendations for the UI representation
      return products.map(prod => ({
        ...prod,
        rating: 4.9, // highlight high-rated AI picks
      }));
    } catch (e) {
      console.warn("RecommendationAdapter failed to fetch:", e);
      return [];
    }
  }
}
