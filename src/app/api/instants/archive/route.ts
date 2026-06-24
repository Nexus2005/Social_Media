import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Snaps can be retrieved by their sender for up to a year
    const archive = await prisma.instant.findMany({
      where: { senderId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return Response.json(archive);
  } catch (error) {
    console.error("Failed to fetch archive:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { instantIds } = await req.json();
    if (!instantIds || !Array.isArray(instantIds) || !instantIds.length) {
      return Response.json({ error: "Select at least one instant to recap" }, { status: 400 });
    }

    // Fetch the instants that belong to the user
    const instants = await prisma.instant.findMany({
      where: {
        id: { in: instantIds },
        senderId: user.id,
      },
    });

    if (!instants.length) {
      return Response.json({ error: "No valid instants found to compile" }, { status: 404 });
    }

    // Create standard Story entries for each selected instant to post as a recap story
    const storiesData = instants.map((snap) => ({
      userId: user.id,
      mediaUrl: snap.mediaUrl,
      mediaType: "IMAGE" as const,
    }));

    await prisma.story.createMany({
      data: storiesData,
    });

    return Response.json({ success: true, count: storiesData.length });
  } catch (error) {
    console.error("Failed to compile instants recap:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
