import { Product, Cart, Collection, Category, Order } from "../types";
import { CommerceAdapter } from "./commerceAdapter";
import { SearchAdapter } from "./searchAdapter";
import { RecommendationAdapter } from "./recommendationAdapter";

export class CartlyAdapter implements CommerceAdapter, SearchAdapter, RecommendationAdapter {
  
  async getProducts(params?: any): Promise<Product[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.limit) queryParams.set("limit", String(params.limit));
      if (params?.collection_id) queryParams.set("collection_id", params.collection_id);
      if (params?.category_id) queryParams.set("category_id", params.category_id);
      if (params?.q) queryParams.set("q", params.q);
      
      const response = await fetch(`/api/shop/products?${queryParams.toString()}`);
      const data = await response.json();
      return data.products || [];
    } catch (e) {
      console.error("CartlyAdapter getProducts error:", e);
      return [];
    }
  }

  async getProduct(idOrSlug: string): Promise<Product> {
    try {
      const response = await fetch(`/api/shop/products/${idOrSlug}`);
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      return data.product;
    } catch (e) {
      console.error("CartlyAdapter getProduct error:", e);
      throw e;
    }
  }

  async searchProducts(query: string, options?: any): Promise<Product[]> {
    return this.getProducts({ q: query, ...options });
  }

  async search(query: string, options?: any): Promise<Product[]> {
    return this.searchProducts(query, options);
  }

  async getRecommendations(userId?: string, limit = 6): Promise<Product[]> {
    return this.getProducts({ limit });
  }

  async getCollections(): Promise<Collection[]> {
    try {
      const response = await fetch("/api/shop/collections");
      const data = await response.json();
      return data.collections || [];
    } catch (e) {
      console.error("CartlyAdapter getCollections error:", e);
      return [];
    }
  }

  async getCollection(idOrHandle: string): Promise<Collection> {
    const list = await this.getCollections();
    const found = list.find(c => c.id === idOrHandle || c.handle === idOrHandle);
    if (found) return found;
    throw new Error("Collection not found");
  }

  async getCategories(): Promise<Category[]> {
    try {
      // Cached in-browser via Cache-Control set by /api/shop/categories
      const response = await fetch("/api/shop/categories");
      const data = await response.json();
      return data.categories || [];
    } catch (e) {
      console.error("CartlyAdapter getCategories error:", e);
      return [];
    }
  }

  async getCategory(idOrHandle: string): Promise<Category> {
    const list = await this.getCategories();
    const found = list.find(c => c.id === idOrHandle || c.handle === idOrHandle);
    if (found) return found;
    throw new Error("Category not found");
  }

  async getCart(cartId: string): Promise<Cart> {
    try {
      const response = await fetch(`/api/shop/cart?cartId=${cartId}`);
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      return data.cart;
    } catch (e) {
      console.error("CartlyAdapter getCart error:", e);
      throw e;
    }
  }

  async createCart(countryCode = "in"): Promise<Cart> {
    try {
      const response = await fetch("/api/shop/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countryCode })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      return data.cart;
    } catch (e) {
      console.error("CartlyAdapter createCart error:", e);
      throw e;
    }
  }

  async updateCart(cartId: string, update: any): Promise<Cart> {
    try {
      const response = await fetch("/api/shop/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartId, ...update })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      return data.cart;
    } catch (e) {
      console.error("CartlyAdapter updateCart error:", e);
      throw e;
    }
  }

  async addToCart(cartId: string, variantId: string, quantity: number): Promise<Cart> {
    try {
      const response = await fetch("/api/shop/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartId, variantId, quantity })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      return data.cart;
    } catch (e) {
      console.error("CartlyAdapter addToCart error:", e);
      throw e;
    }
  }

  async updateLineItem(cartId: string, lineItemId: string, quantity: number): Promise<Cart> {
    return this.updateCart(cartId, { lineItemId, quantity });
  }

  async removeLineItem(cartId: string, lineItemId: string): Promise<Cart> {
    try {
      const response = await fetch(`/api/shop/cart?cartId=${cartId}&lineItemId=${lineItemId}`, {
        method: "DELETE"
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      return data.cart;
    } catch (e) {
      console.error("CartlyAdapter removeLineItem error:", e);
      throw e;
    }
  }

  async removeLineItemsBatch(cartId: string, itemIds: string[]): Promise<Cart> {
    try {
      const response = await fetch(`/api/shop/cart?cartId=${cartId}&batchIds=${itemIds.join(",")}`, {
        method: "DELETE"
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      return data.cart;
    } catch (e) {
      console.error("CartlyAdapter removeLineItemsBatch error:", e);
      throw e;
    }
  }

  async applyCoupon(cartId: string, code: string): Promise<Cart> {
    try {
      const response = await fetch("/api/shop/coupons/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartId, code })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      return data.cart;
    } catch (e) {
      console.error("CartlyAdapter applyCoupon error:", e);
      throw e;
    }
  }

  async removeCoupon(cartId: string): Promise<Cart> {
    try {
      const response = await fetch(`/api/shop/coupons/apply?cartId=${cartId}`, {
        method: "DELETE"
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      return data.cart;
    } catch (e) {
      console.error("CartlyAdapter removeCoupon error:", e);
      throw e;
    }
  }

  async updateSelection(cartId: string, itemId: string, selected: boolean): Promise<Cart> {
    try {
      const response = await fetch("/api/shop/cart/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartId, itemId, selected })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      return data.cart;
    } catch (e) {
      console.error("CartlyAdapter updateSelection error:", e);
      throw e;
    }
  }

  async batchUpdateSelection(cartId: string, itemIds: string[], selected: boolean): Promise<Cart> {
    try {
      const response = await fetch("/api/shop/cart/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartId, itemIds, selected })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      return data.cart;
    } catch (e) {
      console.error("CartlyAdapter batchUpdateSelection error:", e);
      throw e;
    }
  }

  async batchMoveToWishlist(cartId: string, itemIds: string[]): Promise<Cart> {
    try {
      const response = await fetch("/api/shop/cart/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartId, itemIds })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      return data.cart;
    } catch (e) {
      console.error("CartlyAdapter batchMoveToWishlist error:", e);
      throw e;
    }
  }

  async checkout(cartId: string): Promise<any> {
    try {
      const response = await fetch("/api/shop/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartId })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      return data;
    } catch (e) {
      console.error("CartlyAdapter checkout error:", e);
      throw e;
    }
  }

  async getLocation(): Promise<any> {
    try {
      const response = await fetch("/api/shop/location");
      const data = await response.json();
      return data.address;
    } catch (e) {
      console.error("CartlyAdapter getLocation error:", e);
      return null;
    }
  }

  async getCartFooterCMS(): Promise<any> {
    try {
      const response = await fetch("/api/shop/cms/cart-footer");
      return await response.json();
    } catch (e) {
      console.error("CartlyAdapter getCartFooterCMS error:", e);
      return null;
    }
  }

  async getCartFeaturesCMS(): Promise<any> {
    try {
      const response = await fetch("/api/shop/cms/features");
      const data = await response.json();
      return data.features || [];
    } catch (e) {
      console.error("CartlyAdapter getCartFeaturesCMS error:", e);
      return [];
    }
  }

  async getWishlistCount(): Promise<number> {
    try {
      const response = await fetch("/api/shop/wishlist/count");
      const data = await response.json();
      return data.count || 0;
    } catch (e) {
      console.error("CartlyAdapter getWishlistCount error:", e);
      return 0;
    }
  }

  async getCartRecommendations(): Promise<any> {
    try {
      const response = await fetch("/api/shop/recommendations");
      return await response.json();
    } catch (e) {
      console.error("CartlyAdapter getCartRecommendations error:", e);
      return { frequentlyBought: [], recommended: [], recentlyViewed: [], creatorPicks: [] };
    }
  }

  async startCheckout(cartId: string): Promise<any> {
    return this.getCart(cartId);
  }

  async completeCheckout(cartId: string, details: any): Promise<Order> {
    try {
      const response = await fetch("/api/shop/cart/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartId, details })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      return data.order;
    } catch (e) {
      console.error("CartlyAdapter completeCheckout error:", e);
      throw e;
    }
  }

  async getCustomer(token: string): Promise<any> {
    return null;
  }

  async getOrders(customerIdOrToken: string): Promise<Order[]> {
    return [];
  }
}
export const cartlyAdapter = new CartlyAdapter();
