import { Product } from "../types";

export interface SearchAdapter {
  search(query: string, options?: any): Promise<Product[]>;
}
