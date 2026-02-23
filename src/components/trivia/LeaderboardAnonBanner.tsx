'use client'

import { Box, Typography, Button } from '@mui/material'
import { motion, useReducedMotion } from 'framer-motion'

interface LeaderboardAnonBannerProps {
  animationDelay?: number
}

/**
 * Sign-in prompt banner shown to anonymous users on the leaderboard.
 * Encourages them to sign in with Google to save their scores.
 */
export function LeaderboardAnonBanner({
  animationDelay = 0.4,
}: LeaderboardAnonBannerProps) {
  const reducedMotion = useReducedMotion()

  return (
    <motion.div
      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reducedMotion
          ? { duration: 0 }
          : { delay: animationDelay, duration: 0.4, ease: 'easeOut' }
      }
    >
      <Box
        id="leaderboard-signin-banner"
        sx={{
          backgroundColor: 'rgba(229,9,20,0.06)',
          border: '1px solid rgba(229,9,20,0.2)',
          borderRadius: '12px',
          p: 2.5,
          mb: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          {/* Google G icon */}
          <Box
            component="svg"
            viewBox="0 0 24 24"
            sx={{ width: 20, height: 20, flexShrink: 0 }}
          >
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </Box>
          <Typography variant="body2" fontWeight={600}>
            Sign in with Google
          </Typography>
        </Box>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 2 }}
        >
          Save your score and claim your rank on the leaderboard.
        </Typography>

        <Button
          id="btn-leaderboard-signin"
          variant="contained"
          color="primary"
          fullWidth
          href="/auth/login?returnTo=/trivia"
          sx={{
            height: 44,
            borderRadius: '10px',
            fontWeight: 700,
            textTransform: 'none',
          }}
        >
          Sign in with Google
        </Button>
      </Box>
    </motion.div>
  )
}
