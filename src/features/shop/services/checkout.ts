import { medusaClient } from "./medusaClient";
import { Cart as AbstractCart, ShippingAddress, ShippingOption, Order as AbstractOrder } from "../types";
import { mapMedusaCart } from "./cart";

export function mapMedusaOrder(o: any): AbstractOrder {
  const items = (o.items || []).map((item: any) => ({
    id: item.id,
    productId: item.variant?.product_id || "",
    productTitle: item.title,
    variantId: item.variant_id,
    variantTitle: item.variant?.title || "",
    thumbnail: item.thumbnail,
    price: item.unit_price / 100,
    quantity: item.quantity,
  }));

  return {
    id: o.id,
    cartId: o.cart_id || "",
    items,
    subtotal: o.subtotal / 100,
    shippingTotal: (o.shipping_total || 0) / 100,
    taxTotal: (o.tax_total || 0) / 100,
    total: o.total / 100,
    shippingAddress: {
      firstName: o.shipping_address?.first_name || "",
      lastName: o.shipping_address?.last_name || "",
      addressLine1: o.shipping_address?.address_1 || "",
      addressLine2: o.shipping_address?.address_2 || "",
      city: o.shipping_address?.city || "",
      province: o.shipping_address?.province || "",
      postalCode: o.shipping_address?.postal_code || "",
      countryCode: o.shipping_address?.country_code || "",
      phone: o.shipping_address?.phone || "",
    },
    shippingOption: {
      id: o.shipping_methods?.[0]?.shipping_option_id || "standard",
      name: o.shipping_methods?.[0]?.shipping_option?.name || "Standard Shipping",
      price: (o.shipping_methods?.[0]?.price || 0) / 100,
    },
    createdAt: o.created_at,
    status: o.status,
  };
}

export const CheckoutService = {
  async updateEmail(cartId: string, email: string): Promise<AbstractCart> {
    try {
      const data = await medusaClient.post(`carts/${cartId}`, {
        json: { email }
      }).json<{ cart: any }>();
      return mapMedusaCart(data.cart);
    } catch (e) {
      console.error(`Medusa updateEmail error for ${cartId}:`, e);
      throw e;
    }
  },

  async updateShippingAddress(cartId: string, address: ShippingAddress): Promise<AbstractCart> {
    try {
      const payload = {
        shipping_address: {
          first_name: address.firstName,
          last_name: address.lastName,
          address_1: address.addressLine1,
          address_2: address.addressLine2 || "",
          city: address.city,
          province: address.province || "",
          postal_code: address.postalCode,
          country_code: address.countryCode.toLowerCase(),
          phone: address.phone || "",
        }
      };
      const data = await medusaClient.post(`carts/${cartId}`, {
        json: payload
      }).json<{ cart: any }>();
      return mapMedusaCart(data.cart);
    } catch (e) {
      console.error(`Medusa updateShippingAddress error for ${cartId}:`, e);
      throw e;
    }
  },

  async getShippingOptions(cartId: string): Promise<ShippingOption[]> {
    try {
      const data = await medusaClient.get(`shipping-options/${cartId}`).json<{ shipping_options: any[] }>();
      return (data.shipping_options || []).map((o: any) => ({
        id: o.id,
        name: o.name,
        price: o.amount / 100,
        description: o.description || undefined,
      }));
    } catch (e) {
      console.error(`Medusa getShippingOptions error for ${cartId}:`, e);
      return [];
    }
  },

  async selectShippingOption(cartId: string, optionId: string): Promise<AbstractCart> {
    try {
      const data = await medusaClient.post(`carts/${cartId}/shipping-methods`, {
        json: { option_id: optionId }
      }).json<{ cart: any }>();
      return mapMedusaCart(data.cart);
    } catch (e) {
      console.error(`Medusa selectShippingOption error for ${cartId}:`, e);
      throw e;
    }
  },

  async createPaymentSessions(cartId: string): Promise<AbstractCart> {
    try {
      const data = await medusaClient.post(`carts/${cartId}/payment-sessions`).json<{ cart: any }>();
      return mapMedusaCart(data.cart);
    } catch (e) {
      console.error(`Medusa createPaymentSessions error for ${cartId}:`, e);
      throw e;
    }
  },

  async selectPaymentSession(cartId: string, providerId: string): Promise<AbstractCart> {
    try {
      const data = await medusaClient.post(`carts/${cartId}/payment-session`, {
        json: { provider_id: providerId }
      }).json<{ cart: any }>();
      return mapMedusaCart(data.cart);
    } catch (e) {
      console.error(`Medusa selectPaymentSession error for ${cartId}:`, e);
      throw e;
    }
  },

  async completeCart(cartId: string): Promise<{ type: string; data: AbstractOrder | AbstractCart }> {
    try {
      const data = await medusaClient.post(`carts/${cartId}/complete`).json<{ type: string; data: any }>();
      if (data.type === "order") {
        return {
          type: "order",
          data: mapMedusaOrder(data.data),
        };
      }
      return {
        type: "cart",
        data: mapMedusaCart(data.data),
      };
    } catch (e) {
      console.error(`Medusa completeCart error for ${cartId}:`, e);
      throw e;
    }
  }
};
