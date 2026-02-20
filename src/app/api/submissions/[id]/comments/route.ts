import { NextRequest, NextResponse } from 'next/server'
import { getDb, hasDatabase } from '@/services/db'

/** GET /api/submissions/[id]/comments — fetch all comments for a post */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!hasDatabase()) {
    return NextResponse.json({ comments: [] })
  }

  const { id: postId } = await params
  const sql = getDb()

  try {
    const rows = await sql`
      SELECT id, post_id, body, author_id, is_agent_comment, created_at
      FROM feedback_comments
      WHERE post_id = ${postId}
      ORDER BY created_at ASC
    `

    return NextResponse.json({ comments: rows })
  } catch (e) {
    console.error('Fetch comments error:', e)
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    )
  }
}

/** POST /api/submissions/[id]/comments — create a new comment */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!hasDatabase()) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    )
  }

  const { id: postId } = await params

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const commentBody = typeof body.body === 'string' ? body.body.trim() : ''
  const authorId = typeof body.author_id === 'string' ? body.author_id : null
  const isAgentComment = body.is_agent_comment === true
  const status = typeof body.status === 'string' ? body.status.trim() : null

  if (commentBody.length < 1 || commentBody.length > 2000) {
    return NextResponse.json(
      { error: 'Comment must be 1-2000 characters' },
      { status: 400 }
    )
  }

  // Strip HTML tags for XSS prevention
  const cleanBody = commentBody.replace(/<[^>]*>/g, '')

  const sql = getDb()

  try {
    const rows = await sql`
      INSERT INTO feedback_comments (post_id, body, author_id, is_agent_comment)
      VALUES (${postId}, ${cleanBody}, ${authorId}, ${isAgentComment})
      RETURNING *
    `

    // If a status was provided, update the post status
    if (status) {
      await sql`
        UPDATE feedback_posts SET status = ${status} WHERE id = ${postId}
      `
    }

    return NextResponse.json({ comment: rows[0] }, { status: 201 })
  } catch (e) {
    console.error('Create comment error:', e)
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    )
  }
}
