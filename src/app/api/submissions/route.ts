import { NextRequest, NextResponse } from 'next/server'
import { getDb, hasDatabase } from '@/services/db'
import { validateAgentRequest } from '@/lib/validateAgentRequest'

/** GET /api/submissions — list feedback posts for agent consumption */
export async function GET(req: NextRequest) {
  const authError = validateAgentRequest(req)
  if (authError) return authError

  if (!hasDatabase()) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    )
  }

  const url = req.nextUrl
  const status = url.searchParams.get('status')
  const minUpvotes = url.searchParams.get('min_upvotes')
  const limit = Math.min(
    Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10)),
    200
  )

  const sql = getDb()

  try {
    let rows

    if (status && minUpvotes) {
      rows = await sql`
        SELECT * FROM feedback_posts
        WHERE status = ${status} AND score > ${Number(minUpvotes)}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `
    } else if (status) {
      rows = await sql`
        SELECT * FROM feedback_posts
        WHERE status = ${status}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `
    } else if (minUpvotes) {
      rows = await sql`
        SELECT * FROM feedback_posts
        WHERE score > ${Number(minUpvotes)}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `
    } else {
      rows = await sql`
        SELECT * FROM feedback_posts
        ORDER BY created_at DESC
        LIMIT ${limit}
      `
    }

    return NextResponse.json({ submissions: rows })
  } catch (e) {
    console.error('List submissions error:', e)
    return NextResponse.json(
      { error: 'Failed to fetch submissions' },
      { status: 500 }
    )
  }
}
