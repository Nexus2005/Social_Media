import { NextRequest, NextResponse } from "next/server";
import { SearchManager } from "../../../lib/marketplace/searchManager";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const query = req.nextUrl.searchParams.get("q");

    if (!query) {
      return NextResponse.json({ error: "Missing search query parameter 'q'" }, { status: 400 });
    }

    console.log(`Fetching marketplace results (eBay/AliExpress) for: "${query}"`);
    const results = await SearchManager.search(query, 8);

    const products = results.map((item) => ({
      title: item.title,
      price: item.price,
      merchant: item.merchant,
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


