import { NextRequest, NextResponse } from 'next/server'
import { getDb, hasDatabase } from '@/services/db'
import { auth0 } from '@/lib/auth0'

interface PollRow {
  id: string
  status: string
  expires_at: string | null
}

interface OptionRow {
  id: string
  poll_id: string
  option_text: string
  display_order: number
  vote_count: number
}

/** POST /api/polls/[id]/vote — cast a vote */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!auth0) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
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

  const { id: pollId } = await params
  const userId = session.user.sub as string

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const optionId = typeof body.option_id === 'string' ? body.option_id : ''
  if (!optionId) {
    return NextResponse.json(
      { error: 'option_id is required' },
      { status: 400 }
    )
  }

  const sql = getDb()

  try {
    // Fetch the poll
    const pollRows = (await sql`
      SELECT id, author_id, title, description, status, expires_at, created_at FROM polls WHERE id = ${pollId}
    `) as (PollRow & { author_id: string; title: string; description: string | null; created_at: string })[]

    if (pollRows.length === 0) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
    }

    const poll = pollRows[0]

    // Check if poll is closed or expired
    const isExpired =
      poll.expires_at !== null &&
      new Date(poll.expires_at).getTime() < Date.now()
    if (poll.status === 'closed' || isExpired) {
      return NextResponse.json(
        { error: 'This poll is closed' },
        { status: 400 }
      )
    }

    // Verify option belongs to this poll
    const optionRows = (await sql`
      SELECT id, poll_id FROM poll_options WHERE id = ${optionId}
    `) as { id: string; poll_id: string }[]

    if (optionRows.length === 0 || optionRows[0].poll_id !== pollId) {
      return NextResponse.json(
        { error: 'Invalid option for this poll' },
        { status: 400 }
      )
    }

    // Insert vote (UNIQUE constraint on poll_id, user_id enforces one-vote)
    try {
      await sql`
        INSERT INTO poll_votes (poll_id, option_id, user_id)
        VALUES (${pollId}, ${optionId}, ${userId})
      `
    } catch (e: unknown) {
      const dbError = e as { code?: string }
      if (dbError.code === '23505') {
        return NextResponse.json(
          { error: 'You have already voted on this poll' },
          { status: 409 }
        )
      }
      throw e
    }

    // Increment denormalized vote_count
    await sql`
      UPDATE poll_options SET vote_count = vote_count + 1
      WHERE id = ${optionId}
    `

    // Fetch updated poll data to return
    const updatedOptions = (await sql`
      SELECT id, poll_id, option_text, display_order, vote_count
      FROM poll_options
      WHERE poll_id = ${pollId}
      ORDER BY display_order ASC
    `) as OptionRow[]

    const totalVotes = updatedOptions.reduce(
      (sum, o) => sum + Number(o.vote_count),
      0
    )

    const fullPoll = poll as PollRow & { author_id: string; title: string; description: string | null; created_at: string }

    return NextResponse.json({
      poll: {
        id: fullPoll.id,
        title: fullPoll.title,
        description: fullPoll.description,
        status: fullPoll.status,
        expires_at: fullPoll.expires_at,
        total_votes: totalVotes,
        options: updatedOptions.map((o) => ({
          id: o.id,
          option_text: o.option_text,
          display_order: o.display_order,
          vote_count: Number(o.vote_count),
        })),
        user_vote: optionId,
        is_author: fullPoll.author_id === userId,
        author_name: null,
        created_at: fullPoll.created_at,
      },
    })
  } catch (e) {
    console.error('Poll vote error:', e)
    return NextResponse.json({ error: 'Failed to vote' }, { status: 500 })
  }
}
