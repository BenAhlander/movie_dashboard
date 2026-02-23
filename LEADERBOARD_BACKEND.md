# Leaderboard Backend Implementation — FreshTomatoes Trivia

**Date:** 2026-02-22
**Status:** Implementation Ready
**Phase:** 2 (Database and API routes)
**Design source:** `LEADERBOARD_DESIGN.md`

---

## 1. Overview

This document specifies the complete backend implementation for the authenticated
trivia leaderboard feature. It covers the database schema, three new API routes,
Auth0 session integration, and the changes needed to `gameApi.ts` to wire the
frontend to the real data layer.

The existing app already has:
- Auth0 (`@auth0/nextjs-auth0`) wired in `src/lib/auth0.ts` — the `auth0` export
  is either a configured `Auth0Client` or `null` depending on whether all five
  auth env vars are present.
- `hasAuthEnabled()` in `src/lib/hasAuth.ts` — gate for auth-dependent features.
- `getDb()` and `hasDatabase()` in `src/services/db.ts` — Neon Postgres client.
- The pattern of calling `auth0.getSession()` inside POST handlers to get
  `session.user.sub` (used in `src/app/api/favorites/route.ts` and
  `src/app/api/feedback/route.ts`).

---

## 2. Environment Variables

No new environment variables are required beyond what is already documented.
The following must be set for full functionality:

| Variable            | Purpose                                   | Required for feature |
|---------------------|-------------------------------------------|----------------------|
| `POSTGRES_URL`      | Neon Postgres connection string           | Yes — DB writes      |
| `AUTH0_SECRET`      | Auth0 session encryption key             | Yes — auth           |
| `AUTH0_DOMAIN`      | Auth0 tenant domain                      | Yes — auth           |
| `AUTH0_CLIENT_ID`   | Auth0 application client ID              | Yes — auth           |
| `AUTH0_CLIENT_SECRET` | Auth0 application client secret        | Yes — auth           |
| `APP_BASE_URL`      | Application base URL for Auth0 callbacks | Yes — auth           |

If `POSTGRES_URL` is missing, `POST /api/trivia/runs` returns `503`. The
leaderboard GET route returns an empty rows array with `demo: true`.

If auth is not configured (`hasAuthEnabled()` returns `false`), `auth0` is `null`.
The POST run route must check for `null` before calling `auth0.getSession()`.

---

## 3. Data Model

### 3.1 `trivia_runs` table

Each row represents one completed game session submitted by an authenticated user.
User identity and display data (username, avatar) are **snapshot values** captured
at submission time. They are not joined from a users table on read, which keeps
leaderboard queries fast and avoids dependency on external profile data remaining
fresh.

```typescript
// Database row shape (internal, not exposed directly)
interface TriviaRunRow {
  id: string           // UUID primary key
  user_id: string      // Auth0 sub — e.g. 'google-oauth2|117...'
  username: string     // Google display name at time of submission
  avatar_url: string | null  // Google profile photo URL at time of submission
  score: number        // Correct answers in cumulative session
  total: number        // Total questions answered in cumulative session
  pct: number          // score / total * 100, stored as NUMERIC(5,2) for sort efficiency
  played_at: string    // TIMESTAMPTZ — submission timestamp
}
```

**Why store `pct` as a column rather than computing it?**
The leaderboard query uses `DISTINCT ON (user_id) ORDER BY user_id, pct DESC` to
find each user's best run. PostgreSQL requires the ORDER BY columns to appear in
the SELECT list when using DISTINCT ON. Storing `pct` avoids a computed expression
in the ORDER BY, making the index usable.

**Why snapshot username and avatar_url?**
Google display names and profile photos can change. Leaderboards conventionally
show the name at the time the score was set. This also avoids the need for a
separate user profile table or Auth0 Management API lookups on every leaderboard
read. The tradeoff is that name changes are not retroactive — this is documented
as intentional in `LEADERBOARD_DESIGN.md` section 8.1.

### 3.2 TypeScript type additions

Add these fields to `LeaderboardRow` in `/Users/benahlander/Documents/Dev/movie_dashboard/src/types/trivia.ts`:

```typescript
// Updated LeaderboardRow in src/types/trivia.ts
export interface LeaderboardRow {
  rank: number
  username: string
  score: number
  total: number
  isCurrentUser?: boolean
  // Fields added for authenticated leaderboard (Phase 2)
  avatarUrl?: string | null   // null means show initials fallback
  userId?: string             // Auth0 sub, used client-side to detect isCurrentUser
  pct?: number                // score / total * 100, for display in the % column
}
```

The `avatarUrl` and `userId` fields are optional to maintain backward compatibility
with the mock data path and Phase 1 UI work.

### 3.3 Entity relationships

```
Auth0 (external)
  user.sub  ──────┐
  user.name       │ snapshotted at write time
  user.picture    │
                  ↓
            trivia_runs
              user_id (TEXT, not FK — no users table in this DB)
              username
              avatar_url
              score
              total
              pct
              played_at
```

There is no `users` table in the Neon database. Auth0 is the authoritative user
store. `user_id` in `trivia_runs` stores the Auth0 `sub` as plain text. This is
consistent with the existing pattern in `user_favorites`, `polls`, `poll_votes`,
and `feedback_posts` (all store `author_id` / `user_id` as `TEXT` or `VARCHAR`).

---

## 4. API Routes

### POST /api/trivia/runs

**File:** `src/app/api/trivia/runs/route.ts`

**Description:** Saves a completed trivia game run for the authenticated user.
Returns the run's UUID and the user's new rank in the "today" period so the
client can display it immediately without a second fetch.

**Authentication:** Required. Calls `auth0.getSession()`. Returns `401` if no
session exists or if auth is not configured.

**Request**
- Headers: `Content-Type: application/json` (standard)
- Body:

```typescript
interface SubmitRunRequest {
  score: number   // correct answers in the cumulative session (0 <= score <= total)
  total: number   // total questions answered (must be >= 1)
}
```

**Validation rules (enforce in route handler):**
- `score` must be a non-negative integer
- `total` must be a positive integer
- `score` must be <= `total`
- Both fields are required

**Rate limiting:** Before inserting, query the user's most recent run and reject
if `played_at > NOW() - INTERVAL '30 seconds'`. Return `429` with body
`{ error: 'Too many submissions' }`. This prevents rapid-fire spam while being
tolerant of normal play (a round takes at minimum 5 questions * a few seconds
each).

**Response (201):**

```typescript
interface SubmitRunResponse {
  id: string      // UUID of the created run
  rank: number    // user's rank in the 'today' period after this submission
  period: 'today' // always 'today' — rank is computed for the current day
}
```

**Computing rank in the response:** After the INSERT, run the "today" leaderboard
query (see section 5.2) and find the position of the newly created `user_id` in
the result. If the user's best run for today is not the newly submitted run (they
had a better prior run today), the rank reflects their existing best. If the user
does not appear in the top 25, their rank is still computed — extend the leaderboard
query to 1000 rows for rank computation or use a COUNT query.

A simpler approach that avoids an expensive rank scan: use a COUNT query.

```sql
-- Rank = number of distinct users with a better best-pct today, plus 1
WITH best_per_user AS (
  SELECT DISTINCT ON (user_id)
    user_id,
    pct,
    score
  FROM trivia_runs
  WHERE played_at >= NOW() - INTERVAL '24 hours'
  ORDER BY user_id, pct DESC, score DESC
)
SELECT COUNT(*) + 1 AS rank
FROM best_per_user
WHERE pct > $user_pct
  OR (pct = $user_pct AND score > $user_score);
```

Where `$user_pct` and `$user_score` are the submitted values for this run (or
the user's existing best if that is higher).

**Error responses:**

| Status | Condition |
|--------|-----------|
| `400`  | `score` or `total` missing, not a number, negative, or `score > total` |
| `401`  | Auth not configured or no active session |
| `429`  | Submission within 30 seconds of prior run |
| `503`  | `POSTGRES_URL` not set |
| `500`  | DB insert or rank query failed |

**Used by:** `src/lib/trivia/gameApi.ts` `submitRun()` (after Phase 2 update)

---

### GET /api/trivia/leaderboard

**File:** `src/app/api/trivia/leaderboard/route.ts`

**Description:** Returns ranked leaderboard rows for the selected period. Public
endpoint — no authentication required. Each user appears at most once (their best
run for the period).

**Authentication:** Not required.

**Request**
- Query params:

| Param    | Type                | Default  | Description                          |
|----------|---------------------|----------|--------------------------------------|
| `period` | `'today' \| 'allTime'` | `'today'` | Time window for the leaderboard |
| `limit`  | `number`            | `25`     | Max rows to return (1-100)           |

**Response (200):**

```typescript
interface LeaderboardResponse {
  period: 'today' | 'allTime'
  rows: LeaderboardApiRow[]
  updatedAt: string   // ISO 8601 — set to Date.now() at response time
  demo?: boolean      // true when POSTGRES_URL is not set
}

interface LeaderboardApiRow {
  rank: number
  userId: string          // Auth0 sub — client uses this to match isCurrentUser
  username: string
  avatarUrl: string | null
  score: number
  total: number
  pct: number             // stored value — score / total * 100, e.g. 85.00
}
```

**Caching:** Set `Cache-Control: s-maxage=30, stale-while-revalidate=60` on the
response. This allows a CDN or Next.js cache to serve the leaderboard for 30
seconds before revalidating, reducing database load. When a user submits a new
run and wants to see their updated rank immediately, the client appends a
cache-bust query param (e.g. `?period=today&t=<timestamp>`) on the refetch after
a successful POST. This bypasses the CDN cache for that single request without
invalidating the cache for other users.

**Demo mode fallback:** When `POSTGRES_URL` is not set, return:
```json
{
  "period": "today",
  "rows": [],
  "updatedAt": "<now>",
  "demo": true
}
```
The client falls back to `mockLeaderboardEntries` when `demo: true` or when the
fetch fails.

**Error responses:**

| Status | Condition |
|--------|-----------|
| `400`  | Invalid `period` value (not `today` or `allTime`) |
| `500`  | DB query failed |

**Used by:** `src/lib/trivia/gameApi.ts` `getLeaderboard()` (after Phase 2 update)

---

### GET /api/trivia/leaderboard/rank

**File:** `src/app/api/trivia/leaderboard/rank/route.ts`

**Description:** Returns the rank a given score would achieve in the specified
period. Used to show anonymous users their "ghost" rank without writing to the
database. Pure read — no authentication required.

**Authentication:** Not required.

**Request**
- Query params:

| Param    | Type                   | Required | Description                       |
|----------|------------------------|----------|-----------------------------------|
| `score`  | `number`               | Yes      | Correct answers                   |
| `total`  | `number`               | Yes      | Total questions                   |
| `period` | `'today' \| 'allTime'` | No       | Defaults to `'today'`             |

**Response (200):**

```typescript
interface RankResponse {
  rank: number     // 1-based position where this score would land
  period: 'today' | 'allTime'
  totalPlayers: number  // total distinct users in this period (for context)
}
```

**Implementation:** Compute the rank using the same COUNT approach as in the
POST route. `pct` for the query = `(score / total) * 100`.

```sql
WITH best_per_user AS (
  SELECT DISTINCT ON (user_id)
    user_id, pct, score
  FROM trivia_runs
  -- WHERE played_at >= NOW() - INTERVAL '24 hours'  -- for 'today' period only
  ORDER BY user_id, pct DESC, score DESC
),
total_count AS (
  SELECT COUNT(*) AS total_players FROM best_per_user
)
SELECT
  (SELECT COUNT(*) + 1 FROM best_per_user
   WHERE pct > $pct OR (pct = $pct AND score > $score)) AS rank,
  (SELECT total_players FROM total_count) AS total_players;
```

**Error responses:**

| Status | Condition |
|--------|-----------|
| `400`  | `score` or `total` missing or invalid; `score > total` |
| `500`  | DB query failed |

**Used by:** `src/components/trivia/LeaderboardScreen.tsx` ghost row caption
(⚠️ This route is defined in the design doc but not yet called in the frontend
code — the design doc section 6.2 describes computing rank client-side instead.
See section 8 for the gap analysis.)

---

## 5. SQL Queries

### 5.1 Insert a run

```sql
INSERT INTO trivia_runs (user_id, username, avatar_url, score, total, pct)
VALUES ($1, $2, $3, $4, $5, ROUND(($4::numeric / NULLIF($5, 0)) * 100, 2))
RETURNING id, played_at;
```

Parameters: `[$user_id, $username, $avatar_url, $score, $total]`

`pct` is computed from the application parameters at insert time. Do not let the
caller supply `pct` directly — always derive it from `score` and `total` to
prevent data inconsistency.

### 5.2 Leaderboard query — today period

```sql
WITH best_runs AS (
  SELECT DISTINCT ON (user_id)
    user_id,
    username,
    avatar_url,
    score,
    total,
    pct,
    played_at
  FROM trivia_runs
  WHERE played_at >= NOW() - INTERVAL '24 hours'
  ORDER BY user_id, pct DESC, score DESC
)
SELECT
  ROW_NUMBER() OVER (ORDER BY pct DESC, score DESC, played_at ASC) AS rank,
  user_id,
  username,
  avatar_url,
  score,
  total,
  pct
FROM best_runs
ORDER BY pct DESC, score DESC, played_at ASC
LIMIT $limit;
```

The `played_at ASC` tiebreaker means that when two users have the same `pct` and
`score`, the one who set their best score first ranks higher. This is a fair
convention — first to the score wins the tiebreak.

### 5.3 Leaderboard query — all time period

Same as above, with the `WHERE played_at >= ...` clause removed.

### 5.4 Rate limit check

```sql
SELECT played_at
FROM trivia_runs
WHERE user_id = $user_id
ORDER BY played_at DESC
LIMIT 1;
```

If the returned `played_at` is within the last 30 seconds, reject the submission.

### 5.5 Rank for anonymous user (GET /api/trivia/leaderboard/rank)

```sql
WITH best_per_user AS (
  SELECT DISTINCT ON (user_id)
    user_id, pct, score
  FROM trivia_runs
  -- Omit WHERE for allTime, include for today:
  WHERE played_at >= NOW() - INTERVAL '24 hours'
  ORDER BY user_id, pct DESC, score DESC
)
SELECT
  (
    SELECT COUNT(*) + 1
    FROM best_per_user
    WHERE pct > $pct
       OR (pct = $pct AND score > $score)
  ) AS rank,
  COUNT(*) AS total_players
FROM best_per_user;
```

---

## 6. Auth0 Integration

### 6.1 Session retrieval pattern

All existing auth-gated routes in this project use the same pattern. Follow it
exactly in the new trivia routes:

```typescript
import { auth0 } from '@/lib/auth0'

// Inside the route handler:
if (!auth0) {
  return NextResponse.json(
    { error: 'Authentication required' },
    { status: 401 }
  )
}

const session = await auth0.getSession()
if (!session) {
  return NextResponse.json(
    { error: 'Authentication required' },
    { status: 401 }
  )
}

const userId = session.user.sub as string
const username = session.user.name ?? 'Anonymous'
const avatarUrl = session.user.picture ?? null
```

This is identical to the pattern in `src/app/api/favorites/route.ts` lines 59-70
and `src/app/api/polls/route.ts` lines 198-211.

### 6.2 Fields from Auth0 session

| Session field          | Maps to DB column   | Notes |
|------------------------|---------------------|-------|
| `session.user.sub`     | `trivia_runs.user_id` | Always present for Auth0 sessions |
| `session.user.name`    | `trivia_runs.username` | Google display name; fall back to `'Anonymous'` if null |
| `session.user.picture` | `trivia_runs.avatar_url` | Google profile photo; may be null; may expire over time |

`session.user.picture` URLs from Google (`lh3.googleusercontent.com`) may return
403 after some time. The frontend handles this gracefully via MUI `Avatar`'s
`onError` — when the `src` image fails, MUI renders the `children` (initials)
instead. No special backend handling is needed.

### 6.3 `hasAuthEnabled()` gate

`auth0` is `null` when any of the five required env vars are missing. The route
must check for `null` before calling any method on it. This is the same guard
already in `src/app/api/favorites/route.ts`:

```typescript
if (!auth0) {
  return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
}
```

### 6.4 Auth flow for score submission

1. User completes a trivia round.
2. `TriviaGame.tsx` calls `useUser()` from `@auth0/nextjs-auth0/client` to check
   auth state.
3. If `user` is defined, `submitRun()` is called with `isAuthenticated: true`.
4. `gameApi.ts` `submitRun()` POSTs to `/api/trivia/runs`.
5. The route handler calls `auth0.getSession()` server-side to verify the session
   cookie (the Auth0 SDK handles cookie parsing internally).
6. On success, the response includes `{ id, rank, period }`.
7. `TriviaGame.tsx` passes `rank` to `LeaderboardScreen` for display.

If the user is not authenticated, `submitRun()` returns `{ saved: false }` without
making a network request. No 401 is ever sent for unauthenticated users — the
client-side gate prevents the call.

---

## 7. Updated `gameApi.ts`

**File:** `/Users/benahlander/Documents/Dev/movie_dashboard/src/lib/trivia/gameApi.ts`

The current `submitRun` is a synchronous no-op. The current `getLeaderboard` reads
from mock data. Both must be updated for Phase 2.

### 7.1 Updated `submitRun`

```typescript
// src/lib/trivia/gameApi.ts

export async function submitRun(
  score: number,
  total: number,
  isAuthenticated: boolean,
): Promise<{ saved: boolean; rank?: number }> {
  if (!isAuthenticated) return { saved: false }

  try {
    const res = await fetch('/api/trivia/runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score, total }),
    })
    if (!res.ok) return { saved: false }
    const data = await res.json()
    return { saved: true, rank: data.rank }
  } catch {
    return { saved: false }
  }
}
```

### 7.2 Updated `getLeaderboard`

```typescript
// src/lib/trivia/gameApi.ts

export async function getLeaderboard(
  period: LeaderboardPeriod,
  currentUserId?: string,
): Promise<LeaderboardRow[]> {
  try {
    const res = await fetch(`/api/trivia/leaderboard?period=${period}`)
    if (!res.ok) throw new Error('fetch failed')
    const data = await res.json()

    // Demo mode or empty leaderboard — fall back to mock
    if (data.demo || !data.rows?.length) {
      return mockLeaderboardEntries.map((e, i) => ({ ...e, rank: i + 1 }))
    }

    return (data.rows as LeaderboardApiRow[]).map((row) => ({
      rank: row.rank,
      username: row.username,
      score: row.score,
      total: row.total,
      pct: row.pct,
      avatarUrl: row.avatarUrl,
      userId: row.userId,
      isCurrentUser: currentUserId ? row.userId === currentUserId : false,
    }))
  } catch {
    // Network failure or API error — fall back to mock
    return mockLeaderboardEntries.map((e, i) => ({ ...e, rank: i + 1 }))
  }
}
```

Note: `LeaderboardApiRow` is the API response shape defined in section 4. It
should be typed locally in `gameApi.ts` (not exported from `types/trivia.ts`)
since it is an internal API response contract, not a UI model.

### 7.3 Signature changes to callers

`submitRun` gains an `isAuthenticated` parameter. Update the call site in
`src/hooks/useGame.ts` to pass the auth state.

`getLeaderboard` drops the `userScore` and `userTotal` parameters (the mock
data injection logic moves to the client component). It gains `currentUserId`.
Update `LeaderboardScreen.tsx` accordingly.

---

## 8. Component Changes Required

These are frontend changes triggered by the backend work. Listed here so the
full scope of Phase 2 is clear to both teams.

### 8.1 `TriviaGame.tsx`

- Import `useUser` from `@auth0/nextjs-auth0/client`
- Pass `isAuthenticated` and `currentUserId` to `ResultsScreen` and
  `LeaderboardScreen` as props
- Call the async `submitRun(score, total, isAuthenticated)` when transitioning
  from 'playing' to 'results'
- Store returned `rank` in local state to pass to `LeaderboardScreen`

### 8.2 `LeaderboardScreen.tsx`

- Accept `isAuthenticated: boolean`, `currentUserId?: string`, and
  `authEnabled: boolean` as new props (per design doc section 12)
- Change the `useEffect` to call the async `getLeaderboard(period, currentUserId)`
  and manage loading state with `useState`
- Remove the old `userScore` injection into the mock data (that logic now lives
  in the API)
- Render `LeaderboardAnonBanner` when `!isAuthenticated && authEnabled`
- Render `LeaderboardGhostRow` with client-side computed rank when not authenticated

### 8.3 `LeaderboardScreen.tsx` — passing `authEnabled`

The cleanest approach per the design doc is to read `authEnabled` from the
layout context. The page (`src/app/trivia/page.tsx` or equivalent) can pass it
as a serialized prop from `hasAuthEnabled()` called server-side. This avoids
reading environment variables client-side (which would require `NEXT_PUBLIC_`
prefix).

---

## 9. Migration

The migration SQL file is at:
`/Users/benahlander/Documents/Dev/movie_dashboard/migrations/004_trivia_runs.sql`

**Why `004`?** The existing `migrations/` directory contains `001_feedback_tables.sql`.
The `POST /api/migrate` route contains inline SQL for migrations 002 (feedback
comments and status) and 003 (polls tables). Numbering this as `004` maintains the
logical sequence. If the project later formalizes a migration runner that tracks
applied migrations by filename, the numbering will need to be reconciled against
what the runner tracks. See the gaps section for this recommendation.

Run the migration against the Neon database before deploying the new routes:

```bash
# Using the existing run.mjs pattern — adapt to run 004_trivia_runs.sql
node migrations/run.mjs
```

Or via the existing `/api/migrate` endpoint pattern — the trivia migration SQL
can be added to that handler, though a dedicated endpoint
(`POST /api/migrate-trivia`) is cleaner and matches the `migrate-favorites`
precedent.

---

## 10. Gaps and Open Questions

### 10.1 Ghost row rank is computed client-side, not via the API

The design doc (section 6.2) states: "The #N is computed client-side by inserting
the anonymous score into the fetched leaderboard and finding its position — this
is pure UI math, no DB write."

The API route `GET /api/trivia/leaderboard/rank` is specified here and in the
design doc but the frontend does not currently call it. The client-side rank
computation is sufficient for leaderboards with up to 25 rows (the default limit),
but will give incorrect results when the ghost user's rank would fall outside the
top 25 (the user scores lower than rank 25 but does not know their true position
among all players).

**Recommendation:** Implement `GET /api/trivia/leaderboard/rank` and call it when
the anonymous user's score does not appear in the returned top-N rows. Client-side
math is fine as a first approximation.

### 10.2 `LeaderboardPeriod` type mismatch

`src/types/trivia.ts` defines `LeaderboardPeriod = 'today' | 'allTime'`.
The design doc and this specification use `allTime` (camelCase) as the query
param value. The API route must accept `allTime` and map it to the appropriate
SQL (no date filter). Document this explicitly in the route implementation —
`allTime` with capital T is easy to get wrong in a query string.

### 10.3 No migration runner tracks applied migrations

The project has `migrations/001_feedback_tables.sql` and `migrations/run.mjs`,
but subsequent migrations (002, 003) were inlined into the `/api/migrate` route.
This creates a split-brain situation — `run.mjs` only applies migration 001, while
the full schema requires also hitting `/api/migrate`. There is no mechanism to
know which migrations have been applied to a given database.

**Recommendation:** Either update `run.mjs` to apply all `.sql` files in
`migrations/` in numeric order, or create separate dedicated migration endpoints
per the `migrate-favorites` pattern and document the apply order.

### 10.4 Rate limiting is in-application only

The 30-second rate limit in the POST route is a DB-read check, not a
middleware-level rate limit. A determined user could bypass it by clearing cookies
between requests or using multiple accounts. For v1 this is acceptable.

**Future:** Add a Vercel Edge middleware or `@upstash/ratelimit` integration for
IP-based rate limiting if abuse becomes an issue.

### 10.5 No index on `(user_id, played_at DESC)` for rate limit check

The rate limit query (`SELECT played_at FROM trivia_runs WHERE user_id = $1 ORDER BY played_at DESC LIMIT 1`) is served by the `idx_trivia_runs_user_id` index on
`user_id`. Without a composite index on `(user_id, played_at DESC)`, Postgres
may need to scan all rows for that user and sort. For the current scale this is
fine, but add the composite index if the table grows large.

The migration in `004_trivia_runs.sql` includes this composite index as a comment
with a note that it can be added as an optimization.

### 10.6 Claim pending score flow is not implemented

The design doc (section 7.2) describes saving the last score to `localStorage`
under `trivia_pending_score` before redirecting to login, then claiming it on
return. This is deferred to Phase 3 per the design doc. No backend work is needed
until the frontend implements the claim flow.

### 10.7 `updated_at` column

The `trivia_runs` table does not have an `updated_at` column because runs are
immutable — once submitted, a run is never modified. This deviates from the
project convention of including `updated_at` on all tables (seen in
`feedback_posts`, `feedback_votes`, `polls`). This is intentional: updating a
historical run would undermine the integrity of the leaderboard.

### 10.8 Auth0 `user.picture` URL longevity

Google profile photo URLs stored in `avatar_url` are not guaranteed to remain
valid. MUI `Avatar` handles broken image URLs by falling back to the `children`
(initials). The stored URLs in the database will go stale for users who change
their profile photo. There is no background job to refresh them.

**Resolution:** Accept the staleness as intentional for v1 (consistent with the
design doc's snapshot model). If fresher avatars become a requirement, the
approach would be to store only the Google `sub` and resolve the photo URL at
read time via the Auth0 Management API — a significant architecture change.

### 10.9 Leaderboard public exposure of `userId`

The GET leaderboard response includes `userId` (the Auth0 `sub`, e.g.
`google-oauth2|117...`) so the client can identify the current user's row.
This exposes Auth0 subject identifiers in a public API response.

**Assessment:** Auth0 subject identifiers are not secrets — they are identifiers,
not credentials. However, if user enumeration is a concern, consider returning
a stable but opaque identifier (e.g. a hash of the sub) and storing that hash in
the database instead of the raw sub. The client would compare the hash of the
current user's sub against the hash in the response. This adds complexity for
little practical security benefit at v1 scale.

---

## 11. Route File Skeleton

The following is a complete implementation skeleton for the backend engineer to
fill in. It mirrors the style of `src/app/api/favorites/route.ts`.

### `src/app/api/trivia/runs/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getDb, hasDatabase } from '@/services/db'
import { auth0 } from '@/lib/auth0'

interface TriviaRunRow {
  id: string
  played_at: string
}

export async function POST(req: NextRequest) {
  // 1. Auth check
  if (!auth0) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  const session = await auth0.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  // 2. DB check
  if (!hasDatabase()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  // 3. Parse body
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const score = typeof body.score === 'number' ? body.score : NaN
  const total = typeof body.total === 'number' ? body.total : NaN

  // 4. Validate
  if (
    !Number.isInteger(score) ||
    !Number.isInteger(total) ||
    score < 0 ||
    total < 1 ||
    score > total
  ) {
    return NextResponse.json(
      { error: 'score and total must be non-negative integers with score <= total and total >= 1' },
      { status: 400 },
    )
  }

  const userId = session.user.sub as string
  const username = session.user.name ?? 'Anonymous'
  const avatarUrl = session.user.picture ?? null
  const sql = getDb()

  // 5. Rate limit check — reject if a run was submitted in the last 30 seconds
  try {
    const recent = await sql`
      SELECT played_at
      FROM trivia_runs
      WHERE user_id = ${userId}
      ORDER BY played_at DESC
      LIMIT 1
    `
    if (recent.length > 0) {
      const lastPlayedMs = new Date(recent[0].played_at as string).getTime()
      if (Date.now() - lastPlayedMs < 30_000) {
        return NextResponse.json({ error: 'Too many submissions' }, { status: 429 })
      }
    }
  } catch (e) {
    console.error('Trivia runs rate-limit check error:', e)
    return NextResponse.json({ error: 'Failed to submit run' }, { status: 500 })
  }

  // 6. Insert run
  let runId: string
  let pct: number
  try {
    const rows = (await sql`
      INSERT INTO trivia_runs (user_id, username, avatar_url, score, total, pct)
      VALUES (
        ${userId},
        ${username},
        ${avatarUrl},
        ${score},
        ${total},
        ROUND((${score}::numeric / NULLIF(${total}, 0)) * 100, 2)
      )
      RETURNING id, pct
    `) as { id: string; pct: number }[]
    runId = rows[0].id
    pct = Number(rows[0].pct)
  } catch (e) {
    console.error('Trivia run insert error:', e)
    return NextResponse.json({ error: 'Failed to submit run' }, { status: 500 })
  }

  // 7. Compute rank in 'today' period
  let rank = 1
  try {
    const rankRows = (await sql`
      WITH best_per_user AS (
        SELECT DISTINCT ON (user_id)
          user_id, pct, score
        FROM trivia_runs
        WHERE played_at >= NOW() - INTERVAL '24 hours'
        ORDER BY user_id, pct DESC, score DESC
      )
      SELECT COUNT(*) + 1 AS rank
      FROM best_per_user
      WHERE pct > ${pct}
         OR (pct = ${pct} AND score > ${score})
    `) as { rank: number }[]
    rank = Number(rankRows[0].rank)
  } catch (e) {
    console.error('Trivia rank computation error:', e)
    // Non-fatal — return a rank of 0 to signal unknown
    rank = 0
  }

  return NextResponse.json({ id: runId, rank, period: 'today' }, { status: 201 })
}
```

### `src/app/api/trivia/leaderboard/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getDb, hasDatabase } from '@/services/db'

interface LeaderboardDbRow {
  rank: number
  user_id: string
  username: string
  avatar_url: string | null
  score: number
  total: number
  pct: number
}

const VALID_PERIODS = ['today', 'allTime'] as const
type Period = (typeof VALID_PERIODS)[number]

export async function GET(req: NextRequest) {
  const url = req.nextUrl
  const periodParam = url.searchParams.get('period') ?? 'today'
  const limitParam = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get('limit') ?? '25', 10)),
  )

  if (!VALID_PERIODS.includes(periodParam as Period)) {
    return NextResponse.json(
      { error: 'period must be "today" or "allTime"' },
      { status: 400 },
    )
  }

  const period = periodParam as Period
  const updatedAt = new Date().toISOString()

  if (!hasDatabase()) {
    return NextResponse.json({ period, rows: [], updatedAt, demo: true })
  }

  const sql = getDb()

  try {
    let rows: LeaderboardDbRow[]

    if (period === 'today') {
      rows = (await sql`
        WITH best_runs AS (
          SELECT DISTINCT ON (user_id)
            user_id, username, avatar_url, score, total, pct, played_at
          FROM trivia_runs
          WHERE played_at >= NOW() - INTERVAL '24 hours'
          ORDER BY user_id, pct DESC, score DESC
        )
        SELECT
          ROW_NUMBER() OVER (ORDER BY pct DESC, score DESC, played_at ASC) AS rank,
          user_id, username, avatar_url, score, total, pct
        FROM best_runs
        ORDER BY pct DESC, score DESC, played_at ASC
        LIMIT ${limitParam}
      `) as LeaderboardDbRow[]
    } else {
      rows = (await sql`
        WITH best_runs AS (
          SELECT DISTINCT ON (user_id)
            user_id, username, avatar_url, score, total, pct, played_at
          FROM trivia_runs
          ORDER BY user_id, pct DESC, score DESC
        )
        SELECT
          ROW_NUMBER() OVER (ORDER BY pct DESC, score DESC, played_at ASC) AS rank,
          user_id, username, avatar_url, score, total, pct
        FROM best_runs
        ORDER BY pct DESC, score DESC, played_at ASC
        LIMIT ${limitParam}
      `) as LeaderboardDbRow[]
    }

    const response = NextResponse.json({
      period,
      rows: rows.map((r) => ({
        rank: Number(r.rank),
        userId: r.user_id,
        username: r.username,
        avatarUrl: r.avatar_url,
        score: Number(r.score),
        total: Number(r.total),
        pct: Number(r.pct),
      })),
      updatedAt,
    })

    response.headers.set(
      'Cache-Control',
      's-maxage=30, stale-while-revalidate=60',
    )

    return response
  } catch (e) {
    console.error('Trivia leaderboard error:', e)
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }
}
```

### `src/app/api/trivia/leaderboard/rank/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getDb, hasDatabase } from '@/services/db'

export async function GET(req: NextRequest) {
  const url = req.nextUrl
  const score = parseInt(url.searchParams.get('score') ?? '', 10)
  const total = parseInt(url.searchParams.get('total') ?? '', 10)
  const period = url.searchParams.get('period') ?? 'today'

  if (
    !Number.isInteger(score) ||
    !Number.isInteger(total) ||
    score < 0 ||
    total < 1 ||
    score > total
  ) {
    return NextResponse.json(
      { error: 'score and total must be valid integers with score <= total' },
      { status: 400 },
    )
  }

  if (!hasDatabase()) {
    return NextResponse.json({ rank: 1, period, totalPlayers: 0 })
  }

  const pct = (score / total) * 100
  const sql = getDb()

  try {
    let result: { rank: number; total_players: number }[]

    if (period === 'today') {
      result = (await sql`
        WITH best_per_user AS (
          SELECT DISTINCT ON (user_id)
            user_id, pct, score
          FROM trivia_runs
          WHERE played_at >= NOW() - INTERVAL '24 hours'
          ORDER BY user_id, pct DESC, score DESC
        )
        SELECT
          (
            SELECT COUNT(*) + 1
            FROM best_per_user
            WHERE pct > ${pct}
               OR (pct = ${pct} AND score > ${score})
          ) AS rank,
          COUNT(*) AS total_players
        FROM best_per_user
      `) as { rank: number; total_players: number }[]
    } else {
      result = (await sql`
        WITH best_per_user AS (
          SELECT DISTINCT ON (user_id)
            user_id, pct, score
          FROM trivia_runs
          ORDER BY user_id, pct DESC, score DESC
        )
        SELECT
          (
            SELECT COUNT(*) + 1
            FROM best_per_user
            WHERE pct > ${pct}
               OR (pct = ${pct} AND score > ${score})
          ) AS rank,
          COUNT(*) AS total_players
        FROM best_per_user
      `) as { rank: number; total_players: number }[]
    }

    return NextResponse.json({
      rank: Number(result[0].rank),
      period,
      totalPlayers: Number(result[0].total_players),
    })
  } catch (e) {
    console.error('Trivia rank lookup error:', e)
    return NextResponse.json({ error: 'Failed to compute rank' }, { status: 500 })
  }
}
```

---

## 12. Phased Checklist

### Phase 2 — Backend (this document)

- [ ] Run `migrations/004_trivia_runs.sql` against Neon database
- [ ] Create `src/app/api/trivia/runs/route.ts` (POST handler)
- [ ] Create `src/app/api/trivia/leaderboard/route.ts` (GET handler)
- [ ] Create `src/app/api/trivia/leaderboard/rank/route.ts` (GET handler)
- [ ] Update `src/lib/trivia/gameApi.ts` — async `submitRun` and `getLeaderboard`
- [ ] Update `src/types/trivia.ts` — add `avatarUrl`, `userId`, `pct` to `LeaderboardRow`
- [ ] Update `src/components/trivia/TriviaGame.tsx` — pass auth props, call async submitRun
- [ ] Update `src/components/trivia/LeaderboardScreen.tsx` — async fetch, auth state, new props
- [ ] Update `API.md` at project root with new trivia routes
- [ ] Smoke test: authenticated user submits run, appears on leaderboard
- [ ] Smoke test: anonymous user sees leaderboard rows, ghost row with approximate rank
- [ ] Smoke test: rate limit rejects second submission within 30 seconds
- [ ] Smoke test: demo mode (no POSTGRES_URL) — leaderboard returns `demo: true`, UI falls back to mock
