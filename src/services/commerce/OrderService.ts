import prisma from "@/lib/prisma";
import { ShopOrderStatus, RefundStatus, Prisma } from "@/generated/client";
import { CartService } from "./CartService";
import { InventoryService } from "./InventoryService";

export interface ListOrdersParams {
  userId?: string;
  sellerId?: string;
  status?: ShopOrderStatus;
  page?: number;
  limit?: number;
}

export class OrderService {
  /**
   * Place an order from a cart. Creates Order + OrderItems, decrements stock via InventoryService,
   * updates coupon usage, tracks analytics event, and clears cart.
   */
  static async create(
    cartId: string,
    shippingAddressId: string,
    userId: string,
    notes?: string
  ) {
    // 1. Fetch cart
    const cart = await prisma.shopCart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: {
                  orderBy: { displayOrder: "asc" },
                },
              },
            },
            variant: true,
          },
        },
        coupon: true,
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new Error("Cart is empty or does not exist");
    }

    // 2. Validate all variant stocks before transaction
    for (const item of cart.items) {
      const variant = item.variant;
      if (!variant) {
        throw new Error(`Product ${item.product.title} has no selected variant`);
      }
      if (variant.stock < item.quantity) {
        throw new Error(`Product ${item.product.title} (${variant.title}) has insufficient stock. Available: ${variant.stock}`);
      }
    }

    // 3. Calculate totals
    const totals = await CartService.calculateTotals(cartId);

    // 4. Group items by seller so we can handle marketplace multi-seller structures
    // For simple structure, we can create one order per seller, or one platform order.
    // The implementation plan says ShopOrder has userId, sellerId? (nullable). Let's group by seller or assign dominant sellerId.
    // Let's create a single order. If items belong to multiple sellers, we can split them or associate to dominant seller.
    // Let's associate the sellerId of the first item to keep things simple or support single seller orders.
    const sellerId = cart.items[0]?.product.sellerId ?? null;

    // Use transaction for atomic checkout
    return prisma.$transaction(async (tx) => {
      // Create the order
      const order = await tx.shopOrder.create({
        data: {
          userId,
          sellerId,
          subtotal: totals.subtotal,
          shippingTotal: totals.shippingTotal,
          taxTotal: totals.taxTotal,
          discountTotal: totals.discountTotal,
          total: totals.total,
          status: ShopOrderStatus.PENDING,
          shippingAddressId,
          notes,
        },
      });

      // Create order items
      for (const item of cart.items) {
        const variant = item.variant!;
        const price = variant.salePrice ?? variant.price;
        const thumbnail = item.product.images[0]?.thumbnailUrl ?? item.product.images[0]?.originalUrl ?? null;

        await tx.shopOrderItem.create({
          data: {
            orderId: order.id,
            productId: item.productId,
            variantId: variant.id,
            productTitle: item.product.title,
            variantTitle: variant.title,
            thumbnailUrl: thumbnail,
            quantity: item.quantity,
            unitPrice: price,
            totalPrice: price * item.quantity,
          },
        });

        // Deduct inventory & record history
        await tx.shopProductVariant.update({
          where: { id: variant.id },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });

        await tx.shopInventoryHistory.create({
          data: {
            productId: item.productId,
            variantId: variant.id,
            changeType: "SOLD",
            quantityBefore: variant.stock,
            quantityAfter: variant.stock - item.quantity,
            quantityDelta: -item.quantity,
            reason: `Order placed #${order.id}`,
            orderId: order.id,
          },
        });

        // Increment product sales count
        await tx.shopProduct.update({
          where: { id: item.productId },
          data: {
            salesCount: {
              increment: item.quantity,
            },
          },
        });
      }

      // If coupon used, increment its usage count
      if (cart.couponId) {
        await tx.shopCoupon.update({
          where: { id: cart.couponId },
          data: {
            usedCount: {
              increment: 1,
            },
          },
        });
      }

      // Create commerce notification for user
      await tx.shopCommerceNotification.create({
        data: {
          userId,
          type: "ORDER_PLACED",
          title: "Order Placed Successfully",
          body: `Thank you for shopping! Your order is placed and is pending confirmation.`,
          actionUrl: `/shop/orders/${order.id}`,
          priority: "NORMAL",
        },
      });

      // Create analytics events for purchase
      await tx.shopAnalyticsEvent.create({
        data: {
          eventType: "PURCHASE",
          userId,
          revenue: totals.total,
          metadata: {
            orderId: order.id,
            itemsCount: totals.itemsCount,
          },
        },
      });

      // Clear the cart
      await tx.shopCartItem.deleteMany({
        where: { cartId },
      });

      return order;
    });
  }

  static async getById(id: string) {
    return prisma.shopOrder.findUnique({
      where: { id },
      include: {
        user: true,
        seller: true,
        shippingAddress: true,
        items: {
          include: {
            product: {
              include: {
                images: {
                  orderBy: { displayOrder: "asc" },
                },
              },
            },
            variant: true,
          },
        },
      },
    });
  }

  static async list(params: ListOrdersParams) {
    const { userId, sellerId, status, page = 1, limit = 10 } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.ShopOrderWhereInput = {};

    if (userId) where.userId = userId;
    if (sellerId) where.sellerId = sellerId;
    if (status) where.status = status;

    const [total, items] = await Promise.all([
      prisma.shopOrder.count({ where }),
      prisma.shopOrder.findMany({
        where,
        include: {
          user: true,
          shippingAddress: true,
          items: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update order status
   */
  static async updateStatus(id: string, status: ShopOrderStatus, metadata?: any) {
    const order = await prisma.shopOrder.findUnique({
      where: { id },
    });

    if (!order) {
      throw new Error("Order not found");
    }

    const updatedOrder = await prisma.shopOrder.update({
      where: { id },
      data: { status },
    });

    // Send notifications based on status updates
    let notificationTitle = "";
    let notificationBody = "";

    switch (status) {
      case ShopOrderStatus.CONFIRMED:
        notificationTitle = "Order Confirmed";
        notificationBody = `Your order has been confirmed by the seller.`;
        break;
      case ShopOrderStatus.PACKED:
        notificationTitle = "Order Packed";
        notificationBody = `Your order is packed and ready to ship.`;
        break;
      case ShopOrderStatus.SHIPPED:
        notificationTitle = "Order Shipped";
        notificationBody = `Your order has been shipped! Tracking details will be available soon.`;
        break;
      case ShopOrderStatus.DELIVERED:
        notificationTitle = "Order Delivered";
        notificationBody = `Your order has been delivered. Enjoy your purchase!`;
        await prisma.shopOrder.update({
          where: { id },
          data: { deliveredAt: new Date() },
        });
        break;
      case ShopOrderStatus.CANCELLED:
        notificationTitle = "Order Cancelled";
        notificationBody = `Your order has been cancelled.`;
        await prisma.shopOrder.update({
          where: { id },
          data: { cancelledAt: new Date() },
        });
        break;
    }

    if (notificationTitle) {
      await prisma.shopCommerceNotification.create({
        data: {
          userId: order.userId,
          type: `ORDER_${status}`,
          title: notificationTitle,
          body: notificationBody,
          actionUrl: `/shop/orders/${order.id}`,
        },
      });
    }

    return updatedOrder;
  }

  /**
   * Update shipping tracking details
   */
  static async updateTracking(
    id: string,
    trackingNumber: string,
    courier: string,
    estimatedDelivery?: Date
  ) {
    const order = await prisma.shopOrder.findUnique({
      where: { id },
    });

    if (!order) {
      throw new Error("Order not found");
    }

    const updatedOrder = await prisma.shopOrder.update({
      where: { id },
      data: {
        trackingNumber,
        courier,
        estimatedDeliveryAt: estimatedDelivery,
        status: ShopOrderStatus.SHIPPED,
      },
    });

    await prisma.shopCommerceNotification.create({
      data: {
        userId: order.userId,
        type: "ORDER_SHIPPED",
        title: "Order Shipped & Trackable",
        body: `Your order is shipped via ${courier}. Tracking #: ${trackingNumber}`,
        actionUrl: `/shop/orders/${order.id}`,
      },
    });

    return updatedOrder;
  }

  /**
   * Cancel an order
   */
  static async cancel(id: string, reason: string, performedByUserId?: string) {
    const order = await prisma.shopOrder.findUnique({
      where: { id },
      include: { items: { include: { variant: true } } },
    });

    if (!order) {
      throw new Error("Order not found");
    }

    if (([ShopOrderStatus.DELIVERED, ShopOrderStatus.CANCELLED, ShopOrderStatus.REFUNDED] as ShopOrderStatus[]).includes(order.status)) {
      throw new Error(`Cannot cancel order in ${order.status} state`);
    }

    return prisma.$transaction(async (tx) => {
      // 1. Restore stock & write audit trails
      for (const item of order.items) {
        if (item.variantId) {
          const currentVariant = await tx.shopProductVariant.findUnique({
            where: { id: item.variantId },
            select: { stock: true },
          });

          const stockBefore = currentVariant?.stock ?? 0;

          await tx.shopProductVariant.update({
            where: { id: item.variantId },
            data: {
              stock: {
                increment: item.quantity,
              },
            },
          });

          await tx.shopInventoryHistory.create({
            data: {
              productId: item.productId,
              variantId: item.variantId,
              changeType: "RETURNED",
              quantityBefore: stockBefore,
              quantityAfter: stockBefore + item.quantity,
              quantityDelta: item.quantity,
              reason: `Order cancelled: ${reason}`,
              orderId: order.id,
              performedBy: performedByUserId,
            },
          });
        }
      }

      // 2. Update order
      const cancelledOrder = await tx.shopOrder.update({
        where: { id },
        data: {
          status: ShopOrderStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelReason: reason,
        },
      });

      // 3. Notify user
      await tx.shopCommerceNotification.create({
        data: {
          userId: order.userId,
          type: "ORDER_CANCELLED",
          title: "Order Cancelled",
          body: `Your order has been cancelled. Reason: ${reason}`,
          actionUrl: `/shop/orders/${order.id}`,
        },
      });

      return cancelledOrder;
    });
  }

  /**
   * Request/process refund
   */
  static async requestRefund(id: string, amount?: number, reason?: string) {
    const order = await prisma.shopOrder.findUnique({
      where: { id },
    });

    if (!order) {
      throw new Error("Order not found");
    }

    const refundAmount = amount ?? order.total;

    const updatedOrder = await prisma.shopOrder.update({
      where: { id },
      data: {
        refundStatus: RefundStatus.REQUESTED,
        refundAmount,
        notes: order.notes ? `${order.notes}\n[Refund requested for ${refundAmount}. Reason: ${reason}]` : `[Refund requested for ${refundAmount}. Reason: ${reason}]`,
      },
    });

    await prisma.shopCommerceNotification.create({
      data: {
        userId: order.userId,
        type: "REFUND_REQUESTED",
        title: "Refund Request Received",
        body: `We have received your refund request for ${refundAmount}. It is under process.`,
        actionUrl: `/shop/orders/${order.id}`,
      },
    });

    return updatedOrder;
  }
}
