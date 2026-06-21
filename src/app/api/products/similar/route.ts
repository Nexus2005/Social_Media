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

    // Score and rank candidates based on metadata overlap
    const scoredCandidates = candidates.map((item) => {
      let score = 0;

      // Color similarity (+3)
      if (
        targetProduct.color &&
        item.color &&
        targetProduct.color.toLowerCase() === item.color.toLowerCase()
      ) {
        score += 3;
      }

      // Style similarity (+2)
      if (
        targetProduct.style &&
        item.style &&
        targetProduct.style.toLowerCase() === item.style.toLowerCase()
      ) {
        score += 2;
      }

      // Material similarity (+2)
      if (
        targetProduct.material &&
        item.material &&
        targetProduct.material.toLowerCase() === item.material.toLowerCase()
      ) {
        score += 2;
      }

      // Keywords overlap (+1 per match)
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
