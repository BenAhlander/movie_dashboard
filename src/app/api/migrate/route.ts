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

    return NextResponse.json({ success: true, message: 'Migrations applied' })
  } catch (e) {
    console.error('Migration error:', e)
    return NextResponse.json({ error: 'Migration failed' }, { status: 500 })
  }
}
