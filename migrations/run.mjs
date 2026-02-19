import 'dotenv/config'
import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'
import { config } from 'dotenv'

config({ path: '.env.local', override: true })

const sql = neon(process.env.POSTGRES_URL)

// Run each statement individually, in order
const statements = [
  `CREATE EXTENSION IF NOT EXISTS "pgcrypto"`,
  `CREATE TABLE IF NOT EXISTS feedback_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(100) NOT NULL,
    body VARCHAR(500) NOT NULL,
    category VARCHAR(20) NOT NULL CHECK (category IN ('bug', 'feature', 'general')),
    score INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS feedback_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES feedback_posts(id) ON DELETE CASCADE,
    voter_hash VARCHAR(128) NOT NULL,
    vote SMALLINT NOT NULL CHECK (vote IN (-1, 1)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (post_id, voter_hash)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_feedback_posts_created_at ON feedback_posts(created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_feedback_posts_score ON feedback_posts(score DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_feedback_posts_category ON feedback_posts(category)`,
  `CREATE INDEX IF NOT EXISTS idx_feedback_votes_post_id ON feedback_votes(post_id)`,
  `CREATE INDEX IF NOT EXISTS idx_feedback_votes_voter_hash ON feedback_votes(voter_hash)`,
]

for (const stmt of statements) {
  const preview = stmt.replace(/\s+/g, ' ').slice(0, 60)
  console.log('Running:', preview + '...')
  await sql.query(stmt)
  console.log('  OK')
}

console.log('\nMigration complete!')
