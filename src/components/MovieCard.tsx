'use client'

import { Card, CardContent, CardMedia, Typography, Box } from '@mui/material'
import { motion } from 'framer-motion'
import { posterUrl } from '@/utils/imageUrl'
import { audienceScorePercent, scalePopularityToHype } from '@/utils/scoreScaling'
import { StatChip } from './StatChip'
import type { MovieListItem } from '@/types'

interface MovieCardProps {
  movie: MovieListItem
  rank?: number
  onClick?: () => void
}

export function MovieCard({ movie, rank, onClick }: MovieCardProps) {
  const poster = posterUrl(movie.poster_path, 'w342')
  const score = audienceScorePercent(movie.vote_average)
  const hype = scalePopularityToHype(movie.popularity ?? 0)

  return (
    <motion.div
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      style={{ height: '100%' }}
    >
      <Card
        onClick={onClick}
        sx={{
          height: '100%',
          cursor: onClick ? 'pointer' : 'default',
          background: 'rgba(26,26,26,0.8)',
          border: '1px solid rgba(255,255,255,0.06)',
          transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
          '&:hover': {
            boxShadow: '0 12px 40px rgba(229,9,20,0.15), 0 0 0 1px rgba(255,255,255,0.08)',
            borderColor: 'rgba(229,9,20,0.3)',
          },
        }}
      >
        <Box sx={{ position: 'relative' }}>
          {rank != null && (
            <Box
              sx={{
                position: 'absolute',
                top: 8,
                left: 8,
                zIndex: 1,
                width: 28,
                height: 28,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography variant="caption" fontWeight={700}>
                {rank}
              </Typography>
            </Box>
          )}
          <CardMedia
            component="img"
            height="320"
            image={poster || '/placeholder-poster.svg'}
            alt={movie.title}
            loading="lazy"
            sx={{ objectFit: 'cover' }}
            onError={(e) => {
              const t = e.target as HTMLImageElement
              if (t) t.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="342" height="513"><rect fill="%231a1a1a" width="342" height="513"/><text x="50%" y="50%" fill="%23666" text-anchor="middle" dy=".3em" font-size="18">No poster</text></svg>'
            }}
          />
        </Box>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Typography variant="subtitle1" fontWeight={600} noWrap sx={{ mb: 0.5 }}>
            {movie.title}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            <StatChip label="Score" value={`${score}%`} />
            <StatChip label="Hype" value={hype} />
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  )
}
