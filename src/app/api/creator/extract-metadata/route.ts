export const dynamic = "force-dynamic";

import { validateRequest } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

// Clean up basic HTML entities
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function extractMetaTag(html: string, propertyOrName: string): string | null {
  // Regex to match og: properties and generic meta names
  const propertyReg = new RegExp(
    `<meta[^>]*property=["']${propertyOrName}["'][^>]*content=["']([^"']+)["']`,
    "i"
  );
  const propertyRegReverse = new RegExp(
    `<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${propertyOrName}["']`,
    "i"
  );
  const nameReg = new RegExp(
    `<meta[^>]*name=["']${propertyOrName}["'][^>]*content=["']([^"']+)["']`,
    "i"
  );
  const nameRegReverse = new RegExp(
    `<meta[^>]*content=["']([^"']+)["'][^>]*name=["']${propertyOrName}["']`,
    "i"
  );

  const match = 
    html.match(propertyReg) || 
    html.match(propertyRegReverse) || 
    html.match(nameReg) || 
    html.match(nameRegReverse);

  return match ? decodeHtmlEntities(match[1].trim()) : null;
}

export async function GET(req: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = req.nextUrl.searchParams.get("url");
    if (!url) {
      return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
    }

    // Validate that it is a valid HTTP(S) URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        throw new Error("Invalid protocol");
      }
    } catch (e) {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    // Fetch the URL contents with a standard User-Agent header (some retailers block empty UAs)
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      next: { revalidate: 3600 } // cache fetches for 1 hour
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Failed to fetch URL: ${response.statusText}` }, { status: 402 });
    }

    const html = await response.text();

    // Extract values
    const title = extractMetaTag(html, "og:title") || 
                  extractMetaTag(html, "twitter:title") || 
                  (() => {
                    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
                    return titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : null;
                  })();

    const image = extractMetaTag(html, "og:image") || 
                  extractMetaTag(html, "twitter:image");

    const description = extractMetaTag(html, "og:description") || 
                        extractMetaTag(html, "description") || 
                        extractMetaTag(html, "twitter:description");

    const siteName = extractMetaTag(html, "og:site_name");

    // Guess brand based on site name or hostname
    let brand = siteName || "";
    if (!brand) {
      const hostname = parsedUrl.hostname.toLowerCase();
      // e.g. "www.amazon.in" -> "Amazon"
      const parts = hostname.replace("www.", "").split(".");
      if (parts.length > 0) {
        brand = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      }
    }

    // Extract price
    const priceAmount = extractMetaTag(html, "product:price:amount") || 
                        extractMetaTag(html, "og:price:amount") || 
                        extractMetaTag(html, "price");
    const priceCurrency = extractMetaTag(html, "product:price:currency") || 
                          extractMetaTag(html, "og:price:currency") || 
                          "INR";

    let price = "";
    if (priceAmount) {
      const currencySymbol = priceCurrency === "INR" ? "₹" : (priceCurrency === "USD" ? "$" : `${priceCurrency} `);
      price = `${currencySymbol}${priceAmount}`;
    }

    return NextResponse.json({
      title: title || "Product Title",
      brand: brand || "Brand Name",
      image: image || "",
      description: description || "",
      price: price || "",
      currency: priceCurrency,
    });
  } catch (error: any) {
    console.error("Error in metadata extractor route:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
