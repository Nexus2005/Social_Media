-- Add updatedAt to comments for "edited" indicators and comment editing
ALTER TABLE "comments" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
