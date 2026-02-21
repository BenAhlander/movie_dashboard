import { NextRequest, NextResponse } from 'next/server'
import { getDb, hasDatabase } from '@/services/db'
import { auth0 } from '@/lib/auth0'

const PAGE_SIZE = 20

interface PollRow {
  id: string
  author_id: string
  title: string
  description: string | null
  status: string
  expires_at: string | null
  created_at: string
  updated_at: string
}

interface OptionRow {
  id: string
  poll_id: string
  option_text: string
  display_order: number
  vote_count: number
}

interface VoteRow {
  option_id: string
}

function isPollExpired(poll: PollRow): boolean {
  return (
    poll.expires_at !== null && new Date(poll.expires_at).getTime() < Date.now()
  )
}

function effectiveStatus(poll: PollRow): string {
  if (poll.status === 'closed') return 'closed'
  if (isPollExpired(poll)) return 'closed'
  return 'open'
}

/** GET /api/polls — list polls */
export async function GET(req: NextRequest) {
  if (!hasDatabase()) {
    return NextResponse.json({ results: [], total: 0, page: 1, demo: true })
  }

  const url = req.nextUrl
  const sort = url.searchParams.get('sort') === 'popular' ? 'popular' : 'new'
  const statusFilter = url.searchParams.get('status') || 'all'
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
  const userId = url.searchParams.get('userId') || ''
  const offset = (page - 1) * PAGE_SIZE

  const sql = getDb()

  try {
    // Build WHERE clause for status filter
    let pollRows: PollRow[]
    let countRows: { total: string }[]

    if (statusFilter === 'open') {
      if (sort === 'popular') {
        pollRows = (await sql`
          SELECT * FROM polls
          WHERE status = 'open' AND (expires_at IS NULL OR expires_at > now())
          ORDER BY (SELECT COALESCE(SUM(vote_count), 0) FROM poll_options WHERE poll_id = polls.id) DESC, created_at DESC
          LIMIT ${PAGE_SIZE} OFFSET ${offset}
        `) as PollRow[]
      } else {
        pollRows = (await sql`
          SELECT * FROM polls
          WHERE status = 'open' AND (expires_at IS NULL OR expires_at > now())
          ORDER BY created_at DESC
          LIMIT ${PAGE_SIZE} OFFSET ${offset}
        `) as PollRow[]
      }
      countRows = (await sql`
        SELECT COUNT(*) as total FROM polls
        WHERE status = 'open' AND (expires_at IS NULL OR expires_at > now())
      `) as { total: string }[]
    } else if (statusFilter === 'closed') {
      if (sort === 'popular') {
        pollRows = (await sql`
          SELECT * FROM polls
          WHERE status = 'closed' OR (expires_at IS NOT NULL AND expires_at <= now())
          ORDER BY (SELECT COALESCE(SUM(vote_count), 0) FROM poll_options WHERE poll_id = polls.id) DESC, created_at DESC
          LIMIT ${PAGE_SIZE} OFFSET ${offset}
        `) as PollRow[]
      } else {
        pollRows = (await sql`
          SELECT * FROM polls
          WHERE status = 'closed' OR (expires_at IS NOT NULL AND expires_at <= now())
          ORDER BY created_at DESC
          LIMIT ${PAGE_SIZE} OFFSET ${offset}
        `) as PollRow[]
      }
      countRows = (await sql`
        SELECT COUNT(*) as total FROM polls
        WHERE status = 'closed' OR (expires_at IS NOT NULL AND expires_at <= now())
      `) as { total: string }[]
    } else {
      // all
      if (sort === 'popular') {
        pollRows = (await sql`
          SELECT * FROM polls
          ORDER BY (SELECT COALESCE(SUM(vote_count), 0) FROM poll_options WHERE poll_id = polls.id) DESC, created_at DESC
          LIMIT ${PAGE_SIZE} OFFSET ${offset}
        `) as PollRow[]
      } else {
        pollRows = (await sql`
          SELECT * FROM polls
          ORDER BY created_at DESC
          LIMIT ${PAGE_SIZE} OFFSET ${offset}
        `) as PollRow[]
      }
      countRows = (await sql`
        SELECT COUNT(*) as total FROM polls
      `) as { total: string }[]
    }

    // Fetch options and user votes for all polls in this page
    const pollIds = pollRows.map((p) => p.id)

    let allOptions: OptionRow[] = []
    let userVotes: VoteRow[] = []

    if (pollIds.length > 0) {
      allOptions = (await sql`
        SELECT id, poll_id, option_text, display_order, vote_count
        FROM poll_options
        WHERE poll_id = ANY(${pollIds})
        ORDER BY display_order ASC
      `) as OptionRow[]

      if (userId) {
        userVotes = (await sql`
          SELECT poll_id, option_id
          FROM poll_votes
          WHERE poll_id = ANY(${pollIds}) AND user_id = ${userId}
        `) as (VoteRow & { poll_id: string })[]
      }
    }

    // Group options by poll
    const optionsByPoll = new Map<string, OptionRow[]>()
    for (const opt of allOptions) {
      const list = optionsByPoll.get(opt.poll_id) || []
      list.push(opt)
      optionsByPoll.set(opt.poll_id, list)
    }

    // Map user votes by poll
    const voteByPoll = new Map<string, string>()
    for (const v of userVotes as (VoteRow & { poll_id: string })[]) {
      voteByPoll.set(v.poll_id, v.option_id)
    }

    const results = pollRows.map((poll) => {
      const options = optionsByPoll.get(poll.id) || []
      const totalVotes = options.reduce((sum, o) => sum + Number(o.vote_count), 0)
      return {
        id: poll.id,
        title: poll.title,
        description: poll.description,
        status: effectiveStatus(poll),
        expires_at: poll.expires_at,
        total_votes: totalVotes,
        options: options.map((o) => ({
          id: o.id,
          option_text: o.option_text,
          display_order: o.display_order,
          vote_count: Number(o.vote_count),
        })),
        user_vote: voteByPoll.get(poll.id) || null,
        is_author: poll.author_id === userId,
        author_name: null,
        created_at: poll.created_at,
      }
    })

    return NextResponse.json({
      results,
      total: Number(countRows[0].total),
      page,
    })
  } catch (e) {
    console.error('Polls list error:', e)
    return NextResponse.json(
      { error: 'Failed to fetch polls' },
      { status: 500 }
    )
  }
}

/** POST /api/polls — create a new poll */
export async function POST(req: NextRequest) {
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

  const contentLength = parseInt(req.headers.get('content-length') || '0', 10)
  if (contentLength > 5000) {
    return NextResponse.json({ error: 'Request too large' }, { status: 413 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const description =
    typeof body.description === 'string' ? body.description.trim() : null
  const options = Array.isArray(body.options) ? body.options : []
  const expiresIn = body.expires_in as string | null

  // Validate title
  if (title.length < 10 || title.length > 200) {
    return NextResponse.json(
      { error: 'Title must be 10-200 characters' },
      { status: 400 }
    )
  }

  // Validate options
  if (options.length < 2 || options.length > 6) {
    return NextResponse.json(
      { error: 'Must have 2-6 options' },
      { status: 400 }
    )
  }

  const cleanOptions = options.map((o: unknown) =>
    typeof o === 'string' ? o.trim().replace(/<[^>]*>/g, '') : ''
  )

  if (cleanOptions.some((o: string) => o.length === 0 || o.length > 100)) {
    return NextResponse.json(
      { error: 'Each option must be 1-100 characters' },
      { status: 400 }
    )
  }

  // Strip HTML from title/description
  const cleanTitle = title.replace(/<[^>]*>/g, '')
  const cleanDescription = description
    ? description.replace(/<[^>]*>/g, '')
    : null

  // Compute expires_at
  let expiresAt: Date | null = null
  if (expiresIn === '1d') {
    expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
  } else if (expiresIn === '3d') {
    expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
  } else if (expiresIn === '7d') {
    expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  }

  const authorId = session.user.sub as string
  const sql = getDb()

  try {
    // Insert poll
    const pollRows = await sql`
      INSERT INTO polls (author_id, title, description, expires_at)
      VALUES (${authorId}, ${cleanTitle}, ${cleanDescription}, ${expiresAt ? expiresAt.toISOString() : null})
      RETURNING *
    `
    const poll = pollRows[0]

    // Insert options
    const optionResults = []
    for (let i = 0; i < cleanOptions.length; i++) {
      const rows = await sql`
        INSERT INTO poll_options (poll_id, option_text, display_order)
        VALUES (${poll.id}, ${cleanOptions[i]}, ${i + 1})
        RETURNING *
      `
      optionResults.push(rows[0])
    }

    return NextResponse.json(
      {
        poll: {
          id: poll.id,
          title: poll.title,
          description: poll.description,
          status: 'open',
          expires_at: poll.expires_at,
          total_votes: 0,
          options: optionResults.map((o) => ({
            id: o.id,
            option_text: o.option_text,
            display_order: o.display_order,
            vote_count: 0,
          })),
          user_vote: null,
          is_author: true,
          author_name: session.user.name || null,
          created_at: poll.created_at,
        },
      },
      { status: 201 }
    )
  } catch (e) {
    console.error('Create poll error:', e)
    return NextResponse.json(
      { error: 'Failed to create poll' },
      { status: 500 }
    )
  }
}
