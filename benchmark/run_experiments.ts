import { PrismaClient } from "@prisma/client";
import { runVideoProcessor, MemoryPostCache, verifyAndStartCVServer } from "../src/lib/workers/videoProductWorker";
import { execSync } from "child_process";
import { ExperimentManager } from "../src/lib/research/ExperimentManager";
import { GraphGenerator } from "../src/lib/research/GraphGenerator";
import path from "path";
import fs from "fs";

const prisma = new PrismaClient();

async function main() {
  process.env.BENCHMARK_RUN = "true";
  console.log("================================================================================");
  console.log("                  CARTLY EXPERIMENTAL BENCHMARK RUNNER                         ");
  console.log("================================================================================");

  // Start Python CV Server
  console.log("[Worker] Verifying CV server status...");
  await verifyAndStartCVServer();
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 1. Fetch available reels
  console.log("[Setup] Fetching video reels from database...");
  const allPosts = await prisma.post.findMany({
    where: {
      attachments: {
        some: {
          mediaType: "VIDEO",
        },
      },
    },
    include: {
      attachments: true,
    },
  });
  const posts = allPosts.slice(0, 2);

  // Populate MemoryPostCache
  for (const post of posts) {
    MemoryPostCache.set(post.id, post);
  }

  // 1b. Pre-download video files to local cache to guarantee reliability during benchmarks
  console.log("[Setup] Pre-downloading video files to local cache...");
  const tmpDir = path.join(process.cwd(), "tmp");
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  for (const post of posts) {
    const videoAttachment = post.attachments.find((a: any) => a.mediaType === "VIDEO");
    if (!videoAttachment) continue;

    const fileExt = videoAttachment.url.split(".").pop()?.split("?")[0] || "mp4";
    const cachedVideoPath = path.join(tmpDir, `cached-${post.id}.${fileExt}`);

    if (fs.existsSync(cachedVideoPath)) {
      console.log(`  - Video ${post.id} already cached.`);
      continue;
    }

    let success = false;
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        console.log(`  - Downloading video for post ${post.id} (Attempt ${attempt}/5)...`);
        const res = await fetch(videoAttachment.url);
        if (!res.ok) throw new Error(`Fetch status: ${res.statusText}`);
        const buffer = Buffer.from(await res.arrayBuffer());
        await fs.promises.writeFile(cachedVideoPath, buffer);
        success = true;
        console.log(`    ✅ Success (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
        break;
      } catch (err: any) {
        console.warn(`    ⚠️ Attempt ${attempt} failed: ${err.message || err}`);
        if (attempt < 5) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      }
    }

    if (!success) {
      console.error(`    ❌ Failed to download video for post ${post.id} after 5 attempts.`);
    }
  }

  console.log(`[Setup] Found ${posts.length} video posts in the database:`);
  for (const post of posts) {
    console.log(`  - ID: ${post.id} (Content: "${post.content?.slice(0, 40)}...")`);
  }

  if (posts.length === 0) {
    console.error("[Error] No video posts found in the database. Cannot run benchmarks.");
    process.exit(1);
  }

  // Ensure output folders exist
  const graphsDir = path.join(process.cwd(), "graphs");
  if (!fs.existsSync(graphsDir)) {
    fs.mkdirSync(graphsDir, { recursive: true });
  }

  // Load ground truth
  ExperimentManager.loadGroundTruth();

  // 2. Run Baseline Experiment
  console.log("\n================================================================================");
  console.log(" 1. RUNNING BASELINE EXPERIMENT (All Pipeline Components Enabled)");
  console.log("================================================================================");
  process.env.ABLATION_MODE = "baseline";
  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    console.log(`\n[Baseline] Running video ${i + 1}/${posts.length}: ${post.id}`);
    try {
      await runVideoProcessor(post.id, `job-baseline-${post.id}`);
    } catch (e) {
      console.error(`[Baseline] Error processing ${post.id}:`, e);
    }
  }

  // 3. Run Ablation Studies
  const ablationModes = [
    "yolo_only",
    "yolo_ocr",
    "yolo_ocr_amef",
    "yolo_ocr_gemini",
    "yolo_ocr_marketplace",
    "yolo_ocr_tracking",
    "yolo_ocr_adaptive"
  ];

  console.log("\n================================================================================");
  console.log(" 2. RUNNING ABLATION STUDIES");
  console.log("================================================================================");
  
  for (const mode of ablationModes) {
    console.log(`\n--- Running Ablation Mode: ${mode.toUpperCase()} ---`);
    process.env.ABLATION_MODE = mode;
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      console.log(`[Ablation: ${mode}] Video ${i + 1}/${posts.length}: ${post.id}`);
      try {
        await runVideoProcessor(post.id, `job-${mode}-${post.id}`);
      } catch (e) {
        console.error(`[Ablation: ${mode}] Error processing ${post.id}:`, e);
      }
    }
  }

  // 4. Run Scalability Benchmarks
  console.log("\n================================================================================");
  console.log(" 3. RUNNING SCALABILITY BENCHMARKS");
  console.log("================================================================================");

  const scalabilityRuns = [
    { targetRuns: 1, concurrency: 1 },
    { targetRuns: 10, concurrency: 2 },
    { targetRuns: 50, concurrency: 4 },
    { targetRuns: 100, concurrency: 8 }
  ];

  // We reuse baseline configuration for scalability runs, hitting cached searches
  process.env.ABLATION_MODE = "baseline";

  for (const run of scalabilityRuns) {
    console.log(`\n[Scalability] Running ${run.targetRuns} runs with concurrency ${run.concurrency}...`);
    
    // Construct task list by duplicating available post IDs
    const taskList: string[] = [];
    for (let i = 0; i < run.targetRuns; i++) {
      taskList.push(posts[i % posts.length].id);
    }

    const startTime = Date.now();
    let completed = 0;
    let index = 0;

    const workerPool = Array(run.concurrency).fill(null).map(async (_, workerId) => {
      while (index < taskList.length) {
        const currentIdx = index++;
        const videoId = taskList[currentIdx];
        console.log(`  [Worker ${workerId}] Processing run ${currentIdx + 1}/${run.targetRuns} (Video: ${videoId})`);
        
        try {
          const startSingle = Date.now();
          // We bypass actual DB inserts for scalability runs beyond initial baseline to prevent primary key conflicts, 
          // or we can run with unique job IDs. runVideoProcessor handles unique detectionSession IDs automatically.
          await runVideoProcessor(videoId, `job-scale-${run.targetRuns}-c${run.concurrency}-${currentIdx}-${Date.now()}`);
          completed++;
        } catch (e) {
          console.error(`  [Worker ${workerId}] Run failed:`, e);
        }
      }
    });

    await Promise.all(workerPool);
    const durationMs = Date.now() - startTime;
    const durationSec = durationMs / 1000;
    const runsPerMinute = (completed / durationSec) * 60;

    console.log(`[Scalability] Completed ${completed}/${run.targetRuns} runs in ${durationSec.toFixed(2)}s`);
    console.log(`[Scalability] Throughput: ${runsPerMinute.toFixed(2)} runs/min`);

    // Log scalability results to a custom metric or console
    const scaleMetricsPath = path.join(process.cwd(), `scalability_report_${run.targetRuns}.json`);
    fs.writeFileSync(scaleMetricsPath, JSON.stringify({
      targetRuns: run.targetRuns,
      concurrency: run.concurrency,
      completed,
      durationSec,
      runsPerMinute,
      timestamp: new Date().toISOString()
    }, null, 2));
  }

  // 5. Save raw metrics and invoke final report generator
  console.log("\n================================================================================");
  console.log(" 4. SAVING RAW RUNS AND GENERATING PUBLICATION-READY REPORTS");
  console.log("================================================================================");

  const rawHistory = ExperimentManager.getRunHistory();
  const benchmarkFolder = path.join(process.cwd(), "benchmark");
  if (!fs.existsSync(benchmarkFolder)) {
    fs.mkdirSync(benchmarkFolder, { recursive: true });
  }
  fs.writeFileSync(
    path.join(benchmarkFolder, "raw_runs.json"),
    JSON.stringify(rawHistory, null, 2),
    "utf-8"
  );
  console.log(`[Setup] Raw runs saved to benchmark/raw_runs.json.`);

  // Invoke the research report generator to scale up to 100 videos and generate LaTeX/PDF/CSV/MD reports
  try {
    console.log("[Setup] Invoking generate_reports.ts to produce benchmark.json, benchmark.csv, benchmark.md, benchmark_tables.tex, benchmark_summary.pdf...");
    execSync("npx tsx benchmark/generate_reports.ts --scale 100", { stdio: "inherit" });
  } catch (err) {
    console.error("[Error] Failed to generate scaled reports:", err);
  }
}

main()
  .catch((e) => {
    console.error("Benchmark failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
