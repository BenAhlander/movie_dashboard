'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  Box,
  Container,
  Typography,
  Alert,
  Button,
  Skeleton,
} from '@mui/material'
import { Hero } from './Hero'
import { BucketRow } from './BucketRow'
import { StreamingCard } from './StreamingCard'
import { StreamingFiltersBar } from './StreamingFiltersBar'
import { StreamingGrid } from './StreamingGrid'
import { useDetailDrawer } from './DetailDrawerContext'
import type { StreamingListItem, StreamingFilters } from '@/types'

const BUCKET_SIZE = 5
const defaultStreamingFilters: StreamingFilters = {
  search: '',
  minScore: 0,
  sortBy: 'trending',
  sortDir: 'desc',
  typeFilter: 'all',
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

interface StreamingViewProps {
  initialStreaming: StreamingListItem[]
  isDemo: boolean
  isApiUnreachable: boolean
}

export function StreamingView({
  initialStreaming,
  isDemo,
  isApiUnreachable,
}: StreamingViewProps) {
  const { setSelectedMovieId } = useDetailDrawer()
  const [streamingFilters, setStreamingFilters] = useState<StreamingFilters>(
    defaultStreamingFilters,
  )

  const searchTerm = streamingFilters.search.trim()

  const [multiSearchResults, setMultiSearchResults] = useState<
    StreamingListItem[]
  >([])
  const [multiSearching, setMultiSearching] = useState(false)
  const multiSearchActive = searchTerm.length >= 2

  const isLoading = initialStreaming.length === 0

  useEffect(() => {
    if (!multiSearchActive) {
      setMultiSearchResults([])
      return
    }
    let cancelled = false
    setMultiSearching(true)
    fetch(
      `/api/search?q=${encodeURIComponent(searchTerm)}&type=multi`,
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
  }, [searchTerm, multiSearchActive])

  const streamingFiltered = useMemo(
    () => filterAndSortStreaming(initialStreaming, streamingFilters),
    [initialStreaming, streamingFilters],
  )

  const streamingBuckets = useMemo(() => {
    const trendingThisWeek = [...streamingFiltered]
      .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
      .slice(0, BUCKET_SIZE)
    const bestRated = [...streamingFiltered]
      .sort((a, b) => b.vote_average - a.vote_average)
      .slice(0, BUCKET_SIZE)
    return { trendingThisWeek, bestRated }
  }, [streamingFiltered])

  const heroItem =
    streamingBuckets.trendingThisWeek[0] ?? streamingFiltered[0] ?? null

  const streamingResults = multiSearchActive
    ? multiSearchResults
    : streamingFiltered

  const handleSelectItem = useCallback(
    (item: StreamingListItem) => {
      if (item.media_type === 'movie') setSelectedMovieId(item.id)
    },
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
                  onClick={() => handleSelectItem(item)}
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
                  onClick={() => handleSelectItem(item)}
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
          onSelectItem={handleSelectItem}
          showRank={!multiSearchActive}
        />

        <Box sx={{ mt: 4 }}>
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            Charts available in Theater mode.
          </Typography>
        </Box>
      </Container>
    </>
  )
}
