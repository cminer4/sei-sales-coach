-- Agents table for multi-coach support (e.g. SPIN vs general sales coach).
-- SEI-25: Scaffold; application code does not read/write this table yet.

CREATE TABLE IF NOT EXISTS agents (
  agent_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  prompt        text,
  document_tags text[],
  status        text NOT NULL DEFAULT 'draft' CHECK (status IN ('active', 'draft', 'archived')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE agents IS 'Coach/agent definitions for SPIN and general sales coach; used by future multi-agent flows.';
