import { NextRequest, NextResponse } from 'next/server'
import { getDb, hasDatabase } from '@/services/db'

/** POST /api/migrate?secret=... — run database migrations */
export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  const migrationSecret = process.env.MIGRATION_SECRET

  if (!migrationSecret || secret !== migrationSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!hasDatabase()) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    )
  }

  const sql = getDb()

  try {
    // Add status column to feedback_posts if it doesn't exist
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'feedback_posts' AND column_name = 'status'
        ) THEN
          ALTER TABLE feedback_posts ADD COLUMN status varchar(50) DEFAULT 'open';
        END IF;
      END $$
    `

    // Create feedback_comments table
    await sql`
      CREATE TABLE IF NOT EXISTS feedback_comments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        post_id uuid NOT NULL REFERENCES feedback_posts(id) ON DELETE CASCADE,
        body text NOT NULL,
        author_id text,
        is_agent_comment boolean DEFAULT false,
        created_at timestamptz DEFAULT now()
      )
    `

    // Index for fast lookups by post
    await sql`
      CREATE INDEX IF NOT EXISTS idx_feedback_comments_post_id ON feedback_comments(post_id)
    `

    // ── Polls tables ──────────────────────────────────────────────────────

    await sql`
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
      )
    `

    await sql`CREATE INDEX IF NOT EXISTS idx_polls_created_at ON polls (created_at DESC)`
    await sql`CREATE INDEX IF NOT EXISTS idx_polls_author_id ON polls (author_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_polls_status_created_at ON polls (status, created_at DESC)`

    await sql`
      CREATE TABLE IF NOT EXISTS poll_options (
        id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        poll_id       UUID        NOT NULL REFERENCES polls (id) ON DELETE CASCADE,
        option_text   VARCHAR(200) NOT NULL,
        display_order SMALLINT    NOT NULL,
        vote_count    INTEGER     NOT NULL DEFAULT 0,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (poll_id, display_order)
      )
    `

    await sql`CREATE INDEX IF NOT EXISTS idx_poll_options_poll_id ON poll_options (poll_id, display_order ASC)`

    await sql`
      CREATE TABLE IF NOT EXISTS poll_votes (
        id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        poll_id     UUID        NOT NULL REFERENCES polls (id) ON DELETE CASCADE,
        option_id   UUID        NOT NULL REFERENCES poll_options (id) ON DELETE CASCADE,
        user_id     VARCHAR(255) NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (poll_id, user_id)
      )
    `

    await sql`CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_user ON poll_votes (poll_id, user_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_id ON poll_votes (poll_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_poll_votes_option_id ON poll_votes (option_id)`

    // ── Trivia runs table ───────────────────────────────────────────────────

    await sql`
      CREATE TABLE IF NOT EXISTS trivia_runs (
        id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     TEXT        NOT NULL,
        username    TEXT        NOT NULL,
        avatar_url  TEXT,
        score       INTEGER     NOT NULL CHECK (score >= 0),
        total       INTEGER     NOT NULL CHECK (total >= 1),
        pct         NUMERIC(5,2) NOT NULL CHECK (pct >= 0 AND pct <= 100),
        CONSTRAINT trivia_runs_score_lte_total CHECK (score <= total),
        played_at   TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_trivia_runs_user_id_pct
        ON trivia_runs (user_id, pct DESC, score DESC)
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_trivia_runs_played_at
        ON trivia_runs (played_at DESC)
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_trivia_runs_user_id_played_at
        ON trivia_runs (user_id, played_at DESC)
    `

    // ── Trivia questions table (migration 005) ─────────────────────────────

    await sql`
      CREATE TABLE IF NOT EXISTS trivia_questions (
        id            TEXT        PRIMARY KEY,
        media_title   TEXT        NOT NULL,
        media_type    TEXT        NOT NULL CHECK (media_type IN ('movie', 'tv')),
        media_year    INTEGER,
        statement     TEXT        NOT NULL,
        answer        BOOLEAN     NOT NULL,
        difficulty    TEXT        NOT NULL DEFAULT 'medium'
                        CHECK (difficulty IN ('easy', 'medium', 'hard')),
        category      TEXT,
        poster_path   TEXT,
        is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_trivia_questions_active_difficulty
        ON trivia_questions (difficulty)
        WHERE is_active = TRUE
    `

    // ── Trivia user answers table ───────────────────────────────────────────

    await sql`
      CREATE TABLE IF NOT EXISTS trivia_user_answers (
        id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id       TEXT        NOT NULL,
        question_id   TEXT        NOT NULL
                        REFERENCES trivia_questions (id) ON DELETE CASCADE,
        answered_correctly BOOLEAN,
        answered_at   TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_trivia_user_answers_user_id_answered_at
        ON trivia_user_answers (user_id, answered_at DESC)
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_trivia_user_answers_user_id_question_id
        ON trivia_user_answers (user_id, question_id)
    `

    // ── Seed: initial question pool ─────────────────────────────────────────

    await sql`
      INSERT INTO trivia_questions
        (id, media_title, media_type, media_year, statement, answer, difficulty)
      VALUES
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
      ON CONFLICT (id) DO NOTHING
    `

    return NextResponse.json({ success: true, message: 'Migrations applied' })
  } catch (e) {
    console.error('Migration error:', e)
    return NextResponse.json({ error: 'Migration failed' }, { status: 500 })
  }
}
