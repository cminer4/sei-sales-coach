-- SEI-36: One-time backfill — set existing agents to agent_type 'Guide'.
-- Adjust the name list to match exactly what exists in the agents table before running.

UPDATE agents
SET agent_type = 'Guide'
WHERE name IN ('SPIN Sales Coach', 'SPIN Sales Agent', 'AI Assessment Coach');
