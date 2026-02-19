'use client'

import { Box, Skeleton } from '@mui/material'
import { motion, AnimatePresence } from 'framer-motion'
import { MovieCard } from './MovieCard'
import type { MovieListItem } from '@/types'

interface MovieGridProps {
  movies: MovieListItem[]
  loading?: boolean
  onSelectMovie?: (movie: MovieListItem) => void
  showRank?: boolean
}

function CardSkeleton() {
  return (
    <Box sx={{ height: '100%' }}>
      <Skeleton variant="rectangular" height={320} sx={{ borderRadius: 1 }} className="shimmer" />
      <Skeleton variant="text" width="80%" height={28} sx={{ mt: 1 }} className="shimmer" />
      <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
        <Skeleton variant="rounded" width={60} height={24} className="shimmer" />
        <Skeleton variant="rounded" width={50} height={24} className="shimmer" />
      </Box>
    </Box>
  )
}

export function MovieGrid({ movies, loading, onSelectMovie, showRank }: MovieGridProps) {
  if (loading) {
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, 1fr)',
            sm: 'repeat(3, 1fr)',
            md: 'repeat(4, 1fr)',
            lg: 'repeat(5, 1fr)',
          },
          gap: 2,
        }}
      >
        {Array.from({ length: 10 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </Box>
    )
  }

  return (
    <Box
      component={motion.div}
      layout
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(2, 1fr)',
          sm: 'repeat(3, 1fr)',
          md: 'repeat(4, 1fr)',
          lg: 'repeat(5, 1fr)',
        },
        gap: 2,
      }}
    >
      <AnimatePresence mode="popLayout">
        {movies.map((movie, index) => (
          <motion.div
            key={movie.id}
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, delay: index % 8 * 0.03 }}
          >
            <MovieCard
              movie={movie}
              rank={showRank ? index + 1 : undefined}
              onClick={onSelectMovie ? () => onSelectMovie(movie) : undefined}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </Box>
  )
}
