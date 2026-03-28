-- AlterTable
ALTER TABLE "assessments" ADD COLUMN IF NOT EXISTS "draft_content" JSONB;
