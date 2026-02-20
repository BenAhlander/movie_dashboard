'use client'

import { useState } from 'react'
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  IconButton,
  Snackbar,
  Alert,
  Button,
} from '@mui/material'
import FavoriteIcon from '@mui/icons-material/Favorite'
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat'
import { motion, AnimatePresence } from 'framer-motion'
import { posterUrl } from '@/utils/imageUrl'
import { audienceScorePercent } from '@/utils/scoreScaling'
import { formatDate, formatRevenue } from '@/utils/formatters'
import { useFavorites } from './FavoritesContext'
import { useUser } from '@auth0/nextjs-auth0/client'
import type { MovieListItem, TrendDirection } from '@/types'

interface TheaterCardProps {
  movie: MovieListItem
  rank?: number
  trend?: TrendDirection
  onClick?: () => void
}

const trendConfig = {
  up: { Icon: TrendingUpIcon, color: '#4caf50', label: 'Trending up' },
  down: { Icon: TrendingDownIcon, color: '#f44336', label: 'Trending down' },
  flat: { Icon: TrendingFlatIcon, color: 'rgba(255,255,255,0.5)', label: 'Holding steady' },
} as const

export function TheaterCard({ movie, rank, trend, onClick }: TheaterCardProps) {
  const poster = posterUrl(movie.poster_path, 'w342')
  const score = audienceScorePercent(movie.vote_average)
  const revenue = movie.revenue != null && movie.revenue > 0 ? formatRevenue(movie.revenue) : null
  const { user } = useUser()
  const { isFavorite, getFavorite, addFavorite, removeFavorite, canAddMore } =
    useFavorites()
  const [hovered, setHovered] = useState(false)
  const [snackOpen, setSnackOpen] = useState(false)

  const favorited = isFavorite(movie.id)
  const showHeart = user && (hovered || favorited)

  const handleHeartClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (favorited) {
      const fav = getFavorite(movie.id)
      if (fav) await removeFavorite(fav.id)
    } else {
      if (!canAddMore) {
        setSnackOpen(true)
        return
      }
      await addFavorite({
        tmdb_id: movie.id,
        title: movie.title,
        poster_path: movie.poster_path,
      })
    }
  }

  return (
    <motion.div
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      style={{ width: 160, minWidth: 160 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Card
        onClick={onClick}
        sx={{
          cursor: onClick ? 'pointer' : 'default',
          background: 'rgba(26,26,26,0.9)',
          border: '1px solid rgba(255,255,255,0.06)',
          transition: 'border-color 0.2s',
          '&:hover': { borderColor: 'rgba(229,9,20,0.25)' },
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
                width: 26,
                height: 26,
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
          <AnimatePresence>
            {showHeart && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  zIndex: 2,
                }}
              >
                <IconButton
                  size="small"
                  onClick={handleHeartClick}
                  sx={{
                    bgcolor: 'rgba(0,0,0,0.6)',
                    borderRadius: '50%',
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
                    p: 0.5,
                  }}
                >
                  {favorited ? (
                    <motion.div
                      key="filled"
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 0.3 }}
                      style={{ display: 'flex' }}
                    >
                      <FavoriteIcon sx={{ fontSize: 20, color: '#e50914' }} />
                    </motion.div>
                  ) : (
                    <FavoriteBorderIcon sx={{ fontSize: 20, color: '#fff' }} />
                  )}
                </IconButton>
              </motion.div>
            )}
          </AnimatePresence>
          <CardMedia
            component="img"
            height={240}
            image={poster || ''}
            alt={movie.title}
            loading="lazy"
            sx={{ objectFit: 'cover' }}
            onError={(e) => {
              const t = e.target as HTMLImageElement
              if (t) t.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="342" height="513"><rect fill="%231a1a1a" width="342" height="513"/><text x="50%" y="50%" fill="%23666" text-anchor="middle" dy=".3em" font-size="14">No poster</text></svg>'
            }}
          />
        </Box>
        <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
          <Typography variant="subtitle2" fontWeight={600} noWrap>
            {movie.title}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
            {formatDate(movie.release_date)}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.95)', fontWeight: 600 }}>
              {score}%
            </Typography>
            {revenue && (
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                {revenue}
              </Typography>
            )}
            {trend && (() => {
              const { Icon, color, label } = trendConfig[trend]
              return <Icon sx={{ fontSize: 16, color }} aria-label={label} />
            })()}
          </Box>
        </CardContent>
      </Card>
      <Snackbar
        open={snackOpen}
        autoHideDuration={5000}
        onClose={() => setSnackOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity="warning"
          onClose={() => setSnackOpen(false)}
          action={
            <Button
              color="inherit"
              size="small"
              href="/profile"
            >
              Go to Profile
            </Button>
          }
        >
          You&apos;ve reached your 5 favorites. Remove one from your profile to add a new one.
        </Alert>
      </Snackbar>
    </motion.div>
  )
}
