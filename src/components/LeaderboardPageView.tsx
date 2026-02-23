'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Container,
  Typography,
  Button,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import { useReducedMotion } from 'framer-motion'
import { useUser } from '@auth0/nextjs-auth0/client'
import type {
  LeaderboardRow as LeaderboardRowType,
  LeaderboardPeriod,
} from '@/types/trivia'
import { getLeaderboard } from '@/lib/trivia/gameApi'
import { LeaderboardRow } from '@/components/trivia/LeaderboardRow'
import { LeaderboardSkeleton } from '@/components/trivia/LeaderboardSkeleton'
import { LeaderboardEmpty } from '@/components/trivia/LeaderboardEmpty'
import { LeaderboardAnonBanner } from '@/components/trivia/LeaderboardAnonBanner'

interface LeaderboardPageViewProps {
  authEnabled: boolean
}

export function LeaderboardPageView({ authEnabled }: LeaderboardPageViewProps) {
  const router = useRouter()
  const reducedMotion = useReducedMotion()
  const { user } = useUser()
  const isAuthenticated = !!user
  const currentUserId = user?.sub ?? undefined

  const [period, setPeriod] = useState<LeaderboardPeriod>('today')
  const [rows, setRows] = useState<LeaderboardRowType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)
  const [hasError, setHasError] = useState(false)

  const fetchData = useCallback(
    async (p: LeaderboardPeriod, isInitial = false) => {
      if (isInitial) {
        setIsLoading(true)
      } else {
        setIsFetching(true)
      }
      setHasError(false)

      try {
        const data = await getLeaderboard(p, currentUserId)
        setRows(data)
      } catch {
        setHasError(true)
      } finally {
        setIsLoading(false)
        setIsFetching(false)
      }
    },
    [currentUserId]
  )

  useEffect(() => {
    fetchData(period, true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePeriodChange = useCallback(
    (_e: React.MouseEvent<HTMLElement>, val: string | null) => {
      if (!val) return
      const newPeriod = val as LeaderboardPeriod
      setPeriod(newPeriod)
      fetchData(newPeriod, false)
    },
    [fetchData]
  )

  const handleRetry = useCallback(() => {
    fetchData(period, true)
  }, [fetchData, period])

  const showAnonBanner = !isAuthenticated && authEnabled && !isLoading

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      {/* Header row */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mb: 1,
        }}
      >
        <EmojiEventsIcon sx={{ color: '#f59e0b', fontSize: 28 }} />
        <Typography
          id="leaderboard-heading"
          variant="h5"
          fontWeight={700}
        >
          Leaderboard
        </Typography>
      </Box>

      {/* Period toggle */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Top trivia players
        </Typography>

        <ToggleButtonGroup
          id="leaderboard-period-toggle"
          value={period}
          exclusive
          onChange={handlePeriodChange}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              color: 'text.secondary',
              borderColor: 'divider',
              textTransform: 'none',
              px: 2,
              minHeight: 44,
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

        {/* Avatar spacer */}
        <Box sx={{ width: { xs: 28, sm: 36 }, flexShrink: 0 }} />

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
            display: { xs: 'none', sm: 'block' },
          }}
        >
          %
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

      {/* Rows */}
      <Box
        id="leaderboard-rows"
        sx={{
          opacity: isFetching ? 0.4 : 1,
          transition: 'opacity 0.3s',
          mb: 3,
        }}
      >
        {isLoading && <LeaderboardSkeleton />}

        {!isLoading && hasError && (
          <LeaderboardEmpty
            variant="error"
            period={period}
            onRetry={handleRetry}
          />
        )}

        {!isLoading && !hasError && rows.length === 0 && (
          <LeaderboardEmpty variant="empty" period={period} />
        )}

        {!isLoading &&
          !hasError &&
          rows.length > 0 &&
          rows.map((row, index) => (
            <LeaderboardRow
              key={`${row.userId ?? row.username}-${row.rank}`}
              row={row}
              index={index}
              reducedMotion={reducedMotion}
            />
          ))}
      </Box>

      {/* Sign-in banner for anonymous users */}
      {showAnonBanner && <LeaderboardAnonBanner />}

      {/* Play Trivia button */}
      <Box sx={{ maxWidth: 320, mx: 'auto' }}>
        <Button
          id="btn-play-trivia"
          variant="contained"
          color="primary"
          size="large"
          fullWidth
          onClick={() => router.push('/trivia')}
          sx={{ height: 52, borderRadius: '12px', fontWeight: 700 }}
        >
          Play Trivia
        </Button>
      </Box>
    </Container>
  )
}
