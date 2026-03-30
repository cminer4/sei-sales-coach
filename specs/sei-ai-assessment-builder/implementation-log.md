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

---

## Session: Phase 2 (builder shell + live dashboard)

**Date**: 2026-03-28  

### What shipped

- **Builder workspace** at `/guide/assessment-builder/[id]`: left panel starts at 60% width, animates to 320px (`0.5s cubic-bezier(0.4, 0, 0.2, 1)`); config view fades out / unmounts after 280ms; chat view fades in at 300ms (prototype timings); right canvas shows shimmer skeleton only (no draft generation). Project header, drawer, empty message area, disabled chat input.
- **Dashboard** loads rows from PostgreSQL via `getDashboardAssessments()` (`createdBy = STUB_USER_ID`). Search, filter, and sort unchanged. **Empty state** when there are no assessments (copy + New Assessment CTA). Table rows navigate to the builder workspace. `export const dynamic = 'force-dynamic'` on the dashboard page so build-time prerender does not require DB.
- **`assessmentToDashboardRow`** maps Prisma assessments to `DashboardRow` (tested).

### Files

**New**

- `components/assessment-builder/AssessmentBuilderWorkspace.tsx`
- `lib/assessment-builder-queries.ts`
- `app/guide/assessment-builder/[id]/layout.tsx`

**Modified**

- `app/guide/assessment-builder/[id]/page.tsx`, `page.tsx`, `layout.tsx`, `assessment-builder.css`
- `lib/assessment-builder-dashboard.ts`, `lib/__tests__/assessment-builder-dashboard.test.ts`
- `components/assessment-builder/AssessmentDashboard.tsx`

### Follow-ups

- Draft generation, contenteditable canvas, SEI Guide messages, publish overlay.

---

## Session: Phase 3 (draft pipeline + builder UX)

**Date**: 2026-03-28  

### What shipped

- **`assessments.draft_content` JSONB** — Prisma field + migration SQL; persists the five-section draft between sessions. Run on Supabase: `ALTER TABLE assessments ADD COLUMN draft_content JSONB;` (or `prisma migrate deploy` with the new migration).
- **Extract pipeline** — `POST /api/assessment-builder/extract`: download from Storage, PDF/DOCX/TXT extraction (`pdf-parse` v1 via dynamic import, `mammoth`), ~800-token chunks with 100-token overlap (`gpt-tokenizer`), `embedText` from `lib/embeddings.ts`, `document_chunks` inserts via `$executeRawUnsafe` with `[...]::vector` (same pattern as `lib/embeddings-legacy.ts` / `lib/retrieval.ts`). Skips documents that already have chunks.
- **Generate draft** — `POST /api/assessment-builder/generate-draft`: top 8 assessment chunks + top 4 KB chunks (`assessment-builder` or `all` on chunk agents), Claude JSON with five keys, validate, persist to `draft_content`.
- **Refine** — `POST /api/assessment-builder/refine-section`: `reply` + `draft` + `suggestions`; `mergeRefinedDraft` keeps dirty sections from client; persists merged draft.
- **Save draft** — `POST /api/assessment-builder/save-draft` for debounced editor saves.
- **Builder UX** — On load without `draft_content`: extract then generate; with persisted draft: hydrate editor only. Shimmer until ready; live `contenteditable` with toolbar (`margin: -44px -52px 28px`), highlights, `data-manually-edited` on first keypress per section. Scripted SEI Guide intro + two questions (prototype copy); refine rounds add Q2 then closing line. Suggestion cards for dirty sections with Apply.

### TDD

- `lib/__tests__/assessment-builder-chunk.test.ts`, `assessment-builder-draft-schema.test.ts`, `assessment-builder-extract-text.test.ts`

### Commits (this session)

1. `SEI-42 Add draft_content column, chunk pipeline helpers, and unit tests`
2. `SEI-42 Add assessment builder extract, generate-draft, refine-section, and save-draft APIs`
3. `SEI-42 Wire builder workspace with draft editor, SEI Guide chat, and draft persistence`

### Files (high level)

- `lib/assessment-builder-*.ts`, `lib/prompts.ts`, `prisma/schema.prisma`, `prisma/migrations/20260328120000_add_assessment_draft_content/migration.sql`
- `app/api/assessment-builder/extract|generate-draft|refine-section|save-draft/route.ts`
- `components/assessment-builder/AssessmentBuilderWorkspace.tsx`, `app/guide/assessment-builder/assessment-builder.css`, `[id]/page.tsx`, `lib/assessment-builder-queries.ts`

---

## Session: Phase 3 verification + embeddings test fix (2026-03-30)

### Context

**Plan (`specs/sei-ai-assessment-builder/plan.md`)** uses "Phase 1" for the full MVP slice including pipeline + builder; **implementation log** previously labeled **draft pipeline + builder UX** as "Phase 3." That work was already merged in prior commits. This session **verified** build and tests and fixed a **regression** in the embedding test suite.

### What shipped

- **`lib/embeddings.ts`**: Lazy OpenAI client creation — avoids throwing when the module loads without `OPENAI_API_KEY` (Jest, static analysis). First `embedText()` call still requires a real key in production.
- **`lib/__tests__/embeddings.test.ts`**: Mock the OpenAI SDK so the test **does not call the network** and does not require secrets in CI.

### Verification

- `npm run build` — success.
- `npm test` — 13 suites, 46 tests passing.

### Decisions

- **No `ensure:build` script** in this repo; used `npm run build` per project `package.json`.

### Follow-ups

- **Phase 4** shipped in a later session (see below).

---

## Session: Phase 4 — publish summary, published view, DOCX, restore (2026-03-30)

### What shipped

- **`assessment_versions.summary`** in Prisma + migration; **`draftSummaryOneLine`** from Discovery Findings (120 chars); publish writes summary on each version row.
- **`getPublishedViewData`** for the published route.
- **`docx`** package, **`lib/assessment-builder-docx.ts`** (`buildAssessmentDocx`, `packAssessmentDocx`, `discoveryAssessmentFilename`), smoke tests.
- **APIs**: `POST /api/assessment-builder/restore-version`, `POST /api/assessment-builder/export-docx` (attachment `[ClientName]-Discovery-Assessment.docx`).
- **UI**: `FinalizeToast`, **`/guide/assessment-builder/[id]/published`** with **`AssessmentPublishedView`** — dark nav `#1e1130`, read-only document, 260px history `#faf9f7`, purple/gray dot timeline, restore links, Finalize & Download + toast after download.

### Verification

- `npm run build` and `npm test` — green after published UI.

### Database

- Run migration (or Supabase `ALTER TABLE assessment_versions ADD COLUMN summary TEXT`) before relying on summary in production.
