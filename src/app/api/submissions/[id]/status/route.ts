import { NextRequest, NextResponse } from 'next/server'
import { getDb, hasDatabase } from '@/services/db'
import { validateAgentRequest } from '@/lib/validateAgentRequest'

const VALID_STATUSES = [
  'open',
  'under_review',
  'in_progress',
  'completed',
  'declined',
]

/** PATCH /api/submissions/[id]/status — update post status (agent only) */
export async function PATCH(
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

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const status = typeof body.status === 'string' ? body.status.trim() : ''

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
      { status: 400 }
    )
  }

  const sql = getDb()

  try {
    const rows = await sql`
      UPDATE feedback_posts SET status = ${status}, updated_at = now()
      WHERE id = ${postId}
      RETURNING *
    `

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    return NextResponse.json({ post: rows[0] })
  } catch (e) {
    console.error('Update status error:', e)
    return NextResponse.json(
      { error: 'Failed to update status' },
      { status: 500 }
    )
  }
}
