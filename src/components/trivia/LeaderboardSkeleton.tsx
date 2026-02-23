'use client'

import { Box, Skeleton } from '@mui/material'

const SKELETON_ROW_COUNT = 7
const NAME_WIDTHS = [130, 100, 140, 90, 120, 110, 105]

/** Skeleton loading state for leaderboard rows */
export function LeaderboardSkeleton() {
  return (
    <Box id="leaderboard-skeleton">
      {Array.from({ length: SKELETON_ROW_COUNT }).map((_, i) => (
        <Box
          key={i}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            minHeight: 52,
            px: 2,
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <Skeleton
            variant="text"
            width={24}
            animation="wave"
            sx={{ flexShrink: 0 }}
          />
          <Skeleton
            variant="circular"
            width={32}
            height={32}
            animation="wave"
            sx={{ flexShrink: 0 }}
          />
          <Skeleton
            variant="text"
            width={NAME_WIDTHS[i % NAME_WIDTHS.length]}
            animation="wave"
            sx={{ flex: 1, maxWidth: NAME_WIDTHS[i % NAME_WIDTHS.length] }}
          />
          <Skeleton
            variant="text"
            width={36}
            animation="wave"
            sx={{ flexShrink: 0 }}
          />
          <Skeleton
            variant="text"
            width={52}
            animation="wave"
            sx={{ flexShrink: 0 }}
          />
        </Box>
      ))}
    </Box>
  )
}
