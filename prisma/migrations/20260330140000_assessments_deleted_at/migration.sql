-- Soft-delete (archive) for Assessment Builder dashboard
ALTER TABLE "assessments" ADD COLUMN "deleted_at" TIMESTAMPTZ;
