'use client'

import { Box } from '@mui/material'
import { type MotionValue } from 'framer-motion'
import type { H2HMatchup } from '@/types/h2h'
import { MatchupCard } from './MatchupCard'

interface H2HCardStackProps {
  currentMatchup: H2HMatchup | null
  nextMatchup: H2HMatchup | null
  x: MotionValue<number>
  rotate: MotionValue<number>
  onDragEnd: (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: { offset: { x: number }; velocity: { x: number } },
  ) => void
  isLocked: boolean
}

export function H2HCardStack({
  currentMatchup,
  nextMatchup,
  x,
  rotate,
  onDragEnd,
  isLocked,
}: H2HCardStackProps) {
  return (
    <Box
      id="h2h-card-stack"
      sx={{
        position: 'relative',
        width: '100%',
        maxWidth: { xs: 360, sm: 500, md: 580 },
        height: { xs: 380, sm: 420, md: 440 },
        mx: 'auto',
        touchAction: 'pan-y',
        overflow: 'hidden',
      }}
    >
      {/* Next card (underneath) */}
      {nextMatchup && (
        <MatchupCard
          key={`next-${nextMatchup.id}`}
          matchup={nextMatchup}
          x={x}
          rotate={rotate}
          isActive={false}
          onDragEnd={onDragEnd}
          isLocked={true}
        />
      )}

      {/* Active card (on top) */}
      {currentMatchup && (
        <MatchupCard
          key={`active-${currentMatchup.id}`}
          matchup={currentMatchup}
          x={x}
          rotate={rotate}
          isActive={true}
          onDragEnd={onDragEnd}
          isLocked={isLocked}
        />
      )}
    </Box>
  )
}
