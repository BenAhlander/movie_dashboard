import { NextResponse } from 'next/server'
import { getDb, hasDatabase } from '@/services/db'
import { auth0 } from '@/lib/auth0'

interface FilmRow {
  id: string
  tmdb_id: number
  title: string
  year: number | null
  poster_path: string | null
  elo_rating: string
  vote_count: number
}

interface MatchupRow {
  id: string
  film_a_id: string
  film_b_id: string
}

/** GET /api/h2h/matchup — next unseen matchup for the authenticated user */
export async function GET() {
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

  const userId = session.user.sub as string
  const sql = getDb()

  try {
    // Find a random matchup the user has NOT voted on
    const matchupRows = (await sql`
      SELECT m.id, m.film_a_id, m.film_b_id
      FROM h2h_matchups m
      WHERE NOT EXISTS (
        SELECT 1 FROM h2h_matchup_votes mv
        WHERE mv.matchup_id = m.id
          AND mv.user_id = ${userId}
      )
      ORDER BY random()
      LIMIT 1
    `) as MatchupRow[]

    if (matchupRows.length === 0) {
      return new NextResponse(null, { status: 204 })
    }

    const matchup = matchupRows[0]

    // Fetch both films
    const filmRows = (await sql`
      SELECT id, tmdb_id, title, year, poster_path, elo_rating, vote_count
      FROM h2h_films
      WHERE id = ${matchup.film_a_id} OR id = ${matchup.film_b_id}
    `) as FilmRow[]

    const filmA = filmRows.find((f) => f.id === matchup.film_a_id)
    const filmB = filmRows.find((f) => f.id === matchup.film_b_id)

    if (!filmA || !filmB) {
      return NextResponse.json(
        { error: 'Film data inconsistency' },
        { status: 500 }
      )
    }

    const mapFilm = (f: FilmRow) => ({
      id: f.id,
      tmdbId: Number(f.tmdb_id),
      title: f.title,
      year: f.year ? Number(f.year) : null,
      posterPath: f.poster_path,
      eloRating: Number(f.elo_rating),
      voteCount: Number(f.vote_count),
    })

    return NextResponse.json({
      matchup: {
        id: matchup.id,
        filmA: mapFilm(filmA),
        filmB: mapFilm(filmB),
      },
    })
  } catch (e) {
    console.error('H2H matchup error:', e)
    return NextResponse.json(
      { error: 'Failed to fetch matchup' },
      { status: 500 }
    )
  }
}
