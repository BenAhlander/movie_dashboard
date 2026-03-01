'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Box,
  Typography,
  Button,
  Skeleton,
  Paper,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import MovieIcon from '@mui/icons-material/Movie'
import { motion, useReducedMotion } from 'framer-motion'
import type { H2HLeaderboardFilm } from '@/types/h2h'
import { fetchLeaderboard } from '@/lib/h2h/h2hApi'
import { posterUrl } from '@/utils/imageUrl'

interface H2HLeaderboardProps {
  onBack: () => void
}

/** Medal colors for top 3 */
const MEDAL_COLORS: Record<number, string> = {
  1: '#FFD700',
  2: '#C0C0C0',
  3: '#CD7F32',
}

function LeaderboardFilmRow({
  film,
  index,
  reducedMotion,
}: {
  film: H2HLeaderboardFilm
  index: number
  reducedMotion: boolean | null
}) {
  const poster = posterUrl(film.posterPath, 'w92')
  const medalColor = MEDAL_COLORS[film.rank]

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
    >
      <Box
        data-testid={`h2h-leaderboard-row-${film.rank}`}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2,
          py: 1.5,
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          '&:hover': {
            backgroundColor: 'rgba(255,255,255,0.03)',
          },
        }}
      >
        {/* Rank */}
        <Typography
          variant="body2"
          sx={{
            fontWeight: 700,
            width: 32,
            textAlign: 'center',
            color: medalColor ?? 'text.secondary',
            fontSize: medalColor ? '1.1rem' : '0.875rem',
          }}
        >
          {medalColor ? (
            <EmojiEventsIcon
              sx={{ fontSize: 20, color: medalColor, verticalAlign: 'middle' }}
            />
          ) : (
            `#${film.rank}`
          )}
        </Typography>

        {/* Poster thumbnail */}
        <Box
          sx={{
            width: { xs: 36, sm: 44 },
            height: { xs: 54, sm: 66 },
            borderRadius: '6px',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {poster ? (
            <Box
              component="img"
              src={poster}
              alt={film.title}
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          ) : (
            <Box
              sx={{
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(26,26,26,0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MovieIcon sx={{ fontSize: 18, color: 'rgba(255,255,255,0.2)' }} />
            </Box>
          )}
        </Box>

        {/* Title + year */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              color: 'text.primary',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {film.title}
          </Typography>
          {film.year && (
            <Typography variant="caption" color="text.secondary">
              {film.year}
            </Typography>
          )}
        </Box>

        {/* Elo rating */}
        <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
          <Typography
            variant="body2"
            sx={{ fontWeight: 700, color: 'text.primary' }}
          >
            {film.eloRating}
          </Typography>
          <Typography variant="caption" color="text.disabled">
            Elo
          </Typography>
        </Box>

        {/* Vote count */}
        <Box
          sx={{
            textAlign: 'right',
            flexShrink: 0,
            display: { xs: 'none', sm: 'block' },
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {film.voteCount}
          </Typography>
          <Typography variant="caption" color="text.disabled">
            votes
          </Typography>
        </Box>
      </Box>
    </motion.div>
  )
}

function LeaderboardSkeleton() {
  return (
    <Box sx={{ px: 2, pt: 1 }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <Box
          key={i}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            py: 1.5,
          }}
        >
          <Skeleton variant="circular" width={24} height={24} />
          <Skeleton
            variant="rounded"
            width={36}
            height={54}
            sx={{ borderRadius: '6px' }}
          />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="70%" />
            <Skeleton variant="text" width="30%" />
          </Box>
          <Skeleton variant="text" width={40} />
        </Box>
      ))}
    </Box>
  )
}

export function H2HLeaderboard({ onBack }: H2HLeaderboardProps) {
  const reducedMotion = useReducedMotion()
  const [films, setFilms] = useState<H2HLeaderboardFilm[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setHasError(false)
    try {
      const data = await fetchLeaderboard()
      setFilms(data.films)
    } catch {
      setHasError(true)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  return (
    <Box
      id="h2h-leaderboard"
      sx={{
        width: '100%',
        maxWidth: 540,
        mx: 'auto',
        px: 2,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box sx={{ flexShrink: 0 }}>
        <Button
          id="btn-h2h-back"
          startIcon={<ArrowBackIcon />}
          onClick={onBack}
          sx={{
            color: 'text.secondary',
            mt: 2,
            textTransform: 'none',
            '&:hover': { color: 'text.primary' },
          }}
        >
          Back to Voting
        </Button>

        <Typography
          id="h2h-leaderboard-heading"
          variant="h5"
          fontWeight={700}
          sx={{ mt: 2, mb: 1 }}
        >
          Film Rankings
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 2 }}
        >
          Films ranked by Elo rating from community votes
        </Typography>

        {/* Column headers */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: 2,
            pb: 1,
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              width: 32,
            }}
          >
            #
          </Typography>
          <Box sx={{ width: { xs: 36, sm: 44 }, flexShrink: 0 }} />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              flex: 1,
            }}
          >
            Film
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Rating
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              display: { xs: 'none', sm: 'block' },
            }}
          >
            Votes
          </Typography>
        </Box>
      </Box>

      {/* Scrollable list */}
      <Box
        id="h2h-leaderboard-rows"
        sx={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          mb: 1,
        }}
      >
        {isLoading && <LeaderboardSkeleton />}

        {!isLoading && hasError && (
          <Paper
            elevation={0}
            sx={{ p: 3, textAlign: 'center', mt: 2, borderRadius: '12px' }}
          >
            <Typography color="text.secondary" gutterBottom>
              Failed to load rankings
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={loadData}
              sx={{ mt: 1 }}
            >
              Retry
            </Button>
          </Paper>
        )}

        {!isLoading && !hasError && films.length === 0 && (
          <Paper
            elevation={0}
            sx={{ p: 3, textAlign: 'center', mt: 2, borderRadius: '12px' }}
          >
            <Typography color="text.secondary">
              No films have enough votes yet. Keep voting!
            </Typography>
          </Paper>
        )}

        {!isLoading &&
          !hasError &&
          films.map((film, index) => (
            <LeaderboardFilmRow
              key={film.id}
              film={film}
              index={index}
              reducedMotion={reducedMotion}
            />
          ))}
      </Box>

      {/* Footer */}
      <Box sx={{ flexShrink: 0, pb: 3 }}>
        <Box sx={{ maxWidth: 320, mx: 'auto' }}>
          <Button
            id="btn-h2h-back-to-voting"
            variant="contained"
            color="primary"
            size="large"
            fullWidth
            onClick={onBack}
            sx={{
              height: 52,
              borderRadius: '12px',
              fontWeight: 700,
            }}
          >
            Back to Voting
          </Button>
        </Box>
      </Box>
    </Box>
  )
}
