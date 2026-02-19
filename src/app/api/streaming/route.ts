import { NextRequest, NextResponse } from 'next/server'
import * as tmdb from '@/services/tmdb'
import type { TMDBTvResult } from '@/services/tmdb'
import { mockStreamingList } from '@/services/mockData'
import type { StreamingListItem } from '@/types'

function tvToStreaming(t: TMDBTvResult): StreamingListItem {
  return {
    id: t.id,
    media_type: 'tv',
    title: t.name,
    poster_path: t.poster_path,
    backdrop_path: t.backdrop_path,
    release_date: t.first_air_date,
    vote_average: t.vote_average,
    vote_count: t.vote_count,
    popularity: t.popularity,
    overview: t.overview,
    genre_ids: t.genre_ids,
  }
}

export async function GET(request: NextRequest) {
  const window =
    (request.nextUrl.searchParams.get('window') as 'day' | 'week') || 'week'

  if (!tmdb.hasApiKey()) {
    return NextResponse.json({ results: mockStreamingList, demo: true })
  }

  try {
    const [moviesRes, tvRes] = await Promise.all([
      tmdb.getTrending(window),
      tmdb.getTrendingTV(window),
    ])
    const movies: StreamingListItem[] = (moviesRes.results ?? []).map((m) => ({
      id: m.id,
      media_type: 'movie' as const,
      title: m.title,
      poster_path: m.poster_path,
      backdrop_path: m.backdrop_path,
      release_date: m.release_date,
      vote_average: m.vote_average,
      vote_count: m.vote_count,
      popularity: m.popularity,
      overview: m.overview,
      genre_ids: m.genre_ids,
    }))
    const tv = (tvRes.results ?? []).map(tvToStreaming)
    const combined = [...movies, ...tv].sort(
      (a, b) => (b.popularity ?? 0) - (a.popularity ?? 0),
    )
    return NextResponse.json({ results: combined })
  } catch {
    return NextResponse.json({
      results: mockStreamingList,
      demo: true,
      error: true,
    })
  }
}
