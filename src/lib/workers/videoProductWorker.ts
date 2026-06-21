import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import crypto from "crypto";
import { extractFramesFromVideo } from "../videoProcessor";

// Load environment variables manually to support independent execution
function loadEnv() {
  try {
    const envPath = path.join(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, "utf-8").split("\n");
      for (const line of lines) {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = match[2] || "";
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
          }
          process.env[key] = value;
        }
      }
    }
  } catch (e) {
    console.error("Failed to load .env manually:", e);
  }
}
loadEnv();

const prisma = new PrismaClient();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing Supabase configuration environment variables.");
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
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

// Amazon Affiliate URL parser/creator
function generateAffiliateUrl(urlStr: string): string | null {
  if (!urlStr) return null;
  try {
    const url = new URL(urlStr);
    if (url.hostname.includes("amazon.")) {
      url.searchParams.set("tag", "omkarstore086-21");
      return url.toString();
    }
  } catch (e) {
    console.error("Failed to parse affiliate URL:", e);
  }
  return urlStr;
}

function parsePriceToFloat(priceStr: string): number | null {
  if (!priceStr) return null;
  const cleaned = priceStr.replace(/[^0-9.]/g, "");
  const val = parseFloat(cleaned);
  return isNaN(val) ? null : val;
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

  if (q.includes("shoes") || q.includes("footwear") || q.includes("sneaker") || q.includes("boots")) {
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
      price: item.price || "Contact Store",
      merchant: item.source || item.merchant || "Online Retailer",
      thumbnail: item.thumbnail || null,
      link: item.link || item.product_link || item.shopping_link || item.serpapi_product_api || `https://www.google.com/search?q=${encodeURIComponent(item.title)}`,
    }));
  } catch (err) {
    console.error(`Failed to fetch SerpApi shopping matches for "${query}":`, err);
    return getMockProducts(query);
  }
}

// Vision VLM call helper for full-frame analysis
async function queryVisionLLM(
  base64Image: string,
  onCallIncrement: (calls: { openrouter: number; nvidia: number }) => void
): Promise<any> {
  const openrouterApiKey = process.env.OPENROUTER_API_KEY;
  const openrouterModel = process.env.OPENROUTER_VISION_MODEL || "qwen/qwen-2-vl-7b-instruct";

  const promptText = `Analyze this image and identify all visible, purchaseable fashion products. Return ONLY a JSON object matching this structure:
{
  "products": [
    {
      "category": "Clothing | Shoes | Bags | Watches | Jewelry | Sunglasses",
      "description": "Short specific shopping description of the product (e.g. 'white nike-style running sneakers')",
      "color": "dominant color name",
      "material": "material name (e.g. 'mesh', 'leather', 'cotton')",
      "confidence": 0.91,
      "gender": "Men | Women | Unisex",
      "style": "Casual | Streetwear | Travel | Formal | Sporty | Biker | Minimalist",
      "season": "Summer | Winter | Spring | Autumn | All-Season",
      "keywords": ["tag1", "tag2"]
    }
  ]
}

Only return products a user could realistically purchase online.
Ignore: people, faces, backgrounds, trees, buildings, furniture, pets, vehicles.`;

  if (openrouterApiKey) {
    try {
      onCallIncrement({ openrouter: 1, nvidia: 0 });
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openrouterApiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "Cartly Visual Commerce",
        },
        body: JSON.stringify({
          model: openrouterModel,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: promptText },
                {
                  type: "image_url",
                  image_url: { url: `data:image/jpeg;base64,${base64Image}` },
                },
              ],
            },
          ],
        }),
      });

      if (response.ok) {
        const json = await response.json();
        const content = json.choices?.[0]?.message?.content?.trim();
        if (content) {
          const cleaned = content.replace(/```json|```/g, "").trim();
          const parsed = JSON.parse(cleaned);
          if (parsed && Array.isArray(parsed.products)) {
            return parsed;
          }
        }
      } else {
        const errText = await response.text();
        console.error(`OpenRouter Vision VLM API responded with status ${response.status}: ${errText}`);
      }
    } catch (err) {
      console.error("OpenRouter Vision VLM query failed, checking fallback:", err);
    }
  }

  // Fallback: NVIDIA Vision API
  const nvidiaApiKey = process.env.NVIDIA_API_KEY;
  const nvidiaModel = process.env.NVIDIA_VISION_MODEL || "nvidia/llama-3.2-11b-vision-instruct";

  if (nvidiaApiKey) {
    try {
      onCallIncrement({ openrouter: 0, nvidia: 1 });
      const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${nvidiaApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: nvidiaModel,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: promptText },
                {
                  type: "image_url",
                  image_url: { url: `data:image/jpeg;base64,${base64Image}` },
                },
              ],
            },
          ],
        }),
      });

      if (response.ok) {
        const json = await response.json();
        const content = json.choices?.[0]?.message?.content?.trim();
        if (content) {
          const cleaned = content.replace(/```json|```/g, "").trim();
          const parsed = JSON.parse(cleaned);
          if (parsed && Array.isArray(parsed.products)) {
            return parsed;
          }
        }
      } else {
        const errText = await response.text();
        console.error(`NVIDIA Vision VLM API responded with status ${response.status}: ${errText}`);
      }
    } catch (err) {
      console.error("NVIDIA Vision VLM fallback query failed:", err);
    }
  }

  return null;
}

// Upstash Redis client REST calls
async function runRedisCommand(command: string[]): Promise<any> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return null;
  }
  try {
    const res = await fetch(`${url}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
    });
    if (!res.ok) {
      throw new Error(`Upstash Redis REST error ${res.status}: ${res.statusText}`);
    }
    const data = await res.json();
    return data.result;
  } catch (err) {
    console.error("Redis command failed:", err);
    return null;
  }
}

// Processing Core Logic (Google Vision-Free Direct VLM Pipeline)
async function runVideoProcessor(videoId: string, jobId: string) {
  const startTime = Date.now();
  console.log(`\n======================================================`);
  console.log(`Processing Video/Reel ID: ${videoId}`);
  console.log(`======================================================`);

  let openrouterCalls = 0;
  let nvidiaCalls = 0;
  let serpapiCalls = 0;
  let openrouterResults: any[] = [];

  // Strict Fashion Category Whitelist for Phase 1
  const ALLOWED_CATEGORIES = new Set([
    "Clothing",
    "Shoes",
    "Bags",
    "Watches",
    "Jewelry",
    "Sunglasses"
  ]);

  // Idempotency/Cache Check
  const currentJob = await prisma.videoProcessingJob.findUnique({
    where: { postId: videoId },
  });
  if (currentJob && (currentJob.status === "completed" || currentJob.status === "no_products")) {
    console.log(`Video ${videoId} already successfully processed. Exiting background worker loop.`);
    return;
  }

  const post = await prisma.post.findUnique({
    where: { id: videoId },
    include: { attachments: true },
  });

  if (!post) throw new Error("Post not found");

  const videoAttachment = post.attachments.find((a) => a.mediaType === "VIDEO");
  if (!videoAttachment) throw new Error("Post does not contain a video attachment");

  const videoUrl = videoAttachment.url;
  const tmpDir = path.join(process.cwd(), "tmp");
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const fileExtension = videoUrl.split(".").pop()?.split("?")[0] || "mp4";
  const tempVideoPath = path.join(tmpDir, `temp-${videoId}.${fileExtension}`);

  let extractedFrames: { path: string; timestamp: number }[] = [];

  try {
    // 1. Download Video
    console.log(`Downloading video from: ${videoUrl}`);
    const res = await fetch(videoUrl);
    if (!res.ok) throw new Error(`Failed to download video: ${res.statusText}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    await fs.promises.writeFile(tempVideoPath, buffer);

    // 2. Extract exactly 6 frames with timestamps
    extractedFrames = await extractFramesFromVideo(tempVideoPath);

    const detectedProductsToSave: any[] = [];
    let vlmCalls = 0;
    const maxVlmCalls = 6;

    // 3. Analyze frames sequentially using VLM
    for (const frame of extractedFrames) {
      if (vlmCalls >= maxVlmCalls) {
        console.log(`Reached max VLM calls limit of ${maxVlmCalls}. Stopping sequential VLM scanning.`);
        break;
      }

      console.log(`Querying VLM for frame at ${frame.timestamp}s...`);
      const frameBuffer = await fs.promises.readFile(frame.path);
      const base64Frame = frameBuffer.toString("base64");

      vlmCalls++;
      const vlmResponse = await queryVisionLLM(base64Frame, (calls) => {
        openrouterCalls += calls.openrouter;
        nvidiaCalls += calls.nvidia;
      });

      if (!vlmResponse || !Array.isArray(vlmResponse.products)) {
        console.log(`VLM returned no valid products array for frame at ${frame.timestamp}s.`);
        continue;
      }

      openrouterResults.push({ timestamp: frame.timestamp, products: vlmResponse.products });

      for (const prod of vlmResponse.products) {
        const category = prod.category?.trim();
        const description = prod.description?.trim();
        const color = prod.color?.trim() || "unknown";
        const material = prod.material?.trim() || "unknown";
        const confidence = prod.confidence ?? 0.85;

        if (!description) continue;

        // Strict category validation
        if (!ALLOWED_CATEGORIES.has(category)) {
          console.log(`Skipping item "${description}": Category "${category}" is not in whitelist.`);
          continue;
        }

        // Deduplication: category + color + description similarity >= 0.85
        let isDuplicate = false;
        for (const existing of detectedProductsToSave) {
          const isSameCategory = existing.category === category;
          const isSameColor = existing.color?.toLowerCase() === color.toLowerCase();
          const textSim = getStringSimilarity(existing.label, description);

          if (isSameCategory && isSameColor && textSim >= 0.85) {
            isDuplicate = true;
            break;
          }
        }

        if (isDuplicate) {
          console.log(`Skipping duplicate item: "${description}"`);
          continue;
        }

        // Confidence filtering (>= 0.80) BEFORE SerpApi queries
        if (confidence < 0.80) {
          console.log(`Skipping item "${description}" below confidence threshold (score: ${confidence}).`);
          continue;
        }

        // Capping products limit to 10 (keep highest confidence)
        if (detectedProductsToSave.length >= 10) {
          detectedProductsToSave.sort((a, b) => a.confidence - b.confidence);
          if (confidence > detectedProductsToSave[0].confidence) {
            console.log(`Replacing low confidence product "${detectedProductsToSave[0].label}" (${detectedProductsToSave[0].confidence}) with higher confidence product "${description}" (${confidence}).`);
            detectedProductsToSave[0] = {
              label: description,
              category,
              color,
              material,
              confidence,
              gender: prod.gender?.trim() || "Unisex",
              style: prod.style?.trim() || "Casual",
              season: prod.season?.trim() || "All-Season",
              keywords: Array.isArray(prod.keywords) ? prod.keywords.map((k: any) => String(k).trim()) : [],
              frameTimestamp: frame.timestamp,
              framePath: frame.path,
            };
          }
        } else {
          detectedProductsToSave.push({
            label: description,
            category,
            color,
            material,
            confidence,
            gender: prod.gender?.trim() || "Unisex",
            style: prod.style?.trim() || "Casual",
            season: prod.season?.trim() || "All-Season",
            keywords: Array.isArray(prod.keywords) ? prod.keywords.map((k: any) => String(k).trim()) : [],
            frameTimestamp: frame.timestamp,
            framePath: frame.path,
          });
        }
      }
    }

    // 4. Query SerpApi Shopping Matches and Upload Frame to Supabase
    for (const prod of detectedProductsToSave) {
      console.log(`Google Shopping lookup for: "${prod.label}"`);
      serpapiCalls++;
      const matches = await fetchShoppingMatches(prod.label);

      let uploadedSourceFrameUrl: string | null = null;

      // Save full source frame that generated detection to Supabase Storage only if matches exist
      if (matches.length > 0) {
        try {
          const frameBuffer = await fs.promises.readFile(prod.framePath);
          const frameKey = `products/frames/${videoId}_${crypto.randomUUID()}.jpg`;
          const { error: frameError } = await supabaseAdmin.storage
            .from("social-media")
            .upload(frameKey, frameBuffer, {
              contentType: "image/jpeg",
              cacheControl: "31536000",
              upsert: true,
            });

          if (frameError) {
            console.error("Failed to upload frame:", frameError);
          } else {
            uploadedSourceFrameUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/social-media/${frameKey}`;
          }
        } catch (uploadErr) {
          console.error("Failed to upload frame file:", uploadErr);
        }
      }

      prod.sourceFrameUrl = uploadedSourceFrameUrl;
      prod.thumbnailUrl = matches[0]?.thumbnail || null;
      prod.matches = matches;
    }

    // 5. Save Detected Products and Shopping Matches to DB
    await prisma.detectedProduct.deleteMany({
      where: { postId: videoId },
    });

    for (const prod of detectedProductsToSave) {
      // Calculate completenessScore
      let score = 0;
      if (prod.label) score += 0.2;
      if (prod.category) score += 0.2;
      if (prod.color && prod.color !== "unknown") score += 0.1;
      if (prod.material && prod.material !== "unknown") score += 0.1;
      if (prod.gender) score += 0.1;
      if (prod.style) score += 0.1;
      if (prod.season) score += 0.1;
      if (prod.keywords && prod.keywords.length > 0) score += 0.1;

      const isVerified = prod.confidence >= 0.85;

      await prisma.detectedProduct.create({
        data: {
          postId: videoId,
          label: prod.label,
          category: prod.category,
          color: prod.color,
          confidence: prod.confidence,
          frameTimestamp: prod.frameTimestamp,
          sourceFrameUrl: prod.sourceFrameUrl,
          dominantColor: prod.color,
          box: undefined,
          thumbnailUrl: prod.thumbnailUrl,
          
          // Phase 2 fields
          visionConfidence: prod.confidence,
          shoppingMatchConfidence: prod.confidence,
          completenessScore: score,
          isVerifiedMatch: isVerified,
          gender: prod.gender,
          style: prod.style,
          season: prod.season,
          material: prod.material,
          keywords: prod.keywords,

          matches: {
            create: prod.matches.map((m: any) => {
              const parsedPrice = parsePriceToFloat(m.price);
              return {
                title: m.title || "Product Match",
                price: m.price || "Contact Store",
                sourceStore: m.merchant || "Online Retailer",
                productUrl: m.link || "https://www.google.com",
                affiliateUrl: generateAffiliateUrl(m.link || "https://www.google.com"),
                imageUrl: m.thumbnail || null,
                priceHistories: parsedPrice !== null ? {
                  create: {
                    price: parsedPrice,
                  },
                } : undefined,
              };
            }),
          },
        },
      });
    }

    // Estimate processing costs
    const processingTime = parseFloat(((Date.now() - startTime) / 1000).toFixed(2));
    const processingCost = parseFloat(
      (
        openrouterCalls * 0.015 +
        nvidiaCalls * 0.005 +
        serpapiCalls * 0.01
      ).toFixed(5)
    );

    // Save Video Log
    await prisma.videoProcessingLog.create({
      data: {
        videoId,
        processingTime,
        visionCalls: 0,
        openrouterCalls,
        nvidiaCalls,
        serpapiCalls,
        processingCost,
        visionResults: undefined,
        openrouterResults: openrouterResults || undefined,
        nvidiaFallbackUsage: nvidiaCalls > 0,
        shoppingResultsCount: detectedProductsToSave.reduce((acc, p) => acc + (p.matches?.length || 0), 0),
        errorMessages: null,
      },
    });

    // Set job status
    const finalStatus = detectedProductsToSave.length === 0 ? "no_products" : "completed";

    await prisma.videoProcessingJob.update({
      where: { postId: videoId },
      data: {
        status: finalStatus,
        completedAt: new Date(),
      },
    });

    console.log(`Video processing completed for ${videoId}. Products: ${detectedProductsToSave.length}. Status: ${finalStatus}`);
  } catch (err: any) {
    const processingTime = parseFloat(((Date.now() - startTime) / 1000).toFixed(2));
    await prisma.videoProcessingLog.create({
      data: {
        videoId,
        processingTime,
        visionCalls: 0,
        openrouterCalls,
        nvidiaCalls,
        serpapiCalls,
        processingCost: 0.0,
        visionResults: undefined,
        openrouterResults: openrouterResults || undefined,
        nvidiaFallbackUsage: false,
        shoppingResultsCount: 0,
        errorMessages: err.message || String(err),
      },
    });
    throw err;
  } finally {
    // Cleanup temporary files
    try {
      if (tempVideoPath && fs.existsSync(tempVideoPath)) {
        fs.unlinkSync(tempVideoPath);
      }
      extractedFrames.forEach((frame) => {
        if (fs.existsSync(frame.path)) {
          fs.unlinkSync(frame.path);
        }
      });
    } catch (cleanupErr) {
      console.error("Cleanup error in worker:", cleanupErr);
    }
  }
}

// Queue execution loop with lock safety and backoff polling
async function processNextQueueItem(): Promise<boolean> {
  const isRedisActive = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
  let jobId: string | null = null;
  let videoId: string | null = null;

  if (isRedisActive) {
    const payloadStr = await runRedisCommand(["RPOP", "video-product-processing"]);
    if (!payloadStr) return false;
    
    try {
      const payload = JSON.parse(payloadStr);
      videoId = payload.videoId;
    } catch (e) {
      console.error("Failed to parse Redis queue payload:", payloadStr);
      return true;
    }

    if (!videoId) return true;

    // Acquire Redis lock (lock active for 5 mins)
    const lockAcquired = await runRedisCommand(["SET", "video-processing-lock", "true", "EX", "300", "NX"]);
    if (lockAcquired !== "OK") {
      // Re-enqueue job at the tail
      await runRedisCommand(["RPUSH", "video-product-processing", payloadStr]);
      return false; 
    }

    let dbJob = await prisma.videoProcessingJob.findUnique({
      where: { postId: videoId },
    });

    if (!dbJob) {
      dbJob = await prisma.videoProcessingJob.create({
        data: { postId: videoId, status: "processing", startedAt: new Date() },
      });
    } else {
      if (dbJob.status === "completed" || dbJob.status === "no_products") {
        await runRedisCommand(["DEL", "video-processing-lock"]);
        return true; 
      }
      dbJob = await prisma.videoProcessingJob.update({
        where: { id: dbJob.id },
        data: { status: "processing", startedAt: new Date() },
      });
    }
    jobId = dbJob.id;
  } else {
    // Fallback DB queue
    const pendingJob = await prisma.videoProcessingJob.findFirst({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
    });
    if (!pendingJob) return false;

    // Lock DB job using atomic status update check
    const updateResult = await prisma.videoProcessingJob.updateMany({
      where: { id: pendingJob.id, status: "pending" },
      data: { status: "processing", startedAt: new Date() },
    });

    if (updateResult.count === 0) {
      return false; 
    }

    jobId = pendingJob.id;
    videoId = pendingJob.postId;
  }

  try {
    await runVideoProcessor(videoId!, jobId!);
  } catch (err: any) {
    console.error(`Failed to process video ${videoId}:`, err);
    const currentJob = await prisma.videoProcessingJob.findUnique({
      where: { id: jobId! },
    });
    if (currentJob) {
      const nextRetryCount = currentJob.retryCount + 1;
      if (nextRetryCount >= 3) {
        await prisma.videoProcessingJob.update({
          where: { id: jobId },
          data: {
            status: "failed",
            error: err.message || String(err),
            completedAt: new Date(),
          },
        });
      } else {
        await prisma.videoProcessingJob.update({
          where: { id: jobId },
          data: {
            status: "pending",
            retryCount: nextRetryCount,
            lastRetryAt: new Date(),
            error: err.message || String(err),
          },
        });
        if (isRedisActive) {
          await runRedisCommand(["LPUSH", "video-product-processing", JSON.stringify({ videoId, createdAt: Date.now() })]);
        }
      }
    }
  } finally {
    if (isRedisActive) {
      await runRedisCommand(["DEL", "video-processing-lock"]);
    }
  }

  return true;
}

// Exponential Backoff intervals (1s, 2s, 5s, 10s, 30s)
const BACKOFF_STEPS = [1000, 2000, 5000, 10000, 30000];
let backoffIndex = 0;

async function startWorker() {
  console.log("Cartly Video Product Detection Background Worker started.");
  while (true) {
    let jobProcessed = false;
    try {
      jobProcessed = await processNextQueueItem();
    } catch (err) {
      console.error("Error in worker execution loop:", err);
    }

    if (jobProcessed) {
      backoffIndex = 0; 
    } else {
      const delay = BACKOFF_STEPS[backoffIndex];
      console.log(`Worker idle. Backing off for ${delay / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      if (backoffIndex < BACKOFF_STEPS.length - 1) {
        backoffIndex++;
      }
    }
  }
}

startWorker().catch((err) => {
  console.error("Fatal worker error:", err);
  process.exit(1);
});
