-- SEI-36: Add agent_type enum and column to agents table.
-- Run in Supabase SQL editor or via migration. Enables classifying agents as Guide, Analyst, Builder, Orchestrator.

CREATE TYPE agent_type AS ENUM ('Guide', 'Analyst', 'Builder', 'Orchestrator');

ALTER TABLE agents
  ADD COLUMN agent_type agent_type NOT NULL DEFAULT 'Guide';

COMMENT ON COLUMN agents.agent_type IS 'Agent classification for Prompt Control and KB filtering (SEI-36).';
