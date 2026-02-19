'use client'

import { Box, Typography, Button } from '@mui/material'

export default function NotFound() {
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
      <Typography variant="h4" gutterBottom>
        404
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        Page not found
      </Typography>
      <Button variant="outlined" href="/">
        Back to dashboard
      </Button>
    </Box>
  )
}
