import prisma from "@/lib/prisma";
import { ShopCategory } from "@/generated/client";
import { slugify } from "./ProductService";

export interface CategoryNode extends ShopCategory {
  children: CategoryNode[];
}

export class CategoryService {
  static async list() {
    return prisma.shopCategory.findMany({
      orderBy: { order: "asc" },
      include: {
        parent: true,
      },
    });
  }

  static async getById(id: string) {
    return prisma.shopCategory.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
      },
    });
  }

  static async getBySlug(slug: string) {
    return prisma.shopCategory.findUnique({
      where: { slug },
      include: {
        parent: true,
        children: true,
      },
    });
  }

  /**
   * Return hierarchical tree of categories
   */
  static async tree(): Promise<CategoryNode[]> {
    const categories = await prisma.shopCategory.findMany({
      where: { active: true },
      orderBy: { order: "asc" },
    });

    const categoryMap = new Map<string, CategoryNode>();
    const roots: CategoryNode[] = [];

    // Initialize map
    for (const cat of categories) {
      categoryMap.set(cat.id, { ...cat, children: [] });
    }

    // Build hierarchy tree
    for (const cat of categories) {
      const node = categoryMap.get(cat.id)!;
      if (cat.parentId && categoryMap.has(cat.parentId)) {
        const parentNode = categoryMap.get(cat.parentId)!;
        parentNode.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  static async create(data: {
    name: string;
    description?: string;
    imageUrl?: string;
    iconUrl?: string;
    parentId?: string | null;
    order?: number;
    active?: boolean;
  }) {
    const baseSlug = slugify(data.name);
    let slug = baseSlug;
    let count = 0;
    while (await prisma.shopCategory.findUnique({ where: { slug } })) {
      count++;
      slug = `${baseSlug}-${count}`;
    }

    return prisma.shopCategory.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        imageUrl: data.imageUrl,
        iconUrl: data.iconUrl,
        parentId: data.parentId || null,
        order: data.order ?? 0,
        active: data.active ?? true,
      },
    });
  }

  static async update(
    id: string,
    data: {
      name?: string;
      description?: string;
      imageUrl?: string;
      iconUrl?: string;
      parentId?: string | null;
      order?: number;
      active?: boolean;
    }
  ) {
    const updateData: any = { ...data };

    if (data.name) {
      const baseSlug = slugify(data.name);
      let slug = baseSlug;
      let count = 0;
      // Ensure unique slug
      const current = await prisma.shopCategory.findUnique({ where: { id } });
      if (current && current.name !== data.name) {
        while (await prisma.shopCategory.findFirst({ where: { slug, id: { not: id } } })) {
          count++;
          slug = `${baseSlug}-${count}`;
        }
        updateData.slug = slug;
      }
    }

    return prisma.shopCategory.update({
      where: { id },
      data: updateData,
    });
  }

  static async delete(id: string) {
    // Check if children exist first
    const hasChildren = await prisma.shopCategory.findFirst({
      where: { parentId: id },
    });

    if (hasChildren) {
      throw new Error("Cannot delete category with sub-categories. Re-assign sub-categories first.");
    }

    // Check if products exist in category
    const hasProducts = await prisma.shopProduct.findFirst({
      where: { categoryId: id },
    });

    if (hasProducts) {
      throw new Error("Cannot delete category containing products. Re-assign products first.");
    }

    return prisma.shopCategory.delete({
      where: { id },
    });
  }
}
