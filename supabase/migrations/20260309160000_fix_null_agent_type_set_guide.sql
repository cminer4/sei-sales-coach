-- SEI-36: Fix agents that have null agent_type (e.g. named "SPIN Sales Agent" so backfill didn't match).
-- Ensures the active SPIN agent and any other existing agents are classified as Guide so the app can load.

UPDATE agents
SET agent_type = 'Guide'
WHERE agent_type IS NULL;

-- Also ensure common SPIN agent name variants are explicitly set (idempotent).
UPDATE agents
SET agent_type = 'Guide'
WHERE name IN ('SPIN Sales Coach', 'SPIN Sales Agent', 'AI Assessment Coach')
  AND (agent_type IS NULL OR agent_type <> 'Guide');
