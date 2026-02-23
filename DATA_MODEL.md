# FreshTomatoes — Data Model

This document describes the persistent data model for FreshTomatoes. It is a
shared mental model for frontend and backend engineers: plain-English
descriptions alongside TypeScript-style type definitions. It is not SQL — for
exact DDL see the numbered files in `migrations/`.

Auth0 is the authoritative user store. This database never creates its own
users table. User identity is referenced by the Auth0 `sub` claim (a `TEXT`
field named `user_id` in every table that needs it).

---

## Entities

### feedback_posts

Community feedback entries (bugs, feature requests, general comments). Created
by authenticated users; voted on by anyone via an anonymous voter-ID mechanism.

```typescript
interface FeedbackPost {
  id: string             // UUID PK
  title: string          // 3–100 chars, HTML-stripped
  body: string           // 10–500 chars, HTML-stripped
  category: 'bug' | 'feature' | 'general'
  score: number          // integer, net upvotes minus downvotes
  status: 'open' | 'under_review' | 'in_progress' | 'completed' | 'declined'
  author_id: string      // Auth0 sub
  created_at: string     // TIMESTAMPTZ
  // Computed on read:
  comment_count: number
  userVote: -1 | 0 | 1  // relative to the requesting voterId
  isOwner: boolean       // relative to the requesting user
}
```

Source: `migrations/001_feedback_tables.sql`, `src/app/api/feedback/`.

---

### feedback_votes

One row per (voter, post) pair. Supports anonymous voting via a
SHA256-HMAC-hashed voter ID (pepper: `VOTER_HASH_PEPPER` env var). The raw
client-side voter ID is never stored.

```typescript
interface FeedbackVote {
  id: string             // UUID PK
  post_id: string        // FK -> feedback_posts.id
  voter_id_hash: string  // SHA256(HMAC(rawVoterId, VOTER_HASH_PEPPER))
  value: -1 | 1          // -1 = downvote, 1 = upvote
  created_at: string
}
```

Source: `migrations/001_feedback_tables.sql`.

---

### feedback_comments

Agent and user comments on feedback posts. The agent sets `is_agent_comment =
TRUE` to render with a distinct badge in the UI.

```typescript
interface FeedbackComment {
  id: string
  post_id: string        // FK -> feedback_posts.id
  author_id: string      // Auth0 sub (user) or agent identifier
  body: string           // 1–2000 chars, HTML-stripped
  is_agent_comment: boolean
  created_at: string
}
```

Source: `migrations/001_feedback_tables.sql` (status column + comments table
added by the `/api/migrate` route handler).

---

### polls

Community polls created by authenticated users.

```typescript
interface Poll {
  id: string             // UUID PK
  author_id: string      // Auth0 sub
  author_name: string | null
  title: string          // 10–200 chars
  description: string | null
  status: 'open' | 'closed'
  expires_at: string | null  // TIMESTAMPTZ; null = no expiry
  total_votes: number    // computed on read
  options: PollOption[]
  user_vote: string | null   // option UUID the requesting user voted for
  is_author: boolean
  created_at: string
}

interface PollOption {
  id: string             // UUID PK
  poll_id: string        // FK -> polls.id
  option_text: string    // 1–100 chars
  display_order: number  // 1-indexed
  vote_count: number     // computed on read
}
```

Source: `docs/polls_migration.md`, `src/app/api/polls/`.

---

### poll_votes

One row per (user, poll) pair. Auth0-authenticated only — one vote per user per
poll is enforced by a UNIQUE constraint on `(poll_id, user_id)`.

```typescript
interface PollVote {
  id: string
  poll_id: string        // FK -> polls.id
  option_id: string      // FK -> poll_options.id
  user_id: string        // Auth0 sub
  created_at: string
}
```

Source: `docs/polls_migration.md`.

---

### user_favorites

Up to 5 TMDB movies saved per authenticated user. Title and poster_path are
denormalised at insert time so list renders need no TMDB calls.

```typescript
interface UserFavorite {
  id: string             // UUID PK
  user_id: string        // Auth0 sub
  tmdb_id: number        // TMDB integer movie ID
  title: string          // snapshotted from TMDB at insert time
  poster_path: string | null
  created_at: string
}
```

Constraint: max 5 per user, enforced by a BEFORE INSERT trigger.
Uniqueness: `(user_id, tmdb_id)` UNIQUE constraint prevents double-favoriting.

Source: `docs/favorites_migration.md`, `src/app/api/favorites/`.

---

### trivia_runs

One row per completed game session submitted by an authenticated user. The
leaderboard is computed from this table at query time (no materialised view).

```typescript
interface TriviaRun {
  id: string             // UUID PK
  user_id: string        // Auth0 sub
  username: string       // snapshotted from Auth0 session.user.name
  avatar_url: string | null  // snapshotted from Auth0 session.user.picture
  score: number          // correct answers, >= 0
  total: number          // questions answered, >= 1; score <= total
  pct: number            // NUMERIC(5,2): score/total*100, stored for index use
  played_at: string      // TIMESTAMPTZ, default now()
}
```

Source: `migrations/004_trivia_runs.sql`, `src/app/api/trivia/runs/`.

---

### trivia_questions

The persistent question pool served by `GET /api/trivia/questions`. Seeded with
the 45 questions from `src/lib/trivia/mockQuestions.ts`. New questions can be
inserted without a schema migration. Retired questions should be soft-deleted
via `is_active = FALSE` rather than hard-deleted, to preserve referential
integrity with `trivia_user_answers`.

```typescript
interface TriviaQuestion {
  id: string             // TEXT PK, e.g. 'q01'. Stable across migration.
  media_title: string    // Movie or TV show title
  media_type: 'movie' | 'tv'
  media_year: number | null
  statement: string      // The true/false claim shown to the player
  answer: boolean        // TRUE = statement is correct
  difficulty: 'easy' | 'medium' | 'hard'
  category: string | null  // Optional future-use tag (e.g. 'awards', 'cast')
  poster_path: string | null  // TMDB poster path; nullable
  is_active: boolean     // FALSE = soft-deleted, never served
  created_at: string
  updated_at: string
}
```

Source: `migrations/005_trivia_questions.sql`.

---

### trivia_user_answers

One row per (user, question) answer event. Used by `GET /api/trivia/questions`
to exclude questions a user has recently answered, providing a repeat-free
experience across sessions for authenticated users.

```typescript
interface TriviaUserAnswer {
  id: string             // UUID PK
  user_id: string        // Auth0 sub
  question_id: string    // FK -> trivia_questions.id ON DELETE CASCADE
  answered_correctly: boolean | null
  answered_at: string    // TIMESTAMPTZ, default now()
}
```

There is intentionally no UNIQUE constraint on `(user_id, question_id)`. A user
may accumulate multiple answer records for the same question across sessions
separated by the recency window. The exclusion query filters by
`answered_at >= now() - INTERVAL '30 days'` (application-level constant).

Source: `migrations/005_trivia_questions.sql`.

---

## Entity Relationship Summary

```
feedback_posts ──< feedback_votes       (one post, many votes)
feedback_posts ──< feedback_comments    (one post, many comments)

polls ──< poll_options                  (one poll, 2–6 options)
polls ──< poll_votes                    (one poll, many votes)
poll_options ──< poll_votes             (one option, many votes)

trivia_questions ──< trivia_user_answers  (one question, many answer records)
trivia_runs                               (standalone; no FK to questions)

user_favorites                            (standalone; no FK to other tables)
```

All `user_id` columns reference Auth0 subject claims. There is no `users` table
in this database — Auth0 is the canonical identity store.

---

## Application-Level Constraints (not enforced in SQL)

These rules are enforced in API route code and must be maintained there:

| Rule | Table | Enforced in |
|------|-------|-------------|
| Feedback title 3–100 chars | `feedback_posts` | `POST /api/feedback` |
| Feedback body 10–500 chars | `feedback_posts` | `POST /api/feedback` |
| Trivia run rate limit (5 s between submissions) | `trivia_runs` | `POST /api/trivia/runs` |
| Question pool exhaustion reset | `trivia_questions` | `GET /api/trivia/questions` |
| Recency window for question exclusion (30 days) | `trivia_user_answers` | `GET /api/trivia/questions` |
| `count` query param range 1–20 | `trivia_questions` | `GET /api/trivia/questions` |
| Poll option count 2–6 | `poll_options` | `POST /api/polls` |
| Poll expires_in values: `1d`, `3d`, `7d`, `null` | `polls` | `POST /api/polls` |
