---
linear: https://linear.app/sei-interview-app/issue/SEI-42/sei-ai-assessment-builder-mvp
ticket: SEI-42
embedding_provider: openai
embedding_model: text-embedding-3-small
embedding_dimensions: 1536
status: approved
---

# Feature Specification: SEI AI Assessment Builder (MVP)

**Feature Branch**: `SEI-42-sei-ai-assessment-builder`
**Created**: 2026-03-27
**Status**: Approved
**Linear Ticket**: [SEI-42](https://linear.app/sei-interview-app/issue/SEI-42/sei-ai-assessment-builder-mvp)
**Input**: User description: "SEI AI Assessment Builder — internal tool to turn Discovery engagement findings into structured, client-ready deliverables (Builder agent on Agent Platform); validated HTML prototype is source of truth for UX."

## Summary

The **Assessment Builder** is an internal **Builder**-type tool on SEI's Agent Platform. Consultants supply client context (name, stakeholders, brief, uploaded transcripts). The **SEI Guide** agent generates a structured Discovery-phase deliverable set. The consultant edits the draft in a **live `contenteditable` document canvas** (no ProseMirror, Tiptap, or Slate), then **publishes** and **downloads** a `.docx`. **Phase 1** covers dashboard (seed data), config + Supabase persistence, RAG-backed draft generation, clarifying Q loop with update cards, publish flow with compile animation, published view with version history, and export. **Phase 2** defers real-time collaboration, multi-user comments, version diffing, and transcript PDF parsing beyond existing extract paths.

**Visual system (non-negotiable)**: **56px dark sidenav** only (`#1e1130`, accent `#9b6dff`). **All other surfaces are light** (`#f7f6f4` continuous across config and chat; document canvas shell `#e8e5e0`, page `#fff`). **Typography**: DM Serif Display (document headings, page titles), DM Sans (UI). **Primary CTA**: gradient `#e85d75` to `#9b6dff`. Match **`public/prototypes/sei-assessment-builder-v8.html`** for interaction timing, copy, and component behavior.

**Implementation styling (Assessment Builder routes only)**: Do **not** use **shadcn default themes** or **Tailwind `dark` mode classes** under `/guide/assessment-builder/**`. All UI follows this feature’s tokens and the prototype: main **surface `#f7f6f4`**, **white** inputs, **border `#e8e4f0`**, **accent `#9b6dff`**. The **sidenav is the only dark element**; the main workspace stays light (see **NFR-004**, **NFR-005**).

**Tech alignment**: Next.js 14 App Router, TypeScript, Supabase (PostgreSQL + pgvector + Storage), Prisma, Anthropic Claude (`claude-sonnet-4-20250514` per product spec), OpenAI embeddings via **`text-embedding-3-small`** (1536 dimensions; wrapper in `lib/embeddings.ts`; `EMBEDDING_MODEL` and `EMBEDDING_PROVIDER` in `.env.local`), Vercel. API routes under `app/api/**/route.ts`; shared logic in `lib/`; UI in `components/`. **Routes** for this feature live under **`/guide/assessment-builder/**`** (internal Guide tools per project constitution; do not use root `/assessments` without an explicit product exception).

## User Scenarios & Testing (mandatory)

### User Story 1 - Dashboard: list, search, filter, sort (Priority: P1)

An internal consultant opens the Assessment Builder dashboard and sees a **light-surface** table of assessments with **search**, **status filter** (All / Discovery / Draft Ready / Complete), and **sort**. A **"+ New Assessment"** gradient button appears top-right. Phase 1 uses **static seed data** in the UI; search, filter, and sort MUST operate on that dataset as if it were API-backed.

**Why this priority**: Entry point and mental model for all work.

**Independent Test**: Load `/guide/assessment-builder`, verify seed rows, search narrows rows, filters by status, sort changes order.

**Acceptance Scenarios**:

1. **Given** the dashboard loads, **When** the user types in search, **Then** the table shows only matching assessments (client name or other defined fields).
2. **Given** seed data includes multiple statuses, **When** the user selects "Draft Ready", **Then** only draft-ready rows appear.
3. **Given** a sort control exists, **When** the user changes sort, **Then** row order updates deterministically.

### User Story 2 - New assessment: form validation, save to Supabase, uploads (Priority: P1)

The consultant completes **client name**, **stakeholders** (chip input), optional **project brief**, and **uploads transcripts**. **"Save & exit"** (secondary) persists a draft record and returns to dashboard. **"Create Draft"** (primary) validates required fields, saves the assessment and **assessment_documents** metadata (Supabase Storage paths), then transitions to the builder workspace.

**Why this priority**: Persisted engagement context is required for RAG and generation.

**Independent Test**: Create assessment with valid data; verify Prisma/Supabase rows for `assessments` and `assessment_documents`; invalid submit shows errors.

**Acceptance Scenarios**:

1. **Given** required fields are empty, **When** the user clicks Create Draft, **Then** validation messages appear and no workspace transition occurs.
2. **Given** valid input and files, **When** the user clicks Create Draft, **Then** assessment and document records exist with correct `storage_path` and metadata.
3. **Given** a partially filled form, **When** the user clicks Save & exit, **Then** data is saved and the user returns to the dashboard.
4. **Given** upload limits (**Decision 6**), **When** a file exceeds **10MB** or total exceeds **25MB**, **Then** the API rejects and the upload zone shows a **clear inline error**.

### User Story 3 - Builder workspace: layout, panel transition, shimmer, document reveal (Priority: P1)

The **builder** shows **dark 56px sidenav** + **left panel** + **right document canvas**. On analysis start, the **left panel animates** from ~60% width to **320px** over **500ms** (`cubic-bezier` per prototype); **config fades out** (opacity 0, `translateX(-12px)`, **280ms**); **chat fades in** (**300ms**, **80ms** delay). The **light surface stays continuous** (`#f7f6f4`) — no dark left panel. The **canvas** shows **shimmer skeleton** during generation, then **`contenteditable`** document **fades in**. Toolbar sits **inside** the doc page with **negative margin bleed** (`margin: -44px -52px 28px`), background `#f9f8f6`, bottom border `#ede9e4`.

**Why this priority**: Core UX contract from the prototype.

**Independent Test**: Trigger Create Draft; measure or visually verify transitions; confirm shimmer then contenteditable HTML.

**Acceptance Scenarios**:

1. **Given** Create Draft succeeds, **When** the workspace loads, **Then** the left panel width and fade animations match spec timings.
2. **Given** draft generation is in flight, **When** the user views the canvas, **Then** shimmer displays until the API completes.
3. **Given** HTML is returned, **When** the document mounts, **Then** `contenteditable` is true and the toolbar is visually attached to the page per `tbar` rules.

### User Story 4 - Pipeline: extract, chunk, embed, RAG retrieve, structured generation (Priority: P1)

On **begin analysis**, the server runs **sequentially**: (1) **Extract** text per uploaded file (PDF `pdf-parse`, DOCX `mammoth`, TXT read); store plain text on the document record (upload-time or on-demand). (2) **Chunk** ~800 tokens, 100 overlap; **embed** with OpenAI (`lib/embeddings.ts`); insert into **`document_chunks`** (skip if chunks exist). (3) **Retrieve** top **8** assessment chunks from **`document_chunks`** and top **4** chunks from **`knowledge_base_chunks`** joined to **`knowledge_base_documents`**, filtering KB rows where **`'assessment-builder' = ANY(agents)`**, and using **`category`** on the document to distinguish methodology vs evaluation criteria when assembling retrieval prompts. (4) **Claude** returns **JSON only** with five HTML sections; client injects into the editor and applies **status chips** on **h2** per section rules (sections 1, 2, 5 → Draft; 3, 4 → Building).

**Why this priority**: This is the differentiated Builder value (grounded, methodology-aware draft).

**Independent Test**: Integration test with mocked Claude/embeddings or stubbed RPC; unit tests for chunk dedupe and JSON parse.

**Acceptance Scenarios**:

1. **Given** a PDF and DOCX upload, **When** extract runs, **Then** both yield non-empty text stored for downstream chunking.
2. **Given** chunks already exist for a document, **When** generation runs again, **Then** chunking is skipped for that document.
3. **Given** valid RAG results, **When** structured generation completes, **Then** the parsed JSON maps to five sections and HTML contains no invented proper nouns beyond excerpts (manual spot-check + automated guard where feasible).

### User Story 5 - SEI Guide chat: intro, 2–3 questions, update cards, refine API (Priority: P1)

After the draft appears, **SEI Guide** (chat, light bubbles: agent white border `#e8e4f0`; user `rgba(155,109,255,.08)` border) **greets**, confirms client, states a first draft exists, and asks **2–3 clarifying questions** (primary challenge, stakeholder buy-in, blockers). **Each user answer** triggers **`/api/refine-section`**: Claude returns `{ updatedHTML, summary }` (or equivalent). **Untouched sections**: returned HTML **replaces** the target section; an **UpdateCard** posts in chat with section name and one-line summary. **Manually edited sections** (see **Design Decision 4**): do **not** inject HTML into the document; post a **suggestion card** with the proposed change and **Apply**. Agent behavior follows the **system prompt** in Requirements (concise; no invented facts). The consultant **may edit the document manually at any time** during this phase (contenteditable canvas remains fully editable); first keypress within a section sets **`data-manually-edited="true"`** on that section.

**Why this priority**: Closes the loop between consultant input and document quality.

**Independent Test**: Scripted chat turns with mocked API returning fixed HTML deltas; verify DOM update and chat cards.

**Acceptance Scenarios**:

1. **Given** the draft is visible, **When** the session enters chat phase, **Then** the first agent message follows the SEI Guide script and labels (e.g. eyebrow "NEW ASSESSMENT" where applicable per prototype).
2. **Given** the user answers a clarifying question and the target section is **not** manually edited, **When** refine completes, **Then** the section HTML updates and an UpdateCard shows the summary.
3. **Given** the user has manually edited a section (`data-manually-edited="true"`), **When** refine targets that section, **Then** HTML is not injected; a suggestion card with **Apply** appears and the document stays unchanged until the user applies or edits further.
4. **Given** a suggestion card with **Apply** (**Decision 5**), **When** the user clicks **Apply**, **Then** **`data-manually-edited="true"`** is set on that section (if not already) and subsequent refines for that section use **suggestion cards** only for the rest of the session.
5. **Given** three answers completed, **When** the loop ends, **Then** the UI state allows publish (status `draft_ready` or equivalent).

### User Story 6 - Document drawer: light, collapsible, doc pills (Priority: P2)

**Core** Builder capability (source material next to the draft). **P2** is **schedule** (may follow the first MVP slice), not “optional forever.”

A **document drawer** (light: bg `#f9f8f6`, header `#f3f0f8`) **drops from the top** of the workspace (not a bottom sheet). Height animates **0 → 38%** (**350ms**). **Consultant** lines: muted gray, italic. **Client** lines: `#333`, soft **purple left border**. **Project header** toggles the drawer; **stakeholders** read-only chips; **documents** as **purple-tinted pills** — opening a pill **does not** close the drawer (user may switch docs).

**Why this priority**: Grounding review; ship after core loop if needed, but plan as essential.

**Independent Test**: Toggle drawer, switch pills, verify drawer rules and styling.

**Acceptance Scenarios**:

1. **Given** multiple uploaded docs, **When** the user opens doc pills, **Then** the content for the selected source switches without closing the drawer.
2. **Given** the drawer is collapsed, **When** the user opens the project header, **Then** the drawer animates to the specified height proportion.

### User Story 7 - Publish: compile overlay, published view, version history (Priority: P1)

**Publish** shows a **full-screen compile overlay**: dark background, **5 rows** animate sequentially (spin → check, **650ms** processing, **260ms** gap), **progress bar** fills proportionally. On complete: **"Draft ready"** → **800ms** → navigate to **`/guide/assessment-builder/[id]/published`**. **Published view**: **read-only** document left; **260px** version history **right** (dot timeline; current version **purple dot + glow**; older versions have **restore** links per prototype).

**Why this priority**: Delivers client-ready milestone and auditability.

**Independent Test**: Publish flow with stubbed compile; verify navigation and read-only mode.

**Acceptance Scenarios**:

1. **Given** the user clicks Publish, **When** the overlay runs, **Then** five steps complete in order with the specified timing pattern.
2. **Given** publish completes, **When** the published page loads, **Then** version history shows at least the published version as current.

### User Story 8 - Finalize and download DOCX (Priority: P1)

Finalize triggers **toast** (fixed **bottom-center**, dark `#1a1a2e`, green border, **3200ms**, checkmark + "Document finalized and downloaded" + client/version subtitle). Server **`/api/export-docx`** converts **content JSON** (from `assessment_versions.content_json`) to `.docx` using the **`docx`** npm package (or equivalent approved library).

**Why this priority**: Primary offline deliverable.

**Independent Test**: Export API returns a downloadable file; smoke open in Word / Google Docs.

**Acceptance Scenarios**:

1. **Given** a version with structured JSON, **When** the user exports, **Then** a `.docx` downloads with five Discovery sections represented.
2. **Given** export succeeds, **When** the toast appears, **Then** it auto-dismisses after 3200ms.

### Edge Cases

- **Empty or failed extraction** for one file: skip or surface a clear **warning**; generation must not silently treat missing text as evidence. **Do not** hard-block publish solely on thin evidence thresholds; use warnings and visible gaps instead.
- **Zero chunks after embed**: RAG returns empty; generation MUST flag gaps and avoid fabricating quotes (align with prompt rules).
- **Claude returns non-JSON or malformed JSON**: user-visible error, retry path, no partial corrupt HTML in the editor.
- **Concurrent publish or double-click**: idempotent server handling; disable client button while publishing.
- **`created_by`**: Phase 1 uses the **fixed stub UUID** per **Design Decision 7**; future: **Supabase `auth.users` UUID** via **`getCurrentUserId()`** (no separate app `users` table, **no FK** to `auth.users`).
- **KB**: reuse **`KnowledgeBaseDocument`** and **`KnowledgeBaseChunk`** only — **do not** add `kb_*` tables. Scope KB retrieval with **`'assessment-builder' = ANY(agents)`**. Use **`category`** (indexed on documents) to separate methodology vs evaluation criteria in prompts.

## Design Decisions

Decisions 1–3 (document drawer, SEI Guide tone, weak-source warnings) are recorded in `specs/designs/sei-ai-assessment-builder-design.md` (Decisions 4–7 are mirrored there for UX review).

### Decision 4: Agent updates and manual edits

The agent never overwrites a section the consultant has manually edited. Each document section tracks a dirty state — a `data-manually-edited="true"` attribute set on first manual keypress within that section. When the agent's refine response targets a section marked dirty, it does not inject HTML. Instead it posts a suggestion card in chat with the proposed change and a one-click **Apply** button. Sections the consultant has not touched are updated directly as before.

### Decision 5: Apply button and dirty state

Clicking **Apply** on a suggestion card sets **`data-manually-edited="true"`** on that section, identical to a manual keypress. The section **remains protected** from direct agent updates for the **remainder of the session**. All subsequent refine responses for that section post **suggestion cards** (not direct HTML injection).

### Decision 6: Upload size limits

**Maximum 10MB per file** and **25MB total per assessment**. Enforce at the **API route** level. Show a **clear inline error** on the upload zone if either limit is exceeded. **Do not** rely on UI-only validation.

### Decision 7: Authorization (Phase 1)

**No authentication** exists in the app for v1. All Assessment Builder API routes are **open**, consistent with the rest of the platform. **`created_by`** is **stubbed** with a fixed development UUID (`00000000-0000-0000-0000-000000000001`). Route handlers MUST **not** import or call **`lib/auth.ts`** in Phase 1; use the stub constant with a **TODO** to replace with **`getCurrentUserId()`** when auth is added app-wide. Auth will be added in a **future initiative**; Assessment Builder routes will adopt **`getCurrentUserId()`** at that point.

## Requirements (mandatory)

### Functional Requirements

- **FR-001**: App MUST implement routes under **`app/guide/assessment-builder/`** for dashboard, new assessment, builder `[id]`, and published `[id]/published`, with a **layout** that includes the **56px dark sidenav** and **light** main content. Sidenav MUST use `#1e1130`, accent `#9b6dff`, logo gradient `#e85d75` → `#9b6dff`.

- **FR-002**: Dashboard MUST provide **search**, **status filter** (All / Discovery / Draft Ready / Complete), **sort**, seed data in Phase 1, and **"+ New Assessment"** gradient CTA top-right.

- **FR-003**: New assessment form MUST collect **client name**, **stakeholders** (chips), optional **project brief**, **file uploads** to Supabase Storage, and persist **`assessments`** + **`assessment_documents`** via Prisma migrations aligned to the Key Entities below. Upload limits per **Design Decision 6**: **10MB per file**, **25MB total per assessment**; enforce in **API**; show **inline error** on the upload zone when exceeded.

- **FR-004**: Status values in data MUST map to UI badges: e.g. `new` / early → **Discovery** badge styling; `draft_ready` → **Draft Ready**; `complete` → **Complete** — exact mapping table MUST match prototype copy.

- **FR-005**: **Document canvas** MUST use **native `contenteditable`** only. Formatting MUST use **`document.execCommand`** for bold, italic, bullets. Highlights MUST use **`<mark data-color="yellow|green|red|blue|purple">`**. Comment anchors MUST use **`<span class="cm" data-cid="id">`** for Phase 1 scaffolding (full collaboration deferred). Toolbar MUST sync via **`queryCommandState`**. Each of the five section wrappers MUST support **`data-manually-edited="true"`** set on first manual keypress (or equivalent input) inside that section, and when the user clicks **Apply** on a suggestion card (**Design Decisions 4 and 5**).

- **FR-006**: **Draft generation** MUST run the **four-stage pipeline** (extract → chunk/embed → RAG → structured JSON generation) and MUST call **`claude-sonnet-4-20250514`** with the **JSON output contract** for five sections: `findings`, `interviews`, `hypothesis`, `stakeholder_map`, `opportunities`.

- **FR-007**: **`pgvector`** MUST remain enabled. Per-assessment transcript chunks live in **`document_chunks`** (vector **1536**). **KB retrieval** MUST use existing **`knowledge_base_documents`** and **`knowledge_base_chunks`** — **no new `kb_*` tables**. Filter KB content with **`'assessment-builder' = ANY(agents)`**. Use **`KnowledgeBaseDocument.category`** (indexed) to distinguish methodology vs evaluation criteria when building retrieval prompts. **Assessment-scoped** `document_chunks` MUST filter by **`assessment_id`**. Implement similarity search (RPC or raw SQL) consistent with existing admin retrieval patterns.

- **FR-008**: API routes MUST exist: **`/api/documents/extract`**, **`/api/documents/embed`**, **`/api/generate-draft`**, **`/api/refine-section`**, **`/api/export-docx`**, each validating input. **Phase 1 authorization (Design Decision 7)**: **No session check**; routes are **open**, consistent with the rest of the platform v1. **`created_by`** (and any **`created_by`** on versions) MUST use the **stub UUID** from **`lib/assessment-builder-stub-user.ts`** (or equivalent single module) with a **TODO** to replace with **`getCurrentUserId()`** when auth is added app-wide. Route handlers MUST **not** import **`lib/auth.ts`** in Phase 1.

- **FR-009**: **`assessment_versions`** MUST store **`content_json`** (JSONB) for each saved/published version; publish flow MUST create or bump versions per product rules.

- **FR-010**: **SEI Guide** system and user prompts MUST follow the behavioral spec (greet, 2–3 questions, update cards; concise; no invented facts). Prompts SHOULD live in **`lib/prompts.ts`** (or equivalent) for single source of truth.

- **FR-011**: **Non-functional**: New business logic MUST have **Jest** tests first (TDD); coverage **≥ 80%** on new modules, **100%** on parsing, RAG assembly, and export helpers where feasible.

- **FR-012**: Environment variables MUST include **`ANTHROPIC_API_KEY`**, **`NEXT_PUBLIC_SUPABASE_URL`**, **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**, **`SUPABASE_SERVICE_ROLE_KEY`**, **`OPENAI_API_KEY`**, **`EMBEDDING_MODEL`**, and **`EMBEDDING_PROVIDER`** (set in `.env.local` alongside the app). **Embeddings**: **`text-embedding-3-small`** via OpenAI; implementation MUST use **`lib/embeddings.ts`** (`embedText`, **1536** dimensions).

- **FR-013**: **Refine flow** MUST implement **Design Decisions 4 and 5**: if refine targets a section with **`data-manually-edited="true"`**, the client MUST NOT inject returned HTML into that section; MUST show a **suggestion card** in chat with the proposed change and an **Apply** control. **Apply** sets **`data-manually-edited="true"`** and keeps the section on **suggestion-only** updates for the rest of the session. Untouched sections MUST continue to receive direct HTML replacement and UpdateCards as in User Story 5.

### Key Entities

- **`assessments`**: `id`, `created_by` (string UUID; Phase 1 **stub** per **Decision 7**; later **auth user id**), `client_name`, `stakeholders` (string array), `project_brief` (nullable text), `status` (`new` | `in_progress` | `draft_ready` | `complete`), `created_at`, `updated_at`.

- **`assessment_documents`**: `id`, `assessment_id`, `filename`, `file_size`, `storage_path`, extracted text field (name per Prisma migration), `uploaded_at`.

- **`assessment_versions`**: `id`, `assessment_id`, `version_number` (e.g. `v0.1`, `v1.0`), `content_json` (JSONB structured sections), `created_at`, `created_by`.

- **`assessment_comments`**: `id`, `assessment_id`, `version_id`, `anchor_text`, `body`, `author_id`, `tagged_users`, `resolved`, `created_at` — Phase 1 may persist schema with minimal UI (Phase 2 full threading).

- **`document_chunks`**: per-assessment RAG chunks with embeddings.

- **`knowledge_base_documents` / `knowledge_base_chunks`**: existing global KB; for Builder retrieval, filter documents (and chunks) where **`'assessment-builder' = ANY(agents)`**; use **`category`** on documents for prompt shaping (methodology vs evaluation criteria). Do not introduce parallel `kb_*` tables.

### Non-Functional Requirements

- **NFR-001**: **Performance**: End-to-end draft generation may take tens of seconds; UI MUST keep shimmer and non-blocking chat shell; server routes SHOULD stream logs for ops (optional).

- **NFR-002**: **Security**: Service role key MUST only be used server-side; Storage paths MUST not leak other tenants' objects (RLS or path convention per Supabase setup). Phase 1 Assessment Builder routes are **unauthenticated** per **Decision 7**; tighten when app-wide auth ships.

- **NFR-003**: **Accessibility**: Focus rings use **`#9b6dff`**; interactive controls MUST be keyboard reachable (minimum for internal MVP).

- **NFR-004**: **Prototype fidelity**: **`public/prototypes/sei-assessment-builder-v8.html`** is the **visual and interaction source of truth** for timings, spacing, and micro-interactions; deviations require spec amendment.

- **NFR-005**: **No global dark-theme shortcuts on Builder routes**: Implementation of **`/guide/assessment-builder/**` MUST NOT rely on **shadcn default themes** or **Tailwind `dark:` / dark-mode** styling for this feature. Styling MUST follow the spec and prototype tokens (e.g. surface **`#f7f6f4`**, **white** form fields, border **`#e8e4f0`**, accent **`#9b6dff`**); only the **56px sidenav** uses the dark plum treatment.

## Success Criteria (mandatory)

### Measurable Outcomes

- **SC-001**: All **P1** acceptance scenarios pass in manual QA on a preview deployment.

- **SC-002**: **P1** automated tests cover extract/chunk idempotency, JSON parse safety, and DOCX export smoke.

- **SC-003**: A consultant can complete: **dashboard → new assessment → create draft → see generated five-section document → answer 2–3 questions → see updates → publish → published view → download DOCX**.

- **SC-004**: Visual audit: **only sidenav is dark**; left panel stays **`#f7f6f4`** in config and chat modes; purple accent usage matches spec (focus, chips, SEI Guide label, status badges).

- **SC-005**: Lint and build pass (`npm run lint`, `npm run build`).

## Reference Implementation

Use **`public/prototypes/sei-assessment-builder-v8.html`** as the canonical reference for layout, animation timings, copy, and component naming. **Document structure** (five Discovery sections), **inline h2 status chips** (Draft vs Building styles), and **toolbar** CSS (`.tbar`) MUST match unless this spec explicitly differs. See **NFR-005** for Tailwind and component-library constraints on these routes.

## Out of Scope (Phase 2)

Real-time collaboration, full comment threading UX, version **diff** UI, advanced PDF layout parsing, and non-English localization.

## Architecture Note (Constitution Alignment)

This feature adds a **Builder** experience distinct from the existing **AI Assessment & Strategy Agent** (`/guide/assessment`, SEI-38), which is a **learning** voice agent. Shared infrastructure (Supabase, embeddings, Anthropic) MAY be reused. **KB retrieval** reuses **`KnowledgeBaseDocument` / `KnowledgeBaseChunk`** with an **`assessment-builder`** agent scope and **`category`**-aware prompts, aligned with **RAG & Knowledge Base Integrity** (CLAUDE.md).
