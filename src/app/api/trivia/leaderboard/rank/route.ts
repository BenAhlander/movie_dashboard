import { NextRequest, NextResponse } from 'next/server'
import { getDb, hasDatabase } from '@/services/db'

const VALID_PERIODS = ['today', 'allTime'] as const
type Period = (typeof VALID_PERIODS)[number]

export async function GET(req: NextRequest) {
  const url = req.nextUrl
  const score = parseInt(url.searchParams.get('score') ?? '', 10)
  const total = parseInt(url.searchParams.get('total') ?? '', 10)
  const periodParam = url.searchParams.get('period') ?? 'today'

  if (
    !Number.isInteger(score) ||
    !Number.isInteger(total) ||
    score < 0 ||
    total < 1 ||
    score > total
  ) {
    return NextResponse.json(
      { error: 'score and total must be valid integers with score <= total' },
      { status: 400 }
    )
  }

  if (!VALID_PERIODS.includes(periodParam as Period)) {
    return NextResponse.json(
      { error: 'period must be "today" or "allTime"' },
      { status: 400 }
    )
  }

  const period = periodParam as Period

  if (!hasDatabase()) {
    return NextResponse.json({ rank: 1, period, totalPlayers: 0 })
  }

  const pct = (score / total) * 100
  const sql = getDb()

  try {
    let result: { rank: number; total_players: number }[]

    if (period === 'today') {
      result = (await sql`
        WITH aggregated AS (
          SELECT
            user_id,
            SUM(score)::int AS score,
            SUM(total)::int AS total,
            ROUND(SUM(score)::numeric / NULLIF(SUM(total), 0) * 100, 2) AS pct
          FROM trivia_runs
          WHERE played_at >= NOW() - INTERVAL '24 hours'
          GROUP BY user_id
        )
        SELECT
          (
            SELECT COUNT(*) + 1
            FROM aggregated
            WHERE pct > ${pct}
               OR (pct = ${pct} AND score > ${score})
          ) AS rank,
          COUNT(*) AS total_players
        FROM aggregated
      `) as { rank: number; total_players: number }[]
    } else {
      result = (await sql`
        WITH aggregated AS (
          SELECT
            user_id,
            SUM(score)::int AS score,
            SUM(total)::int AS total,
            ROUND(SUM(score)::numeric / NULLIF(SUM(total), 0) * 100, 2) AS pct
          FROM trivia_runs
          GROUP BY user_id
        )
        SELECT
          (
            SELECT COUNT(*) + 1
            FROM aggregated
            WHERE pct > ${pct}
               OR (pct = ${pct} AND score > ${score})
          ) AS rank,
          COUNT(*) AS total_players
        FROM aggregated
      `) as { rank: number; total_players: number }[]
    }

    return NextResponse.json({
      rank: Number(result[0].rank),
      period,
      totalPlayers: Number(result[0].total_players),
    })
  } catch (e) {
    console.error('Trivia rank lookup error:', e)
    return NextResponse.json(
      { error: 'Failed to compute rank' },
      { status: 500 }
    )
  }
}
