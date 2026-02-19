import { useQuery } from '@tanstack/react-query'
import { fetchMovieDetails } from '../services/providers'
import type { MovieDetail } from '../types'
import { STALE_TIME_MS } from '../utils/constants'

export function useMovieDetails(id: number | null) {
  return useQuery<MovieDetail | null>({
    queryKey: ['movie', id],
    queryFn: () => (id != null ? fetchMovieDetails(id) : Promise.resolve(null)),
    enabled: id != null,
    staleTime: STALE_TIME_MS,
  })
}
