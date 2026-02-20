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

    return NextResponse.json({ success: true, message: 'Migrations applied' })
  } catch (e) {
    console.error('Migration error:', e)
    return NextResponse.json({ error: 'Migration failed' }, { status: 500 })
  }
}
