import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import streamServerClient from "@/lib/stream";
import supabaseAdmin from "@/lib/supabase";
import { validateMediaFile } from "@/lib/validation";

export async function POST(req: Request) {
  try {
    const { user } = await validateRequest();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const endpoint = formData.get("endpoint") as "avatar" | "attachment" | "story";
    const files = formData.getAll("files") as File[];

    if (!endpoint || !files.length) {
      return Response.json({ error: "Missing parameters" }, { status: 400 });
    }

    const uploadResults = [];

    for (const file of files) {
      if (endpoint === "attachment" || endpoint === "story") {
        const errorMsg = validateMediaFile(file);
        if (errorMsg) {
          return Response.json({ error: errorMsg }, { status: 400 });
        }
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const fileExtension = file.name.split(".").pop() || "";
      const uniqueId = crypto.randomUUID();

      if (endpoint === "avatar") {
        // Delete old avatar if it exists in Supabase Storage
        const oldAvatarUrl = user.avatarUrl;
        if (oldAvatarUrl && oldAvatarUrl.includes("/storage/v1/object/public/social-media/")) {
          const oldKey = oldAvatarUrl.split("/storage/v1/object/public/social-media/")[1];
          if (oldKey) {
            await supabaseAdmin.storage.from("social-media").remove([oldKey]);
          }
        }

        const fileKey = `avatars/${user.id}_${uniqueId}.${fileExtension}`;

        const { error } = await supabaseAdmin.storage
          .from("social-media")
          .upload(fileKey, buffer, {
            contentType: file.type,
            cacheControl: "3600",
            upsert: true,
          });

        if (error) throw error;

        const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/social-media/${fileKey}`;

        // Update database and Stream Chat
        await Promise.all([
          prisma.user.update({
            where: { id: user.id },
            data: { avatarUrl: publicUrl },
          }),
          streamServerClient.partialUpdateUser({
            id: user.id,
            set: { image: publicUrl },
          }),
        ]);

        uploadResults.push({
          name: file.name,
          url: publicUrl,
          serverData: {
            avatarUrl: publicUrl,
          },
        });
      } else if (endpoint === "attachment") {
        const fileKey = `attachments/${uniqueId}.${fileExtension}`;

        const { error } = await supabaseAdmin.storage
          .from("social-media")
          .upload(fileKey, buffer, {
            contentType: file.type,
            cacheControl: "31536000",
            upsert: true,
          });

        if (error) throw error;

        const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/social-media/${fileKey}`;

        // Create Media DB record
        const media = await prisma.media.create({
          data: {
            url: publicUrl,
            mediaType: file.type.startsWith("image") ? "IMAGE" : "VIDEO",
          },
        });

        uploadResults.push({
          name: file.name,
          url: publicUrl,
          serverData: {
            mediaId: media.id,
          },
        });
      } else if (endpoint === "story") {
        const fileKey = `stories/${uniqueId}.${fileExtension}`;

        const { error } = await supabaseAdmin.storage
          .from("social-media")
          .upload(fileKey, buffer, {
            contentType: file.type,
            cacheControl: "31536000",
            upsert: true,
          });

        if (error) throw error;

        const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/social-media/${fileKey}`;

        // Create Story DB record
        const story = await prisma.story.create({
          data: {
            userId: user.id,
            mediaUrl: publicUrl,
            mediaType: file.type.startsWith("image") ? "IMAGE" : "VIDEO",
          },
        });

        uploadResults.push({
          name: file.name,
          url: publicUrl,
          serverData: {
            storyId: story.id,
          },
        });
      }
    }

    return Response.json(uploadResults);
  } catch (error) {
    console.error("Upload error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
