import { medusaClient } from "./medusaClient";
import { Product as AbstractProduct, Collection as AbstractCollection, Category as AbstractCategory } from "../types";

export function mapMedusaProduct(m: any): AbstractProduct {
  const images = (m.images || []).map((img: any) => img.url);
  if (images.length === 0 && m.thumbnail) {
    images.push(m.thumbnail);
  }

  const variants = (m.variants || []).map((v: any) => {
    // Medusa stores price amounts in cents (e.g. 1000 = $10.00). Divide by 100.
    const priceRecord = v.prices?.find((p: any) => p.currency_code === "usd") || v.prices?.[0];
    const priceAmount = priceRecord ? priceRecord.amount / 100 : 0;
    
    const optionsMap: Record<string, string> = {};
    (v.options || []).forEach((opt: any) => {
      optionsMap[opt.option_id] = opt.value;
    });

    return {
      id: v.id,
      title: v.title,
      sku: v.sku,
      price: priceAmount,
      compareAtPrice: priceAmount * 1.25,
      inventoryQuantity: v.inventory_quantity || 0,
      options: optionsMap,
    };
  });

  const defaultPrice = variants[0]?.price || 0;

  const options = (m.options || []).map((o: any) => ({
    id: o.id,
    title: o.title,
    values: (o.values || []).map((v: any) => ({
      id: v.id,
      value: v.value,
    })),
  }));

  // Safe category names mapping if nested in Medusa API response
  const categories = (m.categories || []).map((c: any) => c.name);

  return {
    id: m.id,
    slug: m.handle || m.id,
    title: m.title,
    brand: m.subtitle || m.brand || "Cartly Premium",
    description: m.description || "",
    images: images.length > 0 ? images : ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80"],
    price: defaultPrice,
    compareAtPrice: defaultPrice * 1.25,
    discountPercentage: 20,
    rating: 4.5,
    freeDelivery: true,
    source: "medusa",
    options,
    variants,
    categories,
    collectionId: m.collection_id,
  };
}

export const ProductService = {
  async getProducts(params?: { q?: string; limit?: number; offset?: number; collection_id?: string; category_id?: string }): Promise<AbstractProduct[]> {
    try {
      const searchParams: Record<string, string> = {};
      if (params?.q) searchParams.q = params.q;
      if (params?.limit) searchParams.limit = params.limit.toString();
      if (params?.offset) searchParams.offset = params.offset.toString();
      if (params?.collection_id) searchParams.collection_id = params.collection_id;
      if (params?.category_id) searchParams.category_id = params.category_id;

      const data = await medusaClient.get("products", { searchParams }).json<{ products: any[] }>();
      return (data.products || []).map(mapMedusaProduct);
    } catch (e) {
      console.warn("Medusa GET products error, returning empty list:", e);
      throw e; // Handled by UI to show offline state
    }
  },

  async getProductBySlug(slug: string): Promise<AbstractProduct> {
    try {
      // First try listing products by handle (slug)
      const data = await medusaClient.get("products", {
        searchParams: { handle: slug }
      }).json<{ products: any[] }>();
      
      if (data.products && data.products.length > 0) {
        return mapMedusaProduct(data.products[0]);
      }
      
      // Fallback: try fetching by ID directly
      const singleData = await medusaClient.get(`products/${slug}`).json<{ product: any }>();
      return mapMedusaProduct(singleData.product);
    } catch (e) {
      console.error(`Medusa getProductBySlug error for ${slug}:`, e);
      throw e;
    }
  },

  async getCollections(): Promise<AbstractCollection[]> {
    try {
      const data = await medusaClient.get("collections").json<{ collections: any[] }>();
      return (data.collections || []).map((c: any) => ({
        id: c.id,
        title: c.title,
        handle: c.handle || c.id,
      }));
    } catch (e) {
      console.warn("Medusa GET collections error:", e);
      return [];
    }
  },

  async getCategories(): Promise<AbstractCategory[]> {
    try {
      // Medusa REST API categories endpoint
      const data = await medusaClient.get("product-categories").json<{ product_categories: any[] }>();
      return (data.product_categories || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        handle: c.handle || c.id,
      }));
    } catch (e) {
      console.warn("Medusa GET product-categories error:", e);
      return [];
    }
  }
};
