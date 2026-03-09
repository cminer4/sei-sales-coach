---
linear: https://linear.app/sei-interview-app/issue/SEI-30/spin-session-key-objectives-spin-elements-and-tips
ticket: SEI-30
---

# Feature Specification: SPIN Session Key Objectives — SPIN Elements and Tips

**Feature Branch**: `SEI-30-spin-session-key-objectives-spin-tips`
**Created**: 2026-03-08
**Status**: Draft
**Linear Ticket**: https://linear.app/sei-interview-app/issue/SEI-30/spin-session-key-objectives-spin-elements-and-tips
**Input**: Update the Key Objectives panel in app/coach/spin/session/page.tsx to replace the current generic objectives list with the four SPIN elements (S, P, I, N) and a coaching tip for each. Styling: SPIN letter prominent, dimension name bold, tip smaller and muted; match existing panel card styling. Do not modify any other part of the session page, Live Feedback, or files outside app/coach/spin/session/.

## User Scenarios & Testing (mandatory)

### User Story 1 - Key Objectives panel shows four SPIN elements with tips (Priority: P1)
A consultant is on the SPIN coaching session page. The Key Objectives panel (sidebar) shows four items in order: S — Situation, P — Problem, I — Implication, N — Need-Payoff. Each item displays the SPIN letter prominently, the dimension name in bold, and a short coaching tip in smaller, muted text below the label.
**Why this priority**: Core deliverable; the panel is the main place consultants see SPIN guidance during the session.
**Independent Test**: Open `/coach/spin`, complete setup, and start a session; verify the Key Objectives panel shows exactly four items with the specified copy and structure.
**Acceptance Scenarios**:
1. **Given** the user is on the SPIN session page (before or after starting), **When** they look at the Key Objectives panel, **Then** they see four items in order: S — Situation, P — Problem, I — Implication, N — Need-Payoff.
2. **Given** the Key Objectives panel is visible, **When** the user reads each item, **Then** each shows: (1) a prominent SPIN letter (S, P, I, or N), (2) the dimension name in bold, (3) a coaching tip in smaller, muted text below.
3. **Given** the panel is visible, **When** the user reads the tips, **Then** the copy matches: Situation — "Confirm context quickly. Do your homework first — don't ask what you should already know."; Problem — "Find the real pain. Dig past the stated issue to what's actually not working."; Implication — "Explore the consequences. What happens if this doesn't get solved?"; Need-Payoff — "Let them say the value. Ask what solving this would mean — don't tell them."

### User Story 2 - Panel styling matches existing card and uses accent for SPIN letters (Priority: P1)
The Key Objectives panel keeps the same card styling (padding, background, borders) as today. The SPIN letter (S, P, I, N) is visually prominent (larger or using the existing accent color). The dimension name is bold; the tip text is smaller and muted.
**Why this priority**: Consistency with the rest of the app and clear visual hierarchy.
**Independent Test**: Compare the Key Objectives card to the Live Feedback card; confirm same container styles; confirm S/P/I/N stand out and tips are muted.
**Acceptance Scenarios**:
1. **Given** the session page is rendered, **When** the Key Objectives panel is compared to the Live Feedback panel, **Then** the same card styling is used (same padding, background, borders — e.g. glass-card p-6).
2. **Given** an objective item is visible, **When** the user looks at it, **Then** the SPIN letter is larger or uses the existing accent color (e.g. gradient/theme tokens); the dimension name is bold; the tip is smaller and muted (e.g. text-white/50 or text-white/60).

### Edge Cases
- **Loading state**: The panel may currently show a loading skeleton when objectives are fetched. — NEEDS CLARIFICATION: Should the SPIN content replace the loading state entirely (always show the four SPIN items, no loading skeleton), or show skeleton until "ready" then SPIN? Recommendation: Always show the four SPIN items (static content); remove or simplify loading behavior for this panel so consultants always see SPIN tips.
- **Session not started**: Panel should still show the four SPIN items (same content before and after starting).
- **Responsive layout**: Panel remains in the same layout position; styling should work on small and large screens within the existing responsive behavior.

## Requirements (mandatory)

### Functional Requirements
- **FR-001**: The Key Objectives panel in `app/coach/spin/session/page.tsx` MUST display exactly four items, in order: S — Situation, P — Problem, I — Implication, N — Need-Payoff.
- **FR-002**: Each item MUST show: (1) the SPIN letter (S, P, I, or N) visually prominent (larger or using existing accent color), (2) the dimension name (Situation, Problem, Implication, Need-Payoff) in bold, (3) the specified coaching tip text in smaller, muted style below the label.
- **FR-003**: Copy MUST be exactly as specified: Situation — "Confirm context quickly. Do your homework first — don't ask what you should already know."; Problem — "Find the real pain. Dig past the stated issue to what's actually not working."; Implication — "Explore the consequences. What happens if this doesn't get solved?"; Need-Payoff — "Let them say the value. Ask what solving this would mean — don't tell them."
- **FR-004**: The panel container MUST retain the existing Key Objectives panel card styling (same padding, background, borders as the current glass-card; same overall layout and position). Use existing Tailwind/theme tokens per CLAUDE.md.
- **FR-005**: Implementation MUST be limited to `app/coach/spin/session/page.tsx`. Do not modify the Live Feedback panel, the chat area, the header, the End Session / scorecard link, or any logic outside the Key Objectives panel content. Do not modify files outside `app/coach/spin/session/`. Do not modify the general coach session page (e.g. `app/coach/page.tsx` or non-SPIN routes).

### Key Entities (if feature involves data)
- **Key Objectives panel**: A sidebar card on the SPIN session page that currently shows a list of objectives (from API or fallback). After this feature it shows static SPIN elements and tips only. No new data model; content is fixed in the UI.

### Non-Functional Requirements
- **NFR-001**: Visual hierarchy (letter > dimension name > tip) must be clear at a glance. Use existing brand tokens (e.g. gradient/accent for the letter, text-white/60 or similar for muted tip).

## Success Criteria (mandatory)

### Measurable Outcomes
- **SC-001**: All P1 acceptance scenarios pass: four SPIN items with correct copy and structure; panel styling matches existing card; SPIN letter prominent, dimension bold, tip muted.
- **SC-002**: No changes outside the Key Objectives panel in `app/coach/spin/session/page.tsx`; Live Feedback panel and rest of session page unchanged.
- **SC-003**: `npm run lint` and `npm run build` pass; changes conform to Directory Contract and project conventions.
