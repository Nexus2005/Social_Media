import { NextRequest, NextResponse } from "next/server";
import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const recents = await prisma.recentLocation.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    // Map database fields back to LocationData standard structure
    const results = recents.map((loc) => ({
      name: loc.locationName,
      city: loc.city || "",
      state: loc.state || "",
      country: loc.country || "",
      lat: loc.latitude || undefined,
      lng: loc.longitude || undefined,
      locationDisplay: [loc.locationName, loc.city].filter(Boolean).join(", ") || loc.country || loc.locationName,
      description: [loc.locationName, loc.city, loc.state, loc.country].filter(Boolean).join(", "),
    }));

    return NextResponse.json(results);
  } catch (error) {
    console.error("GET recent locations error:", error);
    return NextResponse.json({ error: "Failed to fetch recent locations" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, city, state, country, lat, lng } = body;

    if (!name) {
      return NextResponse.json({ error: "Missing location name" }, { status: 400 });
    }

    // 1. Create the new recent location
    await prisma.recentLocation.create({
      data: {
        userId: user.id,
        locationName: name,
        city: city || null,
        state: state || null,
        country: country || null,
        latitude: lat ? parseFloat(String(lat)) : null,
        longitude: lng ? parseFloat(String(lng)) : null,
      },
    });

    // 2. Query all user's recent locations sorted by createdAt desc
    const userRecents = await prisma.recentLocation.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    // 3. Keep only the 5 most recent, delete the rest
    if (userRecents.length > 5) {
      const idsToDelete = userRecents.slice(5).map((r) => r.id);
      await prisma.recentLocation.deleteMany({
        where: {
          id: {
            in: idsToDelete,
          },
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST recent location error:", error);
    return NextResponse.json({ error: "Failed to save recent location" }, { status: 500 });
  }
}
