import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

async function runRedisCommand(command: string[]): Promise<any> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const res = await fetch(`${url}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
    });
    if (!res.ok) {
      throw new Error(`Upstash Redis REST error ${res.status}`);
    }
    const data = await res.json();
    return data.result;
  } catch (err) {
    console.error("Redis command failed in API route:", err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const postId = body.postId;
    const forceReprocess = body.forceReprocess === true;

    if (!postId) {
      return NextResponse.json({ error: "Missing postId" }, { status: 400 });
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { attachments: true, videoJob: true },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const videoAttachment = post.attachments.find((att) => att.mediaType === "VIDEO");
    if (!videoAttachment) {
      return NextResponse.json({ error: "Post does not contain a video" }, { status: 400 });
    }

    // Idempotency check: Skip if already completed or no products found (unless forced)
    if (post.videoJob && !forceReprocess) {
      const status = post.videoJob.status;
      if (status === "completed" || status === "no_products") {
        return NextResponse.json({
          success: true,
          status,
          message: "Video already processed (idempotency guard)",
        });
      }
    }

    // Create or reset job status in database
    await prisma.videoProcessingJob.upsert({
      where: { postId },
      create: {
        postId,
        status: "pending",
        retryCount: 0,
        error: null,
      },
      update: {
        status: "pending",
        retryCount: 0,
        error: null,
        startedAt: null,
        completedAt: null,
      },
    });

    // Enqueue to Upstash Redis if configured
    const isRedisActive = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
    if (isRedisActive) {
      const payload = JSON.stringify({ videoId: postId, createdAt: Date.now() });
      await runRedisCommand(["LPUSH", "video-product-processing", payload]);
      console.log(`Enqueued job for ${postId} to Upstash Redis queue.`);
    } else {
      console.log(`Enqueued job for ${postId} to Database fallback queue.`);
    }

    return NextResponse.json({
      success: true,
      status: "pending",
      message: "Processing enqueued successfully in background.",
    });
  } catch (error: any) {
    console.error("Error enqueuing video job:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
