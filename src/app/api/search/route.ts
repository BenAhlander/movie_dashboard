import { NextRequest, NextResponse } from 'next/server'
import * as tmdb from '@/services/tmdb'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') || ''
  const type = request.nextUrl.searchParams.get('type') || 'movie'

  if (!q.trim()) {
    return NextResponse.json({ results: [], total_results: 0 })
  }

  if (!tmdb.hasApiKey()) {
    return NextResponse.json({ results: [], total_results: 0, demo: true })
  }

  try {
    if (type === 'multi') {
      const data = await tmdb.searchMulti(q)
      return NextResponse.json(data)
    }
    const data = await tmdb.searchMovies(q)
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { results: [], total_results: 0, error: true },
      { status: 500 },
    )
  }
}
