import sharp from "sharp";

export interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export class LocalizationEngine {
  /**
   * Crop a portion of an image frame based on normalized coordinates [ymin, xmin, ymax, xmax] in the range [0, 1000].
   */
  static async cropFromNormalizedBox(
    frameBuffer: Buffer,
    box2d: number[],
    paddingPercent = 0.15
  ): Promise<Buffer | null> {
    if (!box2d || box2d.length !== 4) return null;

    try {
      const image = sharp(frameBuffer);
      const metadata = await image.metadata();
      const width = metadata.width || 0;
      const height = metadata.height || 0;

      if (width === 0 || height === 0) return null;

      // 1. Map normalized box [ymin, xmin, ymax, xmax] (0-1000 scale) to pixels
      const ymin = box2d[0];
      const xmin = box2d[1];
      const ymax = box2d[2];
      const xmax = box2d[3];

      let x1 = Math.round((xmin / 1000) * width);
      let y1 = Math.round((ymin / 1000) * height);
      let x2 = Math.round((xmax / 1000) * width);
      let y2 = Math.round((ymax / 1000) * height);

      // Ensure boundaries
      x1 = Math.max(0, Math.min(x1, width - 1));
      y1 = Math.max(0, Math.min(y1, height - 1));
      x2 = Math.max(0, Math.min(x2, width));
      y2 = Math.max(0, Math.min(y2, height));

      // 2. Apply padding
      const w = x2 - x1;
      const h = y2 - y1;
      const padX = w * paddingPercent;
      const padY = h * paddingPercent;

      const left = Math.max(0, Math.round(x1 - padX));
      const top = Math.max(0, Math.round(y1 - padY));
      const cropWidth = Math.max(1, Math.min(Math.round(x2 + padX - left), width - left));
      const cropHeight = Math.max(1, Math.min(Math.round(y2 + padY - top), height - top));

      // 3. Extract crop
      return await image
        .extract({ left, top, width: cropWidth, height: cropHeight })
        .jpeg({ quality: 85 })
        .toBuffer();
    } catch (err) {
      console.error("[LocalizationEngine] Failed to crop object:", err);
      return null;
    }
  }

  /**
   * Crop a portion of an image frame based on raw pixel coordinates [x1, y1, x2, y2].
   */
  static async cropFromPixelBox(
    frameBuffer: Buffer,
    box: number[],
    paddingPercent = 0.15
  ): Promise<Buffer | null> {
    if (!box || box.length !== 4) return null;

    try {
      const image = sharp(frameBuffer);
      const metadata = await image.metadata();
      const width = metadata.width || 0;
      const height = metadata.height || 0;

      if (width === 0 || height === 0) return null;

      const x1 = box[0];
      const y1 = box[1];
      const x2 = box[2];
      const y2 = box[3];

      const w = x2 - x1;
      const h = y2 - y1;
      const padX = w * paddingPercent;
      const padY = h * paddingPercent;

      const left = Math.max(0, Math.round(x1 - padX));
      const top = Math.max(0, Math.round(y1 - padY));
      const cropWidth = Math.max(1, Math.min(Math.round(x2 + padX - left), width - left));
      const cropHeight = Math.max(1, Math.min(Math.round(y2 + padY - top), height - top));

      return await image
        .extract({ left, top, width: cropWidth, height: cropHeight })
        .jpeg({ quality: 85 })
        .toBuffer();
    } catch (err) {
      console.error("[LocalizationEngine] Failed to crop pixel box:", err);
      return null;
    }
  }
}
