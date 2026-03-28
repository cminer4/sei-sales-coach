# SEI-42 Implementation Log

## Session: Phase 1 foundation (dashboard + new form)

**Branch**: `SEI-42-sei-ai-assessment-builder`  
**Date**: 2026-03-28  

### What shipped

- **Dashboard** at `/guide/assessment-builder`: static seed rows aligned with `public/prototypes/sei-assessment-builder-v8.html`, search, status filter (All / Discovery / Draft Ready / Complete), sort (including column header toggles for client, status, last updated).
- **New assessment** at `/guide/assessment-builder/new`: client name, stakeholder chips (Enter to add), optional project brief, upload zone (drag/drop + click), **Save & exit** and **Create Draft** posting to `POST /api/assessment-builder/assessments` with multipart form data.
- **API**: creates `Assessment` and optional `AssessmentDocument` rows; `created_by` uses `STUB_USER_ID` from `lib/assessment-builder-stub-user.ts`; no `lib/auth.ts`. Uploads go to Supabase Storage bucket `ASSESSMENT_BUILDER_STORAGE_BUCKET` or default `assessment-uploads` (create bucket in Supabase for uploads to succeed).
- **Placeholder** workspace at `/guide/assessment-builder/[id]` after Create Draft until builder slice lands.
- **Guide hub** (`/guide`): added card linking to Assessment Builder.

### TDD

- `lib/__tests__/assessment-builder-dashboard.test.ts` — filter, sort, `mapDbStatusToDisplay`.
- `lib/__tests__/assessment-builder-upload-limits.test.ts` — 10MB / 25MB rules.

### Decisions

- **Seed data**: Phase 1 keeps dashboard on static seed rows (spec US1); DB-backed list can replace `ASSESSMENT_BUILDER_SEED_ROWS` later without changing filter/sort helpers.
- **Storage**: service-role upload; bucket name overridable via env for different environments.

### Files touched

**New**

- `lib/assessment-builder-dashboard.ts`, `lib/assessment-builder-seed-data.ts`, `lib/assessment-builder-upload-limits.ts`, `lib/assessment-builder-storage.ts`
- `lib/__tests__/assessment-builder-dashboard.test.ts`, `lib/__tests__/assessment-builder-upload-limits.test.ts`
- `app/api/assessment-builder/assessments/route.ts`
- `app/guide/assessment-builder/layout.tsx`, `assessment-builder.css`, `page.tsx`, `new/page.tsx`, `[id]/page.tsx`
- `components/assessment-builder/AssessmentBuilderSidenav.tsx`, `AssessmentDashboard.tsx`, `NewAssessmentForm.tsx`

**Modified**

- `app/guide/page.tsx` — Assessment Builder card

### Follow-ups (not this phase)

- Builder workspace UI, draft pipeline, contenteditable, publish, DOCX.
- Wire dashboard to Prisma list API when ready.
- Supabase bucket + RLS policies for assessment uploads.
