import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import vision from "@google-cloud/vision";
import { extractFramesFromVideo } from "@/lib/videoProcessor";
import fs from "fs";
import path from "path";

// Initialize Google Vision Client
const visionClient = new vision.ImageAnnotatorClient({
  keyFilename: path.join(process.cwd(), "google-vision-key.json"),
});

export async function POST(req: NextRequest) {
  let tempVideoPath = "";
  let extractedFrames: string[] = [];
  let postId = "";

  try {
    const body = await req.json();
    postId = body.postId;

    if (!postId) {
      return NextResponse.json({ error: "Missing postId" }, { status: 400 });
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { attachments: true },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const videoAttachment = post.attachments.find((att) => att.mediaType === "VIDEO");
    if (!videoAttachment) {
      return NextResponse.json({ error: "Post does not contain a video" }, { status: 400 });
    }

    // Set status to PROCESSING
    await prisma.post.update({
      where: { id: postId },
      data: { aiStatus: "PROCESSING" },
    });

    const videoUrl = videoAttachment.url;
    console.log(`Processing Reel video URL: ${videoUrl}`);

    // Create tmp directory
    const tmpDir = path.join(process.cwd(), "tmp");
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    // Download video to local temp file
    const fileExtension = videoUrl.split(".").pop()?.split("?")[0] || "mp4";
    tempVideoPath = path.join(tmpDir, `temp-${postId}.${fileExtension}`);

    console.log(`Downloading video to ${tempVideoPath}...`);
    const response = await fetch(videoUrl);
    if (!response.ok) {
      throw new Error(`Failed to download video from ${videoUrl}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.promises.writeFile(tempVideoPath, buffer);
    console.log("Download complete.");

    // Extract frames
    extractedFrames = await extractFramesFromVideo(tempVideoPath);

    // Call Google Vision on each frame
    const uniqueObjects = new Map<string, any>();

    for (const framePath of extractedFrames) {
      console.log(`Analyzing frame: ${framePath}`);
      try {
        const [result] = await (visionClient as any).objectLocalization(framePath);
        const annotations = result.localizedObjectAnnotations || [];



        for (const ann of annotations) {
          if (ann.name && ann.boundingPoly?.normalizedVertices) {
            // Keep unique items (we keep the first one found)
            if (!uniqueObjects.has(ann.name)) {
              uniqueObjects.set(ann.name, {
                name: ann.name,
                box: ann.boundingPoly.normalizedVertices,
              });
            }
          }
        }
      } catch (err) {
        console.error(`Failed to analyze frame ${framePath} via Google Vision:`, err);
      }
    }

    // Save unique detected objects to the database
    const objectsToSave = Array.from(uniqueObjects.values());
    console.log(`Saving ${objectsToSave.length} detected objects to database...`);

    if (objectsToSave.length > 0) {
      // First clean existing detected objects for this post to prevent duplicates if re-processed
      await prisma.detectedObject.deleteMany({
        where: { postId },
      });

      await prisma.detectedObject.createMany({
        data: objectsToSave.map((obj) => ({
          postId,
          name: obj.name,
          box: obj.box,
        })),
      });
    }

    // Set status to COMPLETED
    await prisma.post.update({
      where: { id: postId },
      data: { aiStatus: "COMPLETED" },
    });

    return NextResponse.json({
      success: true,
      detectedCount: objectsToSave.length,
      objects: objectsToSave.map((obj) => obj.name),
    });
  } catch (error: any) {
    console.error("Error processing reel:", error);
    if (postId) {
      try {
        await prisma.post.update({
          where: { id: postId },
          data: { aiStatus: "FAILED" },
        });
      } catch (dbErr) {
        console.error("Failed to update status to FAILED in database:", dbErr);
      }
    }
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  } finally {
    // Cleanup temporary files
    try {
      if (tempVideoPath && fs.existsSync(tempVideoPath)) {
        fs.unlinkSync(tempVideoPath);
        console.log(`Cleaned up temp video: ${tempVideoPath}`);
      }
      extractedFrames.forEach((framePath) => {
        if (fs.existsSync(framePath)) {
          fs.unlinkSync(framePath);
          console.log(`Cleaned up frame: ${framePath}`);
        }
      });
    } catch (cleanupErr) {
      console.error("Error during temp files cleanup:", cleanupErr);
    }
  }
}
