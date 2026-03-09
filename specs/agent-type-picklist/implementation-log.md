# Implementation Log: Agent Type Picklist (SEI-36)

**Branch**: `SEI-36-agent-type-picklist`
**Spec**: [specs/features/SEI-36-agent-type-picklist.md](../features/SEI-36-agent-type-picklist.md)
**Plan**: [specs/agent-type-picklist/plan.md](plan.md)

## Summary

Implemented agent type (Guide, Analyst, Builder, Orchestrator) end-to-end: Supabase schema + Prisma, Prompt Control dropdown (required), and Knowledge Base filter. Documents assigned to "all" agents are always included when filtering by a specific Agent Type.

## Progress

### Phase 1: Schema and data layer ✅
- **Supabase**: Added migration `20260309140000_agent_type_enum_and_column.sql` — `agent_type` enum and column on `agents` (NOT NULL, default 'Guide').
- **Supabase**: Added migration `20260309140001_backfill_agent_type_guide.sql` — one-time UPDATE for existing agents by name (SPIN Sales Coach, AI Assessment Coach).
- **Prisma**: Added `agentType String @default("Guide") @map("agent_type")` to `Agent` model.
- **lib/agents.ts**: Added `AGENT_TYPES`, `AgentType`, `agent_type` on `Agent` and `AgentUpdatePayload`; `listAgents` select and `updateAgent` payload include `agent_type`; validation for allowed values.
- **GET /api/admin/agents**: Response includes `agent_type` for each agent.
- **PATCH /api/admin/agents/[id]**: Accepts `agent_type` in body; validates against `AGENT_TYPES`; passes to `updateAgent`.

### Phase 2: Prompt Control UI ✅
- **PromptControlTab.tsx**: Added Agent Type dropdown directly below Agent picklist; options Guide, Analyst, Builder, Orchestrator; required (blocks save, shows validation message); state `agentType` and `agentTypeError`; load from `selectedAgent.agent_type`, save in PATCH body; pre-select on agent switch.

### Phase 3: KB filter ✅
- **KnowledgeBaseTab.tsx**: Added `agentTypeFilter` state; "Agent Type" filter dropdown (All, Guide, Analyst, Builder, Orchestrator) alongside Category, Agent, Status; pass `agentType` query param in `fetchDocuments`; refetch when `agentTypeFilter` changes.
- **GET /api/admin/documents**: Read `agentType` (or `agent_type`) query param; when set, fetch agent IDs for that type via Prisma, then filter documents with `AND` + `OR: [ { agents: { has: 'all' } }, { agents: { hasSome: agentIdsOfType } } ]`; combined with existing category, status, and agent filters.

## Files Created/Modified

| File | Change |
|------|--------|
| `supabase/migrations/20260309140000_agent_type_enum_and_column.sql` | New — enum and column |
| `supabase/migrations/20260309140001_backfill_agent_type_guide.sql` | New — backfill |
| `prisma/schema.prisma` | Agent model: added `agentType` |
| `lib/agents.ts` | Types, listAgents select, updateAgent payload and validation |
| `app/api/admin/agents/route.ts` | GET response includes `agent_type` |
| `app/api/admin/agents/[id]/route.ts` | PATCH accepts and validates `agent_type` |
| `components/admin/PromptControlTab.tsx` | Agent Type dropdown, required, load/save |
| `components/admin/KnowledgeBaseTab.tsx` | Agent Type filter state and dropdown, fetch param |
| `app/api/admin/documents/route.ts` | `agentType` query param, filter by type + “all” docs |

## Decisions

- **Prisma vs enum**: Used `String` with `@map("agent_type")` for Prisma so we don’t maintain a separate Prisma enum; DB uses PostgreSQL enum.
- **KB filter “all”**: Documents with `agents` containing `'all'` are always included when a specific Agent Type is selected (OR with “assigned to agents of that type”).
- **Query param name**: API uses `agentType` (camelCase); spec also allows `agent_type` for compatibility; both supported in documents GET.

## Tests

No automated tests were added; the project has no existing test suite (`__tests__/` and `*.test.ts` not present). Manual verification: build passes; recommend manual check of Prompt Control save/load and KB filter (including “assigned to all” docs).

## Deployment Note

Run the two Supabase migrations (in order) before or during deploy so the `agent_type` column exists. Prisma schema is already updated; `prisma generate` is part of the build. If the DB is not yet migrated, Prisma may error at runtime when reading/writing agents — run migrations first.

## Timeline

- Phase 1: Schema and API — completed in one commit.
- Phase 2: Prompt Control UI — completed in one commit.
- Phase 3: KB filter — completed in one commit.
- Build: `npm run build` succeeded (network required for font fetch in sandbox).
