import prisma from "@/lib/prisma";
import supabaseAdmin from "@/lib/supabase";

export async function GET(req: Request) {
  try {
    // 1. Verify Authorization Bearer Header
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const secret = process.env.CRON_SECRET || "cartly-instants-cron-default-secret-2026";
    if (token !== secret) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2. Identify instants older than 365 days (1 year archive limit)
    const expirationDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const expiredSnaps = await prisma.instant.findMany({
      where: {
        createdAt: { lt: expirationDate },
      },
      select: {
        id: true,
        mediaUrl: true,
      },
    });

    if (expiredSnaps.length === 0) {
      return Response.json({ success: true, message: "No expired instants found." });
    }

    // 3. Extract supabase file keys to delete them physically from storage
    const keysToDelete: string[] = [];
    for (const snap of expiredSnaps) {
      if (snap.mediaUrl.includes("/storage/v1/object/public/social-media/")) {
        const key = snap.mediaUrl.split("/storage/v1/object/public/social-media/")[1];
        if (key) {
          keysToDelete.push(key);
        }
      }
    }

    if (keysToDelete.length > 0) {
      const { error: storageError } = await supabaseAdmin.storage
        .from("social-media")
        .remove(keysToDelete);
      
      if (storageError) {
        console.error("Supabase file cleanup failed:", storageError);
      }
    }

    // 4. Delete DB rows (cascades related view entries)
    const result = await prisma.instant.deleteMany({
      where: {
        id: { in: expiredSnaps.map((s) => s.id) },
      },
    });

    return Response.json({
      success: true,
      message: `Successfully cleaned up ${result.count} expired instants.`,
    });
  } catch (error) {
    console.error("Failed to run instants cleanup cron:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
