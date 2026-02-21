# Movie Polls — Database Schema & Migration

## Overview

Three tables implement the polls feature. Each design decision below is explained
alongside the SQL so that a backend engineer can apply the migration and reason
about it without re-reading the frontend code.

---

## Table Descriptions and Design Decisions

### `polls`

Stores the poll itself: the question text, an optional description, who created
it, whether it is open or closed, and an optional expiry timestamp.

**Key decisions:**

- `author_id VARCHAR(255)` — Auth0 `sub` claim, same format used by
  `user_favorites.user_id` (e.g. `auth0|abc123`, `google-oauth2|123`).
  Auth0 owns identity; we never store a separate users table.
- `status VARCHAR(20) CHECK (status IN ('open', 'closed'))` — Only two states
  are needed at launch. A CHECK constraint is cheap and makes invalid transitions
  a DB-level error rather than an application bug.
- `expires_at TIMESTAMPTZ NULL` — Nullable; NULL means the poll never expires.
  The application treats a poll as effectively closed when
  `expires_at IS NOT NULL AND expires_at < now()`, but the `status` column
  remains the authoritative close signal so that polls can be closed early by
  their author without waiting for the timer.
- `updated_at TIMESTAMPTZ` — Updated on every status change so that cache
  invalidation and optimistic UI refreshes have a reliable signal.

### `poll_options`

Stores the 2–6 answer choices that belong to a poll.

**Key decisions:**

- `display_order SMALLINT NOT NULL` — Preserves the author's intended option
  order. Without this, `ORDER BY id` would work most of the time (UUIDs are
  random, not sequential), but would be undefined behavior. `SMALLINT` is
  sufficient: valid values are 1–6.
- `vote_count INTEGER NOT NULL DEFAULT 0` — A denormalized running total
  maintained by the application on every vote insert. This makes the common
  read path (display results with percentages) a single table scan on
  `poll_options` rather than a GROUP BY aggregation over `poll_votes`. The
  source-of-truth count is always recoverable by `SELECT COUNT(*) FROM
  poll_votes WHERE option_id = ?` if the denormalized value drifts.
- `ON DELETE CASCADE` from `polls` — Deleting a poll removes its options
  automatically. There is no partial-delete use case.
- No `updated_at` — Options are immutable after poll creation. Authors cannot
  edit option text once the poll is live, because that would invalidate existing
  votes semantically.

### `poll_votes`

Records which option a specific authenticated user chose for a specific poll.
One row equals one vote.

**Key decisions:**

- `UNIQUE (poll_id, user_id)` — This is the primary correctness constraint.
  Postgres enforces one vote per user per poll at the storage level, regardless
  of application logic. A concurrent double-submit will result in a unique
  violation (error code `23505`) that the API route can catch and return as
  `409 Conflict`.
- `option_id` foreign key references `poll_options(id) ON DELETE CASCADE` —
  If a poll (and thus its options) is deleted, votes are cleaned up
  automatically. There is intentionally no `ON DELETE CASCADE` path from
  `poll_votes` to `polls` directly, because the cascade flows through
  `poll_options`.
- `poll_id` is stored redundantly alongside `option_id` — This allows efficient
  lookups of all votes for a poll (`WHERE poll_id = ?`) without joining through
  `poll_options`. It is kept consistent by the `CHECK` constraint and the
  application insert path. See the Notes section for the cross-table consistency
  constraint that SQL cannot enforce inline.
- `user_id VARCHAR(255)` — Same Auth0 `sub` format as `polls.author_id` and
  `user_favorites.user_id`.
- No `updated_at` — Votes are immutable. The UX does not allow changing a vote
  after submission (the poll spec says "vote once"). If this requirement changes,
  an `updated_at` column and a trigger to maintain `poll_options.vote_count`
  would be needed.

---

## Migration

```sql
-- Migration: Create polls, poll_options, and poll_votes tables
-- Run this against your Neon/Vercel Postgres database.
-- All statements use IF NOT EXISTS guards and are safe to re-run.

-- Ensure pgcrypto is available for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ── 1. polls ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS polls (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id   VARCHAR(255) NOT NULL,
  title       VARCHAR(200) NOT NULL,
  description TEXT,
  status      VARCHAR(20)  NOT NULL DEFAULT 'open'
                CHECK (status IN ('open', 'closed')),
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- List all polls sorted by newest first (default view)
CREATE INDEX IF NOT EXISTS idx_polls_created_at
  ON polls (created_at DESC);

-- Filter polls by author (e.g. "my polls" view)
CREATE INDEX IF NOT EXISTS idx_polls_author_id
  ON polls (author_id);

-- Filter by status (open vs closed) combined with recency sort
CREATE INDEX IF NOT EXISTS idx_polls_status_created_at
  ON polls (status, created_at DESC);


-- ── 2. poll_options ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS poll_options (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id       UUID        NOT NULL
                  REFERENCES polls (id) ON DELETE CASCADE,
  option_text   VARCHAR(200) NOT NULL,
  display_order SMALLINT    NOT NULL,
  vote_count    INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Enforce ordering uniqueness within a poll
  UNIQUE (poll_id, display_order)
);

-- Primary read path: fetch all options for a poll in display order
CREATE INDEX IF NOT EXISTS idx_poll_options_poll_id
  ON poll_options (poll_id, display_order ASC);


-- ── 3. poll_votes ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS poll_votes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id     UUID        NOT NULL
                REFERENCES polls (id) ON DELETE CASCADE,
  option_id   UUID        NOT NULL
                REFERENCES poll_options (id) ON DELETE CASCADE,
  user_id     VARCHAR(255) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Core correctness constraint: one vote per user per poll
  UNIQUE (poll_id, user_id)
);

-- Look up a specific user's vote on a specific poll
-- (used to show the user which option they selected)
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_user
  ON poll_votes (poll_id, user_id);

-- Aggregate all votes for a poll (used for result recalculation)
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_id
  ON poll_votes (poll_id);

-- Aggregate all votes for a single option (used for denormalized count recovery)
CREATE INDEX IF NOT EXISTS idx_poll_votes_option_id
  ON poll_votes (option_id);
```

---

## Rollback

```sql
-- Rollback: remove polls tables in dependency order
-- (poll_votes and poll_options cascade from polls, but drop explicitly for clarity)

DROP TABLE IF EXISTS poll_votes;
DROP TABLE IF EXISTS poll_options;
DROP TABLE IF EXISTS polls;
```

---

## Notes

### How to apply

This project runs migrations through a dedicated API endpoint. Add the DDL
above to `/api/migrate` (the existing handler in
`src/app/api/migrate/route.ts`), gated behind the `MIGRATION_SECRET` query
parameter, following the same pattern used for `feedback_comments`. Alternatively,
paste the SQL block directly into the Neon console's SQL editor.

### `vote_count` denormalization and drift recovery

`poll_options.vote_count` is incremented by the application on every successful
vote insert. Because `poll_votes` has a `UNIQUE (poll_id, user_id)` constraint,
a duplicate-vote attempt never reaches the `vote_count` update. If `vote_count`
ever drifts (e.g. due to a bug or a direct DB edit), it can be recalculated
without data loss:

```sql
UPDATE poll_options po
SET vote_count = (
  SELECT COUNT(*) FROM poll_votes pv WHERE pv.option_id = po.id
);
```

### Cross-table consistency: `poll_votes.poll_id` vs `poll_votes.option_id`

SQL cannot enforce inline that `poll_votes.poll_id` matches
`poll_options.poll_id` for the chosen `option_id`. This must be enforced in
application code. The API route that records a vote should:

1. Fetch the target option: `SELECT poll_id FROM poll_options WHERE id = $optionId`
2. Assert that the returned `poll_id` equals the `poll_id` from the request
3. Only then insert into `poll_votes`

If this check is skipped, a malicious client could cast a vote that references
an option from a different poll while attributing it to the target poll,
corrupting `vote_count` on an unrelated option.

### Closed and expired polls

The `status` column is the authoritative closed signal. The application should
also treat a poll as read-only when `expires_at IS NOT NULL AND expires_at <
now()`. Both conditions must gate the vote endpoint — the DB has no trigger
enforcing this because the definition of "expired" changes with wall-clock time
and cannot be expressed as a static CHECK constraint.

### `display_order` valid range

The `UNIQUE (poll_id, display_order)` constraint prevents duplicate positions
within a poll but does not enforce that values fall in the range 1–6. That
range (matching the 2–6 option UX limit) is an application-level constraint.
The API route that creates a poll should reject bodies with fewer than 2 or
more than 6 options before inserting.

### Index on `polls (status, created_at DESC)`

PostgreSQL can satisfy `WHERE status = 'open' ORDER BY created_at DESC` using
this index as an index scan rather than a seq scan + sort. Because `status` has
very low cardinality (only two values), this index is most useful when the
majority of polls will be in one status and the query filters to the minority —
i.e. fetching closed polls from a mostly-open dataset, or open polls from a
mostly-closed archive. For small datasets the planner may prefer a sequential
scan; the index pays off as the table grows.

### Auth0 user ID format

`author_id` and `user_id` are stored as `VARCHAR(255)` to match the format
used by `user_favorites` and the feedback system. Auth0 subject claims are
variable-format strings (e.g. `auth0|abc123`, `google-oauth2|123456`).
VARCHAR(255) accommodates all current Auth0 connection types with room to spare.
