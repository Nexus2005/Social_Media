import prisma from "@/lib/prisma";

export interface ComparisonResult {
  products: any[];
  commonFeatures: string[];
  differences: Record<string, any>;
  verdict: string;
}

export class ComparisonService {
  /**
   * AI product comparison (stub placeholder)
   * Fetches specs and formats a side-by-side structure.
   */
  static async compare(productIds: string[]): Promise<ComparisonResult> {
    console.log(`[AI Comparison Service] Comparing products: ${productIds.join(", ")}`);

    const products = await prisma.shopProduct.findMany({
      where: {
        id: { in: productIds },
        status: "PUBLISHED",
      },
      include: {
        images: true,
        variants: true,
        category: true,
      },
    });

    if (products.length === 0) {
      throw new Error("No products found for comparison");
    }

    // Stub mock values
    const commonFeatures = ["Brand Warranty", "Return Policy", "Standard Shipping"];
    const differences: Record<string, any> = {};

    // Gather unique specs
    for (const prod of products) {
      const specs = (prod.specifications as Record<string, any>) ?? {};
      for (const [key, val] of Object.entries(specs)) {
        if (!differences[key]) {
          differences[key] = {};
        }
        differences[key][prod.id] = val;
      }
    }

    return {
      products,
      commonFeatures,
      differences,
      verdict: "Based on specs and ratings, the highest rated item offers the best overall value.",
    };
  }
}
