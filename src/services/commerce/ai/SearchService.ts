import prisma from "@/lib/prisma";

export interface SearchFilters {
  categoryId?: string;
  brandId?: string;
  minPrice?: number;
  maxPrice?: number;
}

export class SearchService {
  /**
   * AI/Semantic search interface (stub placeholder)
   * Falls back to full-text or prefix matching search.
   */
  static async search(query: string, filters?: SearchFilters, limit = 10) {
    console.log(`[AI Search Service] Processing semantic query: "${query}"`);
    
    // Standard keyword match fallback
    const where: any = {
      status: "PUBLISHED",
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ],
    };

    if (filters) {
      if (filters.categoryId) where.categoryId = filters.categoryId;
      if (filters.brandId) where.brandId = filters.brandId;
      if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
        where.price = {};
        if (filters.minPrice !== undefined) where.price.gte = filters.minPrice;
        if (filters.maxPrice !== undefined) where.price.lte = filters.maxPrice;
      }
    }

    return prisma.shopProduct.findMany({
      where,
      include: {
        images: {
          orderBy: { displayOrder: "asc" },
        },
        variants: true,
      },
      take: limit,
    });
  }
}
