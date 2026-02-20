import { getDb, hasDatabase } from '@/services/db'
import { notFound } from 'next/navigation'
import { PostDetailView } from '@/components/feedback/PostDetailView'

interface PostRow {
  id: string
  title: string
  body: string
  category: string
  score: number
  status: string
  created_at: string
  updated_at: string
}

interface CommentRow {
  id: string
  post_id: string
  body: string
  author_id: string | null
  is_agent_comment: boolean
  created_at: string
}

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  if (!hasDatabase()) {
    notFound()
  }

  const sql = getDb()

  let post: PostRow | null = null
  let comments: CommentRow[] = []

  try {
    const postRows = (await sql`
      SELECT id, title, body, category, score, status, created_at, updated_at
      FROM feedback_posts
      WHERE id = ${id}
    `) as PostRow[]

    if (postRows.length === 0) {
      notFound()
    }
    post = postRows[0]

    comments = (await sql`
      SELECT id, post_id, body, author_id, is_agent_comment, created_at
      FROM feedback_comments
      WHERE post_id = ${id}
      ORDER BY created_at ASC
    `) as CommentRow[]
  } catch {
    notFound()
  }

  return (
    <PostDetailView
      post={{
        id: post.id,
        title: post.title,
        body: post.body,
        category: post.category,
        score: Number(post.score),
        status: post.status || 'open',
        created_at: post.created_at,
        updated_at: post.updated_at,
      }}
      comments={comments.map((c) => ({
        id: c.id,
        post_id: c.post_id,
        body: c.body,
        author_id: c.author_id,
        is_agent_comment: Boolean(c.is_agent_comment),
        created_at: c.created_at,
      }))}
    />
  )
}
