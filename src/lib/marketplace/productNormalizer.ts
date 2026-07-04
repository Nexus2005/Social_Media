import prisma from "../prisma";

// Noise words to clean from listing titles
const NOISE_WORDS = [
  "free shipping", "new", "sale", "discount", "vintage", "retro", "classic",
  "men's", "mens", "women's", "womens", "unisex", "kid's", "kids", "sz", "size",
  "genuine", "original", "authentic", "hot", "deal", "clearance", "cheap",
  "with box", "nib", "nwt", "nwob", "running", "shoes", "sneakers", "sneaker",
  "athletic", "walking", "sport", "sports", "apparel", "clothing", "tshirt",
  "tee", "hoodie", "jacket", "pants", "jeans", "activewear", "lifestyle"
];

export function normalizeTitle(
  rawTitle: string,
  detectedBrand?: string,
  detectedCategory?: string
): { brand: string; modelLine: string; subcategory: string; canonicalTitle: string } {
  let title = rawTitle.toLowerCase().trim();

  // 1. Determine Brand
  let brand = (detectedBrand || "").trim().toLowerCase();
  if (!brand) {
    // Attempt to extract brand from first word of title
    const firstWord = title.split(" ")[0] || "";
    if (firstWord.length > 2) {
      brand = firstWord;
    } else {
      brand = "generic";
    }
  }

  // 2. Remove noise words
  let cleanWords = title.split(/\s+/).filter(word => {
    // Remove if matches noise words or contains numeric size details (e.g. "9.5", "10", "12")
    if (NOISE_WORDS.includes(word)) return false;
    if (/^\d+(\.\d+)?$/.test(word)) return false;
    return true;
  });

  // 3. Remove brand from clean words (since we capture it separately)
  cleanWords = cleanWords.filter(word => word !== brand);

  // 4. Determine Subcategory
  const subcategory = (detectedCategory || "apparel").trim().toLowerCase();

  // 5. Determine Model Line (take top 2-3 remaining words)
  const modelLine = cleanWords.slice(0, 3).join(" ");

  // 6. Construct Canonical Title
  const brandCap = brand.charAt(0).toUpperCase() + brand.slice(1);
  const modelCap = modelLine.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  const subCap = subcategory.charAt(0).toUpperCase() + subcategory.slice(1);

  const canonicalTitle = `${brandCap} ${modelCap} ${subCap}`.replace(/\s+/g, " ").trim();

  return {
    brand: brandCap,
    modelLine: modelCap,
    subcategory: subCap,
    canonicalTitle,
  };
}

export async function getOrCreateCanonicalProduct(
  rawTitle: string,
  detectedBrand?: string,
  detectedCategory?: string
): Promise<string> {
  const norm = normalizeTitle(rawTitle, detectedBrand, detectedCategory);

  try {
    const existing = await prisma.canonicalProduct.findUnique({
      where: { canonicalTitle: norm.canonicalTitle },
    });

    if (existing) {
      return existing.id;
    }

    const created = await prisma.canonicalProduct.create({
      data: {
        brand: norm.brand,
        modelLine: norm.modelLine,
        subcategory: norm.subcategory,
        canonicalTitle: norm.canonicalTitle,
      },
    });

    return created.id;
  } catch (err) {
    console.error(`[ProductNormalizer] Error resolving canonical product for "${norm.canonicalTitle}":`, err);
    // Fallback search to handle race conditions
    const fallback = await prisma.canonicalProduct.findFirst({
      where: { canonicalTitle: norm.canonicalTitle },
    });
    if (fallback) return fallback.id;

    // Last resort fallback
    const lastResort = await prisma.canonicalProduct.create({
      data: {
        brand: norm.brand,
        modelLine: norm.modelLine || "Default",
        subcategory: norm.subcategory,
        canonicalTitle: `${norm.canonicalTitle} ${crypto.randomUUID().slice(0, 4)}`,
      },
    });
    return lastResort.id;
  }
}
