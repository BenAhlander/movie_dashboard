import { NextResponse } from 'next/server'
import * as tmdb from '@/services/tmdb'
import { mockMovieList } from '@/services/mockData'
import type { MovieListItem } from '@/types'

const DETAIL_CONCURRENCY = 5
const ENRICH_LIMIT = 20

async function fetchWithConcurrency<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number,
): Promise<R[]> {
  const results: R[] = []
  let index = 0
  async function worker(): Promise<void> {
    while (index < items.length) {
      const i = index++
      results[i] = await fn(items[i])
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  )
  return results
}

export async function GET() {
  if (!tmdb.hasApiKey()) {
    return NextResponse.json({ results: mockMovieList, demo: true })
  }

  try {
    const { results: list } = await tmdb.getNowPlaying()
    const toEnrich = (list ?? []).slice(0, ENRICH_LIMIT)
    const details = await fetchWithConcurrency(
      toEnrich,
      (m) => tmdb.getMovie(m.id),
      DETAIL_CONCURRENCY,
    )
    const byId = new Map(details.map((d) => [d.id, d]))
    const enriched: MovieListItem[] = (list ?? []).map((m) => {
      const d = byId.get(m.id)
      return d
        ? {
            ...m,
            revenue: d.revenue ?? undefined,
            runtime: d.runtime ?? undefined,
            budget: d.budget ?? undefined,
          }
        : m
    })
    return NextResponse.json({ results: enriched })
  } catch {
    return NextResponse.json({ results: mockMovieList, demo: true, error: true })
  }
}
