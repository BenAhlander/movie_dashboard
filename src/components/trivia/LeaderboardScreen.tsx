'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Box,
  Typography,
  Button,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { motion, useReducedMotion } from 'framer-motion'
import type { LeaderboardRow, LeaderboardPeriod } from '@/types/trivia'
import { getLeaderboard } from '@/lib/trivia/gameApi'

interface LeaderboardScreenProps {
  userScore: number
  userTotal?: number
  onPlayAgain: () => void
  onBack: () => void
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <Box
        sx={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          backgroundColor: '#f59e0b',
          color: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: 14,
        }}
      >
        1
      </Box>
    )
  }

  if (rank === 2) {
    return (
      <Box
        sx={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.6)',
          color: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: 14,
        }}
      >
        2
      </Box>
    )
  }

  if (rank === 3) {
    return (
      <Box
        sx={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          backgroundColor: '#cd7c3c',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: 14,
        }}
      >
        3
      </Box>
    )
  }

  return (
    <Typography
      variant="body2"
      color="text.secondary"
      sx={{ width: 28, textAlign: 'center', fontWeight: 600 }}
    >
      {rank}
    </Typography>
  )
}

function LeaderboardRow({
  row,
  index,
  reducedMotion,
}: {
  row: LeaderboardRow
  index: number
  reducedMotion: boolean | null
}) {
  return (
    <motion.div
      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={
        reducedMotion
          ? { duration: 0 }
          : { delay: index * 0.04, duration: 0.3, ease: 'easeOut' }
      }
    >
      <Box
        data-testid={`leaderboard-row-${row.rank}`}
        data-current-user={row.isCurrentUser || undefined}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          minHeight: 52,
          px: 2,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          ...(row.isCurrentUser && {
            backgroundColor: 'rgba(229, 9, 20, 0.08)',
            borderLeft: '3px solid #e50914',
            pl: '13px',
          }),
        }}
      >
        <Box sx={{ width: 36, flexShrink: 0 }}>
          <RankBadge rank={row.rank} />
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
            {row.username}
          </Typography>
          {row.isCurrentUser && (
            <Typography variant="caption" color="primary.main">
              You
            </Typography>
          )}
        </Box>

        <Typography
          variant="body2"
          sx={{ fontWeight: 600, flexShrink: 0 }}
        >
          {row.score} / {row.total}
        </Typography>
      </Box>
    </motion.div>
  )
}

export function LeaderboardScreen({
  userScore,
  userTotal,
  onPlayAgain,
  onBack,
}: LeaderboardScreenProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const reducedMotion = useReducedMotion()
  const [period, setPeriod] = useState<LeaderboardPeriod>('today')
  const [rows, setRows] = useState<LeaderboardRow[]>([])

  useEffect(() => {
    setRows(getLeaderboard(period, userScore, userTotal ?? 5))
  }, [period, userScore, userTotal])

  // Focus heading for accessibility
  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <Box
      id="leaderboard-screen"
      sx={{
        width: '100%',
        maxWidth: 480,
        mx: 'auto',
        px: 2,
      }}
    >
      {/* Back link */}
      <Button
        id="btn-back-to-results"
        startIcon={<ArrowBackIcon />}
        onClick={onBack}
        sx={{
          color: 'text.secondary',
          mt: 2,
          textTransform: 'none',
          '&:hover': { color: 'text.primary' },
        }}
      >
        Back to Results
      </Button>

      {/* Header row */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mt: 2,
          mb: 2,
        }}
      >
        <Typography
          id="leaderboard-heading"
          variant="h5"
          fontWeight={700}
          ref={headingRef}
          tabIndex={-1}
          sx={{ '&:focus': { outline: 'none' } }}
        >
          Leaderboard
        </Typography>

        <ToggleButtonGroup
          id="leaderboard-period-toggle"
          value={period}
          exclusive
          onChange={(_e, val) => {
            if (val) setPeriod(val as LeaderboardPeriod)
          }}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              color: 'text.secondary',
              borderColor: 'divider',
              textTransform: 'none',
              px: 2,
              '&.Mui-selected': {
                color: 'primary.main',
                borderColor: 'primary.main',
                bgcolor: 'rgba(229,9,20,0.08)',
              },
            },
          }}
        >
          <ToggleButton value="today">Today</ToggleButton>
          <ToggleButton value="allTime">All time</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Column header */}
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
            width: 36,
          }}
        >
          #
        </Typography>
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
          Player
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
          Score
        </Typography>
      </Box>

      {/* Leaderboard rows */}
      <Box id="leaderboard-rows" sx={{ mb: 3 }}>
        {rows.map((row, index) => (
          <LeaderboardRow
            key={`${row.username}-${row.rank}`}
            row={row}
            index={index}
            reducedMotion={reducedMotion}
          />
        ))}
      </Box>

      {/* Play Again */}
      <Box sx={{ maxWidth: 320, mx: 'auto', mb: 4 }}>
        <Button
          id="btn-play-again"
          variant="contained"
          color="primary"
          size="large"
          fullWidth
          onClick={onPlayAgain}
          sx={{ height: 52, borderRadius: '12px', fontWeight: 700 }}
        >
          Play Again
        </Button>
      </Box>
    </Box>
  )
}
