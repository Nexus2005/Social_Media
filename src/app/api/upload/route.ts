import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import streamServerClient from "@/lib/stream";
import supabaseAdmin from "@/lib/supabase";
import { validateMediaFile } from "@/lib/validation";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { user } = await validateRequest();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const endpoint = searchParams.get("endpoint");
    const filename = searchParams.get("filename");
    const contentType = searchParams.get("contentType");

    if (!endpoint || !filename || !contentType) {
      return Response.json({ error: "Missing parameters" }, { status: 400 });
    }

    const fileExtension = filename.split(".").pop() || "";
    const uniqueId = crypto.randomUUID();
    let fileKey = "";

    if (endpoint === "avatar") {
      fileKey = `avatars/${user.id}_${uniqueId}.${fileExtension}`;
    } else if (endpoint === "banner") {
      fileKey = `banners/${user.id}_${uniqueId}.${fileExtension}`;
    } else if (endpoint === "attachment") {
      fileKey = `attachments/${uniqueId}.${fileExtension}`;
    } else if (endpoint === "story") {
      fileKey = `stories/${uniqueId}.${fileExtension}`;
    } else if (endpoint === "instant") {
      fileKey = `instants/${uniqueId}.${fileExtension}`;
    } else {
      return Response.json({ error: "Invalid endpoint" }, { status: 400 });
    }

    // Generate signed upload URL from Supabase
    const { data, error } = await supabaseAdmin.storage
      .from("social-media")
      .createSignedUploadUrl(fileKey);

    if (error) {
      console.error("Supabase sign error:", error);
      return Response.json({ error: "Failed to generate upload URL" }, { status: 500 });
    }

    const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/social-media/${fileKey}`;

    return Response.json({
      signedUrl: data.signedUrl,
      publicUrl,
      fileKey,
    });
  } catch (error) {
    console.error("Presign error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { user } = await validateRequest();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { endpoint, files, metadata, audience, bgUrl } = body;

    if (!endpoint) {
      return Response.json({ error: "Missing endpoint" }, { status: 400 });
    }

    const uploadResults = [];

    if (endpoint === "system-bg") {
      if (!bgUrl) {
        return Response.json({ error: "Missing bgUrl" }, { status: 400 });
      }
      let media = await prisma.media.findFirst({
        where: { url: bgUrl }
      });
      if (!media) {
        media = await prisma.media.create({
          data: {
            url: bgUrl,
            mediaType: "IMAGE",
            width: 1080,
            height: 1080,
          }
        });
      }
      uploadResults.push({
        name: "system_bg.png",
        url: bgUrl,
        serverData: {
          mediaId: media.id,
        }
      });
      return Response.json(uploadResults);
    }

    if (!files || !Array.isArray(files)) {
      return Response.json({ error: "Missing files list" }, { status: 400 });
    }

    for (const fileObj of files) {
      const { name, url, fileKey } = fileObj;

      if (endpoint === "avatar") {
        // Delete old avatar if it exists in Supabase Storage
        const oldAvatarUrl = user.avatarUrl;
        if (oldAvatarUrl && oldAvatarUrl.includes("/storage/v1/object/public/social-media/")) {
          const oldKey = oldAvatarUrl.split("/storage/v1/object/public/social-media/")[1];
          if (oldKey) {
            await supabaseAdmin.storage.from("social-media").remove([oldKey]);
          }
        }

        // Update database and Stream Chat
        await Promise.all([
          prisma.user.update({
            where: { id: user.id },
            data: { avatarUrl: url },
          }),
          streamServerClient.partialUpdateUser({
            id: user.id,
            set: { image: url },
          }),
        ]);

        uploadResults.push({
          name,
          url,
          serverData: {
            avatarUrl: url,
          },
        });
      } else if (endpoint === "banner") {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { headerBannerUrl: true },
        });
        const oldBannerUrl = dbUser?.headerBannerUrl;
        if (oldBannerUrl && oldBannerUrl.includes("/storage/v1/object/public/social-media/")) {
          const oldKey = oldBannerUrl.split("/storage/v1/object/public/social-media/")[1];
          if (oldKey) {
            await supabaseAdmin.storage.from("social-media").remove([oldKey]);
          }
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { headerBannerUrl: url },
        });

        uploadResults.push({
          name,
          url,
          serverData: {
            bannerUrl: url,
          },
        });
      } else if (endpoint === "attachment") {
        // Find matching dimensions
        const fileMeta = Array.isArray(metadata)
          ? metadata.find((m: any) => m.name === name)
          : null;
        const width = fileMeta?.width ?? null;
        const height = fileMeta?.height ?? null;

        const isVideo = fileKey?.toLowerCase().endsWith(".mp4") || 
                        fileKey?.toLowerCase().endsWith(".mov") || 
                        fileKey?.toLowerCase().endsWith(".webm") || 
                        fileObj.type?.startsWith("video/") || 
                        false;

        // Create Media DB record
        const media = await prisma.media.create({
          data: {
            url,
            mediaType: isVideo ? "VIDEO" : "IMAGE",
            width,
            height,
          },
        });

        uploadResults.push({
          name,
          url,
          serverData: {
            mediaId: media.id,
          },
        });
      } else if (endpoint === "story") {
        const isVideo = fileKey?.toLowerCase().endsWith(".mp4") || 
                        fileKey?.toLowerCase().endsWith(".mov") || 
                        fileKey?.toLowerCase().endsWith(".webm") || 
                        fileObj.type?.startsWith("video/") || 
                        false;

        // Create Story DB record
        const story = await prisma.story.create({
          data: {
            userId: user.id,
            mediaUrl: url,
            mediaType: isVideo ? "VIDEO" : "IMAGE",
          },
        });

        uploadResults.push({
          name,
          url,
          serverData: {
            storyId: story.id,
          },
        });
      } else if (endpoint === "instant") {
        // Create Instant DB record
        const aud = audience || "FRIENDS";
        const instant = await prisma.instant.create({
          data: {
            senderId: user.id,
            mediaUrl: url,
            audience: aud,
          },
        });

        uploadResults.push({
          name,
          url,
          serverData: {
            instantId: instant.id,
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
