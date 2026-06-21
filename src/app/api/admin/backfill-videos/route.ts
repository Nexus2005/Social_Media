import { NextRequest, NextResponse } from "next/server";
import { validateRequest } from "@/auth";
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
    console.error("Redis command failed in backfill:", err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await validateRequest();

    // Verify authorized user
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch verified status from DB
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { verified: true },
    });

    // Only allow admin accounts or Omkar2005
    if (user.username !== "Omkar2005" && !dbUser?.verified) {
      return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
    }

    // Fetch posts containing video attachments
    const postsWithVideos = await prisma.post.findMany({
      where: {
        attachments: {
          some: {
            mediaType: "VIDEO",
          },
        },
      },
      include: {
        videoJob: true,
      },
    });

    const jobsToEnqueue = [];

    for (const post of postsWithVideos) {
      // Enqueue if no job exists, or if job failed
      const hasJob = !!post.videoJob;
      const isFailed = post.videoJob?.status === "failed";

      if (!hasJob || isFailed) {
        jobsToEnqueue.push(post.id);
      }
    }

    const isRedisActive = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

    for (const postId of jobsToEnqueue) {
      // Upsert job status
      await prisma.videoProcessingJob.upsert({
        where: { postId },
        create: {
          postId,
          status: "pending",
          retryCount: 0,
        },
        update: {
          status: "pending",
          retryCount: 0,
          error: null,
          startedAt: null,
          completedAt: null,
        },
      });

      if (isRedisActive) {
        const payload = JSON.stringify({ videoId: postId, createdAt: Date.now() });
        await runRedisCommand(["LPUSH", "video-product-processing", payload]);
      }
    }

    return NextResponse.json({
      success: true,
      scannedCount: postsWithVideos.length,
      enqueuedCount: jobsToEnqueue.length,
      enqueuedPostIds: jobsToEnqueue,
    });
  } catch (error: any) {
    console.error("Backfill job error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
