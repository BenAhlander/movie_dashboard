'use client'

import { Box, Typography, Button } from '@mui/material'
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined'
import WifiOffIcon from '@mui/icons-material/WifiOff'

interface LeaderboardEmptyProps {
  variant: 'empty' | 'error'
  period: string
  onRetry?: () => void
}

/** Empty and error states for the leaderboard */
export function LeaderboardEmpty({
  variant,
  period,
  onRetry,
}: LeaderboardEmptyProps) {
  if (variant === 'error') {
    return (
      <Box
        id="leaderboard-error"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: 6,
          gap: 1.5,
        }}
      >
        <WifiOffIcon
          sx={{ fontSize: 40, color: 'rgba(255,255,255,0.2)' }}
        />
        <Typography variant="body1" color="text.secondary">
          Couldn&apos;t load the leaderboard.
        </Typography>
        {onRetry && (
          <Button
            id="btn-leaderboard-retry"
            variant="text"
            color="primary"
            onClick={onRetry}
            sx={{ py: 1 }}
          >
            Try again
          </Button>
        )}
      </Box>
    )
  }

  return (
    <Box
      id="leaderboard-empty"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 6,
        gap: 1,
      }}
    >
      <EmojiEventsOutlinedIcon
        sx={{ fontSize: 48, color: 'rgba(255,255,255,0.2)' }}
      />
      <Typography variant="body1" color="text.secondary">
        No scores yet{period === 'today' ? ' for today' : ''}.
      </Typography>
      <Typography variant="body2" color="text.disabled">
        Be the first to play!
      </Typography>
    </Box>
  )
}
