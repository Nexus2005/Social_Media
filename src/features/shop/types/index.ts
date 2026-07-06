export interface ProductOptionValue {
  id: string;
  value: string;
}

export interface ProductOption {
  id: string;
  title: string;
  values: ProductOptionValue[];
}

export interface ProductVariant {
  id: string;
  title: string;
  sku?: string;
  price: number;
  compareAtPrice?: number;
  inventoryQuantity: number;
  options: Record<string, string>; // Maps option_id to option_value
}

export interface Product {
  id: string;
  slug: string;
  title: string;
  brand?: string;
  description?: string;
  images: string[];
  price: number;
  compareAtPrice?: number;
  discountPercentage?: number;
  rating?: number;
  freeDelivery?: boolean;
  source: "medusa" | "amazon" | "ebay" | "shopify" | "custom";
  options: ProductOption[];
  variants: ProductVariant[];
  categories?: string[];
  collectionId?: string;
}

export interface LineItem {
  id: string;
  productId: string;
  productTitle: string;
  variantId: string;
  variantTitle: string;
  thumbnail?: string;
  price: number;
  quantity: number;
}

export interface Cart {
  id: string;
  items: LineItem[];
  subtotal: number;
  shippingTotal: number;
  taxTotal: number;
  total: number;
  email?: string;
  shippingAddress?: ShippingAddress;
  shippingOption?: ShippingOption;
}

export interface ShippingAddress {
  firstName: string;
  lastName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  province?: string;
  postalCode: string;
  countryCode: string;
  phone?: string;
}

export interface ShippingOption {
  id: string;
  name: string;
  price: number;
  description?: string;
}

export interface Order {
  id: string;
  cartId: string;
  items: LineItem[];
  subtotal: number;
  shippingTotal: number;
  taxTotal: number;
  total: number;
  shippingAddress: ShippingAddress;
  shippingOption: ShippingOption;
  createdAt: string;
  status: string;
}

export interface Collection {
  id: string;
  title: string;
  handle: string;
}

export interface Category {
  id: string;
  name: string;
  handle: string;
}
