---
linear: https://linear.app/sei-interview-app/issue/SEI-36/agent-type-picklist-schema-prompt-control-kb-filter
ticket: SEI-36
---

# Feature Specification: Agent Type Picklist (Schema, Prompt Control, KB Filter)

**Feature Branch**: `SEI-36-agent-type-picklist`
**Created**: 2026-03-09
**Status**: Draft
**Linear Ticket**: [SEI-36](https://linear.app/sei-interview-app/issue/SEI-36/agent-type-picklist-schema-prompt-control-kb-filter)
**Input**: Agent Type picklist — schema, Prompt Control, KB filter. Add agent_type enum and column; Prompt Control UI dropdown (required); KB dashboard filter by agent type; one-time SQL update for existing agents.

## User Scenarios & Testing (mandatory)

### User Story 1 - Admin sets agent type in Prompt Control (Priority: P1)
An admin opens the Prompt Control tab, selects an agent, and sets the Agent Type (Guide, Analyst, Builder, Orchestrator). The field is required; save is blocked until a value is selected. On save, the selected type is persisted to the agents table and reflected when the agent is reloaded.
**Why this priority**: Core path for classifying agents; required for KB filtering by type.
**Independent Test**: Open Admin → Prompt Control, select an agent, choose an Agent Type, save; reload the page and confirm the same type is selected.
**Acceptance Scenarios**:
1. **Given** an agent is selected in Prompt Control, **When** the admin selects "Analyst" in the Agent Type dropdown and clicks Save, **Then** the agent record is updated with `agent_type = 'Analyst'` and a success message is shown.
2. **Given** an agent is selected and no Agent Type has been chosen, **When** the admin clicks Save, **Then** the form does not submit and an error or validation message indicates Agent Type is required.
3. **Given** an agent with `agent_type = 'Builder'` is selected, **When** the Prompt Control tab loads, **Then** the Agent Type dropdown shows "Builder" pre-selected.

### User Story 2 - Admin filters Knowledge Base by agent type (Priority: P2)
An admin opens the Knowledge Base tab and uses the Agent Type filter (All, Guide, Analyst, Builder, Orchestrator). When a specific type is selected, the documents table shows (1) documents assigned to at least one agent of that type and (2) documents assigned to all agents. Documents assigned to "all" are always included in Agent Type filter results.
**Why this priority**: Enables admins to focus on KB content for a given agent type without changing existing Category/Agent/Status filters.
**Independent Test**: Set one document to "Agent A" (type Guide), one to "Agent B" (type Analyst), and one to "All agents". Filter by Guide → first and "all" documents appear; filter by Analyst → second and "all" documents appear; All → all three.
**Acceptance Scenarios**:
1. **Given** Agent Type filter is "All", **When** the KB tab loads or the filter is set to All, **Then** all documents are shown (no agent-type filter applied).
2. **Given** Agent Type filter is "Guide", **When** the documents list is fetched, **Then** documents returned are those whose assigned agents include at least one agent with `agent_type = 'Guide'` OR whose assigned agents include `'all'`.
3. **Given** a document is assigned to "all" agents, **When** the admin filters by any specific Agent Type, **Then** that document is always included in the results.
4. **Given** a document is assigned to agents of multiple types, **When** the admin filters by any one of those types, **Then** the document appears in the filtered list.

### User Story 3 - Existing agents get default agent type (Priority: P2)
After the schema migration, existing agents (e.g. SPIN Sales Coach, AI Assessment Coach) are updated in a one-time migration so they have a valid `agent_type` (e.g. Guide). New agents default to 'Guide' at the database level.
**Why this priority**: Ensures no null or invalid state; Prompt Control and KB filter work for existing data.
**Independent Test**: Run the one-time SQL update; query agents table and confirm named agents have `agent_type = 'Guide'`.
**Acceptance Scenarios**:
1. **Given** the agents table has rows before the enum/column migration, **When** the one-time update runs, **Then** agents matching the specified names have `agent_type = 'Guide'`.
2. **Given** the schema has a default of 'Guide' for new rows, **When** a new agent is inserted (e.g. by a future feature), **Then** `agent_type` is set to 'Guide' if not provided.

### Edge Cases
- **Validation**: Saving in Prompt Control with Agent Type cleared or invalid value — form MUST prevent save and show validation (required field).
- **KB filter + other filters**: Agent Type filter MUST combine correctly with existing Category, Agent, and Status filters (AND semantics).
- **Documents assigned to "all" agents**: When filtering by a specific Agent Type, documents with `agents` containing `'all'` MUST always be included. Results = documents assigned to at least one agent of that type OR documents assigned to all agents.
- **Empty result**: When Agent Type is set to a type that has no documents assigned, the table shows empty list (no error).
- **Prisma vs Supabase**: App uses Prisma for listing agents and for documents; Supabase client in `lib/agents.ts` for update and for getActiveSpinCoach*. Schema and both code paths must include `agent_type` so list/update and any Supabase reads stay in sync.

## Requirements (mandatory)

### Functional Requirements
- **FR-001**: The database MUST have an enum `agent_type` with values `'Guide'`, `'Analyst'`, `'Builder'`, `'Orchestrator'` and the `agents` table MUST have a column `agent_type` of that type, NOT NULL, default `'Guide'`.
- **FR-002**: In the Prompt Control tab, an "Agent Type" dropdown MUST appear directly below the Agent picklist and above the system prompt textarea (or above the Agent Status section, as the next field after Agent selector). Options: Guide, Analyst, Builder, Orchestrator. The field MUST be required: the form MUST NOT allow saving without a value selected.
- **FR-003**: On save in Prompt Control, the selected Agent Type MUST be written to the `agent_type` column of the selected agent. On load, the current `agent_type` for the selected agent MUST be read and pre-selected in the dropdown.
- **FR-004**: The Knowledge Base tab MUST have an "Agent Type" filter dropdown alongside Category, Agent, and Status. Options: All, Guide, Analyst, Builder, Orchestrator. When a type other than All is selected, the documents list MUST show documents that are (a) assigned to at least one agent of that type, OR (b) assigned to all agents (`agents` contains `'all'`). Documents assigned to all must always be included in Agent Type filter results.
- **FR-005**: A one-time SQL update MUST set `agent_type = 'Guide'` for existing agents where `name` matches the specified list (e.g. 'SPIN Sales Coach', 'AI Assessment Coach'). Agent names in the script MUST match exactly the names in the `agents` table.
- **FR-006**: Prisma schema MUST include `agentType` (or equivalent) on the `Agent` model so the app can read/write the column. API routes that return or update agents MUST include `agent_type` in responses and accept it in PATCH body where applicable.

### Key Entities
- **agents (table)**: Add column `agent_type` (enum: Guide, Analyst, Builder, Orchestrator), NOT NULL, default 'Guide'. Existing columns unchanged.
- **Agent (Prisma model)**: Add field mapping to `agent_type` for use in GET/PATCH and in document filtering.

### Non-Functional Requirements
- **NFR-001**: KB document filter by agent type MUST perform a single query (or minimal round-trips); prefer joining via Prisma or a single raw query rather than N+1 (e.g. fetch agent IDs for type then filter documents by `agents hasSome` of those IDs).

## Success Criteria (mandatory)

### Measurable Outcomes
- **SC-001**: All P1 and P2 acceptance scenarios pass (manual or automated test).
- **SC-002**: Prompt Control save with Agent Type required: saving without a selection is rejected; with a selection, `agent_type` is persisted and reloaded correctly.
- **SC-003**: KB Agent Type filter returns documents assigned to at least one agent of the selected type plus documents assigned to all agents; "All" returns unfiltered-by-type list.
- **SC-004**: One-time SQL update runs without error and existing named agents have `agent_type = 'Guide'`.
- **SC-005**: New code follows project conventions (TypeScript, Next.js, `lib/agents` and `app/api` for agent/documents), and lint/build pass.

---

## Implementation Notes (reference)

### Part 1: Supabase schema (run in Supabase SQL editor)
```sql
create type agent_type as enum ('Guide', 'Analyst', 'Builder', 'Orchestrator');

alter table agents
  add column agent_type agent_type not null default 'Guide';
```

### Part 2: Prompt Control UI
- Add Agent Type dropdown below the Agent selector, above the system prompt textarea.
- Label: "Agent Type"; options: Guide, Analyst, Builder, Orchestrator.
- Required: block save if no value; show validation message.
- On save: send `agent_type` in PATCH body to `/api/admin/agents/[id]`.
- On load: include `agent_type` in GET response and pre-select in dropdown.
- **Files**: `components/admin/PromptControlTab.tsx`, `app/api/admin/agents/route.ts` (GET response), `app/api/admin/agents/[id]/route.ts` (PATCH body), `lib/agents.ts` (Agent type, updateAgent payload).

### Part 3: KB dashboard filter
- Add "Agent Type" dropdown in the filters row (Category, Agent, Status). Label: "Agent Type"; options: All, Guide, Analyst, Builder, Orchestrator.
- When a type is selected: filter documents to those where (1) `doc.agents` contains `'all'`, OR (2) at least one of `doc.agents` is an agent_id of an agent with `agent_type = selected type`. Implementation: e.g. fetch agent IDs for that type via Prisma, then `KnowledgeBaseDocument.findMany({ where: { OR: [{ agents: { has: 'all' } }, { agents: { hasSome: agentIds } }] } })`; or equivalent so "assigned to all" docs are always included.
- **Files**: `components/admin/KnowledgeBaseTab.tsx` (state, dropdown, pass param), `app/api/admin/documents/route.ts` (read `agentType` or `agent_type` query param, apply filter).

### Part 4: One-time SQL update
```sql
update agents set agent_type = 'Guide'
where name in ('SPIN Sales Coach', 'AI Assessment Coach');
```
- Adjust names to match exactly what exists in the `agents` table (verify before running).

### Prisma schema
- Add to `Agent` model: `agentType String @default("Guide") @map("agent_type")` (or use a Prisma enum if preferred). Run `prisma db pull` or add the field and run migration so Prisma stays in sync with the Supabase-applied migration.
