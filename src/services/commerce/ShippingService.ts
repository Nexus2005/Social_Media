import prisma from "@/lib/prisma";

export class ShippingService {
  /**
   * Determine the shipping cost dynamically based on order parameters and settings
   */
  static async calculateCost(params: {
    subtotal: number;
    hasFreeShippingCoupon: boolean;
    postalCode: string;
    freeDeliveryThreshold: number;
  }): Promise<number> {
    if (params.subtotal === 0) return 0;
    if (params.hasFreeShippingCoupon) return 0;

    // Fetch dynamic delivery fee setting from database
    const deliveryFeeSetting = await prisma.shopAdminSetting.findUnique({
      where: { key: "delivery_fee" }
    });
    const defaultDeliveryFee = deliveryFeeSetting ? parseFloat(deliveryFeeSetting.value) : 50; // default ₹50

    // Free delivery threshold check
    if (params.subtotal >= params.freeDeliveryThreshold) {
      return 0;
    }

    // Custom regional shipping cost factors
    if (params.postalCode.startsWith("422")) {
      // Local delivery in Nashik is cheaper
      return Math.round(defaultDeliveryFee * 0.6); // ₹30 local
    }

    return defaultDeliveryFee;
  }

  /**
   * Calculate shipping details including ETA date string and courier service type
   */
  static getDeliveryEstimate(postalCode: string) {
    const daysToAdd = postalCode.startsWith("422") ? 2 : 5; // Nashik is fast, outer areas take 5 days
    const etaDate = new Date();
    etaDate.setDate(etaDate.getDate() + daysToAdd);

    // Format like "Fri, 16 May" or similar
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const dayName = days[etaDate.getDay()];
    const monthName = months[etaDate.getMonth()];
    const dateNum = etaDate.getDate();

    return `${dayName}, ${dateNum} ${monthName}`;
  }
}
