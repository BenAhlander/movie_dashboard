import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchStreamingList } from '../services/providers'
import { mockStreamingList } from '../services/mockData'
import type { StreamingListItem, StreamingFilters } from '../types'
import { STALE_TIME_MS } from '../utils/constants'

const BUCKET_SIZE = 5

export function useStreaming(filters: StreamingFilters, window: 'day' | 'week' = 'week') {
  const query = useQuery({
    queryKey: ['streaming', window],
    queryFn: () => fetchStreamingList(window),
    staleTime: STALE_TIME_MS,
  })

  const raw = query.data?.length ? query.data : query.isLoading ? [] : mockStreamingList
  const isDemo = !query.data?.length && !query.isLoading
  const isApiUnreachable = query.isError

  const filtered = filterAndSortStreaming(raw, filters)

  const buckets = useMemo(() => {
    const trendingThisWeek = [...filtered].sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0)).slice(0, BUCKET_SIZE)
    const bestRated = [...filtered].sort((a, b) => b.vote_average - a.vote_average).slice(0, BUCKET_SIZE)
    return { trendingThisWeek, bestRated }
  }, [filtered])

  return {
    ...query,
    results: filtered,
    isDemo,
    isApiUnreachable,
    buckets,
  }
}

function filterAndSortStreaming(list: StreamingListItem[], f: StreamingFilters): StreamingListItem[] {
  let out = [...list]
  const search = f.search.trim().toLowerCase()
  if (search) out = out.filter((m) => m.title.toLowerCase().includes(search))
  if (f.typeFilter === 'movie') out = out.filter((m) => m.media_type === 'movie')
  if (f.typeFilter === 'tv') out = out.filter((m) => m.media_type === 'tv')
  out = out.filter((m) => (m.vote_average ?? 0) * 10 >= f.minScore)
  const dir = f.sortDir === 'asc' ? 1 : -1
  if (f.sortBy === 'trending') {
    out.sort((a, b) => ((b.popularity ?? 0) - (a.popularity ?? 0)) * dir)
  } else {
    out.sort((a, b) => (b.vote_average - a.vote_average) * dir)
  }
  return out
}
