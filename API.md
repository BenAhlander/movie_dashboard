# FreshTomatoes API Reference

Base URL: `/api`

---

## TMDB Data Routes

### `GET /api/theater`

Fetches now-playing movies enriched with revenue, budget, and runtime data. Returns both domestic (US region) and global lists, sorted by revenue descending.

**Response:**
```json
{
  "domestic": "MovieListItem[]",
  "global": "MovieListItem[]"
}
```

Falls back to mock data when `TMDB_API_KEY` is not set (demo mode). Enrichment is batched at 5 concurrent requests to avoid rate limits.

---

### `GET /api/streaming`

Fetches trending movies and TV shows combined, sorted by popularity.

| Param    | Type   | Default | Description                  |
| -------- | ------ | ------- | ---------------------------- |
| `window` | string | `week`  | Trending window: `week` or `day` |

**Response:** `StreamingListItem[]` (unified format with `media_type` field)

---

### `GET /api/movie/[id]`

Fetches full movie details including credits and watch provider info (parallel fetch).

| Param | Type   | Required | Description |
| ----- | ------ | -------- | ----------- |
| `id`  | string | yes      | TMDB movie ID (path param) |

**Response:** `MovieDetail` object, or `null` if TMDB API is not configured.

---

### `GET /api/search`

Proxies search queries to TMDB.

| Param  | Type   | Default | Description                        |
| ------ | ------ | ------- | ---------------------------------- |
| `q`    | string | —       | Search query (required, non-empty) |
| `type` | string | `movie` | `movie` or `multi` (movies + TV)   |

**Response:** TMDB search results array.

**Errors:**
- `400` — Missing or empty `q` parameter

---

## Feedback Routes

### `GET /api/feedback`

Lists feedback posts with sorting, filtering, and pagination (20 per page).

| Param      | Type   | Default | Description                                |
| ---------- | ------ | ------- | ------------------------------------------ |
| `sort`     | string | `hot`   | `hot`, `new`, or `top`                     |
| `category` | string | `all`   | `all`, `bug`, `feature`, or `general`      |
| `page`     | number | `1`     | Page number (1-indexed)                    |
| `voterId`  | string | —       | Anonymous voter ID to track user's votes   |

**Sort algorithms:**
- `new` — Most recent first (`created_at DESC`)
- `top` — Highest score first (`score DESC`)
- `hot` — Trending: `(score + 1) / sqrt(hours_old)`

**Response:**
```json
{
  "posts": [{
    "id": "uuid",
    "title": "string",
    "body": "string",
    "category": "bug | feature | general",
    "score": 5,
    "status": "open",
    "author_id": "string",
    "created_at": "ISO 8601",
    "comment_count": 3,
    "userVote": -1 | 0 | 1,
    "isOwner": true | false
  }],
  "hasMore": true | false
}
```

---

### `POST /api/feedback`

Creates a new feedback post. Requires Auth0 authentication.

**Request body:**
```json
{
  "title": "string (3-100 chars)",
  "body": "string (10-500 chars)",
  "category": "bug | feature | general"
}
```

HTML tags are stripped from `title` and `body` for XSS prevention.

**Response:** The created `FeedbackPost` with `score: 0` and `userVote: 0`.

On success, fires a webhook to `AGENT_SERVICE_URL/webhook/new-feedback` (via `waitUntil()`) with `{ submission_id }` so the agent can review and leave a comment.

**Errors:**
- `401` — Not authenticated
- `400` — Validation failure (title/body length, invalid category)

---

### `DELETE /api/feedback/[id]`

Deletes a feedback post. Requires Auth0 authentication. Authors can only delete their own posts.

| Param | Type   | Required | Description          |
| ----- | ------ | -------- | -------------------- |
| `id`  | string | yes      | Post ID (path param) |

**Errors:**
- `401` — Not authenticated
- `403` — Not the post author
- `404` — Post not found

---

### `POST /api/feedback/[id]/vote`

Casts, changes, or removes a vote on a post. Uses SHA256-hashed voter IDs for anonymous tracking.

| Param | Type   | Required | Description          |
| ----- | ------ | -------- | -------------------- |
| `id`  | string | yes      | Post ID (path param) |

**Request body:**
```json
{
  "voterId": "string",
  "action": "up | down | remove"
}
```

Idempotent — voting the same direction twice returns the current score without creating duplicates.

**Response:**
```json
{
  "score": 5
}
```

---

## Agent/Submissions Routes

These routes are for internal agent consumption and require agent authentication via `validateAgentRequest()`.

### `GET /api/submissions`

Lists feedback posts for agent processing.

| Param         | Type   | Default | Description                           |
| ------------- | ------ | ------- | ------------------------------------- |
| `status`      | string | —       | Filter by status                      |
| `min_upvotes` | number | —       | Minimum score threshold               |
| `limit`       | number | `50`    | Results per page (1-200)              |

**Response:** Raw `feedback_posts` rows.

**Errors:**
- `401` — Invalid agent credentials

---

### `GET /api/submissions/[id]`

Fetches a single post with all its comments.

**Response:**
```json
{
  "submission": { /* post data */ },
  "comments": [{ /* ordered by created_at ASC */ }]
}
```

---

### `PATCH /api/submissions/[id]/status`

Updates a post's status (agent-only).

**Request body:**
```json
{
  "status": "open | under_review | in_progress | completed | declined"
}
```

**Response:** The updated post object.

---

### `GET /api/submissions/[id]/comments`

Fetches all comments for a post (no auth required).

**Response:** Comments array ordered by `created_at ASC`.

---

### `POST /api/submissions/[id]/comments`

Creates a comment on a post. Agent requests can set `is_agent_comment: true` and optionally update the post status.

**Request body (user):**
```json
{
  "author_id": "string",
  "body": "string (1-2000 chars)"
}
```

**Request body (agent):**
```json
{
  "body": "string (1-2000 chars)",
  "status": "open | under_review | in_progress | completed | declined"
}
```

HTML tags are stripped from `body`. If an agent provides `status`, the post status is updated atomically.

---

### `DELETE /api/submissions/[id]/comments/[commentId]`

Deletes a comment. Authors can only delete their own.

| Param       | Type   | Required | Description               |
| ----------- | ------ | -------- | ------------------------- |
| `author_id` | string | yes      | Query param for ownership |

**Errors:**
- `403` — Not the comment author

---

## Polls Routes

### `GET /api/polls`

Lists polls with sorting, status filtering, and pagination (20 per page).

| Param    | Type   | Default | Description                                      |
| -------- | ------ | ------- | ------------------------------------------------ |
| `sort`   | string | `new`   | `new` (newest first) or `popular` (most votes)   |
| `status` | string | `all`   | `all`, `open`, or `closed`                       |
| `page`   | number | `1`     | Page number (1-indexed)                          |
| `userId` | string | —       | Auth0 user ID to include user's vote in response |

**Response:**
```json
{
  "results": [{
    "id": "uuid",
    "title": "string",
    "description": "string | null",
    "status": "open | closed",
    "expires_at": "ISO 8601 | null",
    "total_votes": 42,
    "options": [{
      "id": "uuid",
      "option_text": "string",
      "display_order": 1,
      "vote_count": 15
    }],
    "user_vote": "option-uuid | null",
    "is_author": false,
    "author_name": "string | null",
    "created_at": "ISO 8601"
  }],
  "total": 100,
  "page": 1
}
```

Expired polls (`expires_at < now()`) are treated as closed regardless of the `status` column value.

---

### `POST /api/polls`

Creates a new poll. Requires Auth0 authentication.

**Request body:**
```json
{
  "title": "string (10-200 chars)",
  "description": "string (optional)",
  "options": ["string (1-100 chars)", "..."],
  "expires_in": "1d | 3d | 7d | null"
}
```

Must include 2-6 options. HTML tags are stripped from all text fields.

**Response (201):** `{ "poll": Poll }` — the created poll object.

**Errors:**
- `401` — Not authenticated
- `400` — Validation failure (title length, option count/length)
- `413` — Request too large

---

### `POST /api/polls/[id]/vote`

Casts a vote on a poll option. Requires Auth0 authentication. Each user can vote once per poll.

| Param | Type   | Required | Description          |
| ----- | ------ | -------- | -------------------- |
| `id`  | string | yes      | Poll UUID (path param) |

**Request body:**
```json
{
  "option_id": "uuid"
}
```

**Response:** `{ "poll": Poll }` — the updated poll object with vote counts and user's vote.

**Errors:**
- `401` — Not authenticated
- `400` — Poll is closed/expired, invalid option, or missing option_id
- `404` — Poll not found
- `409` — User has already voted on this poll

---

## Favorites Routes

### `GET /api/favorites`

Lists the authenticated user's favorite movies, ordered by `created_at ASC`. Requires Auth0 authentication.

**Response:**
```json
{
  "favorites": [{
    "id": "uuid",
    "tmdb_id": 12345,
    "title": "string",
    "poster_path": "/path.jpg | null",
    "created_at": "ISO 8601"
  }]
}
```

**Errors:**
- `401` — Not authenticated

---

### `POST /api/favorites`

Adds a movie to the user's favorites (max 5). Requires Auth0 authentication.

**Request body:**
```json
{
  "tmdb_id": 12345,
  "title": "string (non-empty)",
  "poster_path": "/path.jpg | null"
}
```

**Response (201):**
```json
{
  "favorite": {
    "id": "uuid",
    "tmdb_id": 12345,
    "title": "string",
    "poster_path": "/path.jpg | null",
    "created_at": "ISO 8601"
  }
}
```

**Errors:**
- `401` — Not authenticated
- `400` — Invalid input (missing/invalid tmdb_id or title)
- `403` — Favorite limit reached (max 5)
- `409` — Movie already favorited

---

### `DELETE /api/favorites/[id]`

Removes a favorite. Requires Auth0 authentication. Users can only remove their own favorites.

| Param | Type   | Required | Description              |
| ----- | ------ | -------- | ------------------------ |
| `id`  | string | yes      | Favorite UUID (path param) |

**Errors:**
- `401` — Not authenticated
- `400` — Invalid UUID format
- `404` — Favorite not found or not owned by user

---

### `GET /api/migrate-favorites`

Runs idempotent schema migration for the `user_favorites` table, index, and 5-favorite limit trigger.

**Response:**
```json
{
  "success": true,
  "message": "Favorites migration applied"
}
```

**Errors:**
- `503` — Database not configured
- `500` — Migration failed

---

## Database Migration

### `POST /api/migrate`

Runs idempotent schema migrations. Protected by a shared secret.

| Param    | Type   | Required | Description                              |
| -------- | ------ | -------- | ---------------------------------------- |
| `secret` | string | yes      | Must match `MIGRATION_SECRET` env var    |

Adds the `status` column to `feedback_posts`, creates the `feedback_comments` table with indexes, creates the `polls`, `poll_options`, and `poll_votes` tables with indexes and constraints, and creates the `trivia_runs` table with indexes for the trivia leaderboard.

**Errors:**
- `401` — Missing or invalid secret

---

## Trivia Routes

### `GET /api/trivia/questions`

Returns a randomised set of questions for one game round. The endpoint excludes
questions supplied via `excludeIds` (client-tracked IDs from the current
session) and, for authenticated users, any questions they have answered within
the configured recency window (default: last 30 days).

**Authentication:** Optional (Auth0 session). Unauthenticated requests receive
a shuffled random sample. Authenticated requests additionally exclude questions
the user has recently answered (looked up via `trivia_user_answers`).

**Query parameters:**

| Param        | Type   | Default | Description                                         |
| ------------ | ------ | ------- | --------------------------------------------------- |
| `count`      | number | `5`     | Number of questions to return (1–20)                |
| `excludeIds` | string | —       | Comma-separated question IDs to exclude (client list) |
| `difficulty` | string | —       | Filter pool to `easy`, `medium`, or `hard`          |

**Request headers:**

None beyond standard Next.js session cookies for optional Auth0 authentication.

**Response (200):**

```typescript
interface QuestionsResponse {
  questions: TriviaQuestion[]
  // IDs of all questions excluded for this user in this response.
  // The client should union these with its own usedQuestionIds to
  // keep its local exclusion list in sync.
  excludedIds: string[]
  // True when POSTGRES_URL is not set or the question table is empty,
  // signalling the client to fall back to mockQuestions.ts.
  demo?: boolean
}

interface TriviaQuestion {
  id: string
  statement: string
  answer: boolean
  title: string          // maps to trivia_questions.media_title
  year: number           // maps to trivia_questions.media_year
  mediaType: 'movie' | 'tv'
  posterPath?: string | null
  difficulty?: 'easy' | 'medium' | 'hard'
}
```

**Pool exhaustion behaviour:** When the pool of unseen questions is smaller
than `count` after applying all exclusions, the endpoint resets the user-level
exclusion (ignores `trivia_user_answers`) and draws from the full active pool,
still respecting the client-supplied `excludeIds` for the current session.
This mirrors the existing client-side reset logic in `getQuestions()`.

**Side effects:** None. This endpoint is read-only. Recording that a user has
answered a question is the responsibility of `POST /api/trivia/runs` (or a
dedicated `POST /api/trivia/answers` endpoint — see `BACKEND_GAPS.md`).

**Errors:**
- `400` — `count` out of range or invalid `difficulty` value
- `500` — DB query failed
- `503` — Database not configured (returns `{ demo: true, questions: [] }`)

**Used by:** `src/lib/trivia/gameApi.ts` `getQuestions()` (currently uses
client-side mock; this endpoint replaces it). Called from `src/hooks/useGame.ts`
on `START` and `CONTINUE` actions.

---

### `POST /api/trivia/runs`

Saves a completed trivia game run for the authenticated user. Returns the run's UUID and the user's new rank in the "today" period.

**Authentication:** Required (Auth0 session).

**Request body:**
```json
{
  "score": 14,
  "total": 20
}
```

- `score` — non-negative integer, correct answers in the session
- `total` — positive integer, total questions answered (`score <= total`)

**Response (201):**
```json
{
  "id": "uuid",
  "rank": 7,
  "period": "today"
}
```

**Rate limiting:** Rejects submissions within 30 seconds of the user's last run.

**Errors:**
- `400` — Invalid or missing `score`/`total`
- `401` — Not authenticated
- `429` — Submission too soon (within 30 seconds of prior run)
- `503` — Database not configured
- `500` — DB insert or rank query failed

---

### `GET /api/trivia/leaderboard`

Returns ranked leaderboard rows for the selected period. Public endpoint — no authentication required. Each user appears at most once (their best run for the period).

| Param    | Type   | Default  | Description                                      |
| -------- | ------ | -------- | ------------------------------------------------ |
| `period` | string | `today`  | `today` (last 24 hours) or `allTime`             |
| `limit`  | number | `25`     | Max rows to return (1-100)                       |

**Response (200):**
```json
{
  "period": "today",
  "rows": [{
    "rank": 1,
    "userId": "google-oauth2|abc",
    "username": "CinematicAlex",
    "avatarUrl": "https://lh3.googleusercontent.com/...",
    "score": 20,
    "total": 20,
    "pct": 100.00
  }],
  "updatedAt": "ISO 8601"
}
```

When `POSTGRES_URL` is not set, returns `{ "demo": true, "rows": [] }`.

**Caching:** `Cache-Control: s-maxage=30, stale-while-revalidate=60`

**Errors:**
- `400` — Invalid `period` value
- `500` — DB query failed

---

### `GET /api/trivia/leaderboard/rank`

Returns the rank a given score would achieve in the specified period. Used to show anonymous users their "ghost" rank without writing to the database.

| Param    | Type   | Required | Description                                 |
| -------- | ------ | -------- | ------------------------------------------- |
| `score`  | number | yes      | Correct answers                             |
| `total`  | number | yes      | Total questions                             |
| `period` | string | no       | `today` (default) or `allTime`              |

**Response (200):**
```json
{
  "rank": 9,
  "period": "today",
  "totalPlayers": 42
}
```

**Errors:**
- `400` — Invalid `score`/`total`
- `500` — DB query failed
