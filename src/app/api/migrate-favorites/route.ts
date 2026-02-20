import { NextResponse } from 'next/server'
import { getDb, hasDatabase } from '@/services/db'

/** GET /api/migrate-favorites — run the user_favorites migration (idempotent) */
export async function GET() {
  if (!hasDatabase()) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    )
  }

  const sql = getDb()

  try {
    // Create the user_favorites table
    await sql`
      CREATE TABLE IF NOT EXISTS user_favorites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL,
        tmdb_id INTEGER NOT NULL,
        title VARCHAR(500) NOT NULL,
        poster_path VARCHAR(500),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (user_id, tmdb_id)
      )
    `

    // Index for primary query path
    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id
        ON user_favorites (user_id, created_at ASC)
    `

    // Trigger function to enforce 5-favorite limit
    await sql`
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
      $$ LANGUAGE plpgsql
    `

    // Create the trigger (drop first to make idempotent)
    await sql`
      DROP TRIGGER IF EXISTS trg_check_favorites_limit ON user_favorites
    `

    await sql`
      CREATE TRIGGER trg_check_favorites_limit
        BEFORE INSERT ON user_favorites
        FOR EACH ROW
        EXECUTE FUNCTION check_favorites_limit()
    `

    return NextResponse.json({
      success: true,
      message: 'Favorites migration applied',
    })
  } catch (e) {
    console.error('Favorites migration error:', e)
    return NextResponse.json(
      { error: 'Favorites migration failed' },
      { status: 500 }
    )
  }
}
