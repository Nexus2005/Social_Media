import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import vision from "@google-cloud/vision";
import { extractFramesFromVideo } from "@/lib/videoProcessor";
import fs from "fs";
import path from "path";
import sharp from "sharp";

// Initialize Google Vision Client
const visionClient = new vision.ImageAnnotatorClient({
  keyFilename: path.join(process.cwd(), "google-vision-key.json"),
});

// Category mapping helper
const CATEGORY_MAP: Record<string, string[]> = {
  "👕 Clothing & Apparel": [
    "clothing", "apparel", "activewear", "outerwear", "jersey", "sports jersey",
    "shirt", "t-shirt", "top", "dress", "pants", "shorts", "skirt", "jacket", "coat", "suit", "wear", "jeans", "trouser", "hoodie", "sweatshirt", "sweater"
  ],
  "👟 Footwear": [
    "shoe", "shoes", "footwear", "sneaker", "sneakers", "boot", "boots", "sandal", "sandals", "slipper", "slippers", "heels", "heel"
  ],
  "⌚ Electronics & Accessories": [
    "watch", "smartwatch", "clock", "eyewear", "sunglasses", "glasses", "phone", "mobile", "mobile phone", "laptop", "tablet", "headphone", "headphones", "earphone", "earphones", "electronic", "camera", "accessory", "accessories", "bag", "handbag", "backpack", "purse", "belt", "wallet", "jewelry", "ring", "necklace"
  ]
};

function getCategoryForObject(name: string): string {
  const lowercase = name.toLowerCase();
  
  for (const [category, keywords] of Object.entries(CATEGORY_MAP)) {
    if (keywords.some(keyword => lowercase.includes(keyword))) {
      return category;
    }
  }
  
  return "👕 Clothing & Apparel";
}

const RELEVANT_VISION_CATEGORIES = [
  "clothing", "apparel", "activewear", "outerwear", "jersey", "sports jersey",
  "shirt", "t-shirt", "top", "dress", "pants", "shorts", "skirt", "jacket", "coat", "suit", "wear", "jeans", "trouser", "hoodie", "sweatshirt", "sweater",
  "shoe", "shoes", "footwear", "sneaker", "sneakers", "boot", "boots", "sandal", "sandals", "slipper", "slippers", "heels", "heel",
  "watch", "smartwatch", "clock", "eyewear", "sunglasses", "glasses", "phone", "mobile", "mobile phone", "laptop", "tablet", "headphone", "headphones", "earphone", "earphones", "electronic", "camera", "accessory", "accessories", "bag", "handbag", "backpack", "purse", "belt", "wallet", "jewelry", "ring", "necklace"
];

function isRelevantCategory(categoryName: string): boolean {
  const nameLower = categoryName.toLowerCase();
  return RELEVANT_VISION_CATEGORIES.some(cat => nameLower.includes(cat));
}

// Bounding box cropping helper using sharp
interface NormalizedVertex {
  x?: number;
  y?: number;
}

async function cropObjectFromFrame(
  framePath: string,
  vertices: NormalizedVertex[]
): Promise<Buffer | null> {
  try {
    const xs = vertices.map((v) => v.x ?? 0);
    const ys = vertices.map((v) => v.y ?? 0);
    
    const xMin = Math.max(0, Math.min(...xs));
    const yMin = Math.max(0, Math.min(...ys));
    const xMax = Math.min(1, Math.max(...xs));
    const yMax = Math.min(1, Math.max(...ys));

    const image = sharp(framePath);
    const metadata = await image.metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    const left = Math.round(xMin * width);
    const top = Math.round(yMin * height);
    const cropWidth = Math.round((xMax - xMin) * width);
    const cropHeight = Math.round((yMax - yMin) * height);

    const extractLeft = Math.max(0, Math.min(left, width - 1));
    const extractTop = Math.max(0, Math.min(top, height - 1));
    const extractWidth = Math.max(1, Math.min(cropWidth, width - extractLeft));
    const extractHeight = Math.max(1, Math.min(cropHeight, height - extractTop));

    return await image
      .extract({
        left: extractLeft,
        top: extractTop,
        width: extractWidth,
        height: extractHeight,
      })
      .toBuffer();
  } catch (err) {
    console.error("Failed to crop object from frame:", err);
    return null;
  }
}

// OpenRouter Vision query to enrich label description
async function queryOpenRouterVision(
  base64Image: string,
  genericLabel: string
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.log("OPENROUTER_API_KEY not configured. Falling back to generic label.");
    return genericLabel;
  }

  try {
    console.log(`Sending cropped image to OpenRouter for generic label: "${genericLabel}"`);
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Social Media Visual Commerce App"
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `You are an expert shopping assistant. Look at this cropped image of an item from a video. It was detected as "${genericLabel}". Give a highly specific, concise e-commerce search query (maximum 5 words) that can be used on Google Shopping to find this exact item or a very similar match. Mention key visible attributes like color, material, pattern, or style (e.g. "royal blue polo shirt", "black leather minimalist watch"). Return ONLY the search query text, no quotes, no extra words, and no markdown.`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter API error ${response.status}: ${errText}`);
    }

    const json = await response.json();
    const resultText = json.choices?.[0]?.message?.content?.trim();
    if (resultText) {
      console.log(`Enriched label from vision LLM: "${genericLabel}" -> "${resultText}"`);
      return resultText;
    }
  } catch (err) {
    console.error("Failed to call OpenRouter Vision LLM:", err);
  }

  return genericLabel;
}

// Token intersection similarity logic for deduplication
function getStringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  if (s1 === s2) return 1.0;
  
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  
  let intersectionCount = 0;
  set1.forEach(word => {
    if (set2.has(word)) {
      intersectionCount++;
    }
  });
  
  const unionSize = new Set([...words1, ...words2]).size;
  return unionSize > 0 ? intersectionCount / unionSize : 0;
}

// SerpApi Google Shopping matches fetcher
function getMockProducts(query: string) {
  const q = query.toLowerCase();

  if (q.includes("jacket") || q.includes("coat") || q.includes("outerwear") || q.includes("jersey")) {
    return [
      {
        title: "Roadster Men Navy Blue Solid Hooded Padded Jacket",
        price: "₹1,899",
        merchant: "Myntra",
        thumbnail: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500&auto=format&fit=crop&q=60",
        link: "https://www.myntra.com",
      },
      {
        title: "Puma Full Sleeve Solid Men Sporty Sweatshirt Jacket",
        price: "₹3,499",
        merchant: "Flipkart",
        thumbnail: "https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=500&auto=format&fit=crop&q=60",
        link: "https://www.flipkart.com",
      },
      {
        title: "Zara Water Repellent Puffer Jacket India Collection",
        price: "₹5,990",
        merchant: "Zara India",
        thumbnail: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=500&auto=format&fit=crop&q=60",
        link: "https://www.zara.com/in",
      },
    ];
  }

  if (
    q.includes("shoes") ||
    q.includes("footwear") ||
    q.includes("sneaker") ||
    q.includes("boots")
  ) {
    return [
      {
        title: "Nike Air Max SYSTM Men's Running Sneakers",
        price: "₹8,595",
        merchant: "Nike.com/in",
        thumbnail: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&auto=format&fit=crop&q=60",
        link: "https://www.nike.com/in",
      },
      {
        title: "Red Tape Men Memory Foam Cushioned Walking Shoes",
        price: "₹1,499",
        merchant: "Amazon.in",
        thumbnail: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=500&auto=format&fit=crop&q=60",
        link: "https://www.amazon.in",
      },
    ];
  }

  return [
    {
      title: `Premium Style ${query} Matching Trend Collection`,
      price: "₹2,499",
      merchant: "Ajio",
      thumbnail: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=500&auto=format&fit=crop&q=60",
      link: "https://www.ajio.com",
    },
    {
      title: `Casual Wear ${query} Comfort Fit Everyday Edition`,
      price: "₹1,299",
      merchant: "Amazon.in",
      thumbnail: "https://images.unsplash.com/photo-1495105787522-5334e3ffa0ef?w=500&auto=format&fit=crop&q=60",
      link: "https://www.amazon.in",
    },
  ];
}

async function fetchShoppingMatches(query: string): Promise<any[]> {
  const serpApiKey = process.env.SERPAPI_KEY;
  if (!serpApiKey) {
    console.log(`SerpApi key not configured. Returning mock matches for: "${query}"`);
    return getMockProducts(query);
  }
  try {
    const url = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(
      query
    )}&google_domain=google.co.in&gl=in&hl=en&api_key=${serpApiKey}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`SerpApi status: ${response.status}`);
    }
    const data = await response.json();
    return (data.shopping_results || []).slice(0, 5).map((item: any) => ({
      title: item.title,
      price: item.price,
      merchant: item.source || item.merchant || "Online Retailer",
      thumbnail: item.thumbnail,
      link: item.link,
    }));
  } catch (err) {
    console.error(`Failed to fetch SerpApi shopping matches for "${query}":`, err);
    return getMockProducts(query);
  }
}

export async function POST(req: NextRequest) {
  let tempVideoPath = "";
  let extractedFrames: string[] = [];
  let postId = "";

  try {
    const body = await req.json();
    postId = body.postId;

    if (!postId) {
      return NextResponse.json({ error: "Missing postId" }, { status: 400 });
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { attachments: true },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const videoAttachment = post.attachments.find((att) => att.mediaType === "VIDEO");
    if (!videoAttachment) {
      return NextResponse.json({ error: "Post does not contain a video" }, { status: 400 });
    }

    // Set status to PROCESSING
    await prisma.post.update({
      where: { id: postId },
      data: { aiStatus: "PROCESSING" },
    });

    const videoUrl = videoAttachment.url;
    console.log(`Processing Reel video URL: ${videoUrl}`);

    // Create tmp directory
    const tmpDir = path.join(process.cwd(), "tmp");
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    // Download video to local temp file
    const fileExtension = videoUrl.split(".").pop()?.split("?")[0] || "mp4";
    tempVideoPath = path.join(tmpDir, `temp-${postId}.${fileExtension}`);

    console.log(`Downloading video to ${tempVideoPath}...`);
    const response = await fetch(videoUrl);
    if (!response.ok) {
      throw new Error(`Failed to download video from ${videoUrl}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.promises.writeFile(tempVideoPath, buffer);
    console.log("Download complete.");

    // Extract frames
    extractedFrames = await extractFramesFromVideo(tempVideoPath);

    // Call Google Vision on each frame
    const uniqueObjects = new Map<string, any>();

    for (const framePath of extractedFrames) {
      console.log(`Analyzing frame: ${framePath}`);
      try {
        const [result] = await (visionClient as any).objectLocalization(framePath);
        const annotations = result.localizedObjectAnnotations || [];

        for (const ann of annotations) {
          if (ann.name && ann.boundingPoly?.normalizedVertices) {
            // Keep unique items (we keep the first one found) and reference its frame
            if (!uniqueObjects.has(ann.name)) {
              uniqueObjects.set(ann.name, {
                name: ann.name,
                box: ann.boundingPoly.normalizedVertices,
                framePath: framePath,
              });
            }
          }
        }
      } catch (err) {
        console.error(`Failed to analyze frame ${framePath} via Google Vision:`, err);
      }
    }

    // Process relevant objects, crop them, run vision LLM, and query SerpApi
    const detectedProductsToSave: any[] = [];

    for (const obj of uniqueObjects.values()) {
      if (!isRelevantCategory(obj.name)) {
        continue;
      }

      console.log(`Extracting and cropping: "${obj.name}"`);
      const croppedBuffer = await cropObjectFromFrame(obj.framePath, obj.box);
      if (!croppedBuffer) {
        continue;
      }

      const base64Image = croppedBuffer.toString("base64");
      const enrichedLabel = await queryOpenRouterVision(base64Image, obj.name);

      // Fuzzy deduplication against already added products for this post
      let isDuplicate = false;
      for (const existing of detectedProductsToSave) {
        if (getStringSimilarity(existing.label, enrichedLabel) >= 0.7) {
          isDuplicate = true;
          break;
        }
      }

      if (isDuplicate) {
        console.log(`Skipping duplicate item: "${enrichedLabel}"`);
        continue;
      }

      // Query Google Shopping matches via SerpApi
      const matches = await fetchShoppingMatches(enrichedLabel);

      detectedProductsToSave.push({
        label: enrichedLabel,
        category: getCategoryForObject(obj.name),
        box: obj.box,
        thumbnailUrl: matches[0]?.thumbnail || null,
        matches,
      });
    }

    // Save unique detected objects to the database (for bounding box overlays compatibility)
    const objectsToSave = Array.from(uniqueObjects.values());
    console.log(`Saving ${objectsToSave.length} detected objects to database...`);

    if (objectsToSave.length > 0) {
      await prisma.detectedObject.deleteMany({
        where: { postId },
      });

      await prisma.detectedObject.createMany({
        data: objectsToSave.map((obj) => ({
          postId,
          name: obj.name,
          box: obj.box,
        })),
      });
    }

    // Save detected products and matches
    console.log(`Saving ${detectedProductsToSave.length} detected products with matches...`);
    await prisma.detectedProduct.deleteMany({
      where: { postId },
    });

    for (const prod of detectedProductsToSave) {
      await prisma.detectedProduct.create({
        data: {
          postId,
          label: prod.label,
          category: prod.category,
          box: prod.box,
          thumbnailUrl: prod.thumbnailUrl,
          matches: {
            create: prod.matches.map((m: any) => ({
              title: m.title,
              price: m.price,
              sourceStore: m.merchant,
              productUrl: m.link,
              imageUrl: m.thumbnail || null,
            })),
          },
        },
      });
    }

    // Set status to COMPLETED
    await prisma.post.update({
      where: { id: postId },
      data: { aiStatus: "COMPLETED" },
    });

    return NextResponse.json({
      success: true,
      detectedCount: detectedProductsToSave.length,
      products: detectedProductsToSave.map((p) => p.label),
    });
  } catch (error: any) {
    console.error("Error processing reel:", error);
    if (postId) {
      try {
        await prisma.post.update({
          where: { id: postId },
          data: { aiStatus: "FAILED" },
        });
      } catch (dbErr) {
        console.error("Failed to update status to FAILED in database:", dbErr);
      }
    }
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  } finally {
    // Cleanup temporary files
    try {
      if (tempVideoPath && fs.existsSync(tempVideoPath)) {
        fs.unlinkSync(tempVideoPath);
        console.log(`Cleaned up temp video: ${tempVideoPath}`);
      }
      extractedFrames.forEach((framePath) => {
        if (fs.existsSync(framePath)) {
          fs.unlinkSync(framePath);
          console.log(`Cleaned up frame: ${framePath}`);
        }
      });
    } catch (cleanupErr) {
      console.error("Error during temp files cleanup:", cleanupErr);
    }
  }
}
