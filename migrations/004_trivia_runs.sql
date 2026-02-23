-- Migration 004: Create trivia_runs table
-- Run this against your Neon/Vercel Postgres database before deploying
-- the /api/trivia/runs and /api/trivia/leaderboard routes.
--
-- Prerequisites:
--   Migration 001 (feedback_tables) must have been applied so that the
--   pgcrypto extension is present and gen_random_uuid() is available.
--   If you are applying this migration against a fresh database that has
--   not had migration 001 applied, uncomment the line below.
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";
--
-- Idempotent: safe to run more than once. All statements use
-- IF NOT EXISTS / IF EXISTS guards.

-- ── Table ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trivia_runs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Auth0 subject identifier, e.g. 'google-oauth2|117...'
  -- Stored as TEXT to match the VARCHAR pattern used in polls, user_favorites,
  -- and feedback_posts. No foreign key — Auth0 is the authoritative user store,
  -- not this database.
  user_id     TEXT        NOT NULL,

  -- Display name snapshotted from Auth0 session.user.name at submission time.
  -- Intentionally denormalised: leaderboard reads require no join. Name changes
  -- in Google are not retroactively applied to historical runs.
  username    TEXT        NOT NULL,

  -- Profile photo URL snapshotted from Auth0 session.user.picture.
  -- Google CDN URLs (lh3.googleusercontent.com) can expire. The client handles
  -- broken URLs via MUI Avatar's onError fallback to initials. Nullable because
  -- some Auth0 connections do not provide a picture.
  avatar_url  TEXT,

  -- Correct answers in the cumulative game session.
  score       INTEGER     NOT NULL CHECK (score >= 0),

  -- Total questions answered in the cumulative session. Must be >= 1 so that
  -- division for pct is safe.
  total       INTEGER     NOT NULL CHECK (total >= 1),

  -- score / total * 100, rounded to 2 decimal places.
  -- Stored as a column (rather than computed on read) because the leaderboard
  -- query uses DISTINCT ON (user_id) ORDER BY user_id, pct DESC, score DESC.
  -- PostgreSQL requires ORDER BY expressions to appear in the select list when
  -- using DISTINCT ON; storing pct avoids a computed expression in ORDER BY and
  -- makes the composite index on (user_id, pct DESC, score DESC) usable.
  pct         NUMERIC(5,2) NOT NULL CHECK (pct >= 0 AND pct <= 100),

  -- score must not exceed total (enforced in the API route, repeated here as a
  -- DB-level safety net).
  CONSTRAINT trivia_runs_score_lte_total CHECK (score <= total),

  -- Submission timestamp. Used to filter the 'today' leaderboard period
  -- (played_at >= NOW() - INTERVAL '24 hours'). TIMESTAMPTZ so that UTC is
  -- stored unambiguously regardless of the database server's timezone setting.
  played_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

-- Primary leaderboard query index.
-- Serves: DISTINCT ON (user_id) ORDER BY user_id, pct DESC, score DESC
-- Both the 'today' and 'all-time' leaderboard queries use this index.
-- The played_at column is not part of this index because the WHERE clause on
-- played_at is used only as a filter, and Postgres will intersect the bitmap
-- scan from idx_trivia_runs_played_at with a seq scan of user rows at this
-- scale. Add played_at to this index if explain-analyze shows seq scans once
-- the table is large.
CREATE INDEX IF NOT EXISTS idx_trivia_runs_user_id_pct
  ON trivia_runs (user_id, pct DESC, score DESC);

-- 'Today' period filter index.
-- Serves: WHERE played_at >= NOW() - INTERVAL '24 hours'
-- Allows Postgres to quickly restrict the scan to rows from the last 24 hours
-- before applying the DISTINCT ON and ORDER BY. DESC matches the most common
-- access pattern (recent rows first).
CREATE INDEX IF NOT EXISTS idx_trivia_runs_played_at
  ON trivia_runs (played_at DESC);

-- Rate-limit check index.
-- Serves: SELECT played_at FROM trivia_runs WHERE user_id = $1
--         ORDER BY played_at DESC LIMIT 1
-- A composite index on (user_id, played_at DESC) makes this a single index
-- scan returning exactly one row with no sort step. Without it Postgres would
-- use idx_trivia_runs_user_id_pct, scan all rows for the user, and sort —
-- acceptable at small scale but worth avoiding explicitly.
CREATE INDEX IF NOT EXISTS idx_trivia_runs_user_id_played_at
  ON trivia_runs (user_id, played_at DESC);

-- ── Rollback ──────────────────────────────────────────────────────────────────
-- To undo this migration, run the statements below in order.
-- There are no foreign keys from other tables referencing trivia_runs, so the
-- table can be dropped without cascade concerns.
--
-- DROP INDEX IF EXISTS idx_trivia_runs_user_id_played_at;
-- DROP INDEX IF EXISTS idx_trivia_runs_played_at;
-- DROP INDEX IF EXISTS idx_trivia_runs_user_id_pct;
-- DROP TABLE IF EXISTS trivia_runs;

-- ── Verification query ────────────────────────────────────────────────────────
-- Run this after applying the migration to confirm the table and indexes exist.
--
-- SELECT
--   t.table_name,
--   c.column_name,
--   c.data_type,
--   c.is_nullable,
--   c.column_default
-- FROM information_schema.tables t
-- JOIN information_schema.columns c ON c.table_name = t.table_name
-- WHERE t.table_name = 'trivia_runs'
-- ORDER BY c.ordinal_position;
--
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'trivia_runs'
-- ORDER BY indexname;
