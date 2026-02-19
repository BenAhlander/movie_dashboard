import { useState } from 'react'
import { Box, Container, Typography, Alert, Button, Collapse } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import { Header } from '../components/Header'
import { ModeSwitcher } from '../components/ModeSwitcher'
import { Hero } from '../components/Hero'
import { BucketRow } from '../components/BucketRow'
import { TheaterCard } from '../components/TheaterCard'
import { StreamingCard } from '../components/StreamingCard'
import { TheaterFiltersBar } from '../components/TheaterFiltersBar'
import { StreamingFiltersBar } from '../components/StreamingFiltersBar'
import { TheaterGrid } from '../components/TheaterGrid'
import { StreamingGrid } from '../components/StreamingGrid'
import { ChartPanel } from '../components/ChartPanel'
import { DetailDrawer } from '../components/DetailDrawer'
import { useTheaterMovies } from '../hooks/useTheaterMovies'
import { useStreaming } from '../hooks/useStreaming'
import { useMovieDetails } from '../hooks/useMovieDetails'
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
  const [analyticsOpen, setAnalyticsOpen] = useState(false)

  const theater = useTheaterMovies(theaterFilters)
  const streaming = useStreaming(streamingFilters, 'week')
  const { data: detailMovie, isLoading: detailLoading } = useMovieDetails(selectedMovieId)

  const isTheater = mode === 'theater'
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
      <Hero item={heroItem} />

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
            {theater.buckets.topBoxOffice.length > 0 && (
              <BucketRow title="Top box office">
                {theater.buckets.topBoxOffice.map((m, i) => (
                  <TheaterCard key={m.id} movie={m} rank={i + 1} onClick={() => handleSelectTheaterMovie(m)} />
                ))}
              </BucketRow>
            )}
            {theater.buckets.criticsFavorite.length > 0 && (
              <BucketRow title="Critics' favorites">
                {theater.buckets.criticsFavorite.map((m, i) => (
                  <TheaterCard key={m.id} movie={m} rank={i + 1} onClick={() => handleSelectTheaterMovie(m)} />
                ))}
              </BucketRow>
            )}
            {theater.buckets.crowdFavorite.length > 0 && (
              <BucketRow title="Crowd favorites">
                {theater.buckets.crowdFavorite.map((m, i) => (
                  <TheaterCard key={m.id} movie={m} rank={i + 1} onClick={() => handleSelectTheaterMovie(m)} />
                ))}
              </BucketRow>
            )}
            <Typography variant="h6" sx={{ mb: 1 }}>
              All in theaters
            </Typography>
            <TheaterGrid
              movies={theater.results}
              loading={theater.isLoading}
              onSelectMovie={handleSelectTheaterMovie}
              showRank
            />
          </>
        )}

        {!isTheater && (
          <>
            <StreamingFiltersBar filters={streamingFilters} onChange={(next) => setStreamingFilters((p) => ({ ...p, ...next }))} />
            {streaming.buckets.trendingThisWeek.length > 0 && (
              <BucketRow title="Trending this week">
                {streaming.buckets.trendingThisWeek.map((item, i) => (
                  <StreamingCard key={`${item.media_type}-${item.id}`} item={item} rank={i + 1} onClick={() => handleSelectStreamingItem(item)} />
                ))}
              </BucketRow>
            )}
            {streaming.buckets.bestRated.length > 0 && (
              <BucketRow title="Best rated">
                {streaming.buckets.bestRated.map((item, i) => (
                  <StreamingCard key={`${item.media_type}-${item.id}`} item={item} rank={i + 1} onClick={() => handleSelectStreamingItem(item)} />
                ))}
              </BucketRow>
            )}
            <Typography variant="h6" sx={{ mb: 1 }}>
              All trending
            </Typography>
            <StreamingGrid
              items={streaming.results}
              loading={streaming.isLoading}
              onSelectItem={handleSelectStreamingItem}
              showRank
            />
          </>
        )}

        <Box sx={{ mt: 4 }}>
          <Box
            component="button"
            type="button"
            onClick={() => setAnalyticsOpen(!analyticsOpen)}
            aria-label="Toggle analytics"
            aria-expanded={analyticsOpen}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              border: 0,
              background: 'none',
              color: 'text.secondary',
              cursor: 'pointer',
              fontSize: '0.875rem',
              '&:hover': { color: 'text.primary' },
            }}
          >
            {analyticsOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            Analytics
          </Box>
          <Collapse in={analyticsOpen}>
            {isTheater && <ChartPanel movies={theater.results} loading={theater.isLoading} />}
            {!isTheater && (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                Charts available in Theater mode.
              </Typography>
            )}
          </Collapse>
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
