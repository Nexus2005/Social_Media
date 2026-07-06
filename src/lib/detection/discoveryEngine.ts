import fs from "fs";
import { FrameDetection } from "./frameFusion";
import { ProductMemoryProvider } from "./productMemory";
import { VisionProviderManager } from "../ai/visionProviderManager";
import sharp from "sharp";

export interface ExtractedFrame {
  path: string;
  timestamp: number;
}

export interface GeminiDiscoveryResult {
  category: string;
  subcategory: string;
  gender: string;
  color: string;
  neckline: string;
  sleeve: string;
  fit: string;
  pattern: string;
  material: string;
  brand: string;
  confidence: number;
  box_2d?: number[]; // [ymin, xmin, ymax, xmax] (0-1000)
}

export class DiscoveryEngine {
  /**
   * Select the most informative keyframes adaptively using dHash cuts, class changes, and density.
   */
  static async selectAdaptiveKeyframes(
    frames: ExtractedFrame[],
    frameDetections: FrameDetection[],
    videoDuration: number
  ): Promise<ExtractedFrame[]> {
    if (frames.length === 0) return [];
    if (frames.length <= 2) return frames;

    // 1. Determine dynamic max frames limit based on video duration
    let maxFrames = 2;
    if (videoDuration >= 5 && videoDuration <= 15) {
      maxFrames = 4;
    } else if (videoDuration > 15) {
      maxFrames = 6;
    }

    const selectedTimestamps = new Set<number>();

    // Always include middle frame as anchor
    const midIdx = Math.floor(frames.length / 2);
    selectedTimestamps.add(frames[midIdx].timestamp);

    try {
      // 2. Identify Cuts & Scene changes using dHash on frames
      const frameHashes = new Map<number, string>();
      for (const frame of frames) {
        if (fs.existsSync(frame.path)) {
          const buffer = await fs.promises.readFile(frame.path);
          const hash = await ProductMemoryProvider.computeDHash(buffer);
          if (hash) frameHashes.set(frame.timestamp, hash);
        }
      }

      // Find frame pairs with Hamming distance > 10 (potential scene transitions)
      for (let i = 1; i < frames.length; i++) {
        const prevHash = frameHashes.get(frames[i - 1].timestamp);
        const currHash = frameHashes.get(frames[i].timestamp);
        if (prevHash && currHash) {
          const distance = ProductMemoryProvider.getHammingDistance(prevHash, currHash);
          if (distance > 10 && selectedTimestamps.size < maxFrames) {
            selectedTimestamps.add(frames[i].timestamp); // Pick frame after the transition
          }
        }
      }

      // 3. Select keyframes that introduce a brand new YOLO class
      const seenClasses = new Set<string>();
      for (const fd of frameDetections) {
        let hasNewClass = false;
        for (const obj of fd.objects) {
          const label = obj.label.toLowerCase();
          if (!seenClasses.has(label)) {
            seenClasses.add(label);
            hasNewClass = true;
          }
        }
        if (hasNewClass && selectedTimestamps.size < maxFrames) {
          selectedTimestamps.add(fd.frameTimestamp);
        }
      }

      // 4. Select keyframes with the highest detection density
      const sortedByDensity = [...frameDetections].sort(
        (a, b) => b.objects.length - a.objects.length
      );
      for (const fd of sortedByDensity) {
        if (selectedTimestamps.size >= maxFrames) break;
        selectedTimestamps.add(fd.frameTimestamp);
      }

      // Fallbacks to fill slots
      if (selectedTimestamps.size < maxFrames) {
        selectedTimestamps.add(frames[0].timestamp);
      }
      if (selectedTimestamps.size < maxFrames) {
        selectedTimestamps.add(frames[frames.length - 1].timestamp);
      }
    } catch (err) {
      console.warn("[DiscoveryEngine] Error during adaptive frame selection:", err);
      // Fallback: first and middle
      selectedTimestamps.add(frames[0].timestamp);
      selectedTimestamps.add(frames[midIdx].timestamp);
    }

    const finalFrames = frames
      .filter((f) => selectedTimestamps.has(f.timestamp))
      .sort((a, b) => a.timestamp - b.timestamp);

    console.log(`[DiscoveryEngine] Adaptive selection: Chosen ${finalFrames.length} keyframes out of ${frames.length} total (Max allowed: ${maxFrames})`);
    return finalFrames;
  }

  /**
   * Query Gemini to identify and locate all shoppable products in a frame, returning their coordinates.
   */
  static async discoverProductsFullFrame(
    frameBuffer: Buffer,
    frameTimestamp: number
  ): Promise<GeminiDiscoveryResult[]> {
    const base64Frame = frameBuffer.toString("base64");

    const promptText = `Analyze this image and identify all visible, purchaseable fashion products (clothing, shoes, bags, jewelry, accessories, watches, etc.). For each product, return its category, subcategory, color, details, and normalized 2D bounding box coordinates [ymin, xmin, ymax, xmax] in the range [0, 1000] relative to the image size.
Return ONLY a JSON object matching this structure:
{
  "products": [
    {
      "category": "Clothing | Shoes | Bags | Watches | Jewelry | Accessories | Electronics | Furniture | Home | Kitchen | Beauty | Sports",
      "subcategory": "specific category (e.g., 'Sneakers', 'T-Shirt', 'Halter Top', 'Hoodie', 'Handbag')",
      "gender": "Men | Women | Unisex | Kids",
      "color": "primary color name",
      "neckline": "e.g., 'Halter Neck', 'V-Neck', 'Crew Neck', 'Asymmetrical', 'none'",
      "sleeve": "e.g., 'Sleeveless', 'Short Sleeve', 'Long Sleeve', 'none'",
      "fit": "e.g., 'Slim Fit', 'Loose', 'Oversized', 'Regular', 'none'",
      "pattern": "e.g., 'Solid', 'Striped', 'Floral', 'Knit', 'none'",
      "material": "e.g., 'Knit', 'Leather', 'Cotton', 'Mesh', 'Denim', 'none'",
      "brand": "e.g., 'Nike', 'Adidas', 'Zara', 'none'",
      "confidence": 0.0 to 1.0 (float),
      "box_2d": [ymin, xmin, ymax, xmax]
    }
  ]
}

Only return products a user could realistically purchase online.
Ignore: people, faces, backgrounds, trees, buildings, furniture, pets, vehicles.`;

    try {
      const response = await VisionProviderManager.analyzeImage(base64Frame, promptText);
      if (response && Array.isArray(response.products)) {
        return response.products.map((p: any) => ({
          category: p.category || "Clothing",
          subcategory: p.subcategory || "none",
          gender: p.gender || "Unisex",
          color: p.color || "unknown",
          neckline: p.neckline || "none",
          sleeve: p.sleeve || "none",
          fit: p.fit || "none",
          pattern: p.pattern || "none",
          material: p.material || "none",
          brand: p.brand || "none",
          confidence: p.confidence || 0.85,
          box_2d: Array.isArray(p.box_2d) && p.box_2d.length === 4 ? p.box_2d : undefined,
        }));
      }
    } catch (err) {
      console.error(`[DiscoveryEngine] Gemini VLM query failed for Frame @${frameTimestamp}s:`, err);
    }
    return [];
  }
}
