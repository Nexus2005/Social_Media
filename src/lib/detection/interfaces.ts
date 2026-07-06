import { CropEvidence } from "./detectionPipeline";
import { TrackedObject, FrameDetection } from "./frameFusion";
import { VerifiedMatch, MarketplaceProduct } from "../marketplace/types";

export interface StageMetrics {
  latencyMs: number;
  success: boolean;
  metadata?: Record<string, any>;
}

export interface YoloDetection {
  box: number[];
  label: string;
  confidence: number;
  avg_hsv?: number[];
}

export interface IObjectDetector {
  detect(frameBuffer: Buffer): Promise<{
    detections: YoloDetection[];
    metrics: StageMetrics;
  }>;
}

export interface IObjectTracker {
  fuse(frames: FrameDetection[]): {
    tracked: TrackedObject[];
    metrics: StageMetrics;
  };
  filter(tracked: TrackedObject[]): {
    filtered: TrackedObject[];
    metrics: StageMetrics;
  };
}

export interface VisualSimilarityResult {
  product: MarketplaceProduct;
  visualSimilarity: number; // 0.0 to 1.0
}

export interface IVisualMatcher {
  compare(
    cropBuffer: Buffer,
    matches: MarketplaceProduct[],
  ): Promise<{
    results: VisualSimilarityResult[];
    metrics: StageMetrics;
  }>;
}

export interface IMarketplaceMatcher {
  search(queries: string[]): Promise<{
    results: MarketplaceProduct[];
    cacheHits: number;
    metrics: StageMetrics;
  }>;
}

export interface ResolutionResult {
  resolvedMatch: VerifiedMatch | null;
  confidenceScore: number;
  isGeminiNeeded: boolean;
  metrics: StageMetrics;
}

export interface IProductResolver {
  resolve(
    evidence: CropEvidence,
    results: VerifiedMatch[],
    crops: Buffer[],
  ): Promise<ResolutionResult>;
}
