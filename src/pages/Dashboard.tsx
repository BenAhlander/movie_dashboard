import { useState } from 'react'
import { Box, Container, Typography, Alert, Button, Skeleton } from '@mui/material'
import { Header } from '../components/Header'
import { ModeSwitcher } from '../components/ModeSwitcher'
import { Hero } from '../components/Hero'
import { BucketRow } from '../components/BucketRow'
import { TheaterCard } from '../components/TheaterCard'
import { StreamingCard } from '../components/StreamingCard'
import { TheaterFiltersBar } from '../components/TheaterFiltersBar'
import { StreamingFiltersBar } from '../components/StreamingFiltersBar'
import { StreamingGrid } from '../components/StreamingGrid'
import { BoxOfficePanel } from '../components/BoxOfficePanel'
import { ChartPanel } from '../components/ChartPanel'
import { DetailDrawer } from '../components/DetailDrawer'
import { useTheaterMovies } from '../hooks/useTheaterMovies'
import { useStreaming } from '../hooks/useStreaming'
import { useMovieDetails } from '../hooks/useMovieDetails'
import { useSearchMovies, useSearchMulti } from '../hooks/useSearchMovies'
import type { AppMode, MovieListItem, StreamingListItem, TheaterFilters, StreamingFilters } from '../types'

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

export function Dashboard() {
  const [mode, setMode] = useState<AppMode>('theater')
  const [theaterFilters, setTheaterFilters] = useState<TheaterFilters>(defaultTheaterFilters)
  const [streamingFilters, setStreamingFilters] = useState<StreamingFilters>(defaultStreamingFilters)
  const [selectedMovieId, setSelectedMovieId] = useState<number | null>(null)

  const theater = useTheaterMovies(theaterFilters)
  const streaming = useStreaming(streamingFilters, 'week')
  const { data: detailMovie, isLoading: detailLoading } = useMovieDetails(selectedMovieId)

  const movieSearch = useSearchMovies(theaterFilters.search)
  const multiSearch = useSearchMulti(streamingFilters.search)

  const isTheater = mode === 'theater'

  const streamingResults = multiSearch.isSearchActive
    ? multiSearch.results
    : streaming.results

  const heroItem = isTheater
    ? (theater.buckets.topBoxOffice[0] ?? theater.results[0] ?? null)
    : (streaming.buckets.trendingThisWeek[0] ?? streaming.results[0] ?? null)
  const isDemo = isTheater ? theater.isDemo : streaming.isDemo
  const isApiUnreachable = isTheater ? theater.isApiUnreachable : streaming.isApiUnreachable
  const refetch = isTheater ? theater.refetch : streaming.refetch

  const handleSelectTheaterMovie = (movie: MovieListItem) => setSelectedMovieId(movie.id)
  const handleSelectStreamingItem = (item: StreamingListItem) => {
    if (item.media_type === 'movie') setSelectedMovieId(item.id)
  }

  return (
    <Box sx={{ minHeight: '100vh', pb: 4 }}>
      <Header />
      <ModeSwitcher value={mode} onChange={setMode} />
      <Hero item={heroItem} loading={isTheater ? theater.isLoading : streaming.isLoading} />

      <Container maxWidth="xl" sx={{ px: { xs: 1, sm: 2 } }}>
        {isDemo && !isApiUnreachable && (
          <Alert
            severity="info"
            sx={{ mt: 2 }}
            action={
              <Button color="inherit" size="small" href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener">
                Get key
              </Button>
            }
          >
            Demo mode: no API key. Showing sample data. Scores are Audience (TMDB). Add VITE_TMDB_API_KEY for live data.
          </Alert>
        )}
        {isApiUnreachable && (
          <Alert severity="warning" sx={{ mt: 2 }} action={<Button onClick={() => refetch()}>Retry</Button>}>
            Could not reach API. Showing sample data.
          </Alert>
        )}

        {isTheater && (
          <>
            <TheaterFiltersBar filters={theaterFilters} onChange={(next) => setTheaterFilters((p) => ({ ...p, ...next }))} />
            {theater.isLoading && !movieSearch.isSearchActive && (
              <>
                {['Top box office', "Critics' favorites", 'Crowd favorites'].map((title) => (
                  <BucketRow key={title} title={title}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Box key={i} sx={{ width: 160, minWidth: 160 }}>
                        <Skeleton variant="rectangular" height={240} sx={{ borderRadius: 1 }} className="shimmer" />
                        <Skeleton variant="text" width="80%" height={24} sx={{ mt: 1 }} />
                        <Skeleton variant="text" width="60%" height={20} sx={{ mt: 0.5 }} />
                      </Box>
                    ))}
                  </BucketRow>
                ))}
              </>
            )}
            {!theater.isLoading && !movieSearch.isSearchActive && theater.buckets.topBoxOffice.length > 0 && (
              <BucketRow title="Top box office">
                {theater.buckets.topBoxOffice.map((m, i) => (
                  <TheaterCard key={m.id} movie={m} rank={i + 1} onClick={() => handleSelectTheaterMovie(m)} />
                ))}
              </BucketRow>
            )}
            {!theater.isLoading && !movieSearch.isSearchActive && theater.buckets.criticsFavorite.length > 0 && (
              <BucketRow title="Critics' favorites">
                {theater.buckets.criticsFavorite.map((m, i) => (
                  <TheaterCard key={m.id} movie={m} rank={i + 1} onClick={() => handleSelectTheaterMovie(m)} />
                ))}
              </BucketRow>
            )}
            {!theater.isLoading && !movieSearch.isSearchActive && theater.buckets.crowdFavorite.length > 0 && (
              <BucketRow title="Crowd favorites">
                {theater.buckets.crowdFavorite.map((m, i) => (
                  <TheaterCard key={m.id} movie={m} rank={i + 1} onClick={() => handleSelectTheaterMovie(m)} />
                ))}
              </BucketRow>
            )}
          </>
        )}

        {!isTheater && (
          <>
            <StreamingFiltersBar filters={streamingFilters} onChange={(next) => setStreamingFilters((p) => ({ ...p, ...next }))} />
            {streaming.isLoading && !multiSearch.isSearchActive && (
              <>
                {['Trending this week', 'Best rated'].map((title) => (
                  <BucketRow key={title} title={title}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Box key={i} sx={{ width: 160, minWidth: 160 }}>
                        <Skeleton variant="rectangular" height={240} sx={{ borderRadius: 1 }} className="shimmer" />
                        <Skeleton variant="text" width="80%" height={24} sx={{ mt: 1 }} />
                        <Skeleton variant="text" width="40%" height={20} sx={{ mt: 0.5 }} />
                      </Box>
                    ))}
                  </BucketRow>
                ))}
              </>
            )}
            {!streaming.isLoading && !multiSearch.isSearchActive && streaming.buckets.trendingThisWeek.length > 0 && (
              <BucketRow title="Trending this week">
                {streaming.buckets.trendingThisWeek.map((item, i) => (
                  <StreamingCard key={`${item.media_type}-${item.id}`} item={item} rank={i + 1} onClick={() => handleSelectStreamingItem(item)} />
                ))}
              </BucketRow>
            )}
            {!streaming.isLoading && !multiSearch.isSearchActive && streaming.buckets.bestRated.length > 0 && (
              <BucketRow title="Best rated">
                {streaming.buckets.bestRated.map((item, i) => (
                  <StreamingCard key={`${item.media_type}-${item.id}`} item={item} rank={i + 1} onClick={() => handleSelectStreamingItem(item)} />
                ))}
              </BucketRow>
            )}
            <Typography variant="h6" sx={{ mb: 1 }}>
              {multiSearch.isSearchActive ? 'Search results' : 'All trending'}
            </Typography>
            <StreamingGrid
              items={streamingResults}
              loading={streaming.isLoading || multiSearch.isSearching}
              onSelectItem={handleSelectStreamingItem}
              showRank={!multiSearch.isSearchActive}
            />
          </>
        )}

        <Box sx={{ mt: 4 }}>
          {isTheater && (
            <>
              <BoxOfficePanel movies={theater.results} loading={theater.isLoading} />
              <ChartPanel movies={theater.results} loading={theater.isLoading} />
            </>
          )}
          {!isTheater && (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
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
