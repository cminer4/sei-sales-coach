## 📋 Implementation Plan: SEI-42 Phase 4 — Publish, Version History, DOCX Export

**Branch**: `SEI-42-sei-ai-assessment-builder`  
**Spec**: [specs/features/SEI-42-sei-ai-assessment-builder.md](../features/SEI-42-sei-ai-assessment-builder.md)  
**Exploration**: [specs/explorations/sei-ai-assessment-builder-exploration.md](../explorations/sei-ai-assessment-builder-exploration.md)  
**Design**: [specs/designs/sei-ai-assessment-builder-design.md](../designs/sei-ai-assessment-builder-design.md)  
**Prototype**: `public/prototypes/sei-assessment-builder-v8.html` (published view, toast, version panel)

**Estimated Timeline**: **4–6 working days** (single developer) — one transactional publish API, a new published route with timeline UI, HTML-to-DOCX conversion with tests, and polish to match the prototype colors and toast behavior.

---

### Files to create or modify (preview — no code yet)

**Create**

| Path | Purpose |
|------|---------|
| `app/api/assessment-builder/publish/route.ts` | POST: validate payload, run Prisma **transaction** (persist latest draft snapshot, insert `assessment_versions`, set `assessments.status` to `draft_ready`), return new version label. |
| `app/api/assessment-builder/restore-version/route.ts` | POST: set `assessments.draft_content` from chosen version’s `content_json` (stub user guard), for “Restore this version”. |
| `app/api/assessment-builder/export-docx/route.ts` | POST: build `.docx` from `draft_content`, return `Content-Disposition` attachment. |
| `app/guide/assessment-builder/[id]/published/page.tsx` | Published screen: server load assessment + versions; compose layout (nav + read-only doc + 260px panel). |
| `components/assessment-builder/AssessmentPublishedView.tsx` (or split: `PublishedNav`, `VersionHistoryPanel`, `ReadOnlyDocument`) | Client UI: back link, badge, finalize button, timeline, restore links, download + toast. |
| `components/assessment-builder/FinalizeToast.tsx` (optional small module) | Bottom-center toast: styling per Phase 4 brief, 3200ms dismiss. |
| `lib/assessment-builder-versioning.ts` | Pure helpers: next version string (`v1.0` → `v1.1`), parse existing rows, build one-line **summary** from draft HTML (strip tags, truncate). |
| `lib/assessment-builder-docx.ts` | Build `docx` `Document` from structured draft: SEI header, client name, date, five section headings + body; map HTML to paragraphs / bullets / bold where feasible. |
| `lib/__tests__/assessment-builder-versioning.test.ts` | TDD for version bump and summary helper. |
| `lib/__tests__/assessment-builder-docx.test.ts` | TDD for HTML stripping / paragraph structure (smoke-level). |
| `prisma/migrations/*_assessment_versions_summary/` | Add `summary` column to `assessment_versions` (mirror Supabase `ALTER`). |

**Modify**

| Path | Purpose |
|------|---------|
| `prisma/schema.prisma` | `assessment_versions.summary String?` (or `String` default empty) — align with DB after migration. |
| `package.json` | Add **`docx`**; add a small HTML parsing dependency if needed (e.g. **`cheerio`**) for robust strip of HTML to structured runs — decided in implementation, not by the founder. |
| `components/assessment-builder/AssessmentBuilderWorkspace.tsx` | Add **Publish Draft** control on the document toolbar: **loading spinner only** while request runs (no full-screen compile overlay for this phase — see note below). On success: `router.push` to `/guide/assessment-builder/[id]/published`. Disable / spinner while publishing; optionally flush latest draft before POST so the server receives the freshest snapshot (see API behavior). |
| `app/guide/assessment-builder/assessment-builder.css` | Styles for published top nav (`#1e1130`), white document column, version panel (`#faf9f7`), timeline dots (purple glow vs gray), toast tokens — match prototype and Phase 4 brief. |
| `lib/assessment-builder-queries.ts` | Add `getPublishedViewData(id)` (or similar): assessment row + `assessment_versions` ordered `created_at desc`, for published page. |
| `eslint` config / `package.json` lint script | If new `app/api/assessment-builder/*` paths are outside the current lint glob, extend so Phase 4 routes are linted (same as project hygiene). |

**Reference only (no change unless gaps)**

| Path | Role |
|------|------|
| `lib/assessment-builder-stub-user.ts` | `STUB_USER_ID` for `created_by` on version rows and ownership checks. |
| `lib/assessment-builder-draft-types.ts`, `lib/assessment-builder-document-html.ts` | Reuse `DraftContent` and `buildFullEditorHtml` for read-only document HTML (set `contentEditable={false}` on wrapper or render static HTML). |
| `lib/assessment-builder-persist-draft.ts` | Pattern for Prisma updates; publish will use a **transaction** instead of only this helper. |

**Database (Supabase — run before or with migration)**

```sql
ALTER TABLE assessment_versions ADD COLUMN summary TEXT;
```

Keep Prisma schema and migrations in sync with this column.

---

### What We're Building (Summary)

Consultants can **publish** the current Discovery draft in one reliable save: a **version snapshot** is stored, the assessment moves to **Draft Ready**, and they land on a **published** view with **read-only** document, a **version timeline**, and **Word export**. Older snapshots can be **restored** into the editor. **Finalize & Download** produces a client-named `.docx` and shows a short **success toast**.

---

### Technical Approach

1. **Publish API and versioning (about 1–1.5 days)**  
   One server endpoint performs a **single database transaction**: save the latest draft snapshot to `assessments.draft_content`, set `status` to `draft_ready`, insert `assessment_versions` with `content_json`, `version_number` string (first publish `v1.0`, then `v1.1`, `v1.2`, …), `summary` text (one line derived from the draft — e.g. stripped plain text from key sections), and `created_by` from the stub module. This avoids half-published states if anything fails.

2. **Builder: Publish Draft button (about 0.5 day)**  
   The button shows a **spinner** while the publish request runs — **no** full-screen overlay and **no** compile animation for this slice (overrides User Story 7’s compile overlay in the main spec for Phase 4; keeps the interaction fast and obvious). After success, navigate to the published route.

3. **Published page and version panel (about 1.5–2 days)**  
   New route under `/guide/assessment-builder/[id]/published`: **dark top bar** (`#1e1130`), **white** main document area (same typography and layout as the editor via shared HTML builder), **260px** right column (`#faf9f7`) listing all versions **newest first**. **Dot timeline**: newest = **purple + glow**; older = **gray** dots. Each row shows version label, timestamp, summary; non-current rows get **Restore this version** → API updates `draft_content` from that row’s `content_json` and sends the user **back to the builder** (`/guide/assessment-builder/[id]`).

4. **DOCX export (about 1.5–2 days)**  
   `POST /api/assessment-builder/export-docx` with `assessmentId`. Server reads **`draft_content`** from `assessments` (per Phase 4 product brief), converts the five sections into a Word file using the **`docx`** library: cover line for SEI, client name, date, then each section as heading + paragraphs; strip HTML cleanly and preserve **bold** and **bullet** structure where practical. Respond with a downloadable file named like **`[ClientName]-Discovery-Assessment.docx`** (sanitize filename). **Finalize & Download** on the published view calls this and triggers the browser download.

5. **Success toast (about 0.5 day)**  
   After a successful download, show a fixed **bottom-center** toast: dark background `#1a1a2e`, green border, checkmark, title **Document finalized and downloaded**, subtitle with client name and version, auto-dismiss **3200ms**.

---

### Constitution Check

- **Spec-driven**: Implements FR-001 (published route), FR-008 (export API; path under `assessment-builder` matches other feature routes), FR-009 (version rows with `content_json`), Decision 7 (stub user, no `lib/auth.ts`).
- **TDD**: Tests first for **version string math**, **summary truncation**, and **DOCX assembly** helpers (≥80% new code coverage target per constitution).
- **Stack**: Next.js App Router, Prisma, TypeScript, Tailwind/feature CSS — no new data stores.
- **Module boundaries**: API routes validate and delegate to `lib/`; pages stay thin.
- **Aligned**: **User Story 7** in `specs/features/SEI-42-sei-ai-assessment-builder.md` and **`specs/designs/sei-ai-assessment-builder-design.md`** now describe **spinner-only** publish (no compile overlay), matching Phase 4.

---

### Dependencies

**Must be done first**

- Supabase `ALTER TABLE` + Prisma migration for `summary`.
- `docx` (and optional HTML parser) installed.

**Can build in parallel**

- DOCX builder unit tests while published page layout is built.
- Toast component while export route is built.

**Blocks future work**

- Any analytics or “complete” status workflows may depend on having stable version rows and export.

---

### Test Strategy

**Happy path**

- Publish with a valid draft → version row exists, status `draft_ready`, redirect to published view, badge matches new version.
- Published page lists versions in correct order; top row is “current” styling.
- Export returns a `.docx` that opens in Word with five sections present.
- Toast appears and dismisses on timer after download.

**Errors**

- Missing assessment, wrong stub user → 404 / no update.
- Malformed draft payload on publish → 400 with clear message.

**Edge cases**

- First publish vs repeated publish increments minor version correctly (`v1.0` → `v1.1`).
- Restore on an older version updates draft and navigates to builder; editor loads content.

**How we’ll know it works**

- Manual: publish → published → download → open file; restore → edit → publish again → version list shows two lines.

---

### Risks & Mitigations

| Risk | Impact on Business | Mitigation |
|------|-------------------|------------|
| Debounced save vs publish race | Published snapshot misses last keystroke | Publish request sends **current draft in body** or client **awaits flush** of save-draft before publish; transaction still writes a consistent snapshot. |
| HTML to Word fidelity | Bullets or bold missing | Iterate on `lib/assessment-builder-docx` with fixture HTML; keep scope to “reasonable” fidelity per brief. |
| Filename special characters | Bad downloads on some OS | Sanitize client name for filename. |

---

### Implementation Phases

**Phase 4a: Data + publish + restore**

- Migration + Prisma; publish + restore API routes; versioning helpers + tests.
- **Deliverable**: POST publish creates row + status; POST restore updates draft.

**Phase 4b: Published UI + export + toast**

- Published page, version panel, DOCX route, finalize button, toast.
- **Deliverable**: End-to-end demo from builder to downloaded file.

**Phase 4c: Polish**

- Match prototype spacing/colors; double-click guards on publish/export; lint/build green.
- **Deliverable**: Ready for internal review.

---

### Deployment Plan

**Feature flag**: No — internal Guide route only.

**Database changes**: Yes — additive `summary` column; low risk.

**Rollback**: Revert deployment; new column unused if code reverted. Versions already written remain for audit.

**Agents / Prompt Control**: No new agent rows for this phase.

---

### Success Metrics

- Consultants can publish, see history, export, and restore without errors (matches SC-003 tail).
- Export success rate on preview deploy (manual checklist).

---

### Timeline Breakdown

| Phase | Duration | Why |
|-------|----------|-----|
| 4a Publish + restore + migration | 1.5–2 days | Transaction correctness and tests |
| 4b Published UI + DOCX + toast | 2–3 days | Largest UI + conversion work |
| 4c Polish + QA | 1 day | Prototype parity and edge cases |

**Total**: **4–6 days**  
**Confidence**: **Medium** — DOCX fidelity and HTML edge cases are the main unknowns.

---

### What Could Make This Take Longer

- Complex nested HTML in sections → more time mapping to `docx` structures (+1–2 days).
- Product change back to full compile overlay → extra UI day (not in current Phase 4 scope).

---

### What’s NOT Included

- Full-screen compile overlay (explicitly out of this Phase 4 brief).
- Version diff view, comments on versions, or multi-user locking.
- Changing global spec route from `/api/export-docx` naming in FR-008 — implementation uses **`/api/assessment-builder/export-docx`** alongside other Assessment Builder APIs; update the feature spec in a small follow-up if strict path parity matters for documentation.

---

### Next Steps

1. Run the SQL migration on Supabase; add Prisma migration.
2. Implement 4a with TDD (version helpers + publish transaction).
3. Build published view and export; wire toast.
4. Run `npm test`, `npm run build`, manual SC-003 tail verification.
