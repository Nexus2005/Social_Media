import { Product, Cart, LineItem, Order } from "../types";

/**
 * Maps a Prisma DB product to the frontend Product type
 */
export function mapDbProductToFrontendProduct(dbProd: any): Product {
  if (!dbProd) return null as any;

  const images = dbProd.images && dbProd.images.length > 0 
    ? dbProd.images.map((img: any) => img.originalUrl) 
    : ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80"];

  const price = dbProd.salePrice ?? dbProd.price;
  const compareAtPrice = dbProd.price > price ? dbProd.price : price * 1.25;

  const variants = (dbProd.variants || []).map((v: any) => {
    const optionsMap: Record<string, string> = {};
    (v.attributes || []).forEach((attr: any) => {
      optionsMap[attr.key] = attr.value;
    });

    return {
      id: v.id,
      title: v.title,
      sku: v.sku || undefined,
      price: v.salePrice ?? v.price,
      compareAtPrice: v.price > (v.salePrice ?? v.price) ? v.price : (v.salePrice ?? v.price) * 1.25,
      inventoryQuantity: v.stock || 0,
      options: optionsMap,
    };
  });

  // Reconstruct options from variant attributes
  const optionsMap: Record<string, Set<string>> = {};
  (dbProd.variants || []).forEach((v: any) => {
    (v.attributes || []).forEach((attr: any) => {
      if (!optionsMap[attr.key]) {
        optionsMap[attr.key] = new Set();
      }
      optionsMap[attr.key].add(attr.value);
    });
  });

  const options = Object.entries(optionsMap).map(([title, valuesSet], index) => ({
    id: `opt-${index}-${title.toLowerCase()}`,
    title,
    values: Array.from(valuesSet).map((val, valIdx) => ({
      id: `val-${index}-${valIdx}`,
      value: val,
    })),
  }));

  return {
    id: dbProd.id,
    slug: dbProd.slug,
    title: dbProd.title,
    brand: dbProd.brand?.name || "Cartly Premium",
    description: dbProd.description || "",
    images,
    price,
    compareAtPrice,
    discountPercentage: dbProd.price > price ? Math.round(((dbProd.price - price) / dbProd.price) * 100) : 20,
    rating: dbProd.metaData?.rating || 4.5,
    freeDelivery: true,
    source: "medusa",
    options,
    variants,
    categories: dbProd.category ? [dbProd.category.name] : [],
    collectionId: dbProd.collections?.[0]?.collectionId || undefined,
  };
}

/**
 * Maps a Prisma DB Cart to the frontend Cart type
 */
export function mapDbCartToFrontendCart(dbCart: any, totals: any): Cart {
  if (!dbCart) return null as any;

  const items: LineItem[] = (dbCart.items || []).map((i: any) => {
    const images = i.product?.images || [];
    const thumbnail = i.snapThumbnailUrl || 
                      images.find((img: any) => img.displayOrder === 0)?.originalUrl || 
                      images[0]?.originalUrl || 
                      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80";

    return {
      id: i.id,
      productId: i.productId,
      productTitle: i.snapTitle || i.product?.title || "Product",
      variantId: i.variantId || "",
      variantTitle: i.snapVariantTitle || i.variant?.title || "",
      thumbnail,
      price: i.unitPrice,
      quantity: i.quantity,
      selected: i.selected,
      recentlyAdded: i.recentlyAdded,
      snapTitle: i.snapTitle || undefined,
      snapBrand: i.snapBrand || i.product?.brand?.name || "Generic",
      snapThumbnailUrl: i.snapThumbnailUrl || undefined,
      snapVariantTitle: i.snapVariantTitle || undefined,
      snapSku: i.snapSku || undefined,
      snapPrice: i.snapPrice || undefined,
      sellerId: i.product?.sellerId || undefined
    };
  });

  return {
    id: dbCart.id,
    items,
    subtotal: totals.subtotal || 0,
    shippingTotal: totals.shippingTotal || 0,
    taxTotal: totals.taxTotal || 0,
    total: totals.total || 0,
    email: dbCart.user?.email || undefined,
    shippingAddress: dbCart.shippingAddress || undefined,
    shippingOption: dbCart.shippingOption || undefined,
    totalMrp: totals.totalMrp || 0,
    discountOnMrp: totals.discountOnMrp || 0,
    couponDiscount: totals.couponDiscount || 0,
    platformFee: totals.platformFee || 0,
    savings: totals.savings || 0,
    itemsCount: totals.itemsCount || 0,
    selectedItemsCount: totals.selectedItemsCount || 0
  };
}

/**
 * Maps a Prisma DB Order to the frontend Order type
 */
export function mapDbOrderToFrontendOrder(dbOrder: any): Order {
  if (!dbOrder) return null as any;

  const items: LineItem[] = (dbOrder.items || []).map((i: any) => ({
    id: i.id,
    productId: i.productId,
    productTitle: i.productTitle || i.product?.title || "Product",
    variantId: i.variantId || "",
    variantTitle: i.variantTitle || i.variant?.title || "",
    thumbnail: i.thumbnailUrl || undefined,
    price: i.unitPrice,
    quantity: i.quantity,
  }));

  const shippingAddress = dbOrder.shippingAddress ? {
    firstName: dbOrder.shippingAddress.firstName || "",
    lastName: dbOrder.shippingAddress.lastName || "",
    addressLine1: dbOrder.shippingAddress.addressLine1 || "",
    addressLine2: dbOrder.shippingAddress.addressLine2 || undefined,
    city: dbOrder.shippingAddress.city || "",
    province: dbOrder.shippingAddress.state || undefined,
    postalCode: dbOrder.shippingAddress.postalCode || "",
    countryCode: dbOrder.shippingAddress.countryCode || "IN",
    phone: dbOrder.shippingAddress.phone || undefined,
  } : undefined;

  return {
    id: dbOrder.id,
    cartId: dbOrder.id, // stub cartId matching order ID
    items,
    subtotal: dbOrder.subtotal,
    shippingTotal: dbOrder.shippingTotal,
    taxTotal: dbOrder.taxTotal,
    total: dbOrder.total,
    shippingAddress: shippingAddress as any,
    shippingOption: {
      id: dbOrder.courier || "standard",
      name: dbOrder.courier || "Standard Delivery",
      price: dbOrder.shippingTotal,
    },
    createdAt: dbOrder.createdAt.toISOString(),
    status: dbOrder.status.toLowerCase(),
  };
}
