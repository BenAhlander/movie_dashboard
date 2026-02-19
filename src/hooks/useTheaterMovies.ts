import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchTheaterListEnriched } from '../services/providers'
import { mockMovieList } from '../services/mockData'
import type { MovieListItem, TheaterFilters } from '../types'
import { STALE_TIME_MS } from '../utils/constants'

const BUCKET_SIZE = 5

export function useTheaterMovies(filters: TheaterFilters) {
  const query = useQuery({
    queryKey: ['theater'],
    queryFn: () => fetchTheaterListEnriched(20),
    staleTime: STALE_TIME_MS,
  })

  const raw = query.data?.length ? query.data : mockMovieList
  const isDemo = !query.data?.length && !query.isLoading
  const isApiUnreachable = query.isError

  const filtered = filterAndSortTheater(raw, filters)

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
