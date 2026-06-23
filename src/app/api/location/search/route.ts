import { NextRequest, NextResponse } from "next/server";
import { validateRequest } from "@/auth";

export async function GET(req: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";

    if (!query.trim() || query.trim().length < 2) {
      return NextResponse.json([]);
    }

    const encodedQuery = encodeURIComponent(query);
    const photonUrl = `https://photon.komoot.io/api?q=${encodedQuery}&limit=10`;

    // 1. Try Photon with AbortController for 3s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    try {
      const response = await fetch(photonUrl, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Photon returned status ${response.status}`);
      }

      const data = await response.json();
      const features = data.features || [];

      const results = features.map((feat: any) => {
        const props = feat.properties || {};
        const name = props.name || "";
        const city = props.city || props.town || props.village || props.suburb || "";
        const state = props.state || "";
        const country = props.country || "";
        const lat = feat.geometry?.coordinates?.[1] || null;
        const lng = feat.geometry?.coordinates?.[0] || null;
        
        // Build descriptive display strings
        const locationDisplay = [name, city].filter(Boolean).join(", ") || country || name;
        const description = [name, city, state, country].filter(Boolean).join(", ");

        return {
          name,
          city,
          state,
          country,
          locationDisplay,
          description,
          lat,
          lng,
        };
      });

      return NextResponse.json(results);
    } catch (photonErr) {
      clearTimeout(timeoutId);
      console.warn("Photon search timed out or failed, falling back to Nominatim:", photonErr);

      // 2. Fallback to Nominatim search
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=jsonv2&addressdetails=1&limit=10`;
      
      const nomResponse = await fetch(nominatimUrl, {
        headers: {
          "User-Agent": "Cartly-MVP/1.0",
        },
      });

      if (!nomResponse.ok) {
        throw new Error(`Nominatim fallback returned status ${nomResponse.status}`);
      }

      const nomData = await nomResponse.json();
      const results = (nomData || []).map((item: any) => {
        const address = item.address || {};
        const city = address.city || address.town || address.village || address.suburb || "";
        const state = address.state || "";
        const country = address.country || "";
        
        // Nominatim display name gives first comma segment as point name
        const displayName = item.display_name || "";
        const name = displayName.split(",")[0] || "";
        
        const locationDisplay = [name, city].filter(Boolean).join(", ") || country || name;

        return {
          name,
          city,
          state,
          country,
          locationDisplay,
          description: displayName,
          lat: parseFloat(item.lat) || null,
          lng: parseFloat(item.lon) || null,
        };
      });

      return NextResponse.json(results);
    }
  } catch (error) {
    console.error("Location search API error:", error);
    return NextResponse.json({ error: "Failed to search location" }, { status: 500 });
  }
}
