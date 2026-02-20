import { NextRequest, NextResponse } from 'next/server'
import { getDb, hasDatabase } from '@/services/db'
import { validateAgentRequest } from '@/lib/validateAgentRequest'

/** GET /api/submissions/[id] — single post with comments for agent consumption */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = validateAgentRequest(req)
  if (authError) return authError

  if (!hasDatabase()) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    )
  }

  const { id: postId } = await params
  const sql = getDb()

  try {
    const postRows = await sql`
      SELECT * FROM feedback_posts WHERE id = ${postId}
    `

    if (postRows.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const comments = await sql`
      SELECT id, post_id, body, author_id, is_agent_comment, created_at
      FROM feedback_comments
      WHERE post_id = ${postId}
      ORDER BY created_at ASC
    `

    return NextResponse.json({ ...postRows[0], comments })
  } catch (e) {
    console.error('Fetch submission error:', e)
    return NextResponse.json(
      { error: 'Failed to fetch submission' },
      { status: 500 }
    )
  }
}
