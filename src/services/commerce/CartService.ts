import prisma from "@/lib/prisma";
import { ShopCart, ShopCartItem } from "@/generated/client";
import { PricingService } from "./PricingService";
import { CouponService } from "./CouponService";

export class CartService {
  /**
   * Fetch a cart by userId or sessionId. If none exists, create one.
   */
  static async getOrCreate(userId?: string, sessionId?: string): Promise<ShopCart & { items: any[] }> {
    if (!userId && !sessionId) {
      throw new Error("Either userId or sessionId is required to get or create a cart");
    }

    let cart;

    if (userId) {
      cart = await prisma.shopCart.findFirst({
        where: { userId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  images: { orderBy: { displayOrder: "asc" } }
                }
              },
              variant: true
            }
          },
          coupon: true
        }
      });
    } else {
      cart = await prisma.shopCart.findFirst({
        where: { sessionId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  images: { orderBy: { displayOrder: "asc" } }
                }
              },
              variant: true
            }
          },
          coupon: true
        }
      });
    }

    if (cart) {
      return cart;
    }

    // Create a new cart
    const newCart = await prisma.shopCart.create({
      data: {
        userId,
        sessionId,
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { orderBy: { displayOrder: "asc" } }
              }
            },
            variant: true
          }
        },
        coupon: true
      }
    });

    return newCart;
  }

  static async getById(id: string) {
    return prisma.shopCart.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { orderBy: { displayOrder: "asc" } }
              }
            },
            variant: true
          }
        },
        coupon: true
      }
    });
  }

  /**
   * Adds an item to the cart inside a Prisma transaction with stock validation, product snapshotting, and audit logging.
   */
  static async addItem(cartId: string, productId: string, variantId: string | null, quantity: number, userId?: string) {
    if (quantity <= 0) {
      throw new Error("Quantity must be greater than 0");
    }

    return prisma.$transaction(async (tx) => {
      // Validate product
      const product = await tx.shopProduct.findUnique({
        where: { id: productId },
        include: { 
          variants: true,
          brand: true,
          images: { orderBy: { displayOrder: "asc" } }
        }
      });

      if (!product || product.status !== "PUBLISHED") {
        throw new Error("Product not found or not active");
      }

      // Validate variant
      let selectedVariant = null;
      if (variantId) {
        selectedVariant = product.variants.find((v) => v.id === variantId);
        if (!selectedVariant) {
          throw new Error("Selected variant not found");
        }
      } else {
        selectedVariant = product.variants.find((v) => v.isDefault) || product.variants[0];
      }

      if (!selectedVariant) {
        throw new Error("No available product configuration/variant found");
      }

      // Check stock
      if (selectedVariant.stock < quantity) {
        throw new Error(`Only ${selectedVariant.stock} items left in stock.`);
      }

      // Reset recentlyAdded flag for all other items in this cart
      await tx.shopCartItem.updateMany({
        where: { cartId },
        data: { recentlyAdded: false }
      });

      // Check if item already in cart
      const existingItem = await tx.shopCartItem.findFirst({
        where: {
          cartId,
          productId,
          variantId: selectedVariant.id,
        }
      });

      const currentPrice = selectedVariant.salePrice ?? selectedVariant.price;
      const snapshotThumbnail = product.images?.[0]?.originalUrl || "/placeholder-thumbnail.avif";

      let cartItem;
      if (existingItem) {
        const newQty = existingItem.quantity + quantity;
        if (selectedVariant.stock < newQty) {
          throw new Error(`Only ${selectedVariant.stock} items left in stock.`);
        }

        cartItem = await tx.shopCartItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: newQty,
            unitPrice: currentPrice,
            recentlyAdded: true
          }
        });
      } else {
        cartItem = await tx.shopCartItem.create({
          data: {
            cartId,
            productId,
            variantId: selectedVariant.id,
            quantity,
            unitPrice: currentPrice,
            recentlyAdded: true,
            // Snapshot frozen product fields
            snapTitle: product.title,
            snapBrand: product.brand?.name || "Generic",
            snapThumbnailUrl: snapshotThumbnail,
            snapVariantTitle: selectedVariant.title,
            snapSku: selectedVariant.sku || product.sku,
            snapPrice: currentPrice
          }
        });
      }

      // Write Cart Audit Log
      await tx.shopCartAuditLog.create({
        data: {
          cartId,
          userId,
          action: "ADD_ITEM",
          payload: { productId, variantId: selectedVariant.id, quantity, lineItemId: cartItem.id }
        }
      });

      return cartItem;
    });
  }

  /**
   * Update item quantity in cart inside a transaction with inventory checks and logging.
   */
  static async updateItem(cartId: string, itemId: string, quantity: number, userId?: string) {
    if (quantity <= 0) {
      return this.removeItem(cartId, itemId, userId);
    }

    return prisma.$transaction(async (tx) => {
      const item = await tx.shopCartItem.findUnique({
        where: { id: itemId },
        include: { variant: true }
      });

      if (!item || item.cartId !== cartId) {
        throw new Error("Cart item not found");
      }

      if (item.variant && item.variant.stock < quantity) {
        throw new Error(`Only ${item.variant.stock} items left in stock.`);
      }

      const updatedItem = await tx.shopCartItem.update({
        where: { id: itemId },
        data: { quantity }
      });

      // Write Cart Audit Log
      await tx.shopCartAuditLog.create({
        data: {
          cartId,
          userId,
          action: "UPDATE_QTY",
          payload: { itemId, quantity }
        }
      });

      return updatedItem;
    });
  }

  /**
   * Remove item from cart inside a transaction with audit logging.
   */
  static async removeItem(cartId: string, itemId: string, userId?: string) {
    return prisma.$transaction(async (tx) => {
      const item = await tx.shopCartItem.findUnique({
        where: { id: itemId },
      });

      if (!item || item.cartId !== cartId) {
        throw new Error("Cart item not found");
      }

      const deletedItem = await tx.shopCartItem.delete({
        where: { id: itemId },
      });

      // Write Cart Audit Log
      await tx.shopCartAuditLog.create({
        data: {
          cartId,
          userId,
          action: "REMOVE_ITEM",
          payload: { itemId, productId: item.productId }
        }
      });

      return deletedItem;
    });
  }

  /**
   * Clear all items in cart inside a transaction.
   */
  static async clear(cartId: string, userId?: string) {
    return prisma.$transaction(async (tx) => {
      await tx.shopCartItem.deleteMany({
        where: { cartId },
      });

      await tx.shopCartAuditLog.create({
        data: {
          cartId,
          userId,
          action: "CLEAR_CART",
        }
      });
    });
  }

  /**
   * Apply coupon code to cart with audit logging inside a transaction.
   */
  static async applyCoupon(cartId: string, code: string, userId?: string) {
    return prisma.$transaction(async (tx) => {
      const coupon = await tx.shopCoupon.findUnique({
        where: { code, active: true },
      });

      if (!coupon) {
        throw new Error("Coupon code is invalid or disabled");
      }

      // Check dates
      const now = new Date();
      if (coupon.startAt && coupon.startAt > now) {
        throw new Error("Coupon is not active yet");
      }
      if (coupon.endAt && coupon.endAt < now) {
        throw new Error("Coupon has expired");
      }
      if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
        throw new Error("Coupon usage limit has been reached");
      }

      // Associate coupon to cart
      const updatedCart = await tx.shopCart.update({
        where: { id: cartId },
        data: { couponId: coupon.id },
        include: { coupon: true },
      });

      // Audit Log
      await tx.shopCartAuditLog.create({
        data: {
          cartId,
          userId,
          action: "APPLY_COUPON",
          payload: { couponId: coupon.id, code }
        }
      });

      return updatedCart;
    });
  }

  /**
   * Remove applied coupon code from cart inside a transaction.
   */
  static async removeCoupon(cartId: string, userId?: string) {
    return prisma.$transaction(async (tx) => {
      const updatedCart = await tx.shopCart.update({
        where: { id: cartId },
        data: { couponId: null },
        include: { coupon: true }
      });

      await tx.shopCartAuditLog.create({
        data: {
          cartId,
          userId,
          action: "REMOVE_COUPON"
        }
      });

      return updatedCart;
    });
  }

  /**
   * Toggle item selection state in database
   */
  static async updateItemSelection(cartId: string, itemId: string, selected: boolean, userId?: string) {
    const item = await prisma.shopCartItem.findUnique({ where: { id: itemId } });
    if (!item || item.cartId !== cartId) {
      throw new Error("Cart item not found");
    }

    return prisma.shopCartItem.update({
      where: { id: itemId },
      data: { selected }
    });
  }

  /**
   * Bulk update items selection state inside a database transaction
   */
  static async updateItemSelectionBatch(cartId: string, itemIds: string[], selected: boolean, userId?: string) {
    return prisma.$transaction(async (tx) => {
      await tx.shopCartItem.updateMany({
        where: {
          cartId,
          id: { in: itemIds }
        },
        data: { selected }
      });

      await tx.shopCartAuditLog.create({
        data: {
          cartId,
          userId,
          action: "BATCH_SELECT",
          payload: { itemIds, selected }
        }
      });
    });
  }

  /**
   * Bulk remove items from cart inside a database transaction
   */
  static async removeLineItemsBatch(cartId: string, itemIds: string[], userId?: string) {
    return prisma.$transaction(async (tx) => {
      await tx.shopCartItem.deleteMany({
        where: {
          cartId,
          id: { in: itemIds }
        }
      });

      await tx.shopCartAuditLog.create({
        data: {
          cartId,
          userId,
          action: "BATCH_REMOVE",
          payload: { itemIds }
        }
      });
    });
  }

  /**
   * Bulk move items to user's product wishlist inside a database transaction
   */
  static async moveToWishlistBatch(userId: string, cartId: string, itemIds: string[]) {
    return prisma.$transaction(async (tx) => {
      const items = await tx.shopCartItem.findMany({
        where: {
          cartId,
          id: { in: itemIds }
        }
      });

      for (const item of items) {
        // Create wishlist record if not already present
        await tx.shopWishlist.upsert({
          where: {
            userId_productId: {
              userId,
              productId: item.productId
            }
          },
          create: {
            userId,
            productId: item.productId
          },
          update: {} // do nothing if exists
        });
      }

      // Delete items from cart
      await tx.shopCartItem.deleteMany({
        where: {
          cartId,
          id: { in: itemIds }
        }
      });

      await tx.shopCartAuditLog.create({
        data: {
          cartId,
          userId,
          action: "BATCH_MOVE_WISHLIST",
          payload: { itemIds }
        }
      });
    });
  }

  /**
   * Wrap calculations in static bridge for backward compatibility
   */
  static async calculateTotals(cartId: string) {
    return PricingService.calculateCartTotals(cartId);
  }
}
