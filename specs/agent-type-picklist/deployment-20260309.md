# Deployment Record: Agent Type Picklist (SEI-36)

**Feature**: Agent Type picklist — schema, Prompt Control, KB filter  
**Deployed**: 2026-03-09  
**Deployed by**: (deploy command / founder)  
**Git Commit**: eed0370  
**Linear Ticket**: SEI-36  
**Spec**: [specs/features/SEI-36-agent-type-picklist.md](../features/SEI-36-agent-type-picklist.md)  
**Review**: [specs/agent-type-picklist/review-20260309.md](review-20260309.md)

---

## What Was Deployed

Admins can now:

- **Classify agents by type** — In Prompt Control, each agent has an "Agent Type" dropdown (Guide, Analyst, Builder, Orchestrator). The field is required before saving or setting an agent to Active. New agents (added by developers) can have no type until the admin assigns one.
- **Filter documents by agent type** — On the Knowledge Base tab, an "Agent Type" filter shows only documents assigned to agents of that type, plus documents assigned to "all" agents. Other filters (Category, Agent, Status) still work together with it.

No change for end users of the coach; this is admin configuration only.

---

## Technical Changes

- **Files modified**: 10+ (Prisma schema, lib/agents, admin agents API, PATCH agent API, documents API, PromptControlTab, KnowledgeBaseTab, migrations, docs).
- **Database changes**: Yes. New PostgreSQL enum `agent_type` and column `agents.agent_type` (nullable after optional migration). Migrations: `20260309140000_agent_type_enum_and_column.sql`, `20260309140001_backfill_agent_type_guide.sql`, `20260309150000_agent_type_nullable_for_new_agents.sql`. Run in Supabase SQL Editor (or via migration runner) **before or at deploy**.
- **New dependencies**: No.
- **Configuration changes**: None (no new env vars).

---

## Rollback Procedure

If you need to undo this deployment:

1. **Revert the code** — Check out or deploy the previous commit on `main`. The app will run; the `agent_type` column will simply be unused. No data loss.
2. **Database** — The column can stay. If you must remove it: create a follow-up migration that drops the column and the enum (only if nothing else references them). Not required for a simple rollback.

---

## Monitoring

**What to watch**

- Admin: Prompt Control and Knowledge Base tabs load without errors.
- No 500s on `GET /api/admin/agents` or `GET /api/admin/documents` (if you see "agent_type column" in error message, migrations were not run).

**Where to check**

- Vercel logs / dashboard for API errors.
- Manual check: open `/admin`, switch to Prompt Control and Knowledge Base; select an agent, set Agent Type, save; filter documents by Agent Type.

---

## Success Metrics (from plan)

- **Correctness**: All P1/P2 acceptance scenarios pass (manual verification).
- **Stability**: No regressions in Prompt Control or KB list; existing filters and save flows work.
- **Adoption**: Admins can classify agents and narrow KB view by type without confusion.

**Target**: Feature works as specified; no user-reported issues.  
**When to check**: After deploy; again after 24 hours if you monitor logs.
