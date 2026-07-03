import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";

// Load environment variables manually
function loadEnv() {
  try {
    const envPath = path.join(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, "utf-8").split("\n");
      for (const line of lines) {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = match[2] || "";
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
          }
          process.env[key] = value;
        }
      }
    }
  } catch (e) {
    console.error("Failed to load .env manually:", e);
  }
}
loadEnv();

const prisma = new PrismaClient();

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
    console.error("Redis command failed:", err);
    return null;
  }
}

async function main() {
  const postId = process.argv[2];
  if (!postId) {
    console.error("Error: Please provide a postId / videoId to reprocess.");
    console.log("Usage: npm run reprocess <postId>");
    process.exit(1);
  }

  console.log(`Requeuing postId: "${postId}"...`);

  // 1. Upsert/Update the database VideoProcessingJob status to pending
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

  console.log("Database VideoProcessingJob status set to 'pending'.");

  // 2. Queue into Redis if active
  const isRedisActive = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
  if (isRedisActive) {
    const payload = JSON.stringify({ videoId: postId, createdAt: Date.now() });
    await runRedisCommand(["LPUSH", "video-product-processing", payload]);
    console.log("Successfully enqueued job into Redis ('video-product-processing').");
  } else {
    console.log("Redis not active/configured. Fallback database queue mode will pick this up.");
  }

  console.log(`Re-enqueue complete! Run 'npm run worker' to process this job.`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("Reprocess CLI script execution failed:", e);
  await prisma.$disconnect();
  process.exit(1);
});
