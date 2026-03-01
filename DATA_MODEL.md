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

### h2h_films

Films that participate in head-to-head matchups. Seeded from TMDB via an admin
endpoint. Title, year, poster, and genre data are denormalised at seed time.
Each film has an Elo rating (starting at 1000) that evolves with each vote.

```typescript
interface H2HFilm {
  id: string             // UUID PK
  tmdb_id: number        // TMDB integer movie ID, UNIQUE
  title: string          // snapshotted from TMDB at seed time
  year: number | null    // SMALLINT release year
  poster_path: string | null  // TMDB poster path
  genre_ids: number[]    // TMDB genre ID array, denormalized
  elo_rating: number     // NUMERIC(8,2), default 1000.00, must be > 0
  vote_count: number     // integer, total matchup appearances, >= 0
  created_at: string     // TIMESTAMPTZ
  updated_at: string     // TIMESTAMPTZ
}
```

Source: `migrations/006_h2h_film_voting.sql`, `src/app/api/h2h/`.

---

### h2h_matchups

Pre-generated unordered pairs of films. Each pair is stored once with
`film_a_id` holding the lexicographically smaller UUID (enforced at the
application layer) so the UNIQUE constraint prevents reverse-order duplicates.

```typescript
interface H2HMatchup {
  id: string             // UUID PK
  film_a_id: string      // FK -> h2h_films.id
  film_b_id: string      // FK -> h2h_films.id
  created_at: string     // TIMESTAMPTZ
}
```

Constraint: `film_a_id <> film_b_id` (no self-pairing).
Uniqueness: `(film_a_id, film_b_id)` UNIQUE — combined with canonical ordering,
ensures each unordered pair exists at most once.

Source: `migrations/006_h2h_film_voting.sql`.

---

### h2h_matchup_votes

One row per (user, matchup) pair. Records which film the user chose as the
winner. Serves double duty as the anti-repeat mechanism: `GET /api/h2h/matchup`
uses `NOT EXISTS` on this table to exclude matchups a user has already voted on.

```typescript
interface H2HMatchupVote {
  id: string             // UUID PK
  matchup_id: string     // FK -> h2h_matchups.id ON DELETE CASCADE
  user_id: string        // Auth0 sub
  winner_id: string      // FK -> h2h_films.id (must be one of the matchup's films)
  voted_at: string       // TIMESTAMPTZ
}
```

Votes are immutable once cast — no update or delete endpoint.
Uniqueness: `(matchup_id, user_id)` UNIQUE — one vote per user per matchup.

Source: `migrations/006_h2h_film_voting.sql`, `src/app/api/h2h/`.

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

h2h_films ──< h2h_matchups (film_a_id)   (one film, many matchups as film A)
h2h_films ──< h2h_matchups (film_b_id)   (one film, many matchups as film B)
h2h_matchups ──< h2h_matchup_votes       (one matchup, many votes)
h2h_films ──< h2h_matchup_votes (winner) (one film, many wins)
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
| Canonical matchup pair ordering (film_a_id < film_b_id as TEXT) | `h2h_matchups` | `POST /api/admin/h2h/generate-matchups` |
| winner_id must be one of the matchup's two films | `h2h_matchup_votes` | `POST /api/h2h/matchups/[id]/vote` |
| Elo update atomicity (vote + both film updates in one TX) | `h2h_films`, `h2h_matchup_votes` | `POST /api/h2h/matchups/[id]/vote` |
| Leaderboard minimum vote threshold (default 10) | `h2h_films` | `GET /api/h2h/leaderboard` |
