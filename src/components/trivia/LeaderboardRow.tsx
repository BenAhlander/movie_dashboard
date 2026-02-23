'use client'

import { Box, Typography, Avatar } from '@mui/material'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import { motion } from 'framer-motion'
import type { LeaderboardRow as LeaderboardRowType } from '@/types/trivia'

/** Color palette for avatar initials backgrounds */
const AVATAR_COLORS = [
  '#7c3aed',
  '#0891b2',
  '#059669',
  '#d97706',
  '#db2777',
  '#e50914',
]

/** Derive a consistent color from a username string */
function getAvatarColor(username: string): string {
  let hash = 0
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
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
          position: 'relative',
        }}
      >
        <EmojiEventsIcon sx={{ fontSize: 16 }} />
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

interface LeaderboardRowProps {
  row: LeaderboardRowType
  index: number
  reducedMotion: boolean | null
}

export function LeaderboardRow({
  row,
  index,
  reducedMotion,
}: LeaderboardRowProps) {
  const pct =
    row.pct !== undefined
      ? Math.round(row.pct)
      : row.total > 0
        ? Math.round((row.score / row.total) * 100)
        : 0

  const initial = row.username.charAt(0).toUpperCase()
  const avatarBg = getAvatarColor(row.username)

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

        <Avatar
          src={row.avatarUrl ?? undefined}
          sx={{
            width: { xs: 28, sm: 36 },
            height: { xs: 28, sm: 36 },
            fontSize: { xs: 13, sm: 15 },
            bgcolor: avatarBg,
            flexShrink: 0,
          }}
        >
          {initial}
        </Avatar>

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
              (You)
            </Typography>
          )}
        </Box>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            flexShrink: 0,
            display: { xs: 'none', sm: 'block' },
          }}
        >
          {pct}%
        </Typography>

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
