# Implementation Plan: Agent Type Picklist (Schema, Prompt Control, KB Filter)

**Branch**: `SEI-36-agent-type-picklist`
**Spec**: [specs/features/SEI-36-agent-type-picklist.md](../features/SEI-36-agent-type-picklist.md)
**Exploration**: Not yet run
**Design**: Not yet run
**Estimated Timeline**: 1–2 days — Small schema change, two admin UI additions, one-time data update.

---

## What We're Building (Summary)

Admins will be able to classify each agent as a **Guide**, **Analyst**, **Builder**, or **Orchestrator**. That classification is stored in the database, shown and editable in the Prompt Control tab (required field), and used on the Knowledge Base tab to filter documents: when an admin picks a type, they see documents assigned to agents of that type plus documents assigned to "all" agents. Existing agents are set to "Guide" once via a one-time SQL script.

---

## Prerequisites Check

- **Spec exists**: Yes — SEI-36-agent-type-picklist.md
- **Exploration**: No exploration doc found. The spec is narrow (schema + two dropdowns + backfill); exploration is optional here.
- **Design**: No design doc found. The feature reuses existing admin patterns (dropdowns like Category/Agent/Status); a separate design doc is optional.

---

## Technical Approach

We'll build this in four ordered pieces:

1. **Database and app data layer (Part 1 + Prisma)** — Add the `agent_type` enum and column in Supabase, then add the field to the Prisma schema so the app can read and write it. Run the one-time SQL to set existing agents to Guide. *(Roughly half a day.)*

2. **Prompt Control: Agent Type dropdown (Part 2)** — In the admin Prompt Control tab, add a required "Agent Type" dropdown directly below the Agent picklist. On load, show the current agent’s type; on save, send the selected type to the API and persist it. Block save until a type is selected and show a validation message if the user tries to save without one. *(Roughly half a day.)*

3. **Knowledge Base: Agent Type filter (Part 3)** — On the Knowledge Base tab, add an "Agent Type" filter (All, Guide, Analyst, Builder, Orchestrator) next to Category, Agent, and Status. When a specific type is chosen, the documents list shows documents assigned to at least one agent of that type **or** assigned to all agents. *(Roughly half a day.)*

4. **One-time backfill and verification (Part 4)** — Run the one-time SQL update for existing agents (names verified against the live `agents` table). Confirm in the UI that Prompt Control and KB filter behave as specified. *(Included in the above; no extra day.)*

Schema and Prisma must be done first so the UI and APIs have a place to read/write `agent_type`. Prompt Control and KB filter can be built in either order after that.

---

## Constitution Check

- **Follows Spec-Driven Development**: Implementation is scoped to the approved spec; no code without spec coverage.
- **Uses approved tech stack**: TypeScript, Next.js App Router, Prisma, Supabase (PostgreSQL), existing admin components and API routes.
- **Directory contract**: Changes stay in `app/api/`, `components/admin/`, `lib/`, `prisma/`, and `supabase/migrations/`.
- **RAG & Knowledge Base**: KB filter only changes which documents are shown in the list; retrieval and chunk behavior are unchanged.
- **Exception needed**: None.

---

## Files That Will Be Created/Modified

**Database & schema**

- **Supabase**: New migration file — create `agent_type` enum and add `agent_type` column to `agents` (NOT NULL, default `'Guide'`).
- **Supabase**: New migration or one-time script — `UPDATE agents SET agent_type = 'Guide' WHERE name IN (...)`; names verified against current `agents` table.
- **prisma/schema.prisma**: Add `agentType` (or equivalent) to `Agent` model, mapped to `agent_type`.

**User-facing (admin)**

- **Prompt Control tab** (`components/admin/PromptControlTab.tsx`): Add "Agent Type" dropdown below Agent picklist; required; load from selected agent, save with form; validation message if save attempted without a type.
- **Knowledge Base tab** (`components/admin/KnowledgeBaseTab.tsx`): Add "Agent Type" filter dropdown (All, Guide, Analyst, Builder, Orchestrator); pass selection as query param when fetching documents.

**Behind-the-scenes**

- **GET /api/admin/agents** (`app/api/admin/agents/route.ts`): Include `agent_type` in each agent in the response.
- **PATCH /api/admin/agents/[id]** (`app/api/admin/agents/[id]/route.ts`): Accept `agent_type` in body; validate enum; pass to update.
- **lib/agents.ts**: Extend `Agent` type and `AgentUpdatePayload` with `agent_type`; include in Supabase select/update where agents are read or updated.
- **GET /api/admin/documents** (`app/api/admin/documents/route.ts`): Accept `agentType` (or `agent_type`) query param; when set, filter documents to those assigned to at least one agent of that type **or** assigned to all (e.g. `OR: [{ agents: { has: 'all' } }, { agents: { hasSome: agentIdsOfType } }]`), combined with existing category/agent/status filters.

**Tests**

- **Unit/API tests** (if present): Cover agents API returning and accepting `agent_type`; documents API filtering by agent type (including “all” docs). Location per project: `__tests__/` or colocated.

---

## Dependencies

**Must be done first**

- Supabase migration (enum + column) and Prisma schema update. Everything else depends on the app being able to read/write `agent_type`.

**Can be done in parallel after that**

- Prompt Control UI and KB filter are independent of each other.

**Blocks future work**

- None. This unblocks future features that need to treat agents by type (e.g. routing, reporting).

---

## Test Strategy

**What we’ll test**

- **Happy path**: In Prompt Control, select an agent, set Agent Type, save; reload and confirm type is still selected. In KB, pick an Agent Type and confirm the list shows only documents for that type plus “assigned to all” documents.
- **Validation**: In Prompt Control, try to save without selecting Agent Type; form should not submit and should show a clear validation message.
- **Filter combinations**: In KB, combine Agent Type with Category, Agent, and Status; results should match (AND across filters; within Agent Type: type match OR “all”).
- **Backfill**: After one-time SQL, existing named agents have `agent_type = 'Guide'`.

**How we’ll know it works**

- Admin can set and persist Agent Type in Prompt Control and see it after reload.
- Admin can filter KB by Agent Type and see the correct set of documents (type + “all”), with “All” showing everything.

---

## Risks & Mitigations

| Risk | Impact on business | How we’ll handle it |
|------|--------------------|----------------------|
| Prisma and Supabase out of sync | App errors or wrong data | Add column via Supabase migration first, then add field to Prisma and (if needed) run `prisma db pull` or generate to stay in sync. |
| One-time update uses wrong names | Some agents not set to Guide | Verify exact `name` values in `agents` table before running the UPDATE; document in migration or runbook. |
| KB filter logic wrong for “all” | Admins miss or see wrong documents | Implement as OR: `agents` has `'all'` OR `agents` hasSome agent IDs of selected type; add a quick manual check for “assigned to all” doc. |

---

## Implementation Phases

**Phase 1: Schema and data layer** (Day 1 — morning)

- Add Supabase migration: `agent_type` enum and column on `agents`.
- Update Prisma `Agent` model with `agentType` (mapped to `agent_type`).
- Add one-time migration/script to set existing agents to `'Guide'` (names verified).
- Ensure `lib/agents.ts` and GET/PATCH agents API read and write `agent_type`.

**Deliverable**: Agents table has `agent_type`; app can read/write it via Prisma and (where used) Supabase client.

**Phase 2: Prompt Control UI** (Day 1 — afternoon)

- Add Agent Type dropdown to Prompt Control tab (below Agent picklist, required).
- Load current agent’s `agent_type` and pre-select; on save, send `agent_type` in PATCH body and show success/error.
- Block save when no type selected; show validation message.

**Deliverable**: Admin can set and save Agent Type in Prompt Control; validation works.

**Phase 3: KB filter and polish** (Day 2)

- Add Agent Type filter to Knowledge Base tab; pass selection to documents API.
- In documents API, when Agent Type is set: filter by (assigned to that type OR assigned to all); keep existing Category/Agent/Status filters.
- Manual pass: confirm “assigned to all” docs appear for every Agent Type selection; run lint/build.

**Deliverable**: KB list filterable by Agent Type with correct behavior; feature complete and shippable.

---

## Deployment Plan

- **Feature flag**: No. Change is admin-only and low risk.
- **Database changes**: Yes. New enum and column on `agents`; run Supabase migration before or during deploy. Default value avoids backfill for new rows; one-time UPDATE for existing rows.
- **Rollback**: Revert code deploy; column can stay (no dependency from other systems on it). If needed, a follow-up migration could drop the column (only if nothing else uses it).

---

## Success Metrics

- **Correctness**: All P1/P2 acceptance scenarios in the spec pass (manual or automated).
- **Stability**: No regressions in Prompt Control or KB list; existing filters and save flows still work.
- **Adoption**: Admins can classify agents and narrow KB view by type without confusion.

---

## Timeline Breakdown

| Phase | Duration | Why |
|-------|----------|-----|
| Phase 1: Schema and data layer | ~0.5 day | Single migration, Prisma field, small API/lib changes. |
| Phase 2: Prompt Control UI | ~0.5 day | One form field and validation; pattern already exists. |
| Phase 3: KB filter and polish | ~0.5 day | One filter dropdown and one API filter branch; “all” + type logic is a small OR. |

**Total**: ~1.5 days (could stretch to 2 if tests or edge cases take longer).

**Confidence**: High — scope is clear, patterns exist in the codebase, no new infrastructure.

---

## What Could Make This Take Longer

- Discovering that agents are read in more places than `lib/agents.ts` and the admin agents API, requiring extra wiring.
- Needing to backfill or adjust existing Prisma migrations (e.g. drift) before adding the new column.

---

## What’s NOT Included

- Changing how RAG retrieval uses agent type (only list filtering is in scope).
- New agent types beyond Guide, Analyst, Builder, Orchestrator.
- Any change to coach/voice or session flows; this is admin configuration only.

---

## Next Steps

1. Review this plan.
2. Ask any questions (e.g. with /explain).
3. When ready, run **/implement** to start building (branch `SEI-36-agent-type-picklist`, beginning with Phase 1).
