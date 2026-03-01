'use client'

import { Box, Typography, Button, Paper } from '@mui/material'
import LockIcon from '@mui/icons-material/Lock'

export function AuthGate() {
  return (
    <Box
      id="h2h-auth-gate"
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
        <LockIcon
          sx={{
            fontSize: 48,
            color: 'text.disabled',
            mb: 2,
          }}
        />
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Sign in to play
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ mb: 3, lineHeight: 1.6 }}
        >
          Head-to-Head voting requires an account so we can track which matchups
          you have seen and keep the rankings fair.
        </Typography>
        <Button
          variant="contained"
          color="primary"
          size="large"
          href="/auth/login?returnTo=/head-to-head"
          sx={{
            height: 48,
            borderRadius: '12px',
            fontWeight: 700,
            px: 4,
          }}
        >
          Sign In
        </Button>
      </Paper>
    </Box>
  )
}
