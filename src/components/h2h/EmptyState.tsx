'use client'

import { Box, Typography, Button, Paper } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import LeaderboardIcon from '@mui/icons-material/EmojiEvents'

interface EmptyStateProps {
  votesThisSession: number
  onShowLeaderboard: () => void
}

export function EmptyState({
  votesThisSession,
  onShowLeaderboard,
}: EmptyStateProps) {
  return (
    <Box
      id="h2h-empty-state"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        px: 3,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          maxWidth: 400,
          width: '100%',
          textAlign: 'center',
          p: 4,
          borderRadius: '16px',
        }}
      >
        <CheckCircleIcon
          sx={{
            fontSize: 56,
            color: '#22c55e',
            mb: 2,
          }}
        />
        <Typography variant="h5" fontWeight={700} gutterBottom>
          You&apos;ve seen them all!
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ mb: 1, lineHeight: 1.6 }}
        >
          You have voted on every available matchup.
        </Typography>
        {votesThisSession > 0 && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 3 }}
          >
            {votesThisSession} vote{votesThisSession !== 1 ? 's' : ''} this
            session
          </Typography>
        )}
        <Button
          id="btn-h2h-empty-leaderboard"
          variant="contained"
          color="primary"
          size="large"
          startIcon={<LeaderboardIcon />}
          onClick={onShowLeaderboard}
          sx={{
            height: 48,
            borderRadius: '12px',
            fontWeight: 700,
            px: 4,
          }}
        >
          View Rankings
        </Button>
      </Paper>
    </Box>
  )
}
