import { Box, Skeleton } from '@mui/material'

export default function TriviaLoading() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        maxWidth: 480,
        mx: 'auto',
        pt: 3,
        px: 2,
      }}
    >
      {/* Score row skeleton */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
          mb: 1,
        }}
      >
        <Skeleton variant="text" width={80} height={24} />
        <Skeleton variant="text" width={120} height={24} />
      </Box>

      {/* Progress bar skeleton */}
      <Skeleton
        variant="rectangular"
        width="100%"
        height={6}
        sx={{ borderRadius: 3, mb: 2 }}
      />

      {/* Card skeleton */}
      <Skeleton
        variant="rectangular"
        sx={{
          width: '100%',
          maxWidth: 360,
          height: 420,
          borderRadius: '16px',
        }}
      />

      {/* Button skeleton */}
      <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
        <Skeleton
          variant="rectangular"
          width={140}
          height={52}
          sx={{ borderRadius: '12px' }}
        />
        <Skeleton
          variant="rectangular"
          width={140}
          height={52}
          sx={{ borderRadius: '12px' }}
        />
      </Box>
    </Box>
  )
}
