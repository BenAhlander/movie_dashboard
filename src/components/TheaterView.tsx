'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Box, Container, Alert, Button, Skeleton, Typography } from '@mui/material'
import { Hero } from './Hero'
import { BucketRow } from './BucketRow'
import { TheaterCard } from './TheaterCard'
import { TheaterFiltersBar } from './TheaterFiltersBar'
import { TheaterGrid } from './TheaterGrid'
import { BoxOfficePanel } from './BoxOfficePanel'
import { ChartPanel } from './ChartPanel'
import { useDetailDrawer } from './DetailDrawerContext'
import type { MovieListItem, TheaterFilters } from '@/types'

const BUCKET_SIZE = 5
const DEBOUNCE_MS = 400

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

const defaultTheaterFilters: TheaterFilters = {
  search: '',
}

interface TheaterViewProps {
  initialDomestic: MovieListItem[]
  initialGlobal: MovieListItem[]
  isDemo: boolean
  isApiUnreachable: boolean
}

export function TheaterView({
  initialDomestic,
  initialGlobal,
  isDemo,
  isApiUnreachable,
}: TheaterViewProps) {
  const { setSelectedMovieId } = useDetailDrawer()
  const [theaterFilters, setTheaterFilters] =
    useState<TheaterFilters>(defaultTheaterFilters)

  const debouncedSearch = useDebouncedValue(
    theaterFilters.search.trim(),
    DEBOUNCE_MS,
  )

  const [searchResults, setSearchResults] = useState<MovieListItem[]>([])
  const [searching, setSearching] = useState(false)
  const movieSearchActive = debouncedSearch.length >= 2

  const isLoading = initialDomestic.length === 0

  useEffect(() => {
    if (!movieSearchActive) {
      setSearchResults([])
      return
    }
    let cancelled = false
    setSearching(true)
    fetch(`/api/search?q=${encodeURIComponent(debouncedSearch)}&type=movie`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          const items: MovieListItem[] = (data.results ?? []).map(
            (r: Record<string, unknown>) => ({
              id: r.id as number,
              title: r.title as string,
              poster_path: r.poster_path as string | null,
              backdrop_path: r.backdrop_path as string | null,
              release_date: r.release_date as string,
              vote_average: r.vote_average as number,
              vote_count: r.vote_count as number,
              popularity: r.popularity as number,
              overview: r.overview as string | undefined,
              genre_ids: r.genre_ids as number[] | undefined,
            }),
          )
          setSearchResults(items)
        }
      })
      .catch(() => {
        if (!cancelled) setSearchResults([])
      })
      .finally(() => {
        if (!cancelled) setSearching(false)
      })
    return () => {
      cancelled = true
    }
  }, [debouncedSearch, movieSearchActive])

  const domesticTop = useMemo(
    () => initialDomestic.slice(0, BUCKET_SIZE),
    [initialDomestic],
  )

  const globalTop = useMemo(
    () => initialGlobal.slice(0, BUCKET_SIZE),
    [initialGlobal],
  )

  const criticsFavorites = useMemo(
    () => [...initialDomestic]
      .sort((a, b) => b.vote_average - a.vote_average)
      .slice(0, BUCKET_SIZE),
    [initialDomestic],
  )

  const crowdFavorites = useMemo(
    () => [...initialDomestic]
      .sort((a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0))
      .slice(0, BUCKET_SIZE),
    [initialDomestic],
  )

  const heroItem = domesticTop[0] ?? null

  const handleSelectMovie = useCallback(
    (movie: MovieListItem) => setSelectedMovieId(movie.id),
    [setSelectedMovieId],
  )

  const handleRefresh = useCallback(() => {
    window.location.reload()
  }, [])

  return (
    <>
      <Hero item={heroItem} loading={isLoading} />
      <Container maxWidth="xl" sx={{ px: { xs: 1, sm: 2 } }}>
        {isDemo && !isApiUnreachable && (
          <Alert
            severity="info"
            sx={{ mt: 2 }}
            action={
              <Button
                color="inherit"
                size="small"
                href="https://www.themoviedb.org/settings/api"
                target="_blank"
                rel="noopener"
              >
                Get key
              </Button>
            }
          >
            Demo mode: no API key. Showing sample data. Scores are Audience
            (TMDB). Add TMDB_API_KEY for live data.
          </Alert>
        )}
        {isApiUnreachable && (
          <Alert
            severity="warning"
            sx={{ mt: 2 }}
            action={<Button onClick={handleRefresh}>Retry</Button>}
          >
            Could not reach API. Showing sample data.
          </Alert>
        )}

        <TheaterFiltersBar
          filters={theaterFilters}
          onChange={(next) => setTheaterFilters((p) => ({ ...p, ...next }))}
        />
        {isLoading && !movieSearchActive && (
          <>
            {['Top box office domestic', 'Top box office global', "Critics' favorites", 'Crowd favorites'].map(
              (title) => (
                <BucketRow key={title} title={title}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Box key={i} sx={{ width: 160, minWidth: 160 }}>
                      <Skeleton
                        variant="rectangular"
                        height={240}
                        sx={{ borderRadius: 1 }}
                        className="shimmer"
                      />
                      <Skeleton
                        variant="text"
                        width="80%"
                        height={24}
                        sx={{ mt: 1 }}
                      />
                      <Skeleton
                        variant="text"
                        width="60%"
                        height={20}
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                  ))}
                </BucketRow>
              ),
            )}
          </>
        )}
        {!isLoading &&
          !movieSearchActive &&
          domesticTop.length > 0 && (
            <BucketRow title="Top box office domestic">
              {domesticTop.map((m, i) => (
                <TheaterCard
                  key={m.id}
                  movie={m}
                  rank={i + 1}
                  onClick={() => handleSelectMovie(m)}
                />
              ))}
            </BucketRow>
          )}
        {!isLoading &&
          !movieSearchActive &&
          globalTop.length > 0 && (
            <BucketRow title="Top box office global">
              {globalTop.map((m, i) => (
                <TheaterCard
                  key={m.id}
                  movie={m}
                  rank={i + 1}
                  onClick={() => handleSelectMovie(m)}
                />
              ))}
            </BucketRow>
          )}
        {!isLoading &&
          !movieSearchActive &&
          criticsFavorites.length > 0 && (
            <BucketRow title="Critics' favorites">
              {criticsFavorites.map((m, i) => (
                <TheaterCard
                  key={m.id}
                  movie={m}
                  rank={i + 1}
                  onClick={() => handleSelectMovie(m)}
                />
              ))}
            </BucketRow>
          )}
        {!isLoading &&
          !movieSearchActive &&
          crowdFavorites.length > 0 && (
            <BucketRow title="Crowd favorites">
              {crowdFavorites.map((m, i) => (
                <TheaterCard
                  key={m.id}
                  movie={m}
                  rank={i + 1}
                  onClick={() => handleSelectMovie(m)}
                />
              ))}
            </BucketRow>
          )}

        {movieSearchActive && (
          <>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Search results
            </Typography>
            <TheaterGrid
              movies={searchResults}
              loading={searching}
              onSelectMovie={handleSelectMovie}
            />
          </>
        )}

        {!movieSearchActive && (
          <Box sx={{ mt: 4 }}>
            <BoxOfficePanel movies={initialDomestic} loading={isLoading} />
            <ChartPanel movies={initialDomestic} loading={isLoading} />
          </Box>
        )}
      </Container>
    </>
  )
}
