## Exploration: SEI AI Assessment Builder (MVP)

**Spec**: [specs/features/SEI-42-sei-ai-assessment-builder.md](../features/SEI-42-sei-ai-assessment-builder.md)  
**Linear**: [SEI-42](https://linear.app/sei-interview-app/issue/SEI-42/sei-ai-assessment-builder-mvp)  
**Plan reviewed**: [specs/sei-ai-assessment-builder/plan.md](../sei-ai-assessment-builder/plan.md)  
**Design**: [specs/designs/sei-ai-assessment-builder-design.md](../designs/sei-ai-assessment-builder-design.md)  
**Status**: Ready to plan (minor optional clarifications below)

---

### What This Feature Does (Business Value)

Internal consultants turn Discovery notes and call transcripts into a **structured, client-ready assessment** inside SEI’s app: they enter context, get an AI-assisted **first draft** grounded in their uploads and approved methodology content, **refine** it through a short guided chat (without the AI blindly overwriting work they already edited), then **publish** and **download Word**. The business value is **faster, more consistent Discovery deliverables** with less copy-paste and fewer “generic AI” outputs.

---

### How It Fits Into Your App

- **Connects to**: Existing **Guide** area (`/guide/*`), same login expectations as other internal tools; **Admin knowledge base** (documents must be tagged for this product so drafts stay on-brand); shared **embeddings and database** patterns used elsewhere.
- **Depends on**: **Supabase login** for people using the tool; **storage** for uploads; **KB content** prepared for the Assessment Builder (tagged correctly) or drafts may feel thin.
- **Will touch**: New screens under **Assessment Builder** (list, create, working document, published view); **background jobs** that read files, build searchable chunks, call the AI, and produce Word exports; **no change** to client-facing **Coach** sales practice flows.

**Constitution alignment**: Spec-driven; tests before core logic where required; RAG uses the existing knowledge base tables (no duplicate KB system); routes stay under `/guide/assessment-builder/`.

---

### What's Clear

- **Who it is for**: Internal consultants, not external clients.
- **End-to-end journey**: Dashboard to new assessment to builder to publish to download, with version history on the published view.
- **Visual contract**: **`public/prototypes/sei-assessment-builder-v8.html`** is the reference for look, motion, and micro-interactions (**NFR-004**); implementation avoids default dark themes on these routes (**NFR-005**).
- **Manual vs AI edits**: Sections can be marked manually edited; AI does not overwrite those sections without an explicit **Apply** on a suggestion (**Design Decision 4**, **FR-013**).
- **Phasing**: **Document drawer** is core to the product vision but can ship after the first slice (**P2** schedule).
- **Thin evidence**: **Warnings**, not hard blocks, on publish when sources are weak (product decision recorded in spec and design).
- **Authorization (v1)**: Assessment Builder API routes are **open**; **`created_by`** uses a **fixed stub UUID** (**Decision 7**); **`lib/auth.ts`** is not used on those routes until app-wide auth ships.
- **Uploads**: **10MB per file**, **25MB total**, API-enforced with inline errors (**Decision 6**).
- **Apply**: Reinforces **dirty** state; section stays on suggestion-only refines for the session (**Decision 5**).

---

### What Needs Clarification (Optional Before Build)

These are **not** blockers for starting implementation; they reduce rework or support questions later.

1. ~~**After “Apply”**~~ **Resolved** in spec (**Decision 5**): **Apply** sets **`data-manually-edited="true"`**; section stays **protected** for the session; subsequent refines use **suggestion cards** only.

2. ~~**Largest file or total upload size**~~ **Resolved** in spec (**Decision 6**): **10MB per file**, **25MB total**.

3. **Who may open the tool** once **app-wide auth** exists: any internal user, or role-gated? *(v1 has **no auth** per **Decision 7**; answer before turning on real `created_by`.)*

---

### Risks to Consider

- **User experience**: Long **first draft** generation; the spec calls for loading states so the app never feels frozen. If the **knowledge base** is empty for this product, drafts may feel generic until **admin** adds tagged documents.
- **Security**: Uploaded transcripts may be sensitive; **access rules** for storage and APIs must match “internal only” expectations (spec calls for server-side safeguards).
- **Performance**: Large PDFs or many files could slow the **extraction** step; may affect perceived speed even if the UI stays responsive.
- **Timeline**: The **plan** (about **3–4 weeks** for one developer) is reasonable; the riskiest part is the **full pipeline plus editor behavior** in one pass, not the dashboard alone.

---

### Edge Cases Worth Handling (User Terms)

- User **closes the browser** mid-draft: work should recover from saved state where the spec requires persistence.
- User **publishes twice quickly**: should not create duplicate chaos; spec mentions **idempotent** handling and **disabling** the button while publishing.
- **Suggestion dismissed**: if the user ignores a suggestion card, the document stays as-is (already implied; confirm copy is clear so they do not think something applied).

---

### Plan Review (Short)

The **[implementation plan](../sei-ai-assessment-builder/plan.md)** matches the spec: foundation first, then pipeline, then builder UX with **NFR-004/005**, then refine and publish, then **document drawer** as a follow-on. **Prototype path** and **styling rules** are now explicit in the spec. **Risk** section correctly flags **KB seeding** and **visual parity** with the HTML file.

**Update this exploration’s status in the plan**: set **Exploration** to this file (optional housekeeping).

---

### Recommendation

**Ready to plan** — the spec is **approved**, design and plan are aligned, and **Linear’s earlier “needs clarification” items** (auth pattern, KB tables, embedding provider) are **resolved in the repo spec**. Only **optional** product questions remain (Apply behavior, file limits, roles).

---

### Suggested Next Steps

1. **Proceed to implementation** on branch **`SEI-42-sei-ai-assessment-builder`**, starting with data model and dashboard as the plan describes.
2. **Answer optional questions** when convenient (or default to sensible v1: e.g. clear dirty flag on Apply, reasonable upload cap, all authenticated internal users).
3. **Tag knowledge base documents** for **assessment-builder** before internal demo so RAG quality matches expectations.
