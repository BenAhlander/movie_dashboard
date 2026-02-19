/**
 * Direct TMDB API client (browser). Uses VITE_TMDB_API_KEY.
 * Key is exposed in the client bundle; TMDB allows this for read-only public data.
 * For production, consider request restrictions in TMDB settings.
 */

import type { MovieListItem, MovieDetail, Credits, WatchProviders } from '../types'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const FETCH_TIMEOUT_MS = 10_000

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

function getApiKey(): string | undefined {
  return import.meta.env.VITE_TMDB_API_KEY as string | undefined
}

async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const key = getApiKey()
  if (!key) throw new Error('Missing VITE_TMDB_API_KEY')
  const sp = new URLSearchParams({ api_key: key, language: 'en-US', ...params })
  const url = `${TMDB_BASE}${path}?${sp}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  const res = await fetch(url, { signal: controller.signal })
  clearTimeout(timer)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `TMDB ${res.status}`)
  }
  return res.json() as Promise<T>
}

export const tmdbClient = {
  hasKey(): boolean {
    return Boolean(getApiKey())
  },

  async getNowPlaying(): Promise<{ results: MovieListItem[] }> {
    return get<{ results: MovieListItem[] }>('/movie/now_playing', { page: '1' })
  },

  async getTrending(window: 'day' | 'week'): Promise<{ results: MovieListItem[] }> {
    return get<{ results: MovieListItem[] }>(`/trending/movie/${window}`)
  },

  async getTrendingTV(window: 'day' | 'week'): Promise<{ results: TMDBTvResult[] }> {
    return get<{ results: TMDBTvResult[] }>(`/trending/tv/${window}`)
  },

  async getMovie(id: number | string): Promise<MovieDetail> {
    return get<MovieDetail>(`/movie/${id}`)
  },

  async getCredits(id: number | string): Promise<Credits> {
    return get<Credits>(`/movie/${id}/credits`)
  },

  async getWatchProviders(id: number | string): Promise<WatchProviders> {
    return get<WatchProviders>(`/movie/${id}/watch/providers`)
  },

  async searchMovies(query: string, page = 1): Promise<{ results: MovieListItem[]; total_results: number }> {
    return get<{ results: MovieListItem[]; total_results: number }>('/search/movie', {
      query,
      page: String(page),
    })
  },

  async searchMulti(
    query: string,
    page = 1,
  ): Promise<{ results: (MovieListItem & { media_type?: string; name?: string; first_air_date?: string })[]; total_results: number }> {
    return get<{
      results: (MovieListItem & { media_type?: string; name?: string; first_air_date?: string })[]
      total_results: number
    }>('/search/multi', { query, page: String(page) })
  },
}
