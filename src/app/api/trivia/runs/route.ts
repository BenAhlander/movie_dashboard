import { NextRequest, NextResponse } from 'next/server'
import { getDb, hasDatabase } from '@/services/db'
import { auth0 } from '@/lib/auth0'

export async function POST(req: NextRequest) {
  // 1. Auth check
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

  // 2. DB check
  if (!hasDatabase()) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    )
  }

  // 3. Parse body
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const score = typeof body.score === 'number' ? body.score : NaN
  const total = typeof body.total === 'number' ? body.total : NaN

  // 4. Validate
  if (
    !Number.isInteger(score) ||
    !Number.isInteger(total) ||
    score < 0 ||
    total < 1 ||
    score > total
  ) {
    return NextResponse.json(
      {
        error:
          'score and total must be non-negative integers with score <= total and total >= 1',
      },
      { status: 400 }
    )
  }

  const userId = session.user.sub as string
  const username = (session.user.name as string) ?? 'Anonymous'
  const avatarUrl = (session.user.picture as string) ?? null
  const sql = getDb()

  // 5. Rate limit check — reject if a run was submitted in the last 30 seconds
  try {
    const recent = (await sql`
      SELECT played_at
      FROM trivia_runs
      WHERE user_id = ${userId}
      ORDER BY played_at DESC
      LIMIT 1
    `) as { played_at: string }[]
    if (recent.length > 0) {
      const lastPlayedMs = new Date(recent[0].played_at).getTime()
      if (Date.now() - lastPlayedMs < 5_000) {
        return NextResponse.json(
          { error: 'Too many submissions' },
          { status: 429 }
        )
      }
    }
  } catch (e) {
    console.error('Trivia runs rate-limit check error:', e)
    return NextResponse.json(
      { error: 'Failed to submit run' },
      { status: 500 }
    )
  }

  // 6. Insert run
  let runId: string
  let pct: number
  try {
    const rows = (await sql`
      INSERT INTO trivia_runs (user_id, username, avatar_url, score, total, pct)
      VALUES (
        ${userId},
        ${username},
        ${avatarUrl},
        ${score},
        ${total},
        ROUND((${score}::numeric / NULLIF(${total}, 0)) * 100, 2)
      )
      RETURNING id, pct
    `) as { id: string; pct: number }[]
    runId = rows[0].id
    pct = Number(rows[0].pct)
  } catch (e) {
    console.error('Trivia run insert error:', e)
    return NextResponse.json(
      { error: 'Failed to submit run' },
      { status: 500 }
    )
  }

  // 7. Compute rank in 'today' period
  let rank = 1
  try {
    const rankRows = (await sql`
      WITH best_per_user AS (
        SELECT DISTINCT ON (user_id)
          user_id, pct, score
        FROM trivia_runs
        WHERE played_at >= NOW() - INTERVAL '24 hours'
        ORDER BY user_id, pct DESC, score DESC
      )
      SELECT COUNT(*) + 1 AS rank
      FROM best_per_user
      WHERE pct > ${pct}
         OR (pct = ${pct} AND score > ${score})
    `) as { rank: number }[]
    rank = Number(rankRows[0].rank)
  } catch (e) {
    console.error('Trivia rank computation error:', e)
    // Non-fatal — return a rank of 0 to signal unknown
    rank = 0
  }

  return NextResponse.json(
    { id: runId, rank, period: 'today' },
    { status: 201 }
  )
}
