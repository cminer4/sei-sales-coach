# Implementation Log: SEI Geopolitical Intelligence — Live Brief Generation API (MVP)

**Ticket**: SEI-41  
**Spec**: `specs/features/SEI-41-geopolitical-live-brief-generation-api-mvp.md`  
**Plan**: `specs/geopolitical-live-brief-generation-api-mvp/plan.md`  
**Date**: 2026-03-18  

## What was built

- Stage 1 research init endpoint: `POST /api/research/init`
- Stage 2 enrichment endpoint: `POST /api/research/enrich`
- Stage 3 brief synthesis endpoint: `POST /api/brief/generate`
- In-memory research store with 30 minute TTL and 410 on expiry
- Thin, mockable Perplexity and Claude functions in `lib/geopoliticalBrief/`
- End-to-end script `scripts/test-brief-pipeline.ts` that prints JSON + PASS/FAIL assertions

## Key decisions captured in code

- **TTL**: 30 minutes. Expired research returns **410 Gone** (forces clean re-init).
- **Regions**: Server-side allowlist enforced; unknown region returns **400**.
- **Error logging (MVP)**: structured `console.error` with `// TODO: wire to system_events` in catch blocks.
- **Claude JSON enforcement**: `JSON.parse` + exactly one retry with explicit instruction.
- **FR-019 trust rule**: synthesis prompt instructs hedged language and no fabrication when any research block is empty.

## Tests added (TDD foundation)

- `__tests__/geopoliticalBrief/regions.test.ts`
- `__tests__/geopoliticalBrief/env.test.ts`
- `__tests__/geopoliticalBrief/researchStore.test.ts`
- `__tests__/geopoliticalBrief/briefValidation.test.ts`
- `__tests__/geopoliticalBrief/jsonRetry.test.ts`

## Files created/modified

### API routes
- `app/api/research/init/route.ts`
- `app/api/research/enrich/route.ts`
- `app/api/brief/generate/route.ts`

### Business logic (thin, mockable)
- `lib/geopoliticalBrief/env.ts`
- `lib/geopoliticalBrief/regions.ts`
- `lib/geopoliticalBrief/researchStore.ts`
- `lib/geopoliticalBrief/store.ts`
- `lib/geopoliticalBrief/perplexity.ts`
- `lib/geopoliticalBrief/anthropicClient.ts`
- `lib/geopoliticalBrief/synthesizeBrief.ts`
- `lib/geopoliticalBrief/prepareForJsonParse.ts`
- `lib/geopoliticalBrief/validateBrief.ts`
- `lib/geopoliticalBrief/jsonRetry.ts`

### Dev validation
- `scripts/test-brief-pipeline.ts`

### Test runner + lint
- `jest.config.ts`
- `jest.setup.ts`
- `eslint.config.mjs`
- `package.json` (added `test` script, updated `lint` to scoped eslint run)

## Verification performed

- `npm test` passing locally.
- `npm run build` passing (requires network access to fetch Google Fonts).
- Dev server started and script run:
  - `npx ts-node scripts/test-brief-pipeline.ts` produced a full JSON brief and printed `PASS`.

