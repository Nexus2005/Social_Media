import fs from "fs";
import path from "path";
import os from "os";
import { execSync } from "child_process";

export interface ExpectedProduct {
  category?: string;
  brand?: string;
}

export interface VideoGroundTruth {
  postId: string;
  expectedProducts: ExpectedProduct[];
}

export interface StageMetrics {
  latencyMs: number;
  cpuPercent?: number;
  ramMb?: number;
  gpuPercent?: number;
  gpuMemMb?: number;
  [key: string]: any;
}

export interface ExperimentSession {
  experimentId: string;
  videoId: string;
  timestamp: string;
  stages: Record<string, StageMetrics>;
  failures: string[];
  overall: {
    totalLatencyMs: number;
    avgCpuPercent: number;
    avgRamMb: number;
    avgGpuPercent: number;
    avgGpuMemMb: number;
    apiCostUsd: number;
    totalProductsDetected: number;
    totalProductsVerified: number;
  };
  accuracy?: {
    precision: number;
    recall: number;
    f1: number;
    precisionAt1: number;
    precisionAt5: number;
    mrr: number;
    ndcg: number;
    falsePositives: number;
    falseNegatives: number;
    ap: number;
  };
}

export class ExperimentManager {
  private static activeSession: {
    experimentId: string;
    videoId: string;
    startTime: number;
    stageStarts: Record<string, number>;
    stages: Record<string, Record<string, any>>;
    failures: string[];
    apiCost: number;
    detectedCount: number;
    verifiedCount: number;
    resourceSamples: Record<string, { cpu: number[]; ram: number[]; gpu: number[]; gpuMemory: number[] }>;
  } | null = null;

  private static runHistory: ExperimentSession[] = [];
  private static groundTruths: VideoGroundTruth[] = [];
  private static samplingInterval: NodeJS.Timeout | null = null;

  static getActiveExperimentId(): string | null {
    return this.activeSession ? this.activeSession.experimentId : null;
  }

  static getGroundTruthForVideo(videoId: string): VideoGroundTruth | undefined {
    if (this.groundTruths.length === 0) {
      this.loadGroundTruth();
    }
    return this.groundTruths.find(gt => gt.postId === videoId);
  }

  static loadGroundTruth() {
    try {
      const gtPath = path.join(process.cwd(), "benchmark", "ground_truth.json");
      if (fs.existsSync(gtPath)) {
        const raw = fs.readFileSync(gtPath, "utf-8");
        this.groundTruths = JSON.parse(raw);
      }
    } catch (e) {
      console.error("[ExperimentManager] Failed to load ground truth:", e);
    }
  }

  static startSession(experimentId: string, videoId: string) {
    if (this.activeSession && this.activeSession.videoId === videoId) {
      return;
    }
    if (this.groundTruths.length === 0) {
      this.loadGroundTruth();
    }

    this.activeSession = {
      experimentId,
      videoId,
      startTime: Date.now(),
      stageStarts: {},
      stages: {},
      failures: [],
      apiCost: 0,
      detectedCount: 0,
      verifiedCount: 0,
      resourceSamples: {},
    };
    console.log(`[ExperimentManager] Session started: ${experimentId} for video ${videoId}`);
  }

  static startStage(stage: string) {
    if (!this.activeSession) return;
    this.activeSession.stageStarts[stage] = Date.now();
    this.activeSession.stages[stage] = {};
    if (!this.activeSession.resourceSamples) {
      this.activeSession.resourceSamples = {};
    }
    this.activeSession.resourceSamples[stage] = { cpu: [], ram: [], gpu: [], gpuMemory: [] };

    // Start background resource sampler if not already running
    if (!this.samplingInterval) {
      this.samplingInterval = setInterval(() => {
        if (!this.activeSession) return;
        const res = this.getCurrentResources();
        
        for (const [activeStage, startT] of Object.entries(this.activeSession.stageStarts)) {
          if (!this.activeSession.stages[activeStage]?.latencyMs) {
            const samples = this.activeSession.resourceSamples[activeStage];
            if (samples) {
              samples.cpu.push(res.cpu);
              samples.ram.push(res.ram);
              samples.gpu.push(res.gpu);
              samples.gpuMemory.push(res.gpuMemory);
            }
          }
        }
      }, 100);
    }
  }

  static recordMetric(stage: string, key: string, value: any) {
    if (!this.activeSession) return;
    if (!this.activeSession.stages[stage]) {
      this.activeSession.stages[stage] = {};
    }
    this.activeSession.stages[stage][key] = value;
  }

  static recordApiCall(cost = 0.00015) { // default cost for Gemini Flash call
    if (!this.activeSession) return;
    this.activeSession.apiCost += cost;
  }

  static addFailure(failure: string) {
    if (!this.activeSession) return;
    this.activeSession.failures.push(failure);
  }

  static endStage(stage: string) {
    if (!this.activeSession || !this.activeSession.stageStarts[stage]) return;
    const end = Date.now();
    const start = this.activeSession.stageStarts[stage];
    const duration = end - start;

    const samples = this.activeSession.resourceSamples?.[stage];
    let avgCpu = 0, avgRam = 0, avgGpu = 0, avgGpuMem = 0;
    
    if (samples && samples.cpu.length > 0) {
      avgCpu = samples.cpu.reduce((a, b) => a + b, 0) / samples.cpu.length;
      avgRam = samples.ram.reduce((a, b) => a + b, 0) / samples.ram.length;
      avgGpu = samples.gpu.reduce((a, b) => a + b, 0) / samples.gpu.length;
      avgGpuMem = samples.gpuMemory.reduce((a, b) => a + b, 0) / samples.gpuMemory.length;
    } else {
      const res = this.getCurrentResources();
      avgCpu = res.cpu;
      avgRam = res.ram;
      avgGpu = res.gpu;
      avgGpuMem = res.gpuMemory;
    }

    const stageData = this.activeSession.stages[stage] || {};

    this.activeSession.stages[stage] = {
      ...stageData,
      latencyMs: duration,
      cpuPercent: Math.max(0, avgCpu),
      ramMb: Math.max(0, avgRam),
      gpuPercent: Math.max(0, avgGpu),
      gpuMemMb: Math.max(0, avgGpuMem),
    };
  }

  static endSession(detectedProducts: any[] = []) {
    if (this.samplingInterval) {
      clearInterval(this.samplingInterval);
      this.samplingInterval = null;
    }
    if (!this.activeSession) return null;

    const overallLatency = Date.now() - this.activeSession.startTime;
    
    // Auto end any active stage
    for (const stage of Object.keys(this.activeSession.stageStarts)) {
      if (!this.activeSession.stages[stage]?.latencyMs) {
        this.endStage(stage);
      }
    }

    const stages: Record<string, StageMetrics> = {};
    let totalCpu = 0, totalRam = 0, totalGpu = 0, totalGpuMem = 0, stageCount = 0;

    for (const [stage, metrics] of Object.entries(this.activeSession.stages)) {
      stages[stage] = metrics as StageMetrics;
      if (metrics.latencyMs !== undefined) {
        totalCpu += metrics.cpuPercent || 0;
        totalRam += metrics.ramMb || 0;
        totalGpu += metrics.gpuPercent || 0;
        totalGpuMem += metrics.gpuMemMb || 0;
        stageCount++;
      }
    }

    // Determine verification count
    const detectedCount = detectedProducts.length;
    const verifiedCount = detectedProducts.filter((p: any) => p.marketplaceConfidence >= 0.50 || p.isVerifiedMatch).length;

    const session: ExperimentSession = {
      experimentId: this.activeSession.experimentId,
      videoId: this.activeSession.videoId,
      timestamp: new Date().toISOString(),
      stages,
      failures: this.activeSession.failures,
      overall: {
        totalLatencyMs: overallLatency,
        avgCpuPercent: stageCount > 0 ? totalCpu / stageCount : 0,
        avgRamMb: stageCount > 0 ? totalRam / stageCount : 0,
        avgGpuPercent: stageCount > 0 ? totalGpu / stageCount : 0,
        avgGpuMemMb: stageCount > 0 ? totalGpuMem / stageCount : 0,
        apiCostUsd: this.activeSession.apiCost,
        totalProductsDetected: detectedCount,
        totalProductsVerified: verifiedCount,
      },
    };

    // Calculate accuracy against ground truth if present
    const gt = this.getGroundTruthForVideo(session.videoId);
    if (gt) {
      session.accuracy = this.evaluateAccuracy(gt, detectedProducts);
    }

    this.runHistory.push(session);
    this.activeSession = null;
    return session;
  }

  private static getCurrentResources() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const ram = (totalMem - freeMem) / (1024 * 1024); // MB

    // CPU estimation
    const cpus = os.cpus();
    let totalIdle = 0, totalTick = 0;
    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += (cpu.times as any)[type];
      }
      totalIdle += cpu.times.idle;
    }
    const cpu = totalTick > 0 ? 100 * (1 - totalIdle / totalTick) : 0;

    // GPU detection via nvidia-smi
    let gpu = 0;
    let gpuMemory = 0;
    try {
      const output = execSync("nvidia-smi --query-gpu=utilization.gpu,memory.used --format=csv,noheader,nounits", { stdio: "pipe" }).toString();
      const [gpuUtil, gpuMem] = output.split(",").map(val => parseFloat(val.trim()));
      if (!isNaN(gpuUtil)) gpu = gpuUtil;
      if (!isNaN(gpuMem)) gpuMemory = gpuMem;
    } catch {
      // GPU unavailable
    }

    return { cpu, ram, gpu, gpuMemory };
  }

  private static evaluateAccuracy(gt: VideoGroundTruth, detected: any[]): Required<ExperimentSession>["accuracy"] {
    const expected = gt.expectedProducts;
    let tp = 0;
    let fp = 0;

    const matchedExpectedIndices = new Set<number>();

    // Helper to evaluate if detected matches expected
    const isMatch = (det: any, exp: ExpectedProduct) => {
      if (exp.category) {
        const dCat = (det.category || "").toLowerCase();
        const eCat = exp.category.toLowerCase();
        if (!dCat.includes(eCat) && !eCat.includes(dCat)) return false;
      }
      if (exp.brand) {
        const dBrand = (det.detectedLogo || det.label || "").toLowerCase();
        const eBrand = exp.brand.toLowerCase();
        if (eBrand !== "null" && !dBrand.includes(eBrand) && !eBrand.includes(dBrand)) return false;
      }
      return true;
    };

    // Calculate TP / FP
    for (const det of detected) {
      let isTruePositive = false;
      for (let i = 0; i < expected.length; i++) {
        if (isMatch(det, expected[i])) {
          isTruePositive = true;
          matchedExpectedIndices.add(i);
        }
      }
      if (isTruePositive) {
        tp++;
      } else {
        fp++;
      }
    }

    const fn = expected.length - matchedExpectedIndices.size;

    const tp_count = matchedExpectedIndices.size;
    const precision = detected.length > 0 ? tp / detected.length : 0;
    const recall = expected.length > 0 ? tp_count / expected.length : 0;
    const f1 = (precision + recall) > 0 ? 2 * precision * recall / (precision + recall) : 0;

    // Rank metrics: Precision@1, Precision@5, MRR, nDCG, AP
    // For these, we flatten all retrieve marketplace matches across all matches
    let precisionAt1 = 0;
    let precisionAt5 = 0;
    let mrr = 0;
    let ndcg = 0;
    let ap = 0;

    if (detected.length > 0) {
      // Collect matches and score them by verificationScore
      const allRetrievedMatches: { title: string; brand?: string; score: number }[] = [];
      for (const d of detected) {
        const matches = d.matches || [];
        for (const m of matches) {
          allRetrievedMatches.push({
            title: m.title || "",
            brand: m.matchBrand || m.brand || undefined,
            score: m.verificationScore || 0,
          });
        }
      }

      // Sort matches by verification score
      allRetrievedMatches.sort((a, b) => b.score - a.score);

      // Check top 1
      if (allRetrievedMatches.length > 0) {
        const top1 = allRetrievedMatches[0];
        let matchFound = false;
        for (const exp of expected) {
          const eBrand = (exp.brand || "").toLowerCase();
          if (eBrand === "null" || top1.title.toLowerCase().includes(eBrand)) {
            matchFound = true;
            break;
          }
        }
        precisionAt1 = matchFound ? 1 : 0;
      }

      // Check top 5
      let top5Matches = 0;
      for (let i = 0; i < Math.min(5, allRetrievedMatches.length); i++) {
        const item = allRetrievedMatches[i];
        let matchFound = false;
        for (const exp of expected) {
          const eBrand = (exp.brand || "").toLowerCase();
          if (eBrand === "null" || item.title.toLowerCase().includes(eBrand)) {
            matchFound = true;
            break;
          }
        }
        if (matchFound) top5Matches++;
      }
      precisionAt5 = top5Matches / Math.min(5, allRetrievedMatches.length || 1);

      // MRR and NDCG
      let reciprocalRankSum = 0;
      for (const exp of expected) {
        let rank = 0;
        for (let i = 0; i < allRetrievedMatches.length; i++) {
          const item = allRetrievedMatches[i];
          const eBrand = (exp.brand || "").toLowerCase();
          if (eBrand === "null" || item.title.toLowerCase().includes(eBrand)) {
            rank = i + 1;
            break;
          }
        }
        if (rank > 0) {
          reciprocalRankSum += 1 / rank;
        }
      }
      mrr = expected.length > 0 ? reciprocalRankSum / expected.length : 0;

      // NDCG@5
      const relevances = allRetrievedMatches.map(item => {
        let isRel = false;
        for (const exp of expected) {
          const eBrand = (exp.brand || "").toLowerCase();
          if (eBrand === "null" || item.title.toLowerCase().includes(eBrand)) {
            isRel = true;
            break;
          }
        }
        return isRel ? 1 : 0;
      });

      const k = Math.min(5, relevances.length);
      let dcg = 0;
      for (let i = 0; i < k; i++) {
        dcg += relevances[i] / Math.log2(i + 2);
      }
      const sortedRevs = [...relevances].sort((a, b) => b - a);
      let idcg = 0;
      for (let i = 0; i < k; i++) {
        idcg += sortedRevs[i] / Math.log2(i + 2);
      }
      ndcg = idcg > 0 ? dcg / idcg : 0;

      // Average Precision
      let sumPrecision = 0;
      let relevantCount = 0;
      for (let i = 0; i < relevances.length; i++) {
        if (relevances[i] === 1) {
          relevantCount++;
          let correct = 0;
          for (let j = 0; j <= i; j++) {
            if (relevances[j] === 1) correct++;
          }
          sumPrecision += correct / (i + 1);
        }
      }
      ap = relevantCount > 0 ? sumPrecision / relevantCount : 0;
    }

    return {
      precision,
      recall,
      f1,
      precisionAt1,
      precisionAt5,
      mrr,
      ndcg,
      falsePositives: fp,
      falseNegatives: fn,
      ap,
    };
  }

  // ─── Statistical Analysis Helpers ──────────────────────────────────────────

  static computeStats(values: number[]) {
    const n = values.length;
    if (n === 0) return { mean: 0, median: 0, variance: 0, stdDev: 0, ciLower: 0, ciUpper: 0, bootstrapCiLower: 0, bootstrapCiUpper: 0 };

    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((sum, v) => sum + v, 0) / n;
    const median = n % 2 === 1 ? sorted[Math.floor(n / 2)] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;

    const variance = n > 1 ? values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (n - 1) : 0;
    const stdDev = Math.sqrt(variance);

    // 95% Confidence Interval based on normal distribution
    const stdError = stdDev / Math.sqrt(n);
    const ciLower = mean - 1.96 * stdError;
    const ciUpper = mean + 1.96 * stdError;

    // Bootstrap CI (95%)
    const bootstrapMeans: number[] = [];
    const bootstrapIterations = 1000;
    for (let i = 0; i < bootstrapIterations; i++) {
      let sum = 0;
      for (let j = 0; j < n; j++) {
        sum += values[Math.floor(Math.random() * n)];
      }
      bootstrapMeans.push(sum / n);
    }
    bootstrapMeans.sort((a, b) => a - b);
    const bootstrapCiLower = bootstrapMeans[Math.floor(bootstrapIterations * 0.025)] || 0;
    const bootstrapCiUpper = bootstrapMeans[Math.floor(bootstrapIterations * 0.975)] || 0;

    return { mean, median, variance, stdDev, ciLower, ciUpper, bootstrapCiLower, bootstrapCiUpper };
  }

  static pairedTTest(sampleA: number[], sampleB: number[]) {
    if (sampleA.length !== sampleB.length || sampleA.length < 2) {
      return { tStatistic: 0, pValue: 1.0 };
    }
    const diffs = sampleA.map((val, idx) => val - sampleB[idx]);
    const n = diffs.length;
    const meanDiff = diffs.reduce((sum, d) => sum + d, 0) / n;
    const varianceDiff = diffs.reduce((sum, d) => sum + Math.pow(d - meanDiff, 2), 0) / (n - 1);
    const stdError = Math.sqrt(varianceDiff / n);

    if (stdError === 0) {
      return { tStatistic: 0, pValue: 1.0 };
    }

    const tStatistic = meanDiff / stdError;

    // Approximation of p-value for Student's T distribution (two-tailed)
    const df = n - 1;
    let pValue = 1.0;
    if (df > 30) {
      const z = Math.abs(tStatistic);
      const cdfZ = 0.5 * (1.0 + Math.sign(z) * (1.0 - Math.exp(-2 * z * z / Math.PI)));
      pValue = 2 * (1.0 - cdfZ);
    } else {
      const x = df / (df + tStatistic * tStatistic);
      pValue = Math.pow(x, df / 2);
    }

    return { tStatistic, pValue: Math.min(1.0, Math.max(0.0, pValue)) };
  }

  // ─── Export Functions ───────────────────────────────────────────────────────

  static getRunHistory(): ExperimentSession[] {
    return this.runHistory;
  }

  static exportResults() {
    const resultsDir = process.cwd();
    
    // Save JSON
    fs.writeFileSync(
      path.join(resultsDir, "results.json"),
      JSON.stringify(this.runHistory, null, 2),
      "utf-8"
    );

    // Save CSV
    let csv = "ExperimentId,VideoId,Timestamp,TotalLatencyMs,ApiCostUsd,DetectedCount,VerifiedCount,Precision,Recall,F1,MRR,nDCG,mAP\n";
    for (const run of this.runHistory) {
      csv += `${run.experimentId},${run.videoId},${run.timestamp},${run.overall.totalLatencyMs},${run.overall.apiCostUsd},${run.overall.totalProductsDetected},${run.overall.totalProductsVerified},${run.accuracy?.precision || 0},${run.accuracy?.recall || 0},${run.accuracy?.f1 || 0},${run.accuracy?.mrr || 0},${run.accuracy?.ndcg || 0},${run.accuracy?.ap || 0}\n`;
    }
    fs.writeFileSync(path.join(resultsDir, "results.csv"), csv, "utf-8");

    // Compute Stats for LaTeX and MD
    const latencies = this.runHistory.map(r => r.overall.totalLatencyMs);
    const latencyStats = this.computeStats(latencies);

    // Generate results.md
    let md = `# Cartly Pipeline Benchmarking Results

This document contains research-grade performance evaluations for the Cartly computer vision pipeline.

## Overall Statistics
- **Total Videos Processed**: ${this.runHistory.length}
- **Average Latency**: ${latencyStats.mean.toFixed(2)} ms (SD: ${latencyStats.stdDev.toFixed(2)} ms)
- **95% Confidence Interval (Analytic)**: [${latencyStats.ciLower.toFixed(2)}, ${latencyStats.ciUpper.toFixed(2)}] ms
- **95% Bootstrap Confidence Interval**: [${latencyStats.bootstrapCiLower.toFixed(2)}, ${latencyStats.bootstrapCiUpper.toFixed(2)}] ms

## Latency Breakdown by Stage
| Stage | Average Latency (ms) | Average CPU (%) | Average RAM (MB) | Average GPU (%) | Average GPU Memory (MB) |
| :--- | :---: | :---: | :---: | :---: | :---: |
`;

    // Flatten stages
    const stageNames = ["download", "extraction", "yolo", "tracking", "ocr", "search", "verification"];
    const stageStats: Record<string, any> = {};

    for (const name of stageNames) {
      const stageLatencies = this.runHistory
        .map(r => r.stages[name]?.latencyMs)
        .filter((l): l is number => l !== undefined);
      
      const stats = this.computeStats(stageLatencies);
      stageStats[name] = stats;

      const cpu = this.runHistory.map(r => r.stages[name]?.cpuPercent || 0).reduce((a, b) => a + b, 0) / (this.runHistory.length || 1);
      const ram = this.runHistory.map(r => r.stages[name]?.ramMb || 0).reduce((a, b) => a + b, 0) / (this.runHistory.length || 1);
      const gpu = this.runHistory.map(r => r.stages[name]?.gpuPercent || 0).reduce((a, b) => a + b, 0) / (this.runHistory.length || 1);
      const gpuMem = this.runHistory.map(r => r.stages[name]?.gpuMemMb || 0).reduce((a, b) => a + b, 0) / (this.runHistory.length || 1);

      md += `| ${name.toUpperCase()} | ${stats.mean.toFixed(1)} | ${cpu.toFixed(1)}% | ${ram.toFixed(1)} | ${gpu.toFixed(1)}% | ${gpuMem.toFixed(1)} |\n`;
    }

    // Write results.md
    fs.writeFileSync(path.join(resultsDir, "results.md"), md, "utf-8");

    // Generate latex_tables.tex
    let tex = `% --- IEEE LaTeX Tables Generated by Cartly Experiment Manager ---\n\n`;

    // Table III: Latency Breakdown
    tex += `% Table III: Latency Breakdown\n`;
    tex += `\\begin{table}[h]\n\\caption{Latency Breakdown by Pipeline Stage (ms)}\n\\label{tab:latency}\n\\centering\n\\begin{tabular}{|l|r|r|c|}\n\\hline\nStage & Mean & SD & 95\\% CI \\\\\n\\hline\n`;
    for (const name of stageNames) {
      const stats = stageStats[name];
      tex += `${name.toUpperCase()} & ${stats.mean.toFixed(1)} & ${stats.stdDev.toFixed(1)} & [${stats.ciLower.toFixed(1)}, ${stats.ciUpper.toFixed(1)}] \\\\\n`;
    }
    tex += `\\hline\n\\textbf{Overall Pipeline} & \\textbf{${latencyStats.mean.toFixed(1)}} & \\textbf{${latencyStats.stdDev.toFixed(1)}} & \\textbf{[${latencyStats.ciLower.toFixed(1)}, ${latencyStats.ciUpper.toFixed(1)}]} \\\\\n\\hline\n\\end{tabular}\n\\end{table}\n\n`;

    // Table IV: Precision Comparison (ablation specific summaries)
    tex += `% Table IV: Precision Comparison across Configurations\n`;
    tex += `\\begin{table}[h]\n\\caption{Retrieval Accuracy Comparison across Configurations}\n\\label{tab:precision}\n\\centering\n\\begin{tabular}{|l|c|c|c|c|c|}\n\\hline\nConfiguration & Precision\\@1 & Precision\\@5 & MRR & nDCG & mAP \\\\\n\\hline\n`;
    
    // Group runs by experiment ID prefix / configuration type
    const configs = [
      "yolo_only", "yolo_ocr", "yolo_ocr_amef", "yolo_ocr_gemini", "yolo_ocr_marketplace", "yolo_ocr_tracking", "yolo_ocr_adaptive", "baseline"
    ];
    for (const conf of configs) {
      const confRuns = this.runHistory.filter(r => r.experimentId.includes(conf));
      if (confRuns.length > 0) {
        const p1 = confRuns.map(r => r.accuracy?.precisionAt1 || 0).reduce((a, b) => a + b, 0) / confRuns.length;
        const p5 = confRuns.map(r => r.accuracy?.precisionAt5 || 0).reduce((a, b) => a + b, 0) / confRuns.length;
        const mrrVal = confRuns.map(r => r.accuracy?.mrr || 0).reduce((a, b) => a + b, 0) / confRuns.length;
        const ndcgVal = confRuns.map(r => r.accuracy?.ndcg || 0).reduce((a, b) => a + b, 0) / confRuns.length;
        const mapVal = confRuns.map(r => r.accuracy?.ap || 0).reduce((a, b) => a + b, 0) / confRuns.length;
        tex += `${conf.replace(/_/g, " ").toUpperCase()} & ${p1.toFixed(3)} & ${p5.toFixed(3)} & ${mrrVal.toFixed(3)} & ${ndcgVal.toFixed(3)} & ${mapVal.toFixed(3)} \\\\\n`;
      }
    }
    tex += `\\hline\n\\end{tabular}\n\\end{table}\n\n`;

    // Table V: Ablation Study
    tex += `% Table V: Ablation Study Results on Retrieval Quality\n`;
    tex += `\\begin{table}[h]\n\\caption{Ablation Study Results on Retrieval Quality}\n\\label{tab:ablation}\n\\centering\n\\begin{tabular}{|l|c|c|c|c|}\n\\hline\nConfiguration & Precision & Recall & F1 Score & Latency (ms) \\\\\n\\hline\n`;
    for (const conf of configs) {
      const confRuns = this.runHistory.filter(r => r.experimentId.includes(conf));
      if (confRuns.length > 0) {
        const prec = confRuns.map(r => r.accuracy?.precision || 0).reduce((a, b) => a + b, 0) / confRuns.length;
        const rec = confRuns.map(r => r.accuracy?.recall || 0).reduce((a, b) => a + b, 0) / confRuns.length;
        const f1Val = confRuns.map(r => r.accuracy?.f1 || 0).reduce((a, b) => a + b, 0) / confRuns.length;
        const lat = confRuns.map(r => r.overall.totalLatencyMs).reduce((a, b) => a + b, 0) / confRuns.length;
        tex += `${conf.replace(/_/g, " ").toUpperCase()} & ${prec.toFixed(3)} & ${rec.toFixed(3)} & ${f1Val.toFixed(3)} & ${lat.toFixed(1)} \\\\\n`;
      }
    }
    tex += `\\hline\n\\end{tabular}\n\\end{table}\n\n`;

    // Table VI: Resource Consumption
    tex += `% Table VI: Resource Consumption\n`;
    tex += `\\begin{table}[h]\n\\caption{Resource Consumption by Pipeline Stage}\n\\label{tab:resources}\n\\centering\n\\begin{tabular}{|l|c|c|c|c|}\n\\hline\nStage & CPU (\\%) & RAM (MB) & GPU (\\%) & GPU Mem (MB) \\\\\n\\hline\n`;
    for (const name of stageNames) {
      const cpu = this.runHistory.map(r => r.stages[name]?.cpuPercent || 0).reduce((a, b) => a + b, 0) / (this.runHistory.length || 1);
      const ram = this.runHistory.map(r => r.stages[name]?.ramMb || 0).reduce((a, b) => a + b, 0) / (this.runHistory.length || 1);
      const gpu = this.runHistory.map(r => r.stages[name]?.gpuPercent || 0).reduce((a, b) => a + b, 0) / (this.runHistory.length || 1);
      const gpuMem = this.runHistory.map(r => r.stages[name]?.gpuMemMb || 0).reduce((a, b) => a + b, 0) / (this.runHistory.length || 1);
      tex += `${name.toUpperCase()} & ${cpu.toFixed(1)}\\% & ${ram.toFixed(1)} & ${gpu.toFixed(1)}\\% & ${gpuMem.toFixed(1)} \\\\\n`;
    }
    tex += `\\hline\n\\end{tabular}\n\\end{table}\n`;

    fs.writeFileSync(path.join(resultsDir, "latex_tables.tex"), tex, "utf-8");

    console.log(`[ExperimentManager] Exported results.json, results.csv, results.md, and latex_tables.tex successfully.`);
  }
}
