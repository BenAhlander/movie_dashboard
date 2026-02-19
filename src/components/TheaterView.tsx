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
  minScore: 0,
  sortBy: 'revenue',
  sortDir: 'desc',
}

function filterAndSortTheater(
  list: MovieListItem[],
  f: TheaterFilters,
): MovieListItem[] {
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
    out.sort(
      (a, b) =>
        (b.release_date || '').localeCompare(a.release_date || '') * dir,
    )
  }
  return out
}

interface TheaterViewProps {
  initialTheater: MovieListItem[]
  isDemo: boolean
  isApiUnreachable: boolean
}

export function TheaterView({
  initialTheater,
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

  const isLoading = initialTheater.length === 0

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

  const theaterFiltered = useMemo(
    () => filterAndSortTheater(initialTheater, theaterFilters),
    [initialTheater, theaterFilters],
  )

  const theaterBuckets = useMemo(() => {
    const topByRevenue = [...theaterFiltered]
      .filter((m) => (m.revenue ?? 0) > 0)
      .sort((a, b) => (b.revenue ?? 0) - (a.revenue ?? 0))
      .slice(0, BUCKET_SIZE)
    const topByScore = [...theaterFiltered]
      .sort((a, b) => b.vote_average - a.vote_average)
      .slice(0, BUCKET_SIZE)
    const topByVoteCount = [...theaterFiltered]
      .sort((a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0))
      .slice(0, BUCKET_SIZE)
    return {
      topBoxOffice: topByRevenue,
      criticsFavorite: topByScore,
      crowdFavorite: topByVoteCount,
    }
  }, [theaterFiltered])

  const heroItem = theaterBuckets.topBoxOffice[0] ?? theaterFiltered[0] ?? null

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
            {['Top box office', "Critics' favorites", 'Crowd favorites'].map(
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
          theaterBuckets.topBoxOffice.length > 0 && (
            <BucketRow title="Top box office">
              {theaterBuckets.topBoxOffice.map((m, i) => (
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
          theaterBuckets.criticsFavorite.length > 0 && (
            <BucketRow title="Critics' favorites">
              {theaterBuckets.criticsFavorite.map((m, i) => (
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
          theaterBuckets.crowdFavorite.length > 0 && (
            <BucketRow title="Crowd favorites">
              {theaterBuckets.crowdFavorite.map((m, i) => (
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
            <BoxOfficePanel movies={theaterFiltered} loading={isLoading} />
            <ChartPanel movies={theaterFiltered} loading={isLoading} />
          </Box>
        )}
      </Container>
    </>
  )
}
