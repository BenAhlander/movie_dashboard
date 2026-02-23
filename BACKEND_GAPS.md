# FreshTomatoes — Backend Gaps and Open Questions

This document is a handoff artifact for the backend engineering team. Each item
records something found in the frontend codebase that is ambiguous, incomplete,
or requires a backend decision before the corresponding feature can ship fully.

Items are grouped by feature area. Each entry includes the relevant file path,
the nature of the gap, and a suggested resolution or question.

---

## Trivia — Question Serving

### GAP-01: `GET /api/trivia/questions` does not yet exist

**Found in:** `src/lib/trivia/gameApi.ts` line 28
**Description:** `getQuestions()` is fully client-side. It imports
`triviaQuestions` from `mockQuestions.ts`, shuffles them in the browser, and
filters by `excludeIds`. The comment on line 26 explicitly says "In a future
version this would call an API endpoint." The endpoint is now documented in
`API.md` and the schema is in `migrations/005_trivia_questions.sql`.

**Resolution needed:** Implement `GET /api/trivia/questions` as documented in
`API.md`. Once live, replace the body of `getQuestions()` in `gameApi.ts` with
a `fetch('/api/trivia/questions?...')` call. The client already passes
`excludeIds` — the function signature is ready.

---

### GAP-02: No mechanism records which questions an authenticated user answered

**Found in:** `src/hooks/useGame.ts` lines 47–63 and `src/lib/trivia/gameApi.ts` lines 52–73
**Description:** `submitRun` posts to `POST /api/trivia/runs` with a cumulative
`score` and `total`. There is no field in that request body for the IDs of
questions answered in the run. The `trivia_user_answers` table (migration 005)
cannot be populated without knowing which question IDs were served.

**Resolution options (choose one):**

A. Extend `POST /api/trivia/runs` to accept a `questionIds: string[]` field in
   the request body. The route handler inserts rows into `trivia_user_answers`
   atomically with the run insert.

B. Add a separate `POST /api/trivia/answers` endpoint the client calls at the
   end of each round with the list of answered question IDs. This keeps runs
   and answer tracking decoupled but requires a second network request.

**Recommendation:** Option A is simpler — the client already has
`state.questions.map(q => q.id)` available when `submitRun` is called (see
`useGame.ts` line 187). Add `questionIds` to the POST body and populate
`trivia_user_answers` in the same DB transaction as the run insert.

---

### GAP-03: `usedQuestionIds` is session-only; repeat avoidance resets on page reload

**Found in:** `src/hooks/useGame.ts` line 38 (`usedQuestionIds: questions.map(q => q.id)`)
**Description:** The `usedQuestionIds` array lives in `useReducer` state. It
accumulates across rounds within a session but is lost when the page refreshes.
An authenticated user can get repeat questions by refreshing between rounds.
The `trivia_user_answers` table is designed to solve this cross-session
exclusion, but only if the questions endpoint is actually reading from it.

**Resolution needed:** Confirm the intended behaviour with the product team:
- Should repeat avoidance be session-scoped (current behaviour) or
  cross-session for authenticated users (requires the questions endpoint +
  trivia_user_answers)?
- What is the recency window? The data model proposes 30 days. This is an
  application-level constant with no DB enforcement.

---

### GAP-04: `trivia_questions.id` uses short text keys (`q01`–`q45`), not UUIDs

**Found in:** `src/lib/trivia/mockQuestions.ts` lines 10–417
**Description:** Every other PK in this project uses `gen_random_uuid()`. The
question pool uses human-readable text IDs to keep `excludeIds` values readable
in URLs and localStorage. This is intentional (documented in migration 005) but
worth flagging for the backend team.

**Impact:** The `excludeIds` query parameter in `GET /api/trivia/questions`
will contain values like `q01,q14,q22`. This is fine for the current pool size
but will require a naming convention when new questions are added (e.g.
`q046`, `q047`, ..., or switch to UUIDs for new entries while keeping legacy
IDs for the seed data).

**Resolution needed:** Decide on the ID convention for new questions before
the first question is added after the seed. Document the convention in the
API route or a README comment.

---

### GAP-05: `q19` seed data contains a factual error

**Found in:** `src/lib/trivia/mockQuestions.ts` line 178
**Description:** Question `q19` has `statement: 'This show premiered on HBO in 2008.'`
with `answer: true` and `title: 'Breaking Bad'`. Breaking Bad premiered on AMC,
not HBO. The statement is marked `true` in the source data, making it a
question with a wrong correct answer.

**Resolution needed:** Before or after migration 005 is applied, run:

```sql
UPDATE trivia_questions
SET answer = FALSE, updated_at = now()
WHERE id = 'q19';
```

The seed INSERT uses `ON CONFLICT DO NOTHING`, so this cannot be fixed by
re-running the migration. A separate correction script or a migration 005b is
required.

---

## Trivia — Leaderboard

### GAP-06: Rate limit in `POST /api/trivia/runs` is 5 seconds, documented as 30 seconds

**Found in:** `src/app/api/trivia/runs/route.ts` line 73
**Description:** The code checks `Date.now() - lastPlayedMs < 5_000` (5
seconds). `API.md` previously documented this as "within 30 seconds." The code
was updated but the documentation was stale. The `API.md` entry has been
corrected in this audit to say "5 seconds" — confirm this is intentional.

**Resolution needed:** Confirm the intended rate limit window. If 30 seconds
was the original design intent, update the code. The current 5-second window
allows a user to submit a new run almost immediately after the previous one.

---

### GAP-07: Leaderboard aggregates cumulative score across all runs per user

**Found in:** `src/app/api/trivia/leaderboard/route.ts` lines 46–65
**Description:** The leaderboard query uses `SUM(score)` and `SUM(total)`
across all runs per user (or all runs in the last 24 hours for the `today`
period). This means a user who plays 10 rounds of 5 questions each appears on
the leaderboard as `score=X, total=50`, competing against users who played one
long session.

This is consistent with the `trivia_runs` schema (which stores cumulative
session totals, not per-round totals — `useGame.ts` submits the round score
and round total, not the session cumulative). However the leaderboard then
re-aggregates those per-round submissions into a lifetime or daily total.

**Resolution needed:** Confirm with the product team that this is the intended
leaderboard semantics. If the intent is "best single-session pct", the query
should use `DISTINCT ON (user_id) ORDER BY user_id, pct DESC` (which is what
migration 004 was optimised for in its index comments, but is not what the
current route code does).

---

## Auth

### GAP-08: `isAuthenticated` is determined client-side and not verified by `GET /api/trivia/questions`

**Found in:** `src/components/trivia/TriviaGame.tsx` line 21; `src/hooks/useGame.ts` line 161
**Description:** `useGame(isAuthenticated)` receives a boolean from
`useUser()`. This flag controls whether `submitRun` fires. The planned
`GET /api/trivia/questions` endpoint uses the server-side Auth0 session to
optionally exclude seen questions. There is no mismatch for question serving
(the endpoint is safe to call unauthenticated), but the client could pass
`excludeIds` that reference questions never actually served to this user if the
session check fails silently.

**Resolution needed:** No immediate action required. Note that if the questions
endpoint becomes authenticated-only in future, the client-side `isAuthenticated`
check would need to stay in sync with the server session, which Auth0 SDK
handles automatically via cookie-based sessions.

---

## General

### GAP-09: No migration runner tracks which migrations have been applied

**Found in:** `migrations/` directory; `src/app/api/migrate/route.ts`
**Description:** There is no `schema_migrations` table or external tool (e.g.
Flyway, golang-migrate, Atlas) tracking which numbered migration files have
been run. The `/api/migrate` route applies some migrations inline (using `IF
NOT EXISTS` guards) but does not cover all migration files in `migrations/`.
Migration 001 and 004 are SQL files; migration 005 is new. The docs folder
also contains `.md` files with SQL that are not run by any automated process.

**Resolution needed:** Either:
A. Establish a simple `schema_migrations` table and have a migration runner
   (even a small Node script) record which files have been applied; or
B. Document the manual apply order (001, 004, 005) in a README and accept that
   applying migrations is a manual DBA step.

The existing `migrations/run.mjs` may address this — its contents were not
audited. Check whether it already handles ordered execution and idempotency
tracking before implementing a new solution.

---

### GAP-10: `docs/polls_migration.md` and `docs/favorites_migration.md` contain SQL not covered by the numbered migration sequence

**Found in:** `docs/` directory
**Description:** The `migrations/` directory contains `001_feedback_tables.sql`
and `004_trivia_runs.sql`. Migrations 002 (polls) and 003 (favorites) exist
only as `.md` files in `docs/` with embedded SQL, outside the numbered sequence.
This creates ambiguity about apply order.

**Resolution needed:** Either move the polls and favorites SQL into numbered
`migrations/002_polls.sql` and `migrations/003_favorites.sql` files, or
document clearly that `docs/*.md` SQL must be applied before `004_trivia_runs.sql`.
