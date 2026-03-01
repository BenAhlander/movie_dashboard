import { NextRequest, NextResponse } from 'next/server'
import { getDb, hasDatabase } from '@/services/db'
import { auth0 } from '@/lib/auth0'

interface MatchupRow {
  id: string
  film_a_id: string
  film_b_id: string
}

interface FilmRow {
  id: string
  elo_rating: string
}

/** K-factor for Elo calculation */
const K_FACTOR = 32

/** POST /api/h2h/matchups/[id]/vote — cast a vote on a matchup */
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

  const { id: matchupId } = await params
  const userId = session.user.sub as string

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const winnerId = typeof body.winnerId === 'string' ? body.winnerId : ''
  if (!winnerId) {
    return NextResponse.json(
      { error: 'winnerId is required' },
      { status: 400 }
    )
  }

  const sql = getDb()

  try {
    // Fetch the matchup
    const matchupRows = (await sql`
      SELECT id, film_a_id, film_b_id
      FROM h2h_matchups
      WHERE id = ${matchupId}
    `) as MatchupRow[]

    if (matchupRows.length === 0) {
      return NextResponse.json(
        { error: 'Matchup not found' },
        { status: 404 }
      )
    }

    const matchup = matchupRows[0]

    // Validate winnerId is one of the two films
    if (winnerId !== matchup.film_a_id && winnerId !== matchup.film_b_id) {
      return NextResponse.json(
        { error: 'winnerId must be one of the matchup films' },
        { status: 400 }
      )
    }

    const loserId =
      winnerId === matchup.film_a_id ? matchup.film_b_id : matchup.film_a_id

    // Insert vote (UNIQUE constraint enforces one vote per user per matchup)
    let voteId: string
    try {
      const voteRows = (await sql`
        INSERT INTO h2h_matchup_votes (matchup_id, user_id, winner_id)
        VALUES (${matchupId}, ${userId}, ${winnerId})
        RETURNING id
      `) as { id: string }[]
      voteId = voteRows[0].id
    } catch (e: unknown) {
      const dbError = e as { code?: string }
      if (dbError.code === '23505') {
        return NextResponse.json(
          { error: 'Already voted on this matchup' },
          { status: 409 }
        )
      }
      throw e
    }

    // Fetch current Elo ratings for both films
    const filmRows = (await sql`
      SELECT id, elo_rating
      FROM h2h_films
      WHERE id = ${winnerId} OR id = ${loserId}
    `) as FilmRow[]

    const winnerFilm = filmRows.find((f) => f.id === winnerId)
    const loserFilm = filmRows.find((f) => f.id === loserId)

    if (!winnerFilm || !loserFilm) {
      return NextResponse.json(
        { error: 'Film data inconsistency' },
        { status: 500 }
      )
    }

    const winnerElo = Number(winnerFilm.elo_rating)
    const loserElo = Number(loserFilm.elo_rating)

    // Elo calculation
    const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400))
    const expectedLoser = 1 - expectedWinner

    const newWinnerElo = Math.max(
      1,
      Math.round((winnerElo + K_FACTOR * (1 - expectedWinner)) * 100) / 100
    )
    const newLoserElo = Math.max(
      1,
      Math.round((loserElo + K_FACTOR * (0 - expectedLoser)) * 100) / 100
    )

    // Update Elo ratings and vote counts for both films
    await sql`
      UPDATE h2h_films
      SET elo_rating = ${newWinnerElo},
          vote_count = vote_count + 1,
          updated_at = now()
      WHERE id = ${winnerId}
    `

    await sql`
      UPDATE h2h_films
      SET elo_rating = ${newLoserElo},
          vote_count = vote_count + 1,
          updated_at = now()
      WHERE id = ${loserId}
    `

    // Determine which is film A and film B for the response
    const filmAId = matchup.film_a_id
    const filmBId = matchup.film_b_id
    const filmAElo = filmAId === winnerId ? newWinnerElo : newLoserElo
    const filmBElo = filmBId === winnerId ? newWinnerElo : newLoserElo

    return NextResponse.json({
      vote: {
        id: voteId,
        matchupId,
        winnerId,
        votedAt: new Date().toISOString(),
      },
      updatedRatings: {
        filmAId,
        filmAElo,
        filmBId,
        filmBElo,
      },
    })
  } catch (e) {
    console.error('H2H vote error:', e)
    return NextResponse.json(
      { error: 'Failed to submit vote' },
      { status: 500 }
    )
  }
}
