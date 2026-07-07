import prisma from "@/lib/prisma";
import { CouponService } from "./CouponService";
import { ShippingService } from "./ShippingService";

export class PricingService {
  /**
   * Calculate all pricing details for a given cart, using database transactions
   */
  static async calculateCartTotals(cartId: string) {
    const cart = await prisma.shopCart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: {
            product: true,
            variant: {
              include: {
                product: true
              }
            }
          }
        },
        coupon: true
      }
    });

    if (!cart) {
      throw new Error("Cart not found");
    }

    // Fetch dynamic admin settings for platform fee and tax rate
    const settings = await prisma.shopAdminSetting.findMany({
      where: {
        key: {
          in: ["platform_fee", "tax_rate", "free_delivery_threshold"]
        }
      }
    });

    const settingsMap = new Map(settings.map(s => [s.key, s.value]));
    const platformFeeSetting = settingsMap.get("platform_fee");
    const taxRateSetting = settingsMap.get("tax_rate");
    const freeDeliverySetting = settingsMap.get("free_delivery_threshold");

    const platformFee = platformFeeSetting ? parseFloat(platformFeeSetting) : 10; // default ₹10
    const taxRatePercent = taxRateSetting ? parseFloat(taxRateSetting) : 18; // default 18% GST
    const freeDeliveryThreshold = freeDeliverySetting ? parseFloat(freeDeliverySetting) : 1000; // default ₹1000

    let totalMrp = 0;
    let subtotal = 0; // selected items sale price subtotal
    let discountOnMrp = 0; // MRP - Sale Price savings

    // Separate selected and non-selected items
    const selectedItems = cart.items.filter(item => item.selected);

    for (const item of selectedItems) {
      const liveProduct = item.product;
      const liveVariant = item.variant;

      // Base original price (MRP)
      const mrp = liveVariant ? (liveVariant.price || liveProduct.price) : liveProduct.price;
      // Sale price (current price)
      const currentPrice = item.snapPrice ?? (liveVariant ? (liveVariant.salePrice ?? liveVariant.price) : (liveProduct.salePrice ?? liveProduct.price));

      totalMrp += mrp * item.quantity;
      subtotal += currentPrice * item.quantity;
      discountOnMrp += Math.max(0, mrp - currentPrice) * item.quantity;
    }

    // Calculate coupon discount
    let couponDiscount = 0;
    let isCouponEligible = false;

    if (cart.coupon && selectedItems.length > 0) {
      const coupon = cart.coupon;
      eligible_check: {
        if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
          break eligible_check;
        }

        // Expiry check
        const now = new Date();
        if (coupon.startAt && coupon.startAt > now) break eligible_check;
        if (coupon.endAt && coupon.endAt < now) break eligible_check;
        if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) break eligible_check;

        isCouponEligible = true;

        if (coupon.type === "PERCENTAGE") {
          couponDiscount = (subtotal * coupon.value) / 100;
          if (coupon.maxDiscountAmount && couponDiscount > coupon.maxDiscountAmount) {
            couponDiscount = coupon.maxDiscountAmount;
          }
        } else if (coupon.type === "FIXED") {
          couponDiscount = Math.min(subtotal, coupon.value);
        }
      }
    }

    // Round coupon discount
    couponDiscount = Math.round(couponDiscount * 100) / 100;

    // Calculate shipping costs using ShippingService
    const shippingAddress = cart.userId 
      ? await prisma.shopAddress.findFirst({ where: { userId: cart.userId, isDefault: true } })
      : null;

    const shippingCharge = await ShippingService.calculateCost({
      subtotal,
      hasFreeShippingCoupon: cart.coupon?.type === "FREE_SHIPPING" && isCouponEligible,
      postalCode: shippingAddress?.postalCode || "422001",
      freeDeliveryThreshold
    });

    // Calculate tax (GST) on the discounted subtotal
    const taxableAmount = Math.max(0, subtotal - couponDiscount);
    const taxTotal = Math.round((taxableAmount * (taxRatePercent / 100)) * 100) / 100;

    // Final total calculation
    const finalTotal = Math.max(0, taxableAmount + shippingCharge + taxTotal + (selectedItems.length > 0 ? platformFee : 0));
    
    // Total savings
    const totalSavings = discountOnMrp + couponDiscount;

    return {
      totalMrp: Math.round(totalMrp * 100) / 100,
      subtotal: Math.round(subtotal * 100) / 100,
      discountOnMrp: Math.round(discountOnMrp * 100) / 100,
      couponDiscount: Math.round(couponDiscount * 100) / 100,
      discountTotal: Math.round(couponDiscount * 100) / 100,
      shippingTotal: Math.round(shippingCharge * 100) / 100,
      taxTotal: Math.round(taxTotal * 100) / 100,
      platformFee: selectedItems.length > 0 ? platformFee : 0,
      total: Math.round(finalTotal * 100) / 100,
      savings: Math.round(totalSavings * 100) / 100,
      itemsCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
      selectedItemsCount: selectedItems.reduce((sum, item) => sum + item.quantity, 0)
    };
  }
}
