import prisma from "@/lib/prisma";
import supabaseAdmin from "@/lib/supabase";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return Response.json(
        { message: "Invalid authorization header" },
        { status: 401 },
      );
    }

    const unusedMedia = await prisma.media.findMany({
      where: {
        postId: null,
        ...(process.env.NODE_ENV === "production"
          ? {
              createdAt: {
                lte: new Date(Date.now() - 1000 * 60 * 60 * 24),
              },
            }
          : {}),
      },
      select: {
        id: true,
        url: true,
      },
    });

    const fileKeys = unusedMedia
      .map((m) => {
        if (m.url.includes("/storage/v1/object/public/social-media/")) {
          return m.url.split("/storage/v1/object/public/social-media/")[1];
        }
        return null;
      })
      .filter(Boolean) as string[];

    if (fileKeys.length > 0) {
      await supabaseAdmin.storage.from("social-media").remove(fileKeys);
    }

    await prisma.media.deleteMany({
      where: {
        id: {
          in: unusedMedia.map((m) => m.id),
        },
      },
    });

    // Delete expired stories older than 24 hours
    await prisma.story.deleteMany({
      where: {
        createdAt: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    });

    return new Response();
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
