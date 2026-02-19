import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchTheaterListEnriched } from '../services/providers'
import { mockMovieList } from '../services/mockData'
import type { MovieListItem, TheaterFilters, TrendDirection } from '../types'
import { STALE_TIME_MS } from '../utils/constants'

const BUCKET_SIZE = 5

export function useTheaterMovies(filters: TheaterFilters) {
  const query = useQuery({
    queryKey: ['theater'],
    queryFn: () => fetchTheaterListEnriched(20),
    staleTime: STALE_TIME_MS,
  })

  const raw = query.data?.length ? query.data : query.isLoading ? [] : mockMovieList
  const isDemo = !query.data?.length && !query.isLoading
  const isApiUnreachable = query.isError

  const filtered = filterAndSortTheater(raw, filters)

  const trendMap = useMemo(() => computeTrendMap(raw), [raw])

  const buckets = useMemo(() => {
    const topByRevenue = [...filtered]
      .filter((m) => (m.revenue ?? 0) > 0)
      .sort((a, b) => (b.revenue ?? 0) - (a.revenue ?? 0))
      .slice(0, BUCKET_SIZE)
    const topByScore = [...filtered].sort((a, b) => b.vote_average - a.vote_average).slice(0, BUCKET_SIZE)
    const topByVoteCount = [...filtered].sort((a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0)).slice(0, BUCKET_SIZE)
    return {
      topBoxOffice: topByRevenue,
      criticsFavorite: topByScore,
      crowdFavorite: topByVoteCount,
    }
  }, [filtered])

  return {
    ...query,
    results: filtered,
    isDemo,
    isApiUnreachable,
    buckets,
    trendMap,
  }
}

function filterAndSortTheater(list: MovieListItem[], f: TheaterFilters): MovieListItem[] {
  let out = [...list]
  const search = f.search.trim().toLowerCase()
  if (search) out = out.filter((m) => m.title.toLowerCase().includes(search))
  out = out.filter((m) => (m.vote_average ?? 0) * 10 >= f.minScore)
  const dir = f.sortDir === 'asc' ? 1 : -1
  if (f.sortBy === 'revenue') {
    out.sort((a, b) => ((b.revenue ?? 0) - (a.revenue ?? 0)) * dir)
  } else if (f.sortBy === 'score') {
    out.sort((a, b) => (b.vote_average - a.vote_average) * dir)
  } else {
    out.sort((a, b) => (b.release_date || '').localeCompare(a.release_date || '') * dir)
  }
  return out
}

/** Compare popularity rank vs revenue rank to determine trend direction */
function computeTrendMap(list: MovieListItem[]): Map<number, TrendDirection> {
  const map = new Map<number, TrendDirection>()
  if (list.length === 0) return map

  const byPopularity = [...list].sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
  const byRevenue = [...list].sort((a, b) => (b.revenue ?? 0) - (a.revenue ?? 0))

  const popRank = new Map(byPopularity.map((m, i) => [m.id, i]))
  const revRank = new Map(byRevenue.map((m, i) => [m.id, i]))

  for (const m of list) {
    const pRank = popRank.get(m.id) ?? list.length
    const rRank = revRank.get(m.id) ?? list.length
    const diff = rRank - pRank // positive = popularity rank is better than revenue rank
    if (diff > 2) map.set(m.id, 'up')
    else if (diff < -2) map.set(m.id, 'down')
    else map.set(m.id, 'flat')
  }
  return map
}
