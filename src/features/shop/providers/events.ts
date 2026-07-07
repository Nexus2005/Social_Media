export type ShopEventMap = {
  "Product Viewed": { productId: string; productTitle: string; price: number; brand?: string };
  "Product Clicked": { productId: string; productTitle: string };
  "Product Shared": { productId: string; productTitle: string; channel: string };
  "Added To Cart": { productId: string; productTitle: string; variantId: string; quantity: number; price: number };
  "Checkout Started": { cartId: string; totalAmount: number };
  "Checkout Completed": { cartId: string; orderId: string; totalAmount: number };
  "Recommendation Clicked": { recommendationId: string; productId: string; productTitle: string };
  "Video Product Clicked": { videoId: string; productId: string; productTitle: string };
};

export class ShopEventEmitter {
  private listeners: { [event: string]: ((data: any) => void)[] } = {};
  
  subscribe<K extends keyof ShopEventMap>(event: K, cb: (data: ShopEventMap[K]) => void) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(cb);
    return () => this.unsubscribe(event, cb);
  }

  unsubscribe<K extends keyof ShopEventMap>(event: K, cb: (data: ShopEventMap[K]) => void) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(listener => listener !== cb);
  }
  
  emit<K extends keyof ShopEventMap>(event: K, data: ShopEventMap[K]) {
    this.listeners[event]?.forEach(cb => {
      try {
        cb(data);
      } catch (err) {
        console.error(`Error in event listener for ${event}:`, err);
      }
    });
  }
}

export const shopEvents = new ShopEventEmitter();

// Hook up default listener for debugging and tracking
if (typeof window !== "undefined") {
  shopEvents.subscribe("Product Viewed", (data) => {
    console.log("[Analytics - Event] Product Viewed:", data);
    // Here we can integrate segment, pixel, recently viewed lists, etc.
    try {
      const recentlyViewedKey = "cartly_recently_viewed_ids";
      const existing = localStorage.getItem(recentlyViewedKey);
      const list: string[] = existing ? JSON.parse(existing) : [];
      const updated = Array.from(new Set([data.productId, ...list])).slice(0, 10);
      localStorage.setItem(recentlyViewedKey, JSON.stringify(updated));
    } catch (e) {
      console.warn("Failed to update recently viewed list:", e);
    }
  });

  shopEvents.subscribe("Added To Cart", (data) => {
    console.log("[Analytics - Event] Added To Cart:", data);
  });

  shopEvents.subscribe("Checkout Started", (data) => {
    console.log("[Analytics - Event] Checkout Started:", data);
  });

  shopEvents.subscribe("Checkout Completed", (data) => {
    console.log("[Analytics - Event] Checkout Completed:", data);
  });

  shopEvents.subscribe("Video Product Clicked", (data) => {
    console.log("[Analytics - Event] Video Product Clicked:", data);
  });
}
