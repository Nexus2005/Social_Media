import { NextRequest } from "next/server";
import { validateRequest } from "@/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") || "";

  console.log(`[Location Diagnostics] Query: "${query}"`);

  try {
    const { user } = await validateRequest();
    if (!user) {
      console.warn("[Location Diagnostics] Unauthorised request");
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!query.trim()) {
      return Response.json([]);
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      console.error("[Location Diagnostics] Google API Key is missing in environment variables!");
      return Response.json({ error: "API Key not configured" }, { status: 500 });
    }

    console.log("[Location Diagnostics] Google Maps API Key loaded successfully.");

    const googleUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
      query
    )}&key=${apiKey}`;

    console.log(`[Location Diagnostics] Dispatching request to URL: ${googleUrl.replace(apiKey, "HIDDEN_KEY")}`);

    const response = await fetch(googleUrl);
    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Location Diagnostics] Google Places error: status ${response.status}. Body: ${errText}`);
      throw new Error(`Google places autocomplete returned status ${response.status}`);
    }

    const data = await response.json();
    console.log(`[Location Diagnostics] Autocomplete response status: ${data.status}, predictions count: ${data.predictions?.length || 0}`);

    if (data.status && data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.error(`[Location Diagnostics] Google API returned non-OK status: ${data.status}. Error Message: ${data.error_message || "None"}`);
    }

    const results = (data.predictions || []).map((pred: any) => ({
      name: pred.structured_formatting?.main_text || pred.description,
      description: pred.description,
    }));

    return Response.json(results);
  } catch (error: any) {
    console.error("[Location Diagnostics] Failed processing request:", error);
    return Response.json({ error: error.message || "Failed to search location" }, { status: 500 });
  }
}
