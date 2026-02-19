import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { tmdbClient } from '../services/tmdbClient'
import type { StreamingListItem } from '../types'

const DEBOUNCE_MS = 400

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

export function useSearchMovies(query: string) {
  const debouncedQuery = useDebouncedValue(query.trim(), DEBOUNCE_MS)
  const enabled = debouncedQuery.length >= 2 && tmdbClient.hasKey()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['searchMovies', debouncedQuery],
    queryFn: () => tmdbClient.searchMovies(debouncedQuery),
    enabled,
    staleTime: 5 * 60 * 1000,
  })

  return {
    results: enabled ? (data?.results ?? []) : [],
    isSearching: enabled && isLoading,
    isSearchActive: enabled,
    isError,
  }
}

export function useSearchMulti(query: string) {
  const debouncedQuery = useDebouncedValue(query.trim(), DEBOUNCE_MS)
  const enabled = debouncedQuery.length >= 2 && tmdbClient.hasKey()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['searchMulti', debouncedQuery],
    queryFn: () => tmdbClient.searchMulti(debouncedQuery),
    enabled,
    staleTime: 5 * 60 * 1000,
  })

  const results: StreamingListItem[] = enabled
    ? (data?.results ?? [])
        .filter((r) => r.media_type === 'movie' || r.media_type === 'tv')
        .map((r) => ({
          id: r.id,
          media_type: r.media_type as 'movie' | 'tv',
          title: r.media_type === 'tv' ? (r.name ?? r.title) : r.title,
          poster_path: r.poster_path,
          backdrop_path: r.backdrop_path,
          release_date:
            r.media_type === 'tv'
              ? (r.first_air_date ?? r.release_date)
              : r.release_date,
          vote_average: r.vote_average,
          vote_count: r.vote_count,
          popularity: r.popularity,
          overview: r.overview,
          genre_ids: r.genre_ids,
        }))
    : []

  return {
    results,
    isSearching: enabled && isLoading,
    isSearchActive: enabled,
    isError,
  }
}
