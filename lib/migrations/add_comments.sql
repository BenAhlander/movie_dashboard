-- Add comments table and status column for feedback posts
-- Safe to run multiple times (IF NOT EXISTS guards throughout)

-- Add status column to feedback_posts if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'feedback_posts' AND column_name = 'status'
  ) THEN
    ALTER TABLE feedback_posts ADD COLUMN status varchar(50) DEFAULT 'open';
  END IF;
END $$;

-- Create feedback_comments table
CREATE TABLE IF NOT EXISTS feedback_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES feedback_posts(id) ON DELETE CASCADE,
  body text NOT NULL,
  author_id text,
  is_agent_comment boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Index for fast lookups by post
CREATE INDEX IF NOT EXISTS idx_feedback_comments_post_id ON feedback_comments(post_id);
