export interface ExtractedProductMetadata {
  features: string[];
  specifications: Record<string, any>;
  highlights: string[];
  condition: string;
  returnPolicy: string;
  warranty: string;
  colors: string[];
  sizes: string[];
  material: string;
  categoryPath: string;
}

export function extractProductMetadata(
  title: string,
  description: string,
  rawAttributes: Record<string, any> = {}
): ExtractedProductMetadata {
  const specs: Record<string, any> = {};
  const features: string[] = [];
  const highlights: string[] = [];
  const colors: string[] = [];
  const sizes: string[] = [];
  
  let condition = "New";
  let returnPolicy = "30-day returns accepted";
  let warranty = "No warranty details available";
  let material = "Cotton / Synthetics";
  let categoryPath = "Apparel > Clothing";

  const cleanTitle = title.toLowerCase();
  const cleanDesc = description.toLowerCase();

  // 1. Process attributes returned by marketplace APIs
  for (const [key, val] of Object.entries(rawAttributes)) {
    const k = key.toLowerCase();
    const v = String(val).toLowerCase();

    // Map features
    if (k.includes("feature") || k.includes("highlight")) {
      features.push(String(val));
    }
    // Map dimensions/specs
    else if (
      k.includes("size") || k.includes("width") || k.includes("height") || 
      k.includes("length") || k.includes("weight") || k.includes("model") ||
      k.includes("material") || k.includes("color")
    ) {
      specs[key] = val;
    }

    // Condition
    if (k.includes("condition") || k.includes("state")) {
      if (v.includes("refurbished")) condition = "Refurbished";
      else if (v.includes("used") || v.includes("pre-owned") || v.includes("preowned")) condition = "Used";
      else condition = "New";
    }

    // Return policy
    if (k.includes("return") || k.includes("policy")) {
      returnPolicy = String(val);
    }

    // Warranty
    if (k.includes("warranty") || k.includes("guarantee")) {
      warranty = String(val);
    }

    // Material
    if (k.includes("material") || k.includes("fabric")) {
      material = String(val);
    }

    // Color
    if (k.includes("color") || k.includes("colour")) {
      colors.push(String(val));
    }

    // Size
    if (k.includes("size") || k.includes("shoe size") || k.includes("apparel size")) {
      sizes.push(String(val));
    }

    // Category
    if (k.includes("category") || k.includes("department")) {
      categoryPath = String(val);
    }
  }

  // 2. Fallback descriptions extraction
  if (features.length === 0) {
    // Attempt parsing bullet points or lines starting with dashes
    const lines = description.split(/\n+/);
    for (const line of lines) {
      const cleanLine = line.trim();
      if (cleanLine.startsWith("-") || cleanLine.startsWith("*") || cleanLine.startsWith("•")) {
        const item = cleanLine.replace(/^[-*•]\s*/, "");
        if (item.length > 5 && item.length < 150) {
          features.push(item);
        }
      }
    }
  }

  // Fallback material
  if (material === "Cotton / Synthetics") {
    if (cleanTitle.includes("leather") || cleanDesc.includes("leather")) material = "Leather";
    else if (cleanTitle.includes("denim") || cleanDesc.includes("denim")) material = "Denim";
    else if (cleanTitle.includes("knit") || cleanDesc.includes("knit")) material = "Knit";
    else if (cleanTitle.includes("polyester") || cleanDesc.includes("polyester")) material = "Polyester";
    else if (cleanTitle.includes("mesh") || cleanDesc.includes("mesh")) material = "Mesh";
  }

  // Fallback category path
  if (categoryPath === "Apparel > Clothing") {
    if (cleanTitle.includes("shoe") || cleanTitle.includes("sneaker") || cleanTitle.includes("boot")) {
      categoryPath = "Footwear > Shoes";
    } else if (cleanTitle.includes("watch") || cleanTitle.includes("chronograph")) {
      categoryPath = "Accessories > Watches";
    } else if (cleanTitle.includes("bag") || cleanTitle.includes("backpack")) {
      categoryPath = "Accessories > Bags";
    }
  }

  // highlights defaults if empty
  if (highlights.length === 0) {
    if (condition) highlights.push(`Condition: ${condition}`);
    if (material) highlights.push(`Material: ${material}`);
    if (categoryPath) highlights.push(categoryPath.split(">").pop()?.trim() || "");
  }

  return {
    features: features.slice(0, 8),
    specifications: specs,
    highlights: highlights.slice(0, 5),
    condition,
    returnPolicy,
    warranty,
    colors: Array.from(new Set(colors)).filter(Boolean),
    sizes: Array.from(new Set(sizes)).filter(Boolean),
    material,
    categoryPath,
  };
}
