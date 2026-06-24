import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const query = req.nextUrl.searchParams.get("q");

    if (!query) {
      return NextResponse.json({ error: "Missing search query parameter 'q'" }, { status: 400 });
    }

    const serpApiKey = process.env.SERPAPI_KEY;

    if (!serpApiKey) {
      console.log(`SerpApi API key is not configured. Returning mock products for query: "${query}"`);
      const mockProducts = getMockProducts(query);
      return NextResponse.json({ products: mockProducts });
    }

    console.log(`Fetching SerpApi Google Shopping results for: "${query}"`);
    const url = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(
      query
    )}&google_domain=google.co.in&gl=in&hl=en&api_key=${serpApiKey}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`SerpApi search request failed with status: ${response.status}`);
    }

    const data = await response.json();
    const products = (data.shopping_results || []).slice(0, 8).map((item: any) => ({
      title: item.title,
      price: item.price,
      merchant: item.source || item.merchant || "Online Retailer",
      thumbnail: item.thumbnail,
      link: item.link,
    }));

    return NextResponse.json({ products });
  } catch (error: any) {
    console.error("Error in shopping lookup:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// Mock products database targeting the Indian ecommerce market
function getMockProducts(query: string) {
  const q = query.toLowerCase();

  if (q.includes("jacket") || q.includes("coat") || q.includes("outerwear")) {
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
      {
        title: "Tommy Hilfiger Men Colorblocked Windbreaker Jacket",
        price: "₹8,999",
        merchant: "Ajio",
        thumbnail: "https://images.unsplash.com/photo-1495105787522-5334e3ffa0ef?w=500&auto=format&fit=crop&q=60",
        link: "https://www.ajio.com",
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
        title: "Adidas Originals Superstar Premium Classic Shoes",
        price: "₹7,999",
        merchant: "Ajio",
        thumbnail: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=60",
        link: "https://www.ajio.com",
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

  if (
    q.includes("handbag") ||
    q.includes("bag") ||
    q.includes("backpack") ||
    q.includes("purse")
  ) {
    return [
      {
        title: "Baggit Women Structured Medium Shoulder Handbag",
        price: "₹1,249",
        merchant: "Myntra",
        thumbnail: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500&auto=format&fit=crop&q=60",
        link: "https://www.myntra.com",
      },
      {
        title: "Lavie Betty Women Faux Leather Solid Satchel Handbag",
        price: "₹2,199",
        merchant: "Flipkart",
        thumbnail: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=500&auto=format&fit=crop&q=60",
        link: "https://www.flipkart.com",
      },
    ];
  }

  // Generic fallback category results
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
