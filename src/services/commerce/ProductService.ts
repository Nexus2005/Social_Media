import prisma from "@/lib/prisma";
import { ShopProductStatus, Prisma, ShopProduct } from "@/generated/client";

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w\-]+/g, "") // Remove all non-word chars
    .replace(/\-\-+/g, "-") // Replace multiple - with single -
    .replace(/^-+/, "") // Trim - from start of text
    .replace(/-+$/, ""); // Trim - from end of text
}

export interface ListProductsParams {
  categoryId?: string;
  brandId?: string;
  sellerId?: string;
  collectionId?: string;
  status?: ShopProductStatus;
  query?: string;
  minPrice?: number;
  maxPrice?: number;
  featured?: boolean;
  trending?: boolean;
  page?: number;
  limit?: number;
  orderBy?: "createdAt" | "price" | "salesCount" | "viewCount" | "title";
  orderDir?: "asc" | "desc";
}

export class ProductService {
  /**
   * List products with pagination and filtering.
   * Can be scoped to a seller's ID for dashboard security.
   */
  static async list(params: ListProductsParams) {
    const {
      categoryId,
      brandId,
      sellerId,
      collectionId,
      status,
      query,
      minPrice,
      maxPrice,
      featured,
      trending,
      page = 1,
      limit = 10,
      orderBy = "createdAt",
      orderDir = "desc",
    } = params;

    const skip = (page - 1) * limit;

    // Build filters
    const where: Prisma.ShopProductWhereInput = {};

    if (status) {
      where.status = status;
    } else {
      // By default, public listing only shows PUBLISHED items
      where.status = ShopProductStatus.PUBLISHED;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }
    if (brandId) {
      where.brandId = brandId;
    }
    if (sellerId) {
      where.sellerId = sellerId;
    }
    if (collectionId) {
      where.collections = {
        some: {
          collectionId: collectionId,
        },
      };
    }
    if (featured !== undefined) {
      where.featured = featured;
    }
    if (trending !== undefined) {
      where.trending = trending;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    if (query) {
      where.OR = [
        { title: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        { sku: { contains: query, mode: "insensitive" } },
      ];
    }

    // Get count and products
    const [total, items] = await Promise.all([
      prisma.shopProduct.count({ where }),
      prisma.shopProduct.findMany({
        where,
        include: {
          images: {
            orderBy: { displayOrder: "asc" },
          },
          variants: {
            include: {
              attributes: true,
            },
          },
          category: true,
          brand: true,
          seller: true,
        },
        orderBy: {
          [orderBy]: orderDir,
        },
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

  static async getById(id: string): Promise<ShopProduct | null> {
    return prisma.shopProduct.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: { displayOrder: "asc" },
        },
        variants: {
          include: {
            attributes: true,
          },
        },
        category: true,
        brand: true,
        seller: true,
      },
    });
  }

  static async getBySlug(slug: string): Promise<ShopProduct | null> {
    return prisma.shopProduct.findUnique({
      where: { slug },
      include: {
        images: {
          orderBy: { displayOrder: "asc" },
        },
        variants: {
          include: {
            attributes: true,
          },
        },
        category: true,
        brand: true,
        seller: true,
      },
    });
  }

  /**
   * Create a new product. Created as DRAFT by default.
   */
  static async create(
    sellerId: string,
    data: {
      title: string;
      description?: string;
      shortDescription?: string;
      price: number;
      salePrice?: number;
      costPrice?: number;
      sku?: string;
      barcode?: string;
      weight?: number;
      width?: number;
      height?: number;
      length?: number;
      brandId?: string;
      categoryId?: string;
      specifications?: any;
      features?: any;
      seoTitle?: string;
      seoDescription?: string;
      seoKeywords?: string;
      metaData?: any;
      images?: Array<{
        originalUrl: string;
        thumbnailUrl?: string;
        webpUrl?: string;
        blurHash?: string;
        alt?: string;
        width?: number;
        height?: number;
        displayOrder?: number;
      }>;
      variants?: Array<{
        title: string;
        sku?: string;
        barcode?: string;
        price: number;
        salePrice?: number;
        stock?: number;
        lowStockThreshold?: number;
        weight?: number;
        isDefault?: boolean;
        attributes?: Array<{ key: string; value: string }>;
      }>;
    }
  ) {
    const baseSlug = slugify(data.title);
    let slug = baseSlug;
    let count = 0;
    
    // Simple unique slug check
    while (await prisma.shopProduct.findUnique({ where: { slug } })) {
      count++;
      slug = `${baseSlug}-${count}`;
    }

    const { images, variants, ...productFields } = data;

    // Use transaction for consistency
    return prisma.$transaction(async (tx) => {
      const product = await tx.shopProduct.create({
        data: {
          ...productFields,
          slug,
          sellerId,
          status: ShopProductStatus.DRAFT,
        },
      });

      // Images
      if (images && images.length > 0) {
        await tx.shopProductImage.createMany({
          data: images.map((img, idx) => ({
            ...img,
            productId: product.id,
            displayOrder: img.displayOrder ?? idx,
          })),
        });
      }

      // Variants
      if (variants && variants.length > 0) {
        for (const variant of variants) {
          const { attributes, stock = 0, ...variantFields } = variant;
          const createdVariant = await tx.shopProductVariant.create({
            data: {
              ...variantFields,
              productId: product.id,
              stock,
            },
          });

          // Stock History Audit log
          if (stock > 0) {
            await tx.shopInventoryHistory.create({
              data: {
                productId: product.id,
                variantId: createdVariant.id,
                changeType: "ADDED",
                quantityBefore: 0,
                quantityAfter: stock,
                quantityDelta: stock,
                reason: "Initial product stock creation",
              },
            });
          }

          if (attributes && attributes.length > 0) {
            await tx.shopVariantAttribute.createMany({
              data: attributes.map((attr) => ({
                variantId: createdVariant.id,
                key: attr.key,
                value: attr.value,
              })),
            });
          }
        }
      } else {
        // Create a default single variant if none provided
        const defaultVariant = await tx.shopProductVariant.create({
          data: {
            productId: product.id,
            title: "Default",
            price: data.price,
            salePrice: data.salePrice,
            stock: 0,
            isDefault: true,
          },
        });
      }

      return product;
    });
  }

  /**
   * Update an existing product
   */
  static async update(
    id: string,
    data: {
      title?: string;
      description?: string;
      shortDescription?: string;
      price?: number;
      salePrice?: number;
      costPrice?: number;
      sku?: string;
      barcode?: string;
      weight?: number;
      width?: number;
      height?: number;
      length?: number;
      brandId?: string;
      categoryId?: string;
      specifications?: any;
      features?: any;
      seoTitle?: string;
      seoDescription?: string;
      seoKeywords?: string;
      metaData?: any;
      status?: ShopProductStatus;
      images?: Array<{
        id?: string;
        originalUrl: string;
        thumbnailUrl?: string;
        webpUrl?: string;
        blurHash?: string;
        alt?: string;
        width?: number;
        height?: number;
        displayOrder?: number;
      }>;
    }
  ) {
    const { images, ...productFields } = data;

    return prisma.$transaction(async (tx) => {
      // If updating status, run validation (moderation check)
      const currentProduct = await tx.shopProduct.findUnique({
        where: { id },
        select: { status: true },
      });

      if (!currentProduct) {
        throw new Error("Product not found");
      }

      const product = await tx.shopProduct.update({
        where: { id },
        data: productFields,
      });

      // Images updates
      if (images) {
        // Delete images not present in update
        const keepImageIds = images.filter((img) => img.id).map((img) => img.id!);
        await tx.shopProductImage.deleteMany({
          where: {
            productId: id,
            id: { notIn: keepImageIds },
          },
        });

        // Add new or update existing
        for (const [idx, img] of images.entries()) {
          if (img.id) {
            await tx.shopProductImage.update({
              where: { id: img.id },
              data: {
                originalUrl: img.originalUrl,
                thumbnailUrl: img.thumbnailUrl,
                webpUrl: img.webpUrl,
                blurHash: img.blurHash,
                alt: img.alt,
                width: img.width,
                height: img.height,
                displayOrder: img.displayOrder ?? idx,
              },
            });
          } else {
            await tx.shopProductImage.create({
              data: {
                productId: id,
                originalUrl: img.originalUrl,
                thumbnailUrl: img.thumbnailUrl,
                webpUrl: img.webpUrl,
                blurHash: img.blurHash,
                alt: img.alt,
                width: img.width,
                height: img.height,
                displayOrder: img.displayOrder ?? idx,
              },
            });
          }
        }
      }

      return product;
    });
  }

  /**
   * Moderation flow status transitions
   */
  static async submitForReview(id: string) {
    return prisma.shopProduct.update({
      where: { id },
      data: { status: ShopProductStatus.PENDING_REVIEW },
    });
  }

  static async approve(id: string) {
    return prisma.shopProduct.update({
      where: { id },
      data: {
        status: ShopProductStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });
  }

  static async requestChanges(id: string, notes: string) {
    return prisma.shopProduct.update({
      where: { id },
      data: {
        status: ShopProductStatus.CHANGES_REQUESTED,
        metaData: {
          moderatorNotes: notes,
        },
      },
    });
  }

  static async reject(id: string, reason: string) {
    return prisma.shopProduct.update({
      where: { id },
      data: {
        status: ShopProductStatus.REJECTED,
        metaData: {
          rejectReason: reason,
        },
      },
    });
  }

  static async archive(id: string) {
    return prisma.shopProduct.update({
      where: { id },
      data: { status: ShopProductStatus.ARCHIVED },
    });
  }

  static async delete(id: string) {
    // Soft delete/archive
    return this.archive(id);
  }
}
