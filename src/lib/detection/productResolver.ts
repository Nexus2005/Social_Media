import { DetectedItem } from "./detectionPipeline";

export class ProductResolver {
  /**
   * Translates CV detection features (labels, logos, OCR words) into a highly targeted
   * search query optimized for marketplace queries (eBay/AliExpress).
   */
  static resolveQuery(item: DetectedItem): string {
    // 1. If barcode is present, the barcode number is the highest precision search target
    if (item.barcode) {
      return item.barcode;
    }

    const queryParts: string[] = [];

    // 2. Add brand/logo if detected
    if (item.logo) {
      queryParts.push(item.logo);
    }

    // 3. Add OCR text (extract meaningful words, brand indicators, or model labels)
    if (item.ocrText) {
      const cleanOcr = this.cleanOcrText(item.ocrText, item.logo || "");
      if (cleanOcr) {
        queryParts.push(cleanOcr);
      }
    }

    // 4. Add the core YOLO category label (e.g. shoes, watch, handbag)
    if (item.label) {
      queryParts.push(item.label);
    }

    // 5. Add color if available from attributes
    const color = item.attributes?.color || item.attributes?.dominantColor;
    if (color && color !== "unknown" && color !== "black") {
      queryParts.push(color);
    }

    // Combine elements, filter unique keywords, and limit query length to optimize matching
    const keywords = queryParts.join(" ").split(/\s+/);
    const uniqueKeywords = Array.from(new Set(keywords)).filter((w) => w.length > 1);

    return uniqueKeywords.slice(0, 7).join(" ");
  }

  private static cleanOcrText(text: string, logo: string): string {
    const skipWords = new Set(["the", "and", "for", "with", "from", "original", "made", "in", "china", "usa", "product"]);
    const logoLower = logo.toLowerCase();
    
    return text
      .split(/[^a-zA-Z0-9]/)
      .map((w) => w.trim())
      .filter((w) => {
        const wLower = w.toLowerCase();
        return (
          w.length > 2 &&
          !skipWords.has(wLower) &&
          wLower !== logoLower &&
          !/^\d+$/.test(w) // ignore pure numbers unless combined with letters (like model numbers)
        );
      })
      .slice(0, 4)
      .join(" ");
  }
}
