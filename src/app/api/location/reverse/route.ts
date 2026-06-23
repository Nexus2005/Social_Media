import { NextRequest, NextResponse } from "next/server";
import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const latStr = searchParams.get("lat");
    const lngStr = searchParams.get("lng");

    if (!latStr || !lngStr) {
      return NextResponse.json({ error: "Missing lat/lng" }, { status: 400 });
    }

    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
    }

    // 1. Round to 5 decimal places (~1.1 meter accuracy)
    const latRounded = Number(lat.toFixed(5));
    const lngRounded = Number(lng.toFixed(5));

    // 2. Check database cache
    const now = new Date();
    const cached = await prisma.locationCache.findFirst({
      where: {
        latRounded,
        lngRounded,
        expiresAt: {
          gt: now,
        },
      },
    });

    if (cached) {
      return NextResponse.json({
        name: cached.displayName,
        displayName: cached.displayName,
        city: cached.city || "",
        state: cached.state || "",
        country: cached.country || "",
        osmId: cached.osmId || "",
        lat: latRounded,
        lng: lngRounded,
      });
    }

    // 3. Cache miss: fetch from Nominatim
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latRounded}&lon=${lngRounded}`;

    const response = await fetch(nominatimUrl, {
      headers: {
        "User-Agent": "Cartly-MVP/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim returned status ${response.status}`);
    }

    const data = await response.json();
    const address = data.address || {};
    const osmId = data.osm_id ? String(data.osm_id) : null;

    const city = address.city || address.town || address.village || address.suburb || address.city_district || "";
    const state = address.state || "";
    const country = address.country || "";
    const displayName = data.display_name || "Unknown Location";

    // 4. Save/update cache
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours expiry

    await prisma.locationCache.upsert({
      where: {
        latRounded_lngRounded: {
          latRounded,
          lngRounded,
        },
      },
      update: {
        osmId,
        displayName,
        city,
        state,
        country,
        expiresAt,
      },
      create: {
        latRounded,
        lngRounded,
        osmId,
        displayName,
        city,
        state,
        country,
        expiresAt,
      },
    });

    return NextResponse.json({
      name: displayName,
      displayName,
      city,
      state,
      country,
      osmId,
      lat: latRounded,
      lng: lngRounded,
    });
  } catch (error) {
    console.error("Reverse geocoding API error:", error);
    return NextResponse.json({ error: "Failed to reverse geocode" }, { status: 500 });
  }
}
