## 🎨 Design Exploration: SEI AI Assessment Builder (MVP)

### User Journey

When **Alex**, an internal consultant, needs to turn Discovery findings into a client-ready assessment, they will:

1. **Land on the dashboard** and see a clean list of assessments (like a project inbox). They can search by client name, filter by stage (All, Discovery, Draft Ready, Complete), and sort so the most important work surfaces first. A prominent **New Assessment** action sits where the eye naturally goes (top-right), like **Create** in Google Docs.

2. **Start a new assessment** by entering the client name, adding stakeholders as removable chips (like adding people in a calendar invite), optionally pasting or typing a project brief, and uploading call transcripts or notes. If they need to step away, **Save & exit** keeps their work and sends them back to the list. When ready, **Create Draft** checks required fields, saves everything, and opens the builder.

3. **Enter the builder workspace** and feel the screen **settle into focus**: the left side starts wide for setup, then **narrows smoothly** to a fixed chat column while the document takes center stage (like a layout shift when you move from "settings" to "writing" in a two-pane tool). While the first draft is being prepared, the document area shows a **shimmer placeholder** (like LinkedIn loading a feed) so Alex knows work is in progress and the app has not frozen.

4. **Review the draft** in a document that feels like a real page: headings, five Discovery sections, a small toolbar attached to the page for bold, lists, and highlights. Section headings show **status chips** (Draft vs Building) so Alex sees at a glance what still needs attention.

5. **Refine with SEI Guide and direct editing**: In the **left column**, the assistant greets them, confirms the client, acknowledges the draft, and asks **two or three focused questions** (challenge, buy-in, blockers). Each time Alex answers, the relevant section **updates** and a short **update card** appears in the chat (like a system message in Slack saying "Section updated: …") so they trust the document changed. **At the same time, Alex can edit the document manually whenever they want** in the main canvas — typing, toolbar, highlights — independent of the chat. Chat-driven updates and hand edits coexist; nothing forces them to wait on the assistant to improve the page.

6. **Open the document drawer** when they need source material: a light panel **drops down from the top** (not up from the bottom) with speaker-labeled lines and document pills to switch sources without losing context. This is a **core feature** for the product; it **may ship in the next phase** for schedule reasons, but it belongs in the roadmap as essential, not optional forever.

7. **Publish** when satisfied: Alex clicks **Publish Draft**. The button shows a **loading spinner** (no full-screen overlay, no step-by-step animation). The app saves the **current document from the live editor** in one server transaction (status + version row), then navigates to a **published** view: read-only document on the left, **version history** on the right with a simple timeline (like Google Docs version history, but lighter). They can restore an older version if needed.

8. **Download** the final Word file: a brief **confirmation toast** appears (bottom-center, easy to notice without blocking the page), then they have a `.docx` to share with the client.

If something goes wrong (a file could not be read, or the assistant returns unusable output), Alex sees a **clear error** and a path to retry, not a broken half-page.

---

### Screen Breakdown

#### Screen: Assessment Builder dashboard

**Purpose**: Give consultants a single place to find, filter, and start assessments.

**Key Elements**:

- **Search field**: Narrows the list by client name (and other defined fields) so a busy consultant finds work in seconds.
- **Status filter**: All, Discovery, Draft Ready, Complete — matches how leadership thinks about engagements.
- **Sort control**: Makes order predictable (e.g. by date or name) so the table feels trustworthy.
- **Assessments table**: Rows with client-centric info and status badges aligned to the prototype.
- **New Assessment (primary)**: Gradient button, top-right — the main forward action.

**User Actions**: Search, filter, sort, open an existing assessment, start a new one.

**Success State**: List updates instantly as filters change; empty states explain what to do next.

**Error State**: If the list fails to load, a friendly message and retry; no blank screen.

---

#### Screen: New assessment (create / edit context)

**Purpose**: Capture everything the system needs to ground the draft in real engagement data.

**Key Elements**:

- **Client name** (required): The anchor for all copy and chat.
- **Stakeholders (chips)**: Add and remove names without cluttering a single text box.
- **Project brief** (optional): Short context for the assistant.
- **File uploads**: Transcripts and notes; clear labels for what was uploaded.
- **Save & exit** (secondary): Persist and return to dashboard — for interrupted work.
- **Create Draft** (primary): Validate, save, go to builder.

**User Actions**: Fill fields, upload files, save partial progress, or submit to build.

**Success State**: Validation passes; user transitions to the builder with confidence their files are attached.

**Error State**: Inline messages on missing required fields; visible warning if a file could not be processed (without silently ignoring it).

---

#### Screen: Builder workspace (document + chat)

**Purpose**: Edit the generated Discovery document while conversing with SEI Guide to refine it.

**Key Elements**:

- **Narrow dark navigation rail** (fixed width): Orientation and app identity only — the "workspace" stays light so reading and writing stay easy on the eyes.
- **Left panel**: First shows configuration context; then **crossfades** into chat with SEI Guide. Panel width **animates** from a wide setup feel to a fixed chat width so the document becomes the hero.
- **Document canvas**: Light page on a slightly darker shell — feels like paper on a desk. **Loading shimmer** then **editable content** with section structure and **h2 status chips**.
- **Inline toolbar**: Sits flush with the page edge (visually part of the document), for bold, italic, bullets, highlights, and future comment anchors — familiar to anyone who has used Word or Google Docs.
- **Manual editing anytime**: The canvas stays fully editable during the SEI Guide conversation — consultants can revise copy on their own before, during, or after answering clarifying questions.
- **Document drawer** (core; may follow MVP): Supporting evidence opens in a **top-dropping** drawer (see User Story 6 in the feature spec for tokens and behavior). Not a bottom sheet.

**User Actions**: Read sections, **edit text at any time**, use toolbar, type chat messages, trigger section updates via answers, open the document drawer when shipped, eventually publish.

**Success State**: Smooth transitions match the prototype timings; chat and document stay in sync; update cards confirm each refinement.

**Error State**: If generation fails, no half-rendered document; user sees recovery options. Double-clicking publish is ignored while a publish is in progress.

---

#### Screen: Publish in progress (builder)

**Purpose**: Confirm publish is running without blocking the whole workspace or distracting from the document.

**Key Elements**:

- **Publish Draft button**: Shows an **inline loading spinner** while the request runs; the button is **disabled** so double-submit is prevented. **No** full-screen overlay and **no** sequential step animation.
- **Authoritative save**: The client sends the **current editor content** at click time (structured section HTML from the live DOM), so publish does **not** rely on debounced auto-save having flushed yet.
- **Server**: One **database transaction** — update assessment `draft_content` and status, then insert a **version** row — then respond so the client can navigate.

**User Actions**: Wait on the button (primary action is still the single control).

**Success State**: Navigation to the published view (`/guide/assessment-builder/[id]/published`).

**Error State**: If publish fails, clear message and return to editable state without losing work.

---

#### Screen: Published view + version history

**Purpose**: Present a read-only snapshot for review and handoff, with auditability.

**Key Elements**:

- **Top bar** (prototype **`sei-assessment-builder-v8.html`**): Dark background **`#1e1130`** — **Back to edit**, version badge (e.g. Draft v1.0), **Finalize & Download**.
- **Read-only document** (left): Same typography and layout as the builder but **not** contenteditable — white page.
- **Version timeline** (**260px** column, background **`#faf9f7`**): Dots on a line; **current** version with purple accent and glow; **older** versions with gray dots. Each row: version label, timestamp, one-line **summary**. Older rows: **Restore this version** (writes that snapshot to draft and returns to the builder).

**User Actions**: Read, compare mentally across versions, restore if needed, proceed to download.

**Success State**: Current version is obvious; history is scannable in seconds.

**Error State**: If restore fails, explain and keep current view stable.

---

#### Screen: Finalize feedback (toast)

**Purpose**: Confirm download without blocking the screen.

**Key Elements**:

- **Fixed bottom-center toast**: Background **`#1a1a2e`**, border **`1px solid rgba(78, 203, 141, 0.35)`**, radius **10px**, green checkmark, title **Document finalized and downloaded**, subtitle with client name and version, **auto-dismiss ~3200ms**.

**User Actions**: Dismiss naturally by waiting, or continue working.

**Success State**: User knows the file landed; no second guessing.

---

### Information Hierarchy

**Priority 1**: Client name and current assessment status — always know *who* and *where* in the workflow.

**Priority 2**: The document body — the deliverable is the product; chat supports it, not the reverse.

**Priority 3**: SEI Guide messages and update cards — trust and traceability for what changed.

**Priority 4**: **Document drawer** — supporting evidence when the consultant needs to verify quotes or tone; **drops from the top** when opened.

**Priority 5**: Version history — important at publish time and when recovering prior drafts.

---

### Interaction Patterns

- **Project inbox + create flow** (like **Asana** or **Linear** list → new issue): Dashboard to new form to detail view.
- **Two-pane writing layout** (like **Notion** or **Slack** with a canvas): Narrow context/chat column, wide content.
- **Skeleton loading** (like **Facebook** or **LinkedIn** feeds): Shimmer while the first draft is prepared.
- **Assistant with structured follow-ups** (like **ChatGPT** project instructions): Short intro, 2–3 targeted questions, then handoff to publish.
- **Inline "what changed" cards** (like **GitHub** or **Figma** activity): Each answer produces a visible summary tied to a section.
- **Inline button loading** on **Publish Draft**: Spinner on the control only — no full-screen publish overlay.
- **Version sidebar** (like **Google Docs** version history): Timeline with restore.
- **Top-dropping drawer** (like some **email** apps’ account switchers or **Safari** tab overview — drops from top): **Document drawer** for transcripts and source material, not a bottom sheet.

---

### Design Decisions

**Decision 1: Document drawer timing vs MVP scope**

- The **document drawer** is a **core** capability: consultants need source material next to the draft. It **may ship in the phase after MVP** for schedule or sequencing, but it is **not** a nice-to-have forever — plan and resource it explicitly.
- **Interaction**: Panel **drops down from the top** (corrected from any bottom-up pattern).

**Status**: Aligned — core feature; phasing allowed; top drop.

---

**Decision 2: How much "assistant personality" vs "tool silence"?**

- **Option A**: Warm, named assistant (SEI Guide) with scripted greeting and fixed question count — predictable.
- **Option B**: Minimal system messages, only deltas — faster for expert users, colder.

**Tradeoff**: Option A builds trust for internal rollout and matches the prototype. Option B saves vertical space.

**Recommendation**: **Scripted intro + 2–3 questions** — internal consultants still need confidence the AI understood the engagement; brevity comes from concise copy, not removing the intro.

**Status**: **Agreed** — keep the scripted SEI Guide intro and question loop.

---

**Decision 3: Empty or weak source material**

- **Option A**: Block publish until minimum content thresholds are met.
- **Option B**: Allow publish with visible warnings on thin evidence.

**Tradeoff**: Blocking protects brand quality; warnings preserve speed when files fail unexpectedly.

**Decision**: **Warnings, not blockers** — surface extraction failures, thin RAG context, or gaps with clear **warnings**; **do not** hard-block publish on thresholds alone. Still **do not** present a polished draft that invents facts — align with prompt rules and surface gaps to the user.

---

**Decision 4: Agent updates and manual edits** (normative in feature spec)

The agent **never overwrites** a section the consultant has manually edited. Each document section tracks a **dirty** state: a **`data-manually-edited="true"`** attribute on the section wrapper, set on **first manual keypress** inside that section. When refine targets a **dirty** section, the UI **does not** inject HTML into the document. Instead it posts a **suggestion card** in chat with the proposed change and a one-click **Apply** button. **Untouched** sections still get **direct** HTML updates and update cards as before.

**Status**: Locked — see `specs/features/SEI-42-sei-ai-assessment-builder.md` Design Decisions and FR-005 / FR-013.

---

**Decision 5: Apply button and dirty state** (normative in feature spec)

**Apply** on a suggestion card sets **`data-manually-edited="true"`** on that section (same as a manual keypress). The section stays **protected** from direct agent updates for the **rest of the session**; later refines for that section use **suggestion cards** only.

---

**Decision 6: Upload size limits** (normative in feature spec)

**10MB per file**, **25MB total** per assessment; enforce on the **server**; **inline error** on the upload zone if exceeded.

---

**Decision 7: Authorization (Phase 1)** (normative in feature spec)

No app-wide auth in v1; Assessment Builder API routes are **open**; **`created_by`** uses a **fixed stub UUID** until **`getCurrentUserId()`** is adopted platform-wide.

---

**Decision 8: Publish loading pattern (Phase 4)**

- **Chosen**: **Inline spinner on Publish Draft** — no full-screen overlay, no animated checklist.
- **Why**: Faster perceived completion, less interruption while the document stays visible; still blocks double-submit via disabled + busy state.
- **Save semantics**: Publish must persist **live editor content** at click time (not only what last auto-save wrote).

**Status**: **Agreed** — supersedes any earlier design exploration that described a full-screen compile overlay.

---

### Accessibility Considerations

- **Keyboard navigation**: All primary actions (New Assessment, Create Draft, Publish, Download, **Apply** on suggestion cards) reachable without a mouse; focus moves logically from form fields to document to chat.
- **Screen readers**: Table headers and filters announced; status badges tied to clear text (not color alone); **Publish Draft** exposes a **busy** state (`aria-busy` / disabled) while publishing, not a multi-step progress region.
- **Mobile**: Internal MVP may be desktop-first; if tablets are used, ensure the two-pane layout stacks with document first or a clear tab switch between "Document" and "Guide" so nothing is unusably narrow.

---

### Brand Alignment

- **Project constitution** (`CLAUDE.md`): SPIN and broader app use dark plum, red-to-purple gradients, and Lang Gothic. This feature intentionally uses a **specified internal Builder visual system**: **56px dark sidenav only**, **continuous light main surfaces**, **DM Serif Display + DM Sans**, **primary CTA gradient** — documented as non-negotiable in the approved spec and prototype **`public/prototypes/sei-assessment-builder-v8.html`** (**NFR-004**).
- **Implementation**: For `/guide/assessment-builder/**`, do **not** use **shadcn default themes** or **Tailwind dark mode** classes; stick to spec/prototype tokens — main **surface `#f7f6f4`**, **white** inputs, **border `#e8e4f0`**, **accent `#9b6dff`**; **only the sidenav** is dark (**NFR-005** in feature spec).
- **Fit**: Still reads as SEI — disciplined, premium, accountable — but optimized for **long-form reading and editing** (light canvas) rather than marketing-style dark chrome everywhere.
- **New pattern**: Internal **Guide** tools may adopt **prototype-locked** typography and surfaces where the spec demands it; external **Coach** routes keep existing brand tokens unless product unifies later.

**Suggested Constitution Update** (for founder approval): Add a short **"Internal Builder tools"** note under Brand & Design Guidelines stating that `/guide/*` builder experiences may follow an approved spec + prototype (fonts, light/dark split) when listed in the feature spec, without changing client-facing `/coach/*` guidelines.

---

### Things We're NOT Designing

- Real-time multi-user editing and cursors.
- Full threaded comments and diff view between versions.
- Advanced PDF layout recovery (complex tables, scanned PDFs beyond current extraction).
- Non-English UI.
- Public or client-facing access — internal consultants with authenticated access only.
- Replacing the separate **AI Assessment & Strategy** voice learning flow (`/guide/assessment`) — different job-to-be-done.

---

### Next Steps

1. Review this design exploration against **`public/prototypes/sei-assessment-builder-v8.html`** (timings, copy, component names). Align prototype language with **document drawer** and **top drop** if the file still says transcript/bottom.
2. Fold approved UX choices into the feature spec as needed (document drawer core + phasing, warnings not blockers, manual edit anytime).
3. Run `/plan` or implementation planning when ready for build.
