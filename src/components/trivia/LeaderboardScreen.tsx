'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Box,
  Typography,
  Button,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { useReducedMotion } from 'framer-motion'
import type { LeaderboardRow as LeaderboardRowType, LeaderboardPeriod } from '@/types/trivia'
import { getLeaderboard, getGhostRank } from '@/lib/trivia/gameApi'
import { LeaderboardRow } from './LeaderboardRow'
import { LeaderboardSkeleton } from './LeaderboardSkeleton'
import { LeaderboardEmpty } from './LeaderboardEmpty'
import { LeaderboardGhostRow } from './LeaderboardGhostRow'
import { LeaderboardAnonBanner } from './LeaderboardAnonBanner'

interface LeaderboardScreenProps {
  userScore: number
  userTotal?: number
  onPlayAgain: () => void
  onBack: () => void
  isAuthenticated: boolean
  currentUserId?: string
  authEnabled: boolean
}

export function LeaderboardScreen({
  userScore,
  userTotal,
  onPlayAgain,
  onBack,
  isAuthenticated,
  currentUserId,
  authEnabled,
}: LeaderboardScreenProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const reducedMotion = useReducedMotion()
  const [period, setPeriod] = useState<LeaderboardPeriod>('today')
  const [rows, setRows] = useState<LeaderboardRowType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [ghostRank, setGhostRank] = useState<number>(0)

  const effectiveTotal = userTotal ?? 5

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

        // Compute ghost rank for anonymous users
        if (!isAuthenticated && userScore > 0) {
          const ghost = await getGhostRank(userScore, effectiveTotal, p)
          setGhostRank(ghost.rank)
        }
      } catch {
        setHasError(true)
      } finally {
        setIsLoading(false)
        setIsFetching(false)
      }
    },
    [currentUserId, isAuthenticated, userScore, effectiveTotal]
  )

  useEffect(() => {
    fetchData(period, true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Refetch on period change (not on initial mount)
  const handlePeriodChange = useCallback(
    (_e: React.MouseEvent<HTMLElement>, val: string | null) => {
      if (!val) return
      const newPeriod = val as LeaderboardPeriod
      setPeriod(newPeriod)
      fetchData(newPeriod, false)
    },
    [fetchData]
  )

  // Focus heading for accessibility
  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  const handleRetry = useCallback(() => {
    fetchData(period, true)
  }, [fetchData, period])

  const showGhostRow =
    !isAuthenticated && authEnabled && userScore > 0 && !isLoading && !hasError
  const showAnonBanner = !isAuthenticated && authEnabled && !isLoading

  return (
    <Box
      id="leaderboard-screen"
      sx={{
        width: '100%',
        maxWidth: 480,
        mx: 'auto',
        px: 2,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Header area — non-scrolling */}
      <Box sx={{ flexShrink: 0 }}>
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
      </Box>

      {/* Scrollable list — flex-1 */}
      <Box
        id="leaderboard-rows"
        sx={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          opacity: isFetching ? 0.4 : 1,
          transition: 'opacity 0.3s',
          mb: 1,
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

      {/* Footer area — non-scrolling */}
      <Box sx={{ flexShrink: 0, pb: 3 }}>
        {/* Current user card for authenticated users ranked outside visible rows */}
        {isAuthenticated &&
          !isLoading &&
          rows.length > 0 &&
          !rows.some((r) => r.isCurrentUser) && (
            <Box
              id="leaderboard-current-user-card"
              sx={{
                backgroundColor: 'rgba(229, 9, 20, 0.08)',
                borderLeft: '3px solid #e50914',
                borderRadius: '8px',
                p: 1.5,
                mb: 2,
              }}
            >
              <Typography variant="body2" color="primary.main" fontWeight={600}>
                Your score: {userScore} / {effectiveTotal} (
                {Math.round((userScore / effectiveTotal) * 100)}%)
              </Typography>
            </Box>
          )}

        {/* Ghost row for anonymous users */}
        {showGhostRow && (
          <LeaderboardGhostRow
            score={userScore}
            total={effectiveTotal}
            ghostRank={ghostRank}
            period={period}
            animationDelay={rows.length * 0.04 + 0.1}
          />
        )}

        {/* Sign-in banner for anonymous users */}
        {showAnonBanner && <LeaderboardAnonBanner />}

        {/* Play Again */}
        <Box sx={{ maxWidth: 320, mx: 'auto' }}>
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

      {/* Screen reader announcements */}
      <Box
        aria-live="polite"
        aria-atomic="true"
        sx={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
        }}
      >
        {!isLoading &&
          rows.length > 0 &&
          `Leaderboard updated. Showing top ${rows.length} players.`}
        {isAuthenticated &&
          rows.some((r) => r.isCurrentUser) &&
          `Your rank is #${rows.find((r) => r.isCurrentUser)?.rank}.`}
        {!isAuthenticated &&
          authEnabled &&
          'Sign in to save your score and appear on the leaderboard.'}
      </Box>
    </Box>
  )
}
