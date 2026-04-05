import type { DraftContent } from '@/lib/assessment-builder-draft-types';
import type { AssessmentChunkHit, KbChunkHit } from '@/lib/assessment-builder-retrieval';

/** Hardcoded system instructions for draft generation (fallback when `agents.prompt` is empty). */
export function buildAssessmentDraftGenerationSystemFallback(): string {
  return `You are an SEI consultant drafting a Discovery document for an AI readiness assessment.

Use the materials below. Do not invent specific quotes, numbers, or named facts that are not supported by the excerpts. If evidence is thin, say so in neutral professional language.

Return valid JSON only, no markdown fences, with five keys. Each value must be HTML fragments (no outer <html> or <body>), using <p>, <ul>/<li>, <strong>, <em> as needed. No markdown.

Keys (exactly):
- "findings": Discovery Findings section body HTML only (no h2 — the UI adds headings).
- "interviews": Stakeholder Interviews section body HTML.
- "hypothesis": Hypothesis Brief section body HTML.
- "stakeholder_map": Stakeholder Map section body HTML.
- "opportunities": Opportunity Shortlist section body HTML.`;
}

export function buildAssessmentDraftGenerationUserContent(params: {
  clientName: string;
  projectBrief: string | null;
  stakeholders: string[];
  assessmentChunks: AssessmentChunkHit[];
  kbChunks: KbChunkHit[];
}): string {
  const context = [
    '## Client',
    params.clientName,
    '',
    '## Stakeholders',
    params.stakeholders.length ? params.stakeholders.join(', ') : '(none listed)',
    '',
    '## Project brief',
    params.projectBrief?.trim() || '(none)',
    '',
    '## Retrieved transcript / upload excerpts (top matches)',
    params.assessmentChunks.length
      ? params.assessmentChunks.map((c, i) => `### Excerpt ${i + 1}\n${c.content}`).join('\n\n')
      : '(no chunks retrieved — ground the draft in methodology only and avoid inventing client facts)',
    '',
    '## Knowledge base (methodology / criteria — scoped to assessment builder)',
    params.kbChunks.length
      ? params.kbChunks
          .map(
            (c, i) =>
              `### KB ${i + 1} [${c.documentCategory}] ${c.documentTitle}\n${c.content}`,
          )
          .join('\n\n')
      : '(no KB chunks — use conservative generic structure)',
  ].join('\n');

  return context;
}

export function buildAssessmentDraftGenerationPrompt(params: {
  clientName: string;
  projectBrief: string | null;
  stakeholders: string[];
  assessmentChunks: AssessmentChunkHit[];
  kbChunks: KbChunkHit[];
}): string {
  return `${buildAssessmentDraftGenerationSystemFallback()}\n\n${buildAssessmentDraftGenerationUserContent(params)}`;
}

/** Hardcoded system instructions for refine (fallback when `agents.prompt` is empty). */
export function buildAssessmentRefineSystemFallback(): string {
  return `Respond with valid JSON only, no markdown fences. Always include "reply" as the first key:
{
  "reply": "1-3 sentences addressing the consultant in plain language (SEI Guide chat bubble).",
  "draft": {
    "findings": "... HTML ...",
    "interviews": "...",
    "hypothesis": "...",
    "stakeholder_map": "...",
    "opportunities": "..."
  },
  "suggestions": {
  }
}

Rules:
- For sections NOT listed as manually edited, you may update HTML in "draft" with improved content based on the user message and sources.
- For manually edited sections, copy the existing HTML from the current draft into "draft" unchanged for those keys, and put your proposed improved HTML only under "suggestions" with the same keys (only when you have a concrete proposal).
- If you have no proposal for a dirty section, omit that key from "suggestions".
- Never remove or alter protected section content inside "draft" — keep it identical to the input for those keys.`;
}

export function buildAssessmentRefineUserContent(params: {
  clientName: string;
  projectBrief: string | null;
  userMessage: string;
  currentDraft: DraftContent;
  /** Section keys the user has manually edited — never replace these in draft; use suggestions only. */
  dirtySections: string[];
  assessmentChunks: AssessmentChunkHit[];
  kbChunks: KbChunkHit[];
}): string {
  const dirty = params.dirtySections.length
    ? params.dirtySections.join(', ')
    : '(none)';

  const draftJson = JSON.stringify(params.currentDraft);

  const rag = [
    '## Retrieved transcript / upload excerpts',
    params.assessmentChunks.length
      ? params.assessmentChunks.map((c, i) => `### Excerpt ${i + 1}\n${c.content}`).join('\n\n')
      : '(none)',
    '',
    '## Knowledge base snippets',
    params.kbChunks.length
      ? params.kbChunks
          .map(
            (c, i) =>
              `### KB ${i + 1} [${c.documentCategory}] ${c.documentTitle}\n${c.content}`,
          )
          .join('\n\n')
      : '(none)',
  ].join('\n');

  return `You are the SEI Guide helping refine an AI Readiness Discovery draft for ${params.clientName}.

Project brief: ${params.projectBrief?.trim() || '(none)'}

Current draft (JSON of HTML fragments per section): ${draftJson}

Sections the consultant has manually edited (protected — do not change these in "draft"; propose alternatives under "suggestions" only): ${dirty}

User message: ${params.userMessage}

${rag}`;
}

export function buildAssessmentRefinePrompt(params: {
  clientName: string;
  projectBrief: string | null;
  userMessage: string;
  currentDraft: DraftContent;
  /** Section keys the user has manually edited — never replace these in draft; use suggestions only. */
  dirtySections: string[];
  assessmentChunks: AssessmentChunkHit[];
  kbChunks: KbChunkHit[];
}): string {
  return `${buildAssessmentRefineUserContent(params)}\n\n${buildAssessmentRefineSystemFallback()}`;
}
