import type { StreamingListItem } from '../../types'
import { tmdbClient, type TMDBTvResult } from '../tmdbClient'

function toStreamingItem(
  m: { id: number; title: string; poster_path: string | null; backdrop_path: string | null; release_date: string; vote_average: number; vote_count: number; popularity: number; overview?: string; genre_ids?: number[] },
  media_type: 'movie' | 'tv'
): StreamingListItem {
  return {
    id: m.id,
    media_type,
    title: m.title,
    poster_path: m.poster_path,
    backdrop_path: m.backdrop_path,
    release_date: m.release_date,
    vote_average: m.vote_average,
    vote_count: m.vote_count,
    popularity: m.popularity,
    overview: m.overview,
    genre_ids: m.genre_ids,
  }
}

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

export async function fetchStreamingList(window: 'day' | 'week'): Promise<StreamingListItem[]> {
  if (!tmdbClient.hasKey()) return []
  const [moviesRes, tvRes] = await Promise.all([
    tmdbClient.getTrending(window),
    tmdbClient.getTrendingTV(window),
  ])
  const movies = (moviesRes.results ?? []).map((m) => toStreamingItem(m, 'movie'))
  const tv = (tvRes.results ?? []).map(tvToStreaming)
  const combined = [...movies, ...tv].sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
  return combined
}
