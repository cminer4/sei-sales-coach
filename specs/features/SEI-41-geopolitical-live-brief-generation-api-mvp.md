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
3. **Given** an unknown `researchId`, **When** `POST /api/research/enrich` is called, **Then** the API returns `404` with a structured error object explaining that research state is missing.
4. **Given** an expired `researchId` (older than 30 minutes), **When** `POST /api/research/enrich` is called, **Then** the API returns `410 Gone` instructing the client to re-init research.

### User Story 3 - Generate a structured geopolitical brief on demand (Priority: P1)
When the user opens the brief pane (by clicking the brief chip), the client sends the compiled session payload. The system loads the stored research by `researchId`, calls Claude to synthesize, and returns a valid JSON brief matching the schema.

**Why this priority**: This is the core business output. The product succeeds or fails on whether this brief is accurate, structured, and grounded in real current events.

**Independent Test**: Use a local dev server and run `npx ts-node scripts/test-brief-pipeline.ts` to exercise the full three-stage flow end-to-end and validate the JSON response shape.

**Acceptance Scenarios**:
1. **Given** a valid session payload and an existing stored research object, **When** `POST /api/brief/generate` is called, **Then** the API returns `200` with a JSON object that validates against the output schema (no markdown fences, no preamble).
2. **Given** research exists but includes empty strings for one or more context blocks, **When** `POST /api/brief/generate` is called, **Then** the API still returns a valid brief, output for gaps reflects **reduced confidence** (hedged language per FR-019), and Claude does not invent company- or region-specific facts to fill those gaps.
3. **Given** Claude returns malformed JSON (or extra text), **When** `POST /api/brief/generate` is called, **Then** the API returns `500` with a structured error object that includes the raw Claude response for debugging.
4. **Given** an unknown `researchId`, **When** `POST /api/brief/generate` is called, **Then** the API returns `404` with a structured error object explaining that research state is missing.
5. **Given** an expired `researchId`, **When** `POST /api/brief/generate` is called, **Then** the API returns `410 Gone` instructing the client to re-init research.

### User Story 4 - Developer validation via a single script (Priority: P2)
Developers can validate the pipeline without any frontend wiring by running a single script that calls all endpoints and prints the final brief.

**Why this priority**: This is the fastest way to verify real-world quality and stability during MVP build-out, reducing engineering time and avoiding UI distractions.

**Independent Test**: Start the local server and run the script exactly as written; it should succeed without manual intervention.

**Acceptance Scenarios**:
1. **Given** a local dev server is running and env vars are set, **When** `npx ts-node scripts/test-brief-pipeline.ts` is executed, **Then** it prints a pretty JSON brief, prints **PASS** from the sanity assertions, and exits `0`.

### Edge Cases
- Missing or empty `regions` array (should return `400` with validation errors).
- Region values not in the controlled enum list (should return `400` with a clear validation error).
- Extremely long `primaryBusiness` free-text answer (should still succeed within model context; may need truncation policy later).
- Rapid repeated calls to `init` and `generate` (in-memory store growth) - bounded by 30 minute TTL cleanup.
- Perplexity returns a refusal, paywall text, or irrelevant content (still store raw text; brief should degrade gracefully).
- Claude produces probabilities that do not sum to 100 (API should treat as invalid schema and return `500` after one retry).

## Requirements (mandatory)

### Functional Requirements
- **FR-001**: System MUST expose `POST /api/research/init` (Next.js route handler at `app/api/research/init/route.ts`) that accepts onboarding inputs: `name`, `role`, `company`, `industry`, `regions[]`. `regions[]` MUST only contain values from the controlled enum list: `North America`, `Western Europe`, `Eastern Europe`, `Middle East`, `Southeast Asia`, `China / North Asia`, `Latin America`, `Sub-Saharan Africa`. Any other value MUST result in a `400` with a clear validation error.
- **FR-002**: `POST /api/research/init` MUST fire two Perplexity calls in parallel (Promise.all):
  - **Call A - company intelligence**: recent news, supply chain/footprint, and geopolitical exposure or risk events for the named company in the last 90 days.
  - **Call B - regional signals**: top geopolitical risk signals across selected regions (conflicts, trade policy, sanctions, infrastructure disruption, diplomacy) in the last 30 days.
- **FR-003**: `POST /api/research/init` MUST return `200` with `{ researchId: string }` even if either (or both) Perplexity calls fail. Failures MUST be logged server-side, and the stored raw context for failed calls MUST be an empty string.
- **FR-004**: System MUST store raw Perplexity outputs server-side keyed by `researchId`. For MVP this MUST be an in-memory store (no Supabase writes), with a clear, documented plan for later migration to Supabase. Each `researchId` MUST include a `createdAt` timestamp and MUST expire after 30 minutes; retrieval after expiry MUST return `410 Gone` and instruct the client to re-init research.
- **FR-005**: System MUST expose `POST /api/research/enrich` (route handler at `app/api/research/enrich/route.ts`) that accepts `{ researchId, primaryBusiness }` where `primaryBusiness` is the first free-text chat answer.
- **FR-006**: `POST /api/research/enrich` MUST call Perplexity once using a prompt that combines: company, industry, regions, and the `primaryBusiness` answer, and MUST append the raw result to stored research under `enrichment`.
- **FR-007**: `POST /api/research/enrich` MUST return `200` even if Perplexity fails. Failures MUST be logged and enrichment stored as an empty string.
- **FR-008**: System MUST expose `POST /api/brief/generate` (route handler at `app/api/brief/generate/route.ts`) that accepts the compiled session payload:
  - `researchId`, `company`, `role`, `industry`, `regions[]`, and `chatAnswers` with 4 fields (`primaryBusiness`, `primaryExposure`, `recentDisruption`, `riskOwnership`).
- **FR-009**: `POST /api/brief/generate` MUST load the stored research object by `researchId` and assemble a Claude user message with clearly labeled context blocks:
  - Company profile, chat answers, company intelligence (A), regional signals (B), enrichment (Stage 2).
- **FR-010**: The Claude synthesis prompt MUST instruct the model to act as a senior geopolitical risk analyst applying the Seven Pillars framework (Geography, Politics, Economics, Security, Society, History, Technology) and MUST require the response be only a valid JSON object matching the output schema (no preamble, no markdown fences, no explanation).
- **FR-011**: Scenarios in the Claude output MUST include exactly: 1 baseline (highest probability), 2 alternates, and 1 contrarian. Probabilities MUST sum to 100. Narratives and implications MUST be grounded in the provided live research text, not generic. Each scenario's `tag` MUST be one of `baseline`, `alternate`, or `contrarian` (use `alternate` for both alternate scenarios) so automated checks can verify the four-type set without guessing from free text.
- **FR-012**: If Claude returns malformed JSON or does not conform to the schema, `POST /api/brief/generate` MUST attempt to parse the response, and on failure MUST make exactly one retry call to Claude with the same prompt plus an explicit instruction: _"Your previous response was not valid JSON. Return only the JSON object with no other text."_ If the retry also fails JSON parsing or schema checks, the route MUST return `500` with a structured error object that includes the raw Claude response(s) for debugging. The malformed response MUST be logged via structured logs, and the JSON parse failure path SHOULD include a console error with the full raw response during MVP.
- **FR-013**: All three Perplexity calls MUST use model `llama-3.1-sonar-large-128k-online`.
- **FR-014**: Claude MUST use `claude-sonnet-4-5` (or the latest Sonnet model already adopted in the codebase) and should be configured consistently with existing Anthropic client usage.
- **FR-015**: System MUST read `PERPLEXITY_API_KEY` and `ANTHROPIC_API_KEY` from `.env.local` and validate on startup (or on first use in Next.js). If either is missing, the server MUST fail fast with a message that **names the missing variable by exact key name**, e.g. `Missing required environment variable: PERPLEXITY_API_KEY` (not a generic auth or config error).
- **FR-016**: System MUST include a developer test script at `scripts/test-brief-pipeline.ts` that simulates the full three-stage pipeline end-to-end by calling the three endpoints in order and pretty-printing the final brief JSON to the console. After printing, the script MUST run a **sanity assertion block** (not a full schema validator): (1) scenario probabilities sum to 100, (2) exactly four scenarios with tags `baseline` (1x), `alternate` (2x), `contrarian` (1x), (3) every scenario has `implications.length >= 2`. Print **PASS** or **FAIL** with the **specific** failed rule; exit **non-zero** on FAIL.
- **FR-017**: Validation for request bodies MUST reject missing required fields with `400` and a structured error object (field-level errors). This applies to all endpoints.
- **FR-018**: Perplexity and Claude network calls MUST live in thin, mockable `lib/` functions (e.g. company intel, regional signals, enrichment, brief synthesis). Route handlers MUST NOT embed provider calls inline so tests can mock providers and CI stays free of live AI calls.
- **FR-019 (synthesis — empty research context)**: If **any** research context block passed to Claude (`companyIntelligence`, `regionalSignals`, or `enrichment`) is empty, the synthesis prompt MUST require Claude to **reflect reduced confidence** in the affected output (e.g. hedged language on the relevant exposure rows, `scopeSummary`, or scenario narratives where that gap matters). Claude MUST **not** fabricate company-specific or region-specific detail to compensate for missing context.

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
- **NFR-003**: For MVP, the in-memory store MUST have a TTL-based cleanup strategy with a 30 minute lifetime for each `researchId` and periodic cleanup to avoid unbounded memory growth.

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
- Run the sanity assertion block (probabilities, scenario tags, implications counts); print PASS/FAIL and exit non-zero on FAIL

**Pass condition**: Assertions print **PASS**, JSON is usable, and scenario content is visibly grounded in current events surfaced by the Perplexity calls (not generic filler).

## Handoff: frontend (separate spec)

The **geopolitical frontend wiring spec** MUST require: on onboarding submit, **fire `POST /api/research/init` immediately**, **do not await** before showing the chat UI, and **merge `researchId` into session when the response arrives** (chat buys time while Perplexity runs). Handle **410** with re-init UX. See **NC-006**.

## Resolved Clarifications
- **NC-001 (Research TTL)**: `researchId` entries MUST expire after **30 minutes** based on their `createdAt` timestamp. Retrieval of an expired entry MUST return `410 Gone` and force a clean re-init rather than serving stale data.
- **NC-002 (Region taxonomy)**: `regions[]` MUST be drawn from a controlled list only: `North America`, `Western Europe`, `Eastern Europe`, `Middle East`, `Southeast Asia`, `China / North Asia`, `Latin America`, `Sub-Saharan Africa`. Any other region string MUST be rejected with a `400` validation error.
- **NC-003 (Error logging)**: Use structured logs only for Perplexity and Claude errors in MVP. Do **not** write to `system_events` yet. Add `// TODO: wire to system_events` comments in catch blocks to mark future integration points. Claude malformed JSON responses SHOULD emit a console error with the full raw response for easier debugging during early testing.
- **NC-004 (Claude JSON enforcement)**: Rely on prompt-only JSON compliance plus server-side `JSON.parse` with a **single retry**. On first parse failure, make one more Claude call with the same prompt plus: _"Your previous response was not valid JSON. Return only the JSON object with no other text."_ If the retry still fails parsing or schema checks, return `500` and include the raw response in the structured error object.
- **NC-005 (TTL vs exec demos)**: **30 minutes** remains the MVP TTL. **Extend session** or longer TTL is explicitly **v2**; controlled exec demos re-init on expiry if needed. Does **not** block SEI-41 implementation.
- **NC-006 (Frontend wiring — out of scope here, required in frontend spec)**: To avoid a sluggish “Enter briefing room” transition when Perplexity is slow, the **frontend** MUST **fire `POST /api/research/init` immediately on form submit**, **not** await the response before showing the chat UI, and **store `researchId` in session state when it arrives** (chat questions buy time for research). This ticket does not implement that UI; the follow-on frontend spec MUST state this explicitly.

## Success Criteria (mandatory)

### Measurable Outcomes
- **SC-001**: All P1 acceptance scenarios pass for `init`, `enrich`, and `generate` when called directly via HTTP.
- **SC-002**: Running `npx ts-node scripts/test-brief-pipeline.ts` against a local server exits 0 with **PASS** from the script assertions, returns a valid brief JSON for IFCO Systems without manual correction, and the brief content is grounded in the live research text.

