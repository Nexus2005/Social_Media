import prisma from "@/lib/prisma";
import { NotificationPriority } from "@/generated/client";

export class NotificationService {
  /**
   * Send a commerce-related notification to a user
   */
  static async send(
    userId: string,
    data: {
      type: string;
      title: string;
      body?: string;
      icon?: string;
      actionUrl?: string;
      priority?: NotificationPriority;
      metadata?: any;
    }
  ) {
    return prisma.shopCommerceNotification.create({
      data: {
        userId,
        type: data.type,
        title: data.title,
        body: data.body,
        icon: data.icon,
        actionUrl: data.actionUrl,
        priority: data.priority ?? NotificationPriority.NORMAL,
        metadata: data.metadata ?? {},
        read: false,
      },
    });
  }

  static async list(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      prisma.shopCommerceNotification.count({ where: { userId } }),
      prisma.shopCommerceNotification.findMany({
        where: { userId },
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

  static async listUnread(userId: string) {
    return prisma.shopCommerceNotification.findMany({
      where: { userId, read: false },
      orderBy: { createdAt: "desc" },
    });
  }

  static async markRead(id: string) {
    return prisma.shopCommerceNotification.update({
      where: { id },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  static async markAllRead(userId: string) {
    return prisma.shopCommerceNotification.updateMany({
      where: { userId, read: false },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  static async delete(id: string) {
    return prisma.shopCommerceNotification.delete({
      where: { id },
    });
  }
}
