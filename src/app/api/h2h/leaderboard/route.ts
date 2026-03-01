import { NextRequest, NextResponse } from 'next/server'
import { getDb, hasDatabase } from '@/services/db'
import { auth0 } from '@/lib/auth0'

interface LeaderboardRow {
  id: string
  tmdb_id: number
  title: string
  year: number | null
  poster_path: string | null
  elo_rating: string
  vote_count: number
  rank: string
}

/** GET /api/h2h/leaderboard — top-ranked films by Elo */
export async function GET(req: NextRequest) {
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

  const limitParam = req.nextUrl.searchParams.get('limit')
  const minVotesParam = req.nextUrl.searchParams.get('minVotes')

  const limit = Math.min(Math.max(parseInt(limitParam || '50', 10) || 50, 1), 100)
  const minVotes = Math.max(parseInt(minVotesParam || '0', 10) || 0, 0)

  const sql = getDb()

  try {
    const rows = (await sql`
      SELECT
        f.id,
        f.tmdb_id,
        f.title,
        f.year,
        f.poster_path,
        f.elo_rating,
        f.vote_count,
        RANK() OVER (ORDER BY f.elo_rating DESC) AS rank
      FROM h2h_films f
      WHERE f.vote_count >= ${minVotes}
      ORDER BY f.elo_rating DESC
      LIMIT ${limit}
    `) as LeaderboardRow[]

    const films = rows.map((r) => ({
      rank: Number(r.rank),
      id: r.id,
      tmdbId: Number(r.tmdb_id),
      title: r.title,
      year: r.year ? Number(r.year) : null,
      posterPath: r.poster_path,
      eloRating: Number(r.elo_rating),
      voteCount: Number(r.vote_count),
    }))

    return NextResponse.json(
      {
        films,
        generatedAt: new Date().toISOString(),
        minVotes,
      },
      {
        headers: {
          'Cache-Control': 's-maxage=30, stale-while-revalidate=60',
        },
      }
    )
  } catch (e) {
    console.error('H2H leaderboard error:', e)
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    )
  }
}
