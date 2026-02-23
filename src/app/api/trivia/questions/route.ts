import { NextRequest, NextResponse } from 'next/server'
import { getDb, hasDatabase } from '@/services/db'
import { auth0 } from '@/lib/auth0'
import type { TriviaQuestion } from '@/types/trivia'

/** Recency window: exclude questions answered in the last 30 days */
const RECENCY_DAYS = 30

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl

  // Parse count (default 5, range 1–20)
  const rawCount = searchParams.get('count')
  const count = rawCount ? parseInt(rawCount, 10) : 5
  if (isNaN(count) || count < 1 || count > 20) {
    return NextResponse.json(
      { error: 'count must be between 1 and 20' },
      { status: 400 }
    )
  }

  // Parse excludeIds (comma-separated)
  const rawExclude = searchParams.get('excludeIds')
  const clientExcludeIds = rawExclude
    ? rawExclude.split(',').filter(Boolean)
    : []

  // Parse optional difficulty filter
  const difficulty = searchParams.get('difficulty')
  if (difficulty && !['easy', 'medium', 'hard'].includes(difficulty)) {
    return NextResponse.json(
      { error: 'difficulty must be easy, medium, or hard' },
      { status: 400 }
    )
  }

  // Demo mode — no database configured
  if (!hasDatabase()) {
    return NextResponse.json({
      questions: [],
      excludedIds: clientExcludeIds,
      demo: true,
    })
  }

  const sql = getDb()

  // Check for authenticated user to exclude previously answered questions
  let userExcludeIds: string[] = []
  try {
    if (auth0) {
      const session = await auth0.getSession()
      if (session) {
        const userId = session.user.sub as string
        const rows = (await sql`
          SELECT DISTINCT question_id
          FROM trivia_user_answers
          WHERE user_id = ${userId}
            AND answered_at >= NOW() - INTERVAL '${sql.unsafe(String(RECENCY_DAYS))} days'
        `) as { question_id: string }[]
        userExcludeIds = rows.map((r) => r.question_id)
      }
    }
  } catch (e) {
    // Non-fatal — proceed without user exclusion
    console.warn('Failed to fetch user answer history:', e)
  }

  // Combine all exclude IDs
  const allExcludeIds = [...new Set([...clientExcludeIds, ...userExcludeIds])]

  try {
    // Build the query
    let questions: TriviaQuestion[]

    if (allExcludeIds.length > 0 && difficulty) {
      const rows = (await sql`
        SELECT id, media_title, media_type, media_year, statement, answer,
               difficulty, poster_path
        FROM trivia_questions
        WHERE is_active = TRUE
          AND difficulty = ${difficulty}
          AND id != ALL(${allExcludeIds}::text[])
        ORDER BY RANDOM()
        LIMIT ${count}
      `) as {
        id: string
        media_title: string
        media_type: string
        media_year: number | null
        statement: string
        answer: boolean
        difficulty: string
        poster_path: string | null
      }[]
      questions = rows.map(mapRow)
    } else if (allExcludeIds.length > 0) {
      const rows = (await sql`
        SELECT id, media_title, media_type, media_year, statement, answer,
               difficulty, poster_path
        FROM trivia_questions
        WHERE is_active = TRUE
          AND id != ALL(${allExcludeIds}::text[])
        ORDER BY RANDOM()
        LIMIT ${count}
      `) as {
        id: string
        media_title: string
        media_type: string
        media_year: number | null
        statement: string
        answer: boolean
        difficulty: string
        poster_path: string | null
      }[]
      questions = rows.map(mapRow)
    } else if (difficulty) {
      const rows = (await sql`
        SELECT id, media_title, media_type, media_year, statement, answer,
               difficulty, poster_path
        FROM trivia_questions
        WHERE is_active = TRUE
          AND difficulty = ${difficulty}
        ORDER BY RANDOM()
        LIMIT ${count}
      `) as {
        id: string
        media_title: string
        media_type: string
        media_year: number | null
        statement: string
        answer: boolean
        difficulty: string
        poster_path: string | null
      }[]
      questions = rows.map(mapRow)
    } else {
      const rows = (await sql`
        SELECT id, media_title, media_type, media_year, statement, answer,
               difficulty, poster_path
        FROM trivia_questions
        WHERE is_active = TRUE
        ORDER BY RANDOM()
        LIMIT ${count}
      `) as {
        id: string
        media_title: string
        media_type: string
        media_year: number | null
        statement: string
        answer: boolean
        difficulty: string
        poster_path: string | null
      }[]
      questions = rows.map(mapRow)
    }

    // Pool exhaustion: if we got fewer than count, reset user exclusion
    // and try again with only client excludes
    if (questions.length < count) {
      const fallbackExclude =
        clientExcludeIds.length > 0 ? clientExcludeIds : []

      let rows
      if (fallbackExclude.length > 0 && difficulty) {
        rows = (await sql`
          SELECT id, media_title, media_type, media_year, statement, answer,
                 difficulty, poster_path
          FROM trivia_questions
          WHERE is_active = TRUE
            AND difficulty = ${difficulty}
            AND id != ALL(${fallbackExclude}::text[])
          ORDER BY RANDOM()
          LIMIT ${count}
        `) as {
          id: string
          media_title: string
          media_type: string
          media_year: number | null
          statement: string
          answer: boolean
          difficulty: string
          poster_path: string | null
        }[]
      } else if (fallbackExclude.length > 0) {
        rows = (await sql`
          SELECT id, media_title, media_type, media_year, statement, answer,
                 difficulty, poster_path
          FROM trivia_questions
          WHERE is_active = TRUE
            AND id != ALL(${fallbackExclude}::text[])
          ORDER BY RANDOM()
          LIMIT ${count}
        `) as {
          id: string
          media_title: string
          media_type: string
          media_year: number | null
          statement: string
          answer: boolean
          difficulty: string
          poster_path: string | null
        }[]
      } else if (difficulty) {
        rows = (await sql`
          SELECT id, media_title, media_type, media_year, statement, answer,
                 difficulty, poster_path
          FROM trivia_questions
          WHERE is_active = TRUE
            AND difficulty = ${difficulty}
          ORDER BY RANDOM()
          LIMIT ${count}
        `) as {
          id: string
          media_title: string
          media_type: string
          media_year: number | null
          statement: string
          answer: boolean
          difficulty: string
          poster_path: string | null
        }[]
      } else {
        rows = (await sql`
          SELECT id, media_title, media_type, media_year, statement, answer,
                 difficulty, poster_path
          FROM trivia_questions
          WHERE is_active = TRUE
          ORDER BY RANDOM()
          LIMIT ${count}
        `) as {
          id: string
          media_title: string
          media_type: string
          media_year: number | null
          statement: string
          answer: boolean
          difficulty: string
          poster_path: string | null
        }[]
      }

      questions = rows.map(mapRow)
    }

    return NextResponse.json({
      questions,
      excludedIds: allExcludeIds,
      demo: false,
    })
  } catch (e) {
    console.error('Trivia questions query error:', e)
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    )
  }
}

interface DbRow {
  id: string
  media_title: string
  media_type: string
  media_year: number | null
  statement: string
  answer: boolean
  difficulty: string
  poster_path: string | null
}

function mapRow(row: DbRow): TriviaQuestion {
  return {
    id: row.id,
    statement: row.statement,
    answer: row.answer,
    title: row.media_title,
    year: row.media_year ?? 0,
    mediaType: row.media_type as 'movie' | 'tv',
    posterPath: row.poster_path,
    difficulty: row.difficulty as 'easy' | 'medium' | 'hard',
  }
}
