import sharp from "sharp";
import prisma from "../prisma";
import { CropEvidence } from "./detectionPipeline";
import { MarketplaceProduct } from "../marketplace/types";

export interface MemoryMatchResult {
  isMatch: boolean;
  evidence: CropEvidence;
  matches: MarketplaceProduct[];
  confidence: number;
}

export class ProductMemoryProvider {
  /**
   * Compute dHash fingerprint for a crop buffer.
   */
  static async computeDHash(buffer: Buffer): Promise<string | null> {
    try {
      const raw = await sharp(buffer)
        .resize(9, 8, { fit: "fill" })
        .grayscale()
        .raw()
        .toBuffer();

      let hash = "";
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const left = raw[row * 9 + col];
          const right = raw[row * 9 + col + 1];
          hash += left < right ? "1" : "0";
        }
      }
      let hex = "";
      for (let i = 0; i < hash.length; i += 4) {
        hex += parseInt(hash.slice(i, i + 4), 2).toString(16);
      }
      return hex;
    } catch {
      return null;
    }
  }

  /**
   * Calculate Hamming distance between two hex hashes.
   */
  static getHammingDistance(h1: string, h2: string): number {
    if (h1.length !== h2.length) return 999;
    let dist = 0;
    for (let i = 0; i < h1.length; i++) {
      const a = parseInt(h1[i], 16);
      const b = parseInt(h2[i], 16);
      let xor = a ^ b;
      while (xor > 0) {
        dist += xor & 1;
        xor >>= 1;
      }
    }
    return dist;
  }

  /**
   * Attempt to find a visually matching product in the database.
   */
  static async findMatch(cropBuffer: Buffer): Promise<MemoryMatchResult> {
    const startTime = Date.now();
    const dHash = await this.computeDHash(cropBuffer);
    if (!dHash) {
      return { isMatch: false, evidence: {} as any, matches: [], confidence: 0 };
    }

    try {
      // Query all verified products. We cast to any[] to avoid Generated Client type issues.
      const candidates = (await prisma.detectedProduct.findMany({
        where: {
          isVerifiedMatch: true,
        },
        include: {
          matches: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 100, // Look at the last 100 verified products
      })) as any[];

      for (const cand of candidates) {
        const breakdown = cand.confidenceBreakdown as any;
        if (!breakdown || !breakdown.dHash) continue;

        const distance = this.getHammingDistance(dHash, breakdown.dHash);
        if (distance <= 3) {
          console.log(`[ProductMemory] HIT! Visual match found (Hamming distance: ${distance})`);
          console.log(`  ├─ Reusing: "${cand.label}" (Category: ${cand.category}, Brand: ${cand.brand || "none"})`);

          // Construct CropEvidence from matching product
          const evidence: CropEvidence = {
            yoloLabel: cand.category,
            yoloConfidence: cand.confidence || 0.85,
            isShoppableCategory: true,
            logo: cand.detectedLogo || cand.brand || null,
            logoConfidence: cand.detectedLogo ? 0.90 : 0,
            ocrText: cand.ocrText || "",
            meaningfulOcrWords: cand.ocrText ? cand.ocrText.split(/\s+/).length : 0,
            ocrPreview: cand.ocrText ? cand.ocrText.slice(0, 30) : "",
            barcode: cand.detectedBarcode || null,
            colorDetected: cand.color || "unknown",
            materialDetected: cand.material || "unknown",
            shapeCategory: null,
            frameAppearances: cand.frameAppearances || 1,
            cropQuality: {
              score: cand.cropQualityScore || 0.85,
              pass: true,
              breakdown: { size: 0.85, blur: 0.85, brightness: 0.85, edges: 0.85 },
            },
            gender: cand.gender || undefined,
            brand: cand.brand || undefined,
          };

          // Map db ShoppingMatch items back to MarketplaceProduct structures
          const matches: MarketplaceProduct[] = (cand.matches || []).map((m: any) => ({
            title: m.title,
            price: m.price,
            numericPrice: m.price ? parseFloat(m.price.replace(/[^0-9.]/g, "")) || 0 : 0,
            currency: m.currency || "USD",
            merchant: m.sourceStore,
            thumbnail: m.imageUrl,
            link: m.productUrl,
            brand: m.matchBrand || undefined,
            description: m.matchDescription || undefined,
            galleryImageUrls: m.galleryImageUrls && m.galleryImageUrls.length > 0 ? m.galleryImageUrls : undefined,
            originalPrice: m.originalPrice || undefined,
            discountPercent: m.discountPercent || undefined,
            sellerName: m.sellerName || undefined,
            sellerRating: m.sellerRating || undefined,
            sellerReviews: m.sellerReviews || undefined,
            shippingCost: m.shippingCost || undefined,
            shippingInfo: m.shippingInfo || undefined,
          }));

          const latency = Date.now() - startTime;
          console.log(`  └─ Product memory retrieval completed in ${latency}ms`);

          return {
            isMatch: true,
            evidence,
            matches,
            confidence: cand.confidence || 0.85,
          };
        }
      }
    } catch (err) {
      console.warn("[ProductMemory] Error looking up memory match:", err);
    }

    return { isMatch: false, evidence: {} as any, matches: [], confidence: 0 };
  }
}
