import { NextRequest, NextResponse } from 'next/server'
import { getDb, hasDatabase } from '@/services/db'
import crypto from 'crypto'

function hashVoterId(clientId: string): string {
  const pepper = process.env.VOTER_HASH_PEPPER || 'default-pepper'
  return crypto
    .createHash('sha256')
    .update(clientId + pepper)
    .digest('hex')
}

/** POST /api/feedback/[id]/vote — upsert vote */
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

  const voterId = typeof body.voterId === 'string' ? body.voterId : ''
  const action = body.action as string

  console.log('[vote] postId:', postId, 'action:', action, 'voterId:', voterId)

  if (!voterId) {
    return NextResponse.json({ error: 'voterId is required' }, { status: 400 })
  }

  if (!['up', 'down', 'remove'].includes(action)) {
    return NextResponse.json(
      { error: 'action must be up, down, or remove' },
      { status: 400 }
    )
  }

  const voterHash = hashVoterId(voterId)
  const sql = getDb()

  try {
    if (action === 'remove') {
      // Get existing vote to adjust score
      const existing =
        await sql`SELECT vote FROM feedback_votes WHERE post_id = ${postId} AND voter_hash = ${voterHash}`

      if (existing.length > 0) {
        const oldVote = existing[0].vote
        await sql`DELETE FROM feedback_votes WHERE post_id = ${postId} AND voter_hash = ${voterHash}`
        await sql`UPDATE feedback_posts SET score = score - ${oldVote}, updated_at = now() WHERE id = ${postId}`
      }
    } else {
      const voteValue = action === 'up' ? 1 : -1

      // Check for existing vote
      const existing =
        await sql`SELECT vote FROM feedback_votes WHERE post_id = ${postId} AND voter_hash = ${voterHash}`

      if (existing.length > 0) {
        const oldVote = existing[0].vote
        if (oldVote === voteValue) {
          // Same vote, no change
          const scoreRows =
            await sql`SELECT score FROM feedback_posts WHERE id = ${postId}`
          return NextResponse.json({
            newScore: scoreRows[0]?.score ?? 0,
          })
        }
        // Change vote: adjust score by difference
        const diff = voteValue - oldVote
        await sql`UPDATE feedback_votes SET vote = ${voteValue}, updated_at = now() WHERE post_id = ${postId} AND voter_hash = ${voterHash}`
        await sql`UPDATE feedback_posts SET score = score + ${diff}, updated_at = now() WHERE id = ${postId}`
      } else {
        // New vote
        await sql`INSERT INTO feedback_votes (post_id, voter_hash, vote) VALUES (${postId}, ${voterHash}, ${voteValue})`
        await sql`UPDATE feedback_posts SET score = score + ${voteValue}, updated_at = now() WHERE id = ${postId}`
      }
    }

    const scoreRows =
      await sql`SELECT score FROM feedback_posts WHERE id = ${postId}`
    const newScore = scoreRows[0]?.score ?? 0

    return NextResponse.json({
      newScore,
    })
  } catch (e) {
    console.error('Vote error:', e)
    return NextResponse.json({ error: 'Failed to vote' }, { status: 500 })
  }
}
