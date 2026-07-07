import prisma from "@/lib/prisma";
import { UserRole, UserRoleEnum, ShopSeller } from "@/generated/client";

export class CommercePermissionError extends Error {
  constructor(message = "Unauthorized access to commerce resource") {
    super(message);
    this.name = "CommercePermissionError";
  }
}

/**
 * Verifies if a user has at least one of the specified roles.
 * Supports checking roles assigned in UserRole model.
 */
export async function requireRole(userId: string, allowedRoles: UserRoleEnum[]): Promise<UserRole> {
  if (!userId) {
    throw new CommercePermissionError("User ID is required");
  }

  const roleRecord = await prisma.userRole.findFirst({
    where: {
      userId,
      role: {
        in: allowedRoles,
      },
    },
  });

  if (!roleRecord) {
    throw new CommercePermissionError(`Access denied. Requires one of the following roles: ${allowedRoles.join(", ")}`);
  }

  return roleRecord;
}

/**
 * Verifies if a user is an approved seller and returns their seller profile.
 */
export async function requireSeller(userId: string): Promise<ShopSeller> {
  if (!userId) {
    throw new CommercePermissionError("User ID is required");
  }

  const seller = await prisma.shopSeller.findUnique({
    where: { userId },
  });

  if (!seller) {
    throw new CommercePermissionError("Seller profile not found for this user");
  }

  if (seller.status !== "APPROVED") {
    throw new CommercePermissionError(`Seller store is current status: ${seller.status}. Access denied.`);
  }

  return seller;
}

/**
 * Checks if a user is authorized to modify a specific product.
 * Returns true if the user is an admin, or is the seller who owns the product.
 */
export async function requireProductOwnership(userId: string, productId: string): Promise<void> {
  // Check if super admin or admin first
  const isAdmin = await prisma.userRole.findFirst({
    where: {
      userId,
      role: {
        in: [UserRoleEnum.SUPER_ADMIN, UserRoleEnum.ADMIN],
      },
    },
  });

  if (isAdmin) {
    return; // Admin can manage any product
  }

  // Otherwise, must be the seller who owns the product
  const seller = await prisma.shopSeller.findUnique({
    where: { userId },
  });

  if (!seller || seller.status !== "APPROVED") {
    throw new CommercePermissionError("Seller account is not approved or does not exist");
  }

  const product = await prisma.shopProduct.findUnique({
    where: { id: productId },
    select: { sellerId: true },
  });

  if (!product) {
    throw new CommercePermissionError("Product not found");
  }

  if (product.sellerId !== seller.id) {
    throw new CommercePermissionError("You do not own this product");
  }
}

/**
 * Checks if a user is authorized to access or modify a specific order.
 * Authorized if:
 * 1. Admin/Support
 * 2. User who placed the order (customer)
 * 3. Seller who owns the store for the order items
 */
export async function requireOrderAccess(userId: string, orderId: string): Promise<void> {
  // Check if admin or support
  const isAdminOrSupport = await prisma.userRole.findFirst({
    where: {
      userId,
      role: {
        in: [UserRoleEnum.SUPER_ADMIN, UserRoleEnum.ADMIN, UserRoleEnum.SUPPORT],
      },
    },
  });

  if (isAdminOrSupport) {
    return;
  }

  const order = await prisma.shopOrder.findUnique({
    where: { id: orderId },
    select: { userId: true, sellerId: true },
  });

  if (!order) {
    throw new CommercePermissionError("Order not found");
  }

  // Check if user is the customer
  if (order.userId === userId) {
    return;
  }

  // Check if user is the seller for the order
  const seller = await prisma.shopSeller.findUnique({
    where: { userId },
  });

  if (seller && order.sellerId === seller.id) {
    return;
  }

  throw new CommercePermissionError("You do not have permission to access this order");
}
