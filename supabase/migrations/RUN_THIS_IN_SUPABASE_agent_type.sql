-- =============================================================================
-- SEI-36: Agent Type — run this in Supabase SQL Editor if Agent Type is missing
-- =============================================================================
-- If Prompt Control or Knowledge Base don't show the Agent Type dropdown/filter,
-- the agents table is missing the agent_type column. Run this entire script
-- in your Supabase project: SQL Editor → New query → paste → Run.
-- =============================================================================

-- 1. Create enum type (skipped if it already exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agent_type') THEN
    CREATE TYPE agent_type AS ENUM ('Guide', 'Analyst', 'Builder', 'Orchestrator');
  END IF;
END
$$;

-- 2. Add column (skipped if it already exists)
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS agent_type agent_type NOT NULL DEFAULT 'Guide';

COMMENT ON COLUMN agents.agent_type IS 'Agent classification for Prompt Control and KB filtering (SEI-36).';

-- 3. Backfill existing agents (adjust names to match your agents table)
UPDATE agents
SET agent_type = 'Guide'
WHERE name IN ('SPIN Sales Coach', 'SPIN Sales Agent', 'AI Assessment Coach');

-- 4. Allow null for new agents (so "Create new agent" leaves type unset until assigned)
ALTER TABLE agents ALTER COLUMN agent_type DROP NOT NULL;
ALTER TABLE agents ALTER COLUMN agent_type SET DEFAULT NULL;

-- Done. Restart your dev server and refresh the admin page.
-- You should see: Agent Type in Prompt Control and KB filters; "Create new agent";
-- new agents appear as Inactive until you assign a type and toggle to Active.
