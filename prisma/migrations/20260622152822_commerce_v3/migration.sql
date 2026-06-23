-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'HIDDEN', 'ARCHIVED', 'PENDING_REVIEW');

-- CreateEnum
CREATE TYPE "VerificationSource" AS ENUM ('AI_DETECTED', 'CREATOR_APPROVED', 'CREATOR_ADDED', 'ADMIN_VERIFIED');

-- CreateEnum
CREATE TYPE "ProductAvailability" AS ENUM ('IN_STOCK', 'OUT_OF_STOCK');

-- CreateEnum
CREATE TYPE "RetailerSource" AS ENUM ('AI_MATCH', 'CREATOR_MATCH', 'MANUAL');

-- CreateEnum
CREATE TYPE "ProductEventType" AS ENUM ('VIEW', 'DRAWER_OPEN', 'PRODUCT_CLICK', 'RETAILER_CLICK', 'SAVE');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('AI_DETECTED', 'CREATOR_MANUAL', 'BRAND_PARTNERSHIP');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "product_collections" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_collection_items" (
    "id" TEXT NOT NULL,
    "collection_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_collection_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_collections_userId_name_key" ON "product_collections"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "product_collection_items_collection_id_product_id_key" ON "product_collection_items"("collection_id", "product_id");

-- AddForeignKey
ALTER TABLE "product_collections" ADD CONSTRAINT "product_collections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_collection_items" ADD CONSTRAINT "product_collection_items_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "product_collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_collection_items" ADD CONSTRAINT "product_collection_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "detected_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "detected_products" ADD COLUMN     "brand" TEXT,
ADD COLUMN     "creator_id" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "drawer_opens_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "product_clicks_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "retailer_clicks_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "views_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "wishlist_saves_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "product_collections" ADD COLUMN     "cover_image" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_public" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "shopping_matches" ADD COLUMN     "availability" "ProductAvailability" NOT NULL DEFAULT 'IN_STOCK',
ADD COLUMN     "delivery_text" TEXT,
ADD COLUMN     "direct_url" TEXT,
ADD COLUMN     "merchant_id" TEXT,
ADD COLUMN     "retailer_source" "RetailerSource" NOT NULL DEFAULT 'AI_MATCH',
ADD COLUMN     "tracking_code" TEXT;

-- CreateTable
CREATE TABLE "product_assignments" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "assigned_by_id" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "status" "ProductStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "verification_source" "VerificationSource" NOT NULL DEFAULT 'AI_DETECTED',
    "source_type" "SourceType" NOT NULL DEFAULT 'AI_DETECTED',
    "manually_assigned" BOOLEAN NOT NULL DEFAULT false,
    "review_reason" TEXT,
    "ai_confidence" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_events" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "assignment_id" TEXT,
    "user_id" TEXT,
    "event_type" "ProductEventType" NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo_url" TEXT,
    "rating" DOUBLE PRECISION,
    "reviews" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "merchants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "commission_rate" DOUBLE PRECISION DEFAULT 0,
    "commission_earned" DOUBLE PRECISION DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_DetectedProductToProductCollection" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "product_assignments_post_id_product_id_key" ON "product_assignments"("post_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "merchants_name_key" ON "merchants"("name");

-- CreateIndex
CREATE UNIQUE INDEX "brands_name_key" ON "brands"("name");

-- CreateIndex
CREATE UNIQUE INDEX "_DetectedProductToProductCollection_AB_unique" ON "_DetectedProductToProductCollection"("A", "B");

-- CreateIndex
CREATE INDEX "_DetectedProductToProductCollection_B_index" ON "_DetectedProductToProductCollection"("B");

-- AddForeignKey
ALTER TABLE "detected_products" ADD CONSTRAINT "detected_products_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_matches" ADD CONSTRAINT "shopping_matches_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_assignments" ADD CONSTRAINT "product_assignments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_assignments" ADD CONSTRAINT "product_assignments_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "detected_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_assignments" ADD CONSTRAINT "product_assignments_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_events" ADD CONSTRAINT "product_events_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "detected_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_events" ADD CONSTRAINT "product_events_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "product_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_events" ADD CONSTRAINT "product_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DetectedProductToProductCollection" ADD CONSTRAINT "_DetectedProductToProductCollection_A_fkey" FOREIGN KEY ("A") REFERENCES "detected_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DetectedProductToProductCollection" ADD CONSTRAINT "_DetectedProductToProductCollection_B_fkey" FOREIGN KEY ("B") REFERENCES "product_collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
