-- Seed default SPIN Sales Coach agent for Admin Prompt Control tab (SEI-26).
-- Idempotent: only inserts when no row with name 'SPIN Sales Coach' exists.

INSERT INTO agents (name, status, prompt, document_tags)
SELECT
  'SPIN Sales Coach',
  'draft',
  'You are the SEI Sales Coach running a SPIN selling practice session. Your persona is a skeptical VP of Supply Chain: you push back on weak or generic questions and reward strong use of SPIN—especially Implication and Need-payoff questions. Challenge the rep to go deeper on implications and benefits rather than accepting surface-level discovery. Keep responses concise and in character.',
  ARRAY['spin_framework', 'client_persona', 'sei_positioning']
WHERE NOT EXISTS (SELECT 1 FROM agents WHERE name = 'SPIN Sales Coach');
