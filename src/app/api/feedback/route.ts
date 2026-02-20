import { NextRequest, NextResponse } from 'next/server'
import { getDb, hasDatabase } from '@/services/db'
import { auth0 } from '@/lib/auth0'
import type { FeedbackCategory, FeedbackSort } from '@/types'
import crypto from 'crypto'

const VALID_CATEGORIES: FeedbackCategory[] = ['bug', 'feature', 'general']
const VALID_SORTS: FeedbackSort[] = ['new', 'top']
const PAGE_SIZE = 20

function hashVoterId(clientId: string): string {
  const pepper = process.env.VOTER_HASH_PEPPER || 'default-pepper'
  return crypto
    .createHash('sha256')
    .update(clientId + pepper)
    .digest('hex')
}

interface PostRow {
  id: string
  title: string
  body: string
  category: string
  score: number
  user_vote: number
  is_owner: boolean
  status: string
  comment_count: number
  created_at: string
  updated_at: string
}

/** GET /api/feedback — list posts */
export async function GET(req: NextRequest) {
  if (!hasDatabase()) {
    return NextResponse.json({ results: [], total: 0, page: 1, demo: true })
  }

  const url = req.nextUrl
  const sort = VALID_SORTS.includes(
    url.searchParams.get('sort') as FeedbackSort
  )
    ? (url.searchParams.get('sort') as FeedbackSort)
    : 'top'
  const category = url.searchParams.get('category') || 'all'
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
  const voterIdRaw = url.searchParams.get('voterId') || ''
  const voterHash = voterIdRaw ? hashVoterId(voterIdRaw) : ''
  const userId = url.searchParams.get('userId') || ''
  const offset = (page - 1) * PAGE_SIZE

  const sql = getDb()
  const hasCategory =
    category !== 'all' &&
    VALID_CATEGORIES.includes(category as FeedbackCategory)

  try {
    let rows: PostRow[]
    let countRows: { total: number }[]

    // Build queries based on sort + category + voter
    // Using tagged templates for proper parameterization
    if (hasCategory && voterHash) {
      if (sort === 'new') {
        rows = (await sql`
          SELECT p.*, COALESCE(v.vote, 0) as user_vote, (p.author_id IS NOT NULL AND p.author_id = ${userId}) as is_owner, (SELECT COUNT(*) FROM feedback_comments c WHERE c.post_id = p.id) as comment_count
          FROM feedback_posts p
          LEFT JOIN feedback_votes v ON v.post_id = p.id AND v.voter_hash = ${voterHash}
          WHERE p.category = ${category}
          ORDER BY p.created_at DESC
          LIMIT ${PAGE_SIZE} OFFSET ${offset}
        `) as PostRow[]
      } else {
        rows = (await sql`
          SELECT p.*, COALESCE(v.vote, 0) as user_vote, (p.author_id IS NOT NULL AND p.author_id = ${userId}) as is_owner, (SELECT COUNT(*) FROM feedback_comments c WHERE c.post_id = p.id) as comment_count
          FROM feedback_posts p
          LEFT JOIN feedback_votes v ON v.post_id = p.id AND v.voter_hash = ${voterHash}
          WHERE p.category = ${category}
          ORDER BY p.score DESC, p.created_at DESC
          LIMIT ${PAGE_SIZE} OFFSET ${offset}
        `) as PostRow[]
      }
      countRows = (await sql`
        SELECT COUNT(*) as total FROM feedback_posts WHERE category = ${category}
      `) as { total: number }[]
    } else if (hasCategory) {
      if (sort === 'new') {
        rows = (await sql`
          SELECT p.*, 0 as user_vote, (p.author_id IS NOT NULL AND p.author_id = ${userId}) as is_owner, (SELECT COUNT(*) FROM feedback_comments c WHERE c.post_id = p.id) as comment_count
          FROM feedback_posts p
          WHERE p.category = ${category}
          ORDER BY p.created_at DESC
          LIMIT ${PAGE_SIZE} OFFSET ${offset}
        `) as PostRow[]
      } else {
        rows = (await sql`
          SELECT p.*, 0 as user_vote, (p.author_id IS NOT NULL AND p.author_id = ${userId}) as is_owner, (SELECT COUNT(*) FROM feedback_comments c WHERE c.post_id = p.id) as comment_count
          FROM feedback_posts p
          WHERE p.category = ${category}
          ORDER BY p.score DESC, p.created_at DESC
          LIMIT ${PAGE_SIZE} OFFSET ${offset}
        `) as PostRow[]
      }
      countRows = (await sql`
        SELECT COUNT(*) as total FROM feedback_posts WHERE category = ${category}
      `) as { total: number }[]
    } else if (voterHash) {
      if (sort === 'new') {
        rows = (await sql`
          SELECT p.*, COALESCE(v.vote, 0) as user_vote, (p.author_id IS NOT NULL AND p.author_id = ${userId}) as is_owner, (SELECT COUNT(*) FROM feedback_comments c WHERE c.post_id = p.id) as comment_count
          FROM feedback_posts p
          LEFT JOIN feedback_votes v ON v.post_id = p.id AND v.voter_hash = ${voterHash}
          ORDER BY p.created_at DESC
          LIMIT ${PAGE_SIZE} OFFSET ${offset}
        `) as PostRow[]
      } else {
        rows = (await sql`
          SELECT p.*, COALESCE(v.vote, 0) as user_vote, (p.author_id IS NOT NULL AND p.author_id = ${userId}) as is_owner, (SELECT COUNT(*) FROM feedback_comments c WHERE c.post_id = p.id) as comment_count
          FROM feedback_posts p
          LEFT JOIN feedback_votes v ON v.post_id = p.id AND v.voter_hash = ${voterHash}
          ORDER BY p.score DESC, p.created_at DESC
          LIMIT ${PAGE_SIZE} OFFSET ${offset}
        `) as PostRow[]
      }
      countRows = (await sql`
        SELECT COUNT(*) as total FROM feedback_posts
      `) as { total: number }[]
    } else {
      if (sort === 'new') {
        rows = (await sql`
          SELECT p.*, 0 as user_vote, (p.author_id IS NOT NULL AND p.author_id = ${userId}) as is_owner, (SELECT COUNT(*) FROM feedback_comments c WHERE c.post_id = p.id) as comment_count
          FROM feedback_posts p
          ORDER BY p.created_at DESC
          LIMIT ${PAGE_SIZE} OFFSET ${offset}
        `) as PostRow[]
      } else {
        rows = (await sql`
          SELECT p.*, 0 as user_vote, (p.author_id IS NOT NULL AND p.author_id = ${userId}) as is_owner, (SELECT COUNT(*) FROM feedback_comments c WHERE c.post_id = p.id) as comment_count
          FROM feedback_posts p
          ORDER BY p.score DESC, p.created_at DESC
          LIMIT ${PAGE_SIZE} OFFSET ${offset}
        `) as PostRow[]
      }
      countRows = (await sql`
        SELECT COUNT(*) as total FROM feedback_posts
      `) as { total: number }[]
    }

    const results = rows.map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      category: r.category,
      score: Number(r.score),
      userVote: Number(r.user_vote),
      isOwner: Boolean(r.is_owner),
      status: r.status || 'open',
      comment_count: Number(r.comment_count || 0),
      created_at: r.created_at,
      updated_at: r.updated_at,
    }))

    return NextResponse.json({
      results,
      total: Number(countRows[0].total),
      page,
    })
  } catch (e) {
    console.error('Feedback list error:', e)
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 }
    )
  }
}

/** POST /api/feedback — create a new post */
export async function POST(req: NextRequest) {
  let authorId: string | null = null
  if (auth0) {
    const session = await auth0.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    authorId = session.user.sub ?? null
  }

  if (!hasDatabase()) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    )
  }

  // Basic rate limiting: check content-length
  const contentLength = parseInt(req.headers.get('content-length') || '0', 10)
  if (contentLength > 2000) {
    return NextResponse.json({ error: 'Request too large' }, { status: 413 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const postBody = typeof body.body === 'string' ? body.body.trim() : ''
  const category = body.category as string

  // Validate
  if (title.length < 3 || title.length > 100) {
    return NextResponse.json(
      { error: 'Title must be 3-100 characters' },
      { status: 400 }
    )
  }
  if (postBody.length < 10 || postBody.length > 500) {
    return NextResponse.json(
      { error: 'Body must be 10-500 characters' },
      { status: 400 }
    )
  }
  if (!VALID_CATEGORIES.includes(category as FeedbackCategory)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
  }

  // Strip HTML tags for XSS prevention
  const cleanTitle = title.replace(/<[^>]*>/g, '')
  const cleanBody = postBody.replace(/<[^>]*>/g, '')

  const sql = getDb()

  try {
    const rows = await sql`
      INSERT INTO feedback_posts (title, body, category, author_id)
      VALUES (${cleanTitle}, ${cleanBody}, ${category}, ${authorId})
      RETURNING *
    `
    const post = rows[0]
    return NextResponse.json(
      {
        post: {
          id: post.id,
          title: post.title,
          body: post.body,
          category: post.category,
          score: post.score,
          userVote: 0,
          isOwner: !!authorId,
          created_at: post.created_at,
          updated_at: post.updated_at,
        },
      },
      { status: 201 }
    )
  } catch (e) {
    console.error('Create feedback error:', e)
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    )
  }
}
