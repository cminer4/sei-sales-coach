---
linear: https://linear.app/sei-interview-app/issue/SEI-38/ai-assessment-and-strategy-agent
ticket: SEI-38
---

# Feature Specification: AI Assessment & Strategy Agent

**Feature Branch**: `SEI-38-ai-assessment-strategy-agent`
**Created**: 2026-03-10
**Status**: Code Complete (pending manual setup)
**Linear Ticket**: [SEI-38](https://linear.app/sei-interview-app/issue/SEI-38/ai-assessment-and-strategy-agent)
**Input**: User description: "Build the AI Assessment & Strategy Agent — a Guide agent that helps SEI consultants learn the AI Assessment product"

## Context

This is a **Guide agent** — a teaching tool that helps SEI consultants learn the AI Assessment product. It is **not a role-play agent**. The output is a **learning summary**, not a scorecard.

The implementation follows the exact same architecture as the SPIN Sales Coach at `/coach/spin`, adapted for the Assessment learning context.

**Key distinction from SPIN**:
- SPIN = role-play with prospect simulation, scored performance
- Assessment = teaching conversation, learning summary with confidence indicator

## User Scenarios & Testing (mandatory)

### User Story 1 - Complete Assessment Learning Session (Priority: P1)
An SEI consultant navigates to `/guide/assessment`, completes onboarding (name, email, knowledge level), starts a voice session with the AI Assessment Agent, and receives a learning summary at the end.

**Why this priority**: This is the core end-to-end flow; all other stories depend on this working.

**Independent Test**: Navigate through `/guide/assessment` → `/guide/assessment/session` → `/guide/assessment/summary` with a real ElevenLabs conversation.

**Acceptance Scenarios**:
1. **Given** a user is on `/guide/assessment`, **When** they fill in name, email, and knowledge level and click Start, **Then** they are navigated to `/guide/assessment/session`.
2. **Given** a user is on the session page, **When** 5 minutes pass (demo limit), **Then** the demo ended modal appears.
3. **Given** the demo has ended, **When** the user clicks "View Learning Summary", **Then** the ElevenLabs transcript is fetched and they are navigated to `/guide/assessment/summary`.
4. **Given** a user is on the summary page, **When** the page loads, **Then** they see four learning dimension cards, a confidence indicator, What You Covered, and Worth Revisiting sections.

### User Story 2 - Onboarding Collects Required Information (Priority: P1)
The onboarding page collects first name, email, and knowledge level. Knowledge level is passed to session context but does not gate or change the experience.

**Why this priority**: Onboarding data is required for session context and summary generation.

**Independent Test**: Fill out onboarding form, verify all fields are stored in localStorage and passed to session.

**Acceptance Scenarios**:
1. **Given** a user is on `/guide/assessment`, **When** they view the form, **Then** they see fields for First Name, Email, and Knowledge Level (radio: New to it / Some familiarity / Know it well).
2. **Given** a user has filled all required fields, **When** they click Start, **Then** the data is stored in localStorage with key `assessment-onboarding-data`.
3. **Given** the session starts, **When** the system prompt is resolved, **Then** knowledge level is available in session context for the prompt.

### User Story 3 - Voice Session Uses Correct Agent (Priority: P1)
The session page uses `ELEVENLABS_ASSESSMENT_AGENT_ID` and `ASSESSMENT_COACH_ID` from environment variables, and resolves the system prompt via Prompt Control.

**Why this priority**: Without correct agent IDs, the session cannot function.

**Independent Test**: Start a session, verify network calls use the Assessment agent IDs, verify system prompt is fetched from agents table.

**Acceptance Scenarios**:
1. **Given** the session page loads, **When** it requests the ElevenLabs signed URL, **Then** the request uses `ELEVENLABS_ASSESSMENT_AGENT_ID`.
2. **Given** the session needs a system prompt, **When** it queries the agents table, **Then** it fetches the active prompt for `ASSESSMENT_COACH_ID`.

### User Story 4 - Learning Summary Shows Correct Structure (Priority: P1)
The summary page displays four learning dimension cards (Product Knowledge, Value Articulation, Objection Handling, Competitive Positioning), a confidence indicator, What You Covered, and Worth Revisiting.

**Why this priority**: This is the primary value delivered to the user.

**Independent Test**: Navigate to summary page with transcript in localStorage, verify all sections render.

**Acceptance Scenarios**:
1. **Given** a user is on the summary page with a valid transcript, **When** the API returns, **Then** they see four dimension cards with name, 2-3 sentence summary, and Key Takeaway.
2. **Given** the API returns a confidence value, **When** the page renders, **Then** the confidence indicator shows one of: Building / Developing / Strong.
3. **Given** the API returns covered and revisit arrays, **When** the page renders, **Then** "What You Covered" and "Worth Revisiting" sections display the items.

### User Story 5 - Transcript Polling Works Correctly (Priority: P2)
After session end, the transcript is fetched from ElevenLabs using the same polling pipeline as SPIN (3s initial delay, up to 8 polls at 2s intervals).

**Why this priority**: Voice sessions need transcript for summary generation.

**Independent Test**: End a voice session, verify transcript polling logs, verify transcript is written to `localStorage.assessmentTranscript`.

**Acceptance Scenarios**:
1. **Given** the session has ended in voice mode, **When** the user clicks to view summary, **Then** the system waits 3s before first poll.
2. **Given** ElevenLabs returns status `processing`, **When** the API receives this, **Then** it returns 202 and client continues polling.
3. **Given** ElevenLabs returns status `done` with transcript, **When** the API receives this, **Then** it returns 200 and transcript is stored in localStorage.

### Edge Cases
- **No eval criteria docs in KB**: API logs warn event to `system_events` and generates summary from transcript alone
- **Empty transcript**: Summary API should still return a valid response with generic content
- **ElevenLabs timeout**: After 8 poll attempts, show error and offer retry option
- **Missing environment variables**: Session page should show clear error if `ELEVENLABS_ASSESSMENT_AGENT_ID` or `ASSESSMENT_COACH_ID` not set

## Requirements (mandatory)

### Functional Requirements

**Database**
- **FR-001**: System MUST insert a new row into `agents` table: `INSERT INTO agents (name, agent_type, business_process, status) VALUES ('AI Assessment & Strategy Agent', 'Guide', 'Sales & BD', 'active');`
- **FR-002**: The generated UUID MUST be added to `.env.local` as `ASSESSMENT_COACH_ID` and to Vercel environment variables.

**ElevenLabs**
- **FR-003**: System MUST create a new ElevenLabs agent with blank system prompt (set via Prompt Control) and blank First Message (configured in ElevenLabs directly).
- **FR-004**: The ElevenLabs agent ID MUST be added to `.env.local` as `ELEVENLABS_ASSESSMENT_AGENT_ID` and to Vercel environment variables.

**Pages**
- **FR-005**: `app/guide/assessment/page.tsx` MUST replace the existing placeholder with an onboarding page collecting: First Name, Email, Knowledge Level (radio: New to it / Some familiarity / Know it well).
- **FR-006**: Knowledge level MUST be passed into session context for system prompt and summary generation, but MUST NOT gate or change the experience.
- **FR-007**: Copy, layout, and styling MUST match the SPIN onboarding page, with copy updated for AI Assessment & Strategy Agent.
- **FR-008**: `app/guide/assessment/session/page.tsx` MUST follow the same structure as SPIN session page with demo timer of 5 minutes (`DEMO_LIMIT_MS = 300_000`).
- **FR-009**: Session page MUST use `ELEVENLABS_ASSESSMENT_AGENT_ID` and `ASSESSMENT_COACH_ID` environment variables.
- **FR-010**: Session page MUST resolve system prompt via the same Prompt Control lookup used by SPIN (fetch active prompt for Assessment Coach UUID from `agents` table).
- **FR-011**: On session end, MUST fetch ElevenLabs transcript using same polling pipeline as SPIN (3s initial delay, up to 8 polls at 2s intervals, return 202 for `in-progress` or `processing`, return 200 only when `done` with transcript).
- **FR-012**: Session page MUST write transcript to `localStorage.assessmentTranscript` and navigate to `/guide/assessment/summary`.
- **FR-013**: `app/guide/assessment/summary/page.tsx` MUST use same layout and component pattern as `/coach/spin/scorecard` but reskinned for learning context.

**Summary Page Reskinning**
- **FR-014**: Replace four dimension score cards with four learning cards: Product Knowledge, Value Articulation, Objection Handling, Competitive Positioning.
- **FR-015**: Each learning card MUST show: dimension name, 2-3 sentence summary of what was covered, and a single Key Takeaway.
- **FR-016**: Replace "Overall Score" with Confidence Indicator showing one qualitative label: Building | Developing | Strong.
- **FR-017**: Replace "Key Strengths / Growth Areas" with "What You Covered" and "Worth Revisiting".
- **FR-018**: Replace "Practice Again / Return to Home" with "Continue Learning" / "Return to Home".

**API**
- **FR-019**: Create `/api/assessment-summary/route.ts` mirroring `/api/score-session` but generating a learning summary.
- **FR-020**: API MUST fetch KB documents where `category = 'evaluation_criteria'` AND `agents` contains Assessment Coach UUID or `'all'`.
- **FR-021**: If no eval criteria docs found, API MUST log `warn` event to `system_events` via `logSystemEvent` and proceed with minimal fallback.
- **FR-022**: API MUST send transcript plus KB docs to Claude with the specified wrapper prompt only — all rubric detail comes from KB document.
- **FR-023**: API MUST return valid JSON matching schema:
```json
{
  "dimensions": {
    "product_knowledge": { "summary": "", "key_takeaway": "" },
    "value_articulation": { "summary": "", "key_takeaway": "" },
    "objection_handling": { "summary": "", "key_takeaway": "" },
    "competitive_positioning": { "summary": "", "key_takeaway": "" }
  },
  "covered": ["", ""],
  "revisit": ["", ""],
  "confidence": "Building | Developing | Strong"
}
```

**Knowledge Base**
- **FR-024**: Do NOT add KB documents in this implementation. Leave a TODO comment in the retrieval logic indicating that AI Assessment eval criteria doc should be added via `/admin` → Knowledge Base with `category: evaluation_criteria` assigned to `ASSESSMENT_COACH_ID`.

**Rules (What NOT to Do)**
- **FR-025**: System MUST NOT modify any existing SPIN coach pages, APIs, or components.
- **FR-026**: System MUST NOT modify `lib/coaching.ts` or the voice LLM route.
- **FR-027**: System MUST follow the same `logSystemEvent` pattern for errors.

### Key Entities

- **Agent Row**: `AI Assessment & Strategy Agent` in `agents` table with `agent_type = 'Guide'`, `business_process = 'Sales & BD'`, `status = 'active'`
- **Assessment Session**: Stored in localStorage (`assessment-onboarding-data`, `assessmentTranscript`)
- **Learning Summary**: JSON response from `/api/assessment-summary` with dimensions, confidence, covered, revisit

### Non-Functional Requirements

- **NFR-001**: `npm run build` MUST pass after implementation.
- **NFR-002**: `npm run lint` MUST pass with no new errors.
- **NFR-003**: Demo timer MUST be exactly 5 minutes (300,000ms).
- **NFR-004**: ElevenLabs polling MUST follow exact timing: 3s initial delay, 2s between polls, max 8 attempts.

## Success Criteria (mandatory)

### Measurable Outcomes

- **SC-001**: User can navigate `/guide/assessment` → `/guide/assessment/session` → `/guide/assessment/summary` end-to-end.
- **SC-002**: Voice session connects to correct ElevenLabs agent (verified in network tab).
- **SC-003**: Summary page displays all four learning dimensions with summaries and key takeaways.
- **SC-004**: Confidence indicator shows one of: Building / Developing / Strong.
- **SC-005**: Zero files modified under `app/coach/`, `lib/coaching.ts`, or `/api/voice-llm/`.
- **SC-006**: Build passes with `npm run build`.
- **SC-007**: Commit message: `SEI-38 add AI Assessment & Strategy Agent`

## Implementation Notes

### Claude Prompt for Summary API

The wrapper prompt sent to Claude (all rubric detail comes from KB document):

```
You are generating a learning summary from a conversation between an SEI consultant and the AI Assessment & Strategy Agent. Use the evaluation criteria provided to structure your output.

Return valid JSON only, no preamble:

{
  "dimensions": {
    "product_knowledge":        { "summary": "", "key_takeaway": "" },
    "value_articulation":       { "summary": "", "key_takeaway": "" },
    "objection_handling":       { "summary": "", "key_takeaway": "" },
    "competitive_positioning":  { "summary": "", "key_takeaway": "" }
  },
  "covered": ["", ""],
  "revisit": ["", ""],
  "confidence": "Building | Developing | Strong"
}
```

### TODO Comment for KB Document

```typescript
// TODO: Add AI Assessment eval criteria doc via /admin → Knowledge Base
// Category: evaluation_criteria
// Assign to: ASSESSMENT_COACH_ID
// This document should define the four dimensions and the confidence rubric
```

### Files to Create

| File | Purpose |
|------|---------|
| `app/guide/assessment/page.tsx` | Onboarding page (replace placeholder) |
| `app/guide/assessment/session/page.tsx` | Voice/text session page |
| `app/guide/assessment/summary/page.tsx` | Learning summary page |
| `app/api/assessment-summary/route.ts` | Summary generation API |

### Files NOT to Modify

| File | Reason |
|------|--------|
| `app/coach/**/*` | SPIN coach is separate |
| `lib/coaching.ts` | Shared coaching logic, no changes needed |
| `app/api/voice-llm/**/*` | Voice LLM is shared infrastructure |

### Environment Variables

| Variable | Description |
|----------|-------------|
| `ASSESSMENT_COACH_ID` | UUID from agents table insert |
| `ELEVENLABS_ASSESSMENT_AGENT_ID` | ElevenLabs agent ID |

### Manual Steps Required

1. **Supabase**: Run the INSERT statement to create the agent row, note the UUID
2. **ElevenLabs**: Create a new agent in ElevenLabs dashboard, note the agent ID
3. **Environment**: Add both IDs to `.env.local` and Vercel environment variables
4. **Knowledge Base**: After implementation, add eval criteria doc via `/admin` → Knowledge Base
