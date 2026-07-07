import { Product, Cart, Collection, Category, Order } from "../types";

export interface CommerceAdapter {
  getProducts(params?: {
    q?: string;
    limit?: number;
    offset?: number;
    collection_id?: string;
    category_id?: string;
  }): Promise<Product[]>;
  getProduct(idOrSlug: string): Promise<Product>;
  searchProducts(query: string, options?: any): Promise<Product[]>;
  
  getCollections(): Promise<Collection[]>;
  getCollection(idOrHandle: string): Promise<Collection>;
  
  getCategories(): Promise<Category[]>;
  getCategory(idOrHandle: string): Promise<Category>;
  
  getCart(cartId: string): Promise<Cart>;
  createCart(countryCode?: string): Promise<Cart>;
  updateCart(cartId: string, update: any): Promise<Cart>;
  addToCart(cartId: string, variantId: string, quantity: number): Promise<Cart>;
  updateLineItem(cartId: string, lineItemId: string, quantity: number): Promise<Cart>;
  removeLineItem(cartId: string, lineItemId: string): Promise<Cart>;
  
  startCheckout(cartId: string): Promise<any>;
  completeCheckout(cartId: string, details: any): Promise<Order>;
  
  getCustomer(token: string): Promise<any>;
  getOrders(customerIdOrToken: string): Promise<Order[]>;
}
