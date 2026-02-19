'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Box, Container, Typography, Alert, Button, Skeleton } from '@mui/material'
import { Header } from './Header'
import { ModeSwitcher } from './ModeSwitcher'
import { Hero } from './Hero'
import { BucketRow } from './BucketRow'
import { TheaterCard } from './TheaterCard'
import { StreamingCard } from './StreamingCard'
import { TheaterFiltersBar } from './TheaterFiltersBar'
import { StreamingFiltersBar } from './StreamingFiltersBar'
import { StreamingGrid } from './StreamingGrid'
import { BoxOfficePanel } from './BoxOfficePanel'
import { ChartPanel } from './ChartPanel'
import { DetailDrawer } from './DetailDrawer'
import type {
  AppMode,
  MovieListItem,
  MovieDetail,
  StreamingListItem,
  TheaterFilters,
  StreamingFilters,
} from '@/types'

const BUCKET_SIZE = 5
const DEBOUNCE_MS = 400

const defaultTheaterFilters: TheaterFilters = {
  search: '',
  minScore: 0,
  sortBy: 'revenue',
  sortDir: 'desc',
}

const defaultStreamingFilters: StreamingFilters = {
  search: '',
  minScore: 0,
  sortBy: 'trending',
  sortDir: 'desc',
  typeFilter: 'all',
}

/* ── Filter / sort helpers (moved from old hooks) ── */

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

function filterAndSortStreaming(
  list: StreamingListItem[],
  f: StreamingFilters,
): StreamingListItem[] {
  let out = [...list]
  const search = f.search.trim().toLowerCase()
  if (search) out = out.filter((m) => m.title.toLowerCase().includes(search))
  if (f.typeFilter === 'movie')
    out = out.filter((m) => m.media_type === 'movie')
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

/* ── Debounce hook ── */

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

/* ── Dashboard props ── */

interface DashboardProps {
  initialTheater: MovieListItem[]
  initialStreaming: StreamingListItem[]
  isDemo: boolean
  isApiUnreachable: boolean
}

export function Dashboard({
  initialTheater,
  initialStreaming,
  isDemo,
  isApiUnreachable,
}: DashboardProps) {
  const [mode, setMode] = useState<AppMode>('theater')
  const [theaterFilters, setTheaterFilters] =
    useState<TheaterFilters>(defaultTheaterFilters)
  const [streamingFilters, setStreamingFilters] =
    useState<StreamingFilters>(defaultStreamingFilters)
  const [selectedMovieId, setSelectedMovieId] = useState<number | null>(null)
  const [detailMovie, setDetailMovie] = useState<MovieDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  /* ── Search state (client-side fetch) ── */
  const debouncedStreamingSearch = useDebouncedValue(
    streamingFilters.search.trim(),
    DEBOUNCE_MS,
  )

  // Theater search is local-only (filters initialTheater)
  const movieSearchActive = theaterFilters.search.trim().length >= 2

  const [multiSearchResults, setMultiSearchResults] = useState<
    StreamingListItem[]
  >([])
  const [multiSearching, setMultiSearching] = useState(false)
  const multiSearchActive = debouncedStreamingSearch.length >= 2

  /* ── Multi search ── */
  useEffect(() => {
    if (!multiSearchActive) {
      setMultiSearchResults([])
      return
    }
    let cancelled = false
    setMultiSearching(true)
    fetch(
      `/api/search?q=${encodeURIComponent(debouncedStreamingSearch)}&type=multi`,
    )
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          const items: StreamingListItem[] = (data.results ?? [])
            .filter(
              (r: Record<string, unknown>) =>
                r.media_type === 'movie' || r.media_type === 'tv',
            )
            .map(
              (r: Record<string, unknown>) =>
                ({
                  id: r.id as number,
                  media_type: r.media_type as 'movie' | 'tv',
                  title:
                    r.media_type === 'tv'
                      ? ((r.name as string) ?? (r.title as string))
                      : (r.title as string),
                  poster_path: r.poster_path as string | null,
                  backdrop_path: r.backdrop_path as string | null,
                  release_date:
                    r.media_type === 'tv'
                      ? ((r.first_air_date as string) ??
                        (r.release_date as string))
                      : (r.release_date as string),
                  vote_average: r.vote_average as number,
                  vote_count: r.vote_count as number,
                  popularity: r.popularity as number,
                  overview: r.overview as string | undefined,
                  genre_ids: r.genre_ids as number[] | undefined,
                }) as StreamingListItem,
            )
          setMultiSearchResults(items)
        }
      })
      .catch(() => {
        if (!cancelled) setMultiSearchResults([])
      })
      .finally(() => {
        if (!cancelled) setMultiSearching(false)
      })
    return () => {
      cancelled = true
    }
  }, [debouncedStreamingSearch, multiSearchActive])

  /* ── Movie detail fetch ── */
  useEffect(() => {
    if (selectedMovieId == null) {
      setDetailMovie(null)
      return
    }
    let cancelled = false
    setDetailLoading(true)
    fetch(`/api/movie/${selectedMovieId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setDetailMovie(data.movie ?? null)
      })
      .catch(() => {
        if (!cancelled) setDetailMovie(null)
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedMovieId])

  /* ── Derived data ── */
  const theaterFiltered = useMemo(
    () => filterAndSortTheater(initialTheater, theaterFilters),
    [initialTheater, theaterFilters],
  )
  const streamingFiltered = useMemo(
    () => filterAndSortStreaming(initialStreaming, streamingFilters),
    [initialStreaming, streamingFilters],
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

  const streamingBuckets = useMemo(() => {
    const trendingThisWeek = [...streamingFiltered]
      .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
      .slice(0, BUCKET_SIZE)
    const bestRated = [...streamingFiltered]
      .sort((a, b) => b.vote_average - a.vote_average)
      .slice(0, BUCKET_SIZE)
    return { trendingThisWeek, bestRated }
  }, [streamingFiltered])

  const isTheater = mode === 'theater'
  const isLoading = isTheater
    ? initialTheater.length === 0
    : initialStreaming.length === 0

  const streamingResults = multiSearchActive
    ? multiSearchResults
    : streamingFiltered

  const heroItem = isTheater
    ? (theaterBuckets.topBoxOffice[0] ?? theaterFiltered[0] ?? null)
    : (streamingBuckets.trendingThisWeek[0] ?? streamingFiltered[0] ?? null)

  const handleSelectTheaterMovie = useCallback(
    (movie: MovieListItem) => setSelectedMovieId(movie.id),
    [],
  )
  const handleSelectStreamingItem = useCallback(
    (item: StreamingListItem) => {
      if (item.media_type === 'movie') setSelectedMovieId(item.id)
    },
    [],
  )

  const handleRefresh = useCallback(() => {
    window.location.reload()
  }, [])

  return (
    <Box sx={{ minHeight: '100vh', pb: 4 }}>
      <Header />
      <ModeSwitcher value={mode} onChange={setMode} />
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

        {isTheater && (
          <>
            <TheaterFiltersBar
              filters={theaterFilters}
              onChange={(next) =>
                setTheaterFilters((p) => ({ ...p, ...next }))
              }
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
                      onClick={() => handleSelectTheaterMovie(m)}
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
                      onClick={() => handleSelectTheaterMovie(m)}
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
                      onClick={() => handleSelectTheaterMovie(m)}
                    />
                  ))}
                </BucketRow>
              )}
          </>
        )}

        {!isTheater && (
          <>
            <StreamingFiltersBar
              filters={streamingFilters}
              onChange={(next) =>
                setStreamingFilters((p) => ({ ...p, ...next }))
              }
            />
            {isLoading && !multiSearchActive && (
              <>
                {['Trending this week', 'Best rated'].map((title) => (
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
                          width="40%"
                          height={20}
                          sx={{ mt: 0.5 }}
                        />
                      </Box>
                    ))}
                  </BucketRow>
                ))}
              </>
            )}
            {!isLoading &&
              !multiSearchActive &&
              streamingBuckets.trendingThisWeek.length > 0 && (
                <BucketRow title="Trending this week">
                  {streamingBuckets.trendingThisWeek.map((item, i) => (
                    <StreamingCard
                      key={`${item.media_type}-${item.id}`}
                      item={item}
                      rank={i + 1}
                      onClick={() => handleSelectStreamingItem(item)}
                    />
                  ))}
                </BucketRow>
              )}
            {!isLoading &&
              !multiSearchActive &&
              streamingBuckets.bestRated.length > 0 && (
                <BucketRow title="Best rated">
                  {streamingBuckets.bestRated.map((item, i) => (
                    <StreamingCard
                      key={`${item.media_type}-${item.id}`}
                      item={item}
                      rank={i + 1}
                      onClick={() => handleSelectStreamingItem(item)}
                    />
                  ))}
                </BucketRow>
              )}
            <Typography variant="h6" sx={{ mb: 1 }}>
              {multiSearchActive ? 'Search results' : 'All trending'}
            </Typography>
            <StreamingGrid
              items={streamingResults}
              loading={isLoading || multiSearching}
              onSelectItem={handleSelectStreamingItem}
              showRank={!multiSearchActive}
            />
          </>
        )}

        <Box sx={{ mt: 4 }}>
          {isTheater && (
            <>
              <BoxOfficePanel
                movies={theaterFiltered}
                loading={isLoading}
              />
              <ChartPanel movies={theaterFiltered} loading={isLoading} />
            </>
          )}
          {!isTheater && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ py: 2 }}
            >
              Charts available in Theater mode.
            </Typography>
          )}
        </Box>
      </Container>

      <DetailDrawer
        open={selectedMovieId != null}
        onClose={() => setSelectedMovieId(null)}
        movie={detailMovie ?? null}
        loading={selectedMovieId != null && detailLoading}
      />
    </Box>
  )
}
