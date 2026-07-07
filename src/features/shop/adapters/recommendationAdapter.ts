import { Product } from "../types";

export interface RecommendationAdapter {
  getRecommendations(userId?: string, limit?: number): Promise<Product[]>;
}
