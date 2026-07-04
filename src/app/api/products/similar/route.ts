import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const productId = req.nextUrl.searchParams.get("productId");
    if (!productId) {
      return Response.json({ error: "Missing productId parameter" }, { status: 400 });
    }

    const targetProduct = await prisma.detectedProduct.findUnique({
      where: { id: productId },
    });

    if (!targetProduct) {
      return Response.json({ error: "Product not found" }, { status: 404 });
    }

    // Fetch up to 50 candidates in the same category
    const candidates = await prisma.detectedProduct.findMany({
      where: {
        category: targetProduct.category,
        id: { not: targetProduct.id },
      },
      include: {
        matches: true,
      },
      take: 50,
    });

    const getProductPrice = (p: any): number | null => {
      if (!p.matches || p.matches.length === 0) return null;
      const match = p.matches[0];
      const matchPrice = parseFloat(match.price.replace(/[^0-9.]/g, ""));
      return isNaN(matchPrice) ? null : matchPrice;
    };

    const getProductBrand = (p: any): string => {
      if (p.brand) return p.brand.toLowerCase().trim();
      if (p.matches && p.matches.length > 0) {
        return (p.matches[0].matchBrand || "").toLowerCase().trim();
      }
      return "";
    };

    const cosineSimilarity = (vecA: any, vecB: any): number => {
      if (!Array.isArray(vecA) || !Array.isArray(vecB) || vecA.length !== vecB.length || vecA.length === 0) {
        return 0;
      }
      let dot = 0.0;
      let normA = 0.0;
      let normB = 0.0;
      for (let i = 0; i < vecA.length; i++) {
        dot += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
      }
      if (normA === 0 || normB === 0) return 0;
      return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    };

    const targetPrice = getProductPrice(targetProduct);
    const targetBrand = getProductBrand(targetProduct);

    // Score and rank candidates based on metadata overlap
    const scoredCandidates = candidates.map((item) => {
      let score = 0;

      // 1. Brand match (+5 points)
      const itemBrand = getProductBrand(item);
      if (targetBrand && itemBrand && targetBrand === itemBrand) {
        score += 5;
      }

      // 2. Price range overlap within 25% (+4 points)
      const itemPrice = getProductPrice(item);
      if (targetPrice !== null && itemPrice !== null) {
        const diffPercent = Math.abs(targetPrice - itemPrice) / targetPrice;
        if (diffPercent <= 0.25) {
          score += 4;
        }
      }

      // 3. Color similarity (+3 points)
      if (
        targetProduct.color &&
        item.color &&
        targetProduct.color.toLowerCase() === item.color.toLowerCase()
      ) {
        score += 3;
      }

      // 4. Material similarity (+3 points)
      if (
        targetProduct.material &&
        item.material &&
        targetProduct.material.toLowerCase() === item.material.toLowerCase()
      ) {
        score += 3;
      }

      // 5. Embedding similarity (up to +10 points)
      if (targetProduct.productEmbedding && item.productEmbedding) {
        const similarity = cosineSimilarity(targetProduct.productEmbedding, item.productEmbedding);
        score += Math.round(similarity * 10);
      }

      // 6. Keywords overlap (+1 per match)
      if (
        Array.isArray(targetProduct.keywords) &&
        Array.isArray(item.keywords)
      ) {
        const targetKeys = new Set(targetProduct.keywords.map((k) => k.toLowerCase()));
        item.keywords.forEach((keyword) => {
          if (targetKeys.has(keyword.toLowerCase())) {
            score += 1;
          }
        });
      }

      return {
        product: item,
        score,
      };
    });

    // Sort by score desc, then by date desc
    const sorted = scoredCandidates
      .sort((a, b) => b.score - a.score || b.product.createdAt.getTime() - a.product.createdAt.getTime())
      .map((item) => item.product)
      .slice(0, 5);

    return Response.json(sorted);
  } catch (error) {
    console.error("Error in similar products API:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
