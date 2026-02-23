import { NextRequest, NextResponse } from 'next/server'
import { getDb, hasDatabase } from '@/services/db'

interface LeaderboardDbRow {
  rank: number
  user_id: string
  username: string
  avatar_url: string | null
  score: number
  total: number
  pct: number
}

const VALID_PERIODS = ['today', 'allTime'] as const
type Period = (typeof VALID_PERIODS)[number]

export async function GET(req: NextRequest) {
  const url = req.nextUrl
  const periodParam = url.searchParams.get('period') ?? 'today'
  const limitParam = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get('limit') ?? '25', 10))
  )

  if (!VALID_PERIODS.includes(periodParam as Period)) {
    return NextResponse.json(
      { error: 'period must be "today" or "allTime"' },
      { status: 400 }
    )
  }

  const period = periodParam as Period
  const updatedAt = new Date().toISOString()

  if (!hasDatabase()) {
    return NextResponse.json({ period, rows: [], updatedAt, demo: true })
  }

  const sql = getDb()

  try {
    let rows: LeaderboardDbRow[]

    if (period === 'today') {
      rows = (await sql`
        WITH aggregated AS (
          SELECT
            user_id,
            MAX(username) AS username,
            MAX(avatar_url) AS avatar_url,
            SUM(score)::int AS score,
            SUM(total)::int AS total,
            ROUND(SUM(score)::numeric / NULLIF(SUM(total), 0) * 100, 2) AS pct,
            MIN(played_at) AS first_played
          FROM trivia_runs
          WHERE played_at >= NOW() - INTERVAL '24 hours'
          GROUP BY user_id
        )
        SELECT
          ROW_NUMBER() OVER (ORDER BY pct DESC, score DESC, first_played ASC) AS rank,
          user_id, username, avatar_url, score, total, pct
        FROM aggregated
        ORDER BY pct DESC, score DESC, first_played ASC
        LIMIT ${limitParam}
      `) as LeaderboardDbRow[]
    } else {
      rows = (await sql`
        WITH aggregated AS (
          SELECT
            user_id,
            MAX(username) AS username,
            MAX(avatar_url) AS avatar_url,
            SUM(score)::int AS score,
            SUM(total)::int AS total,
            ROUND(SUM(score)::numeric / NULLIF(SUM(total), 0) * 100, 2) AS pct,
            MIN(played_at) AS first_played
          FROM trivia_runs
          GROUP BY user_id
        )
        SELECT
          ROW_NUMBER() OVER (ORDER BY pct DESC, score DESC, first_played ASC) AS rank,
          user_id, username, avatar_url, score, total, pct
        FROM aggregated
        ORDER BY pct DESC, score DESC, first_played ASC
        LIMIT ${limitParam}
      `) as LeaderboardDbRow[]
    }

    const response = NextResponse.json({
      period,
      rows: rows.map((r) => ({
        rank: Number(r.rank),
        userId: r.user_id,
        username: r.username,
        avatarUrl: r.avatar_url,
        score: Number(r.score),
        total: Number(r.total),
        pct: Number(r.pct),
      })),
      updatedAt,
    })

    response.headers.set(
      'Cache-Control',
      's-maxage=30, stale-while-revalidate=60'
    )

    return response
  } catch (e) {
    console.error('Trivia leaderboard error:', e)
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    )
  }
}
