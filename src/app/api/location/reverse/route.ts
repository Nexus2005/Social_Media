import { NextRequest } from "next/server";
import { validateRequest } from "@/auth";

export async function GET(req: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");

    if (!lat || !lng) {
      return Response.json({ error: "Missing lat/lng" }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "API Key not configured" }, { status: 500 });
    }

    const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;

    const response = await fetch(googleUrl);
    if (!response.ok) {
      throw new Error(`Google geocoding returned status ${response.status}`);
    }

    const data = await response.json();
    const result = data.results && data.results[0];

    if (result) {
      // Extract city/neighborhood/country
      const name = result.formatted_address || "Current Location";
      return Response.json({ name });
    }

    return Response.json({ name: "Unknown Location" });
  } catch (error) {
    console.error("Reverse geocoding API error:", error);
    return Response.json({ error: "Failed to reverse geocode" }, { status: 500 });
  }
}
