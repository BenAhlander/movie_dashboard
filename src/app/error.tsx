'use client'

import { Box, Typography, Button } from '@mui/material'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        p: 4,
        textAlign: 'center',
      }}
    >
      <Typography variant="h5" gutterBottom>
        Something went wrong
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 2, maxWidth: 480 }}
      >
        {error.message || 'An unexpected error occurred'}
      </Typography>
      <Button variant="outlined" onClick={reset}>
        Try again
      </Button>
    </Box>
  )
}
