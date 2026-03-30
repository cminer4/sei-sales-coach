## Implementation Plan: SEI AI Assessment Builder (MVP)

**Branch**: `SEI-42-sei-ai-assessment-builder`  
**Spec**: [specs/features/SEI-42-sei-ai-assessment-builder.md](../features/SEI-42-sei-ai-assessment-builder.md)  
**Exploration**: [specs/explorations/sei-ai-assessment-builder-exploration.md](../explorations/sei-ai-assessment-builder-exploration.md)  
**Design**: [specs/designs/sei-ai-assessment-builder-design.md](../designs/sei-ai-assessment-builder-design.md)  

**Estimated Timeline**: **3–4 weeks** (one developer) — dashboard and forms are straightforward; the draft pipeline (extract, chunk, embed, retrieve, generate), contenteditable editor with dirty-state refine behavior, publish animation, version storage, and DOCX export each need solid testing.

**Prototype (NFR-004)**: **`public/prototypes/sei-assessment-builder-v8.html`** — visual and interaction source of truth. **Styling (NFR-005)**: No shadcn default themes or Tailwind `dark:` for `/guide/assessment-builder/**`; use spec/prototype tokens (surface `#f7f6f4`, white inputs, border `#e8e4f0`, accent `#9b6dff`); **only the sidenav is dark**.

---

### Prerequisites Note

**Exploration**: See [specs/explorations/sei-ai-assessment-builder-exploration.md](../explorations/sei-ai-assessment-builder-exploration.md).

---

### What We're Building (Summary)

Internal consultants get a **Guide** tool under `/guide/assessment-builder` where they capture client context and uploads, receive a **five-section Discovery draft** grounded in their files and scoped **knowledge base** content, **refine** it through a short **SEI Guide** chat (with **manual edits** protected from blind overwrites), then **publish** and **download a Word document**. This turns messy Discovery inputs into a structured, reviewable, client-ready package without leaving the platform.

---

### Technical Approach

We will deliver value in **layers** so something is demoable early:

1. **Foundation (data + navigation)** — **Phase 1 (Decision 7)**: no **`lib/auth.ts`** on Assessment Builder API routes; **`created_by`** uses **`STUB_USER_ID`** from **`lib/assessment-builder-stub-user.ts`**. New **assessment** records, **uploaded files**, and **versions** persist in the database. Outcome: real rows and stable `created_by` for development; swap stub when app-wide auth lands.

2. **Entry and capture** — **Dashboard** with search, filter, and sort (seed data first, then wired to the API). **New assessment** form with chips, brief, uploads to **storage**, **Save & exit** and **Create Draft**. Outcome: consultants can onboard an engagement end-to-end.

3. **Draft intelligence pipeline** — **Extract** text from PDFs and Word files, **chunk and embed** into **assessment-scoped** vectors, **pull** the right **KB** snippets (documents tagged for **assessment-builder**), then **one structured AI call** that returns five HTML sections. Outcome: drafts that cite methodology and transcripts instead of generic filler.

4. **Builder UX** — **Layout** and **animations** match **`sei-assessment-builder-v8.html`** (timings are part of **NFR-004**). **Shimmer** while waiting; **contenteditable** document with **toolbar**, **status chips**, and **`data-manually-edited`** per section. **CSS approach**: explicit tokens from the spec and prototype (**NFR-005**), not shadcn defaults or app-wide dark mode classes. Outcome: the product matches the Builder visual system, not a generic admin theme.

5. **Refine loop** — **Chat** with scripted **SEI Guide** behavior; **`/api/refine-section`** updates sections. **Decision 4**: untouched sections get **direct** updates; **dirty** sections get **suggestion cards** with **Apply**. Outcome: consultants keep control when they have already edited copy.

6. **Publish and ship** — **Publish Draft** with **inline button loading** (no full-screen compile overlay), **published** read-only view, **version timeline** with **restore**, export API and success **toast**. Outcome: sign-off moment plus an offline file for the client.

7. **Follow-on slice** — **Document drawer** (top drop, pills): scheduled as **P2** but treated as **core** for a later milestone per design.

---

### Constitution Check

- **Spec-driven development**: Implementation follows the approved spec and design; prototype fidelity is **NFR-004**.
- **TDD**: New business logic gets tests first (**Jest**); high coverage on parsing, RAG assembly, export helpers per **FR-011**.
- **RAG integrity**: KB retrieval uses existing **`KnowledgeBaseDocument` / `KnowledgeBaseChunk`** with **`assessment-builder`** in `agents`; **no** parallel KB tables; categories inform prompts (**FR-007**).
- **Tech stack**: Next.js App Router, TypeScript, Prisma, Supabase, Anthropic, OpenAI embeddings, Tailwind — per **CLAUDE.md**.
- **Module boundaries**: Pages thin; **`lib/`** owns pipeline, prompts, retrieval helpers; **`app/api/`** validates input; **`created_by`** via **`STUB_USER_ID`** (**FR-008**, **Decision 7**), not **`getCurrentUserId()`** in Phase 1.
- **Route contract**: All user-facing routes under **`/guide/assessment-builder/**`** only.
- **Exception**: This feature uses the spec’s **DM Serif / DM Sans** and **light-main / dark-rail** system for Builder tools (documented in spec and design), which extends but does not replace global brand notes in **CLAUDE.md** for `/coach/*`.
- **NFR-005**: Assessment Builder routes avoid **shadcn default themes** and **Tailwind `dark:`** so the UI stays on prototype tokens; only the **sidenav** is dark.

---

### Files That Will Be Created or Modified

**User-facing**

- **Dashboard** (`/guide/assessment-builder`): Table, search, filters, sort, New Assessment — first impression of the product.
- **New assessment** (`/guide/assessment-builder/new`): Form, chips, uploads, Save & exit / Create Draft.
- **Builder** (`/guide/assessment-builder/[id]`): Sidenav, animated left panel, shimmer, document canvas, toolbar, chat, update and suggestion cards, publish entry point; later **document drawer** (top).
- **Published** (`/guide/assessment-builder/[id]/published`): Read-only document, version column, export, restore.

**Behind the scenes**

- **Prisma schema + migrations**: `assessments`, `assessment_documents`, `assessment_versions`, `assessment_comments` (minimal), `document_chunks` linked to assessments.
- **Supabase Storage**: Upload paths; server-only service role usage; path rules so users only see their org’s files (**NFR-002**).
- **`lib/`**: Embeddings (existing `embedText`), chunk helpers, retrieval assembly, **`lib/prompts.ts`** for generate + refine, JSON parsing guards, DOCX builder using **`docx`** package.
- **API routes**: `extract`, `embed`, `generate-draft`, `refine-section`, `export-docx` — **open** in v1 (**Decision 7**); **`created_by`** from **`lib/assessment-builder-stub-user.ts`**. Do **not** import **`lib/auth.ts`** in Phase 1.

**Tests** (`__tests__/` or colocated)

- Extract idempotency (skip chunk if exists), JSON parse safety, refine client behavior (dirty vs clean), export smoke, retrieval filter for `assessment-builder` agent scope.

**Operations / content**

- **Admin KB**: Tag or add documents with **`assessment-builder`** in `agents` so retrieval returns useful methodology and evaluation criteria — not a code change alone.

---

### Dependencies

**Must be done first**

- Prisma models and migrations for new entities; Storage bucket or path convention for uploads.
- **Decision 7**: Assessment Builder APIs do **not** require a session in Phase 1; no **`lib/auth.ts`** dependency for those routes.

**Can run in parallel**

- Dashboard UI with seed data while pipeline services are stubbed.
- Prompt copy in **`lib/prompts.ts`** while extract/chunk code is built.
- Published page shell while generate-draft is still integrating.

**Blocks later work**

- **Document drawer** needs builder shell and stored extracted text per document.
- **Full E2E demo** needs generate + refine + publish + export connected.

---

### Test Strategy

**Happy path**

- Dashboard → create assessment → create draft → see five sections → answer questions → see updates or suggestion cards → publish → published view → download DOCX.

**Errors**

- Missing session → cannot hit APIs; user sees login or safe redirect per app pattern.
- Bad or empty extract → **warnings**, no silent pretend (**edge cases**).
- Malformed AI JSON → visible error, retry, no corrupt HTML (**edge cases**).
- Double publish → button disabled; server idempotent.

**Edge**

- Chunk dedupe when re-running generation.
- Refine on **dirty** section → no inject; **Apply** path works.
- Zero RAG hits → gaps flagged in content or warnings, no invented quotes.

**Proof it works**

- SC-003 journey completes on a preview deploy; SC-004 visual checklist passes; automated tests green for SC-002 scope.

---

### Risks and Mitigations

| Risk | Business impact | Mitigation |
|------|-----------------|------------|
| Long-running draft generation | Users think the app froze | Shimmer, non-blocking shell, optional status messaging (**NFR-001**) |
| Weak or missing uploads | Bad draft quality | Warnings, prompt rules, no fake citations (**edge cases**) |
| Prototype drift | Ship looks wrong | Compare to **`public/prototypes/sei-assessment-builder-v8.html`**; follow **NFR-004** and **NFR-005** (tokens only, no shadcn/dark shortcuts) |
| KB empty for `assessment-builder` | Generic drafts | Seed KB docs in admin with correct agent scope before launch |
| Manual vs AI edit conflicts | Lost trust if AI overwrites work | **Design Decision 4** + **FR-013** enforced in UI |

---

### Implementation Phases

**Phase 1: Core functionality**

- Schema, Storage uploads (enforce **10MB / 25MB** per **Decision 6**), dashboard + new assessment + builder shell with shimmer.
- Extract → chunk → embed → RAG → generate-draft (Claude JSON).
- Contenteditable + toolbar + manual-edit tracking + refine (clean + dirty paths).
- Publish (spinner on button), published page, versions, export-docx, toast.

**Deliverable**: End-to-end path matches **SC-003**; internal demo on preview.

**Phase 2: Polish and edge cases**

- Warnings UI for failed extract / thin evidence; retry flows; loading and error copy.
- Accessibility pass (focus rings, keyboard for Apply and main actions).
- Performance sanity on large uploads.

**Deliverable**: QA-ready against P1 acceptance scenarios.

**Phase 3: Testing and review**

- Fill test gaps for SC-002; manual QA checklist SC-001 / SC-004; lint + build SC-005.

**Deliverable**: Ready to enable for internal consultants.

**Phase 4 (scheduled follow-on): Document drawer**

- Top-dropping drawer, pills, styling per User Story 6 — **core** product, **P2** schedule.

---

### Deployment Plan

**Feature flag**: Optional — hide routes until KB content is ready; v1 does not depend on login (**Decision 7**).

**Database changes**: **Yes** — new tables for assessments, documents, versions, chunks, comments. Migrations run on deploy; plan a maintenance window only if the project requires zero-downtime tricks (usually not for additive tables).

**Rollback**: Revert deployment; new tables unused until launch. No client-facing `/coach` behavior changes.

**New voice / Prompt Control agent**: **Not required** for this feature — SEI Guide is **text** + API Claude, not a new ElevenLabs agent row. **KB documents** must include **`assessment-builder`** in `agents` where appropriate; that is **content and admin** work, not a new `agents` table insert.

---

### Success Metrics

- **Completion rate**: Consultants who start an assessment can reach **downloaded DOCX** without support (**SC-003**).
- **Quality signals**: Fewer “AI invented facts” reports; warnings visible when sources are thin.
- **Stability**: No increase in **5xx** noise on `/guide/assessment-builder` routes vs baseline (v1 routes do not return **401** for missing session).

---

### Timeline Breakdown

| Phase | Duration | Why |
|-------|----------|-----|
| Foundation + data + dashboard + new form | 4–6 days | Migrations, Storage, forms, seed table behavior |
| Draft pipeline + generate API | 5–7 days | Extract libraries, chunk/embed, RAG, Claude JSON, tests |
| Builder UI + refine + Decision 4 | 4–6 days | Animations, editor, chat cards, suggestion + Apply |
| Publish + versions + DOCX | 3–4 days | Overlay timing, version CRUD, `docx` export |
| QA + fixes + KB seeding | 3–5 days | SC-001/004, edge cases, admin content |
| **Document drawer (P2)** | 2–3 days | Top animation, pills, after MVP slice |

**Total (MVP P1)**: **~3–4 weeks** single developer; **+2–3 days** if document drawer lands in the same release.

**Confidence**: **Medium** — largest unknown is prototype location and parity work; pipeline complexity is known from similar RAG patterns in the repo.

---

### What Could Make This Take Longer

- **Ignoring NFR-005**: Using shadcn defaults or `dark:` on Builder routes forces a **restyle pass** to match **`sei-assessment-builder-v8.html`**.
- **Supabase RLS or Storage rules**: Misconfiguration blocks uploads or leaks paths — budget **1–2 days** for hardening.
- **KB not tagged**: Product looks weak until admin tags docs — **content** delay, not only code.

---

### What Is Not Included (per spec)

- Real-time co-editing, full comment threads, version **diff** UI.
- Advanced PDF layout recovery beyond current extractors.
- Non-English UI.
- **Document drawer** in the first MVP slice if you strictly timebox P2 (still planned as core).

---

### Phase 4: Publish, version history, DOCX (detailed plan)

See **[plan-phase4.md](./plan-phase4.md)** — publish transaction, published read-only view, version timeline with restore, `/api/assessment-builder/export-docx`, success toast, and `assessment_versions.summary` migration notes.

---

### Next Steps

1. Review this plan with the spec and design.
2. Use **`public/prototypes/sei-assessment-builder-v8.html`** for visual and interaction QA (**NFR-004**); implement with **NFR-005** styling rules (no shadcn default theme / `dark:` on Builder routes).
3. Seed **KB** documents with **`assessment-builder`** scope before internal launch.
4. Run `/implement` on branch `SEI-42-sei-ai-assessment-builder` starting with schema + stub user module + dashboard.
