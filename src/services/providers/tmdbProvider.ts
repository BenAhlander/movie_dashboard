import type { MovieListItem, MovieDetail, MoviesApiParams } from '../../types'
import { tmdbClient } from '../tmdbClient'

const DETAIL_CONCURRENCY = 5

async function fetchWithConcurrency<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = []
  let index = 0
  async function worker(): Promise<void> {
    while (index < items.length) {
      const i = index++
      results[i] = await fn(items[i])
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()))
  return results
}

export async function fetchMovieList(params: MoviesApiParams): Promise<MovieListItem[]> {
  if (!tmdbClient.hasKey()) return []
  if (params.list === 'trending') {
    const { results } = await tmdbClient.getTrending(params.window || 'day')
    return results ?? []
  }
  const { results } = await tmdbClient.getNowPlaying()
  return results ?? []
}

/** Theater list enriched with revenue (and runtime) for first N items */
export async function fetchTheaterListEnriched(limit: number = 15): Promise<MovieListItem[]> {
  if (!tmdbClient.hasKey()) return []
  const { results } = await tmdbClient.getNowPlaying()
  const list = results ?? []
  const toEnrich = list.slice(0, limit)
  const details = await fetchWithConcurrency(toEnrich, (m) => tmdbClient.getMovie(m.id), DETAIL_CONCURRENCY)
  const byId = new Map(details.map((d) => [d.id, d]))
  return list.map((m) => {
    const d = byId.get(m.id)
    return d ? { ...m, revenue: d.revenue ?? undefined, runtime: d.runtime ?? undefined } : m
  })
}

export async function fetchMovieDetails(id: number | string): Promise<MovieDetail | null> {
  if (!tmdbClient.hasKey()) return null
  const [movie, credits, watchProviders] = await Promise.all([
    tmdbClient.getMovie(id),
    tmdbClient.getCredits(id).catch(() => null),
    tmdbClient.getWatchProviders(id).catch(() => null),
  ])
  if (!movie) return null
  const detail: MovieDetail = {
    ...movie,
    revenue: movie.revenue ?? undefined,
    budget: movie.budget ?? undefined,
    credits: credits ?? undefined,
    watch_providers: watchProviders ?? undefined,
  }
  return detail
}
