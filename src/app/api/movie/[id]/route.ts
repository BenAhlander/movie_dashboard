import { NextResponse } from 'next/server'
import * as tmdb from '@/services/tmdb'
import type { MovieDetail } from '@/types'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  if (!tmdb.hasApiKey()) {
    return NextResponse.json({ movie: null, demo: true })
  }

  try {
    const [movie, credits, watchProviders] = await Promise.all([
      tmdb.getMovie(id),
      tmdb.getCredits(id).catch(() => null),
      tmdb.getWatchProviders(id).catch(() => null),
    ])
    const detail: MovieDetail = {
      ...movie,
      revenue: movie.revenue ?? undefined,
      budget: movie.budget ?? undefined,
      credits: credits ?? undefined,
      watch_providers: watchProviders ?? undefined,
    }
    return NextResponse.json({ movie: detail })
  } catch {
    return NextResponse.json({ movie: null, error: true }, { status: 500 })
  }
}
