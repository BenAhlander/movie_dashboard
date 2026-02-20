import { NextResponse } from 'next/server'
import * as tmdb from '@/services/tmdb'
import { mockMovieList } from '@/services/mockData'
import type { MovieListItem, MovieDetail } from '@/types'

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

function enrichAndSort(
  list: MovieListItem[],
  detailMap: Map<number, MovieDetail>,
): MovieListItem[] {
  const enriched: MovieListItem[] = list.map((m) => {
    const d = detailMap.get(m.id)
    return d
      ? {
          ...m,
          revenue: d.revenue ?? undefined,
          runtime: d.runtime ?? undefined,
          budget: d.budget ?? undefined,
        }
      : m
  })
  enriched.sort((a, b) => (b.revenue ?? 0) - (a.revenue ?? 0))
  return enriched
}

export async function GET() {
  if (!tmdb.hasApiKey()) {
    return NextResponse.json({ domestic: mockMovieList, global: mockMovieList, demo: true })
  }

  try {
    const [{ results: domesticList }, { results: globalList }] =
      await Promise.all([
        tmdb.getNowPlaying('US'),
        tmdb.getNowPlaying(),
      ])

    const allMovies = new Map<number, MovieListItem>()
    for (const m of [...(domesticList ?? []), ...(globalList ?? [])]) {
      allMovies.set(m.id, m)
    }
    const toEnrich = [...allMovies.values()].slice(0, ENRICH_LIMIT * 2)

    const details = await fetchWithConcurrency(
      toEnrich,
      (m) => tmdb.getMovie(m.id),
      DETAIL_CONCURRENCY,
    )
    const detailMap = new Map(details.map((d) => [d.id, d]))

    const domestic = enrichAndSort((domesticList ?? []).slice(0, ENRICH_LIMIT), detailMap)
    const global = enrichAndSort((globalList ?? []).slice(0, ENRICH_LIMIT), detailMap)

    return NextResponse.json({ domestic, global })
  } catch {
    return NextResponse.json({ domestic: mockMovieList, global: mockMovieList, demo: true, error: true })
  }
}
