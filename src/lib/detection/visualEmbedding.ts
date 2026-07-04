/**
 * Cartly v3 — Visual Embedding Engine (Phase 2 Ready)
 *
 * Pluggable interface for visual embedding providers (CLIP, SigLIP).
 * In Phase 1, uses a NoOpEmbeddingProvider that returns empty vectors.
 *
 * Phase 2 will add:
 * - CLIPEmbeddingProvider (self-hosted or Replicate API)
 * - SigLIPEmbeddingProvider (HuggingFace Inference)
 *
 * The Verification Engine accepts an optional embedding provider.
 * When embeddings are available, visual similarity uses actual cosine
 * similarity instead of perceptual hash comparison.
 */

export interface VisualEmbeddingProvider {
  name: string;

  /** Generate a visual embedding vector from an image buffer */
  embed(imageBuffer: Buffer): Promise<number[]>;

  /** Calculate cosine similarity between two embedding vectors */
  similarity(embedding1: number[], embedding2: number[]): number;
}

/**
 * NoOp embedding provider for Phase 1.
 * Returns empty vectors — visual similarity falls back to pHash in Verification Engine.
 */
export class NoOpEmbeddingProvider implements VisualEmbeddingProvider {
  name = "noop";

  async embed(_imageBuffer: Buffer): Promise<number[]> {
    return [];
  }

  similarity(_a: number[], _b: number[]): number {
    return 0;
  }
}

/**
 * Cosine similarity helper — shared by all embedding providers.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

/** Singleton — swappable at runtime when Phase 2 provider is ready */
let activeProvider: VisualEmbeddingProvider = new NoOpEmbeddingProvider();

export function getEmbeddingProvider(): VisualEmbeddingProvider {
  return activeProvider;
}

export function setEmbeddingProvider(provider: VisualEmbeddingProvider): void {
  console.log(`[VisualEmbedding] Provider switched to: ${provider.name}`);
  activeProvider = provider;
}
