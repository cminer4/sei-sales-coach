# Exploration: SEI Geopolitical Intelligence — Live Brief Generation API (MVP)

**Spec**: [specs/features/SEI-41-geopolitical-live-brief-generation-api-mvp.md](../features/SEI-41-geopolitical-live-brief-generation-api-mvp.md)  
**Linear**: [SEI-41](https://linear.app/sei-interview-app/issue/SEI-41/sei-geopolitical-intelligence-live-brief-generation-api-mvp)  
**Plan**: [specs/geopolitical-live-brief-generation-api-mvp/plan.md](../geopolitical-live-brief-generation-api-mvp/plan.md)  
**Explored**: 2026-03-17  
**Status**: Ready to plan

---

## What This Feature Does (Business Value)

Your geopolitical briefing product needs a reliable way to turn **fresh world news and company context** into a **structured risk brief** users can trust. This MVP builds the **backend engine only**: three steps (gather research when someone enters the room, deepen it after they describe their business, then produce the brief when they open it). No screens ship in this ticket — you get something you can **demo and test with one script** before investing in the full UI. That reduces wasted build time if the research or brief quality needs tuning.

---

## How It Fits Into Your App

- **Connects to**: A future onboarding flow (“Enter briefing room”), chat intake, and brief pane (prototype exists separately). It also sits alongside your existing app (SPIN coach, assessment) without changing those flows.
- **Depends on**: **None** inside the app — only **Perplexity** and **Anthropic** accounts and API keys. The frontend that calls these URLs comes later.
- **Will touch**: **New backend endpoints** only (plus a developer test script). No customer-facing pages in this slice.

---

## What's Clear

- Three-stage pipeline (init → enrich → generate) with clear handoffs via `researchId`.
- **30-minute** research lifetime with **410 Gone** when stale so you never mix old news with a new session.
- **Eight fixed regions** — matches onboarding chips; bad input is rejected up front so briefs stay sharp.
- Perplexity failures during init or enrich **do not block** the user; empty context is allowed; synthesis still runs.
- Claude output must be **strict JSON** with **one retry** if parsing fails; otherwise **500** with raw text for debugging.
- **Definition of done** is partly **mechanical**: test script prints **PASS/FAIL** on probabilities, scenario tags, and implication counts.
- **Thin AI layer** in shared code so testing and future provider swaps stay cheap.
- Missing env vars must say **exactly which key** is missing (e.g. `PERPLEXITY_API_KEY`) for fast demos.

---

## What Needs Clarification

**None blocking.** TTL: **30 minutes** is locked for MVP; **extend session** is **v2**. Exec demos in a controlled setting re-init on expiry if needed.

---

## Risks to Consider

- **User experience (latency)**: If both Perplexity calls on init are slow, a UI that **waits** for `researchId` before showing chat will feel sluggish. **Mitigation**: architecture already fits **background init**; the **frontend wiring spec** must be explicit — **fire `POST /api/research/init` on form submit, do not await before showing chat, store `researchId` asynchronously** (chat questions absorb the wait). See spec **NC-006**.
- **Trust and quality**: Partial or empty research must not read as overconfident. **Mitigation in SEI-41**: **FR-019** — Claude must use **hedged language** where context is missing and **must not fabricate** company- or region-specific detail to fill gaps.
- **Security**: These endpoints have **no auth** in MVP. Anyone who can hit your deployment could burn API credits or pull briefs if URLs leak. Fine for internal demo; **not** fine for public launch without protection.
- **Performance / scale**: In-memory storage **resets** on server restarts (typical on serverless). A user mid-flow could lose `researchId` — they re-onboard. Acceptable for MVP; not for high traffic.
- **Timeline**: Prompt tuning (Perplexity + Claude) and JSON shape stability often take **extra iteration** beyond the first working pass — plan already budgets for that.

---

## Edge Cases We Should Handle

- **Spec alignment**: Unknown `researchId` → **404**; expired → **410** (now explicit in user stories for enrich and generate).
- **Very long free-text answers** — may hit model limits; spec notes possible truncation later.
- **Demo on preview URLs** — ensure env keys are set on the right environment so “missing key” errors are obvious.

---

## Recommendation

**Ready to implement** — TTL and exec-demo posture decided; UX latency path documented for frontend spec; synthesis prompt constrained for empty research (FR-019).

---

## Suggested Next Steps

1. **Implement** SEI-41 on branch `SEI-41-geopolitical-live-brief-generation-api-mvp` (tests first for pure logic + mocked AI); include **FR-019** in the synthesis prompt.
2. **Run** `npx ts-node scripts/test-brief-pipeline.ts` until **PASS** and spot-check grounding.
3. **Frontend spec** next: **async init** (NC-006), enrich, brief pane, **410** re-init copy; optional future UI for “limited research” if still needed after FR-019.
