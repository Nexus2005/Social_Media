import { medusaClient } from "./medusaClient";
import { Cart as AbstractCart } from "../types";

export function mapMedusaCart(c: any): AbstractCart {
  const items = (c.items || []).map((item: any) => {
    return {
      id: item.id,
      productId: item.variant?.product_id || "",
      productTitle: item.title,
      variantId: item.variant_id,
      variantTitle: item.variant?.title || "",
      thumbnail: item.thumbnail,
      price: item.unit_price / 100,
      quantity: item.quantity,
    };
  });

  return {
    id: c.id,
    items,
    subtotal: c.subtotal / 100,
    shippingTotal: (c.shipping_total || 0) / 100,
    taxTotal: (c.tax_total || 0) / 100,
    total: c.total / 100,
    email: c.email || undefined,
    shippingAddress: c.shipping_address ? {
      firstName: c.shipping_address.first_name || "",
      lastName: c.shipping_address.last_name || "",
      addressLine1: c.shipping_address.address_1 || "",
      addressLine2: c.shipping_address.address_2 || "",
      city: c.shipping_address.city || "",
      province: c.shipping_address.province || "",
      postalCode: c.shipping_address.postal_code || "",
      countryCode: c.shipping_address.country_code || "",
      phone: c.shipping_address.phone || "",
    } : undefined,
    shippingOption: c.shipping_methods?.[0] ? {
      id: c.shipping_methods[0].shipping_option_id,
      name: c.shipping_methods[0].shipping_option?.name || "Standard Shipping",
      price: c.shipping_methods[0].price / 100,
    } : undefined,
  };
}

export const CartService = {
  async createCart(): Promise<AbstractCart> {
    try {
      const data = await medusaClient.post("carts").json<{ cart: any }>();
      return mapMedusaCart(data.cart);
    } catch (e) {
      console.error("Medusa createCart error:", e);
      throw e;
    }
  },

  async retrieveCart(cartId: string): Promise<AbstractCart> {
    try {
      const data = await medusaClient.get(`carts/${cartId}`).json<{ cart: any }>();
      return mapMedusaCart(data.cart);
    } catch (e) {
      console.error(`Medusa retrieveCart error for ${cartId}:`, e);
      throw e;
    }
  },

  async addToCart(cartId: string, variantId: string, quantity: number): Promise<AbstractCart> {
    try {
      const data = await medusaClient.post(`carts/${cartId}/line-items`, {
        json: { variant_id: variantId, quantity }
      }).json<{ cart: any }>();
      return mapMedusaCart(data.cart);
    } catch (e) {
      console.error(`Medusa addToCart error for ${cartId}:`, e);
      throw e;
    }
  },

  async updateLineItem(cartId: string, lineItemId: string, quantity: number): Promise<AbstractCart> {
    try {
      const data = await medusaClient.post(`carts/${cartId}/line-items/${lineItemId}`, {
        json: { quantity }
      }).json<{ cart: any }>();
      return mapMedusaCart(data.cart);
    } catch (e) {
      console.error(`Medusa updateLineItem error for ${cartId}/${lineItemId}:`, e);
      throw e;
    }
  },

  async removeLineItem(cartId: string, lineItemId: string): Promise<AbstractCart> {
    try {
      const data = await medusaClient.delete(`carts/${cartId}/line-items/${lineItemId}`).json<{ cart: any }>();
      return mapMedusaCart(data.cart);
    } catch (e) {
      console.error(`Medusa removeLineItem error for ${cartId}/${lineItemId}:`, e);
      throw e;
    }
  }
};
