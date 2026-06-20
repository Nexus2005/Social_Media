// Helper to map filters and adjustments to a CSS filter string
export function getFilterString(
  preset: string,
  adj: {
    brightness?: number;
    contrast?: number;
    saturation?: number;
    temperature?: number;
    fade?: number;
  }
) {
  let filterStr = "";

  // 1. Apply Instagram Preset filters
  if (preset === "Clarendon") filterStr += "contrast(1.2) saturate(1.35) ";
  else if (preset === "Aden") filterStr += "sepia(0.2) saturate(1.4) contrast(0.9) hue-rotate(-20deg) ";
  else if (preset === "Crema") filterStr += "sepia(0.5) contrast(1.1) saturate(0.9) brightness(1.1) ";
  else if (preset === "Gingham") filterStr += "brightness(1.05) contrast(0.9) saturate(0.9) hue-rotate(-10deg) ";
  else if (preset === "Juno") filterStr += "saturate(1.2) contrast(1.1) sepia(0.2) hue-rotate(-15deg) ";
  else if (preset === "Lark") filterStr += "brightness(1.08) contrast(0.95) saturate(1.15) ";
  else if (preset === "Ludwig") filterStr += "brightness(1.05) saturate(1.1) contrast(0.95) ";
  else if (preset === "Moon") filterStr += "grayscale(1) contrast(1.1) brightness(1.1) ";
  else if (preset === "Slumber") filterStr += "sepia(0.35) contrast(1.1) saturate(0.7) brightness(1.05) ";

  // 2. Apply adjustment sliders
  if (adj.brightness !== undefined) filterStr += `brightness(${adj.brightness}) `;
  if (adj.contrast !== undefined) filterStr += `contrast(${adj.contrast}) `;
  if (adj.saturation !== undefined) filterStr += `saturate(${adj.saturation}) `;
  
  if (adj.temperature !== undefined) {
    if (adj.temperature > 0) {
      filterStr += `sepia(${adj.temperature * 0.005}) `; // Sepia adds warmth
    } else {
      filterStr += `hue-rotate(${adj.temperature * 0.2}deg) `; // Hue rotation adds coolness
    }
  }

  if (adj.fade !== undefined && adj.fade > 0) {
    // Fade washes out blacks and whites, reducing contrast
    const opacity = adj.fade * 0.01;
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

// Full Canvas processing that generates the final edited blob
export async function getProcessedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  rotation = 0,
  preset = "Normal",
  adj: {
    brightness?: number;
    contrast?: number;
    saturation?: number;
    temperature?: number;
    fade?: number;
    vignette?: number;
  } = {}
): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", (error) => reject(error));
    img.setAttribute("crossOrigin", "anonymous");
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
  const canvas = document.createElement("canvas");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2d context for crop");

  // Apply filters
  const filterStr = getFilterString(preset, adj);
  if (filterStr) {
    ctx.filter = filterStr;
  }

  // Draw the cropped portion from the rotated canvas
  ctx.drawImage(
    rotCanvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
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
      0.95
    );
  });
}
