'use client'

import { Box, Button, Typography } from '@mui/material'
import { motion, useReducedMotion } from 'framer-motion'
import type { H2HMatchup } from '@/types/h2h'

interface ActionFooterProps {
  matchup: H2HMatchup
  onVote: (winnerId: string) => void
  onSkip: () => void
  isLocked: boolean
}

export function ActionFooter({
  matchup,
  onVote,
  onSkip,
  isLocked,
}: ActionFooterProps) {
  const reducedMotion = useReducedMotion()

  /** Truncate long titles for the button label */
  const truncate = (title: string, max: number): string =>
    title.length > max ? `${title.slice(0, max)}...` : title

  return (
    <Box
      id="h2h-action-footer"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1.5,
        px: 2,
        pt: 1,
        pb: 1,
      }}
    >
      {/* Pick buttons */}
      <Box
        sx={{
          display: 'flex',
          gap: 1.5,
          width: '100%',
          maxWidth: 480,
          justifyContent: 'center',
          pointerEvents: isLocked ? 'none' : 'auto',
        }}
      >
        <motion.div
          style={{ flex: 1, maxWidth: 220 }}
          whileTap={reducedMotion ? undefined : { scale: 0.96 }}
        >
          <Button
            id="btn-pick-film-a"
            variant="outlined"
            size="large"
            fullWidth
            onClick={() => onVote(matchup.filmA.id)}
            disabled={isLocked}
            aria-label={`Pick ${matchup.filmA.title}`}
            sx={{
              height: 48,
              borderColor: 'rgba(229, 9, 20, 0.4)',
              color: 'text.primary',
              borderRadius: '12px',
              fontWeight: 600,
              fontSize: { xs: '0.8rem', sm: '0.875rem' },
              textTransform: 'none',
              '&:hover': {
                backgroundColor: 'rgba(229, 9, 20, 0.08)',
                borderColor: '#e50914',
              },
            }}
          >
            {truncate(matchup.filmA.title, 18)}
          </Button>
        </motion.div>

        <motion.div
          style={{ flex: 1, maxWidth: 220 }}
          whileTap={reducedMotion ? undefined : { scale: 0.96 }}
        >
          <Button
            id="btn-pick-film-b"
            variant="outlined"
            size="large"
            fullWidth
            onClick={() => onVote(matchup.filmB.id)}
            disabled={isLocked}
            aria-label={`Pick ${matchup.filmB.title}`}
            sx={{
              height: 48,
              borderColor: 'rgba(229, 9, 20, 0.4)',
              color: 'text.primary',
              borderRadius: '12px',
              fontWeight: 600,
              fontSize: { xs: '0.8rem', sm: '0.875rem' },
              textTransform: 'none',
              '&:hover': {
                backgroundColor: 'rgba(229, 9, 20, 0.08)',
                borderColor: '#e50914',
              },
            }}
          >
            {truncate(matchup.filmB.title, 18)}
          </Button>
        </motion.div>
      </Box>

      {/* Skip link */}
      <Button
        id="btn-h2h-skip"
        onClick={onSkip}
        disabled={isLocked}
        size="small"
        sx={{
          color: 'text.disabled',
          textTransform: 'none',
          fontWeight: 400,
          fontSize: '0.8rem',
          minWidth: 'auto',
          '&:hover': { color: 'text.secondary', backgroundColor: 'transparent' },
        }}
      >
        Skip this matchup
      </Button>

      {/* Keyboard hint */}
      <Typography
        variant="caption"
        color="text.disabled"
        sx={{
          textAlign: 'center',
          '@media (pointer: coarse)': { display: 'none' },
        }}
      >
        {'\u2190'} Swipe/arrow left = pick left {'  '} Swipe/arrow right = pick
        right {'\u2192'}
      </Typography>
    </Box>
  )
}
