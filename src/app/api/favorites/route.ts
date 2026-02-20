import { NextRequest, NextResponse } from 'next/server'
import { getDb, hasDatabase } from '@/services/db'
import { auth0 } from '@/lib/auth0'

interface FavoriteRow {
  id: string
  tmdb_id: number
  title: string
  poster_path: string | null
  created_at: string
}

/** GET /api/favorites — list the authenticated user's favorites */
export async function GET() {
  if (!auth0) {
    return NextResponse.json({ favorites: [], demo: true })
  }

  const session = await auth0.getSession()
  if (!session) {
    return NextResponse.json({ favorites: [], demo: true })
  }

  if (!hasDatabase()) {
    return NextResponse.json({ favorites: [] })
  }

  const userId = session.user.sub
  const sql = getDb()

  try {
    const rows = (await sql`
      SELECT id, tmdb_id, title, poster_path, created_at
      FROM user_favorites
      WHERE user_id = ${userId}
      ORDER BY created_at ASC
    `) as FavoriteRow[]

    return NextResponse.json({
      favorites: rows.map((r) => ({
        id: r.id,
        tmdb_id: r.tmdb_id,
        title: r.title,
        poster_path: r.poster_path,
        created_at: r.created_at,
      })),
    })
  } catch (e) {
    console.error('Favorites list error:', e)
    return NextResponse.json(
      { error: 'Failed to fetch favorites' },
      { status: 500 }
    )
  }
}

/** POST /api/favorites — add a movie to favorites */
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

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const tmdbId =
    typeof body.tmdb_id === 'number' ? body.tmdb_id : Number(body.tmdb_id)
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const posterPath =
    typeof body.poster_path === 'string' ? body.poster_path : null

  // Validate
  if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
    return NextResponse.json(
      { error: 'tmdb_id must be a positive integer' },
      { status: 400 }
    )
  }
  if (!title) {
    return NextResponse.json(
      { error: 'title must be a non-empty string' },
      { status: 400 }
    )
  }

  const userId = session.user.sub
  const sql = getDb()

  try {
    const rows = (await sql`
      INSERT INTO user_favorites (user_id, tmdb_id, title, poster_path)
      VALUES (${userId}, ${tmdbId}, ${title}, ${posterPath})
      RETURNING id, tmdb_id, title, poster_path, created_at
    `) as FavoriteRow[]

    return NextResponse.json(
      {
        favorite: {
          id: rows[0].id,
          tmdb_id: rows[0].tmdb_id,
          title: rows[0].title,
          poster_path: rows[0].poster_path,
          created_at: rows[0].created_at,
        },
      },
      { status: 201 }
    )
  } catch (e: unknown) {
    const dbError = e as { code?: string }
    // Unique violation — already favorited
    if (dbError.code === '23505') {
      return NextResponse.json(
        { error: 'Already favorited' },
        { status: 409 }
      )
    }
    // Check violation from trigger — limit reached
    if (dbError.code === '23514') {
      return NextResponse.json(
        { error: 'Favorite limit reached' },
        { status: 403 }
      )
    }
    console.error('Add favorite error:', e)
    return NextResponse.json(
      { error: 'Failed to add favorite' },
      { status: 500 }
    )
  }
}
