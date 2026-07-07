import prisma from "@/lib/prisma";
import { slugify } from "./ProductService";

export class CollectionService {
  static async list() {
    return prisma.shopCollection.findMany({
      orderBy: { order: "asc" },
      include: {
        products: {
          include: {
            product: {
              include: {
                images: {
                  orderBy: { displayOrder: "asc" },
                },
              },
            },
          },
          orderBy: { order: "asc" },
        },
      },
    });
  }

  static async getById(id: string) {
    return prisma.shopCollection.findUnique({
      where: { id },
      include: {
        products: {
          include: {
            product: {
              include: {
                images: {
                  orderBy: { displayOrder: "asc" },
                },
                variants: true,
              },
            },
          },
          orderBy: { order: "asc" },
        },
      },
    });
  }

  static async getBySlug(slug: string) {
    return prisma.shopCollection.findUnique({
      where: { slug },
      include: {
        products: {
          include: {
            product: {
              include: {
                images: {
                  orderBy: { displayOrder: "asc" },
                },
                variants: true,
              },
            },
          },
          orderBy: { order: "asc" },
        },
      },
    });
  }

  static async create(data: {
    name: string;
    description?: string;
    imageUrl?: string;
    active?: boolean;
    order?: number;
  }) {
    const baseSlug = slugify(data.name);
    let slug = baseSlug;
    let count = 0;
    while (await prisma.shopCollection.findUnique({ where: { slug } })) {
      count++;
      slug = `${baseSlug}-${count}`;
    }

    return prisma.shopCollection.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        imageUrl: data.imageUrl,
        active: data.active ?? true,
        order: data.order ?? 0,
      },
    });
  }

  static async update(
    id: string,
    data: {
      name?: string;
      description?: string;
      imageUrl?: string;
      active?: boolean;
      order?: number;
    }
  ) {
    const updateData: any = { ...data };

    if (data.name) {
      const baseSlug = slugify(data.name);
      let slug = baseSlug;
      let count = 0;
      const current = await prisma.shopCollection.findUnique({ where: { id } });
      if (current && current.name !== data.name) {
        while (await prisma.shopCollection.findFirst({ where: { slug, id: { not: id } } })) {
          count++;
          slug = `${baseSlug}-${count}`;
        }
        updateData.slug = slug;
      }
    }

    return prisma.shopCollection.update({
      where: { id },
      data: updateData,
    });
  }

  static async delete(id: string) {
    return prisma.shopCollection.delete({
      where: { id },
    });
  }

  /**
   * Add a product to a collection
   */
  static async addProduct(collectionId: string, productId: string, order = 0) {
    return prisma.shopCollectionProduct.upsert({
      where: {
        collectionId_productId: {
          collectionId,
          productId,
        },
      },
      create: {
        collectionId,
        productId,
        order,
      },
      update: {
        order,
      },
    });
  }

  /**
   * Remove a product from a collection
   */
  static async removeProduct(collectionId: string, productId: string) {
    return prisma.shopCollectionProduct.delete({
      where: {
        collectionId_productId: {
          collectionId,
          productId,
        },
      },
    });
  }
}
