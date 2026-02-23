-- Migration 005: Create trivia_questions and trivia_user_answers tables
-- Run this against your Neon/Vercel Postgres database before deploying
-- the GET /api/trivia/questions route.
--
-- Prerequisites:
--   Migration 001 (feedback_tables) must have been applied so that the
--   pgcrypto extension is present and gen_random_uuid() is available.
--   If you are applying this migration against a fresh database that has
--   not had migration 001 applied, uncomment the line below.
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";
--
-- What this migration does:
--   1. Creates `trivia_questions` — the persistent question pool.
--      The client-side mockQuestions.ts array is seeded here as initial data
--      so that existing question IDs (q01–q45) remain stable across the
--      transition to a backend-served question pool.
--   2. Creates `trivia_user_answers` — tracks which questions each
--      authenticated user has answered. The GET /api/trivia/questions
--      endpoint queries this table to exclude recently-seen questions,
--      giving authenticated users a repeat-free experience across sessions.
--
-- Idempotent: safe to run more than once. All DDL statements use
-- IF NOT EXISTS guards. The seed INSERT uses ON CONFLICT DO NOTHING.

-- ── Extension (guard in case 001 has not been applied) ───────────────────────

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Table: trivia_questions ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trivia_questions (
  -- Stable text identifier. Matches the 'q01'–'q45' IDs used in
  -- mockQuestions.ts so that any usedQuestionIds already stored in
  -- client localStorage remain valid after the migration.
  id            TEXT        PRIMARY KEY,

  -- The displayed title of the movie or TV show.
  media_title   TEXT        NOT NULL,

  -- Discriminator. Drives the card badge ("MOVIE" vs "TV") in the UI.
  media_type    TEXT        NOT NULL CHECK (media_type IN ('movie', 'tv')),

  -- Release year as displayed on the card. Not used in query predicates;
  -- stored as INTEGER to match the TriviaQuestion.year TypeScript field.
  media_year    INTEGER,

  -- The true/false claim presented to the player.
  statement     TEXT        NOT NULL,

  -- Correct answer: TRUE means the statement is factually correct.
  answer        BOOLEAN     NOT NULL,

  -- Subjective difficulty band. Controls pool weighting in future versions
  -- (e.g. weighted sampling toward medium difficulty).
  -- Application-level constraint: the API must only accept these three values.
  difficulty    TEXT        NOT NULL DEFAULT 'medium'
                  CHECK (difficulty IN ('easy', 'medium', 'hard')),

  -- Optional category for future filtering (e.g. 'awards', 'cast', 'plot').
  -- NULL means uncategorised. No CHECK constraint so categories can be
  -- added without a schema migration.
  category      TEXT,

  -- TMDB poster_path for the related title. Nullable — not all entries
  -- will have a path at seed time; the API can populate this lazily.
  poster_path   TEXT,

  -- Whether this question is available for serving. Soft-disabling a bad
  -- question does not require a DELETE and avoids breaking existing
  -- trivia_user_answers rows that reference it.
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexes: trivia_questions ─────────────────────────────────────────────────

-- Primary question-pool query index.
-- Serves: WHERE is_active = TRUE (... AND difficulty = $1 if filtered).
-- Partial index on active questions keeps it narrow. difficulty is appended
-- so a difficulty-filtered query can use an index-only scan.
CREATE INDEX IF NOT EXISTS idx_trivia_questions_active_difficulty
  ON trivia_questions (difficulty)
  WHERE is_active = TRUE;

-- ── Table: trivia_user_answers ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trivia_user_answers (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Auth0 subject identifier. Same convention as trivia_runs.user_id —
  -- no foreign key, Auth0 is the authoritative user store.
  user_id       TEXT        NOT NULL,

  -- References trivia_questions.id (TEXT). ON DELETE CASCADE means that
  -- retiring a question (hard-delete) automatically cleans up answer history.
  -- In practice, prefer soft-delete via is_active = FALSE.
  question_id   TEXT        NOT NULL
                  REFERENCES trivia_questions (id) ON DELETE CASCADE,

  -- Whether the player answered correctly. Stored for potential future
  -- analytics (e.g. per-question accuracy stats). Not used by the
  -- repeat-avoidance logic, which only checks presence of a row.
  answered_correctly BOOLEAN,

  -- When the question was answered. Used to implement a "seen in the last
  -- N days" recency window instead of a lifetime exclusion, if the team
  -- decides to rotate questions back in after a cooldown period.
  answered_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexes: trivia_user_answers ──────────────────────────────────────────────

-- Primary repeat-avoidance query index.
-- Serves: SELECT question_id FROM trivia_user_answers
--         WHERE user_id = $1 (AND answered_at >= $2 for recency window)
-- Composite on (user_id, answered_at DESC) covers the WHERE clause and
-- allows the query to add an answered_at recency filter cheaply.
CREATE INDEX IF NOT EXISTS idx_trivia_user_answers_user_id_answered_at
  ON trivia_user_answers (user_id, answered_at DESC);

-- Covering index for the question_id column.
-- Serves: SELECT question_id FROM trivia_user_answers WHERE user_id = $1
-- Including question_id makes the above query an index-only scan without
-- needing to touch the heap for the selected column.
CREATE INDEX IF NOT EXISTS idx_trivia_user_answers_user_id_question_id
  ON trivia_user_answers (user_id, question_id);

-- Uniqueness per user per question per calendar day is NOT enforced at the
-- DB level — a user may see the same question again across sessions if the
-- recency window has expired. The API enforces the exclusion window.

-- ── Seed: initial question pool from mockQuestions.ts ────────────────────────
-- ON CONFLICT DO NOTHING makes this idempotent; running the migration twice
-- will not overwrite any edits made to questions after initial seeding.

INSERT INTO trivia_questions
  (id, media_title, media_type, media_year, statement, answer, difficulty)
VALUES
  -- TRUE statements
  ('q01', 'The Silence of the Lambs', 'movie', 1991,
   'This film won the Academy Award for Best Picture.', TRUE, 'easy'),

  ('q02', 'Pulp Fiction', 'movie', 1994,
   'This film was directed by Quentin Tarantino.', TRUE, 'easy'),

  ('q03', 'Titanic', 'movie', 1997,
   'Leonardo DiCaprio starred in this film.', TRUE, 'easy'),

  ('q04', 'Friends', 'tv', 1994,
   'This series ran for 10 seasons.', TRUE, 'easy'),

  ('q05', 'The Sixth Sense', 'movie', 1999,
   'This film features the quote "I see dead people."', TRUE, 'easy'),

  ('q06', 'The Matrix', 'movie', 1999,
   'Keanu Reeves plays the lead character in this film.', TRUE, 'easy'),

  ('q07', 'The Sopranos', 'tv', 1999,
   'This show was created by David Chase.', TRUE, 'medium'),

  ('q08', 'The Lord of the Rings: The Fellowship of the Ring', 'movie', 2001,
   'This film is set primarily in New Zealand.', TRUE, 'medium'),

  ('q09', 'The Dark Knight', 'movie', 2008,
   'Heath Ledger won a posthumous Oscar for this film.', TRUE, 'easy'),

  ('q10', 'Toy Story', 'movie', 1995,
   'This animated film was Pixar''s first feature.', TRUE, 'easy'),

  ('q11', 'Breaking Bad', 'tv', 2008,
   'Bryan Cranston plays the lead character in this series.', TRUE, 'easy'),

  ('q12', 'Schindler''s List', 'movie', 1993,
   'This film was shot entirely in black and white.', TRUE, 'medium'),

  ('q13', 'Game of Thrones', 'tv', 2011,
   'This show is based on a series of novels by George R.R. Martin.', TRUE, 'easy'),

  ('q14', 'The Matrix', 'movie', 1999,
   'This film takes place mostly inside a computer simulation.', TRUE, 'easy'),

  ('q15', 'Parasite', 'movie', 2019,
   'This film won the Palme d''Or at the Cannes Film Festival.', TRUE, 'medium'),

  ('q16', 'Joker', 'movie', 2019,
   'Joaquin Phoenix won the Best Actor Oscar for this film.', TRUE, 'medium'),

  ('q17', 'Stranger Things', 'tv', 2016,
   'This series is set in Hawkins, Indiana.', TRUE, 'easy'),

  ('q18', 'Avengers: Endgame', 'movie', 2019,
   'This film grossed over $2 billion worldwide.', TRUE, 'medium'),

  ('q19', 'Breaking Bad', 'tv', 2008,
   'This show premiered on HBO in 2008.', FALSE, 'hard'),

  ('q20', 'Inception', 'movie', 2010,
   'This film was directed by Christopher Nolan.', TRUE, 'easy'),

  ('q21', 'Gravity', 'movie', 2013,
   'Sandra Bullock starred in this Oscar-winning film.', TRUE, 'medium'),

  ('q22', 'Squid Game', 'tv', 2021,
   'This Korean series became Netflix''s most-watched show in 2021.', TRUE, 'easy'),

  -- FALSE statements
  ('q23', 'The Shawshank Redemption', 'movie', 1994,
   'This film was directed by Steven Spielberg.', FALSE, 'medium'),

  ('q24', 'Good Will Hunting', 'movie', 1997,
   'Tom Hanks starred in this film.', FALSE, 'medium'),

  ('q25', 'The Wire', 'tv', 2002,
   'This show aired on NBC.', FALSE, 'medium'),

  ('q26', 'Inception', 'movie', 2010,
   'This film is a sequel.', FALSE, 'easy'),

  ('q27', 'Saving Private Ryan', 'movie', 1998,
   'This film won the Best Picture Oscar.', FALSE, 'hard'),

  ('q28', 'Fight Club', 'movie', 1999,
   'Brad Pitt directed this film.', FALSE, 'medium'),

  ('q29', 'Silence of the Lambs', 'movie', 1991,
   'This film is based on a Stephen King novel.', FALSE, 'medium'),

  ('q30', 'The Office', 'tv', 2005,
   'This series premiered in the 1990s.', FALSE, 'easy'),

  ('q31', 'The Dark Knight', 'movie', 2008,
   'This film was produced by Marvel Studios.', FALSE, 'easy'),

  ('q32', 'The Grand Budapest Hotel', 'movie', 2014,
   'This film takes place in the future.', FALSE, 'easy'),

  ('q33', 'The Sopranos', 'tv', 1999,
   'This show was created by Vince Gilligan.', FALSE, 'hard'),

  ('q34', 'Finding Nemo', 'movie', 2003,
   'This animated film was made by DreamWorks.', FALSE, 'easy'),

  ('q35', 'Black Swan', 'movie', 2010,
   'Meryl Streep appears in this film.', FALSE, 'medium'),

  ('q36', 'The Lion King', 'movie', 1994,
   'This film is rated G.', FALSE, 'hard'),

  ('q37', 'Breaking Bad', 'tv', 2008,
   'This series has more than 8 seasons.', FALSE, 'easy'),

  ('q38', 'Gladiator', 'movie', 2000,
   'This film was released before 2000.', FALSE, 'hard'),

  ('q39', 'The Social Network', 'movie', 2010,
   'This film is set in Los Angeles.', FALSE, 'medium'),

  ('q40', 'Django Unchained', 'movie', 2012,
   'Will Smith starred in this film.', FALSE, 'medium'),

  ('q41', 'Stranger Things', 'tv', 2016,
   'This show premiered on Amazon Prime Video.', FALSE, 'easy'),

  ('q42', 'Interstellar', 'movie', 2014,
   'This film is a remake of a 1960s movie.', FALSE, 'easy'),

  ('q43', 'The Revenant', 'movie', 2015,
   'This film features time travel as a plot device.', FALSE, 'easy'),

  ('q44', 'Game of Thrones', 'tv', 2011,
   'This series is a Netflix original.', FALSE, 'easy'),

  ('q45', 'No Country for Old Men', 'movie', 2007,
   'This film was directed by Martin Scorsese.', FALSE, 'medium')

ON CONFLICT (id) DO NOTHING;

-- ── Rollback ──────────────────────────────────────────────────────────────────
-- To undo this migration, run the statements below in order.
-- trivia_user_answers has a foreign key referencing trivia_questions, so
-- it must be dropped first.
--
-- DROP TABLE IF EXISTS trivia_user_answers;
-- DROP INDEX IF EXISTS idx_trivia_questions_active_difficulty;
-- DROP TABLE IF EXISTS trivia_questions;

-- ── Verification queries ──────────────────────────────────────────────────────
-- Run these after applying the migration to confirm the tables exist and
-- the seed data loaded correctly.
--
-- SELECT COUNT(*) FROM trivia_questions;          -- expect 45
-- SELECT COUNT(*) FROM trivia_questions WHERE answer = TRUE;   -- expect 22
-- SELECT COUNT(*) FROM trivia_questions WHERE answer = FALSE;  -- expect 23
--
-- SELECT table_name, column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name IN ('trivia_questions', 'trivia_user_answers')
-- ORDER BY table_name, ordinal_position;
--
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename IN ('trivia_questions', 'trivia_user_answers')
-- ORDER BY tablename, indexname;
