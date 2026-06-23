-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "location_name" TEXT,
ADD COLUMN     "location_city" TEXT,
ADD COLUMN     "location_state" TEXT,
ADD COLUMN     "location_country" TEXT,
ADD COLUMN     "location_display" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "location_cache" (
    "id" TEXT NOT NULL,
    "lat_rounded" DOUBLE PRECISION NOT NULL,
    "lng_rounded" DOUBLE PRECISION NOT NULL,
    "osm_id" TEXT,
    "display_name" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "location_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recent_locations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "location_name" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recent_locations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "location_cache_lat_rounded_lng_rounded_key" ON "location_cache"("lat_rounded", "lng_rounded");

-- CreateIndex
CREATE INDEX "recent_locations_user_id_idx" ON "recent_locations"("user_id");

-- AddForeignKey
ALTER TABLE "recent_locations" ADD CONSTRAINT "recent_locations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
