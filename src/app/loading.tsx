import { Box, Container, Skeleton } from '@mui/material'

export default function Loading() {
  return (
    <Box sx={{ minHeight: '100vh' }}>
      {/* Hero skeleton */}
      <Skeleton
        variant="rectangular"
        sx={{
          height: { xs: '36vh', md: '40vh' },
          minHeight: 240,
        }}
        className="shimmer"
      />

      <Container maxWidth="xl" sx={{ px: { xs: 1, sm: 2 }, mt: 2 }}>
        {/* Bucket row skeletons */}
        {['Top box office', "Critics' favorites", 'Crowd favorites'].map(
          (title) => (
            <Box key={title} sx={{ mb: 3 }}>
              <Skeleton
                variant="text"
                width={180}
                height={32}
                sx={{ mb: 1.5 }}
              />
              <Box sx={{ display: 'flex', gap: 2, overflow: 'hidden' }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Box key={i} sx={{ width: 160, minWidth: 160 }}>
                    <Skeleton
                      variant="rectangular"
                      height={240}
                      sx={{ borderRadius: 1 }}
                      className="shimmer"
                    />
                    <Skeleton
                      variant="text"
                      width="80%"
                      height={24}
                      sx={{ mt: 1 }}
                    />
                    <Skeleton
                      variant="text"
                      width="60%"
                      height={20}
                      sx={{ mt: 0.5 }}
                    />
                  </Box>
                ))}
              </Box>
            </Box>
          ),
        )}
      </Container>
    </Box>
  )
}
