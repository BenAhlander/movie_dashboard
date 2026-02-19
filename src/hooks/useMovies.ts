import { useQuery } from '@tanstack/react-query'
import { fetchMovieList } from '../services/providers'
import { mockMovieList } from '../services/mockData'
import type { FilterState } from '../types'
import { STALE_TIME_MS } from '../utils/constants'

export function useMovies(filter: FilterState) {
  const query = useQuery({
    queryKey: ['movies', filter.list, filter.window],
    queryFn: () => fetchMovieList({ list: filter.list, window: filter.window }),
    staleTime: STALE_TIME_MS,
  })

  const results = query.data?.length ? query.data : mockMovieList
  const isDemo = !query.data?.length && !query.isLoading
  const isApiUnreachable = query.isError

  return { ...query, results, isDemo, isApiUnreachable }
}
