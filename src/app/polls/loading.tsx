import { Box, Container, Skeleton } from '@mui/material'

export default function PollsLoading() {
  return (
    <Container maxWidth="xl" sx={{ px: { xs: 1, sm: 2 }, pt: 2 }}>
      {/* Control bar skeleton */}
      <Box sx={{ display: 'flex', gap: 2, py: 1.5, mb: 1 }}>
        <Skeleton
          variant="rectangular"
          width={160}
          height={32}
          sx={{ borderRadius: 1 }}
        />
        <Skeleton
          variant="rectangular"
          width={200}
          height={32}
          sx={{ borderRadius: 1 }}
        />
        <Box sx={{ flex: 1 }} />
        <Skeleton
          variant="rectangular"
          width={120}
          height={32}
          sx={{ borderRadius: 1 }}
        />
      </Box>

      {/* Poll card skeletons */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Box
            key={i}
            sx={{
              p: 2.5,
              borderRadius: 1,
              bgcolor: 'rgba(26,26,26,0.9)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                mb: 1.5,
              }}
            >
              <Skeleton variant="text" width="50%" height={28} />
              <Box sx={{ flex: 1 }} />
              <Skeleton
                variant="rectangular"
                width={56}
                height={22}
                sx={{ borderRadius: 8 }}
              />
            </Box>
            <Skeleton variant="text" width="80%" height={20} sx={{ mb: 2 }} />
            {Array.from({ length: 3 }).map((_, j) => (
              <Skeleton
                key={j}
                variant="rectangular"
                width="100%"
                height={40}
                sx={{ borderRadius: 1, mb: 1 }}
              />
            ))}
            <Box
              sx={{ display: 'flex', gap: 1.5, mt: 1.5, alignItems: 'center' }}
            >
              <Skeleton variant="text" width={60} height={16} />
              <Skeleton variant="text" width={80} height={16} />
            </Box>
          </Box>
        ))}
      </Box>
    </Container>
  )
}
