-- Migration: Create feedback tables
-- Run this against your Neon/Vercel Postgres database

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Feedback posts
CREATE TABLE IF NOT EXISTS feedback_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(100) NOT NULL,
  body VARCHAR(500) NOT NULL,
  category VARCHAR(20) NOT NULL CHECK (category IN ('bug', 'feature', 'general')),
  score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Feedback votes (one vote per anonymous user per post)
CREATE TABLE IF NOT EXISTS feedback_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES feedback_posts(id) ON DELETE CASCADE,
  voter_hash VARCHAR(128) NOT NULL,
  vote SMALLINT NOT NULL CHECK (vote IN (-1, 1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, voter_hash)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_feedback_posts_created_at ON feedback_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_posts_score ON feedback_posts(score DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_posts_category ON feedback_posts(category);
CREATE INDEX IF NOT EXISTS idx_feedback_votes_post_id ON feedback_votes(post_id);
CREATE INDEX IF NOT EXISTS idx_feedback_votes_voter_hash ON feedback_votes(voter_hash);
