import { NextRequest, NextResponse } from 'next/server'
import { getDb, hasDatabase } from '@/services/db'
import { auth0 } from '@/lib/auth0'

/** DELETE /api/feedback/[id] — delete own post */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!auth0) {
    return NextResponse.json(
      { error: 'Auth not configured' },
      { status: 500 }
    )
  }

  const session = await auth0.getSession()
  if (!session) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  if (!hasDatabase()) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    )
  }

  const { id: postId } = await params
  const userId = session.user.sub

  const sql = getDb()

  try {
    const rows =
      await sql`SELECT author_id FROM feedback_posts WHERE id = ${postId}`

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    if (rows[0].author_id !== userId) {
      return NextResponse.json(
        { error: 'Not authorized to delete this post' },
        { status: 403 }
      )
    }

    await sql`DELETE FROM feedback_posts WHERE id = ${postId}`

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Delete feedback error:', e)
    return NextResponse.json(
      { error: 'Failed to delete post' },
      { status: 500 }
    )
  }
}
