'use client'

import { Box, Skeleton } from '@mui/material'

export function MatchupSkeleton() {
  return (
    <Box
      id="h2h-skeleton"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        pt: 2,
      }}
    >
      {/* Session header skeleton */}
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: 2,
          pb: 2,
        }}
      >
        <Skeleton
          variant="rounded"
          width={80}
          height={28}
          sx={{ borderRadius: '16px' }}
        />
        <Skeleton variant="rounded" width={90} height={32} />
      </Box>

      {/* Card skeleton */}
      <Box
        sx={{
          width: '100%',
          maxWidth: { xs: 360, sm: 500, md: 580 },
          height: { xs: 380, sm: 420, md: 440 },
          mx: 'auto',
          px: 2,
        }}
      >
        <Skeleton
          variant="rounded"
          width="100%"
          height="100%"
          sx={{ borderRadius: '16px' }}
        />
      </Box>

      {/* Button skeleton */}
      <Box
        sx={{
          display: 'flex',
          gap: 1.5,
          mt: 2,
          width: '100%',
          maxWidth: 480,
          justifyContent: 'center',
          px: 2,
        }}
      >
        <Skeleton
          variant="rounded"
          width="45%"
          height={48}
          sx={{ borderRadius: '12px' }}
        />
        <Skeleton
          variant="rounded"
          width="45%"
          height={48}
          sx={{ borderRadius: '12px' }}
        />
      </Box>
    </Box>
  )
}
