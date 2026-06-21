-- AlterTable
ALTER TABLE "detected_products" ADD COLUMN     "color" TEXT,
ADD COLUMN     "confidence" DOUBLE PRECISION,
ADD COLUMN     "dominant_color" TEXT,
ADD COLUMN     "frame_timestamp" DOUBLE PRECISION,
ADD COLUMN     "product_embedding" JSONB,
ADD COLUMN     "source_frame_url" TEXT;

-- AlterTable
ALTER TABLE "posts" DROP COLUMN "aiStatus";

-- AlterTable
ALTER TABLE "shopping_matches" ADD COLUMN     "affiliate_url" TEXT,
ADD COLUMN     "click_count" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "video_processing_jobs" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "last_retry_at" TIMESTAMP(3),
    "error" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_processing_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_processing_logs" (
    "id" TEXT NOT NULL,
    "video_id" TEXT NOT NULL,
    "processing_time" DOUBLE PRECISION,
    "vision_calls" INTEGER NOT NULL DEFAULT 0,
    "openrouter_calls" INTEGER NOT NULL DEFAULT 0,
    "nvidia_calls" INTEGER NOT NULL DEFAULT 0,
    "serpapi_calls" INTEGER NOT NULL DEFAULT 0,
    "processing_cost" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "vision_results" JSONB,
    "openrouter_results" JSONB,
    "nvidia_fallback_usage" BOOLEAN NOT NULL DEFAULT false,
    "shopping_results_count" INTEGER NOT NULL DEFAULT 0,
    "error_messages" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "video_processing_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "video_processing_jobs_post_id_key" ON "video_processing_jobs"("post_id");

-- AddForeignKey
ALTER TABLE "video_processing_jobs" ADD CONSTRAINT "video_processing_jobs_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
