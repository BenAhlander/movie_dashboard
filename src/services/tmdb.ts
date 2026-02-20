/**
 * Server-only TMDB API client. Uses process.env.TMDB_API_KEY (never exposed to client).
 * Used by Next.js Route Handlers in src/app/api/.
 */

import type { MovieListItem, MovieDetail, Credits, WatchProviders } from '@/types'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const REVALIDATE_SECONDS = 900 // 15 min

/** Raw TV result from TMDB trending/tv */
export interface TMDBTvResult {
  id: number
  name: string
  poster_path: string | null
  backdrop_path: string | null
  first_air_date: string
  vote_average: number
  vote_count: number
  popularity: number
  overview?: string
  genre_ids?: number[]
}

export function hasApiKey(): boolean {
  return Boolean(process.env.TMDB_API_KEY)
}

async function get<T>(
  path: string,
  params: Record<string, string> = {},
  revalidate: number | false = REVALIDATE_SECONDS,
): Promise<T> {
  const key = process.env.TMDB_API_KEY
  if (!key) throw new Error('Missing TMDB_API_KEY')
  const sp = new URLSearchParams({ api_key: key, language: 'en-US', ...params })
  const url = `${TMDB_BASE}${path}?${sp}`
  const res = await fetch(url, {
    next: revalidate !== false ? { revalidate } : undefined,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `TMDB ${res.status}`)
  }
  return res.json() as Promise<T>
}

export async function getNowPlaying(region?: string): Promise<{ results: MovieListItem[] }> {
  const params: Record<string, string> = { page: '1' }
  if (region) params.region = region
  return get<{ results: MovieListItem[] }>('/movie/now_playing', params)
}

export async function getTrending(
  window: 'day' | 'week',
): Promise<{ results: MovieListItem[] }> {
  return get<{ results: MovieListItem[] }>(`/trending/movie/${window}`)
}

export async function getTrendingTV(
  window: 'day' | 'week',
): Promise<{ results: TMDBTvResult[] }> {
  return get<{ results: TMDBTvResult[] }>(`/trending/tv/${window}`)
}

export async function getMovie(id: number | string): Promise<MovieDetail> {
  return get<MovieDetail>(`/movie/${id}`)
}

export async function getCredits(id: number | string): Promise<Credits> {
  return get<Credits>(`/movie/${id}/credits`)
}

export async function getWatchProviders(
  id: number | string,
): Promise<WatchProviders> {
  return get<WatchProviders>(`/movie/${id}/watch/providers`)
}

export async function searchMovies(
  query: string,
  page = 1,
): Promise<{ results: MovieListItem[]; total_results: number }> {
  return get<{ results: MovieListItem[]; total_results: number }>(
    '/search/movie',
    { query, page: String(page) },
    false,
  )
}

export async function searchMulti(
  query: string,
  page = 1,
): Promise<{
  results: (MovieListItem & {
    media_type?: string
    name?: string
    first_air_date?: string
  })[]
  total_results: number
}> {
  return get<{
    results: (MovieListItem & {
      media_type?: string
      name?: string
      first_air_date?: string
    })[]
    total_results: number
  }>('/search/multi', { query, page: String(page) }, false)
}
