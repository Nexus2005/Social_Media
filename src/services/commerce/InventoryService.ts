import prisma from "@/lib/prisma";
import { InventoryChangeType } from "@/generated/client";

export class InventoryService {
  /**
   * Get total stock for a product or specific variant
   */
  static async getStock(productId: string, variantId?: string): Promise<number> {
    if (variantId) {
      const variant = await prisma.shopProductVariant.findUnique({
        where: { id: variantId },
        select: { stock: true },
      });
      return variant?.stock ?? 0;
    }

    const variants = await prisma.shopProductVariant.findMany({
      where: { productId },
      select: { stock: true },
    });

    return variants.reduce((sum, v) => sum + v.stock, 0);
  }

  /**
   * Add stock (replenishment)
   */
  static async addStock(variantId: string, quantity: number, reason: string, userId: string) {
    if (quantity <= 0) {
      throw new Error("Quantity must be greater than 0");
    }

    const variant = await prisma.shopProductVariant.findUnique({
      where: { id: variantId },
    });

    if (!variant) {
      throw new Error("Product variant not found");
    }

    const stockBefore = variant.stock;
    const stockAfter = stockBefore + quantity;

    return prisma.$transaction(async (tx) => {
      const updatedVariant = await tx.shopProductVariant.update({
        where: { id: variantId },
        data: {
          stock: stockAfter,
        },
      });

      await tx.shopInventoryHistory.create({
        data: {
          productId: variant.productId,
          variantId,
          changeType: "ADDED",
          quantityBefore: stockBefore,
          quantityAfter: stockAfter,
          quantityDelta: quantity,
          reason,
          performedBy: userId,
        },
      });

      return updatedVariant;
    });
  }

  /**
   * Deduct stock during checkout (Sold)
   */
  static async sell(variantId: string, quantity: number, orderId: string) {
    if (quantity <= 0) {
      throw new Error("Quantity must be greater than 0");
    }

    const variant = await prisma.shopProductVariant.findUnique({
      where: { id: variantId },
    });

    if (!variant) {
      throw new Error("Product variant not found");
    }

    if (variant.stock < quantity) {
      throw new Error(`Insufficient stock for variant ${variant.title}. Available: ${variant.stock}, requested: ${quantity}`);
    }

    const stockBefore = variant.stock;
    const stockAfter = stockBefore - quantity;

    return prisma.$transaction(async (tx) => {
      const updatedVariant = await tx.shopProductVariant.update({
        where: { id: variantId },
        data: {
          stock: stockAfter,
        },
      });

      await tx.shopInventoryHistory.create({
        data: {
          productId: variant.productId,
          variantId,
          changeType: "SOLD",
          quantityBefore: stockBefore,
          quantityAfter: stockAfter,
          quantityDelta: -quantity,
          reason: `Checkout purchase order #${orderId}`,
          orderId,
        },
      });

      return updatedVariant;
    });
  }

  /**
   * Restore stock due to returns or cancellations
   */
  static async return(variantId: string, quantity: number, orderId: string, userId?: string) {
    if (quantity <= 0) {
      throw new Error("Quantity must be greater than 0");
    }

    const variant = await prisma.shopProductVariant.findUnique({
      where: { id: variantId },
    });

    if (!variant) {
      throw new Error("Product variant not found");
    }

    const stockBefore = variant.stock;
    const stockAfter = stockBefore + quantity;

    return prisma.$transaction(async (tx) => {
      const updatedVariant = await tx.shopProductVariant.update({
        where: { id: variantId },
        data: {
          stock: stockAfter,
        },
      });

      await tx.shopInventoryHistory.create({
        data: {
          productId: variant.productId,
          variantId,
          changeType: "RETURNED",
          quantityBefore: stockBefore,
          quantityAfter: stockAfter,
          quantityDelta: quantity,
          reason: `Order return / refund processed #${orderId}`,
          orderId,
          performedBy: userId,
        },
      });

      return updatedVariant;
    });
  }

  /**
   * Manually adjust stock levels (wastage, corrections)
   */
  static async adjust(variantId: string, newStock: number, reason: string, userId: string) {
    if (newStock < 0) {
      throw new Error("Stock levels cannot be negative");
    }

    const variant = await prisma.shopProductVariant.findUnique({
      where: { id: variantId },
    });

    if (!variant) {
      throw new Error("Product variant not found");
    }

    const stockBefore = variant.stock;
    const delta = newStock - stockBefore;

    if (delta === 0) {
      return variant;
    }

    return prisma.$transaction(async (tx) => {
      const updatedVariant = await tx.shopProductVariant.update({
        where: { id: variantId },
        data: {
          stock: newStock,
        },
      });

      await tx.shopInventoryHistory.create({
        data: {
          productId: variant.productId,
          variantId,
          changeType: "ADJUSTED",
          quantityBefore: stockBefore,
          quantityAfter: newStock,
          quantityDelta: delta,
          reason,
          performedBy: userId,
        },
      });

      return updatedVariant;
    });
  }

  /**
   * Bulk update stock level records
   */
  static async bulkUpdate(items: Array<{ variantId: string; stock: number; reason?: string }>, userId: string) {
    return prisma.$transaction(async (tx) => {
      const results = [];

      for (const item of items) {
        const variant = await tx.shopProductVariant.findUnique({
          where: { id: item.variantId },
        });

        if (!variant) {
          throw new Error(`Product variant ${item.variantId} not found`);
        }

        const stockBefore = variant.stock;
        const delta = item.stock - stockBefore;

        if (delta !== 0) {
          const updated = await tx.shopProductVariant.update({
            where: { id: item.variantId },
            data: {
              stock: item.stock,
            },
          });

          await tx.shopInventoryHistory.create({
            data: {
              productId: variant.productId,
              variantId: item.variantId,
              changeType: "BULK_UPDATE",
              quantityBefore: stockBefore,
              quantityAfter: item.stock,
              quantityDelta: delta,
              reason: item.reason ?? "Bulk manual inventory adjustment",
              performedBy: userId,
            },
          });

          results.push(updated);
        } else {
          results.push(variant);
        }
      }

      return results;
    });
  }

  /**
   * Fetch all variants where stock is below the threshold level
   */
  static async getLowStock(sellerId?: string, threshold = 5) {
    const where: any = {
      stock: {
        lte: prisma.shopProductVariant.fields.lowStockThreshold,
      },
    };

    if (sellerId) {
      where.product = {
        sellerId,
      };
    }

    return prisma.shopProductVariant.findMany({
      where,
      include: {
        product: true,
      },
      orderBy: { stock: "asc" },
    });
  }

  /**
   * Retrieve full audit history logs for a variant or seller
   */
  static async getHistory(variantId?: string, sellerId?: string) {
    const where: any = {};
    if (variantId) where.variantId = variantId;
    if (sellerId) {
      where.product = {
        sellerId,
      };
    }

    return prisma.shopInventoryHistory.findMany({
      where,
      include: {
        product: true,
        variant: true,
        order: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
