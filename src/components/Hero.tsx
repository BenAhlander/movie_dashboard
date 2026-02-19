import { Box, Typography, Skeleton } from '@mui/material'
import { motion } from 'framer-motion'
import { backdropUrl } from '../utils/imageUrl'
import { audienceScorePercent } from '../utils/scoreScaling'
import { formatDate } from '../utils/formatters'
import type { MovieListItem, StreamingListItem } from '../types'

type HeroItem = MovieListItem | StreamingListItem

function isStreaming(item: HeroItem): item is StreamingListItem {
  return 'media_type' in item
}

interface HeroProps {
  item: HeroItem | null
  loading?: boolean
}

export function Hero({ item, loading }: HeroProps) {
  if (!item && !loading) return null

  if (!item && loading) {
    return (
      <Box
        sx={{
          position: 'relative',
          height: { xs: '36vh', md: '40vh' },
          minHeight: 240,
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #1a0a0a 0%, #0a0a0a 100%)',
        }}
      >
        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            pb: 2,
            px: { xs: 2, md: 4 },
            maxWidth: 1200,
            mx: 'auto',
          }}
        >
          <Skeleton variant="text" width={320} height={48} className="shimmer" />
          <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
            <Skeleton variant="text" width={40} height={24} className="shimmer" />
            <Skeleton variant="text" width={100} height={24} className="shimmer" />
          </Box>
          <Skeleton variant="text" width={480} height={20} sx={{ mt: 1, display: { xs: 'none', sm: 'block' } }} className="shimmer" />
        </Box>
      </Box>
    )
  }

  if (!item) return null

  const backdrop = backdropUrl(item.backdrop_path, 'w1280')
  const score = audienceScorePercent(item.vote_average)
  const title = item.title

  return (
    <Box
      component={motion.section}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      sx={{
        position: 'relative',
        height: { xs: '36vh', md: '40vh' },
        minHeight: 240,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: backdrop
            ? `linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.92) 100%), url(${backdrop}) center/cover`
            : 'linear-gradient(135deg, #1a0a0a 0%, #0a0a0a 100%)',
          transform: 'scale(1.02)',
        }}
        className="grain vignette"
      />
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          pb: 2,
          px: { xs: 2, md: 4 },
          maxWidth: 1200,
          mx: 'auto',
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          {isStreaming(item) && (
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1, mb: 0.5, display: 'block' }}>
              {item.media_type === 'movie' ? 'Movie' : 'TV'} · Trending
            </Typography>
          )}
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 700,
              textShadow: '0 2px 16px rgba(0,0,0,0.8)',
              fontSize: { xs: '1.5rem', md: '2.25rem' },
            }}
          >
            {title}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mt: 0.5 }}>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.95)', fontWeight: 600 }}>
              {score}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {formatDate(item.release_date)}
            </Typography>
          </Box>
          {item.overview && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mt: 1,
                maxWidth: 480,
                display: { xs: 'none', sm: 'block' },
                lineHeight: 1.4,
              }}
            >
              {item.overview.slice(0, 120)}
              {item.overview.length > 120 ? '…' : ''}
            </Typography>
          )}
        </motion.div>
      </Box>
    </Box>
  )
}
