// Helper to map filters and adjustments to a CSS filter string
export function getFilterString(
  preset: string,
  adj: {
    brightness?: number;
    contrast?: number;
    saturation?: number;
    temperature?: number;
    warmth?: number;
    exposure?: number;
    fade?: number;
    highlights?: number;
    shadows?: number;
    structure?: number;
  }
) {
  let filterStr = "";

  // 1. Apply Preset Filters (15 supported)
  if (preset === "Clarendon") filterStr += "contrast(1.2) saturate(1.35) ";
  else if (preset === "Juno") filterStr += "saturate(1.2) contrast(1.1) sepia(0.2) hue-rotate(-15deg) ";
  else if (preset === "Lark") filterStr += "brightness(1.08) contrast(0.95) saturate(1.15) ";
  else if (preset === "Ludwig") filterStr += "brightness(1.05) saturate(1.1) contrast(0.95) ";
  else if (preset === "Valencia") filterStr += "contrast(1.08) brightness(1.08) sepia(0.08) saturate(0.85) hue-rotate(-10deg) ";
  else if (preset === "Gingham") filterStr += "brightness(1.05) contrast(0.9) saturate(0.9) hue-rotate(-10deg) ";
  else if (preset === "Rise") filterStr += "brightness(1.05) saturate(0.9) contrast(0.9) sepia(0.15) ";
  else if (preset === "Aden") filterStr += "sepia(0.2) saturate(1.4) contrast(0.9) hue-rotate(-20deg) ";
  else if (preset === "Hudson") filterStr += "brightness(1.1) contrast(0.9) saturate(1.1) hue-rotate(-10deg) ";
  else if (preset === "Warm") filterStr += "sepia(0.3) saturate(1.1) brightness(1.02) ";
  else if (preset === "Cool") filterStr += "hue-rotate(10deg) saturate(0.9) brightness(1.05) ";
  else if (preset === "Vintage") filterStr += "sepia(0.5) contrast(0.85) saturate(0.95) ";
  else if (preset === "Bright") filterStr += "brightness(1.15) contrast(1.05) saturate(1.1) ";
  else if (preset === "Cinematic") filterStr += "contrast(1.2) brightness(0.95) saturate(0.85) ";
  else if (preset === "Dreamy") filterStr += "brightness(1.05) saturate(0.9) contrast(0.9) ";

  // 2. Apply adjustment sliders (11 parameters)
  // Exposure slider (modulates brightness, default 0, range -1 to 1)
  const baseBrightness = adj.brightness !== undefined ? adj.brightness : 1;
  const exposureMod = adj.exposure !== undefined ? adj.exposure : 0;
  filterStr += `brightness(${baseBrightness + exposureMod}) `;

  // Contrast & Structure (Structure increases contrast/details, default 0, range -1 to 1)
  const baseContrast = adj.contrast !== undefined ? adj.contrast : 1;
  const structureMod = adj.structure !== undefined ? adj.structure * 0.15 : 0;
  filterStr += `contrast(${baseContrast + structureMod}) `;

  // Saturation (default 1, range 0 to 2)
  if (adj.saturation !== undefined) {
    filterStr += `saturate(${adj.saturation}) `;
  }

  // Warmth (Temperature)
  const temp = adj.warmth !== undefined ? adj.warmth : (adj.temperature !== undefined ? adj.temperature : 0);
  if (temp !== 0) {
    if (temp > 0) {
      filterStr += `sepia(${temp * 0.008}) `; // Sepia adds warmth
    } else {
      filterStr += `hue-rotate(${temp * 0.2}deg) `; // Hue rotation adds coolness
    }
  }

  // Highlights (default 0, range -1 to 1)
  if (adj.highlights !== undefined && adj.highlights !== 0) {
    filterStr += `contrast(${1 + adj.highlights * 0.08}) `;
  }

  // Shadows (default 0, range -1 to 1)
  if (adj.shadows !== undefined && adj.shadows !== 0) {
    filterStr += `brightness(${1 + adj.shadows * 0.05}) `;
  }

  // Fade (default 0, range 0 to 1)
  if (adj.fade !== undefined && adj.fade > 0) {
    const opacity = adj.fade;
    filterStr += `contrast(${1 - opacity * 0.4}) brightness(${1 + opacity * 0.15}) `;
  }

  return filterStr.trim();
}

function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = (rotation * Math.PI) / 180;
  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

function sharpenCanvas(ctx: CanvasRenderingContext2D, width: number, height: number, amount: number) {
  if (amount <= 0) return;
  const canvasCtx = ctx;
  const imgData = canvasCtx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const original = new Uint8ClampedArray(data);

  // Sharpen convolution kernel
  const a = amount * 0.65;
  const k00 = 0, k01 = -a, k02 = 0;
  const k10 = -a, k11 = 1 + 4 * a, k12 = -a;
  const k20 = 0, k21 = -a, k22 = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) {
        const val =
          original[((y - 1) * width + (x - 1)) * 4 + c] * k00 +
          original[((y - 1) * width + x) * 4 + c] * k01 +
          original[((y - 1) * width + (x + 1)) * 4 + c] * k02 +
          original[(y * width + (x - 1)) * 4 + c] * k10 +
          original[(y * width + x) * 4 + c] * k11 +
          original[(y * width + (x + 1)) * 4 + c] * k12 +
          original[((y + 1) * width + (x - 1)) * 4 + c] * k20 +
          original[((y + 1) * width + x) * 4 + c] * k21 +
          original[((y + 1) * width + (x + 1)) * 4 + c] * k22;
        data[idx + c] = Math.min(255, Math.max(0, val));
      }
    }
  }
  canvasCtx.putImageData(imgData, 0, 0);
}

// Full Canvas processing that generates the final edited blob
export async function getProcessedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number } | null,
  rotation = 0,
  preset = "Normal",
  adj: {
    brightness?: number;
    contrast?: number;
    saturation?: number;
    temperature?: number;
    warmth?: number;
    exposure?: number;
    fade?: number;
    highlights?: number;
    shadows?: number;
    structure?: number;
    vignette?: number;
    sharpen?: number;
  } = {}
): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", (error) => reject(error));
    if (!imageSrc.startsWith("blob:") && !imageSrc.startsWith("data:")) {
      img.setAttribute("crossOrigin", "anonymous");
    }
    img.src = imageSrc;
  });

  // Create temporary canvas for rotated full size image
  const rotCanvas = document.createElement("canvas");
  const rotCtx = rotCanvas.getContext("2d");
  if (!rotCtx) throw new Error("No 2d context for rotation");

  const rotRad = (rotation * Math.PI) / 180;
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(image.width, image.height, rotation);

  rotCanvas.width = bBoxWidth;
  rotCanvas.height = bBoxHeight;

  rotCtx.translate(bBoxWidth / 2, bBoxHeight / 2);
  rotCtx.rotate(rotRad);
  rotCtx.translate(-image.width / 2, -image.height / 2);
  rotCtx.drawImage(image, 0, 0);

  // Create final canvas for the crop + filter result
  const finalCrop = pixelCrop || { x: 0, y: 0, width: rotCanvas.width, height: rotCanvas.height };
  const canvas = document.createElement("canvas");
  canvas.width = finalCrop.width;
  canvas.height = finalCrop.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2d context for crop");

  // Apply CSS filters
  const filterStr = getFilterString(preset, adj);
  if (filterStr) {
    ctx.filter = filterStr;
  }

  // Draw the cropped portion from the rotated canvas
  ctx.drawImage(
    rotCanvas,
    finalCrop.x,
    finalCrop.y,
    finalCrop.width,
    finalCrop.height,
    0,
    0,
    finalCrop.width,
    finalCrop.height
  );

  // Apply Vignette overlay
  if (adj.vignette !== undefined && adj.vignette > 0) {
    ctx.filter = "none";
    const gradient = ctx.createRadialGradient(
      canvas.width / 2,
      canvas.height / 2,
      Math.min(canvas.width, canvas.height) * 0.3,
      canvas.width / 2,
      canvas.height / 2,
      Math.max(canvas.width, canvas.height) * 0.7
    );
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(1, `rgba(0,0,0,${adj.vignette * 0.85})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Apply Sharpen convolution filter
  if (adj.sharpen !== undefined && adj.sharpen > 0) {
    ctx.filter = "none";
    sharpenCanvas(ctx, canvas.width, canvas.height, adj.sharpen);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas toBlob failed"));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      0.9
    );
  });
}
