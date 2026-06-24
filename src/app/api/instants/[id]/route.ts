import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import supabaseAdmin from "@/lib/supabase";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    const instant = await prisma.instant.findUnique({
      where: { id },
    });

    if (!instant) {
      return Response.json({ error: "Instant not found" }, { status: 404 });
    }

    if (instant.senderId !== user.id) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // Clean up physical file from Supabase storage bucket
    const mediaUrl = instant.mediaUrl;
    if (mediaUrl.includes("/storage/v1/object/public/social-media/")) {
      const key = mediaUrl.split("/storage/v1/object/public/social-media/")[1];
      if (key) {
        await supabaseAdmin.storage.from("social-media").remove([key]);
      }
    }

    // Delete database entry (cascades views)
    await prisma.instant.delete({
      where: { id },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to delete instant:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
