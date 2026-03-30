---
linear: https://linear.app/sei-interview-app/issue/SEI-41/sei-geopolitical-intelligence-live-brief-generation-api-mvp
ticket: SEI-41
---

# Feature Specification: SEI Geopolitical Intelligence - Live Brief Generation API (MVP)

**Feature Branch**: `SEI-41-geopolitical-live-brief-generation-api-mvp`
**Created**: 2026-03-17
**Status**: Draft
**Linear Ticket**: https://linear.app/sei-interview-app/issue/SEI-41/sei-geopolitical-intelligence-live-brief-generation-api-mvp
**Input**: User description: "SEI Geopolitical Intelligence — Live Brief Generation API (MVP)"

## User Scenarios & Testing (mandatory)

### User Story 1 - Initialize live research on onboarding submit (Priority: P1)
When a user clicks "Enter briefing room" (end of onboarding form), the system kicks off the initial live research in the background and immediately returns a `researchId` the client can store in session state.

**Why this priority**: This is the first step in the pipeline. If it is slow or brittle, users cannot get into the briefing flow and the entire product feels broken.

**Independent Test**: Call `POST /api/research/init` directly with sample onboarding inputs and verify the API returns a `researchId` plus the stored research object exists (server-side) for later stages.

**Acceptance Scenarios**:
1. **Given** valid onboarding inputs (name, role, company, industry, selected regions), **When** the client calls `POST /api/research/init`, **Then** the API returns `200` with a `researchId` string and does not require any authentication.
2. **Given** Perplexity call A fails but call B succeeds, **When** `POST /api/research/init` is called, **Then** the API still returns `200` with a `researchId` and the stored `companyIntelligence` value is an empty string while `regionalSignals` is populated.
3. **Given** both Perplexity calls fail, **When** `POST /api/research/init` is called, **Then** the API still returns `200` with a `researchId` and both stored context blocks are empty strings.

### User Story 2 - Enrich research after first free-text chat answer (Priority: P1)
After the user submits their first chat answer (their own description of the business), the system enriches the research with more specific intelligence tied to their stated operations and exposure.

**Why this priority**: The enrichment makes the brief materially more specific and valuable. It is also the last step before synthesis and should not block the rest of the flow if it fails.

**Independent Test**: Call `POST /api/research/init` to get a `researchId`, then call `POST /api/research/enrich` with that `researchId` and a realistic first answer, and confirm enrichment is appended (or safely omitted on error).

**Acceptance Scenarios**:
1. **Given** an existing `researchId` from Stage 1, **When** the client calls `POST /api/research/enrich` with `firstChatAnswer`, **Then** the API returns `200` and the stored research object includes an `enrichment` field containing Perplexity output.
2. **Given** the enrichment Perplexity call fails, **When** `POST /api/research/enrich` is called, **Then** the API returns `200` and the stored `enrichment` field is set to an empty string (or remains empty) and the user flow can continue.
3. **Given** an unknown `researchId`, **When** `POST /api/research/enrich` is called, **Then** the API returns `404` with a structured error object explaining that research state is missing/expired.

### User Story 3 - Generate a structured geopolitical brief on demand (Priority: P1)
When the user opens the brief pane (by clicking the brief chip), the client sends the compiled session payload. The system loads the stored research by `researchId`, calls Claude to synthesize, and returns a valid JSON brief matching the schema.

**Why this priority**: This is the core business output. The product succeeds or fails on whether this brief is accurate, structured, and grounded in real current events.

**Independent Test**: Use a local dev server and run `npx ts-node scripts/test-brief-pipeline.ts` to exercise the full three-stage flow end-to-end and validate the JSON response shape.

**Acceptance Scenarios**:
1. **Given** a valid session payload and an existing stored research object, **When** `POST /api/brief/generate` is called, **Then** the API returns `200` with a JSON object that validates against the output schema (no markdown fences, no preamble).
2. **Given** research exists but includes empty strings for one or more context blocks, **When** `POST /api/brief/generate` is called, **Then** the API still returns a valid brief and explicitly stays grounded in whatever context is available (no generic filler that contradicts the user inputs).
3. **Given** Claude returns malformed JSON (or extra text), **When** `POST /api/brief/generate` is called, **Then** the API returns `500` with a structured error object that includes the raw Claude response for debugging.
4. **Given** an unknown `researchId`, **When** `POST /api/brief/generate` is called, **Then** the API returns `404` with a structured error object explaining that research state is missing/expired.

### User Story 4 - Developer validation via a single script (Priority: P2)
Developers can validate the pipeline without any frontend wiring by running a single script that calls all endpoints and prints the final brief.

**Why this priority**: This is the fastest way to verify real-world quality and stability during MVP build-out, reducing engineering time and avoiding UI distractions.

**Independent Test**: Start the local server and run the script exactly as written; it should succeed without manual intervention.

**Acceptance Scenarios**:
1. **Given** a local dev server is running and env vars are set, **When** `npx ts-node scripts/test-brief-pipeline.ts` is executed, **Then** it prints a pretty JSON brief to stdout and exits `0`.

### Edge Cases
- Missing or empty `regions` array (should return `400` with validation errors).
- Extremely long `primaryBusiness` free-text answer (should still succeed within model context; may need truncation policy later).
- Rapid repeated calls to `init` and `generate` (in-memory store growth) - NEEDS CLARIFICATION: expected TTL and max entries for MVP.
- Perplexity returns a refusal, paywall text, or irrelevant content (still store raw text; brief should degrade gracefully).
- Claude produces probabilities that do not sum to 100 (API should treat as invalid schema and return `500` until prompt is improved).
- Multi-region overlaps (e.g., "Europe" plus "Western Europe") - normalization policy NEEDS CLARIFICATION.

## Requirements (mandatory)

### Functional Requirements
- **FR-001**: System MUST expose `POST /api/research/init` (Next.js route handler at `app/api/research/init/route.ts`) that accepts onboarding inputs: `name`, `role`, `company`, `industry`, `regions[]`.
- **FR-002**: `POST /api/research/init` MUST fire two Perplexity calls in parallel (Promise.all):
  - **Call A - company intelligence**: recent news, supply chain/footprint, and geopolitical exposure or risk events for the named company in the last 90 days.
  - **Call B - regional signals**: top geopolitical risk signals across selected regions (conflicts, trade policy, sanctions, infrastructure disruption, diplomacy) in the last 30 days.
- **FR-003**: `POST /api/research/init` MUST return `200` with `{ researchId: string }` even if either (or both) Perplexity calls fail. Failures MUST be logged server-side, and the stored raw context for failed calls MUST be an empty string.
- **FR-004**: System MUST store raw Perplexity outputs server-side keyed by `researchId`. For MVP this MUST be an in-memory store (no Supabase writes), with a clear, documented plan for later migration to Supabase.
- **FR-005**: System MUST expose `POST /api/research/enrich` (route handler at `app/api/research/enrich/route.ts`) that accepts `{ researchId, primaryBusiness }` where `primaryBusiness` is the first free-text chat answer.
- **FR-006**: `POST /api/research/enrich` MUST call Perplexity once using a prompt that combines: company, industry, regions, and the `primaryBusiness` answer, and MUST append the raw result to stored research under `enrichment`.
- **FR-007**: `POST /api/research/enrich` MUST return `200` even if Perplexity fails. Failures MUST be logged and enrichment stored as an empty string.
- **FR-008**: System MUST expose `POST /api/brief/generate` (route handler at `app/api/brief/generate/route.ts`) that accepts the compiled session payload:
  - `researchId`, `company`, `role`, `industry`, `regions[]`, and `chatAnswers` with 4 fields (`primaryBusiness`, `primaryExposure`, `recentDisruption`, `riskOwnership`).
- **FR-009**: `POST /api/brief/generate` MUST load the stored research object by `researchId` and assemble a Claude user message with clearly labeled context blocks:
  - Company profile, chat answers, company intelligence (A), regional signals (B), enrichment (Stage 2).
- **FR-010**: The Claude synthesis prompt MUST instruct the model to act as a senior geopolitical risk analyst applying the Seven Pillars framework (Geography, Politics, Economics, Security, Society, History, Technology) and MUST require the response be only a valid JSON object matching the output schema (no preamble, no markdown fences, no explanation).
- **FR-011**: Scenarios in the Claude output MUST include exactly: 1 baseline (highest probability), 2 alternates, and 1 contrarian. Probabilities MUST sum to 100. Narratives and implications MUST be grounded in the provided live research text, not generic.
- **FR-012**: If Claude returns malformed JSON or does not conform to the schema, `POST /api/brief/generate` MUST return `500` with a structured error object that includes the raw Claude response for debugging.
- **FR-013**: All three Perplexity calls MUST use model `llama-3.1-sonar-large-128k-online`.
- **FR-014**: Claude MUST use `claude-sonnet-4-5` (or the latest Sonnet model already adopted in the codebase) and should be configured consistently with existing Anthropic client usage.
- **FR-015**: System MUST read `PERPLEXITY_API_KEY` and `ANTHROPIC_API_KEY` from `.env.local` and validate on startup. If either is missing, the server MUST throw with a clear error message that makes local setup fast.
- **FR-016**: System MUST include a developer test script at `scripts/test-brief-pipeline.ts` that simulates the full three-stage pipeline end-to-end by calling the three endpoints in order and pretty-printing the final brief JSON to the console.
- **FR-017**: Validation for request bodies MUST reject missing required fields with `400` and a structured error object (field-level errors). This applies to all endpoints.

### Key Entities (if feature involves data)
- **ResearchState (in-memory, MVP)**: server-side object keyed by `researchId` containing:
  - `createdAt` (ISO)
  - `onboarding`: name, role, company, industry, regions[]
  - `companyIntelligence` (string, may be empty)
  - `regionalSignals` (string, may be empty)
  - `enrichment` (string, may be empty)
- **Brief (API output)**: JSON object matching the output schema defined below, returned by `POST /api/brief/generate`.

### Non-Functional Requirements (if applicable)
- **NFR-001**: `POST /api/research/init` MUST not block onboarding due to partial research failures (graceful degradation).
- **NFR-002**: API responses MUST be deterministic in shape (structured JSON errors and structured success payloads) to speed frontend wiring later.
- **NFR-003**: For MVP, the in-memory store MUST have a TTL-based cleanup strategy to avoid unbounded memory growth - NEEDS CLARIFICATION: TTL value and cleanup cadence.

## Output Schema (contract)

The brief returned by `POST /api/brief/generate` MUST match:

```json
{
  "company": "string",
  "generatedAt": "ISO timestamp",
  "horizon": "12-18 months",
  "regions": ["array of strings"],
  "scopeSummary": "string",
  "exposures": [
    {
      "region": "string",
      "level": "high | moderate | low",
      "score": "integer 1-5",
      "summary": "string"
    }
  ],
  "scenarios": [
    {
      "name": "string",
      "tag": "string",
      "probability": "integer 0-100",
      "severity": "high | moderate | low",
      "narrative": "string",
      "implications": ["array of strings, minimum 2"]
    }
  ],
  "monitoring": [
    {
      "item": "string",
      "frequency": "string"
    }
  ]
}
```

## Testing (MVP validation tool)

### Developer Script - `scripts/test-brief-pipeline.ts`

The script MUST:
- Call `POST /api/research/init` with:
  - company: `IFCO Systems`
  - industry: `Logistics and Supply Chain`
  - regions: `Eastern Europe`, `Western Europe`, `Southeast Asia`
- Wait for the `researchId`
- Call `POST /api/research/enrich` with the `researchId` and:
  - `primaryBusiness`: `We manage returnable packaging - pallets and containers - for food and beverage companies across Europe and North America`
- Call `POST /api/brief/generate` with the full session payload and simulated chip answers for Q2-Q4
- Pretty-print the returned brief JSON to the console

**Pass condition**: A single run produces valid JSON that conforms to the Output Schema, and scenario content is visibly grounded in current events surfaced by the Perplexity calls (not generic filler).

## NEEDS CLARIFICATION (resolve before implementation)
- **NC-001**: Research TTL - how long should a `researchId` remain valid (e.g., 30 minutes, 2 hours) for the MVP experience?
- **NC-002**: Region taxonomy - do we allow free-form region strings from the client, or must regions come from a controlled list (to improve prompt quality and avoid duplicates)?
- **NC-003**: Error logging destination - do we want structured logs only, or also `system_events` writes for Perplexity/Claude failures (aligning with existing health logging patterns)?
- **NC-004**: Claude JSON enforcement - should we use a strict schema validator server-side (recommended) or rely on prompt-only compliance for MVP?

## Success Criteria (mandatory)

### Measurable Outcomes
- **SC-001**: All P1 acceptance scenarios pass for `init`, `enrich`, and `generate` when called directly via HTTP.
- **SC-002**: Running `npx ts-node scripts/test-brief-pipeline.ts` against a local server returns a valid brief JSON for IFCO Systems without manual correction, and the brief content is grounded in the live research text.

