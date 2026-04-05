## Implementation Plan: Assessment Builder — Transcript split-screen drawer (User Story 6, P2)

**Branch**: `SEI-42-transcript-split-drawer` (or continue `SEI-42-sei-ai-assessment-builder` if you prefer one branch for all SEI-42 work)  
**Spec**: [specs/features/SEI-42-sei-ai-assessment-builder.md](../features/SEI-42-sei-ai-assessment-builder.md) (User Story 6)  
**Exploration**: [specs/explorations/sei-ai-assessment-builder-exploration.md](../explorations/sei-ai-assessment-builder-exploration.md)  
**Design**: [specs/designs/sei-ai-assessment-builder-design.md](../designs/sei-ai-assessment-builder-design.md)  
**Estimated Timeline**: **2–3 days** — one API surface, focused UI state and CSS animation, plus tests for line parsing and the GET handler contract.

### What We're Building (Summary)

Consultants reviewing an assessment can **open uploaded source documents next to the chat** without leaving the builder. **Document pills** sit under the **stakeholder chips** in the project header; choosing a pill opens a **top-dropping panel** (about **38%** of the workspace height) that shows **stored extracted text** with **consultant vs. client** styling. Switching pills **updates the text in place**; **Close** and **Escape** dismiss the panel. This supports grounding and review (spec User Story 6).

### Technical Approach

1. **Read API for documents + extracted text** (~0.5 day) — Add a **GET** on the existing documents route so the client can load **all** `assessment_documents` rows for the assessment, including **`extracted_text`**, in one round trip. Same **stub-user** and **not found** rules as other Assessment Builder routes. Outcome: one fetch when the user first opens a document, then **in-memory cache** in the workspace so switching pills is instant.

2. **Workspace behavior** (~1 day) — **Restructure the project header** so **stakeholder chips** and **per-file document pills** match the spec (replace the current summary-only pills and remove the redundant stakeholder block from the drawer body when the drawer shows transcript content). **Opening** a pill sets the **active document**, loads the cache (fetch once per session), and **opens** the drawer. **Switching** pills updates **active document** only. **Close** control and **Escape** listener clear the open state. Outcome: behavior matches the acceptance scenarios in User Story 6 and your detailed UX notes.

3. **Transcript line presentation** (~0.5 day) — Parse **plain text** into lines; treat lines whose trimmed content starts with **`Q:`** or **`Interviewer:`** as **consultant** (muted gray, italic). **Other** non-empty lines get **client** styling (**#333**, soft **purple left border**). Blank lines preserved lightly so readability stays close to the source file. Outcome: scannable call transcripts without building a full dialogue parser.

4. **Drawer layout and motion** (~0.5 day) — Update CSS so the drawer uses **background `#f9f8f6`**, **header bar `#f3f0f8`**, body text **`#444` at 12px**, **350ms** transition with a **cubic-bezier** easing, and **height ~38%** of the **builder** column (the shared shell that holds chat + canvas so the proportion matches the spec). Outcome: matches design tokens and the “drops from the top” metaphor.

5. **Tests** (~0.5 day) — **TDD**: small **pure function** (or module) for **line classification / rendering segments** with **Jest** in `lib/__tests__/`; optional lightweight test or contract check for **GET** JSON shape if we keep handlers thin. Outcome: safe refactors on parsing rules later.

### Constitution Check

- **Spec-driven**: Implements **FR** and **User Story 6** from SEI-42; aligns with **design** top-dropping drawer.
- **Stack**: Next.js App Route **GET**, Prisma, TypeScript, existing CSS file for `/guide/assessment-builder` (**NFR-005**: no shadcn theme / `dark:` on these routes).
- **Auth (Phase 1)**: **GET** uses the same **`STUB_USER_ID`** / assessment ownership pattern as **POST** on this route — **no** `lib/auth.ts`.
- **Agents / KB**: **No** new agent rows; **no** change to RAG or `agent_type` (not applicable).
- **Exception**: None.

### Files That Will Be Created or Modified

**User-facing**

- **Builder workspace** (`components/assessment-builder/AssessmentBuilderWorkspace.tsx`): Header layout (stakeholders + document pills), drawer open/close state, **selected document id**, **cached** `extracted_text` map (keyed by document id), **first-use fetch** to GET endpoint, **Escape** handler, **close** control, **scrollable** transcript body with line-level styling.

**Behind-the-scenes**

- **`app/api/assessment-builder/assessments/[id]/documents/route.ts`**: Add **`export async function GET`** returning JSON `{ documents: { id, filename, extracted_text }[] }` for assessments owned by the stub user; **404** if missing. **POST** remains for uploads.
- **`lib/assessment-builder-transcript-lines.ts`** (recommended): Pure helpers to split text into lines and mark **consultant** vs **client** for rendering — keeps **AssessmentBuilderWorkspace** readable and supports **unit tests**.

**Styles**

- **`app/guide/assessment-builder/assessment-builder.css`**: Drawer **height**, **transition (350ms cubic-bezier)**, **colors**, header row, **consultant** vs **client** line classes; adjust **project header** classes if we replace `.ab-ph-pills` summary chips with real stakeholder + doc rows.

**Tests**

- **`lib/__tests__/assessment-builder-transcript-lines.test.ts`**: Consultant prefixes, normal client lines, empty input, mixed content.

**Not required for this slice**

- **`app/guide/assessment-builder/[id]/page.tsx`**: No change unless we later pass server-side `extracted_text` (we will **not**; client loads via GET as specified).

### Dependencies

**Must be done first**

- **Extracted text populated**: `assessment_documents.extracted_text` must be filled by the existing extract pipeline; if null, UI shows a clear **empty / pending** message (aligns with spec edge case: empty or failed extraction).

**Can build in parallel**

- None blocking; this slice is self-contained.

**Blocks future work**

- None; optional later enhancements (search within transcript, PDF page refs) are out of scope.

### Test Strategy

**What we will test**

- **Happy path**: GET returns documents with text; first pill open shows content; second pill switches text **without** closing drawer; Close and Escape close drawer.
- **Error cases**: 404 assessment; network failure shows a **non-blocking** error state in the drawer or a small inline message.
- **Edge cases**: `extracted_text` null or empty; very long text (scroll only inside body); **Unicode** and long lines wrap safely.

**How we will know it works**

- Manual: open builder with multiple uploads, open drawer, switch pills, verify styling and animation timing.
- Automated: line-classification tests pass; optional snapshot of classified segments for a fixed fixture string.

### Risks & Mitigations

| Risk | Impact on business | Mitigation |
|------|-------------------|------------|
| **38% height** wrong in some viewports | Drawer feels too tall/short | Tie height to **builder root** (shared flex parent), verify at common laptop sizes |
| **Line heuristics** wrong for some transcripts | Mis-styled lines | Start with strict **prefix** rules; document that custom labels may need a follow-up tweak |
| **Large extracted_text** | Slow render | One scroll container; avoid re-fetch; no need to virtualize for v1 |

### Implementation Phases

**Phase 1: API + cache contract** (Day 1)

- Implement GET; verify shape in browser or a short test.
- **Deliverable**: `GET` returns all documents with `extracted_text`.

**Phase 2: UI + drawer + motion** (Day 1–2)

- Header pills, drawer content, cache, Escape/Close.
- **Deliverable**: Full interaction matches User Story 6 and your behavior list.

**Phase 3: Tests + polish** (Day 2–3)

- Jest tests for line logic; visual QA against tokens.
- **Deliverable**: Ready to merge.

### Deployment Plan

**Feature flag**: **No** — internal tool; ship when ready.

**Database changes**: **No** — uses existing `extracted_text` column.

**Rollback strategy**: Revert the PR; GET is additive; UI falls back to pre-drawer behavior if reverted entirely.

### Success Metrics

- **Adoption**: Team uses pills during internal dogfood without asking for exports to read transcripts.
- **Performance**: No perceptible lag when switching pills after first load.
- **Quality**: No increase in Assessment Builder **5xx** rates on the new GET.

### Timeline Breakdown

| Phase | Duration | Why |
|-------|----------|-----|
| GET + Prisma select | 0.5 day | Straightforward, mirrors other routes |
| Workspace + CSS | 1–1.5 days | State, accessibility, animation tuning |
| Tests + QA | 0.5–1 day | TDD on pure line logic |

**Total**: **2–3 days**  
**Confidence**: **High** — data model and route folder already exist; UI is a focused increment.

### What Could Make This Take Longer

- **Header refactor** touching click targets (stopping propagation on pills vs header) could add **half a day** if we need to rework focus and keyboard behavior.
- If **GET** must support **pagination** later (many huge files), add **+1 day** — **out of scope** for v1.

### What Is Not Included

- PDF viewer, page thumbnails, or in-drawer search.
- Editing extracted text.
- Real-time updates when a new file finishes extraction (user can close/reopen or we add a refresh later).
- Changing the **right-hand document canvas** (split is **chat column**: header → drawer → messages).

### Next Steps

1. Review this plan against User Story 6 in the spec.
2. Run `/implement` on the agreed branch starting with **GET** and **tests** for line classification.
3. QA with **`public/prototypes/sei-assessment-builder-v8.html`** alignment where the prototype still applies (drawer is **top-dropping**, not bottom sheet).
