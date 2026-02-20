import { NextRequest, NextResponse } from 'next/server'
import { getDb, hasDatabase } from '@/services/db'

/** DELETE /api/submissions/[id]/comments/[commentId] — delete a comment */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  if (!hasDatabase()) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    )
  }

  const { id: postId, commentId } = await params

  // Get the author_id from query params or body
  const url = req.nextUrl
  const authorId = url.searchParams.get('author_id')

  if (!authorId) {
    return NextResponse.json(
      { error: 'author_id is required' },
      { status: 400 }
    )
  }

  const sql = getDb()

  try {
    // First, verify the comment exists and belongs to this user
    const existingRows = await sql`
      SELECT id, author_id
      FROM feedback_comments
      WHERE id = ${commentId} AND post_id = ${postId}
    `

    if (existingRows.length === 0) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      )
    }

    const comment = existingRows[0]

    // Check ownership - author_id must match
    if (comment.author_id !== authorId) {
      return NextResponse.json(
        { error: 'You can only delete your own comments' },
        { status: 403 }
      )
    }

    // Delete the comment
    await sql`
      DELETE FROM feedback_comments
      WHERE id = ${commentId}
    `

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Delete comment error:', e)
    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 }
    )
  }
}
