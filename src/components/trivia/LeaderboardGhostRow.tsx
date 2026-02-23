'use client'

import { Box, Typography } from '@mui/material'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import { motion, useReducedMotion } from 'framer-motion'

interface LeaderboardGhostRowProps {
  score: number
  total: number
  ghostRank: number
  period: string
  animationDelay?: number
}

/**
 * A dashed, semi-transparent "ghost" row showing where an anonymous
 * user's score would rank on the leaderboard.
 */
export function LeaderboardGhostRow({
  score,
  total,
  ghostRank,
  period,
  animationDelay = 0,
}: LeaderboardGhostRowProps) {
  const reducedMotion = useReducedMotion()
  const pct = total > 0 ? Math.round((score / total) * 100) : 0

  return (
    <motion.div
      initial={reducedMotion ? { opacity: 0.45 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 0.45, y: 0 }}
      transition={
        reducedMotion
          ? { duration: 0 }
          : { delay: animationDelay, duration: 0.35, ease: 'easeOut' }
      }
    >
      <Box
        id="leaderboard-ghost-row"
        aria-hidden="true"
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          minHeight: 52,
          px: 2,
          border: '1px dashed rgba(255,255,255,0.2)',
          borderRadius: '8px',
          mb: 0.5,
        }}
      >
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ width: 36, textAlign: 'center', fontWeight: 600, flexShrink: 0 }}
        >
          ?
        </Typography>

        <Box
          sx={{
            width: { xs: 28, sm: 36 },
            height: { xs: 28, sm: 36 },
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <LockOutlinedIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            You (guest)
          </Typography>
        </Box>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ flexShrink: 0, display: { xs: 'none', sm: 'block' } }}
        >
          {pct}%
        </Typography>

        <Typography
          variant="body2"
          sx={{ fontWeight: 600, flexShrink: 0 }}
        >
          {score} / {total}
        </Typography>
      </Box>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', textAlign: 'center', mb: 1.5 }}
      >
        Your score would rank around #{ghostRank}{' '}
        {period === 'today' ? 'today' : 'all time'}.
      </Typography>

      {/* Accessible version for screen readers */}
      <Box
        sx={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
        }}
        aria-live="polite"
      >
        Your score of {score} out of {total} would place you at approximately
        rank {ghostRank}.
      </Box>
    </motion.div>
  )
}
