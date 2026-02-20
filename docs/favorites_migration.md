# Favorite Movies — Database Schema & Migration

## Overview

One table (`user_favorites`) stores up to 5 favorite movies per authenticated user. Auth0 `sub` claims serve as user identifiers.

## SQL Migration

```sql
-- Migration: Create user_favorites table
-- Run this against your Neon/Vercel Postgres database

CREATE TABLE IF NOT EXISTS user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  tmdb_id INTEGER NOT NULL,
  title VARCHAR(500) NOT NULL,
  poster_path VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Prevent a user from favoriting the same movie twice
  UNIQUE (user_id, tmdb_id)
);

-- Primary query path: fetch all favorites for a user, ordered chronologically
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id
  ON user_favorites (user_id, created_at ASC);

-- Enforce a maximum of 5 favorites per user at the database level
CREATE OR REPLACE FUNCTION check_favorites_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    SELECT COUNT(*) FROM user_favorites WHERE user_id = NEW.user_id
  ) >= 5 THEN
    RAISE EXCEPTION 'User may not have more than 5 favorites'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_favorites_limit
  BEFORE INSERT ON user_favorites
  FOR EACH ROW
  EXECUTE FUNCTION check_favorites_limit();
```

## Design Decisions

**Single table.** All the data lives in `user_favorites`. There is no need for a separate `users` table since Auth0 owns identity; we reference users by their `sub` claim string directly.

**`user_id` as VARCHAR(255).** Auth0 subject claims are variable-format strings (e.g. `google-oauth2|123456`, `auth0|abc`). VARCHAR(255) accommodates all current Auth0 connection types with room to spare.

**`title` and `poster_path` stored as denormalized columns.** These are cached from TMDB at insert time so the favorites list can render without making N additional API calls. If TMDB data changes, it is cosmetic — the `tmdb_id` remains the source of truth and the detail drawer will always fetch fresh data.

**`poster_path` is nullable.** Not every TMDB entry has a poster. The UI already handles missing poster images.

**UNIQUE constraint on `(user_id, tmdb_id)`.** Prevents a user from favoriting the same movie twice. Postgres will reject duplicate inserts with a unique-violation error, which the API route can catch and return as a 409 Conflict.

**Composite index on `(user_id, created_at ASC)`.** This is the primary query path — "give me this user's favorites in the order they were added." The index covers both the WHERE filter and the ORDER BY, so the query is an index-only scan.

**Trigger-based 5-favorite limit.** A pure CHECK constraint cannot reference other rows in the same table, so a BEFORE INSERT trigger is used instead. The trigger counts existing rows for the user and raises an exception if the count is already at 5. Using `ERRCODE = 'check_violation'` lets the API route handle it the same way it would handle any constraint error. The count check plus the insert happen within the same transaction, so concurrent inserts are safe under Postgres's default READ COMMITTED isolation (the trigger sees committed rows, and the UNIQUE constraint prevents true duplicates).

**UUID primary key.** Matches the convention established by `feedback_posts` and `feedback_votes`. UUIDs avoid exposing sequential IDs in any future API responses.

**No soft-delete column.** Removes are hard deletes. The undo-remove UX is handled client-side with a brief delay before calling DELETE, so the database never needs to track "pending removal" state.
