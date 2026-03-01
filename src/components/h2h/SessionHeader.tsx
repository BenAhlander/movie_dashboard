'use client'

import { Box, Typography, Button, Chip } from '@mui/material'
import LeaderboardIcon from '@mui/icons-material/EmojiEvents'
import type { H2HSessionStats } from '@/types/h2h'

interface SessionHeaderProps {
  stats: H2HSessionStats
  onShowLeaderboard: () => void
}

export function SessionHeader({
  stats,
  onShowLeaderboard,
}: SessionHeaderProps) {
  return (
    <Box
      id="h2h-session-header"
      data-votes={stats.votesThisSession}
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        px: 2,
        py: 1.5,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Chip
          id="h2h-vote-count"
          label={`${stats.votesThisSession} vote${stats.votesThisSession !== 1 ? 's' : ''}`}
          size="small"
          sx={{
            backgroundColor: 'rgba(229, 9, 20, 0.12)',
            color: '#e50914',
            fontWeight: 600,
            border: '1px solid rgba(229, 9, 20, 0.3)',
          }}
        />
      </Box>

      <Button
        id="btn-h2h-leaderboard"
        startIcon={<LeaderboardIcon />}
        onClick={onShowLeaderboard}
        size="small"
        sx={{
          color: 'text.secondary',
          textTransform: 'none',
          fontWeight: 600,
          '&:hover': { color: 'text.primary' },
        }}
      >
        <Typography
          component="span"
          variant="body2"
          sx={{ display: { xs: 'none', sm: 'inline' } }}
        >
          Rankings
        </Typography>
        <Typography
          component="span"
          variant="body2"
          sx={{ display: { xs: 'inline', sm: 'none' } }}
        >
          Top
        </Typography>
      </Button>
    </Box>
  )
}
