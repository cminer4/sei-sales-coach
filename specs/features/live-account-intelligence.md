---
linear: https://linear.app/sei-interview-app/issue/SEI-31/live-account-intelligence
ticket: SEI-31
---

# Feature Specification: Live Account Intelligence

**Feature Branch**: `SEI-31-live-account-intelligence`
**Created**: 2026-03-08
**Status**: Draft
**Linear Ticket**: https://linear.app/sei-interview-app/issue/SEI-31/live-account-intelligence
**Input**: "Live Account Intelligence give the agent the ability to pull live market data in and load that into the experience if the user wants to practice against a specific company."

## User Scenarios & Testing (mandatory)

### User Story 1 - Consultant opts in to practice against a specific company (Priority: P1)
A consultant is setting up a coaching session (e.g. SPIN or general coach). They can choose to practice against a specific company. When they provide or select that company, the system fetches live market (account) data for that company and makes it available to the coach so the conversation is grounded in real, up-to-date context about that account.
**Why this priority**: Core value of the feature — without opt-in and company selection, live data cannot be loaded.
**Independent Test**: Complete onboarding with "practice against a company" enabled and a company specified; confirm session starts and coach context includes company-specific data (or a visible indicator that live data was loaded).
**Acceptance Scenarios**:
1. **Given** the user is on the session setup page, **When** they choose to practice against a specific company (e.g. by name or selector), **Then** the system records that choice and uses it when loading session context.
2. **Given** the user has selected a company, **When** the session starts, **Then** live account/market data for that company is fetched (or retrieved from a configured source) and loaded into the experience.
3. **Given** the user has not selected a company or has chosen "no specific company", **When** the session starts, **Then** the session runs without live account intelligence (existing behavior).

### User Story 2 - Coach uses live account data during the practice (Priority: P1)
During the practice session (text or voice), the coach's responses are informed by the live market/account data that was loaded for the selected company. The consultant experiences a scenario that reflects real company context (e.g. industry, recent news, size, challenges) rather than generic placeholder content.
**Why this priority**: Defines the "load that into the experience" outcome — data must affect the coach's behavior.
**Independent Test**: Run a session with a company selected; ask the coach something that would require company-specific knowledge; verify the response reflects the loaded data (or a clear fallback if data is unavailable).
**Acceptance Scenarios**:
1. **Given** live account data was successfully loaded for Company X, **When** the consultant asks a question that relates to Company X, **Then** the coach's reply is grounded in that data where relevant.
2. **Given** live data could not be loaded (e.g. provider unavailable), **When** the session runs, **Then** the coach still operates (e.g. with existing KB or generic context) and the user is not blocked; optional: show a non-blocking message that "live data unavailable, using standard context."

### User Story 3 - Admin or config can control data source and availability (Priority: P2)
The source of "live market data" (e.g. which API or provider, credentials, which fields to pull) is configurable so SEI can plug in the chosen provider without code changes. Optionally, an admin or feature flag controls whether the "practice against a company" option is available to consultants.
**Why this priority**: Enables safe rollout and provider flexibility.
**Independent Test**: Change configuration (e.g. env or admin setting); verify behavior or visibility of the company-practice flow changes accordingly.
**Acceptance Scenarios**:
1. **Given** a live data provider is configured (e.g. API key and endpoint), **When** a consultant selects a company, **Then** the system attempts to fetch data from that provider.
2. **Given** no provider is configured or the feature is disabled, **When** the consultant is on setup, **Then** the option to practice against a specific company is hidden or clearly disabled.

### Edge Cases
- **Provider timeout or failure**: Fetching live data fails or times out — session should still start; coach uses existing KB/context; user sees optional message that live data was unavailable.
- **Company not found**: User enters or selects a company the provider doesn't recognize — show clear message and allow retry or continue without live data.
- **Rate limits / quota**: External API rate limits or quota exceeded — cache recent results per company where possible; otherwise degrade gracefully (no live data for this session).
- **Data freshness**: — NEEDS CLARIFICATION: How fresh must data be? Cache TTL (e.g. 24h per company)? Real-time every session?
- **PII / compliance**: Live data may contain sensitive company information — ensure usage aligns with SEI data policies; no storage of raw payloads in logs beyond what is necessary for debugging (NEEDS CLARIFICATION: retention and logging rules).

## Requirements (mandatory)

### Functional Requirements
- **FR-001**: The system MUST allow the user to indicate, during session setup (onboarding), that they want to practice against a specific company. Implementation may be in `app/coach/spin/page.tsx` (or general coach setup) and/or `lib/` services per Directory Contract.
- **FR-002**: When a company is selected for practice, the system MUST fetch or retrieve live market/account data for that company from a configured source (e.g. external API). Fetch logic MUST live in `lib/` or an API route; API route in `app/api/**/route.ts` if the fetch is triggered from the client.
- **FR-003**: The system MUST inject the retrieved live account data into the coach's context (e.g. RAG, system prompt, or session context) so that the coach's responses during the session can use that data. Integration MUST respect existing RAG and agent config patterns (CLAUDE.md § V).
- **FR-004**: If the user does not select a company or chooses to skip live data, the session MUST run as today (no live account intelligence). No change to existing flows when the feature is not used.
- **FR-005**: Data source and behavior — NEEDS CLARIFICATION: What is the source of "live market data"? (e.g. third-party API name, CRM export, internal data lake.) This determines API integration, schema, and error handling.
- **FR-006**: Company identification — NEEDS CLARIFICATION: How is the company specified? (Free-text name, search/autocomplete, list of accounts from CRM, domain?) This determines UI and validation.

### Key Entities (if feature involves data)
- **Session (existing)** — Extended to optionally store selected company identifier and, if desired, a reference to or summary of loaded live data (e.g. company name, fetched-at timestamp). Full raw payloads need not be stored per NFR.
- **Live account data (conceptual)** — Data retrieved from an external or configured source for a given company (e.g. firmographic info, recent news, industry). Shape and storage are provider-dependent; integration in `lib/` should abstract the source.

### Non-Functional Requirements
- **NFR-001**: Fetching live data MUST NOT block session start for more than a few seconds; if the fetch is slow or fails, the session MUST start with available context and optional messaging that live data was unavailable.
- **NFR-002**: Credentials and configuration for the live data provider MUST not be exposed to the client; fetch MUST be performed server-side (API route or server component / `lib` called from server).
- **NFR-003**: Compatibility with existing RAG and knowledge base — live account data injected into the experience MUST not break existing retrieval or coach behavior; prefer additive context (e.g. extra context block or RAG-like injection) rather than replacing existing KB usage.

## Success Criteria (mandatory)

### Measurable Outcomes
- **SC-001**: All P1 acceptance scenarios pass: user can opt in to practice against a company, live data is fetched and loaded, and the coach uses it during the session (or degrades gracefully if unavailable).
- **SC-002**: When live data is not selected or not available, session and coach behavior match current behavior (no regressions).
- **SC-003**: `npm run lint` and `npm run build` pass; new code follows Directory Contract and constitution tech stack (Next.js App Router, TypeScript, Tailwind, `lib/` for business logic).
- **SC-004**: NEEDS CLARIFICATION items (data source, company identification, freshness, logging) are resolved before or during implementation so that FR-005 and FR-006 can be implemented concretely.
