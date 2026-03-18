## Implementation Plan: SEI Geopolitical Intelligence — Live Brief Generation API (MVP)

**Branch**: `SEI-41-geopolitical-live-brief-generation-api-mvp`  
**Spec**: [specs/features/SEI-41-geopolitical-live-brief-generation-api-mvp.md](../features/SEI-41-geopolitical-live-brief-generation-api-mvp.md)  
**Exploration**: [specs/explorations/geopolitical-live-brief-generation-api-mvp-exploration.md](../explorations/geopolitical-live-brief-generation-api-mvp-exploration.md) — Ready to plan.  
**Design**: Not applicable for this ticket (backend-only MVP; frontend prototype exists separately). No `specs/designs/*geopolitical*` artifact.  
**Estimated Timeline**: **4–6 engineering days** — three API surfaces plus shared research storage, two external AI providers, strict validation, TTL, and end-to-end script. First working slice (init + store) can be demoed in ~1–2 days.

---

### What We're Building (Summary)

We are building the **engine behind the geopolitical briefing room**: when someone finishes onboarding and later opens their brief, the app needs **fresh web-grounded research** (company + regions + their own words) turned into a **single structured JSON brief**. Users never see this layer directly in MVP; it powers the split-pane brief later. The deliverable is **three working HTTP endpoints** plus a **one-command test script** so we can prove the pipeline before any UI wiring.

---

### Technical Approach

We will ship this as **four coordinated pieces**:

1. **Shared “research locker” (half day)** — A small in-memory store keyed by `researchId` with `createdAt`, onboarding snapshot, and three text blobs (company intel, regional signals, enrichment). Entries expire after **30 minutes**; reads after expiry return **410 Gone** so the client re-runs init instead of mixing old news with a new session. Periodic cleanup keeps memory from growing forever on a busy dev server.

2. **Stage 1: Research init (~1–1.5 days)** — `POST /api/research/init` validates the body (including **regions only from the eight allowed chips**), generates an id, runs **two Perplexity calls in parallel** (company 90-day lens + regional 30-day lens), stores results (empty string if a call fails), logs failures with structured logs, and returns `{ researchId }` so the user can always enter the room.

3. **Stage 2: Enrichment (~0.5–1 day)** — `POST /api/research/enrich` looks up research ( **404** if id never existed, **410** if expired), then one more Perplexity call combining company, industry, regions, and the user’s first free-text answer. On failure: log, store empty enrichment, still **200** so chat continues.

4. **Stage 3: Brief synthesis (~1.5–2 days)** — `POST /api/brief/generate` loads research (**404** / **410** as above), validates full session payload + regions enum again, calls **Claude** with Seven Pillars framing and all context blocks. **FR-019**: if any research block is empty, prompt must require **reduced confidence** (hedged copy) and **no fabrication** of company- or region-specific detail. Then **parse JSON**, validate shape. If parse fails: **one retry** with “return only JSON.” If still bad: **500** with raw response in body for debugging plus **console.error** with full raw text. Success returns the contract JSON.

5. **Developer proof (~0.5 day)** — `scripts/test-brief-pipeline.ts` hits local base URL, runs IFCO scenario from the spec, pretty-prints the brief, then runs a **small assertion block** (not a full schema validator): probabilities sum to **100**; exactly **four** scenarios with the expected **types** present (one baseline, two alternates, one contrarian — enforce via fixed `tag` values in the Claude contract, e.g. `baseline`, `alternate`, `contrarian`, with two scenarios tagged `alternate`); every scenario’s `implications` array has **at least two** items. Print **PASS** or **FAIL** with the **specific failing rule** so definition-of-done is mechanical. Exit **non-zero** on FAIL.

6. **Thin AI boundaries (from day one)** — Perplexity and Claude MUST live behind **small, named functions** in `lib/` (e.g. `fetchCompanyIntel(...)`, `fetchRegionalSignals(...)`, `fetchEnrichment(...)`, `synthesizeBrief(...)` — exact names flexible) so routes stay orchestration-only. Tests mock these modules; **never** embed raw API calls inside route handlers (hard to test and painful to swap providers).

This order lets us **validate Perplexity + storage early**, then **layer Claude** once context assembly is stable.

---

### Constitution Check

- **Spec-driven**: Implementation follows [SEI-41 spec](../features/SEI-41-geopolitical-live-brief-generation-api-mvp.md); no UI scope in this ticket.  
- **Approved stack**: Next.js App Router API routes (`app/api/.../route.ts`), TypeScript, shared logic in `lib/`, Anthropic for Claude (already in project). Perplexity is new HTTP integration only.  
- **TDD**: Write tests first for **pure functions** (region enum validation, brief schema validation, TTL/expiry helpers, JSON strip/retry decision). **Perplexity and Claude calls stay behind thin `lib/` functions** so Jest can mock them; route handlers only wire HTTP → store → those functions. CI never depends on live AI calls.  
- **Directory contract**: Routes in `app/api/research/init`, `app/api/research/enrich`, `app/api/brief/generate`; helpers e.g. `lib/geopoliticalBrief/` or `lib/briefPipeline/` (camelCase modules).  
- **No RAG/agent drift**: This path does not change SPIN coach, Prompt Control, or KB retrieval.  
- **Exception**: Spec asks env validation “on startup.” Next.js has no single long-lived process hook like a classic server; we satisfy the **intent** by validating when the brief/research modules first load (or on first request) and failing fast. **Error text MUST name the missing key by exact env name**, e.g. `Missing required environment variable: PERPLEXITY_API_KEY` (not a generic “unauthorized” or “configuration error”) so a pre-demo debugging session is instant.  
- **New agents**: **None** in this MVP — no ElevenLabs or `agents` table work.

---

### Files That Will Be Created/Modified

**User-facing changes**  
- None in MVP (APIs only). Future frontend will call these endpoints.

**Behind-the-scenes**  
- `app/api/research/init/route.ts` — Onboarding submit → parallel live research → `researchId`.  
- `app/api/research/enrich/route.ts` — First chat answer → enrichment append.  
- `app/api/brief/generate/route.ts` — Full session → Claude → structured brief.  
- `lib/...` — Region allowlist, research store + TTL + cleanup, **thin Perplexity functions** (company intel, regional signals, enrichment), **thin Claude synthesis function**, brief prompt assembly, JSON parse + single retry, schema validation (plain TypeScript, no new validator lib per spec).  
- `instrumentation.ts` or shared env gate (if adopted) — Optional central place to assert keys with messages like `Missing required environment variable: ANTHROPIC_API_KEY`.  
- `DEPLOYMENT.md` or `.env.example` — Document new env vars for Vercel/local.

**Tests**  
- `__tests__/...` (or colocated) — Region validation, expiry (410 vs 404), brief shape validation, probability sum, scenario count.  
- `scripts/test-brief-pipeline.ts` — End-to-end manual/QA runner against local dev server.

---

### Dependencies

**Must be done first**  
- Linear ticket SEI-41 approved for implementation.  
- `PERPLEXITY_API_KEY` and `ANTHROPIC_API_KEY` available in `.env.local` (and later Vercel).

**Can build in parallel**  
- Perplexity prompt text refinement vs. Claude synthesis prompt (different owners possible).  
- Unit tests for validation vs. route wiring.

**Blocks future work**  
- Geopolitical **frontend** (onboarding → chat → brief pane) depends on these APIs being stable.  
- **Supabase persistence** for research is a follow-on once MVP quality is proven.

---

### Test Strategy

**What we’ll test**  
- **Happy path**: Init → enrich → generate produces valid JSON matching the schema and grounded copy (human check via script).  
- **Error cases**: Bad regions → 400; unknown `researchId` → 404; expired → 410; Claude garbage → retry then 500 with raw payload.  
- **Edge cases**: One Perplexity arm down in init; enrichment down; empty research blocks still produce a coherent brief (no contradiction with user facts).

**How we’ll know it works**  
- `npx ts-node scripts/test-brief-pipeline.ts` completes with exit 0, prints **PASS** from the post-print assertion block, and still benefits from a quick human read for grounding.  
- Automated tests pass for validation and TTL behavior (with AI modules mocked).

---

### Risks & Mitigations

| Risk | Impact on business | How we’ll handle it |
|------|--------------------|---------------------|
| Perplexity slow or rate-limited | User waits at init or enrich | Parallel init calls; timeouts + empty string fallback for init/enrich; structured logs to tune timeouts later. |
| In-memory store lost on serverless cold start | Brief generation fails mid-flow | Document MVP limitation; 410/re-init path; follow-up: Supabase. |
| Claude returns prose or broken JSON | No brief in UI | One automatic retry; then 500 with raw response for fast iteration. |
| Model invents events not in research | Wrong or misleading brief | Prompt requires grounding in provided blocks; QA via script; tighten prompts in Phase 2. |

---

### Implementation Phases

**Phase 1: Core research init** (Days 1–2)  
- Region enum + request validation, in-memory store + TTL + 410/404 behavior, **thin Perplexity helpers** + `POST /api/research/init` (orchestration only in route).  
- **Deliverable**: Curl/script can obtain `researchId`; logs show graceful partial failure.

**Phase 2: Enrichment + brief shell** (Days 2–3)  
- `POST /api/research/enrich` using enrichment helper; `POST /api/brief/generate` calling **`synthesizeBrief`-style** helper only; basic JSON parse + retry.  
- **Deliverable**: Manual generate call returns JSON (may need prompt tuning).

**Phase 3: Schema hardening + script + tests** (Days 3–5)  
- Server-side shape checks; **`test-brief-pipeline.ts`** with mechanical PASS/FAIL block; Jest mocks thin AI layer.  
- **Deliverable**: Spec definition of done satisfied; CI-safe unit tests.

**Phase 4: Docs + deploy prep** (Day 5–6 if needed)  
- Env docs, Vercel secrets, short runbook for running the script.  
- **Deliverable**: Another developer can run the pipeline in under 15 minutes.

---

### Deployment Plan

**Feature flag**: **No** — endpoints are new URLs; nothing existing breaks. Hide from product UI until frontend ships.  
**Database changes**: **No** for MVP (in-memory only).  
**Rollback strategy**: Remove or disable routes / revert PR; no user data to migrate.  
**Agent setup**: **N/A** — no new ElevenLabs or `agents` row for this ticket.

---

### Success Metrics

- **Pipeline script green**: One command produces valid IFCO brief JSON without hand-editing.  
- **Error clarity**: 400/404/410/500 responses are predictable for frontend to handle later.  
- **Grounding**: Spot checks show scenarios tied to Perplexity-sourced themes, not generic platitudes.

---

### Timeline Breakdown

| Phase | Duration | Why |
|-------|----------|-----|
| Phase 1 | 1–2 days | New provider + storage + validation |
| Phase 2 | 1–2 days | Third endpoint + Claude integration |
| Phase 3 | 1–2 days | Schema edge cases + tests + script hardening |
| Phase 4 | 0–1 day | Docs and handoff |

**Total**: **4–6 days**  
**Confidence**: **Medium** — External APIs and prompt quality dominate; first slice de-risks Perplexity early.

---

### What Could Make This Take Longer

- **Perplexity API shape or auth differences** from docs: +0.5–1 day.  
- **Claude repeatedly failing schema** after retry: +1–2 days prompt and validation tuning.  
- **Vercel serverless** + long-running init: may need timeout tuning or async pattern later (+1 day if product requires sub-second init response).

---

### What’s NOT Included

- Streaming responses, caching, authentication, Supabase writes, frontend onboarding/chat/brief UI, `system_events` logging (explicitly deferred with TODO comments), strict JSON schema library (follow-up spec).

**Frontend handoff (separate spec, do not skip in writing):** On “Enter briefing room,” **call `POST /api/research/init` immediately** and **do not block** showing the chat on that request — **store `researchId` when it returns** so Perplexity can finish while the user answers questions (spec **NC-006**).

---

### Next Steps

1. Review this plan and the SEI-41 spec together.  
2. Optionally run `/explore` if you want a written risk doc before coding.  
3. When ready: branch `SEI-41-geopolitical-live-brief-generation-api-mvp` and implement Phase 1 with tests first for validation + store TTL.  
4. Run `scripts/test-brief-pipeline.ts` before calling the MVP “done.”
