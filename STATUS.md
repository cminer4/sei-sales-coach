# SEI Sales Coach — Project Status

*Last updated: 2026-03-09*

This document summarizes where the project is: what’s shipped, how the main flows work, and what’s in place for debugging or follow-up.

---

## 1. Repo and deploy state

- **Branch:** `main`
- **Working tree:** Clean (no uncommitted changes unless you’ve edited since)
- **Recent commits (latest first):**
  - Reset demo timer to 3 minutes
  - Increase demo timer to 5min, treat in-progress as 202
  - Add 3s delay before transcript polling, add scorecard localStorage log
  - Poll for ElevenLabs transcript with up to 8 retries
  - Extract conversation_id from signed URL query param
  - Fix onConversationId callback in VoiceCoach
  - Add conversation ID debug logs
  - Add transcript and SPIN end-session debug logs
  - View System Health button fix, transcript fetch logs, ElevenLabs debug logs
  - Fix score-session: top-level try/catch, return JSON error and log fatal errors
  - feat: Use ElevenLabs voice transcript for SPIN scorecard scoring

---

## 2. What’s in place

### SPIN coach flow (voice + scorecard)

- **Demo timer:** 3 minutes (`SPIN_DEMO_LIMIT_MS = 180_000` in `app/coach/spin/session/page.tsx`). Overridable via `NEXT_PUBLIC_SPIN_DEMO_LIMIT_MS`.
- **Conversation ID:** Sourced from the signed URL query param in `/api/elevenlabs-signed-url` and returned as `conversationId`. `VoiceCoach` calls `onConversationId(conversationId)` so the SPIN session page has it when the user clicks “End Session”.
- **End Session → scorecard:**
  1. User clicks “End Session” (or timer fires and they click from overlay).
  2. **3-second delay** so ElevenLabs can finish the session.
  3. **Poll** `/api/elevenlabs-conversation-transcript` up to **8 times**, **2 seconds** apart.
  4. API returns **202** when ElevenLabs returns `status === 'processing'` or `status === 'in-progress'`; client keeps polling until **200** with non-empty transcript or gives up after 8 attempts.
  5. Transcript is written to `localStorage.spinTranscript` and user is sent to `/coach/spin/scorecard`.
- **Scorecard:** Reads `localStorage.spinTranscript` and `spinSessionType`, sends them to `/api/score-session`, then renders the returned scorecard.

### Admin and reliability

- **View System Health (Knowledge Base banner):** “View System Health” uses a callback from the admin page (`onNavigateToSystemHealth`) so the tab switches correctly instead of relying on URL + search params.
- **Score-session errors:** `/api/score-session` is wrapped in a top-level try/catch; on failure it returns JSON `{ error: message }` with status 500 and logs `[score-session] fatal error:`.

---

## 3. Key files (quick reference)

| Area | File | Purpose |
|------|------|--------|
| SPIN session | `app/coach/spin/session/page.tsx` | Demo timer, voice/text UI, `handleGoToScorecard` (3s delay + 8-attempt transcript polling) |
| SPIN scorecard | `app/coach/spin/scorecard/page.tsx` | Reads `spinTranscript` / `spinSessionType`, calls `/api/score-session`, shows scorecard |
| Voice | `components/VoiceCoach.tsx` | ElevenLabs session; calls `onConversationId(conversationId)` after signed URL response |
| Signed URL | `app/api/elevenlabs-signed-url/route.ts` | Gets signed URL, parses `conversation_id` from query string, returns it as `conversationId` |
| Transcript API | `app/api/elevenlabs-conversation-transcript/route.ts` | GETs ElevenLabs conversation; returns 202 for `processing` / `in-progress`, 200 + transcript when ready |
| Scoring | `app/api/score-session/route.ts` | Scores transcript with Claude; top-level try/catch returns 500 + error message |
| Admin KB | `components/admin/KnowledgeBaseTab.tsx` | System Health banner; uses `onNavigateToSystemHealth` when provided |
| Admin shell | `app/admin/page.tsx` | Passes `onNavigateToSystemHealth={() => setTab('system-health')}` to Knowledge Base tab |

---

## 4. Debug logging (diagnostics, can remove later)

- **SPIN session page:** `[SPIN] voiceConversationId at end session`, `[SPIN End Session]`, `[SPIN transcript fetch]` (before fetch, raw response), `[SPIN transcript]` (final transcript length/preview), `[SPIN] onConversationId callback fired with`, `[SPIN] voiceConversationId state changed to`.
- **SPIN scorecard:** `[scorecard] transcript from localStorage — length / preview` (on load and retry).
- **Signed URL API:** `[elevenlabs-signed-url]` and `[signed-url]` (ElevenLabs response, conversation_id, full response body).
- **Transcript API:** `[transcript] conversationId received`, `[transcript] ElevenLabs response status`, `[transcript] ElevenLabs raw body (first 500)`.
- **Score-session API:** `[score-session]` (transcript length/preview, fatal error in catch).

Use these to verify conversation ID flow, transcript polling, and what’s being scored. Strip or guard behind a flag when no longer needed.

---

## 5. Optional next steps

- **Clean up logs:** Remove or gate the debug logs above for production.
- **Formal spec:** If not already done, add a short spec under `specs/` for the SPIN voice-transcript-to-scorecard flow and the 202 polling contract.
- **Vercel:** Confirm `NEXT_PUBLIC_SPIN_DEMO_LIMIT_MS` (and other env vars) are set in the project’s Vercel environment if you use overrides.

---

For product and architecture details, see [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md) and [CLAUDE.md](CLAUDE.md).
