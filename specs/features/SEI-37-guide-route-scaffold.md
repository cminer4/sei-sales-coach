---
linear: https://linear.app/sei-interview-app/issue/SEI-37/guide-route-structure
ticket: SEI-37
---

# Feature Specification: Guide Route Structure Scaffold

**Feature Branch**: `SEI-37-guide-route-scaffold`
**Created**: 2026-03-10
**Status**: Complete
**Linear Ticket**: [SEI-37](https://linear.app/sei-interview-app/issue/SEI-37/guide-route-structure)
**Input**: User description: "Create /guide route structure (do not rename /coach)"

## Context

The `/coach/*` routes serve outward-facing client tools (SPIN Sales Coach). The `/guide/*` routes are for **internal SEI tools** — teaching and enablement agents used by SEI consultants.

This scaffold creates the foundation for internal agents, starting with the AI Assessment Coach placeholder.

**Key constraint**: Do NOT rename, move, or modify anything under `/coach/`. These routes are intentionally separate and serve different audiences.

## Requirements

### Functional Requirements

- **FR-001**: Create `app/guide/page.tsx` — Landing page listing internal SEI tools
- **FR-002**: Create `app/guide/assessment/page.tsx` — Placeholder page for AI Assessment Coach
- **FR-003**: Both pages MUST use existing brand tokens (plum backgrounds, glass-card styling)
- **FR-004**: System MUST NOT modify any files under `app/coach/`

### Non-Functional Requirements

- **NFR-001**: `npm run build` MUST pass after implementation
- **NFR-002**: Routes MUST render without 404 errors

## Success Criteria

- **SC-001**: `/guide` and `/guide/assessment` routes exist and render
- **SC-002**: Build passes with `npm run build`
- **SC-003**: Zero files modified under `app/coach/` (verified via `git diff`)
- **SC-004**: Commit message: `feat: scaffold /guide route structure for internal agents`

## Files Created

| File | Purpose |
|------|---------|
| `app/guide/page.tsx` | Landing page with card for Assessment Coach |
| `app/guide/assessment/page.tsx` | Placeholder (replaced by SEI-38) |

## Implementation Reference

See `specs/guide-route-scaffold/implementation-log.md` for details.
