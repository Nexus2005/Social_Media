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
    console.error("Redis command failed in reprocess:", err);
    return null;
  }
}

async function enqueueToRedis(postId: string) {
  const isRedisActive = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
  if (isRedisActive) {
    const payload = JSON.stringify({ videoId: postId, createdAt: Date.now() });
    await runRedisCommand(["LPUSH", "video-product-processing", payload]);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await validateRequest();

    // Verify authorized user
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin role (also support Omkar2005 username for safety/convenience during dev)
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    const role = dbUser?.role || user.role;
    if (role !== "ADMIN" && user.username !== "Omkar2005") {
      return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
    }

    const body = await req.json();
    const { action, postId, selectedIds } = body;

    if (!action) {
      return NextResponse.json({ error: "Missing action parameter" }, { status: 400 });
    }

    if (action === "single") {
      if (!postId) {
        return NextResponse.json({ error: "Missing postId for single reprocess" }, { status: 400 });
      }

      // Check current job status
      const existingJob = await prisma.videoProcessingJob.findUnique({
        where: { postId },
      });

      // Guard: Do not enqueue if currently pending or processing to avoid double runs
      if (existingJob && (existingJob.status === "pending" || existingJob.status === "processing")) {
        return NextResponse.json({ 
          success: false, 
          message: `Job is already in ${existingJob.status} state. Reprocess skipped.` 
        });
      }

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

      await enqueueToRedis(postId);

      return NextResponse.json({ success: true, message: `Reel ${postId} enqueued successfully.` });
    }

    if (action === "failed") {
      const failedJobs = await prisma.videoProcessingJob.findMany({
        where: { status: "failed" },
      });

      for (const job of failedJobs) {
        await prisma.videoProcessingJob.update({
          where: { id: job.id },
          data: {
            status: "pending",
            retryCount: 0,
            error: null,
            startedAt: null,
            completedAt: null,
          },
        });
        await enqueueToRedis(job.postId);
      }

      return NextResponse.json({ success: true, count: failedJobs.length });
    }

    if (action === "unfinished") {
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

      let enqueuedCount = 0;
      for (const post of postsWithVideos) {
        const hasJob = !!post.videoJob;
        const isFailed = post.videoJob?.status === "failed";
        const isNone = !post.videoJob;

        if (isNone || isFailed) {
          await prisma.videoProcessingJob.upsert({
            where: { postId: post.id },
            create: {
              postId: post.id,
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
          await enqueueToRedis(post.id);
          enqueuedCount++;
        }
      }

      return NextResponse.json({ success: true, count: enqueuedCount });
    }

    if (action === "no-products") {
      const noProductJobs = await prisma.videoProcessingJob.findMany({
        where: { status: "no_products" },
      });

      for (const job of noProductJobs) {
        await prisma.videoProcessingJob.update({
          where: { id: job.id },
          data: {
            status: "pending",
            retryCount: 0,
            error: null,
            startedAt: null,
            completedAt: null,
          },
        });
        await enqueueToRedis(job.postId);
      }

      return NextResponse.json({ success: true, count: noProductJobs.length });
    }

    if (action === "selected") {
      if (!Array.isArray(selectedIds) || selectedIds.length === 0) {
        return NextResponse.json({ error: "Missing or invalid selectedIds" }, { status: 400 });
      }

      let enqueuedCount = 0;
      for (const id of selectedIds) {
        const existingJob = await prisma.videoProcessingJob.findUnique({
          where: { postId: id },
        });

        if (existingJob && (existingJob.status === "pending" || existingJob.status === "processing")) {
          continue;
        }

        await prisma.videoProcessingJob.upsert({
          where: { postId: id },
          create: {
            postId: id,
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
        await enqueueToRedis(id);
        enqueuedCount++;
      }

      return NextResponse.json({ success: true, count: enqueuedCount });
    }

    if (action === "clear") {
      const activeJobs = await prisma.videoProcessingJob.findMany({
        where: {
          status: {
            in: ["pending", "processing"],
          },
        },
      });

      for (const job of activeJobs) {
        await prisma.videoProcessingJob.update({
          where: { id: job.id },
          data: {
            status: "failed",
            error: "Cancelled by admin",
            completedAt: new Date(),
          },
        });
      }

      // If Redis is active, clear the redis queue as well
      const isRedisActive = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
      if (isRedisActive) {
        await runRedisCommand(["DEL", "video-product-processing"]);
      }

      return NextResponse.json({ success: true, count: activeJobs.length });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Queue management API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
